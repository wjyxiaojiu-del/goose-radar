# 鹅苗雷达 — 发布 Checklist

## 一、发布前（本地验证）

### 1.1 环境变量
- [ ] 复制 `.env.production` 为 `.env`，填入真实值
- [ ] `API_SECRET` 已替换为 `openssl rand -hex 32` 生成的强随机值
- [ ] `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` 已填入（或确认 demo 模式可接受）
- [ ] `.env` 未被 git 追踪（`git status` 确认）

### 1.2 构建验证
```bash
npm run build
npm run start
```
- [ ] `npm run build` 无报错
- [ ] `npm run start` 启动正常，无 crash

### 1.3 功能冒烟
- [ ] 浏览器访问 `/`，Dashboard 正常渲染
- [ ] 浏览器访问 `/interns`，列表正常
- [ ] 浏览器访问 `/alerts`，预警正常
- [ ] 浏览器访问 `/assistant`，AI 助手可用
- [ ] 页面顶部出现 Demo 标识 banner

### 1.4 安全验收
```bash
bash scripts/security-check.sh http://localhost:3000
```
- [ ] 检查 1: 公开 GET → 200
- [ ] 检查 2: 无 CSRF POST → 403
- [ ] 检查 3: 限流触发 → 429
- [ ] 检查 4: 无 CSRF PATCH → 403

### 1.5 单元测试
```bash
npm run test
```
- [ ] 91 个用例全绿

---

## 二、预发（Preview / Staging）

### 2.1 部署
- [ ] 推送到 preview 分支 / 创建 preview 部署
- [ ] 环境变量已在部署平台配置（不是本地 .env）
- [ ] 部署成功，无构建错误

### 2.2 预发验收（2-3 人试用 30 分钟）
- [ ] 分享 preview 链接给 2-3 个同事
- [ ] 收集反馈：

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 页面加载速度 | | |
| AI 响应速度 | | |
| Demo banner 是否明显 | | |
| 是否有 JS 报错 | | |
| 移动端是否正常 | | |
| 限流是否误伤 | | |

### 2.3 预发安全检查
```bash
bash scripts/security-check.sh https://your-preview-url.vercel.app
```
- [ ] 4 项安全检查全部通过

---

## 三、正式发布

### 3.1 发布
- [ ] 合并到 main 分支
- [ ] 生产环境部署成功
- [ ] 生产环境变量已配置

### 3.2 发布后监控（前 2 小时）
- [ ] 部署平台日志无 5xx 错误
- [ ] AI 接口调用量正常（无异常飙升）
- [ ] 429 限流触发次数在预期范围
- [ ] 用户反馈收集正常

### 3.3 紧急回滚方案
如果出现严重问题：
1. 部署平台回滚到上一个版本
2. 或设置 `SKIP_API_AUTH=false` + 关闭 AI 功能（降级为纯 demo 数据模式）

---

## 四、发布说明（可直接复制到分享消息）

```
🐧 鹅苗雷达 — AI 实习生管理平台 Demo

🔗 访问地址: https://your-url.vercel.app

功能亮点：
• 实习生风险自动识别 + 预警
• AI 助手对话式数据查询
• 高潜人才发现 + 培养建议
• 个性化干预方案生成

⚠️ 本系统为 Demo，数据均为模拟生成。

技术栈：Next.js 16 + Prisma + SQLite + MiMo AI
```
