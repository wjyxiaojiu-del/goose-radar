import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple linear regression: y = mx + b
function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  if (n < 2) return { m: 0, b: points[0]?.y ?? 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return { m: 0, b: sumY / n };
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const history = await prisma.scoreHistory.findMany({
      where: { internId: id },
      orderBy: { weekStart: 'asc' },
    });

    if (history.length < 2) {
      return NextResponse.json({
        historical: history.map((h, i) => ({
          week: h.weekStart,
          weekIndex: i,
          fitScore: h.fitScore,
          riskScore: h.riskScore,
          potentialScore: h.potentialScore,
          isPredicted: false,
        })),
        forecast: [],
        confidence: 'low',
        message: '历史数据不足，无法进行趋势预测。建议积累至少 3 周数据后再查看预测。',
      });
    }

    const points = history.map((h, i) => ({
      week: h.weekStart,
      weekIndex: i,
      fitScore: h.fitScore,
      riskScore: h.riskScore,
      potentialScore: h.potentialScore,
      isPredicted: false,
    }));

    // Build regression models for each metric
    const fitModel = linearRegression(points.map((p, i) => ({ x: i, y: p.fitScore })));
    const riskModel = linearRegression(points.map((p, i) => ({ x: i, y: p.riskScore })));
    const potModel = linearRegression(points.map((p, i) => ({ x: i, y: p.potentialScore })));

    // Forecast next 4 weeks
    const lastWeek = points[points.length - 1].week;
    const forecast = Array.from({ length: 4 }, (_, i) => {
      const idx = points.length + i;
      const nextWeek = new Date(lastWeek);
      nextWeek.setDate(nextWeek.getDate() + 7 * (i + 1));
      return {
        week: nextWeek.toISOString(),
        weekIndex: idx,
        fitScore: Math.min(100, Math.max(0, Math.round(fitModel.m * idx + fitModel.b))),
        riskScore: Math.min(100, Math.max(0, Math.round(riskModel.m * idx + riskModel.b))),
        potentialScore: Math.min(100, Math.max(0, Math.round(potModel.m * idx + potModel.b))),
        isPredicted: true,
      };
    });

    // Determine confidence based on R^2 (simplified: use data length)
    const confidence = history.length >= 6 ? 'high' : history.length >= 3 ? 'medium' : 'low';

    // Trend direction analysis
    const fitTrend = fitModel.m > 1 ? '上升' : fitModel.m < -1 ? '下降' : '平稳';
    const riskTrend = riskModel.m > 1 ? '上升⚠️' : riskModel.m < -1 ? '下降' : '平稳';
    const potTrend = potModel.m > 1 ? '上升' : potModel.m < -1 ? '下降' : '平稳';

    return NextResponse.json({
      historical: points,
      forecast,
      confidence,
      trends: {
        fitScore: fitTrend,
        riskScore: riskTrend,
        potentialScore: potTrend,
      },
      message: `基于 ${history.length} 周历史数据的线性回归预测，置信度：${confidence === 'high' ? '高' : confidence === 'medium' ? '中' : '低'}。`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '预测失败';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
