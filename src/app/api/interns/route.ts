import { NextResponse } from 'next/server';
import { getInternsList } from '@/repositories/intern';
import { safeJsonParse } from '@/lib/safe-json';
import type { PaginatedResponse, InternListItem } from '@/types/api';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 0;
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));

    // 向后兼容：不带 page 参数时返回完整数组（原行为）
    const usePagination = page > 0;
    const skip = usePagination ? (page - 1) * pageSize : 0;
    const take = usePagination ? pageSize : 1000;

    const { interns, total } = await getInternsList(skip, take);

    const formatted: InternListItem[] = interns.map((intern) => ({
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
      tags: safeJsonParse<string[]>(Array.isArray(intern.tags) ? JSON.stringify(intern.tags) : String(intern.tags), []),
      riskLevel: intern.riskLevel,
      potentialType: intern.potentialType,
      taskCompletionRate: intern.taskCompletionRate,
      latestReport: intern.weeklyReports[0]?.aiSummary || '',
      latestFeedback: intern.mentorFeedbacks[0]?.comment || '',
      hasActiveAlert: intern.riskAlerts.length > 0,
    }));

    if (usePagination) {
      const payload: PaginatedResponse<InternListItem> = {
        data: formatted,
        page,
        pageSize,
        total,
      };
      return NextResponse.json(payload, { headers: CACHE_HEADERS });
    }

    // 向后兼容：不分页时直接返回数组
    return NextResponse.json(formatted, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Interns API error:', error);
    return NextResponse.json({ error: 'Failed to fetch interns' }, { status: 500 });
  }
}
