# dsh-task-notify

DSH Web 插件：**当前会话回复完成时弹出 Windows 系统通知**（浏览器 Notification API 的系统级 toast）。即使你把 DSH 页面切到后台、去忙别的窗口，回复完成也会弹通知提醒你回来。

## 功能

- **触发**：当前选中会话的一轮回复完成（agent 思考/执行结束、回复落定，即 running → idle 边沿）时弹出系统通知；出错回合同样通知（文案改为「回复出错」）。
- **通知内容**：标题 `DSH · 回复完成 · <会话标题>`；正文为回复摘要（最后一条回复文本，截断 ~120 字）或错误摘要。
- **防打扰**：默认仅在 **DSH 页面失焦**（切到其他窗口/应用）时通知，你正盯着界面时不弹。
- **同会话去重**：同一会话的通知共用 `tag`，不会堆积刷屏。

## 配置项（Web 设置 → 插件 → dsh-task-notify）

| 配置 | 默认 | 说明 |
|---|---|---|
| `enabled` | true | 总开关，关闭后不再弹出任何通知 |
| `onlyWhenUnfocused` | true | 仅当 DSH 页面未聚焦时通知（正盯着界面时静默） |
| `showBody` | true | 通知正文包含回复摘要（关闭则只显示「本轮回复已完成。」） |

## 首次使用（权限）

1. 安装并重启后，**首次点击页面任意处**，浏览器会询问「是否允许 http://127.0.0.1:3080 发送通知」→ 点击**允许**。
2. 若误点「禁止」或权限被忽略：在浏览器地址栏左侧的站点设置（🔒/ⓘ 图标）→ 通知 → 改为「允许」，然后刷新页面。
3. 插件只在权限为「允许」时弹通知；权限被拒时仅控制台有提示，不影响 DSH 其它功能。

## 验证方法

1. 允许通知权限后，在当前会话发一条消息；
2. 立即**切到其他窗口**（资源管理器/浏览器其它标签等，让 DSH 页面失焦）；
3. 回复完成时应弹出 Windows 系统通知（含回复摘要）；
4. 正盯着 DSH 页面时回复完成**不会**弹（默认 onlyWhenUnfocused）；
5. Web 设置里关闭 `enabled` 后不再弹；切回开启恢复。

## 依赖

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | ≥ 18 | DSH 运行环境自带 |
| @deepseek-ai/dsh（全局安装） | 0.1.0-rc.6 | 宿主，位于 `%APPDATA%\npm\node_modules\@deepseek-ai\dsh` |
| @deepseek-ai/dsh-client-runtime | 0.1.0-rc.6 | 客户端 `sessions` 服务（会话列表订阅、running 位、快照） |
| @deepseek-ai/dsh-client-locale | 0.1.0-rc.6 | 词典注册（zh/en 通知文案） |
| @deepseek-ai/dsh-settings + @deepseek-ai/schemastery | 0.1.0-rc.6 / ^3.18.1 | 设置命名空间（宿主侧） |
| 浏览器 Notification API | 原生 | 无需新增任何第三方库 |

## Windows 安装方式

```powershell
# 1. 进入插件目录
cd D:\Deepseek\dsh-task-notify

# 2. 安装到 DSH web profile（link 安装，自动 reconcile bundle 层）
dsh plugin --profile web add .

# 3. 重启 dsh web（必须，让插件加载；重启会中断当前会话、页面需刷新）
#    重启后按「首次使用（权限）」允许通知，再按「验证方法」测试

# 卸载（之后同样需重启一次 dsh web 生效）：
dsh plugin --profile web remove dsh-task-notify
```

## 工作原理（简要）

- **宿主半区** `lib/index.js`：注册设置命名空间 `dsh-task-notify` 与 `GET /dsh-task-notify/config` 路由，向浏览器下发 `{enabled, onlyWhenUnfocused, showBody}`。
- **浏览器半区** `lib/client.js`：订阅 `sessions.list`，维护每个会话最近一次 `running` 位；当**当前选中会话**发生 `running: true → false` 边沿（与 DSH 内置「完成绿点」同源算法）时，满足条件即 `new Notification(...)` 弹系统 toast。权限在首次用户手势时通过 `Notification.requestPermission()` 请求。

## 已知边界

- 需要 **DSH 页面保持打开**（后台/最小化均可，浏览器不能完全关闭）；如需「浏览器关闭也能弹」的宿主侧原生 toast，属后续可扩展项。
- 通知在「当前选中会话」回复完成时触发；若切到别的会话，原会话完成不通知（后续可扩展为全部会话）。
- `npm i -g` 升级 DSH 不影响本插件（插件 link 安装在 profile 目录）。
