import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock repository
vi.mock('@/repositories/intern', () => ({
  getInternsList: vi.fn(),
}));

import { GET } from '../interns/route';
import { getInternsList } from '@/repositories/intern';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(url: string) {
  return new Request(url);
}

const mockIntern = {
  id: '1',
  name: '张三',
  gender: '男',
  school: '北大',
  major: 'CS',
  entryDate: '2025-01-01',
  phase: '产出期',
  position: { name: '研发' },
  mentor: { name: '李导' },
  fitScore: 85,
  riskScore: 20,
  potentialScore: 90,
  tags: [],
  riskLevel: '低',
  potentialType: '高潜',
  taskCompletionRate: 0.9,
  weeklyReports: [{ aiSummary: '表现良好' }],
  mentorFeedbacks: [{ comment: '进步明显' }],
  riskAlerts: [],
};

describe('GET /api/interns', () => {
  it('不分页时返回数组', async () => {
    vi.mocked(getInternsList).mockResolvedValue({ interns: [mockIntern], total: 1 });

    const res = await GET(makeRequest('http://localhost:3000/api/interns'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('张三');
  });

  it('分页时返回 PaginatedResponse', async () => {
    vi.mocked(getInternsList).mockResolvedValue({ interns: [mockIntern], total: 1 });

    const res = await GET(makeRequest('http://localhost:3000/api/interns?page=1&pageSize=10'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('page', 1);
    expect(body).toHaveProperty('pageSize', 10);
    expect(body).toHaveProperty('total', 1);
    expect(body.data).toHaveLength(1);
  });

  it('格式化字段正确', async () => {
    vi.mocked(getInternsList).mockResolvedValue({ interns: [mockIntern], total: 1 });

    const res = await GET(makeRequest('http://localhost:3000/api/interns?page=1'));
    const body = await res.json();

    const item = body.data[0];
    expect(item.position).toBe('研发');
    expect(item.mentor).toBe('李导');
    expect(item.latestReport).toBe('表现良好');
    expect(item.latestFeedback).toBe('进步明显');
    expect(item.hasActiveAlert).toBe(false);
  });

  it('服务器错误返回 500', async () => {
    vi.mocked(getInternsList).mockRejectedValue(new Error('DB error'));

    const res = await GET(makeRequest('http://localhost:3000/api/interns'));
    expect(res.status).toBe(500);
  });
});
