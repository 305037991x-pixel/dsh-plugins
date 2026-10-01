# dsh-opencode-go

> OpenCode GO / CommandCode 套餐用量芯片 · Plan usage chip for DeepSeek Harness Web

会话头部常驻的**套餐用量芯片**：同时监控**一个 OpenCode GO 账号**与**一个 CommandCode 账号**的滚动(5h)/每周/每月三个额度窗口，3 分钟自动刷新，悬停分账号查看明细与滚动窗口剩余时间。

A persistent usage chip in the conversation header: watches one OpenCode GO account plus one CommandCode account across rolling(5h) / weekly / monthly quota windows, auto-refreshes every 3 minutes, and shows per-account breakdown with rolling-window countdown on hover.

## 功能 / Features

- 会话头部芯片，显示各账号的**周用量百分比**（≥90% 或受限=红、≥70%=橙、否则绿）
- 悬停气泡分账号展示：滚动(5h) / 周 / 月 用量 + **滚动窗口剩余时间**
- **3 分钟自动刷新** + 手动刷新按钮
- **切换会话不重复拉取**：用量数据与定时器为模块级共享缓存，组件重挂载直接读缓存
- 单个账号失败不影响其他账号（对应行显示「获取失败」）
- 密钥只存在于宿主侧，浏览器永不接触

## 兼容性 / Compatibility

| Harness 核心 | 状态 |
|---|---|
| 0.1.2-rc.1 | ✅ 发布基线 |
| 0.2.0-rc.1（`ui-primitives` 0.2.0-rc.2） | ✅ 实测通过（2026-10-01，v0.2.2）：`/dsh-opencode-go/usage` 路由正常；芯片挂载 / 自动刷新 / 悬停明细均正常。**注意 0.2.0 图标导出为破坏性变更**，见下方 |

> **0.2.0 图标导出破坏性变更（2026-10-01 踩坑）**：`@deepseek-ai/dsh-client-ui-primitives` 在 0.2.0-rc.2 把图标导出名从「图标名 + 尺寸」（`IconApiOutline14`）改为「图标名 + 字重」（`IconApiOutlineRegular` / `IconApiOutlineMedium`），尺寸改由 `size` prop 传入，旧名取到 `undefined`。`jsx(undefined, …)` 触发 React error #130，导致**整个 `conversation.session.header.utilities` 槽位条目崩溃、芯片完全不渲染**——不是只少一个图标。本插件 v0.2.2 起在 `lib/client.js` 顶部加了 `pickIcon(defaultSize, …names)` 兼容层：按「新 Regular → 新 Medium → 旧名」依次回退，全落空时返回内联 SVG 占位，**绝不返回 undefined**，因此同时兼容新旧两套图标名。宿主契约（`ctx.slots.inject` / `ctx.slots.register` / `ctx.locale.register` / `--dsw-alias-*` CSS 变量）在 0.2.0-rc.1 下均未变化。

## 安装 / Install

```bash
dsh plugin --profile web add github:305037991x-pixel/dsh-opencode-go
```

重启 `dsh web` 并硬刷新页面（Ctrl+Shift+R）。

## 配置 / Configuration

在 `$DSH_HOME/.credentials.yaml` 中配置（或环境变量同名）：

```yaml
# OpenCode GO 账号（必填；与 llm-pi-ai 的 opencode-go 路由同 key）
OPENCODEGO_API_KEY: sk-xxx
# CommandCode（可选，不配则不显示该行）
COMMANDCODE_API_KEY: cmd-zzz
```

OpenCode GO 的 Key 在 [opencode.ai/auth](https://opencode.ai/auth) 创建；CommandCode 的 Key 在其 Studio 创建（即 Provider API 使用的 `CMD_API_KEY`）。

## 工作原理 / How it works

| 端 | 文件 | 职责 |
|---|---|---|
| Host | `lib/index.js` | 注册 `GET /dsh-opencode-go/usage`：并行解析各账号的 key（凭证服务：环境变量 → `$DSH_HOME/.credentials.yaml` → `.env`），按账号类型调用对应官方接口，返回 `{ ok, accounts: [...] }` |
| Client | `lib/client.js` | 在 `conversation.session.header.utilities` 槽位注册芯片；模块级共享数据 + 3 分钟定时器；悬停气泡分账号渲染 |

上游接口：

| 账号类型 | 接口 | 窗口来源 |
|---|---|---|
| OpenCode GO | `https://opencode.ai/zen/go/v1/usage` | 官方直接返回 rolling(5h)/weekly/monthly 三窗口（`percent`/`status`/`resetsAt`） |
| CommandCode | `https://api.commandcode.ai/alpha/billing/credits` + `/alpha/usage/summary`（可选 `/alpha/whoami?limits=1` 取 orgId） | 与 command-code CLI `/usage` 命令同源的 `/alpha` 系列端点；5h/周窗口由 `windowLimits.fiveHour/weekly` 的 `used/cap` 换算百分比，月窗口 = `totalMonthlyCredits` /（已用 + 剩余 `monthlyCredits`） |

> 注：CommandCode 的 `/alpha` 端点未在官方文档登记（文档只列 `/provider/v1/*`），但为官方 CLI 自身使用的接口；若官方日后提供正式用量 API，建议迁移。

## License

MIT
