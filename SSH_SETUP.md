# SSH免密登录配置指南

## 🔑 配置SSH密钥认证，告别密码输入！

### 第一步：复制公钥到服务器

您的SSH公钥已经生成，现在需要将其添加到阿里云服务器：

```bash
# 方法1：使用ssh-copy-id（推荐）
ssh-copy-id username@your_server_ip

# 方法2：手动复制
ssh username@your_server_ip
mkdir -p ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC3Q2/5cmIZ0Y+M9C4diCgZ0/7JRslGg4gnTq15AktJnIS5Clc8j58u48jC7AECp5kPiW8d3Hu+RUWQ03W7WlCvuAYj8LOGfIhk5Y2eaQbRP4tfF+HeKdfwdO2YQywVbShcilDGG6bk2y1i+elZ7Qor/BEVAT5g4WMd77yp6D8ak/X2nCudFLusnUywBXkpDwED8DkIqo0cRMVZjiL1KMD9WX8WhnGSOuDLKNXoB9rsyRQKl0pa1tXZdS7SBagj0+43YJlCwyI3x1WhRA231ahm+OrM6wGPOZHrK4XOmUMn5D8fz/5G/qqCkUodcV3qZ17W6MGXWttmYox3T9LMlr6oYvcdW/Hq50ywMFfhR5Hz1lUpe/MvT1JU/4xwRsSzmiAl28eI60bIxhjgpwpnUGLhYylm4p+12WS9KKd8kYi6Sf5so8EqLsaxw0oW3rO2/SowM4hHGm68/bJwgtPfQZs5btTEBiFMmqTa9XcMPfq0xQxgV/wIaMsCanBa+gEu9GDGEFbHtRqMDROPH2ep0o5SCMphefGBw6SdhRBpRZcWDXEH8lai290jcXAZZvuuvwLxwZ3lrJ9l7KtjlpuVOYzUHesK/sNxm/SJIB5KiqBW2qIJkisqz/FkNMU5TMe2oVVZqfJfwlwg5IcDatIO4GWIA7hnAeVi2xZX44ZsTsNTXQ== your_email@example.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
exit
```

### 第二步：测试免密登录

```bash
# 测试是否可以免密登录
ssh username@your_server_ip
```

如果成功，您应该可以直接登录而无需输入密码！

### 第三步：配置SSH客户端（可选）

为了更方便，可以在 `~/.ssh/config` 中添加服务器配置：

```bash
# 编辑SSH配置文件
vim ~/.ssh/config
```

添加以下内容：
```
Host aliyun
    HostName your_server_ip
    User username
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

配置后，您可以使用简短命令连接：
```bash
ssh aliyun
```

### 第四步：更新同步脚本

现在更新 `sync-files.sh` 脚本以使用免密登录：

```bash
#!/bin/bash

# 服务器配置
SERVER_HOST="aliyun"  # 使用SSH配置的别名
# 或者直接使用: SERVER_HOST="username@your_server_ip"
SERVER_PATH="/path/to/camel-up-online"

echo "🚀 开始同步文件到阿里云服务器..."

# 同步构建文件
echo "📦 同步前端构建文件..."
rsync -avz --delete build/ $SERVER_HOST:$SERVER_PATH/build/

# 同步后端代码
echo "🔧 同步后端代码..."
rsync -avz --exclude node_modules server/ $SERVER_HOST:$SERVER_PATH/server/

# 同步配置文件
echo "⚙️ 同步配置文件..."
rsync -avz package.json $SERVER_HOST:$SERVER_PATH/
rsync -avz .env $SERVER_HOST:$SERVER_PATH/

echo "✅ 文件同步完成！"
echo "🔄 正在重启服务器服务..."

# 远程执行服务器命令
ssh $SERVER_HOST << 'EOF'
cd /path/to/camel-up-online
cd server && npm install --production && cd ..
pm2 restart all
echo "🎉 服务重启完成！"
EOF

echo "🎊 部署完成！"
```

## 🎯 使用方法

配置完成后，每次部署只需要：

```bash
# 本地构建
npm run build

# 一键同步（无需密码）
./sync-files.sh
```

## 🔒 安全提示

1. **保护私钥**：确保 `~/.ssh/id_rsa` 文件权限为 600
2. **定期更新**：建议定期更换SSH密钥
3. **备份密钥**：妥善保存SSH密钥的备份

## 🛠️ 故障排除

### 如果仍然要求密码：

1. 检查服务器SSH配置：
```bash
ssh username@your_server_ip
sudo vim /etc/ssh/sshd_config
```

确保以下设置：
```
PubkeyAuthentication yes
PasswordAuthentication yes  # 可以设为no以提高安全性
PermitRootLogin no  # 建议禁用root登录
```

2. 重启SSH服务：
```bash
sudo systemctl restart sshd
```

3. 检查文件权限：
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

现在您可以享受无密码的快速部署体验了