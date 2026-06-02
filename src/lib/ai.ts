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

export function deleteCached(key: string): void {
  cache.delete(key);
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

export async function* streamLLM(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): AsyncGenerator<string, void, unknown> {
  const { system, user, temperature = 0.7, maxTokens = 2048, timeoutMs = 15000 } = params;

  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    yield '⚠️ AI 服务未配置，请检查环境变量 AI_BASE_URL、AI_API_KEY、AI_MODEL';
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      yield `⚠️ AI 服务错误 (${res.status}): ${text}`;
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield '⚠️ AI 返回空响应';
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      yield '\n\n⏱️ 响应超时，请重试或缩短问题。';
    } else {
      yield '\n\n⚠️ 请求失败，请检查网络连接。';
    }
  } finally {
    clearTimeout(timeout);
  }
}

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
  skipCache?: boolean;
}): Promise<{ result: T; status: AIStatus }> {
  const { cacheKey, llmFn, fallbackFn, fallbackTtlMs = 10 * 60 * 1000, skipCache = false } = params;

  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      const status: AIStatus = cached.source === 'live' ? 'cached-live' : 'cached-fallback';
      try {
        return { result: JSON.parse(cached.value) as T, status };
      } catch {
        return { result: cached.value as unknown as T, status };
      }
    }
  } else {
    deleteCached(cacheKey);
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
