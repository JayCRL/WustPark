#!/bin/bash
# ============================================================
# 使用阿里云 OSS 命令行工具同步到 OSS + CDN
# 适用于 mobilevc.top 使用阿里云 OSS + CDN 的场景
# ============================================================

set -e

# --- 配置 ---
OSS_BUCKET="mobilevc"           # OSS Bucket 名称
OSS_ENDPOINT="oss-cn-shenzhen.aliyuncs.com"  # 根据你的地域修改
OSS_PATH="oss://$OSS_BUCKET/club"
LOCAL_DIR="$(dirname "$0")/.."

echo "🚀 同步到阿里云 OSS: $OSS_PATH"
echo ""

# 1. 同步文件到 OSS
echo "📤 上传文件..."
ossutil sync \
  "$LOCAL_DIR" \
  "$OSS_PATH" \
  --endpoint "$OSS_ENDPOINT" \
  --delete \
  --exclude "README.md" \
  --exclude "deploy/*" \
  --exclude "images/*" \
  -u

echo ""
echo "✅ OSS 同步完成"

# 2. 刷新 CDN 缓存
echo ""
echo "🌐 刷新 CDN 缓存..."
aliyun cdn RefreshObjectCaches \
  --ObjectPath "http://mobilevc.top/club/" \
  --ObjectType Directory

echo ""
echo "🎉 部署完成！访问 https://mobilevc.top/club/"
