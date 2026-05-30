import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const alert = await prisma.riskAlert.update({
      where: { id },
      data: {
        isActive: false,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('Alert resolve error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
