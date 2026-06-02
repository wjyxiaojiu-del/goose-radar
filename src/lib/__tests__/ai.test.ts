import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LLMError,
  isAIAvailable,
  getCached,
  setCache,
  deleteCached,
  callLLM,
  callLLMWithFallback,
} from '../ai';

// ─── 环境变量 Mock ───
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  // 清空全局缓存
  const g = globalThis as typeof globalThis & { __gooseRadarAiCache?: Map<string, unknown> };
  g.__gooseRadarAiCache?.clear();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

// ─── LLMError ───
describe('LLMError', () => {
  it('是 Error 的子类', () => {
    const err = new LLMError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('LLMError');
  });

  it('支持 cause', () => {
    const cause = new Error('root');
    const err = new LLMError('test', cause);
    expect(err.cause).toBe(cause);
  });
});

// ─── isAIAvailable ───
describe('isAIAvailable', () => {
  it('三个环境变量齐全返回 true', () => {
    process.env.AI_BASE_URL = 'https://api.test.com/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_MODEL = 'test-model';
    expect(isAIAvailable()).toBe(true);
  });

  it('缺少任一变量返回 false', () => {
    process.env.AI_BASE_URL = 'https://api.test.com/v1';
    process.env.AI_API_KEY = 'sk-test';
    delete process.env.AI_MODEL;
    expect(isAIAvailable()).toBe(false);
  });
});

// ─── 缓存操作 ───
describe('AI 缓存', () => {
  it('getCached 未命中返回 null', () => {
    expect(getCached('nonexistent')).toBeNull();
  });

  it('setCache + getCached 命中', () => {
    setCache('k1', 'v1');
    const result = getCached('k1');
    expect(result?.value).toBe('v1');
    expect(result?.source).toBe('live');
  });

  it('getCached 过期返回 null', () => {
    setCache('k2', 'v2', -1); // TTL 负数 = 已过期
    expect(getCached('k2')).toBeNull();
  });

  it('deleteCached 删除缓存', () => {
    setCache('k3', 'v3');
    deleteCached('k3');
    expect(getCached('k3')).toBeNull();
  });

  it('source 可设为 fallback', () => {
    setCache('k4', 'v4', 60000, 'fallback');
    expect(getCached('k4')?.source).toBe('fallback');
  });
});

// ─── callLLM ───
describe('callLLM', () => {
  beforeEach(() => {
    process.env.AI_BASE_URL = 'https://api.test.com/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_MODEL = 'test-model';
  });

  it('成功调用返回内容', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'hello' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await callLLM({ system: 'sys', user: 'usr' });
    expect(result).toBe('hello');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('使用缓存 key 时命中缓存不发起请求', async () => {
    setCache('test-key', 'cached-value');
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await callLLM({ system: 'sys', user: 'usr', cacheKey: 'test-key' });
    expect(result).toBe('cached-value');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('API 未配置时抛出 LLMError', async () => {
    delete process.env.AI_BASE_URL;
    await expect(callLLM({ system: 'sys', user: 'usr' })).rejects.toThrow(LLMError);
  });

  it('API 返回非 200 时抛出 LLMError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Error'),
    }));

    await expect(callLLM({ system: 'sys', user: 'usr' })).rejects.toThrow('LLM API returned 500');
  });

  it('API 返回空响应时抛出 LLMError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    }));

    await expect(callLLM({ system: 'sys', user: 'usr' })).rejects.toThrow('LLM returned empty response');
  });

  it('超时时抛出 LLMError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      new Promise((_, reject) => setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100))
    ));

    await expect(callLLM({ system: 'sys', user: 'usr', timeoutMs: 50 })).rejects.toThrow('timed out');
  });
});

// ─── callLLMWithFallback ───
describe('callLLMWithFallback', () => {
  it('成功时返回 live 状态', async () => {
    const result = await callLLMWithFallback({
      cacheKey: 'fb-test',
      llmFn: () => Promise.resolve('ok'),
      fallbackFn: () => 'fb',
    });
    expect(result.result).toBe('ok');
    expect(result.status).toBe('live');
  });

  it('失败时返回 fallback 状态', async () => {
    const result = await callLLMWithFallback({
      cacheKey: 'fb-test2',
      llmFn: () => Promise.reject(new Error('fail')),
      fallbackFn: () => 'fallback-value',
    });
    expect(result.result).toBe('fallback-value');
    expect(result.status).toBe('fallback');
  });

  it('命中 live 缓存返回 cached-live', async () => {
    setCache('fb-cache', '"cached"');
    const result = await callLLMWithFallback({
      cacheKey: 'fb-cache',
      llmFn: () => Promise.resolve('new'),
      fallbackFn: () => 'fb',
    });
    expect(result.result).toBe('cached');
    expect(result.status).toBe('cached-live');
  });

  it('skipCache=true 时跳过缓存', async () => {
    setCache('fb-skip', '"old"');
    const result = await callLLMWithFallback({
      cacheKey: 'fb-skip',
      llmFn: () => Promise.resolve('fresh'),
      fallbackFn: () => 'fb',
      skipCache: true,
    });
    expect(result.result).toBe('fresh');
    expect(result.status).toBe('live');
  });
});
