import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeJsonParse } from '@/lib/safe-json';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' };

export async function GET() {
  try {
    const interns = await prisma.intern.findMany({
      where: { OR: [{ potentialScore: { gte: 80 } }, { potentialType: { not: '' } }] },
      include: {
        position: true, mentor: true,
        weeklyReports: { orderBy: { weekStart: 'desc' }, take: 1 },
        mentorFeedbacks: { orderBy: { weekStart: 'desc' }, take: 1 },
        scoreHistory: { orderBy: { weekStart: 'asc' }, take: 4 },
      },
      orderBy: { potentialScore: 'desc' },
      take: 100,
    });

    const potentialDimensions = [
      { name: '学习速度', description: '是否快速掌握新任务', weight: 25 },
      { name: '主动性', description: '是否主动提问、主动复盘', weight: 20 },
      { name: '任务质量', description: '产出是否超过基础要求', weight: 20 },
      { name: '业务理解', description: '是否能理解任务背后的目标', weight: 15 },
      { name: '协作能力', description: '是否能与团队顺畅配合', weight: 10 },
      { name: '成长趋势', description: '是否持续进步', weight: 10 },
    ];

    const potentialTypes: Record<string, { description: string; suggestion: string[] }> = {
      '快速成长型': { description: '学习能力强，能快速掌握新技能和知识', suggestion: ['给更复杂任务', '允许独立负责小模块', '增加复盘要求'] },
      '主动探索型': { description: '主动性强，善于发现问题并寻求解决方案', suggestion: ['让其参与跨部门讨论', '鼓励输出方法沉淀', '安排展示机会'] },
      '高质量交付型': { description: '产出质量高，注重细节和用户体验', suggestion: ['强化业务理解', '给真实项目交付机会', '培养优先级判断能力'] },
      '协作推进型': { description: '善于团队协作，能推动项目进展', suggestion: ['安排跨团队协调任务', '培养项目管理能力', '给予更多汇报机会'] },
      '业务敏感型': { description: '对业务有深刻理解，能从用户角度思考', suggestion: ['参与业务决策讨论', '培养产品思维', '安排用户调研任务'] },
    };

    const formattedInterns = interns.map(intern => {
      let growthTrend = 'stable';
      if (intern.scoreHistory.length >= 2) {
        const latest = intern.scoreHistory[intern.scoreHistory.length - 1];
        const previous = intern.scoreHistory[intern.scoreHistory.length - 2];
        const fitChange = latest.fitScore - previous.fitScore;
        const potentialChange = latest.potentialScore - previous.potentialScore;
        if (fitChange > 5 && potentialChange > 5) growthTrend = 'rising';
        else if (fitChange < -5 || potentialChange < -5) growthTrend = 'declining';
      }

      const reasons: string[] = [];
      if (intern.taskCompletionRate >= 90) reasons.push('任务完成率稳定在90%以上');
      if (intern.weeklyReports[0]?.emotionSignal === '积极') reasons.push('周报表达积极主动');
      if (intern.mentorFeedbacks[0]?.performance >= 4) reasons.push('导师给予高度评价');
      if (growthTrend === 'rising') reasons.push('近期成长趋势明显');
      if (reasons.length === 0) reasons.push('综合表现优秀');

      return {
        id: intern.id, name: intern.name, gender: intern.gender, school: intern.school, major: intern.major,
        position: intern.position.name, mentor: intern.mentor.name, fitScore: intern.fitScore, riskScore: intern.riskScore,
        potentialScore: intern.potentialScore,
        tags: safeJsonParse(Array.isArray(intern.tags) ? JSON.stringify(intern.tags) : String(intern.tags), []),
        potentialType: intern.potentialType || '综合优秀型', taskCompletionRate: intern.taskCompletionRate,
        growthTrend, reasons, latestReport: intern.weeklyReports[0]?.aiSummary || '', latestFeedback: intern.mentorFeedbacks[0]?.comment || '',
      };
    });

    return NextResponse.json({ interns: formattedInterns, dimensions: potentialDimensions, typeDescriptions: potentialTypes }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Potentials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch potentials' }, { status: 500 });
  }
}
