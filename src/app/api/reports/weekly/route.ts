import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAIAvailable, callLLM, callLLMWithFallback } from '@/lib/ai';

export async function GET() {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalInterns,
      highRiskCount,
      highPotentialCount,
      avgFitScoreResult,
      avgRiskScoreResult,
      avgPotentialScoreResult,
      activeAlerts,
      thisWeekAlerts,
      riskDistribution,
      positionStats,
      highRiskInterns,
      highPotentialInterns,
    ] = await prisma.$transaction([
      prisma.intern.count(),
      prisma.intern.count({ where: { riskLevel: '高' } }),
      prisma.intern.count({ where: { potentialScore: { gte: 80 } } }),
      prisma.intern.aggregate({ _avg: { fitScore: true } }),
      prisma.intern.aggregate({ _avg: { riskScore: true } }),
      prisma.intern.aggregate({ _avg: { potentialScore: true } }),
      prisma.riskAlert.count({ where: { isActive: true } }),
      prisma.riskAlert.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.intern.groupBy({ by: ['riskLevel'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.position.findMany({
        include: {
          _count: { select: { interns: true } },
          interns: { select: { fitScore: true, riskScore: true, potentialScore: true } },
        },
      }),
      prisma.intern.findMany({
        where: { riskLevel: '高' },
        include: { position: true, mentor: true, abilityScores: true, riskAlerts: { where: { isActive: true } } },
        orderBy: { riskScore: 'desc' },
        take: 10,
      }),
      prisma.intern.findMany({
        where: { potentialScore: { gte: 80 } },
        include: { position: true, mentor: true, abilityScores: true },
        orderBy: { potentialScore: 'desc' },
        take: 10,
      }),
    ]);

    const positionStatsMapped = positionStats.map(p => ({
      name: p.name,
      count: p._count.interns,
      avgFitScore: p.interns.length > 0
        ? Math.round(p.interns.reduce((s, i) => s + i.fitScore, 0) / p.interns.length)
        : 0,
      avgRiskScore: p.interns.length > 0
        ? Math.round(p.interns.reduce((s, i) => s + i.riskScore, 0) / p.interns.length)
        : 0,
    }));

    const highRiskMapped = highRiskInterns.map(i => ({
      name: i.name,
      school: i.school,
      position: i.position.name,
      mentor: i.mentor.name,
      fitScore: i.fitScore,
      riskScore: i.riskScore,
      potentialScore: i.potentialScore,
      taskCompletionRate: i.taskCompletionRate,
      phase: i.phase,
      abilityScores: i.abilityScores.map(a => ({ dimension: a.dimension, score: a.score })),
      activeAlerts: i.riskAlerts.length,
    }));

    const highPotentialMapped = highPotentialInterns.map(i => ({
      name: i.name,
      school: i.school,
      position: i.position.name,
      mentor: i.mentor.name,
      fitScore: i.fitScore,
      riskScore: i.riskScore,
      potentialScore: i.potentialScore,
      phase: i.phase,
      abilityScores: i.abilityScores.map(a => ({ dimension: a.dimension, score: a.score })),
    }));

    // AI analysis (with fallback for demo mode)
    const aiSummary = await callLLMWithFallback({
      cacheKey: 'weekly-report-summary',
      llmFn: async () => {
        if (!isAIAvailable()) return buildFallbackSummary(highRiskCount, highPotentialCount, activeAlerts);
        const prompt = `基于以下数据生成一段周度实习生管理分析摘要（150字以内），指出关键风险和行动建议：
总人数 ${totalInterns}，高风险 ${highRiskCount} 人，高潜 ${highPotentialCount} 人，平均适岗度 ${Math.round(avgFitScoreResult._avg.fitScore || 0)} 分，待处理预警 ${activeAlerts} 条，本周新增预警 ${thisWeekAlerts} 条。`;
        return callLLM({
          system: '你是HR数据分析专家，输出简洁有力的管理洞察。',
          user: prompt,
          maxTokens: 300,
          temperature: 0.5,
        });
      },
      fallbackFn: () => buildFallbackSummary(highRiskCount, highPotentialCount, activeAlerts),
    });

    return NextResponse.json({
      meta: {
        title: '鹅苗雷达 · 周度实习生分析报告',
        period: `${weekStart.toLocaleDateString('zh-CN')} ~ ${now.toLocaleDateString('zh-CN')}`,
        generatedAt: now.toISOString(),
        aiMode: aiSummary.status === 'live' || aiSummary.status === 'cached-live' ? '实时AI' : '演示模式',
      },
      overview: {
        totalInterns,
        highRiskCount,
        highPotentialCount,
        avgFitScore: Math.round(avgFitScoreResult._avg.fitScore || 0),
        avgRiskScore: Math.round(avgRiskScoreResult._avg.riskScore || 0),
        avgPotentialScore: Math.round(avgPotentialScoreResult._avg.potentialScore || 0),
        activeAlerts,
        thisWeekAlerts,
        riskDistribution: Object.fromEntries(riskDistribution.map(r => [r.riskLevel, typeof r._count === 'object' ? r._count.id ?? 0 : 0])),
      },
      positionStats: positionStatsMapped,
      highRiskInterns: highRiskMapped,
      highPotentialInterns: highPotentialMapped,
      aiSummary: aiSummary.result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildFallbackSummary(highRisk: number, highPotential: number, alerts: number): string {
  if (highRisk > 0) {
    return `本周重点关注 ${highRisk} 位高风险实习生，建议立即安排导师一对一沟通并制定干预方案。同时 ${highPotential} 位高潜人才值得加大培养投入。当前待处理预警 ${alerts} 条，需尽快闭环。`;
  }
  if (alerts > 0) {
    return `整体状态平稳，但仍有 ${alerts} 条预警待处理。建议关注 ${highPotential} 位高潜人才的发展路径规划。`;
  }
  return `本周实习生整体状态良好，建议继续保持常规跟进节奏，同时加大对 ${highPotential} 位高潜人才的培养力度。`;
}
