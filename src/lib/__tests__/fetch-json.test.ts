import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson, clearFetchCache } from '../fetch-json';

beforeEach(() => {
  clearFetchCache();
  vi.restoreAllMocks();
});

describe('fetchJson', () => {
  it('成功请求返回数据', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'test' }),
    }));

    const result = await fetchJson('/api/test', { fallback: {} });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ name: 'test' });
    expect(result.isFallback).toBe(false);
  });

  it('HTTP 错误返回 fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const result = await fetchJson('/api/test', { fallback: { default: true } });
    expect(result.ok).toBe(false);
    expect(result.isFallback).toBe(true);
    expect(result.data).toEqual({ default: true });
    expect(result.error).toBe('HTTP 500');
  });

  it('API 返回 { error: ... } 视为失败', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: 'something broke' }),
    }));

    const result = await fetchJson('/api/test', { fallback: null });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('something broke');
  });

  it('validate 返回 false 时走 fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bad: true }),
    }));

    const validate = (data: unknown): data is { good: boolean } =>
      typeof data === 'object' && data !== null && 'good' in data;

    const result = await fetchJson('/api/test', { fallback: { good: false }, validate });
    expect(result.ok).toBe(false);
    expect(result.isFallback).toBe(true);
    expect(result.error).toBe('数据校验失败');
  });

  it('validate 返回 true 时正常返回', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ good: true }),
    }));

    const validate = (data: unknown): data is { good: boolean } =>
      typeof data === 'object' && data !== null && 'good' in data;

    const result = await fetchJson('/api/test', { fallback: { good: false }, validate });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ good: true });
  });

  it('网络错误返回 fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await fetchJson('/api/test', { fallback: 'fb' });
    expect(result.ok).toBe(false);
    expect(result.data).toBe('fb');
  });

  it('缓存命中时返回缓存数据', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cached: false }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // 第一次请求
    await fetchJson('/api/cached', { fallback: {} });
    // 第二次请求（应命中缓存）
    const result = await fetchJson('/api/cached', { fallback: {} });

    expect(result.ok).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skipCache=true 时跳过缓存', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ v: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ v: 2 }),
      });
    vi.stubGlobal('fetch', mockFetch);

    await fetchJson('/api/skip', { fallback: {} });
    const result = await fetchJson('/api/skip', { fallback: {}, skipCache: true });

    expect(result.ok).toBe(true);
    expect(result.fromCache).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('cacheMs=0 禁用缓存', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ v: 1 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchJson('/api/nocache', { fallback: {}, cacheMs: 0 });
    await fetchJson('/api/nocache', { fallback: {}, cacheMs: 0 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('clearFetchCache', () => {
  it('清除指定 URL 缓存', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ v: 1 }),
    }));

    await fetchJson('/api/clear', { fallback: {} });
    clearFetchCache('/api/clear');

    // 清除后再次请求不应命中缓存
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ v: 2 }),
    }));
    const result = await fetchJson('/api/clear', { fallback: {} });
    expect(result.fromCache).toBeUndefined();
  });

  it('无参数清除全部缓存', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    await fetchJson('/api/a', { fallback: {} });
    await fetchJson('/api/b', { fallback: {} });
    clearFetchCache();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    await fetchJson('/api/a', { fallback: {} });
    await fetchJson('/api/b', { fallback: {} });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
