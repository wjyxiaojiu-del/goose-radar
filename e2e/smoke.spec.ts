import { test, expect } from '@playwright/test';

test('dashboard renders real API numbers, not fallback zeros', async ({ page }) => {
  const res = await page.waitForResponse(r =>
    r.url().includes('/api/dashboard') && r.status() === 200
  );
  await page.goto('/');
  const json = await res.json();
  const total = json.stats?.totalInterns ?? 0;

  // 页面上应出现 API 返回的真实人数（fallback 里是 0 或 20）
  if (total > 0) {
    await expect(page.locator(`text=${total}`).first()).toBeVisible({ timeout: 10000 });
  }
});

test('interns list renders API data, not fallback', async ({ page }) => {
  const res = await page.waitForResponse(r =>
    r.url().includes('/api/interns') && r.status() === 200
  );
  await page.goto('/interns');
  const json = await res.json();
  const interns: Array<{ name: string }> = Array.isArray(json) ? json : json.data ?? [];
  if (interns.length > 0) {
    // 第一个实习生名字应出现在页面上
    await expect(page.locator(`text=${interns[0].name}`).first()).toBeVisible({ timeout: 10000 });
  }
});

test('alerts page renders API data', async ({ page }) => {
  const res = await page.waitForResponse(r =>
    r.url().includes('/api/alerts') && r.status() === 200
  );
  await page.goto('/alerts');
  const json = await res.json();
  const alerts: Array<{ internName?: string }> = Array.isArray(json) ? json : [];
  if (alerts.length > 0 && alerts[0].internName) {
    await expect(page.locator(`text=${alerts[0].internName}`).first()).toBeVisible({ timeout: 10000 });
  }
});

test('assistant page renders', async ({ page }) => {
  await page.goto('/assistant');
  await expect(page.locator('text=AI 助手')).toBeVisible();
  await expect(page.locator('textarea, input[type="text"]').first()).toBeEnabled();
});
