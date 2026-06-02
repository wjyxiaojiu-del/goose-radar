import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = { $queryRaw: vi.fn() };
  return { mockPrisma };
});
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

// Mock ai
vi.mock('@/lib/ai', () => ({ isAIAvailable: vi.fn() }));

import { GET } from '../health/route';
import { isAIAvailable } from '@/lib/ai';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/health', () => {
  it('DB 正常时返回 200 + ok', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
    vi.mocked(isAIAvailable).mockReturnValue(true);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.db).toBe(true);
    expect(body.aiAvailable).toBe(true);
    expect(body.timestamp).toBeTruthy();
  });

  it('DB 异常时返回 503 + degraded', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));
    vi.mocked(isAIAvailable).mockReturnValue(false);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.db).toBe(false);
    expect(body.aiAvailable).toBe(false);
  });
});
