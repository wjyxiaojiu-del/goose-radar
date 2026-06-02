import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAlert } from '@/repositories/alert';
import { validateCsrf } from '@/lib/csrf';
import { Prisma } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().min(1),
});

const patchBodySchema = z.object({});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF 校验
  if (!(await validateCsrf(request))) {
    return NextResponse.json({ error: 'CSRF token 无效，请刷新页面重试' }, { status: 403 });
  }

  try {
    const rawParams = await params;
    const { id } = paramsSchema.parse(rawParams);

    // body 可选 — 前端可能发空 PATCH（直接标记处理）
    let body: unknown = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }
      }
    }

    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const alert = await resolveAlert(id);
    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Alert resolve error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to resolve alert' }, { status: 500 });
  }
}
