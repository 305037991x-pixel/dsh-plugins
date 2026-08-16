# dsh-conversation-cost

> DSH（DeepSeek Harness）Web 插件：在对话底部（内置统计条下方）实时显示**本轮**与**总会话**消耗的额度/费用。

## 功能

- 在对话下方新增一行（内置统计条之下），随对话实时刷新：
  - **OpenCode GO 套餐**（provider `opencode-go`）：估算美元额度 + 占官方限额百分比
    `本轮 ≈ $0.0123（5h 额度 0.10%）· 总会话 ≈ $0.123（月额度 0.21%）· DeepSeek V4 Flash（2x 用量）`
  - **DeepSeek API**（provider `deepseek`）：人民币费用（官方 ¥/百万 tokens 峰谷价，默认空闲价）
    `本轮费用 ¥0.042 · 总会话 ¥0.085 · deepseek-v4-flash`
  - 其他 provider：美元额度（可配置人民币换算）
- 悬停显示明细：四桶 token × 单价、限额、2x 标注、估算说明。
- 无 token 时不显示；模型无价格数据时显示 token 数 +「价格未知」。

## 计价口径（官方，见 [opencode.ai/docs/go](https://opencode.ai/docs/go/)）

- GO 额度按**美元计价**：消耗($) = 输入×输入价 + 缓存读×缓存读价 + 缓存写×缓存写价 + 输出×输出价（每百万 tokens）。
- 官方限额：$12/5小时、$30/周、$60/月（"limits are defined in dollar value"）；**每模型月限额不同**（官方表 Usage 列：$60 或 $15，如 DeepSeek V4 Pro、Grok 4.5、Kimi K3 为 $15）。
- **"2x usage"**（官方首页横幅 "DeepSeek V4 Flash gets 2× usage limits"，限时促销）= 该模型**用量上限翻倍**，同一配额可用 2 倍 token，更便宜 → 限额分母 ×2（与「按半价计入」数学等价）。
- 单价表每小时从官方页刷新；网络不可达时自动回退内置默认表（官方现行表快照）；可手动覆盖。
- 本轮 = 最近一轮（最后一次用户消息 → 助手回复）的 token 用量（客户端节点求和）；总会话 = 全日志 token 用量投影（provider 实际上报）。
- 显示为估算值（「≈」）：OpenCode 账户真实用量无公开查询 API。
- DeepSeek API 人民币价（[官方定价页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，2026-08-17 生效）：默认空闲价，可切高峰价（北京 9:00–12:00、14:00–18:00 为高峰，价格 ×2）。

## 配置项

Web 设置 → 插件 → 插件配置（`dsh-conversation-cost`），或直接写在 `~/.dsh/settings.yaml`：

```yaml
dsh-conversation-cost:
  enabled: true            # 总开关
  dataUrl: https://opencode.ai/docs/go/   # 官方 GO 计价表（每百万 token 单价）
  badgeUrl: https://opencode.ai/go        # 官方 GO 首页（"2x usage" 标注）
  refreshMs: 3600000       # 单价刷新间隔（毫秒），默认 1 小时
  rateUsdCny: 7.2          # 美元→人民币汇率（仅其他 provider 换算用）
  apply2x: true            # "2x usage" 模型限额分母翻倍（用量上限翻倍、更便宜）
  deepseekPeak: false      # DeepSeek API 计价时段：false=空闲价（默认），true=高峰价
  overrides: {}            # 手动覆盖单价（按 provider/model）
                           # {"opencode-go": {"deepseek-v4-flash": {input: 0.14, output: 0.28, cacheRead: 0.0028, cacheWrite: 0, is2x: true}},
                           #  "deepseek": {"deepseek-v4-flash": {hit: 0.05, miss: 1.5, output: 4.5}}}
```

## 依赖

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 18 | DSH 运行环境自带 |
| @deepseek-ai/dsh-client-connection | 0.1.0-rc.6 | 客户端 RPC（session.models） |
| @deepseek-ai/dsh-client-locale | 0.1.0-rc.6 | 词典注册 |
| @deepseek-ai/dsh-client-runtime | 0.1.0-rc.6 | 客户端运行时 |
| @deepseek-ai/dsh-client-ui-slots | 0.1.0-rc.6 | 插槽系统 |
| @deepseek-ai/dsh-client-ui-conversation | 0.1.0-rc.6 | 会话 UI 插槽协议 |
| @deepseek-ai/dsh-client-ui-primitives | 0.1.0-rc.6 | UI 基础组件（Tooltip 等） |
| @deepseek-ai/schemastery | ^3.18.1 | 设置 schema（安装时由 pnpm 自动解析） |
| 网络 | — | 官方计价页 opencode.ai（不可达时自动回退内置默认表） |

## Windows 安装方式

```powershell
# 1. 进入插件目录（本项目根目录）
cd D:\Deepseek\dsh-conversation-cost

# 2. 安装到 DSH web profile（本地路径安装，会自动 reconcile bundle 层）
dsh plugin --profile web add .

# 3. 重启 dsh web（必须，让插件加载；重启会中断当前会话，请先征得确认）
```

代码修改后（`lib/index.js` / `lib/client.js`）需要**再次重启 dsh web** 才会加载新逻辑。

## 验证

- 打开一个已产生对话的会话，内置统计条下方应出现费用/额度行（无 token 时不显示）。
- 发一条消息，观察「本轮」随本轮 step 完成逐步更新、「总会话」随投影实时更新。
- 切换模型（GO/DeepSeek API），观察计价与显示单位自动切换、2x 标注与月限额随模型变化。
- 打开插件设置页，可调整 apply2x、峰谷价、单价覆盖等。

## 卸载

```powershell
dsh plugin --profile web remove dsh-conversation-cost
# 然后重启 dsh web
```
