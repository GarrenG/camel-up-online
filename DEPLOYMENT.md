# 骆驼快跑项目部署指南

本指南帮助您将本地构建的项目文件同步到阿里云服务器，避免在服务器上进行CPU密集的构建操作。

## 📋 前提条件

1. 已在阿里云服务器上安装了 Node.js 和 PM2
2. 已配置SSH密钥或密码登录
3. 服务器上已有项目目录

## 🚀 快速部署步骤

### 1. 本地构建项目

```bash
# 确保在项目根目录
npm run build
```

### 2. 配置部署脚本

编辑 `sync-files.sh` 文件，修改以下变量：

```bash
SERVER_USER="your_username"     # 您的服务器用户名
SERVER_HOST="your_server_ip"    # 您的服务器IP地址
SERVER_PATH="/home/your_username/camel-up-online"  # 服务器项目路径
```

### 3. 执行文件同步

```bash
# 使用简化版同步脚本（推荐）
./sync-files.sh

# 或使用完整版部署脚本
./deploy.sh
```

### 4. 服务器端操作

同步完成后，登录服务器执行：

```bash
ssh your_username@your_server_ip
cd /path/to/camel-up-online

# 安装服务器依赖
cd server
npm install --production
cd ..

# 重启服务
pm2 restart all

# 检查服务状态
pm2 status
```

## 📁 同步的文件

- `build/` - 前端构建文件
- `server/` - 后端服务器代码
- `package.json` - 依赖配置
- `.env` - 环境变量（如果存在）

## 🔧 服务器配置示例

### PM2 配置文件 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: 'camel-up-frontend',
      script: 'npx',
      args: 'serve -s build -l 3000',
      cwd: '/path/to/camel-up-online',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'camel-up-backend',
      script: 'server/index.js',
      cwd: '/path/to/camel-up-online',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

### 启动服务

```bash
# 首次启动
pm2 start ecosystem.config.js

# 后续重启
pm2 restart all
```

## 🔍 故障排除

### 1. SSH连接问题

```bash
# 测试SSH连接
ssh your_username@your_server_ip

# 如果需要指定端口
ssh -p 22 your_username@your_server_ip
```

### 2. 权限问题

```bash
# 确保脚本有执行权限
chmod +x sync-files.sh deploy.sh

# 确保服务器目录权限正确
sudo chown -R your_username:your_username /path/to/camel-up-online
```

### 3. 服务启动失败

```bash
# 查看PM2日志
pm2 logs

# 查看特定应用日志
pm2 logs camel-up-backend
pm2 logs camel-up-frontend
```

## 📝 注意事项

1. **首次部署**：确保服务器上已安装 `serve` 包：`npm install -g serve`
2. **环境变量**：确保服务器上的 `.env` 文件配置正确
3. **防火墙**：确保端口 3000 和 3001 已开放
4. **备份**：建议在部署前备份服务器上的现有文件

## 🔄 自动化部署

您可以将这些步骤添加到 CI/CD 流水线中，实现自动化部署：

```bash
# 示例：GitHub Actions 或其他CI工具
npm run build
./sync-files.sh
```

## 📞 支持

如果遇到问题，请检查：
1. 网络连接
2. SSH配置
3. 服务器资源（磁盘空间、内存）
4. PM2服务状态