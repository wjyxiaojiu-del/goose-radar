#!/bin/bash
# ============================================
# 安全验收脚本 — 上线前 4 项手测
# 用法: bash scripts/security-check.sh [BASE_URL] [API_SECRET]
# 示例: bash scripts/security-check.sh http://localhost:3000 your-api-secret
# ============================================

set -e

BASE="${1:-http://localhost:3000}"
SECRET="${2:-}"
PASS=0
FAIL=0
TOTAL=4

echo "🔒 安全验收检查 — 目标: $BASE"
echo "=========================================="
echo ""

# ── 检查 1: 公开 GET 接口可访问 ──
echo "[1/4] 公开 GET 接口可访问"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/dashboard")
if [ "$HTTP" = "200" ]; then
  echo "  ✅ GET /api/dashboard → $HTTP"
  PASS=$((PASS + 1))
else
  echo "  ❌ GET /api/dashboard → $HTTP (期望 200)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── 检查 2: POST assistant 无 CSRF 应被拒绝 ──
echo "[2/4] POST /api/assistant/chat 无 CSRF 应返回 403"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}')
if [ "$HTTP" = "403" ]; then
  echo "  ✅ 无 CSRF → $HTTP (拒绝)"
  PASS=$((PASS + 1))
else
  echo "  ❌ 无 CSRF → $HTTP (期望 403)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── 检查 3: AI 接口限流 ──
echo "[3/4] AI 接口限流（连续 12 次请求，应出现 429）"
# 先获取 CSRF cookie
CSRF=$(curl -s -c - "$BASE/api/health" | grep csrf_token | awk '{print $NF}')
LIMIT_HIT=0

for i in $(seq 1 12); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/api/assistant/chat" \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $CSRF" \
    -b "csrf_token=$CSRF" \
    -d '{"message":"hello"}')
  if [ "$HTTP" = "429" ]; then
    LIMIT_HIT=1
    echo "  ✅ 第 $i 次请求触发限流 → 429"
    break
  fi
done

if [ "$LIMIT_HIT" = "1" ]; then
  PASS=$((PASS + 1))
else
  echo "  ⚠️ 12 次请求未触发限流（可能阈值更高或限流未生效）"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── 检查 4: 写操作无认证应被拒绝 ──
echo "[4/4] PATCH /api/alerts/1 无 CSRF 应返回 403"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE/api/alerts/1" \
  -H "Content-Type: application/json" \
  -d '{}')
if [ "$HTTP" = "403" ]; then
  echo "  ✅ 无 CSRF → $HTTP (拒绝)"
  PASS=$((PASS + 1))
else
  echo "  ❌ 无 CSRF → $HTTP (期望 403)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── 汇总 ──
echo "=========================================="
echo "结果: $PASS/$TOTAL 通过, $FAIL 失败"
if [ "$FAIL" -eq 0 ]; then
  echo "🎉 全部通过，可以发布"
  exit 0
else
  echo "⚠️ 有失败项，请检查后再发布"
  exit 1
fi
