#!/bin/bash

# 简化版文件同步脚本
# 只同步文件，不执行远程命令

# 服务器配置 - 请修改为您的服务器信息
# 方法1：使用SSH配置别名（推荐，配置后免密登录）
SERVER_HOST="aliyun"  # SSH配置文件中的别名
# 方法2：直接使用用户名@IP
# SERVER_HOST="username@your_server_ip"
SERVER_PATH="/root/opt/camel-up-online"  # 服务器上的项目路径

echo "🚀 开始同步文件到阿里云服务器..."

# 检查build文件夹是否存在
if [ ! -d "build" ]; then
    echo "❌ build文件夹不存在，请先运行 npm run build"
    exit 1
fi

echo "📦 同步前端构建文件 (build/)..."
rsync -avz --progress --delete build/ $SERVER_HOST:$SERVER_PATH/build/

echo "📦 同步服务器代码 (server/)..."
rsync -avz --progress --delete server/ $SERVER_HOST:$SERVER_PATH/server/

echo "📦 同步配置文件..."
rsync -avz --progress package.json $SERVER_HOST:$SERVER_PATH/
rsync -avz --progress .env $SERVER_HOST:$SERVER_PATH/ 2>/dev/null || echo "⚠️  .env文件不存在，跳过"

echo "✅ 文件同步完成！"
echo ""
echo "📝 接下来请手动登录服务器执行以下命令："
echo "   ssh $SERVER_USER@$SERVER_HOST"
echo "   cd $SERVER_PATH"
echo "   cd server && npm install --production && cd .."
echo "   pm2 restart all"
echo "   pm2 status
