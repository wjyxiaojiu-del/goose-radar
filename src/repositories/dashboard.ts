import { prisma } from '@/lib/prisma';

/**
 * Dashboard 数据访问层
 * 将聚合查询从路由中移出，使用数据库端计算替代内存过滤
 */

export async function getDashboardAggregates() {
  const [
    totalInterns,
    highRiskCount,
    highPotentialCount,
    avgFitScore,
    alertsNeedingHR,
    riskDistribution,
    positionStats,
  ] = await prisma.$transaction([
    prisma.intern.count(),
    prisma.intern.count({ where: { riskLevel: '高' } }),
    prisma.intern.count({
      where: {
        OR: [{ potentialScore: { gte: 80 } }, { potentialType: { not: '' } }],
      },
    }),
    prisma.intern.aggregate({ _avg: { fitScore: true } }),
    prisma.riskAlert.count({ where: { isActive: true, level: '高' } }),
    prisma.intern.groupBy({
      by: ['riskLevel'],
      _count: { id: true },
      orderBy: { riskLevel: 'asc' },
    }),
    prisma.$queryRaw<
      Array<{
        name: string;
        count: number;
        avgFitScore: number;
        highRiskCount: number;
        highPotentialCount: number;
      }>
    >`
      SELECT
        p.name,
        COUNT(i.id) as count,
        COALESCE(ROUND(AVG(i.fitScore)), 0) as avgFitScore,
        SUM(CASE WHEN i.riskLevel = '高' THEN 1 ELSE 0 END) as highRiskCount,
        SUM(CASE WHEN i.potentialScore >= 80 OR i.potentialType != '' THEN 1 ELSE 0 END) as highPotentialCount
      FROM Position p
      LEFT JOIN Intern i ON i.positionId = p.id
      GROUP BY p.id, p.name
    `,
  ]);

  const avgFit = avgFitScore._avg.fitScore ? Math.round(avgFitScore._avg.fitScore) : 0;

  const riskDist = { high: 0, medium: 0, low: 0 };
  for (const row of riskDistribution) {
    const count = row._count as { id?: number };
    if (row.riskLevel === '高') riskDist.high = count.id ?? 0;
    else if (row.riskLevel === '中') riskDist.medium = count.id ?? 0;
    else riskDist.low = count.id ?? 0;
  }

  // 本周导师反馈率
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const totalFeedbacks = await prisma.mentorFeedback.count({
    where: { weekStart: { gte: thisWeekStart } },
  });
  const feedbackRate = totalInterns > 0 ? Math.round((totalFeedbacks / totalInterns) * 100) : 0;

  return {
    stats: {
      totalInterns,
      highRiskCount,
      highPotentialCount,
      avgFitScore: avgFit,
      alertsNeedingHR,
      feedbackRate,
    },
    riskDistribution: riskDist,
    positionStats,
  };
}
