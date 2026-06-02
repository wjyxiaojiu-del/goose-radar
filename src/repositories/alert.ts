import { prisma } from '@/lib/prisma';

/**
 * Alert 数据访问层
 */

export async function getActiveAlerts() {
  return prisma.riskAlert.findMany({
    where: { isActive: true },
    select: {
      id: true,
      type: true,
      level: true,
      reason: true,
      action: true,
      createdAt: true,
      intern: {
        select: {
          id: true,
          name: true,
          school: true,
          fitScore: true,
          riskScore: true,
          position: { select: { name: true } },
          mentor: { select: { name: true } },
        },
      },
    },
    orderBy: [{ intern: { riskScore: 'desc' as const } }, { createdAt: 'desc' }],
  });
}

export async function resolveAlert(id: string, resolvedBy?: string) {
  return prisma.riskAlert.update({
    where: { id },
    data: {
      isActive: false,
      resolvedAt: new Date(),
      resolvedBy: resolvedBy ?? null,
    },
  });
}
