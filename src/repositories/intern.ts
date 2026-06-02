import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Intern 数据访问层
 */

const internListSelect = {
  id: true,
  name: true,
  gender: true,
  school: true,
  major: true,
  entryDate: true,
  phase: true,
  fitScore: true,
  riskScore: true,
  potentialScore: true,
  tags: true,
  riskLevel: true,
  potentialType: true,
  taskCompletionRate: true,
  position: { select: { name: true } },
  mentor: { select: { name: true } },
  weeklyReports: { orderBy: { weekStart: 'desc' as const }, take: 1, select: { aiSummary: true } },
  mentorFeedbacks: { orderBy: { weekStart: 'desc' as const }, take: 1, select: { comment: true } },
  riskAlerts: { where: { isActive: true }, take: 1, select: { id: true } },
} satisfies Prisma.InternSelect;

export type InternListRaw = Prisma.InternGetPayload<{ select: typeof internListSelect }>;

export async function getInternsList(skip: number, take: number) {
  const [interns, total] = await prisma.$transaction([
    prisma.intern.findMany({
      select: internListSelect,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.intern.count(),
  ]);
  return { interns, total };
}

export async function getInternById(id: string) {
  return prisma.intern.findUnique({
    where: { id },
    include: {
      position: true,
      mentor: true,
      weeklyReports: { orderBy: { weekStart: 'desc' }, take: 4 },
      mentorFeedbacks: { orderBy: { weekStart: 'desc' }, take: 4, include: { mentor: true } },
      tasks: { orderBy: { weekStart: 'desc' }, take: 10 },
      abilityScores: { orderBy: { weekStart: 'desc' }, take: 6 },
      riskAlerts: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      scoreHistory: { orderBy: { weekStart: 'asc' }, take: 4 },
    },
  });
}
