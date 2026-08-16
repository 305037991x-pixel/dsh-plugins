// @ts-check
/**
 * dsh-task-notify — host half.
 *
 * 当前会话回复完成时弹出 Windows 系统通知（浏览器半区负责检测与弹出）。
 * 本文件是宿主侧半区：
 *  1. 设置命名空间 `dsh-task-notify`（Web 设置 → 插件可配）；
 *  2. 注册 `GET /dsh-task-notify/config` 路由供浏览器半区拉取配置
 *     （{enabled, onlyWhenUnfocused, showBody}，cache-control: no-store）。
 */

import z from "@deepseek-ai/schemastery";

/** Stable Cordis plugin name. */
export const name = "dsh-task-notify";

/** Required services: the web server (route) and the user-settings seam. */
export const inject = ["webServer", "settings"];

/** Settings namespace owned by this plugin. */
export const namespace = "dsh-task-notify";

/** Settings schema for this plugin's namespace. */
export const Config = z.object({
	/** 总开关：关闭后不再弹出任何通知。 */
	enabled: z.boolean().default(true),
	/** 仅当 DSH 页面失焦（切到其他窗口）时通知；正盯着界面时静默。 */
	onlyWhenUnfocused: z.boolean().default(true),
	/** 通知正文包含回复摘要（最后一条 assistant 文本，截断 ~120 字）。 */
	showBody: z.boolean().default(true)
});

/**
 * 注册配置路由。返回 200 + {enabled, onlyWhenUnfocused, showBody}。
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context。
 * @param {Record<string, unknown>} rawConfig - loader entry config（成为 settings base 层）。
 */
export function apply(ctx, rawConfig = {}) {
	ctx.settings.register(namespace, Config, { base: rawConfig });

	const readConfig = () => ctx.settings.get(namespace) ?? {};

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/dsh-task-notify/config",
		handler: async (req, res) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			const cfg = readConfig();
			res.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
			res.end(JSON.stringify({
				enabled: cfg.enabled !== false,
				onlyWhenUnfocused: cfg.onlyWhenUnfocused !== false,
				showBody: cfg.showBody !== false
			}));
		}
	}), "dsh-task-notify: config route");
}
