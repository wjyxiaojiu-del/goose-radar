import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getDashboardAggregates } from '@/repositories/dashboard';
import { callLLM, callLLMWithFallback } from '@/lib/ai';
import { safeJsonParse } from '@/lib/safe-json';
import { sanitizeForPrompt } from '@/lib/sanitize';
import { setCsrfCookie } from '@/lib/csrf';
import type { DashboardData, AIReminder } from '@/types/api';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' };

export async function GET() {
  try {
    const { stats, riskDistribution, positionStats } = await getDashboardAggregates();

    // LLM 需要原始 intern 列表
    const { prisma } = await import('@/lib/prisma');
    const internList = await prisma.intern.findMany({
      select: {
        id: true,
        name: true,
        riskLevel: true,
        riskScore: true,
        fitScore: true,
        potentialScore: true,
        taskCompletionRate: true,
        tags: true,
        position: { select: { name: true } },
      },
    });

    const totalInterns = stats.totalInterns;
    const highPotentialCount = stats.highPotentialCount;
    const riskDist = riskDistribution;

    const avgFitByPosition = positionStats.reduce((acc, p) => {
      acc[p.name] = p.avgFitScore;
      return acc;
    }, {} as Record<string, number>);
    const positionGap = Math.abs((avgFitByPosition['研发实习生'] || 0) - (avgFitByPosition['销售实习生'] || 0));

    const { result: aiReminders, status: aiStatus } = await callLLMWithFallback<{
      aiReminders: AIReminder[];
    }>({
      cacheKey: 'dashboard:reminders',
      fallbackFn: () => ({ aiReminders: fallbackReminders(internList, positionGap) }),
      fallbackTtlMs: 10 * 60_000,
      llmFn: async () => {
        const internSummary = internList
          .map(
            (i) =>
              `【${sanitizeForPrompt(i.name)}】ID:${i.id} 岗位:${i.position.name} 风险:${i.riskLevel} 风险度:${i.riskScore} 适岗度:${i.fitScore} 潜力:${i.potentialScore} 任务完成率:${i.taskCompletionRate}% 标签:${JSON.stringify(i.tags)}`
          )
          .join('\n');

        const raw = await callLLM({
          system: `你是HR仪表盘AI助手。根据实习生数据生成3-5条今日提醒。返回严格JSON数组：
[{"type":"warning/success/info", "content":"提醒内容", "priority":"high/medium", "internId":"实习生ID(可选)"}]
要求：聚焦最紧急的事项，内容简洁有力，全部中文。internId必须使用上方提供的真实ID。`,
          user: `当前实习生概况：共${totalInterns}人，高风险${riskDist.high}人，中风险${riskDist.medium}人，高潜${highPotentialCount}人\n\n实习生详情：\n${internSummary}`,
          temperature: 0.6,
          maxTokens: 800,
          jsonMode: true,
          timeoutMs: 5000,
        });

        const parsed = safeJsonParse<unknown[]>(raw, []);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
        const reminders = parsed.map(
          (r: unknown, i: number) =>
            ({
              id: i + 1,
              type: (r as Record<string, string>).type || 'info',
              content: sanitizeForPrompt((r as Record<string, string>).content, 200),
              priority: (r as Record<string, string>).priority || 'medium',
              internId: (r as Record<string, string>).internId || undefined,
            } as AIReminder)
        );
        return { aiReminders: reminders };
      },
    });

    const payload: DashboardData = {
      stats,
      riskDistribution,
      positionStats,
      aiReminders: aiReminders.aiReminders,
      aiStatus,
    };

    await setCsrfCookie();

    return NextResponse.json(payload, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

function fallbackReminders(
  interns: Array<{ id: string; name: string }>,
  positionGap: number
): AIReminder[] {
  const findId = (name: string) => interns.find((i) => i.name === name)?.id;
  return [
    {
      id: 1,
      type: 'warning',
      content: '张晨连续两周任务延期，建议导师本周进行一次1v1沟通。',
      priority: 'high',
      internId: findId('张晨'),
    },
    {
      id: 2,
      type: 'success',
      content: '李安然产品sense提升明显，可加入重点培养名单。',
      priority: 'medium',
    },
    {
      id: 3,
      type: 'info',
      content: `销售岗整体适岗度低于研发岗${positionGap}分，建议检查岗位任务设计是否过难。`,
      priority: 'medium',
    },
    {
      id: 4,
      type: 'warning',
      content: '王若曦周报中多次出现"有点迷茫"，建议HR进行关怀沟通。',
      priority: 'high',
      internId: findId('王若曦'),
    },
  ];
}
