/**
 * 统一的客户端 fetch 工具，支持 timeout、结构校验、异常返回 fallback、内存缓存。
 * 所有 demo 页面应使用此工具代替裸 fetch。
 */

export interface FetchJsonOptions<T> {
  /** 超时毫秒数，默认 6000 */
  timeoutMs?: number;
  /** 校验返回数据是否合法，返回 false 则走 fallback */
  validate?: (data: unknown) => data is T;
  /** API 失败或校验不通过时返回的兜底数据 */
  fallback: T;
  /** AbortSignal，用于外部取消 */
  signal?: AbortSignal;
  /** 缓存 TTL 毫秒数，默认 30000（30秒）。设为 0 禁用缓存 */
  cacheMs?: number;
  /** 跳过缓存，强制请求 */
  skipCache?: boolean;
}

export interface FetchJsonResult<T> {
  data: T;
  ok: boolean;
  /** true 表示使用了 fallback 数据 */
  isFallback: boolean;
  error?: string;
  /** true 表示数据来自缓存 */
  fromCache?: boolean;
}

// 内存缓存：url → { data, timestamp }
const cache = new Map<string, { data: unknown; ts: number }>();

/**
 * 请求 JSON API，超时或失败返回 fallback。
 * 同一 URL 在 cacheMs 内直接返回缓存数据，不重复请求。
 */
export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions<T>,
): Promise<FetchJsonResult<T>> {
  const { timeoutMs = 6000, validate, fallback, signal, cacheMs = 30_000, skipCache } = options;

  // 命中缓存直接返回
  if (cacheMs > 0 && !skipCache) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.ts < cacheMs) {
      return { data: hit.data as T, ok: true, isFallback: false, fromCache: true };
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  // 如果外部传了 signal，联动取消
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { data: fallback, ok: false, isFallback: true, error: `HTTP ${res.status}` };
    }
    const json: unknown = await res.json();

    // API 返回 { error: ... } 视为失败
    if (json && typeof json === 'object' && 'error' in json) {
      return { data: fallback, ok: false, isFallback: true, error: String((json as Record<string, unknown>).error) };
    }

    if (validate && !validate(json)) {
      return { data: fallback, ok: false, isFallback: true, error: '数据校验失败' };
    }

    // 写入缓存
    if (cacheMs > 0) {
      cache.set(url, { data: json, ts: Date.now() });
    }

    return { data: json as T, ok: true, isFallback: false };
  } catch (err) {
    const msg = err instanceof DOMException && err.name === 'AbortError'
      ? '请求超时'
      : err instanceof Error
        ? err.message
        : '未知错误';
    return { data: fallback, ok: false, isFallback: true, error: msg };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

/** 清除指定 URL 或全部缓存 */
export function clearFetchCache(url?: string) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}
