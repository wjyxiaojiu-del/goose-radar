import { prisma } from '@/lib/prisma';

export interface ToolResult {
  success: boolean;
  data: unknown;
  summary: string;
}

export const TOOL_DEFINITIONS = [
  {
    name: 'list_interns',
    description: '列出所有实习生，可按风险等级、岗位、导师筛选',
    parameters: {
      riskLevel: { type: 'string', enum: ['高', '中', '低'], description: '风险等级筛选' },
      positionId: { type: 'string', description: '岗位ID筛选' },
      mentorId: { type: 'string', description: '导师ID筛选' },
      limit: { type: 'number', description: '返回数量限制，默认20', default: 20 },
    },
  },
  {
    name: 'get_intern_detail',
    description: '获取某个实习生的详细信息，包括能力分数、周报、风险预警等',
    parameters: {
      internId: { type: 'string', description: '实习生ID或姓名' },
    },
  },
  {
    name: 'list_alerts',
    description: '列出风险预警，可按等级筛选',
    parameters: {
      level: { type: 'string', enum: ['高', '中', '低'], description: '预警等级筛选' },
      isActive: { type: 'boolean', description: '是否只显示未处理的', default: true },
      limit: { type: 'number', description: '返回数量限制，默认10', default: 10 },
    },
  },
  {
    name: 'get_dashboard_stats',
    description: '获取仪表盘整体统计数据，包括总人数、风险分布、岗位统计等',
    parameters: {},
  },
  {
    name: 'compare_interns',
    description: '对比多个实习生的各项指标',
    parameters: {
      internIds: { type: 'array', items: 'string', description: '实习生ID列表' },
    },
  },
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number]['name'];

