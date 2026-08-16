# dsh-plugins

> 自研 DeepSeek Harness (DSH) 插件合集 · My custom DSH plugins, monorepo

本仓库收录 7 个自研 DSH Web 插件，按功能分为三类。所有插件均为单仓库结构（`packages/<插件名>/`），通过 pnpm 的 git 子目录语法安装。

## 插件清单

### 📊 状态监控类

| 插件 | 功能 | 安装命令 |
|------|------|----------|
| [dsh-balance](packages/dsh-balance) | 会话头部 DeepSeek 余额芯片（3 分钟自动刷新，悬停看明细） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-balance` |
| [dsh-opencode-go](packages/dsh-opencode-go) | 会话头部 OpenCode GO 双账号用量芯片（滚动 5h/周/月 三窗口） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-opencode-go` |
| [dsh-conversation-cost](packages/dsh-conversation-cost) | 对话底部实时显示本轮/总会话额度费用（GO 美元估算 + DeepSeek 人民币） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-conversation-cost` |
| [dsh-opencode-go-pricing](packages/dsh-opencode-go-pricing) | 与 models.dev 同步 OpenCode GO 模型显示名（2x-usage 标记） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-opencode-go-pricing` |

### ⚡ 效率增强类

| 插件 | 功能 | 安装命令 |
|------|------|----------|
| [dsh-task-notify](packages/dsh-task-notify) | 回复完成时弹 Windows 系统通知（页面失焦才弹，防打扰） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-task-notify` |
| [dsh-skill-browser](packages/dsh-skill-browser) | 侧边栏技能浏览器：技能清单浮层 + 一键打开/更新 | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-skill-browser` |

### 👁️ 视觉能力类

| 插件 | 功能 | 安装命令 |
|------|------|----------|
| [dsh-vision-bridge](packages/dsh-vision-bridge) | 图片进模型前自动识图转文字（通义千问 qwen-vl-max），纯文本模型也能收图 | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-vision-bridge` |

## 快速安装

### 方式一：一键脚本（推荐，另一台电脑用）

```powershell
# 1. 下载脚本
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/305037991x-pixel/dsh-plugins/main/install-all.ps1" -OutFile install-all.ps1

# 2. 运行（可加 -SkipConfirm 跳过逐个确认）
.\install-all.ps1
```

脚本会逐条执行上表的 7 条安装命令，结束后提示重启 `dsh web` 并硬刷新（Ctrl+Shift+R）。

### 方式二：逐条安装

每条命令格式统一：

```powershell
dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/<插件名>
```

> ⚠️ 需要 pnpm 在 PATH 上（`npm i -g pnpm`），且安装后必须**重启 `dsh web`** 才生效。
> 详见 [PITFALLS.md](PITFALLS.md)。

## 维护指南（本机改插件后发布）

### 日常更新流程（核心：源码改 → 一条命令发布）

1. 在**源码目录**改代码（本机 DSH 通过 `link:` 直接使用源码，**改完本机立即生效**，无需重启）；
2. 跑一键发布脚本，它会自动把 7 个源码目录同步进 `packages/`、清理本机痕迹、校验文件、扫描敏感信息、提交并推送：

```powershell
.\publish-all.ps1 -Message "fix: xxx"
```

> 源码目录映射见 `publish-all.ps1` 顶部 `$sources`；README/LICENSE/.gitignore 以仓库维护版为准（同步时不覆盖）。
> 新增插件：把源码目录加进 `$sources` 和 `install-all.ps1` 清单即可。

### 另一台电脑更新（已装过插件后升到新版）

**方式一（推荐，实测有效）**：重新执行同一条安装命令，pnpm 会自动升级到最新提交：

```powershell
dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/<插件名>
```

**方式二**：在 profile 目录执行 pnpm update：

```powershell
pnpm --dir "$env:USERPROFILE\.dsh\profiles\web" update <插件名>
```

更新后重启 `dsh web` 并硬刷新（Ctrl+Shift+R）。

### 发布脚本参数

| 参数 | 说明 |
|------|------|
| `-Message "..."` | 提交信息（默认 `chore: sync plugins`） |
| `-DryRun` | 只显示将同步/提交什么，不提交不推送 |
| `-NoPush` | 同步+提交，但不推送 |
| `-SkipSync` | 跳过源码同步，只提交仓库现有改动 |

## 依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 22.19（建议 24.x） | DSH 运行环境 |
| pnpm | ≥ 9（建议 11.x） | `dsh plugin` 内部转发给 pnpm 安装；`#path:` 子目录语法需 pnpm ≥ 9 |
| DeepSeek Harness | 0.1.0-rc.6+ | `dsh` CLI / `dsh web` |

## License

MIT（每个插件包内均含 LICENSE）
