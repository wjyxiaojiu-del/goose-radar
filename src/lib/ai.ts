export class LLMError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

export function isAIAvailable(): boolean {
  return !!(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
}

type CacheEntry = { value: string; expires: number; source: 'live' | 'fallback' };

const globalCache = globalThis as typeof globalThis & {
  __gooseRadarAiCache?: Map<string, CacheEntry>;
};

// 开发热更新和不同 API 模块加载时仍复用同一份缓存，保证演示预热稳定生效。
const cache = globalCache.__gooseRadarAiCache ?? new Map<string, CacheEntry>();
globalCache.__gooseRadarAiCache = cache;

export function getCached(key: string): { value: string; source: 'live' | 'fallback' } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return { value: entry.value, source: entry.source };
}

export function setCache(key: string, value: string, ttlMs = 10 * 60 * 1000, source: 'live' | 'fallback' = 'live'): void {
  cache.set(key, { value, expires: Date.now() + ttlMs, source });
}

export async function callLLM(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  cacheKey?: string;
}): Promise<string> {
  const { system, user, temperature = 0.7, maxTokens = 2048, jsonMode = false, timeoutMs = 8000, cacheKey } = params;

  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached.value;
  }

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new LLMError('AI service not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    };
    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new LLMError(`LLM API returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new LLMError('LLM returned empty response');
    }

    if (cacheKey) {
      setCache(cacheKey, content);
    }

    return content;
  } catch (err) {
    if (err instanceof LLMError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LLMError(`LLM request timed out (${timeoutMs}ms)`);
    }
    throw new LLMError('LLM request failed', err);
  } finally {
    clearTimeout(timeout);
  }
}

export type AIStatus = 'live' | 'cached-live' | 'cached-fallback' | 'fallback';

/**
 * 带 fallback 缓存的 LLM 调用。
 * 成功 → 缓存 10 分钟，返回 "live"
 * 命中 LLM 缓存 → 返回 "cached-live"
 * 命中 fallback 缓存 → 返回 "cached-fallback"
 * 失败 → 调 fallbackFn，缓存 2 分钟，返回 "fallback"
 */
export async function callLLMWithFallback<T>(params: {
  cacheKey: string;
  llmFn: () => Promise<T>;
  fallbackFn: () => T;
  fallbackTtlMs?: number;
}): Promise<{ result: T; status: AIStatus }> {
  const { cacheKey, llmFn, fallbackFn, fallbackTtlMs = 10 * 60 * 1000 } = params;

  const cached = getCached(cacheKey);
  if (cached) {
    const status: AIStatus = cached.source === 'live' ? 'cached-live' : 'cached-fallback';
    try {
      return { result: JSON.parse(cached.value) as T, status };
    } catch {
      return { result: cached.value as unknown as T, status };
    }
  }

  try {
    const result = await llmFn();
    setCache(cacheKey, typeof result === 'string' ? result : JSON.stringify(result), 10 * 60 * 1000, 'live');
    return { result, status: 'live' };
  } catch {
    const fallback = fallbackFn();
    setCache(cacheKey, typeof fallback === 'string' ? fallback : JSON.stringify(fallback), fallbackTtlMs, 'fallback');
    return { result: fallback, status: 'fallback' };
  }
}
