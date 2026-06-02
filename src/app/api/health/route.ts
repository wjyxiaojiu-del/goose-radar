import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAIAvailable } from '@/lib/ai';
import { setCsrfCookie } from '@/lib/csrf';

export async function GET() {
  try {
    const dbOk = await prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    const aiAvailable = isAIAvailable();
    const status = dbOk ? 200 : 503;

    const res = NextResponse.json(
      { status: dbOk ? 'ok' : 'degraded', db: dbOk, aiAvailable, timestamp: new Date().toISOString() },
      { status },
    );

    // 设置 CSRF cookie，前端后续 POST 请求需要带上
    await setCsrfCookie();

    return res;
  } catch {
    return NextResponse.json(
      { status: 'error', db: false, aiAvailable: false, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
