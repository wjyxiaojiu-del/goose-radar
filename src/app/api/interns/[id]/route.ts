import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getInternById } from '@/repositories/intern';
import { callLLM, callLLMWithFallback } from '@/lib/ai';
import { safeJsonParse } from '@/lib/safe-json';
import { sanitizeForPrompt } from '@/lib/sanitize';

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = paramsSchema.parse(await params);
    const intern = await getInternById(id);
    if (!intern) return NextResponse.json({ error: 'Intern not found' }, { status: 404 });

    const positionAbilities: string[] = safeJsonParse(
      Array.isArray(intern.position.abilities) ? JSON.stringify(intern.position.abilities) : String(intern.position.abilities),
      []
    );

    const abilityScores = intern.abilityScores.map(s => ({ dimension: s.dimension, score: s.score }));
    const trendData = intern.scoreHistory.map(h => ({
      week: h.weekStart.toISOString().split('T')[0],
      fitScore: h.fitScore, riskScore: h.riskScore, potentialScore: h.potentialScore, taskCompletionRate: h.taskCompletionRate,
    }));

    const { result: aiResult, status: aiStatus } = await callLLMWithFallback({
      cacheKey: `intern-ai:${id}`,
      fallbackFn: () => ({
        conclusion: `${intern.fitScore >= 80 ? '适岗度较高' : intern.fitScore >= 60 ? '适岗度中等' : '适岗度较低'}，${intern.riskScore > 60 ? '需立即干预' : intern.riskScore > 30 ? '建议密切关注' : '状态稳定'}`,
        explanation: { text: '综合评估完成', signals: [], reasoning: [], conclusion: '', actions: [] },
      }),
      llmFn: async () => {
        const raw = await callLLM({
          system: `你是HR数据分析AI助手。返回严格JSON：{"conclusion":"","explanation":{"signals":[],"reasoning":[],"conclusion":"","actions":[]}}`,
          user: `适岗度:${intern.fitScore} 风险度:${intern.riskScore} 高潜度:${intern.potentialScore}`,
          temperature: 0.6, maxTokens: 800, jsonMode: true, timeoutMs: 5000,
        });
        return safeJsonParse(raw, { conclusion: '', explanation: { text: '', signals: [], reasoning: [], conclusion: '', actions: [] } });
      },
    });

    return NextResponse.json({
      basicInfo: { id: intern.id, name: intern.name, gender: intern.gender, school: intern.school, major: intern.major, entryDate: intern.entryDate, phase: intern.phase, position: intern.position.name, mentor: intern.mentor.name, department: intern.mentor.department },
      scores: { fitScore: intern.fitScore, riskScore: intern.riskScore, potentialScore: intern.potentialScore },
      tags: safeJsonParse(Array.isArray(intern.tags) ? JSON.stringify(intern.tags) : String(intern.tags), []),
      riskLevel: intern.riskLevel, potentialType: intern.potentialType, taskCompletionRate: intern.taskCompletionRate,
      abilityScores,
      positionAnalysis: { requirements: positionAbilities, currentPerformance: abilityScores.map(a => ({ dimension: a.dimension, score: a.score, status: a.score >= 70 ? 'strong' : a.score >= 50 ? 'moderate' : 'weak' })), aiConclusion: aiResult.conclusion },
      weeklyReports: intern.weeklyReports.map(r => ({ weekStart: r.weekStart, content: r.content, aiSummary: r.aiSummary, emotionSignal: r.emotionSignal, difficulties: r.difficulties, needsHelp: r.needsHelp })),
      mentorFeedbacks: intern.mentorFeedbacks.map(f => ({ weekStart: f.weekStart, mentorName: f.mentor.name, performance: f.performance, comment: f.comment, strengths: f.strengths, concerns: f.concerns, needsHR: f.needsHR })),
      riskAlerts: intern.riskAlerts.map(a => ({ id: a.id, type: a.type, level: a.level, reason: safeJsonParse(Array.isArray(a.reason) ? JSON.stringify(a.reason) : String(a.reason), []), action: a.action, createdAt: a.createdAt })),
      trendData, aiExplanation: aiResult.explanation, aiStatus,
    });
  } catch (error) {
    console.error('Intern detail API error:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to fetch intern details' }, { status: 500 });
  }
}
