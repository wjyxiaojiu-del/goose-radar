import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock repository
vi.mock('@/repositories/dashboard', () => ({
  getDashboardAggregates: vi.fn(),
}));

// Mock prisma (dashboard route does a second query for internList)
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = { intern: { findMany: vi.fn() } };
  return { mockPrisma };
});
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

// Mock AI
vi.mock('@/lib/ai', () => ({
  callLLM: vi.fn(),
  callLLMWithFallback: vi.fn(),
}));

import { GET } from '../dashboard/route';
import { getDashboardAggregates } from '@/repositories/dashboard';
import { callLLMWithFallback } from '@/lib/ai';

beforeEach(() => {
  vi.clearAllMocks();
});

const mockAggregates = {
  stats: {
    totalInterns: 20,
    highRiskCount: 3,
    highPotentialCount: 8,
    avgFitScore: 75,
    alertsNeedingHR: 2,
    feedbackRate: 80,
  },
  riskDistribution: { high: 3, medium: 7, low: 10 },
  positionStats: [
    { name: '研发', count: 10, avgFitScore: 80, highRiskCount: 1, highPotentialCount: 5 },
  ],
};

describe('GET /api/dashboard', () => {
  it('返回完整的仪表盘数据', async () => {
    vi.mocked(getDashboardAggregates).mockResolvedValue(mockAggregates);
    mockPrisma.intern.findMany.mockResolvedValue([]);
    vi.mocked(callLLMWithFallback).mockResolvedValue({
      result: { aiReminders: [{ id: 1, type: 'info', content: 'test', priority: 'medium' }] },
      status: 'live',
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats.totalInterns).toBe(20);
    expect(body.riskDistribution).toEqual({ high: 3, medium: 7, low: 10 });
    expect(body.aiReminders).toHaveLength(1);
    expect(body.aiStatus).toBe('live');
  });

  it('包含 Cache-Control header', async () => {
    vi.mocked(getDashboardAggregates).mockResolvedValue(mockAggregates);
    mockPrisma.intern.findMany.mockResolvedValue([]);
    vi.mocked(callLLMWithFallback).mockResolvedValue({
      result: { aiReminders: [] },
      status: 'fallback',
    });

    const res = await GET();
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  });

  it('仓库错误返回 500', async () => {
    vi.mocked(getDashboardAggregates).mockRejectedValue(new Error('DB error'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
