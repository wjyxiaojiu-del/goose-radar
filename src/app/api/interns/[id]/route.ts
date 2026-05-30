import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM, callLLMWithFallback } from '@/lib/ai';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const intern = await prisma.intern.findUnique({
      where: { id },
      include: {
        position: true,
        mentor: true,
        weeklyReports: {
          orderBy: { weekStart: 'desc' },
          take: 4,
        },
        mentorFeedbacks: {
          orderBy: { weekStart: 'desc' },
          take: 4,
          include: {
            mentor: true,
          },
        },
        tasks: {
          orderBy: { weekStart: 'desc' },
          take: 10,
        },
        abilityScores: {
          orderBy: { weekStart: 'desc' },
          take: 6,
        },
        riskAlerts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        scoreHistory: {
          orderBy: { weekStart: 'asc' },
          take: 4,
        },
      },
    });

    if (!intern) {
      return NextResponse.json(
        { error: 'Intern not found' },
        { status: 404 }
      );
    }

    const positionAbilities: string[] = JSON.parse(intern.position.abilities);

    const abilityScores = intern.abilityScores.map(score => ({
      dimension: score.dimension,
      score: score.score,
    }));

    const trendData = intern.scoreHistory.map(h => ({
      week: h.weekStart.toISOString().split('T')[0],
      fitScore: h.fitScore,
      riskScore: h.riskScore,
      potentialScore: h.potentialScore,
      taskCompletionRate: h.taskCompletionRate,
    }));

    // 合并为单次 LLM 调用：结论 + 分析链
    const { result: aiResult, status: aiStatus } = await callLLMWithFallback({
      cacheKey: `intern-ai:${id}`,
      fallbackFn: () => ({
        conclusion: fallbackConclusion(intern.fitScore, intern.riskScore, abilityScores),
        explanation: fallbackExplanation(intern.fitScore, intern.riskScore, intern.potentialScore, trendData, intern.mentorFeedbacks),
      }),
      llmFn: async () => {
        const summary = abilityScores.map(a => `${a.dimension}: ${a.score}分`).join('、');
        const trend = trendData.map(t => `${t.week}: 适岗${t.fitScore} 风险${t.riskScore} 潜力${t.potentialScore} 任务完成${t.taskCompletionRate}%`).join('\n');
        const fb = intern.mentorFeedbacks.map(f => `[${f.mentor.name}] 评分${f.performance}/5: ${f.comment}${f.needsHR ? ' (需HR介入)' : ''}`).join('\n');

        const raw = await callLLM({
          system: `你是HR数据分析AI助手。返回严格JSON：
{
  "conclusion": "1-2句适岗度结论，中文，专业自然",
  "explanation": {
    "signals": ["输入信号1", "输入信号2"],
    "reasoning": ["判断依据1", "判断依据2"],
    "conclusion": "风险结论，一句话",
    "actions": ["推荐动作1", "推荐动作2"]
  }
}`,
          user: `实习生数据：
适岗度: ${intern.fitScore}/100, 风险度: ${intern.riskScore}/100, 高潜度: ${intern.potentialScore}/100
能力评分: ${summary}
趋势数据:
${trend}
导师反馈:
${fb}`,
          temperature: 0.6,
          maxTokens: 800,
          jsonMode: true,
          timeoutMs: 6000,
        });

        const parsed = JSON.parse(raw);
        if (!parsed.conclusion || !parsed.explanation?.signals) throw new Error('Invalid structure');
        const exp = parsed.explanation;
        const text = [...(exp.signals as string[]).slice(0, 2), (exp.reasoning as string[])[0], exp.conclusion].filter(Boolean).join('。') + '。';
        return {
          conclusion: parsed.conclusion as string,
          explanation: { text, ...exp },
        };
      },
    });

    const positionAnalysis = {
      requirements: positionAbilities,
      currentPerformance: abilityScores.map(a => ({
        dimension: a.dimension,
        score: a.score,
        status: a.score >= 70 ? 'strong' : a.score >= 50 ? 'moderate' : 'weak',
      })),
      aiConclusion: aiResult.conclusion,
    };

    return NextResponse.json({
      basicInfo: {
        id: intern.id,
        name: intern.name,
        gender: intern.gender,
        school: intern.school,
        major: intern.major,
        entryDate: intern.entryDate,
        phase: intern.phase,
        position: intern.position.name,
        mentor: intern.mentor.name,
        department: intern.mentor.department,
      },
      scores: {
        fitScore: intern.fitScore,
        riskScore: intern.riskScore,
        potentialScore: intern.potentialScore,
      },
      tags: JSON.parse(intern.tags),
      riskLevel: intern.riskLevel,
      potentialType: intern.potentialType,
      taskCompletionRate: intern.taskCompletionRate,
      abilityScores,
      positionAnalysis,
      weeklyReports: intern.weeklyReports.map(r => ({
        weekStart: r.weekStart,
        content: r.content,
        aiSummary: r.aiSummary,
        emotionSignal: r.emotionSignal,
        difficulties: r.difficulties,
        needsHelp: r.needsHelp,
      })),
      mentorFeedbacks: intern.mentorFeedbacks.map(f => ({
        weekStart: f.weekStart,
        mentorName: f.mentor.name,
        performance: f.performance,
        comment: f.comment,
        strengths: f.strengths,
        concerns: f.concerns,
        needsHR: f.needsHR,
      })),
      riskAlerts: intern.riskAlerts.map(a => ({
        id: a.id,
        type: a.type,
        level: a.level,
        reason: JSON.parse(a.reason),
        action: a.action,
        createdAt: a.createdAt,
      })),
      trendData,
      aiExplanation: aiResult.explanation,
      aiStatus,
    });
  } catch (error) {
    console.error('Intern detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intern details' },
      { status: 500 }
    );
  }
}

