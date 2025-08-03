#!/bin/bash

# 骆驼快跑项目部署脚本
# 将本地构建文件同步到阿里云服务器

# 配置变量 - 请根据您的服务器信息修改
SERVER_USER="your_username"  # 服务器用户名
SERVER_HOST="your_server_ip"  # 服务器IP地址
SERVER_PATH="/path/to/camel-up-online"  # 服务器上的项目路径

echo "🚀 开始部署骆驼快跑项目到阿里云服务器..."

# 检查build文件夹是否存在
if [ ! -d "build" ]; then
    echo "❌ build文件夹不存在，请先运行 npm run build"
    exit 1
fi

echo "📦 同步前端构建文件..."
# 同步前端构建文件
rsync -avz --delete build/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/build/

echo "📦 同步服务器代码..."
# 同步服务器代码
rsync -avz --delete server/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/

echo "📦 同步package.json文件..."
# 同步package.json（用于依赖管理）
rsync -avz package.json $SERVER_USER@$SERVER_HOST:$SERVER_PATH/

echo "🔧 在服务器上安装依赖并重启服务..."
# 在服务器上执行命令
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /path/to/camel-up-online

# 安装前端依赖（如果需要serve等工具）
npm install --production

# 安装服务器依赖
cd server
npm install --production
cd ..

# 重启PM2服务
pm2 restart all || echo "PM2服务重启失败，可能需要手动启动"

# 显示服务状态
pm2 status

echo "✅ 部署完成！"
EOF

echo "🎉 部署脚本执行完成！"
echo "📝 请访问您的服务器地址查看更新结果"