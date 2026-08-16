// dsh-vision-bridge — host half.
//
// 用户消息中的图片在进入模型之前被拦截：读取 durable attachment 的图片字节，
// 调用视觉模型 API（默认通义千问 qwen-vl-max，与 claude-vision-skill 同一套
// 环境变量），把图片 block 替换为文字描述 block。
//
// 这样当前纯文本模型（deepseek-v4-flash）永远不会收到图片字节，彻底解决
// "model does not support image input" 报错；图片内容通过视觉模型转为文字后
// 由主模型继续处理。图片与文字分离，图片走视觉，文字走主模型。
import { execFileSync } from "node:child_process";

/** Stable Cordis plugin name. */
const name = "dsh-vision-bridge";
/** Service required before image reads can be claimed. */
const inject = ["attachments"];

/** 读取 Windows 用户级环境变量（DSH 进程环境快照不含新设置的 User 级变量，必须显式读注册表）。 */
function userEnv(varName) {
	try {
		const out = execFileSync("powershell", [
			"-NoProfile",
			"-Command",
			`[Environment]::GetEnvironmentVariable('${varName}','User')`
		], { encoding: "utf8", windowsHide: true, timeout: 5000 });
		const value = out.trim();
		return value.length > 0 ? value : void 0;
	} catch {
		return void 0;
	}
}

/**
 * 调用 OpenAI 兼容的视觉模型 API 识别图片。
 * @param data - 原始图片字节。
 * @param mediaType - MIME 类型（image/png 等）。
 * @param prompt - 识图提示词。
 * @param signal - 可选中止信号。
 * @returns 视觉模型的文字描述。
 */
async function recognizeImage(data, mediaType, prompt, signal) {
	const key = userEnv("DASHSCOPE_API_KEY") || process.env.DASHSCOPE_API_KEY;
	const base = userEnv("DASHSCOPE_BASE_URL") || process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
	const model = userEnv("VISION_MODEL") || process.env.VISION_MODEL || "qwen-vl-max";
	if (!key) throw new Error("DASHSCOPE_API_KEY 未配置（视觉识图需要通义千问 API key）");

	const b64 = Buffer.from(data).toString("base64");
	const mime = mediaType || "image/png";
	const response = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${key}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			model,
			messages: [{
				role: "user",
				content: [
					{ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
					{ type: "text", text: prompt }
				]
			}],
			temperature: 0,
			max_tokens: 300
		}),
		signal: signal ?? AbortSignal.timeout(60000)
	});
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`视觉 API HTTP ${response.status}: ${body.slice(0, 300)}`);
	}
	const json = await response.json();
	const content = json?.choices?.[0]?.message?.content;
	if (typeof content !== "string" || content.length === 0) throw new Error("视觉 API 返回空内容");
	return content;
}

/** 默认识图提示词：精简要点式描述，控制上下文占用（单张图约 100-150 tokens）。 */
const DEFAULT_PROMPT = "用中文简要描述这张图片：1) 这是什么（场景/界面/物体）；2) 3-5 个关键信息点（文字、选项、状态、数据等）；3) 若有明确问题则直接回答。120 字以内，要点式列出，不要展开分析。";

/**
 * 把一条消息里的 image block 替换为识图文字 block。
 * 识别失败时降级为说明文字，绝不抛错中断会话。
 * @param ctx - plugin context carrying the attachments service.
 * @param message - 用户消息（不可变，返回新对象）。
 * @param signal - 可选中止信号。
 */
async function convertMessage(ctx, message, signal) {
	if (!message || !Array.isArray(message.content)) return message;
	if (!message.content.some((block) => block.type === "image")) return message;
	const blocks = [];
	for (const block of message.content) {
		if (block.type !== "image") {
			blocks.push(block);
			continue;
		}
		try {
			const stored = await ctx.attachments.readImage(block.attachment, signal);
			const text = await recognizeImage(stored.data, stored.ref.mediaType, DEFAULT_PROMPT, signal);
			blocks.push({ type: "text", text: `[用户发送了一张图片，图片内容（视觉模型识别）：${text}]` });
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			ctx.logger.warn(`dsh-vision-bridge: 图片识别失败: ${detail}`);
			blocks.push({ type: "text", text: `[用户发送了一张图片，但视觉识别失败：${detail}]` });
		}
	}
	return { ...message, content: blocks };
}

/**
 * 注册 agent/pre-step 全局监听：消息被 append 到会话/发给模型之前，
 * 把图片 block 转成识图文字。
 */
function apply(ctx) {
	ctx.on("agent/pre-step", async (payload, next) => {
		const decision = await next();
		if (decision && decision.kind === "enter" && Array.isArray(decision.messages)) {
			try {
				const messages = await Promise.all(decision.messages.map((message) => convertMessage(ctx, message, payload.signal)));
				return { ...decision, messages };
			} catch (error) {
				ctx.logger.warn(`dsh-vision-bridge: 消息转换失败: ${error instanceof Error ? error.message : String(error)}`);
				return decision;
			}
		}
		return decision;
	}, { global: true });
}

export { DEFAULT_PROMPT, apply, convertMessage, inject, name, recognizeImage, userEnv };
