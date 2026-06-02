/**
 * 安全的 JSON 解析/序列化工具
 * 替代裸 JSON.parse，避免格式损坏时导致整个请求 500
 */

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
