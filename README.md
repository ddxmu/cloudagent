# CloudAgent

本地终端直接调用的 AI CLI 助手，蓝绿色界面，支持 REPL 交互和单次对话两种模式。

## 效果预览

```
┌──────────────────────────────────────────────────┐
│   CloudAgent  ·  AI CLI Assistant               │
└──────────────────────────────────────────────────┘

  ★ Powered by MiniMax  ·  MiniMax-M2.7  ·  REPL mode

  exit / quit · close session
──────────────────────────────────────────────────

◈ You
  帮我写一个快速排序

◈ Agent
  好的，以下是快速排序的 Python 实现...

```

## 桌面端一键安装（Mac / Linux / Windows WSL）

### 第一步：下载安装包

从 GitHub Release 下载：

**https://github.com/ddxmu/cloudagent/releases/latest**

下载 `cloudagent-vX.X.X.tar.gz`

### 第二步：一键安装脚本

把下载的压缩包放到 `~/Downloads`，然后执行：

```bash
cd ~/Downloads
tar xzf cloudagent-v*.tar.gz
cd cloudagent

# 运行安装脚本
chmod +x install.sh && ./install.sh
```

`install.sh` 会自动：
- 检测你的系统（Mac / Linux / WSL）
- 安装 SSH 连接配置
- 配置 API Key
- 创建命令软链接

### 第三步：配置 API Key

```bash
cloudagent login
```

按提示输入（直接回车使用默认值）：

```
API URL [https://api.minimaxi.com/v1]:
API Key: 你的MiniMax API Key
Model [MiniMax-M2.7]:
```

> API Key 获取：https://platform.minimaxi.com/

## 开始使用

```bash
# 交互式 REPL（主要方式）
cloudagent

# 单次对话
cloudagent "帮我写一个 hello world"
cloudagent "用 Python 实现二分查找"

# 查看历史会话
cloudagent sessions

# 修改配置
cloudagent login
```

## 系统要求

| 组件 | 要求 |
|------|------|
| 系统 | macOS / Linux / Windows WSL |
| SSH | 需要能连接远程服务器 |
| 网络 | 能访问 MiniMax API |
| 远程服务器 | 需部署 CloudAgent 服务端（见下方手动部署） |

## 手动部署服务端（非必须，服务器管理员操作）

服务端源码在 `server/` 目录，需要一台有 Bun 运行时的服务器：

```bash
# 1. 上传服务端到服务器
scp -r server root@你的服务器IP:/opt/cloudagent

# 2. SSH 进服务器安装
ssh root@你的服务器IP
cd /opt/cloudagent
bun run --bun src/cli.ts

# 3. 修改本地 wrapper 中的 REMOTE_HOST 为你的服务器IP
```

## 可用工具

| 工具 | 功能 |
|------|------|
| Read | 读取文件/目录 |
| Glob | 模式搜索文件 |
| Grep | 正则搜索内容 |
| Bash | 执行 Shell 命令 |
| Edit | 字符串替换编辑 |
| Write | 创建/覆盖文件 |

## 技术栈

- **运行时**：Bun（直接运行 TypeScript）
- **模型**：MiniMax API（MCP 兼容）
- **协议**：SSH 远程调用

## License

MIT
