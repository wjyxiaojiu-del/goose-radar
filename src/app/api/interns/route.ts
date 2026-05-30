import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const interns = await prisma.intern.findMany({
      include: {
        position: true,
        mentor: true,
        weeklyReports: {
          orderBy: { weekStart: 'desc' },
          take: 1,
        },
        mentorFeedbacks: {
          orderBy: { weekStart: 'desc' },
          take: 1,
        },
        riskAlerts: {
          where: { isActive: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedInterns = interns.map(intern => ({
      id: intern.id,
      name: intern.name,
      gender: intern.gender,
      school: intern.school,
      major: intern.major,
      entryDate: intern.entryDate,
      phase: intern.phase,
      position: intern.position.name,
      mentor: intern.mentor.name,
      fitScore: intern.fitScore,
      riskScore: intern.riskScore,
      potentialScore: intern.potentialScore,
      tags: JSON.parse(intern.tags),
      riskLevel: intern.riskLevel,
      potentialType: intern.potentialType,
      taskCompletionRate: intern.taskCompletionRate,
      latestReport: intern.weeklyReports[0]?.aiSummary || '',
      latestFeedback: intern.mentorFeedbacks[0]?.comment || '',
      hasActiveAlert: intern.riskAlerts.length > 0,
    }));

    return NextResponse.json(formattedInterns);
  } catch (error) {
    console.error('Interns API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interns' },
      { status: 500 }
    );
  }
}
