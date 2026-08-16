# dsh-skill-browser（技能浏览器插件）

DeepSeek Harness Web GUI 的客户端插件：在**侧边栏脚部**放一个独立的「技能」按钮开关，点击弹出浮层面板，展示当前会话可调用的全部已安装技能清单，每个技能一行（名称 + 描述 + 来源标记），支持关键字过滤，点「打开」把 `/技能名 ` 写入输入框，回车即可加载该技能。不占用对话区域，不遮挡视线。

## 功能

- **独立开关**：侧边栏脚部（设置齿轮上方）一个技能按钮，点击展开/收起面板；展开的侧边栏显示「图标 + 技能」文字，折叠栏显示图标（带提示）
- **一键更新**：面板标题栏「一键更新」按钮，点击自动提交更新指令（模型执行 `npx skills check/update` 并汇报）
- 列出当前会话可调用的所有技能（与输入框 `/` 菜单同源，走 `skill.list` RPC）
- **推荐标记**：面板按「推荐技能 → 其他」排序，推荐项带高亮「推荐」徽标（推荐清单见 `lib/client.js` 顶部 `RECOMMENDED` 数组，可自行增删）
- 仅用户可调用的技能显示「仅用户」标记
- 关键字过滤（按名称或描述）
- 一键「打开」：把 `/技能名 ` 写入输入框并关闭面板
- 支持 Esc / 关闭按钮收起；加载失败可重试

## 依赖

| 依赖 | 说明 |
|---|---|
| DeepSeek Harness（`dsh`，npm 全局包 `@deepseek-ai/dsh`） | Web GUI 运行时 |
| `pnpm` | `dsh plugin` 命令在 profile 目录内转发给 pnpm 安装插件 |
| Node.js | dsh 运行环境（本机为 `C:\node.exe`） |

插件本身**无 npm 运行时依赖**：浏览器端只使用平台模块表已提供的 `react`、`react/jsx-runtime`、`@deepseek-ai/dsh-client-ui-primitives` 以及 `dsh.client.inject` 声明加载的插件包。

## Windows 安装方式

```powershell
# 1. 安装到 web profile（自动并入 dsh.profile.bundles 层）
dsh plugin --profile web add C:\Users\180458\.agents\skills-tools\dsh-skill-browser

# 2. 预检组合树（不启动服务），确认出现 skill-browser 行
dsh web --dump-config

# 3. 重启 Web 应用（首次安装需要；后续改 lib/client.js 只需刷新页面）
dsh web
```

刷新 `http://127.0.0.1:3080` 后，侧边栏脚部（设置齿轮上方）出现「技能」按钮，点击弹出面板。

## 卸载方式

```powershell
dsh plugin --profile web remove dsh-skill-browser
```

## 文件结构

| 文件 | 作用 |
|---|---|
| `package.json` | `dsh.bundle.patch` 声明（并入 bundle 层）+ `dsh.client` 声明（浏览器模块表） |
| `cordis.patch.yml` | 组合树补丁：插入 `skill-browser` 行 |
| `lib/index.js` | 宿主半区（纯 UI 插件，空 apply） |
| `lib/client.js` | 浏览器半区：注册 `sidebar.footer.action` 按钮 + `shell.overlay` 技能面板 |

## 修改建议

| 想改什么 | 改哪里 |
|---|---|
| 推荐技能清单 | `lib/client.js` 顶部 `RECOMMENDED` 数组 |
| 面板位置/大小 | `lib/client.js` 中 `.skillBrowser_overlay` 的 `left/bottom/width` |
| 按钮位置 | 侧边栏脚部为 `sidebar.footer.action` 槽位（在设置齿轮上方） |
