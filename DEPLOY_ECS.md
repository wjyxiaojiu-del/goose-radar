# 鹅苗雷达 — 阿里云 ECS 部署指南

## 前置条件
- ECS: 47.114.72.251（SSH 免密）
- Docker + docker-compose 已安装
- 项目已推送到 Git 仓库

## 一、本地准备

### 1. 生成 API_SECRET
```bash
openssl rand -hex 32
```
记下输出的值。

### 2. 推送代码到仓库
```bash
cd "E:\Project coding\goose-radar"
git add -A
git commit -m "feat: 公开 demo 安全加固 + 测试 + CI"
git push origin main
```

## 二、ECS 部署

### 1. SSH 登录
```bash
ssh root@47.114.72.251
```

### 2. 克隆/拉取代码
```bash
# 首次部署
cd /var
git clone https://github.com/your-username/goose-radar.git
cd goose-radar

# 后续更新
cd /var/goose-radar
git pull
```

### 3. 创建环境变量文件
```bash
cat > .env << 'EOF'
NODE_ENV=production
API_SECRET=<替换为你生成的强随机值>
DATABASE_URL=file:./dev.db?journal_mode=WAL&busy_timeout=5000
AI_BASE_URL=https://api.example.com/v1
AI_API_KEY=sk-...
AI_MODEL=mimo-v2.5-pro
EOF
```

### 4. 构建并启动
```bash
docker compose up -d --build
```

### 5. 查看日志
```bash
docker compose logs -f app
```

### 6. 验证部署
```bash
# 健康检查
curl http://localhost:3000/api/health

# 安全验收
bash scripts/security-check.sh http://localhost:3000
```

## 三、常见操作

### 更新部署
```bash
cd /var/goose-radar
git pull
docker compose up -d --build
```

### 查看日志
```bash
docker compose logs -f app        # 实时日志
docker compose logs --tail=100 app # 最近 100 行
```

### 重启服务
```bash
docker compose restart
```

### 停止服务
```bash
docker compose down
```

### 数据库备份
```bash
cp /var/goose-radar/dev.db /var/goose-radar/dev.db.bak.$(date +%Y%m%d)
```

## 四、Nginx 反向代理（可选）

如果需要域名访问 + HTTPS，在 ECS 上配置 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 五、安全提醒

⚠️ **上线后务必确认**：
1. `.env` 文件权限 `chmod 600 .env`
2. ECS 安全组只开放 80/443（不要暴露 3000 端口）
3. 定期更新依赖 `npm audit fix`
