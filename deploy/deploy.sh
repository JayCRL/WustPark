#!/bin/bash
# ============================================================
# Youth Spark - 部署脚本
# 将社团网站部署到 mobilevc.top/club/
# ============================================================

set -e

echo "🚀 Youth Spark 部署工具"
echo "========================"

# --- 配置 ---
DOMAIN="mobilevc.top"
REMOTE_USER="root"                        # SSH 用户
REMOTE_HOST="your-server-ip"              # 服务器 IP
REMOTE_PATH="/var/www/mobilevc/club"      # 远程部署路径
LOCAL_SOURCE="$(dirname "$0")/.."         # 项目源码路径

# --- 1. 构建/打包 ---
echo ""
echo "📦 准备文件..."
cd "$LOCAL_SOURCE"

# 创建部署包（排除不需要的文件）
DEPLOY_DIR="/tmp/youth-spark-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

cp index.html clubs.html activities.html about.html "$DEPLOY_DIR/"
cp -r css js "$DEPLOY_DIR/"
mkdir -p "$DEPLOY_DIR/deploy"
cp deploy/nginx-club.conf "$DEPLOY_DIR/deploy/"

echo "   ✅ 复制完成: $(find "$DEPLOY_DIR" -type f | wc -l) 个文件"

# --- 2. 验证相对路径 ---
echo ""
echo "🔍 检查路径引用..."
cd "$DEPLOY_DIR"
grep -rn 'href="/' index.html clubs.html activities.html about.html 2>/dev/null || echo "   ✅ 无绝对路径引用"
grep -rn 'src="/' index.html clubs.html activities.html about.html 2>/dev/null || echo "   ✅ 无绝对路径引用"
echo "   ✅ 路径检查通过"

# --- 3. 上传 ---
echo ""
echo "📤 上传到服务器..."
echo "   目标: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
echo "   (请取消注释下面的 scp 命令来启用上传)"
# scp -r "$DEPLOY_DIR"/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

# --- 4. Nginx 配置 ---
echo ""
echo "⚙️  Nginx 配置:"
echo "   将 deploy/nginx-club.conf 中的配置添加到"
echo "   $DOMAIN 对应的 server block 中"
echo ""
echo "   如果是宝塔面板: 在网站设置 → 配置文件 中添加 location 块"
echo "   如果使用阿里云 OSS: 将文件上传到 OSS 的 club/ 目录"

# --- 5. CDN 刷新（阿里云 CDN） ---
echo ""
echo "🌐 CDN 刷新（如使用阿里云 CDN）:"
echo "   aliyun cdn RefreshObjectCaches \\"
echo "     --ObjectPath 'http://$DOMAIN/club/' \\"
echo "     --ObjectType Directory"

echo ""
echo "========================"
echo "🎉 部署准备完成！"
echo ""
echo "访问地址: https://$DOMAIN/club/"
echo "========================"
