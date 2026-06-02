/**
 * 前端 CSRF 工具
 * 从 cookie 读取 CSRF token，附加到 POST/PATCH/DELETE 请求头
 */

/** 读取指定 cookie 值 */
function getCookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
  return match?.split('=')[1];
}

/** 获取 CSRF token（从 cookie 读取） */
export function getCsrfToken(): string | undefined {
  return getCookie('csrf_token');
}

/**
 * 带 CSRF 的 fetch 封装
 * 自动从 cookie 读取 csrf_token 并放到 x-csrf-token header
 */
export async function fetchWithCsrf(url: string, init?: RequestInit): Promise<Response> {
  const token = getCsrfToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('x-csrf-token', token);
  }
  return fetch(url, { ...init, headers });
}
