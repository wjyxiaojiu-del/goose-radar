import { unstable_cache } from 'next/cache';

/**
 * 统一缓存层 — 封装 Next.js unstable_cache
 * 替代所有 globalThis 手写缓存，避免竞态条件和 Serverless 环境失效
 */

export const CACHE_TAGS = {
  dashboard: 'dashboard',
  interns: 'interns',
  alerts: 'alerts',
  suggestions: 'suggestions',
  potentials: 'potentials',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * 包装异步函数，添加 unstable_cache
 * @param fn 实际执行函数
 * @param keyParts 缓存 key 组成部分
 * @param tag 用于 revalidateTag 失效的 tag
 * @param revalidate 重新验证时间（秒），默认 60
 */
export function withCache<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyParts: string[],
  tag: CacheTag,
  revalidate = 60
) {
  return unstable_cache(
    async (...args: TArgs) => fn(...args),
    keyParts,
    { revalidate, tags: [tag] }
  );
}