export async function executeTool(name: ToolName, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'list_interns': {
      const where: Record<string, unknown> = {};
      if (args.riskLevel) where.riskLevel = args.riskLevel;
      if (args.positionId) where.positionId = args.positionId;
      if (args.mentorId) where.mentorId = args.mentorId;
      const limit = Math.min(Number(args.limit ?? 20), 50);
      const interns = await prisma.intern.findMany({
        where,
        take: limit,
        include: { position: true, mentor: true },
        orderBy: { updatedAt: 'desc' },
      });
      return {
        success: true,
        data: interns.map(i => ({
          id: i.id,
          name: i.name,
          school: i.school,
          major: i.major,
          position: i.position.name,
          mentor: i.mentor.name,
          fitScore: i.fitScore,
          riskScore: i.riskScore,
          potentialScore: i.potentialScore,
          riskLevel: i.riskLevel,
          potentialType: i.potentialType,
          taskCompletionRate: i.taskCompletionRate,
          phase: i.phase,
        })),
        summary: `找到 ${interns.length} 位实习生`,
      };
    }

    case 'get_intern_detail': {
      const search = String(args.internId ?? '');
      const intern = await prisma.intern.findFirst({
        where: {
          OR: [{ id: search }, { name: { contains: search } }],
        },
        include: {
          position: true,
          mentor: true,
          abilityScores: { orderBy: { createdAt: 'desc' } },
          weeklyReports: { orderBy: { weekStart: 'desc' }, take: 4 },
          riskAlerts: { orderBy: { createdAt: 'desc' }, take: 5 },
          scoreHistory: { orderBy: { weekStart: 'desc' }, take: 8 },
        },
      });
      if (!intern) {
        return { success: false, data: null, summary: `未找到实习生: ${search}` };
      }
      return {
        success: true,
        data: {
          basicInfo: {
            name: intern.name,
            school: intern.school,
            major: intern.major,
            position: intern.position.name,
            mentor: intern.mentor.name,
            department: intern.mentor.department,
            entryDate: intern.entryDate,
            phase: intern.phase,
          },
          scores: {
            fitScore: intern.fitScore,
            riskScore: intern.riskScore,
            potentialScore: intern.potentialScore,
            taskCompletionRate: intern.taskCompletionRate,
          },
          riskLevel: intern.riskLevel,
          potentialType: intern.potentialType,
          tags: intern.tags,
          abilityScores: intern.abilityScores.map(a => ({ dimension: a.dimension, score: a.score })),
          recentReports: intern.weeklyReports.map(r => ({
            weekStart: r.weekStart,
            aiSummary: r.aiSummary,
            emotionSignal: r.emotionSignal,
            needsHelp: r.needsHelp,
          })),
          recentAlerts: intern.riskAlerts.map(a => ({
            type: a.type,
            level: a.level,
            reason: a.reason,
            action: a.action,
            isActive: a.isActive,
            createdAt: a.createdAt,
          })),
          scoreTrend: intern.scoreHistory.map(h => ({
            weekStart: h.weekStart,
            fitScore: h.fitScore,
            riskScore: h.riskScore,
            potentialScore: h.potentialScore,
          })),
        },
        summary: `获取到 ${intern.name} 的详细数据，包含 ${intern.abilityScores.length} 项能力评分、${intern.weeklyReports.length} 条周报、${intern.riskAlerts.length} 条预警`,
      };
    }

    case 'list_alerts': {
      const where: Record<string, unknown> = {};
      if (args.level) where.level = args.level;
      if (args.isActive !== undefined) where.isActive = args.isActive;
      const limit = Math.min(Number(args.limit ?? 10), 50);
      const alerts = await prisma.riskAlert.findMany({
        where,
        take: limit,
        include: { intern: { include: { position: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return {
        success: true,
        data: alerts.map(a => ({
          id: a.id,
          internName: a.intern.name,
          position: a.intern.position.name,
          type: a.type,
          level: a.level,
          reason: a.reason,
          action: a.action,
          isActive: a.isActive,
          createdAt: a.createdAt,
        })),
        summary: `找到 ${alerts.length} 条预警`,
      };
    }

    case 'get_dashboard_stats': {
      const [totalInterns, highRiskCount, highPotentialCount, avgFitScoreResult, activeAlerts] =
        await prisma.$transaction([
          prisma.intern.count(),
          prisma.intern.count({ where: { riskLevel: '高' } }),
          prisma.intern.count({
            where: {
              OR: [{ potentialScore: { gte: 80 } }, { potentialType: { not: '' } }],
            },
          }),
          prisma.intern.aggregate({ _avg: { fitScore: true } }),
          prisma.riskAlert.count({ where: { isActive: true } }),
        ]);
      const riskDistribution = await prisma.intern.groupBy({
        by: ['riskLevel'],
        _count: { id: true },
      });
      return {
        success: true,
        data: {
          totalInterns,
          highRiskCount,
          highPotentialCount,
          avgFitScore: Math.round(avgFitScoreResult._avg.fitScore || 0),
          activeAlerts,
          riskDistribution: Object.fromEntries(riskDistribution.map(r => [r.riskLevel, r._count.id])),
        },
        summary: `当前共 ${totalInterns} 名实习生，其中高风险 ${highRiskCount} 人，高潜 ${highPotentialCount} 人，平均适岗度 ${Math.round(avgFitScoreResult._avg.fitScore || 0)} 分`,
      };
    }

    case 'compare_interns': {
      const ids = Array.isArray(args.internIds) ? args.internIds : [];
      if (ids.length === 0) {
        return { success: false, data: null, summary: '未提供实习生ID' };
      }
      const interns = await prisma.intern.findMany({
        where: { id: { in: ids } },
        include: { position: true, mentor: true, abilityScores: true },
      });
      return {
        success: true,
        data: interns.map(i => ({
          name: i.name,
          position: i.position.name,
          fitScore: i.fitScore,
          riskScore: i.riskScore,
          potentialScore: i.potentialScore,
          taskCompletionRate: i.taskCompletionRate,
          riskLevel: i.riskLevel,
          abilityScores: i.abilityScores.map(a => ({ dimension: a.dimension, score: a.score })),
        })),
        summary: `对比 ${interns.length} 位实习生的各项指标`,
      };
    }

    default:
      return { success: false, data: null, summary: `未知工具: ${name}` };
  }
}
