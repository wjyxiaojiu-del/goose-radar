/**
 * 预热脚本 — 提前请求关键 API 端点，让 LLM 结果进入缓存
 * 用于演示前的准备，确保页面秒开
 *
 * 用法: node scripts/warmup.mjs
 * 环境变量: WARMUP_URL (默认 http://localhost:3000)
 */

const BASE = process.env.WARMUP_URL || 'http://localhost:3000';

const ENDPOINTS = [
  { path: '/api/health', label: '健康检查' },
  { path: '/api/dashboard', label: '仪表盘' },
  { path: '/api/interns', label: '实习生列表' },
  { path: '/api/alerts', label: '风险预警' },
  { path: '/api/potentials', label: '高潜人才' },
  { path: '/api/suggestions', label: 'AI 建议' },
];

async function warmup() {
  console.log(`🔥 开始预热 ${BASE}\n`);

  let success = 0;
  let failed = 0;

  await Promise.allSettled(
    ENDPOINTS.map(async ({ path, label }) => {
      const url = `${BASE}${path}`;
      const start = Date.now();
      try {
        const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30_000),
        });
        const ms = Date.now() - start;
        if (res.ok) {
          success++;
          console.log(`  ✅ ${label} (${path}) — ${res.status} ${ms}ms`);
        } else {
          failed++;
          console.log(`  ⚠️ ${label} (${path}) — ${res.status} ${ms}ms`);
        }
      } catch (err) {
        failed++;
        const ms = Date.now() - start;
        console.log(`  ❌ ${label} (${path}) — ${err.message} ${ms}ms`);
      }
    })
  );

  console.log(`\n🏁 预热完成: ${success} 成功, ${failed} 失败 (共 ${ENDPOINTS.length})`);
  if (failed > 0) process.exit(1);
}

warmup().catch(console.error);
