import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const alerts = await prisma.riskAlert.findMany({
      where: {
        isActive: true,
      },
      include: {
        intern: {
          include: {
            position: true,
            mentor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按风险度降序排序（高风险在前），中文 level 字母序不可靠
    const sorted = alerts.sort((a, b) => b.intern.riskScore - a.intern.riskScore);

    const formattedAlerts = sorted.map(alert => ({
      id: alert.id,
      internId: alert.internId,
      internName: alert.intern.name,
      internSchool: alert.intern.school,
      position: alert.intern.position.name,
      mentor: alert.intern.mentor.name,
      fitScore: alert.intern.fitScore,
      riskScore: alert.intern.riskScore,
      type: alert.type,
      level: alert.level,
      reason: JSON.parse(alert.reason),
      action: alert.action,
      createdAt: alert.createdAt,
    }));

    return NextResponse.json(formattedAlerts);
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
