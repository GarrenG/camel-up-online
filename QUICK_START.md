# 🚀 免密部署快速开始

## 一键配置SSH免密登录

```bash
# 运行自动配置脚本
./setup-ssh.sh
```

脚本会自动：
- ✅ 检查并生成SSH密钥
- ✅ 复制公钥到服务器
- ✅ 配置SSH客户端
- ✅ 测试免密登录
- ✅ 更新同步脚本

## 日常部署流程

配置完成后，每次部署只需要3步：

```bash
# 1. 本地构建项目
npm run build

# 2. 一键同步到服务器（无需密码！）
./sync-files.sh

# 3. 完成！🎉
```

## 手动配置（可选）

如果自动配置失败，可以手动配置：

### 1. 复制公钥到服务器
```bash
ssh-copy-id username@your_server_ip
```

### 2. 配置SSH别名
编辑 `~/.ssh/config`：
```
Host aliyun
    HostName your_server_ip
    User your_username
    IdentityFile ~/.ssh/id_rsa
```

### 3. 测试连接
```bash
ssh aliyun
```

## 文件说明

- `setup-ssh.sh` - 一键配置SSH免密登录
- `sync-files.sh` - 文件同步脚本（免密）
- `deploy.sh` - 完整部署脚本（免密）
- `SSH_SETUP.md` - 详细配置指南
- `ssh-config-template` - SSH配置模板

## 故障排除

### 如果仍然要求密码：
1. 检查服务器SSH配置
2. 确认公钥已正确添加
3. 检查文件权限

详细解决方案请查看 `SSH_SETUP.md`

---

🎯 **目标达