import { NextResponse } from 'next/server';
import { getActiveAlerts } from '@/repositories/alert';
import { safeJsonParse } from '@/lib/safe-json';
import type { AlertItem } from '@/types/api';

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' };

export async function GET() {
  try {
    const alerts = await getActiveAlerts();

    const formatted: AlertItem[] = alerts.map((alert) => ({
      id: alert.id,
      internId: alert.intern.id,
      internName: alert.intern.name,
      internSchool: alert.intern.school,
      position: alert.intern.position.name,
      mentor: alert.intern.mentor.name,
      fitScore: alert.intern.fitScore,
      riskScore: alert.intern.riskScore,
      type: alert.type,
      level: alert.level,
      reason: safeJsonParse<string[]>(Array.isArray(alert.reason) ? JSON.stringify(alert.reason) : String(alert.reason), []),
      action: alert.action,
      createdAt: alert.createdAt,
    }));

    return NextResponse.json(formatted, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
