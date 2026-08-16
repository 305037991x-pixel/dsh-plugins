# dsh-opencode-go-pricing

> DSH（DeepSeek Harness）插件：自动同步 OpenCode GO 模型的官方「2x 计费」标注。

OpenCode GO 套餐中部分模型（如 **DeepSeek V4 Flash**）在限时政策下按 **2 倍额度**消耗（官方标注 "2x usage"）。该标注会随官方政策变化而变动，而 DSH 内置的 pi-ai 模型目录是静态的，不会跟着变。本插件定期拉取**官方定价页**（[opencode.ai/go](https://opencode.ai/go)），把变化自动同步到 `llm-pi-ai.providers.opencode-go.models[].name`，让 DSH 模型选择器始终显示当前的计费标注。

## 工作原理

1. 插件（host 端）每隔 `intervalMs`（默认 1 小时）拉取一次 `https://opencode.ai/go`（SSR 页面，解析其中 `data-model` / `data-bonus` 结构）。
2. 判定模型是否带 "2x usage" 标注（当前官方标 2x：DeepSeek V4 Flash、GPT 5.6 Luna）。
3. 对比当前 `~/.dsh/settings.yaml` 中 `llm-pi-ai.providers.opencode-go.models` 各条目的 `name`：
   - 官方标 2x 且当前名没有标注 → 追加 `（2x 计费）`
   - 官方不再标 2x → 移除 `（2x 计费）` 以及 pi-ai 目录遗留的英文 `(2x usage)` 后缀（如 Kimi K3 的过时标注会被自动清除）
4. 有变化时通过 DSH settings 通道写回（`settings.mutate`）。该写入会触发 `llm-pi-ai` 的热更新（`scope.watch → onChange → 模型目录重建`），**无需重启 dsh web**（仅首次安装插件需要重启一次）。

插件**只修改**用户已配置的模型条目里的 `name` 字段；不增删模型、不改动其他配置、不接触内置目录。官方标注再次变化时（如限时政策结束），插件会在下一次轮询自动去掉标注。

> **数据源说明**：默认抓官方定价页 `opencode.ai/go`（中国大陆网络直连可达）。可切换为 `models.dev` 注册表（`source: models.dev`、`dataUrl: https://models.dev/api.json`），但注意 Node 的 `fetch` 不读系统代理，若你的网络无法直连 models.dev 会同步失败。

## 依赖

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 18 | DSH 运行环境自带 |
| @deepseek-ai/schemastery | ^3.18.1 | settings schema（安装时由 pnpm 自动解析） |
| 网络 | — | 需能访问 `https://opencode.ai/go` |

## Windows 安装方式

```powershell
# 1. 进入插件目录（本项目根目录）
cd D:\Deepseek\dsh-opencode-go-pricing

# 2. 安装到 DSH web profile（本地路径安装，会自动 reconcile bundle 层）
dsh plugin --profile web add .

# 3. 重启 dsh web（必须，让插件加载；重启会中断当前会话，请先征得确认）
#    —— 之后插件每 1 小时自动同步一次，无需再重启
```

代码修改后（`lib/index.js`）需要**再次重启 dsh web** 才会加载新逻辑。

## 配置项

Web 设置 → 插件 → 插件配置（`dsh-opencode-go-pricing`），或直接写在 `~/.dsh/settings.yaml`：

```yaml
dsh-opencode-go-pricing:
  enabled: true          # 总开关
  provider: opencode-go  # 要标注的 llm-pi-ai 提供方路由
  source: go-page        # 数据源：go-page（官方定价页，默认）或 models.dev
  dataUrl: https://opencode.ai/go  # 数据源 URL
  intervalMs: 3600000    # 轮询间隔（毫秒），默认 1 小时
  label: （2x 计费）      # 追加到 2x 模型显示名的后缀
```

## 验证

- 首次同步在插件加载后约 10 秒执行；也可运行 `node D:\Deepseek\dsh-opencode-go-pricing\verify-parser.mjs` 离线验证解析与判定逻辑。
- DSH 日志（`dsh web` 控制台）出现 `dsh-opencode-go-pricing: synced ...` 表示同步成功；`sync failed` 表示网络失败，下个周期自动重试。
- 打开会话的模型选择器，2x 模型的显示名应带「（2x 计费）」后缀。
- 注意：首次同步会把 `settings.yaml` 中 `llm-pi-ai` 部分按 DSH 序列化格式重写（flow 风格 `{...}` 会变成普通 YAML 块），语义不变。
