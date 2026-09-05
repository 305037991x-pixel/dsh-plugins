# dsh-plugins

> 自研 DeepSeek Harness (DSH) 插件合集 · My custom DSH plugins, monorepo

本仓库收录 2 个自研 DSH Web 插件（`packages/<插件名>/`），通过 pnpm 的 git 子目录语法安装。

## 插件清单

| 插件 | 功能 | 安装命令 |
|------|------|----------|
| [dsh-account-balance](packages/dsh-account-balance) | 会话头部余额芯片：DeepSeek + OpenRouter 双账户（3 分钟自动刷新，悬停看两家明细） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-account-balance` |
| [dsh-opencode-go](packages/dsh-opencode-go) | 会话头部用量芯片：OpenCode GO 双账号 + CommandCode（滚动 5h/周/月 三窗口） | `dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-opencode-go` |

## 客户端依赖对齐（0.1.2-rc.1）

两个插件的 `@deepseek-ai/dsh-client-*` 依赖已与 DSH 客户端 `0.1.2-rc.1` 世代对齐：

| 依赖 | 声明版本 | 说明 |
|------|----------|------|
| `dsh-client-connection` / `dsh-client-locale` / `dsh-client-ui-conversation` / `dsh-credentials` / `dsh-launch-environment` | `0.1.2-rc.1` | 与桌面应用安装树内置版本一致 |
| `dsh-client-runtime` / `dsh-client-ui-primitives` / `dsh-client-ui-slots` | `0.1.0-rc.6` | 应用安装树已不再内置这三个包，由应用的 `.dsh-module-fallback` 机制按 `0.1.0-rc.6` 提供；npm 上 `dsh-client-runtime` 也没有 `0.1.2-rc.1`，故保持与 fallback 一致 |

> ⚠️ 不要把这三个包强行升版本：`dsh-client-runtime@0.1.2-rc.1` 不存在（安装会直接失败），而更高版本的 primitives/slots 可能与 fallback 提供的 runtime 模块表对不上（`missed the module table`）。详见 [PITFALLS.md](PITFALLS.md)。

## 快速安装

### 方式一：一键脚本

```powershell
# 1. 下载脚本
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/305037991x-pixel/dsh-plugins/main/install-all.ps1" -OutFile install-all.ps1

# 2. 运行（可加 -SkipConfirm 跳过逐个确认）
.\install-all.ps1
```

脚本会逐条执行上表的 2 条安装命令，结束后提示重启 `dsh web` 并硬刷新（Ctrl+Shift+R）。

### 方式二：逐条安装

```powershell
dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/<插件名>
```

> ⚠️ 需要 pnpm 在 PATH 上（`npm i -g pnpm`），且安装后必须**重启 `dsh web`** 才生效。
> 详见 [PITFALLS.md](PITFALLS.md)。

## 维护指南（本机改插件后发布）

### 日常更新流程（核心：源码改 → 一条命令发布）

1. 在**源码目录**改代码（本机 DSH 通过 `link:` 直接使用 dsh-account-balance 源码，**改完本机立即生效**，无需重启）；
2. 跑一键发布脚本，它会自动把源码目录同步进 `packages/`、清理本机痕迹、校验文件、扫描敏感信息、提交并推送：

```powershell
.\publish-all.ps1 -Message "fix: xxx"
```

> 源码目录映射见 `publish-all.ps1` 顶部 `$sources`：dsh-account-balance 源码在本机 `~\.agents\skills-tools\dsh-account-balance`；dsh-opencode-go 源码在另一台电脑（`C:\Users\180458\...`），在那台机器之外直接改 `packages/dsh-opencode-go/` 即可。
> README/LICENSE/.gitignore 以仓库维护版为准（同步时不覆盖）。

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
| DeepSeek Harness | 0.1.2-rc.1 | `dsh` CLI / `dsh web`；client 依赖与 0.1.2-rc.1 世代对齐 |

## License

MIT（每个插件包内均含 LICENSE）
