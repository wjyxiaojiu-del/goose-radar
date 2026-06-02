import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM, callLLMWithFallback } from '@/lib/ai';
import { safeJsonParse } from '@/lib/safe-json';
import { sanitizeForPrompt } from '@/lib/sanitize';
import { createHash } from 'crypto';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' };

export async function GET() {
  try {
    const interns = await prisma.intern.findMany({
      where: { OR: [{ riskLevel: '高' }, { riskLevel: '中' }] },
      include: {
        position: true, mentor: true,
        riskAlerts: { where: { isActive: true } },
        weeklyReports: { orderBy: { weekStart: 'desc' }, take: 1 },
      },
      orderBy: { riskScore: 'desc' },
      take: 100,
    });

    const validIds = new Set(interns.map(i => i.id));
    const internIds = interns.map(i => i.id).join(',');
    const cacheKey = `suggestions:${createHash('sha256').update(internIds).digest('hex')}`;

    const { result, status: aiStatus } = await callLLMWithFallback({
      cacheKey,
      fallbackFn: () => buildFallbackSuggestions(interns),
      llmFn: async () => {
        const internSummary = interns.map(i => {
          const report = i.weeklyReports[0];
          const alertReason = i.riskAlerts[0] ? safeJsonParse(Array.isArray(i.riskAlerts[0].reason) ? JSON.stringify(i.riskAlerts[0].reason) : String(i.riskAlerts[0].reason), [''])[0] : '';
          return `【${sanitizeForPrompt(i.name)}】ID:${i.id} 岗位:${i.position.name} 导师:${i.mentor.name} 风险等级:${i.riskLevel} 风险度:${i.riskScore} 适岗度:${i.fitScore} 任务完成率:${i.taskCompletionRate}% 标签:${JSON.stringify(i.tags)}${report ? ` 最近周报情绪:${report.emotionSignal}` : ''}${alertReason ? ` 预警:${sanitizeForPrompt(alertReason, 200)}` : ''}`;
        }).join('\n');

        const raw = await callLLM({
          system: `你是HR AI助手。根据实习生数据生成干预建议。返回严格JSON：{"hrActions":[],"mentorTemplates":[],"growthSuggestions":[],"nextWeekTasks":{}}`,
          user: `实习生数据：\n${internSummary}`,
          temperature: 0.6, maxTokens: 2000, jsonMode: true, timeoutMs: 5000,
        });

        const parsed = safeJsonParse<Record<string, unknown>>(raw, {});
        if (!parsed.hrActions || !parsed.mentorTemplates || !parsed.growthSuggestions || !parsed.nextWeekTasks) {
          throw new Error('Invalid structure');
        }

        const fixId = (item: { internId?: string; internName?: string }) => {
          if (item.internId && !validIds.has(item.internId)) {
            const match = interns.find(i => i.name === item.internName);
            item.internId = match?.id || '';
          }
          return item;
        };
        const hrActions = ((parsed.hrActions as Array<{ internId?: string; internName?: string }>) || []).map(fixId).filter(a => a.internId);
        const growthSuggestions = ((parsed.growthSuggestions as Array<{ internId?: string; internName?: string }>) || []).map(fixId).filter(a => a.internId);

        return { hrActions, mentorTemplates: parsed.mentorTemplates, growthSuggestions, nextWeekTasks: parsed.nextWeekTasks };
      },
    });

    return NextResponse.json({ ...result, aiStatus }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

function buildFallbackSuggestions(interns: Array<{
  id: string; name: string; riskLevel: string; riskScore: number; fitScore: number; taskCompletionRate: number; tags: unknown;
  position: { name: string }; mentor: { name: string };
  riskAlerts: Array<{ reason: unknown; level: string }>;
  weeklyReports: Array<{ emotionSignal: string }>;
}>) {
  const hrActions = interns
    .filter(i => i.riskLevel === '高' || i.riskAlerts.some(a => a.level === '高'))
    .map(intern => {
      const reason = intern.riskAlerts[0] ? safeJsonParse(Array.isArray(intern.riskAlerts[0].reason) ? JSON.stringify(intern.riskAlerts[0].reason) : String(intern.riskAlerts[0].reason), ['需要关注'])[0] : '需要关注';
      const isLowFit = intern.fitScore < 60;
      const isLowCompletion = intern.taskCompletionRate < 60;
      return {
        internId: intern.id, internName: intern.name, position: intern.position.name, mentor: intern.mentor.name,
        priority: 'high' as const, reason,
        goal: isLowFit ? `确认${intern.name}是否存在岗位理解偏差` : isLowCompletion ? `了解任务延期原因` : `关注情绪状态`,
        method: '一对一沟通',
        suggestion: isLowFit ? `${intern.name}适岗度偏低，建议本周安排非正式沟通。` : isLowCompletion ? `${intern.name}任务完成率仅${intern.taskCompletionRate}%，建议对齐情况。` : `${intern.name}近期${reason}，建议关怀面谈。`,
      };
    });

  const mentorTemplates = [
    { title: '了解任务困难', questions: ['你觉得最近最卡住的任务是哪一个？', '你觉得是背景信息不足，还是方法不清楚？', '哪些地方希望我给你更多反馈？'] },
    { title: '明确目标与支持', questions: ['下周你希望独立承担什么任务？', '我们可以把目标拆成哪两个小步骤？', '你觉得团队里谁可以帮你解答这类问题？'] },
    { title: '情绪与状态关注', questions: ['最近工作节奏适应吗？', '你觉得目前的工作内容和你的预期一致吗？', '有什么我可以帮你调整的吗？'] },
  ];

  const growthSuggestions = interns.map(intern => {
    const suggestions: string[] = [];
    if (intern.fitScore < 50) suggestions.push('基础任务优先，本周安排1个可独立完成的任务');
    else if (intern.fitScore < 65) suggestions.push('适当降低任务难度，先完成一个完整闭环建立信心');
    if (intern.taskCompletionRate < 50) suggestions.push('本周只安排2个核心任务，减少并行');
    else if (intern.taskCompletionRate < 70) suggestions.push('明确任务验收标准，避免理解偏差导致返工');
    if (intern.weeklyReports[0]?.emotionSignal === '消极') suggestions.push('导师本周安排一次轻松的1v1，不聊KPI');
    if (intern.riskScore > 70) suggestions.push('HR本周内完成一次关怀沟通');
    if (suggestions.length === 0) suggestions.push('继续保持，本周尝试承担一个有挑战的小模块');
    return { internId: intern.id, internName: intern.name, position: intern.position.name, fitScore: intern.fitScore, riskScore: intern.riskScore, suggestions };
  });

  const nextWeekTasks: Record<string, string[]> = {
    '研发实习生': ['修复1个低风险Bug', '完成1次代码Review', '输出模块学习笔记', '参与一次技术方案讨论'],
    '产品实习生': ['完成1份竞品分析', '参与1次需求评审', '输出1页用户反馈总结', '向导师复盘一次产品判断'],
    '销售实习生': ['整理10个客户线索', '旁听2次客户沟通', '模拟一次产品介绍', '输出客户异议清单'],
  };

  return { hrActions, mentorTemplates, growthSuggestions, nextWeekTasks };
}
