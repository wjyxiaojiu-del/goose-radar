import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma Client — 使用 vi.hoisted 确保 mock 在 vi.mock 之前可用
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    intern: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    riskAlert: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { executeTool, TOOL_DEFINITIONS } from '../assistant-tools';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TOOL_DEFINITIONS', () => {
  it('定义了 5 个工具', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(5);
  });

  it('每个工具有 name 和 description', () => {
    TOOL_DEFINITIONS.forEach(tool => {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
    });
  });

  it('工具名是 executeTool 可识别的', () => {
    const names = TOOL_DEFINITIONS.map(t => t.name);
    expect(names).toContain('list_interns');
    expect(names).toContain('get_intern_detail');
    expect(names).toContain('list_alerts');
    expect(names).toContain('get_dashboard_stats');
    expect(names).toContain('compare_interns');
  });
});

describe('executeTool - list_interns', () => {
  it('返回实习生列表', async () => {
    mockPrisma.intern.findMany.mockResolvedValue([
      { id: '1', name: '张三', school: '北大', major: 'CS', position: { name: '研发' }, mentor: { name: '李导' }, fitScore: 85, riskScore: 20, potentialScore: 90, riskLevel: '低', potentialType: '高潜', taskCompletionRate: 0.9, phase: '产出期' },
    ]);

    const result = await executeTool('list_interns', {});
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.summary).toContain('1');
  });

  it('支持风险等级筛选', async () => {
    mockPrisma.intern.findMany.mockResolvedValue([]);
    await executeTool('list_interns', { riskLevel: '高' });
    expect(mockPrisma.intern.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { riskLevel: '高' } })
    );
  });

  it('限制返回数量上限为 50', async () => {
    mockPrisma.intern.findMany.mockResolvedValue([]);
    await executeTool('list_interns', { limit: 100 });
    expect(mockPrisma.intern.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });
});

describe('executeTool - get_intern_detail', () => {
  it('返回实习生详情', async () => {
    mockPrisma.intern.findFirst.mockResolvedValue({
      id: '1', name: '张三', school: '北大', major: 'CS',
      position: { name: '研发' }, mentor: { name: '李导', department: '技术部' },
      entryDate: '2025-01-01', phase: '产出期',
      fitScore: 85, riskScore: 20, potentialScore: 90,
      taskCompletionRate: 0.9, riskLevel: '低', potentialType: '高潜',
      tags: [],
      abilityScores: [{ dimension: '编码', score: 88 }],
      weeklyReports: [{ weekStart: '2025-01-06', aiSummary: '表现良好', emotionSignal: '积极', needsHelp: false }],
      riskAlerts: [],
      scoreHistory: [],
    });

    const result = await executeTool('get_intern_detail', { internId: '张三' });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('basicInfo');
    expect(result.data).toHaveProperty('scores');
  });

  it('未找到实习生返回失败', async () => {
    mockPrisma.intern.findFirst.mockResolvedValue(null);
    const result = await executeTool('get_intern_detail', { internId: '不存在' });
    expect(result.success).toBe(false);
    expect(result.summary).toContain('未找到');
  });
});

describe('executeTool - list_alerts', () => {
  it('返回预警列表', async () => {
    mockPrisma.riskAlert.findMany.mockResolvedValue([
      { id: '1', intern: { name: '张三', position: { name: '研发' } }, type: '低投入', level: '高', reason: {}, action: '谈话', isActive: true, createdAt: new Date() },
    ]);

    const result = await executeTool('list_alerts', {});
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});

describe('executeTool - get_dashboard_stats', () => {
  it('返回统计数据', async () => {
    mockPrisma.$transaction.mockResolvedValue([20, 3, 8, { _avg: { fitScore: 75.5 } }, 5]);
    mockPrisma.intern.groupBy.mockResolvedValue([
      { riskLevel: '高', _count: { id: 3 } },
      { riskLevel: '中', _count: { id: 7 } },
      { riskLevel: '低', _count: { id: 10 } },
    ]);

    const result = await executeTool('get_dashboard_stats', {});
    expect(result.success).toBe(true);
    expect(result.data.totalInterns).toBe(20);
    expect(result.data.highRiskCount).toBe(3);
  });

  it('返回 highPotentialCount 字段', async () => {
    mockPrisma.$transaction.mockResolvedValue([20, 3, 10, { _avg: { fitScore: 75 } }, 2]);
    mockPrisma.intern.groupBy.mockResolvedValue([]);

    const result = await executeTool('get_dashboard_stats', {});
    expect(result.success).toBe(true);
    expect(result.data.highPotentialCount).toBe(10);
  });
});

describe('executeTool - compare_interns', () => {
  it('对比多个实习生', async () => {
    mockPrisma.intern.findMany.mockResolvedValue([
      { name: '张三', position: { name: '研发' }, fitScore: 85, riskScore: 20, potentialScore: 90, taskCompletionRate: 0.9, riskLevel: '低', abilityScores: [] },
      { name: '李四', position: { name: '产品' }, fitScore: 70, riskScore: 40, potentialScore: 60, taskCompletionRate: 0.7, riskLevel: '中', abilityScores: [] },
    ]);

    const result = await executeTool('compare_interns', { internIds: ['1', '2'] });
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('空 ID 列表返回失败', async () => {
    const result = await executeTool('compare_interns', { internIds: [] });
    expect(result.success).toBe(false);
    expect(result.summary).toContain('未提供');
  });
});

describe('executeTool - 未知工具', () => {
  it('返回失败', async () => {
    const result = await executeTool('unknown_tool' as never, {});
    expect(result.success).toBe(false);
    expect(result.summary).toContain('未知工具');
  });
});
