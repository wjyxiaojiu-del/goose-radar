import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    riskAlert: { findMany: vi.fn(), update: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getActiveAlerts, resolveAlert } from '../alert';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getActiveAlerts', () => {
  it('返回活跃预警列表', async () => {
    const mockAlerts = [
      {
        id: '1',
        type: '低投入',
        level: '高',
        reason: { summary: '连续两周未提交周报' },
        action: '与导师沟通',
        createdAt: new Date('2025-01-15'),
        intern: {
          id: 'i1',
          name: '张三',
          school: '北大',
          fitScore: 60,
          riskScore: 80,
          position: { name: '研发' },
          mentor: { name: '李导' },
        },
      },
    ];
    mockPrisma.riskAlert.findMany.mockResolvedValue(mockAlerts);

    const result = await getActiveAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].intern.name).toBe('张三');
  });

  it('无预警时返回空数组', async () => {
    mockPrisma.riskAlert.findMany.mockResolvedValue([]);
    const result = await getActiveAlerts();
    expect(result).toEqual([]);
  });

  it('查询条件为 isActive: true', async () => {
    mockPrisma.riskAlert.findMany.mockResolvedValue([]);
    await getActiveAlerts();
    expect(mockPrisma.riskAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );
  });
});

describe('resolveAlert', () => {
  it('更新预警为已解决', async () => {
    const mockResolved = { id: '1', isActive: false, resolvedAt: new Date(), resolvedBy: 'HR张' };
    mockPrisma.riskAlert.update.mockResolvedValue(mockResolved);

    const result = await resolveAlert('1', 'HR张');
    expect(result.isActive).toBe(false);
    expect(result.resolvedBy).toBe('HR张');
  });

  it('resolvedBy 可选', async () => {
    mockPrisma.riskAlert.update.mockResolvedValue({ id: '1', isActive: false, resolvedAt: new Date(), resolvedBy: null });

    await resolveAlert('1');
    expect(mockPrisma.riskAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resolvedBy: null }),
      })
    );
  });
});
