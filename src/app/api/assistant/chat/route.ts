import { NextRequest, NextResponse } from 'next/server';
import { isAIAvailable, streamLLM } from '@/lib/ai';
import { executeTool, TOOL_DEFINITIONS } from '@/lib/assistant-tools';
import { validateCsrf } from '@/lib/csrf';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type { ToolName } from '@/lib/assistant-tools';

function buildSystemPrompt(withToolResult?: { name: string; summary: string; data: unknown }) {
  const toolDesc = TOOL_DEFINITIONS.map(t => {
    const params = Object.entries(t.parameters)
      .map(([k, v]) => `    - ${k}: ${(v as { type: string; description?: string }).type} — ${(v as { type: string; description?: string }).description}`)
      .join('\n');
    return `- ${t.name}: ${t.description}\n  参数:\n${params}`;
  }).join('\n');

  return `你是「鹅苗雷达」AI 助手，专门帮助 HR 和导师分析实习生状态、发现风险、制定干预方案。

## 可用工具
你可以调用以下工具获取实时数据。当需要数据时，以 JSON 格式输出工具调用：
<tool>{"name": "工具名", "arguments": {...}}</tool>

${toolDesc}

## 回复规则
1. 用中文回答，语气专业、亲切、简洁。
2. 数据驱动：优先引用具体数字和案例，避免空泛建议。
3. 发现风险时：明确指出风险点、影响、建议行动。
4. 发现高潜人才时：说明优势维度、可承担的挑战。
5. Markdown 格式，关键数据加粗。
${withToolResult ? `\n## 已执行工具\n工具: ${withToolResult.name}\n结果摘要: ${withToolResult.summary}\n原始数据: ${JSON.stringify(withToolResult.data, null, 2)}\n请基于以上数据回答用户问题。` : ''}`;
}

// ============ Demo / Fallback Mode ============

function detectIntent(message: string): { name: ToolName; arguments: Record<string, unknown> } | null {
  const m = message.toLowerCase();
  if (m.includes('风险') || m.includes('预警') || m.includes('危险') || m.includes('关注')) {
    return { name: 'list_alerts', arguments: { isActive: true, limit: 10 } };
  }
  if (m.includes('高潜') || m.includes('潜力') || m.includes('人才') || m.includes('培养')) {
    return { name: 'list_interns', arguments: {} };
  }
  if (m.includes('概况') || m.includes('整体') || m.includes('数据') || m.includes('统计') || m.includes('概览')) {
    return { name: 'get_dashboard_stats', arguments: {} };
  }
  if (m.includes('对比') || m.includes('比较') || m.includes('差距')) {
    return { name: 'list_interns', arguments: { limit: 20 } };
  }
  // Try to match a name
  return { name: 'get_intern_detail', arguments: { internId: message.trim() } };
}

