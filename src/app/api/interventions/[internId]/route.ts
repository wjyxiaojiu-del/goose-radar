import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { callLLM, callLLMWithFallback } from '@/lib/ai';
import { safeJsonParse } from '@/lib/safe-json';
import { sanitizeForPrompt } from '@/lib/sanitize';

const paramsSchema = z.object({ internId: z.string().min(1) });

export async function GET(request: Request, { params }: { params: Promise<{ internId: string }> }) {
  try {
    const { internId } = paramsSchema.parse(await params);
    const skipCache = new URL(request.url).searchParams.get('fresh') === '1';

    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      include: {
        position: true, mentor: true,
        weeklyReports: { orderBy: { weekStart: 'desc' }, take: 3 },
        mentorFeedbacks: { orderBy: { weekStart: 'desc' }, take: 3, include: { mentor: true } },
        tasks: { orderBy: { weekStart: 'desc' }, take: 8 },
        abilityScores: { orderBy: { weekStart: 'desc' }, take: 6 },
        riskAlerts: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        scoreHistory: { orderBy: { weekStart: 'asc' }, take: 4 },
      },
    });

    if (!intern) return NextResponse.json({ error: 'Intern not found' }, { status: 404 });

    const tags: string[] = safeJsonParse(Array.isArray(intern.tags) ? JSON.stringify(intern.tags) : String(intern.tags), []);

    const internInfo = {
      id: intern.id, name: intern.name, position: intern.position.name, mentor: intern.mentor.name,
      riskLevel: intern.riskLevel, riskScore: intern.riskScore, fitScore: intern.fitScore, potentialScore: intern.potentialScore, tags,
    };

    const { result, status: aiStatus } = await callLLMWithFallback({
      cacheKey: `intervention:${internId}`, skipCache,
      fallbackFn: () => ({
        riskSummary: buildRiskSummary(intern.name, intern.riskLevel, intern.riskScore, tags, intern.riskAlerts),
        evidence: buildEvidence(intern.weeklyReports, intern.mentorFeedbacks, intern.tasks, intern.scoreHistory),
        hrScript: buildHrScript(intern.name, intern.riskLevel, intern.riskScore, tags),
        mentorOutline: buildMentorOutline(intern.name, intern.position.name, intern.riskLevel, tags),
        nextWeekTasks: buildNextWeekTasks(intern.name, intern.position.name, intern.riskLevel),
      }),
      llmFn: async () => {
        const reports = intern.weeklyReports.map(r =>
          `[${r.weekStart.toISOString().split('T')[0]}] 情绪:${r.emotionSignal} 需帮助:${r.needsHelp}\n${sanitizeForPrompt(r.content, 300)}`
        ).join('\n---\n');
        const feedbacks = intern.mentorFeedbacks.map(f =>
          `[${sanitizeForPrompt(f.mentor.name)} ${f.weekStart.toISOString().split('T')[0]}] 评分:${f.performance}/5 HR介入:${f.needsHR}\n评价:${sanitizeForPrompt(f.comment, 300)}\n优点:${sanitizeForPrompt(f.strengths, 200)}\n担忧:${sanitizeForPrompt(f.concerns, 200)}`
        ).join('\n---\n');
        const overdueTasks = intern.tasks.filter(t => t.status === 'overdue').map(t => t.title).join('、');
        const trend = intern.scoreHistory.map(s => `${s.weekStart.toISOString().split('T')[0]}: 适岗${s.fitScore} 风险${s.riskScore} 潜力${s.potentialScore}`).join('\n');

        const raw = await callLLM({
          system: `你是HR干预方案AI。返回严格JSON：{"riskSummary":{},"evidence":[],"hrScript":{},"mentorOutline":{},"nextWeekTasks":{}}`,
          user: `实习生：${intern.name}，${intern.position.name}，风险:${intern.riskLevel}，风险度:${intern.riskScore}，适岗度:${intern.fitScore}，潜力:${intern.potentialScore}，任务完成率:${intern.taskCompletionRate}%，标签:${tags.join('、')}${overdueTasks ? `\n逾期任务: ${overdueTasks}` : ''}\n\n周报:\n${reports}\n\n导师反馈:\n${feedbacks}\n\n趋势:\n${trend}`,
          temperature: 0.7, maxTokens: 2500, jsonMode: true, timeoutMs: 8000,
        });

        const parsed = safeJsonParse<Record<string, unknown>>(raw, {});
        if (!parsed.riskSummary || !parsed.evidence || !parsed.hrScript || !parsed.mentorOutline || !parsed.nextWeekTasks) {
          throw new Error('Invalid structure');
        }
        return parsed as Record<string, unknown>;
      },
    });

    return NextResponse.json({ intern: internInfo, aiStatus, ...result });
  } catch (error) {
    console.error('Intervention API error:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to generate intervention' }, { status: 500 });
  }
}

