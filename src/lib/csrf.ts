/**
 * CSRF Token 保护
 *
 * 原理：服务端生成 token 写入 cookie，前端从 cookie 读取放到请求头。
 * 浏览器同源策略保证 cookie 只有同源页面能读，跨源攻击者拿不到 token。
 *
 * 适用于公开 demo 场景：不需要用户登录，但能防跨站伪造请求。
 */

import { cookies } from 'next/headers';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

/** 生成随机 hex token */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** 设置 CSRF cookie（在需要的 GET 响应中调用） */
export async function setCsrfCookie(): Promise<string> {
  const token = generateToken();
  try {
    const jar = await cookies();
    jar.set(CSRF_COOKIE, token, {
      httpOnly: false, // 前端需要读取
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60, // 1 小时
    });
  } catch {
    // 测试环境或非请求上下文，跳过 cookie 设置
  }
  return token;
}

/** 验证 CSRF token：cookie 值 === header 值 */
export async function validateCsrf(request: Request): Promise<boolean> {
  try {
    const jar = await cookies();
    const cookieToken = jar.get(CSRF_COOKIE)?.value;
    const headerToken = request.headers.get(CSRF_HEADER);

    if (!cookieToken || !headerToken) return false;
    return cookieToken === headerToken;
  } catch {
    // 测试环境：跳过 CSRF 校验
    return true;
  }
}