interface TrendData {
  week: string;
  fitScore: number;
  riskScore: number;
  potentialScore: number;
  taskCompletionRate: number;
}

interface FeedbackData {
  weekStart: Date;
  mentor: { name: string };
  performance: number;
  comment: string;
  strengths: string;
  concerns: string;
  needsHR: boolean;
}

function fallbackConclusion(fitScore: number, riskScore: number, abilityScores: { dimension: string; score: number }[]) {
  const weakAreas = abilityScores.filter(a => a.score < 60).map(a => a.dimension);
  const strongAreas = abilityScores.filter(a => a.score >= 80).map(a => a.dimension);

  let conclusion = '';

  if (fitScore >= 80) {
    conclusion = '该同学整体适岗度较高，';
    if (strongAreas.length > 0) {
      conclusion += `在${strongAreas.join('、')}方面表现突出`;
    }
    if (weakAreas.length > 0) {
      conclusion += `，建议在${weakAreas.join('、')}方面加强提升`;
    }
  } else if (fitScore >= 60) {
    conclusion = '该同学适岗度中等，';
    if (strongAreas.length > 0) {
      conclusion += `在${strongAreas.join('、')}方面有一定优势`;
    }
    if (weakAreas.length > 0) {
      conclusion += `，需要在${weakAreas.join('、')}方面重点提升`;
    }
  } else {
    conclusion = '该同学适岗度较低，';
    if (weakAreas.length > 0) {
      conclusion += `在${weakAreas.join('、')}方面存在明显短板`;
    }
    conclusion += '，建议导师重点关注并制定针对性培养计划';
  }

  return conclusion;
}

function fallbackExplanation(
  fitScore: number,
  riskScore: number,
  potentialScore: number,
  trendData: TrendData[],
  feedbacks: FeedbackData[]
) {
  const signals: string[] = [];
  if (trendData.length >= 2) {
    const latestFit = trendData[trendData.length - 1].fitScore;
    const prevFit = trendData[trendData.length - 2].fitScore;
    const fitChange = latestFit - prevFit;
    if (Math.abs(fitChange) > 3) {
      signals.push(`适岗度近一周${fitChange > 0 ? '上升' : '下降'}${Math.abs(fitChange)}分`);
    }
  }
  if (riskScore > 60) signals.push(`风险度评分 ${riskScore}，超过警戒线`);
  else if (riskScore > 30) signals.push(`风险度评分 ${riskScore}，处于关注区间`);
  if (feedbacks.length > 0 && feedbacks[0].needsHR) signals.push('导师标记需要HR介入');
  if (feedbacks.length > 0 && feedbacks[0].performance <= 2) signals.push('导师评价偏低（≤2分）');
  if (trendData.length > 0 && trendData[trendData.length - 1].taskCompletionRate < 60) {
    signals.push('本周任务完成率低于60%');
  }
  if (signals.length === 0) signals.push('各项指标处于正常区间');

  const reasoning: string[] = [];
  if (riskScore > 60) {
    reasoning.push('高风险度通常由任务延期、情绪信号和导师反馈共同触发');
  } else if (riskScore > 30) {
    reasoning.push('中等风险提示存在成长瓶颈，但尚未达到干预阈值');
  } else {
    reasoning.push('低风险表明当前状态稳定，可关注高潜发展方向');
  }
  if (feedbacks.length > 0 && feedbacks[0].needsHR) {
    reasoning.push('导师主动提出HR介入需求，说明问题已超出日常辅导范围');
  }
  if (potentialScore >= 80) {
    reasoning.push('高潜度评分表明该同学有较强的成长潜力，值得重点培养');
  }

  let conclusion = '';
  if (riskScore > 60) {
    conclusion = '综合判断：高风险，需要立即干预';
  } else if (riskScore > 30) {
    conclusion = '综合判断：中风险，建议密切关注';
  } else if (potentialScore >= 80) {
    conclusion = '综合判断：低风险高潜力，建议重点培养';
  } else {
    conclusion = '综合判断：状态稳定，保持常规跟进';
  }

  const actions: string[] = [];
  if (riskScore > 60) {
    actions.push('本周内安排HR 1v1沟通');
    actions.push('导师制定2周改进计划');
  } else if (riskScore > 30) {
    actions.push('导师增加1v1频率至每周2次');
    actions.push('安排同岗位伙伴协助');
  } else if (potentialScore >= 80) {
    actions.push('纳入重点培养名单');
    actions.push('安排更有挑战性的任务');
  } else {
    actions.push('保持每周1v1');
    actions.push('关注成长趋势变化');
  }

  const explanationText = [
    ...signals.slice(0, 2),
    ...reasoning.slice(0, 1),
    conclusion,
  ].join('。') + '。';

  return {
    text: explanationText,
    signals,
    reasoning,
    conclusion,
    actions,
  };
}