function buildRiskSummary(name: string, riskLevel: string, riskScore: number, tags: string[], alerts: Array<{ type: string; reason: unknown }>) {
  const reasons: string[] = [];
  if (riskScore > 60) reasons.push(`风险度评分 ${riskScore}，超过警戒线（60）`);
  if (tags.includes('任务延期')) reasons.push('近两周出现任务延期');
  if (tags.includes('情绪波动')) reasons.push('周报中出现情绪波动信号');
  if (tags.includes('反馈偏少')) reasons.push('主动反馈频率下降');
  if (tags.includes('进度慢')) reasons.push('整体进度低于同期实习生');
  if (tags.includes('有点迷茫')) reasons.push('周报中表达迷茫感');
  if (alerts.length > 0) reasons.push(`系统已生成 ${alerts.length} 条活跃预警`);
  if (reasons.length === 0) reasons.push('综合指标触发关注阈值');

  const headlines: Record<string, string> = {
    '张晨': '研发基础薄弱（适岗度 45），连续任务延期，编程能力不足以支撑当前任务复杂度。',
    '王若曦': '产品入门期迷茫（适岗度 58），周报多次表达不确定感，任务完成率仅 52%。',
    '梁雨萱': '销售适岗度极低（45），情绪波动明显，客户跟进不及时，留用风险高。',
  };

  return {
    level: riskLevel, score: riskScore,
    headline: headlines[name] || (riskLevel === '高' ? '该同学当前处于高风险状态，需要本周内介入' : riskLevel === '中' ? '该同学存在成长瓶颈信号，建议本周关注' : '该同学状态基本稳定，保持常规跟进'),
    reasons,
  };
}

function buildEvidence(reports: Array<{ weekStart: Date; content: string; emotionSignal: string; needsHelp: boolean }>, feedbacks: Array<{ weekStart: Date; mentor: { name: string }; performance: number; comment: string; concerns: string; needsHR: boolean }>, tasks: Array<{ title: string; status: string; weekStart: Date }>, scoreHistory: Array<{ weekStart: Date; fitScore: number; riskScore: number }>) {
  const items: Array<{ source: string; content: string; signal: string }> = [];
  for (const report of reports.slice(0, 2)) {
    if (report.emotionSignal === '消极' || report.needsHelp) {
      const sentences = report.content.split(/[。！？]/).filter(s => s.trim().length > 5);
      const keySentences = sentences.filter(s => /焦虑|迷茫|压力|困难|延期|没头绪|跟不上|不太敢/.test(s));
      items.push({ source: `周报（${new Date(report.weekStart).toLocaleDateString('zh-CN')}）`, content: keySentences.length > 0 ? keySentences[0] + '。' : report.content.substring(0, 80) + '…', signal: report.emotionSignal === '消极' ? '情绪消极' : '需要帮助' });
    }
  }
  for (const feedback of feedbacks.slice(0, 2)) {
    if (feedback.performance <= 3 || feedback.needsHR) {
      items.push({ source: `导师 ${feedback.mentor.name}（${new Date(feedback.weekStart).toLocaleDateString('zh-CN')}）`, content: feedback.comment.substring(0, 100), signal: feedback.needsHR ? '需HR介入' : `评分 ${feedback.performance}/5` });
    }
  }
  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  if (overdueTasks.length > 0) items.push({ source: '任务系统', content: `${overdueTasks.length} 个任务逾期未完成：${overdueTasks.map(t => t.title).join('、')}`, signal: '任务延期' });
  if (scoreHistory.length >= 2) {
    const latest = scoreHistory[scoreHistory.length - 1];
    const prev = scoreHistory[scoreHistory.length - 2];
    const fitChange = latest.fitScore - prev.fitScore;
    if (fitChange < -5) items.push({ source: '评分趋势', content: `适岗度近一周下降 ${Math.abs(fitChange)} 分（${prev.fitScore} → ${latest.fitScore}）`, signal: '趋势下行' });
  }
  if (items.length === 0) items.push({ source: '综合评估', content: '各项指标综合触发关注阈值', signal: '综合信号' });
  return items;
}