function generateDemoAnswer(message: string, toolName: ToolName, result: { data: unknown }): string {
  const m = message.toLowerCase();

  if (toolName === 'get_dashboard_stats') {
    const d = result.data as Record<string, unknown>;
    const total = d.totalInterns as number;
    const highRisk = d.highRiskCount as number;
    const highPot = d.highPotentialCount as number;
    const avg = d.avgFitScore as number;
    const alerts = d.activeAlerts as number;
    const dist = d.riskDistribution as Record<string, number>;
    return `当前共有 **${total}** 名实习生在系统中。\n\n### 核心指标\n- **高风险**：${highRisk} 人\n- **高潜人才**：${highPot} 人\n- **平均适岗度**：${avg} 分\n- **待处理预警**：${alerts} 条\n\n### 风险分布\n${Object.entries(dist).map(([k, v]) => `- ${k}风险：**${v}** 人`).join('\n')}\n\n> 💡 建议优先处理高风险实习生的干预方案，同时关注高潜人才的培养资源分配。`;
  }

  if (toolName === 'list_alerts') {
    const alerts = (result.data as Array<Record<string, unknown>>) ?? [];
    if (alerts.length === 0) return '当前没有活跃的风险预警，所有实习生状态平稳。\n\n> ✅ 继续保持关注即可。';
    const highAlerts = alerts.filter(a => a.level === '高');
    const lines = alerts.slice(0, 5).map((a, i) => {
      const reason = typeof a.reason === 'string' ? a.reason : JSON.stringify(a.reason);
      return `${i + 1}. **${a.internName}**（${a.position}）— ${a.type}，等级：**${a.level}**\n   - ${reason}`;
    }).join('\n\n');
    return `发现 **${alerts.length}** 条活跃预警，其中 **${highAlerts.length}** 条为高风险：\n\n${lines}\n\n> ⚠️ 建议立即对高风险实习生安排导师一对一沟通，并制定针对性干预方案。`;
  }

  if (toolName === 'list_interns') {
    const interns = (result.data as Array<Record<string, unknown>>) ?? [];
    if (m.includes('高潜') || m.includes('潜力') || m.includes('人才')) {
      const highs = interns.filter(i => (i.potentialScore as number) >= 80 || (i.potentialType as string));
      if (highs.length === 0) return '当前系统中暂无明确标记的高潜人才。\n\n> 可以通过「岗位匹配分析」页面进一步评估。';
      const lines = highs.slice(0, 5).map((i, idx) => {
        return `${idx + 1}. **${i.name}** — ${i.position}\n   - 高潜度：**${i.potentialScore}** 分，适岗度：**${i.fitScore}** 分\n   - 当前阶段：${i.phase}`;
      }).join('\n\n');
      return `识别出 **${highs.length}** 位高潜实习生：\n\n${lines}\n\n> 🌟 建议为高潜人才分配更具挑战性的任务，并安排资深导师重点培养。`;
    }
    // Default: list with risk focus
    const highRisk = interns.filter(i => i.riskLevel === '高');
    if (highRisk.length === 0) {
      return `当前共 **${interns.length}** 位实习生，暂无高风险人员。\n\n系统监控持续运行中。`;
    }
    const lines = highRisk.slice(0, 5).map((i, idx) => {
      return `${idx + 1}. **${i.name}** — ${i.position}（${i.mentor}）\n   - 风险度：**${i.riskScore}** 分，适岗度：**${i.fitScore}** 分`;
    }).join('\n\n');
    return `当前共 **${interns.length}** 位实习生，其中 **${highRisk.length}** 位为高风险：\n\n${lines}\n\n> ⚠️ 建议尽快查看详细干预方案并安排导师跟进。`;
  }

  if (toolName === 'get_intern_detail') {
    const d = result.data as Record<string, unknown> | null;
    if (!d) return '未找到该实习生的信息，请确认姓名或 ID 是否正确。';
    const info = d.basicInfo as Record<string, unknown>;
    const scores = d.scores as Record<string, number>;
    const abilities = (d.abilityScores as Array<Record<string, unknown>>) ?? [];
    const alerts = (d.recentAlerts as Array<Record<string, unknown>>) ?? [];
    const reports = (d.recentReports as Array<Record<string, unknown>>) ?? [];
    const abilityLine = abilities.slice(0, 5).map(a => `${a.dimension}: **${a.score}**`).join('、');
    const alertLine = alerts.filter(a => a.isActive).length;
    const reportSummary = reports.length > 0 ? `最近周报情绪：${reports[0].emotionSignal}` : '';
    return `### ${info.name} 的详细画像\n\n**基础信息**\n- 学校：${info.school} · ${info.major}\n- 岗位：${info.position}（导师：${info.mentor}）\n- 当前阶段：${info.phase}\n\n**综合评分**\n- 适岗度：**${scores.fitScore}** 分\n- 风险度：**${scores.riskScore}** 分\n- 高潜度：**${scores.potentialScore}** 分\n- 任务完成率：**${scores.taskCompletionRate}**%\n\n**能力维度**\n${abilityLine}\n\n**风险状态**：${alertLine > 0 ? `有 **${alertLine}** 条未处理预警` : '暂无活跃预警'}\n${reportSummary ? `\n${reportSummary}` : ''}\n\n> ${scores.riskScore > 60 ? '⚠️ 风险较高，建议尽快安排导师介入。' : scores.potentialScore > 80 ? '🌟 高潜人才，建议加大培养力度。' : '状态平稳，保持常规跟进即可。'}`;
  }

  if (toolName === 'compare_interns') {
    const interns = (result.data as Array<Record<string, unknown>>) ?? [];
    if (interns.length < 2) return '至少需要两位实习生才能进行对比。';
    const lines = interns.map((i, idx) => {
      return `${idx + 1}. **${i.name}**\n   - 适岗度：${i.fitScore} | 风险度：${i.riskScore} | 高潜度：${i.potentialScore} | 任务完成率：${i.taskCompletionRate}%`;
    }).join('\n\n');
    return `### 实习生对比分析\n\n${lines}\n\n> 建议根据对比结果调整任务分配和导师资源配置。`;
  }

  return '我已为你查询了相关数据。有什么其他问题可以继续问我。';
}

