#!/bin/bash
# ============================================================
# BioQuest 批量题目生成脚本
#
# 用法：
#   bash scripts/batch_generate.sh [--chart] [--count N]
#
# 默认生成：竞赛题 50 + 高考题 30 + 多重判断题 30
# 生成后自动重新打标，更新 Supabase
# ============================================================

set -e

cd "$(dirname "$0")/.."

CHART_FLAG=""
COUNT=50
BATCH_COUNT=()

# 解析参数
while [[ $# -gt 0 ]]; do
  case "$1" in
    --chart) CHART_FLAG="--chart" ;;
    --count) COUNT="$2"; shift ;;
    --all) BATCH_COUNT=("$COUNT" "$COUNT" "$COUNT") ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
  shift
done

# 默认各类型数量
COMP_COUNT=${BATCH_COUNT[0]:-$COUNT}
GAOKAO_COUNT=${BATCH_COUNT[1]:-30}
MULTI_COUNT=${BATCH_COUNT[2]:-30}

echo "================================================"
echo "  BioQuest 批量题目生成"
echo "  竞赛题: ${COMP_COUNT} | 高考题: ${GAOKAO_COUNT} | 多重判断: ${MULTI_COUNT}"
echo "  图表题: ${CHART_FLAG:-否}"
echo "================================================"

# 1. 生成竞赛题
echo ""
echo "[1/4] 生成竞赛题 (${COMP_COUNT} 题)..."
python server.py --mode generate --type competition --count "$COMP_COUNT" --interval 3 ${CHART_FLAG}

# 2. 生成高考题
echo ""
echo "[2/4] 生成高考题 (${GAOKAO_COUNT} 题)..."
python server.py --mode generate --type gaokao --count "$GAOKAO_COUNT" --interval 2

# 3. 生成多重判断题（2025 联赛）
echo ""
echo "[3/4] 生成多重判断题 (${MULTI_COUNT} 题)..."
python server.py --mode generate --type multi_judge --count "$MULTI_COUNT" --interval 2

# 4. 重新打标
echo ""
echo "[4/4] 重新打标 Supabase 题目..."
python server.py --mode retag

echo ""
echo "================================================"
echo "  批量生成完成！"
echo "================================================"