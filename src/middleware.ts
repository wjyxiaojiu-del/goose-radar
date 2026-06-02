import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * API 认证中间件 — 公开 Demo 版
 *
 * 分层策略：
 * 1. 公开 GET（只读数据）→ 直接放行
 * 2. AI 接口（assistant / interventions）→ 放行，由路由层做 CSRF + 限流
 * 3. 写操作（PATCH/POST/DELETE）→ 需 Bearer Token
 * 4. 开发环境：SKIP_API_AUTH=true 时跳过全部认证
 */

/** 公开只读接口前缀 */
const PUBLIC_GET_PREFIXES = [
  '/api/health',
  '/api/dashboard',
  '/api/interns',
  '/api/alerts',
  '/api/potentials',
  '/api/suggestions',
  '/api/reports',
];

/** AI 接口前缀（POST 放行，由路由层 CSRF + 限流保护） */
const AI_PREFIXES = [
  '/api/assistant',
  '/api/interventions',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // 只拦截 API 路由
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 开发环境可跳过认证
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_API_AUTH === 'true') {
    return NextResponse.next();
  }

  // 1. 公开 GET 接口直接放行
  if (method === 'GET' && PUBLIC_GET_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. AI 接口 + 写操作放行（CSRF 在路由层处理）
  //    写操作（PATCH/POST/DELETE）在 demo 模式下靠 CSRF 防跨站，不需要 Bearer Token
  if (AI_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (method !== 'GET') {
    return NextResponse.next();
  }

  // 3. 非公开 GET 接口需要 Bearer Token（防御性兜底）
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const apiSecret = process.env.API_SECRET;

  if (!apiSecret) {
    console.error('API_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (token !== apiSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