async function* streamFallback(message: string): AsyncGenerator<string, void, unknown> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 300));

  const intent = detectIntent(message);
  let answer: string;

  if (intent) {
    const result = await executeTool(intent.name, intent.arguments);
    answer = generateDemoAnswer(message, intent.name, result);
  } else {
    answer = '你好！我是鹅苗雷达 AI 助手。\n\n我可以帮你查询实习生信息、分析风险、发现高潜人才。\n\n试试问我：\n- "最近有哪些高风险实习生？"\n- "整体数据概况如何？"\n- "张三最近状态怎么样？"\n- "帮我列出所有高潜人才"';
  }

  // Stream character by character with natural typing speed
  const chars = answer.split('');
  for (let i = 0; i < chars.length; i++) {
    yield chars[i];
    // Variable delay: faster for spaces/punctuation, slower for Chinese chars
    const delay = /[\u4e00-\u9fa5]/.test(chars[i]) ? 18 : chars[i] === '\n' ? 60 : 8;
    await new Promise(r => setTimeout(r, delay));
  }
}

// ============ Main Handler ============

export async function POST(request: NextRequest) {
  // 限流：每 IP 每分钟最多 10 次 AI 对话
  const ip = getClientIp(request);
  const rl = rateLimit(`assistant:${ip}`, 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  // CSRF 校验
  if (!(await validateCsrf(request))) {
    return NextResponse.json({ error: 'CSRF token 无效，请刷新页面重试' }, { status: 403 });
  }

  const { message, history = [] } = await request.json().catch(() => ({ message: '', history: [] }));
  if (!message || typeof message !== 'string') {
    return new Response('data: {"error":"消息不能为空"}\n\n', {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const useAI = isAIAvailable();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        if (!useAI) {
          // Offline demo mode: query real data + template answer + streaming
          for await (const chunk of streamFallback(message)) {
            send(JSON.stringify({ chunk }));
          }
          send(JSON.stringify({ done: true }));
          controller.close();
          return;
        }

        // Round 1: ask LLM if it needs tool
        const round1System = buildSystemPrompt();
        const historyText = (history as Array<{ role: string; content: string }>)
          .map(h => `${h.role === 'user' ? '用户' : '助手'}: ${h.content}`)
          .join('\n');
        const round1User = `${historyText ? historyText + '\n\n' : ''}用户问题: ${message}\n\n如果需要工具获取数据，请只输出 <tool>{...}</tool>，否则直接回答。`;

        let toolCall: { name: ToolName; arguments: Record<string, unknown> } | null = null;
        let round1Text = '';

        for await (const chunk of streamLLM({ system: round1System, user: round1User, maxTokens: 1024 })) {
          round1Text += chunk;
        }

        const toolMatch = round1Text.match(/<tool>([\s\S]*?)<\/tool>/);
        if (toolMatch) {
          try {
            const parsed = JSON.parse(toolMatch[1]);
            if (parsed.name && typeof parsed.name === 'string') {
              toolCall = { name: parsed.name as ToolName, arguments: parsed.arguments ?? {} };
            }
          } catch {
            // parse error, ignore tool call
          }
        }

        // Execute tool if needed
        let toolResult: { name: string; summary: string; data: unknown } | undefined;
        if (toolCall) {
          const result = await executeTool(toolCall.name, toolCall.arguments);
          toolResult = { name: toolCall.name, summary: result.summary, data: result.data };
        }

        // Round 2: stream final answer
        const round2System = buildSystemPrompt(toolResult);
        const round2User = `${historyText ? historyText + '\n\n' : ''}用户问题: ${message}\n${toolResult ? `\n[已为你查询到数据: ${toolResult.summary}]` : ''}\n\n请直接回答用户问题。`;

        for await (const chunk of streamLLM({ system: round2System, user: round2User, maxTokens: 2048 })) {
          send(JSON.stringify({ chunk }));
        }

        send(JSON.stringify({ done: true }));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误';
        send(JSON.stringify({ error: msg }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
