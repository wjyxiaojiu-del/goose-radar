#!/bin/bash
# ============================================
# ECS 一键部署脚本
# 在 ECS 上运行: bash scripts/deploy-ecs.sh
# ============================================

set -e

PROJECT_DIR="/var/goose-radar"
BRANCH="main"

echo "🐧 鹅苗雷达 — ECS 部署"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker 未安装，请先安装 Docker"
  exit 1
fi

if ! command -v docker compose &> /dev/null; then
  echo "❌ docker compose 未安装"
  exit 1
fi

# 进入项目目录
if [ ! -d "$PROJECT_DIR" ]; then
  echo "📥 首次部署，克隆仓库..."
  cd /var
  # TODO: 替换为你的仓库地址
  # git clone https://github.com/your-username/goose-radar.git
  echo "请先手动克隆仓库到 $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

# 拉取最新代码
echo "📥 拉取最新代码..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# 检查 .env
if [ ! -f .env ]; then
  echo "❌ .env 文件不存在"
  echo "请先创建 .env 文件，参考 .env.production"
  exit 1
fi

# 检查必要变量
source .env
if [ -z "$API_SECRET" ]; then
  echo "❌ API_SECRET 未设置"
  exit 1
fi

# 构建并启动
echo "🔨 构建 Docker 镜像..."
docker compose build --no-cache

echo "🚀 启动服务..."
docker compose up -d

# 等待启动
echo "⏳ 等待服务启动..."
sleep 5

# 健康检查
echo "🏥 健康检查..."
for i in $(seq 1 10); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    echo "✅ 服务启动成功"
    break
  fi
  if [ "$i" = "10" ]; then
    echo "❌ 服务启动超时"
    echo "查看日志: docker compose logs app"
    exit 1
  fi
  sleep 2
done

# 安全检查
echo ""
echo "🔒 安全验收..."
if [ -f scripts/security-check.sh ]; then
  bash scripts/security-check.sh http://localhost:3000
else
  echo "⚠️ security-check.sh 不存在，跳过自动验收"
fi

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "   访问: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-ecs-ip')"
echo "   日志: docker compose logs -f app"
echo "   停止: docker compose down"
