# dsh-vision-bridge

> DSH（DeepSeek Harness）Host 插件：把用户消息里的图片在进入模型前自动转成文字描述 · Image-to-text bridge for pure-text models

用户发图片给 DSH 时，纯文本模型（如 deepseek-v4-flash）会报 `model does not support image input`。本插件在图片进入模型**之前**拦截：读取图片字节 → 调用视觉模型 API（默认通义千问 qwen-vl-max）识图 → 把 image block 替换为文字描述 block。图片走视觉模型，文字走主模型，两者分离。

## 功能 / Features

- 全局 `agent/pre-step` 监听，用户消息中的图片自动识图转文字，主模型永远收不到图片字节
- 识别失败**不中断会话**：降级为说明文字并记日志
- 默认识图提示词为要点式描述（单张图约 100-150 tokens），控制上下文占用
- 显式读取 Windows **用户级**环境变量（DSH 进程环境快照不含 setx 新设的 User 变量，见 PITFALLS.md）

## 安装 / Install

```bash
dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/dsh-vision-bridge
```

重启 `dsh web` 并硬刷新页面（Ctrl+Shift+R）。

## 配置 / Configuration

环境变量（用户级 `setx` 或进程级均可，插件两者都会读）：

```
DASHSCOPE_API_KEY   # 必填：通义千问 DashScope API key（https://dashscope.console.aliyun.com/）
DASHSCOPE_BASE_URL  # 可选：OpenAI 兼容端点，默认 https://dashscope.aliyuncs.com/compatible-mode/v1
VISION_MODEL        # 可选：视觉模型，默认 qwen-vl-max
```

## 工作原理 / How it works

| 端 | 文件 | 职责 |
|---|---|---|
| Host | `lib/index.js` | `agent/pre-step` 全局监听：`ctx.attachments.readImage()` 读 durable attachment 图片 → `recognizeImage()` 调 OpenAI 兼容 `/chat/completions`（base64 data URL）→ image block 替换为 `[用户发送了一张图片，图片内容（视觉模型识别）：…]` |

## License

MIT
