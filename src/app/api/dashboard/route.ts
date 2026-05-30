import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM, callLLMWithFallback } from '@/lib/ai';

export async function GET() {
  try {
    const interns = await prisma.intern.findMany({
      include: { position: true, mentor: true },
    });

    const totalInterns = interns.length;
    const highRiskCount = interns.filter(i => i.riskLevel === '高').length;
    const highPotentialCount = interns.filter(i => i.potentialScore >= 80 || i.potentialType !== '').length;
    const avgFitScore = Math.round(interns.reduce((sum, i) => sum + i.fitScore, 0) / totalInterns);

    const alertsNeedingHR = await prisma.riskAlert.count({
      where: { isActive: true, level: '高' },
    });

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const totalFeedbacks = await prisma.mentorFeedback.count({
      where: { weekStart: { gte: thisWeekStart } },
    });
    const feedbackRate = Math.round((totalFeedbacks / totalInterns) * 100);

    const riskDistribution = {
      high: interns.filter(i => i.riskLevel === '高').length,
      medium: interns.filter(i => i.riskLevel === '中').length,
      low: interns.filter(i => i.riskLevel === '低').length,
    };

    const positions = await prisma.position.findMany();
    const positionStats = positions.map(pos => {
      const posInterns = interns.filter(i => i.positionId === pos.id);
      return {
        name: pos.name,
        count: posInterns.length,
        avgFitScore: posInterns.length > 0
          ? Math.round(posInterns.reduce((sum, i) => sum + i.fitScore, 0) / posInterns.length)
          : 0,
        highRiskCount: posInterns.filter(i => i.riskLevel === '高').length,
        highPotentialCount: posInterns.filter(i => i.potentialScore >= 80 || i.potentialType !== '').length,
      };
    });

    const avgFitByPosition = positionStats.reduce((acc, p) => {
      acc[p.name] = p.avgFitScore;
      return acc;
    }, {} as Record<string, number>);
    const positionGap = Math.abs((avgFitByPosition['研发实习生'] || 0) - (avgFitByPosition['销售实习生'] || 0));

    const { result: aiReminders, status: aiStatus } = await callLLMWithFallback({
      cacheKey: 'dashboard:reminders',
      fallbackFn: () => fallbackReminders(interns, positionGap),
      fallbackTtlMs: 10 * 60_000,
      llmFn: async () => {
        const internSummary = interns.map(i =>
          `【${i.name}】ID:${i.id} 岗位:${i.position.name} 风险:${i.riskLevel} 风险度:${i.riskScore} 适岗度:${i.fitScore} 潜力:${i.potentialScore} 任务完成率:${i.taskCompletionRate}% 标签:${i.tags}`
        ).join('\n');

        const raw = await callLLM({
          system: `你是HR仪表盘AI助手。根据实习生数据生成3-5条今日提醒。返回严格JSON数组：
[{"type":"warning/success/info", "content":"提醒内容", "priority":"high/medium", "internId":"实习生ID(可选)"}]
要求：聚焦最紧急的事项，内容简洁有力，全部中文。internId必须使用上方提供的真实ID。`,
          user: `当前实习生概况：共${totalInterns}人，高风险${riskDistribution.high}人，中风险${riskDistribution.medium}人，高潜${highPotentialCount}人\n\n实习生详情：\n${internSummary}`,
          temperature: 0.6,
          maxTokens: 800,
          jsonMode: true,
          timeoutMs: 1800,
        });

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
        return parsed.map((r: { type: string; content: string; priority: string; internId?: string }, i: number) => ({
          id: i + 1,
          type: r.type || 'info',
          content: r.content,
          priority: r.priority || 'medium',
          internId: r.internId || undefined,
        }));
      },
    });

    return NextResponse.json({
      stats: { totalInterns, highRiskCount, highPotentialCount, avgFitScore, alertsNeedingHR, feedbackRate },
      riskDistribution,
      positionStats,
      aiReminders,
      aiStatus,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

function fallbackReminders(interns: Array<{ id: string; name: string }>, positionGap: number) {
  const findId = (name: string) => interns.find(i => i.name === name)?.id;
  return [
    { id: 1, type: 'warning', content: '张晨连续两周任务延期，建议导师本周进行一次1v1沟通。', priority: 'high', internId: findId('张晨') },
    { id: 2, type: 'success', content: '李安然产品sense提升明显，可加入重点培养名单。', priority: 'medium', internId: findId('李安然') },
    { id: 3, type: 'info', content: `销售岗整体适岗度低于研发岗${positionGap}分，建议检查岗位任务设计是否过难。`, priority: 'medium' },
    { id: 4, type: 'warning', content: '王若曦周报中多次出现"有点迷茫"，建议HR进行关怀沟通。', priority: 'high', internId: findId('王若曦') },
  ];
}
