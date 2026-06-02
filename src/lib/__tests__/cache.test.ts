import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/cache 的 unstable_cache —— 直接执行传入的函数，不做缓存
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { withCache, CACHE_TAGS } from '../cache';

describe('CACHE_TAGS', () => {
  it('包含所有预期的 tag', () => {
    expect(CACHE_TAGS).toHaveProperty('dashboard');
    expect(CACHE_TAGS).toHaveProperty('interns');
    expect(CACHE_TAGS).toHaveProperty('alerts');
    expect(CACHE_TAGS).toHaveProperty('suggestions');
    expect(CACHE_TAGS).toHaveProperty('potentials');
  });

  it('tag 值是字符串', () => {
    Object.values(CACHE_TAGS).forEach(tag => {
      expect(typeof tag).toBe('string');
    });
  });
});

describe('withCache', () => {
  it('包装的函数可正常调用并返回结果', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const cached = withCache(fn, ['test-key'], 'dashboard');
    const result = await cached();
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('传递参数给底层函数', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const cached = withCache(fn, ['key'], 'interns');
    await cached('arg1', 'arg2');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
