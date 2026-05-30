// 演示预热脚本：请求关键 API 让 LLM 结果进入缓存
// 用法：npm run warmup

const BASE = process.env.WARMUP_URL || 'http://localhost:3000';

const endpoints = [
  { path: '/api/dashboard', label: '仪表盘' },
  { path: '/api/suggestions', label: 'AI 建议' },
];

const priorityNames = ['张晨', '王若曦', '梁雨萱'];

async function warmup(path, label) {
  const url = `${BASE}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url);
    const ms = Date.now() - start;
    const status = res.ok ? '✓' : `✗ ${res.status}`;
    console.log(`  ${status} ${label.padEnd(10)} ${ms}ms  ${path}`);
    if (res.ok) {
      const data = await res.json();
      // 如果有 internId，顺带预热干预和详情页
      if (data.aiReminders) {
        const internIds = data.aiReminders
          .filter(r => r.internId)
          .map(r => r.internId);
        return internIds.slice(0, 2);
      }
    }
  } catch (e) {
    console.log(`  ✗ ${label.padEnd(10)} 失败: ${e.message}`);
  }
  return [];
}

async function main() {
  console.log(`\n预热 Goose Radar AI 缓存...\n目标: ${BASE}\n`);

  // 第一轮：dashboard + suggestions
  const ids = [];
  for (const ep of endpoints) {
    const found = await warmup(ep.path, ep.label);
    ids.push(...found);
  }

  const internsRes = await fetch(`${BASE}/api/interns`).catch(() => null);
  if (internsRes?.ok) {
    const interns = await internsRes.json();
    for (const name of priorityNames) {
      const intern = interns.find(item => item.name === name);
      if (intern?.id) ids.push(intern.id);
    }
  }

  // 第二轮：用 dashboard 返回的 internId 预热详情和干预页
  const uniqueIds = [...new Set(ids)].slice(0, 5);
  if (uniqueIds.length > 0) {
    console.log('');
    for (const id of uniqueIds) {
      await warmup(`/api/interns/${id}`, '实习生详情');
      await warmup(`/api/interventions/${id}`, '干预方案');
    }
  }

  console.log('\n预热完成。演示时这些页面将秒开。\n');
}

main();
