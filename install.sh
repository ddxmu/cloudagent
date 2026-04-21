#!/bin/bash
# CloudAgent 桌面端安装脚本（Mac / Linux / WSL）
# 用法: chmod +x install.sh && ./install.sh

set -e

REPO_URL="https://github.com/ddxmu/cloudagent"
VERSION=$(curl -s https://api.github.com/repos/ddxmu/cloudagent/releases/latest | grep '"tag_name"' | sed 's/.*"v\([0-9.]*\)".*/\1/')
PACKAGE="cloudagent-v${VERSION}.tar.gz"
DOWNLOAD_URL="${REPO_URL}/releases/download/v${VERSION}/${PACKAGE}"

echo "============================================"
echo "  CloudAgent 安装程序"
echo "============================================"
echo

# Step 1: Ask for server IP
echo "[1/4] 配置服务器地址"
read -p "请输入你的 CloudAgent 服务器 IP 或域名: " SERVER_IP
if [ -z "$SERVER_IP" ]; then
    echo "错误: 服务器地址不能为空"
    exit 1
fi

# Step 2: Ask for SSH key location
echo
echo "[2/4] 配置 SSH 密钥"
DEFAULT_KEY="$HOME/.ssh/id_rsa"
if [ -f "$DEFAULT_KEY" ]; then
    read -p "SSH 私钥路径 [默认: $DEFAULT_KEY]: " SSH_KEY
    SSH_KEY=${SSH_KEY:-$DEFAULT_KEY}
else
    read -p "SSH 私钥路径: " SSH_KEY
fi

if [ ! -f "$SSH_KEY" ]; then
    echo "错误: SSH 密钥不存在: $SSH_KEY"
    exit 1
fi

# Step 3: Install wrapper
echo
echo "[3/4] 安装 cloudagent 命令"
INSTALL_DIR="/usr/local/bin"
if [ -w "$INSTALL_DIR" ]; then
    TARGET="$INSTALL_DIR/cloudagent"
else
    TARGET="$HOME/.local/bin/cloudagent"
    mkdir -p "$HOME/.local/bin"
fi

cat > "$TARGET" << WRAPPER
#!/bin/bash
REMOTE_HOST="$SERVER_IP"
REMOTE_USER="root"
REMOTE_KEY="$SSH_KEY"
REMOTE_PATH="/opt/cloudagent"

if [ \$# -eq 0 ]; then
  exec ssh -qtt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "\$REMOTE_USER@\$REMOTE_HOST" \
    "source ~/.bashrc && cd \$REMOTE_PATH && bun run --bun src/cli.ts"
else
  exec ssh -qt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    "\$REMOTE_USER@\$REMOTE_HOST" \
    "source ~/.bashrc && cd \$REMOTE_PATH && bun run --bun src/cli.ts \${1+\"\$@\"}"
fi
WRAPPER

chmod +x "$TARGET"
echo "  安装到: $TARGET"

# Step 4: Verify
echo
echo "[4/4] 验证连接..."
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@"$SERVER_IP" "echo OK" 2>/dev/null; then
    echo "  服务器连接成功!"
else
    echo "  警告: 无法连接服务器，请检查 IP 和 SSH 密钥"
fi

echo
echo "============================================"
echo "  安装完成!"
echo "============================================"
echo
echo "下一步:"
echo "  1. 运行: cloudagent login  配置 API Key"
echo "  2. 运行: cloudagent        开始使用"
echo
echo "API Key 获取: https://platform.minimaxi.com/"
