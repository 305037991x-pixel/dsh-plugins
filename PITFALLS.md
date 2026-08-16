# PITFALLS — DSH 插件安装/开发/发布踩坑记录

> 本文件收录本人在 DeepSeek Harness (DSH) 插件安装、开发、发布过程中踩过的所有坑，含现象、根因与解法。安装插件前先读一遍，能省大量排查时间。

## 一、安装类

### 1. 发布年龄门禁会静默降级插件版本（最大的坑）

- **现象**：`dsh plugin add pkg@latest` 装完发现是旧版本，输出里只有一句不起眼的 `+ pkg ^旧版本`。
- **根因**：profile 的 `pnpm-workspace.yaml` 启用了 supply-chain policies（`minimumReleaseAge`，太新的包不给装），pnpm 静默回退到老版本。
- **解法**：显式指定版本号安装 `dsh plugin add pkg@具体版本`，pnpm 会自动把该包写入 `minimumReleaseAgeExclude` 白名单。成功标志是多一行 `Added 1 entry to minimumReleaseAgeExclude`。

### 2. `dsh plugin` 要求 pnpm 在 PATH 上

- **现象**：报 `dsh: pnpm not found on PATH`。
- **解法**：`npm i -g pnpm`（本文档基于 pnpm 11.x 实测）。

### 3. 别信 `pnpm add` 输出的版本号

- **现象**：输出 `+ pkg ^3.9.1` 但实际装的可能不是这个版本。
- **解法**：以 `node_modules/<pkg>/package.json` 里的实际 `version` 为准（三连查：version / bundles 挂载 / 关键文件存在）。

### 4. 插件依赖解析失败会崩 DSH 启动

- **现象**：`ERR_MODULE_NOT_FOUND`，DSH 启动即崩溃。
- **根因**：插件 import 了未声明的依赖（或版本对不上）。
- **解法**：装完先验证依赖可解析再重启；插件的 dependencies 必须声明它 import 的一切（见开发类 #6）。

### 5. Git 子目录安装语法（monorepo 安装）

- 单仓库装子包：`dsh plugin --profile web add github:<user>/<repo>#path:packages/<插件名>`。
- 需要 pnpm ≥ 9；`#path:` 指向的目录内必须有独立 `package.json`（DSH 插件天然满足）。
- 本仓库全部插件均按此语法安装，见 README。

## 二、开发类

### 6. DSH 插件 package.json 必须显式声明 `@deepseek-ai/schemastery`

- **现象**：插件 schema（`z.*`）导入/校验失败。
- **根因**：多次新建/修改插件时忘记加这个依赖（platform 不自动注入）。
- **解法**：每个 DSH 插件 package.json 的 dependencies 必须显式包含 `@deepseek-ai/schemastery`。

### 7. host 端改动必须重启 `dsh web`，客户端改动刷新即生效

- host 端（`lib/index.js` 服务端逻辑）改动：必须重启 `dsh web`。
- 客户端插件（client bundle）：编译产物带 rev 内容哈希，**刷新页面即生效**；`dsh-client-hmr`（500ms 轮询 + SSE）只对 client bundle 热更新。
- 主机端补丁（如 repatch 官方包）必须重启。

### 8. `settings.yaml` 会被 DSH 热加载规范化重写

- **现象**：编辑 `~/.dsh/settings.yaml` 时 edit 锚点失效/内容被覆盖。
- **根因**：DSH 热加载时把文件规范化重写（flow 风格、模型条目合并单行）。
- **解法**：编辑前必须重新读取最新内容；`llm-pi-ai.providers` 是 block map + flow 值，路由条目之间不能加逗号（`}` 后直接换行），flow map 内条目之间才用逗号。

### 9. dsh 进程环境快照不含「用户级」环境变量

- **现象**：`setx DASHSCOPE_API_KEY xxx` 后插件里 `process.env.DASHSCOPE_API_KEY` 读不到。
- **根因**：dsh 启动时环境快照已定格，后续 setx 的 User 级变量不会进快照。
- **解法**：key 写进 `~/.dsh/.credentials.yaml`（凭证服务：环境变量 → credentials.yaml → .env），或插件显式读注册表 `[Environment]::GetEnvironmentVariable('NAME','User')`（dsh-vision-bridge 就是这么做的）。

### 10. schemastery 无 `z.record` / `z.unknown`

- 任意嵌套对象用 `z.dict(z.dict(z.dict(z.any())))`。

### 11. PowerShell 内联 `node -e` 转义失真

- **现象**：`node -e` 里 `\$` 被转义成字面 `$`，正则等测试结果失真。
- **解法**：改用临时 `.mjs` 文件验证。

## 三、发布类

### 12. GitHub 推送被 GH007 拒绝（邮箱隐私保护）

- **现象**：`push` 报 `GH007: Your push would publish a private email address`。
- **根因**：git 提交用的真实邮箱未在 GitHub 公开。
- **解法**：改用匿名邮箱 `<用户名>@users.noreply.github.com`，`git config user.email` + `git commit --amend --reset-author` 后重推。

### 13. gh CLI 装不上（MSI 1603 无权限）

- **解法**：用 zip 免安装版，路径 `%LOCALAPPDATA%\Programs\GitHubCLI\bin\gh.exe`。

### 14. 发布前必须清理本机专属文件

- 插件目录里常有 `restart-web.ps1`、`verify*.log`、`web.stdout.log`、`web.stderr.log`、`tmp-*.mjs`、`verify-*.mjs`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` 等本机开发痕迹，**不要提交**（`.gitignore` 已排除，见仓库根 .gitignore）。
- 发布前扫描硬编码密钥：`sk-`、`api_key=`、`token=` 模式（本仓库已全部扫描干净）。

## 四、DSH 使用相关（与本仓库插件强相关）

### 15. 官方直连 vs 订阅：两个口子会偷偷扣 DeepSeek 官方 API 的钱

- ① 模型选择器「DeepSeek-V4-Flash」无后缀 = 官方按量（订阅的带「2x 额度」后缀）；② Web 搜索插件无条件直连 `api.deepseek.com/anthropic/v1`，与所选模型无关。
- **解法**：settings.yaml 加 `web-search-deepseek: {apiKeyEnv: OPENCODE_GO_API_KEY, baseURL: https://opencode.ai/zen/go/v1}` 让搜索走订阅（实测 cost=0）；cordis.patch.yml 禁用 `llm-deepseek` 让官方路由消失。

### 16. 远程访问 DSH 设置页 403（安全设计）

- 通过 Tailscale/局域网 IP 访问时，设置页报 `settings.describe: HTTP 403`——`settings.*`/`credentials.*` 是特权方法，DSH 硬编码只允许 loopback。
- 设置/模型配置只在 `127.0.0.1:3080` 本机改；远程只能对话。无配置开关。

### 17. "2x usage" 是限额翻倍，不是消耗翻倍

- OpenCode GO 首页横幅 "DeepSeek V4 Flash gets 2× usage limits" = 该模型**用量上限翻倍**（限额分母×2，与消耗×0.5 数学等价），更便宜。官方出处：opencode.ai/docs/go 计价表。

---

维护说明：本文件与仓库代码同版本演进，新增踩坑直接在此追加并注明日期。
