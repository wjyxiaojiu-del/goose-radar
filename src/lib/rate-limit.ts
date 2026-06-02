/**
 * 内存滑动窗口限流器
 * 适用于公开 demo 场景，防止单 IP 刷爆 AI 接口
 *
 * 生产环境建议替换为 Redis 方案（支持多实例）
 */

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter?: number;
}

const buckets = new Map<string, number[]>();

// 定期清理过期 bucket，避免内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const valid = timestamps.filter(t => now - t < 60_000);
    if (valid.length === 0) buckets.delete(key);
    else buckets.set(key, valid);
  }
}, 30_000);

/**
 * 滑动窗口限流检查
 * @param key 限流维度（通常用 IP）
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口大小（毫秒）
 */
export function rateLimit(key: string, limit: number, windowMs: number = 60_000): RateLimitResult {
  const now = Date.now();
  const timestamps = buckets.get(key) ?? [];
  const windowStart = now - windowMs;

  // 过滤掉窗口外的旧请求
  const recent = timestamps.filter(t => t > windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { ok: false, remaining: 0, retryAfter };
  }

  recent.push(now);
  buckets.set(key, recent);

  return { ok: true, remaining: limit - recent.length };
}

/**
 * 从 Request 中提取客户端 IP
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}
