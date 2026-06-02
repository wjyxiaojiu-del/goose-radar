import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    intern: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    riskAlert: { count: vi.fn() },
    mentorFeedback: { count: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getDashboardAggregates } from '../dashboard';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getDashboardAggregates', () => {
  it('返回正确的统计数据结构', async () => {
    // $transaction 返回数组：[totalInterns, highRiskCount, highPotentialCount, avgFitScore, alertsNeedingHR, riskDistribution, positionStats]
    mockPrisma.$transaction.mockResolvedValue([
      20, // totalInterns
      3,  // highRiskCount
      8,  // highPotentialCount
      { _avg: { fitScore: 75.5 } }, // avgFitScore
      2,  // alertsNeedingHR
      [   // riskDistribution
        { riskLevel: '高', _count: { id: 3 } },
        { riskLevel: '中', _count: { id: 7 } },
        { riskLevel: '低', _count: { id: 10 } },
      ],
      [   // positionStats
        { name: '研发', count: 10, avgFitScore: 80, highRiskCount: 1, highPotentialCount: 5 },
        { name: '产品', count: 5, avgFitScore: 70, highRiskCount: 1, highPotentialCount: 2 },
      ],
    ]);

    // mentorFeedback.count 用于计算反馈率
    mockPrisma.mentorFeedback.count.mockResolvedValue(15);

    const result = await getDashboardAggregates();

    expect(result.stats.totalInterns).toBe(20);
    expect(result.stats.highRiskCount).toBe(3);
    expect(result.stats.highPotentialCount).toBe(8);
    expect(result.stats.avgFitScore).toBe(76); // Math.round(75.5)
    expect(result.stats.alertsNeedingHR).toBe(2);
    expect(result.stats.feedbackRate).toBe(75); // 15/20 = 75%

    expect(result.riskDistribution).toEqual({ high: 3, medium: 7, low: 10 });
    expect(result.positionStats).toHaveLength(2);
  });

  it('avgFitScore 为 null 时返回 0', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      0, 0, 0,
      { _avg: { fitScore: null } },
      0, [], [],
    ]);
    mockPrisma.mentorFeedback.count.mockResolvedValue(0);

    const result = await getDashboardAggregates();
    expect(result.stats.avgFitScore).toBe(0);
  });

  it('totalInterns 为 0 时 feedbackRate 为 0', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      0, 0, 0,
      { _avg: { fitScore: 0 } },
      0, [], [],
    ]);
    mockPrisma.mentorFeedback.count.mockResolvedValue(0);

    const result = await getDashboardAggregates();
    expect(result.stats.feedbackRate).toBe(0);
  });
});
