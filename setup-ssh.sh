#!/bin/bash

# SSH免密登录一键配置脚本

echo "🔑 SSH免密登录配置助手"
echo "================================"

# 检查SSH密钥是否存在
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "❌ SSH密钥不存在，正在生成..."
    ssh-keygen -t rsa -b 4096 -C "$(whoami)@$(hostname)" -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH密钥已生成"
else
    echo "✅ SSH密钥已存在"
fi

# 获取用户输入
read -p "请输入服务器IP地址: " SERVER_IP
read -p "请输入服务器用户名: " SERVER_USER
read -p "请输入SSH别名 (默认: aliyun): " SSH_ALIAS
SSH_ALIAS=${SSH_ALIAS:-aliyun}

echo ""
echo "📋 配置信息:"
echo "服务器IP: $SERVER_IP"
echo "用户名: $SERVER_USER"
echo "SSH别名: $SSH_ALIAS"
echo ""

# 复制公钥到服务器
echo "🚀 正在复制公钥到服务器..."
echo "请输入服务器密码（这是最后一次需要输入密码）:"
ssh-copy-id $SERVER_USER@$SERVER_IP

if [ $? -eq 0 ]; then
    echo "✅ 公钥复制成功！"
else
    echo "❌ 公钥复制失败，请检查服务器信息"
    exit 1
fi

# 创建SSH配置
echo "⚙️ 配置SSH客户端..."
mkdir -p ~/.ssh
touch ~/.ssh/config

# 检查是否已存在相同的Host配置
if grep -q "^Host $SSH_ALIAS$" ~/.ssh/config; then
    echo "⚠️  SSH配置中已存在 '$SSH_ALIAS'，跳过配置"
else
    cat >> ~/.ssh/config << EOF

# 阿里云服务器 - 由setup-ssh.sh自动生成
Host $SSH_ALIAS
    HostName $SERVER_IP
    User $SERVER_USER
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF
    echo "✅ SSH配置已添加"
fi

# 设置正确的权限
chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# 测试连接
echo "🧪 测试免密登录..."
ssh -o ConnectTimeout=10 $SSH_ALIAS "echo '🎉 免密登录测试成功！'"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎊 配置完成！"
    echo "================================"
    echo "现在您可以使用以下命令:"
    echo "  连接服务器: ssh $SSH_ALIAS"
    echo "  同步文件: ./sync-files.sh"
    echo ""
    echo "💡 提示: sync-files.sh 已自动配置为使用 '$SSH_ALIAS'"
    
    # 更新sync-files.sh中的SERVER_HOST
    if [ -f "sync-files.sh" ]; then
        sed -i.bak "s/SERVER_HOST=\"aliyun\"/SERVER_HOST=\"$SSH_ALIAS\"/g" sync-files.sh
        echo "✅ sync-files.sh 已更新"
    fi
else
    echo "❌ 免密登录测试失败，请检查配置"
    echo "您可以手动测试: ssh $SSH_ALIAS"
fi

echo ""
echo "📚 更多帮助请查看: SSH_SETUP.md"