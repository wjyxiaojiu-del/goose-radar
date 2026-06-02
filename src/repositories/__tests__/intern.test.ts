import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    intern: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getInternsList, getInternById } from '../intern';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getInternsList', () => {
  it('返回实习生列表和总数', async () => {
    const mockInterns = [
      { id: '1', name: '张三', fitScore: 85, position: { name: '研发' }, mentor: { name: '李导' } },
      { id: '2', name: '李四', fitScore: 70, position: { name: '产品' }, mentor: { name: '王导' } },
    ];
    mockPrisma.$transaction.mockResolvedValue([mockInterns, 2]);

    const result = await getInternsList(0, 10);
    expect(result.interns).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('传递正确的分页参数', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0]);

    await getInternsList(10, 20);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    // 验证传给 prisma 的参数
    const calls = mockPrisma.$transaction.mock.calls[0][0];
    expect(calls).toHaveLength(2); // findMany + count
  });
});

describe('getInternById', () => {
  it('返回实习生详情', async () => {
    const mockIntern = {
      id: '1',
      name: '张三',
      position: { name: '研发' },
      mentor: { name: '李导' },
      weeklyReports: [],
      mentorFeedbacks: [],
      tasks: [],
      abilityScores: [],
      riskAlerts: [],
      scoreHistory: [],
    };
    mockPrisma.intern.findUnique.mockResolvedValue(mockIntern);

    const result = await getInternById('1');
    expect(result).toEqual(mockIntern);
    expect(mockPrisma.intern.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '1' } })
    );
  });

  it('未找到时返回 null', async () => {
    mockPrisma.intern.findUnique.mockResolvedValue(null);
    const result = await getInternById('nonexistent');
    expect(result).toBeNull();
  });
});