function buildHrScript(name: string, riskLevel: string, riskScore: number, tags: string[]) {
  const scripts: Record<string, { opener: string; followUp: string; closing: string }> = {
    '张晨': { opener: '张晨同学，我看你最近几个任务花的时间比预期多了不少，想跟你聊聊。', followUp: '你觉得目前最难的是哪个部分？', closing: '编程基础不是一天能补上的，但我们可以把任务拆得更细。下周先从一个小功能开始。' },
    '王若曦': { opener: '王若曦同学，入职一个月了，想跟你聊聊这段时间的感受。', followUp: '你觉得迷茫主要是对产品方向不理解，还是不确定自己该做什么？', closing: '迷茫在刚入职的时候很正常。下周给你安排一个完整的用户调研小任务。' },
    '梁雨萱': { opener: '梁雨萱同学，最近看你情绪不太好，想跟你聊聊。', followUp: '你觉得目前最大的压力来源是什么？', closing: '销售岗前期确实压力大。下周让导师带你跑两个客户，先建立一些信心。' },
  };
  if (scripts[name]) {
    const s = scripts[name];
    return { opener: s.opener, followUp: s.followUp, closing: s.closing, fullScript: `${s.opener}\n\n${s.followUp}\n\n${s.closing}`, tips: ['以关心开场', '多听少说', '记录具体困难点', '沟通后24小时内发确认消息'] };
  }
  const opener = riskLevel === '高' ? `${name}同学，最近看你周报里提到一些挑战，想跟你聊聊。` : `${name}同学，入职一段时间了，想跟你聊聊最近的感受。`;
  const followUp = tags.includes('情绪波动') || tags.includes('有点迷茫') ? '你觉得目前最大的压力来源是什么？' : tags.includes('任务延期') ? '我注意到最近任务时间比预期长，能说说是卡在哪里了吗？' : '最近工作感觉怎么样？';
  const closing = riskLevel === '高' ? '遇到困难及时说，我们一起想办法。' : '继续加油，有困难随时找导师或我。';
  return { opener, followUp, closing, fullScript: `${opener}\n\n${followUp}\n\n${closing}`, tips: ['以关心开场', '多听少说', '记录具体困难点', '沟通后24小时内发确认消息'] };
}

function buildMentorOutline(name: string, position: string, riskLevel: string, tags: string[]) {
  return {
    title: `与 ${name} 的 1v1 沟通提纲`, duration: '20-30 分钟',
    atmosphere: riskLevel === '高' ? '选择轻松的环境，避免会议室正式感' : '常规 1v1 即可',
    questions: [
      { q: '最近手头的任务，哪个做得最顺？哪个最卡？', purpose: '了解具体困难点' },
      { q: tags.includes('情绪波动') || tags.includes('有点迷茫') ? '你觉得自己现在最大的压力是什么？' : '你觉得自己的工作方式有什么可以改进的？', purpose: '了解心理状态' },
      { q: '接下来一周，你最想完成的一件事是什么？', purpose: '建立下周目标感' },
    ],
    closingAdvice: riskLevel === '高' ? '结束时明确告诉对方：不会因为短期困难否定整体表现。' : '结束时肯定做得好的地方，给出 1-2 个具体的改进建议。',
  };
}

function buildNextWeekTasks(name: string, position: string, riskLevel: string) {
  const personalized: Record<string, { principle: string; tasks: Array<{ title: string; description: string; deliverable: string; acceptance: string }> }> = {
    '张晨': { principle: '本周以"能完成"为核心目标', tasks: [{ title: '修复 2 个标注为"简单"的 Bug', description: '选择复杂度最低的两个', deliverable: '代码提交 + 通过 CI', acceptance: 'Bug 修复后功能正常' }, { title: '跟着导师完成 1 次 Code Review', description: '看导师怎么 review 别人的代码', deliverable: '笔记：导师关注了哪些点', acceptance: '能说出 3 个以上 review 要点' }] },
    '王若曦': { principle: '通过具体的小任务建立方向感', tasks: [{ title: '整理 5 条用户反馈并分类', description: '从客服系统导出最近一周反馈', deliverable: '用户反馈分类表', acceptance: '分类准确，每条有简要分析' }, { title: '旁听 1 次需求评审会', description: '跟随导师参加，记录讨论要点', deliverable: '会议记录 + 3 条个人思考', acceptance: '记录完整，思考有业务视角' }] },
    '梁雨萱': { principle: '本周目标是建立第一个成功经验', tasks: [{ title: '跟随导师拜访 2 个客户', description: '全程旁听学习沟通方式', deliverable: '客户拜访笔记', acceptance: '记录客户核心关注点和导师应对方式' }, { title: '整理 3 个竞品的销售话术', description: '收集竞品公开资料', deliverable: '竞品话术对比表', acceptance: '每个竞品至少 3 个核心卖点' }] },
  };
  if (personalized[name]) return personalized[name];
  return { principle: riskLevel === '高' ? '本周任务以"能完成"为第一目标' : '任务难度略高于当前能力，促进成长', tasks: [] };
}
