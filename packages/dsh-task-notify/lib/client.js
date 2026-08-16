// dsh-task-notify — browser half.
//
// 当前会话回复完成 → Windows 系统通知（浏览器 Notification API 系统 toast）。
//
// 检测：订阅 sessions.list（SessionListState：byId[].running + current），
// 维护 prevRunning Map；「当前选中会话」running true→false 边沿 = 一轮回复完成
// （与内置「完成绿点」同源算法；首帧只记录不通知，避免加载即弹）。
//
// 弹出条件：设置 enabled 且 Notification.permission === "granted"；
// onlyWhenUnfocused 开时还需 !document.hasFocus()（切到其他窗口才弹）。
// 正文 = 最后一条 assistant 节点文本摘要（blocks[].kind === 'text'）；
// 若最后节点为 turn-error，标题改为「回复出错」、正文为错误摘要。
//
// 权限：加载时若 permission === "default"，挂一次性 pointerdown/keydown 监听，
// 用户首次点击页面任意处时 requestPermission()（保证用户手势，Edge/Chrome 要求）。
// 配置：加载时 fetch /dsh-task-notify/config，window focus / visibilitychange 时刷新。
window.__ModuleLoader__.load({
	id: "dsh-task-notify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region locales
		const NS = "dshTaskNotify";
		const zh = {
			"notify.title.done": "DSH · 回复完成",
			"notify.title.error": "DSH · 回复出错",
			"notify.body.plain": "本轮回复已完成。",
			"notify.body.error": "本轮回复出错：{summary}",
			"notify.permission.denied": "通知权限被拒绝：请在浏览器站点设置中允许 http://127.0.0.1:3080 的通知权限后刷新页面"
		};
		const en = {
			"notify.title.done": "DSH · reply finished",
			"notify.title.error": "DSH · reply failed",
			"notify.body.plain": "This reply has finished.",
			"notify.body.error": "This reply failed: {summary}",
			"notify.permission.denied": "Notification permission denied: allow notifications for http://127.0.0.1:3080 in browser site settings, then reload"
		};
		//#endregion

		//#region helpers
		/** 折叠空白 + 截断为通知正文摘要。 */
		function summarize(text, max = 120) {
			if (text === null || typeof text !== "string") return "";
			const flat = text.replace(/\s+/g, " ").trim();
			if (flat.length <= max) return flat;
			return flat.slice(0, max) + "…";
		}

		/**
		 * 从已加载窗口节点取「最后一条 assistant 文本」或错误信息。
		 * @param {unknown} nodes - ConversationSnapshot 的 nodes（chat.legacy.nodes 或顶层 nodes）。
		 * @returns {{kind: 'done'|'error'|'none', text: string}}
		 */
		function tailOf(nodes) {
			if (!Array.isArray(nodes) || nodes.length === 0) return { kind: "none", text: "" };
			for (let i = nodes.length - 1; i >= 0; i--) {
				const node = nodes[i];
				if (node === null || typeof node !== "object") continue;
				if (node.kind === "assistant" && Array.isArray(node.blocks)) {
					const text = node.blocks
						.filter((b) => b !== null && typeof b === "object" && b.kind === "text" && typeof b.text === "string")
						.map((b) => b.text)
						.join("")
						.trim();
					if (text !== "") return { kind: "done", text };
				}
				if (node.kind === "turn-error") {
					const msg = typeof node.message === "string" ? node.message : "";
					return { kind: "error", text: msg };
				}
			}
			return { kind: "none", text: "" };
		}
		//#endregion

		//#region config store（模块级：配置缓存 + 拉取，focus/visibilitychange 时刷新）
		const CONFIG_URL = "/dsh-task-notify/config";
		const shared = {
			config: { enabled: true, onlyWhenUnfocused: true, showBody: true },
			fetching: null,
			refresh() {
				if (this.fetching !== null) return this.fetching;
				this.fetching = (async () => {
					try {
						const response = await fetch(CONFIG_URL, {
							headers: { accept: "application/json" },
							cache: "no-store"
						});
						const payload = await response.json().catch(() => null);
						if (response.ok && payload !== null && typeof payload === "object") {
							this.config = {
								enabled: payload.enabled !== false,
								onlyWhenUnfocused: payload.onlyWhenUnfocused !== false,
								showBody: payload.showBody !== false
							};
						}
					} catch (error) {
						console.error("[dsh-task-notify] config fetch failed:", error);
					} finally {
						this.fetching = null;
					}
				})();
				return this.fetching;
			}
		};
		//#endregion

		//#region notification
		/**
		 * 确保通知权限：default → 等首次用户手势再请求；denied → 控制台提示。
		 * @param {(key: string, params?: object) => string} t - translate。
		 * @returns {boolean} 当前是否已授权。
		 */
		function ensurePermission(t) {
			if (typeof Notification === "undefined") return false;
			if (Notification.permission === "granted") return true;
			if (Notification.permission === "denied") {
				console.warn("[dsh-task-notify] " + t("notify.permission.denied"));
				return false;
			}
			// default：一次性监听首次用户手势（点击/按键），手势内请求权限
			const request = () => {
				document.removeEventListener("pointerdown", request);
				document.removeEventListener("keydown", request);
				void Notification.requestPermission();
			};
			document.addEventListener("pointerdown", request, { once: true });
			document.addEventListener("keydown", request, { once: true });
			return false;
		}

		/** 弹出一条系统通知（同会话 tag 去重，避免堆积）。 */
		function notify(title, body, tag) {
			try {
				if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
				new Notification(title, { body, tag: tag ?? "dsh-task-notify" });
			} catch (error) {
				console.error("[dsh-task-notify] notify failed:", error);
			}
		}
		//#endregion

		//#region plugin body
		/** Required services: session list feed + locale dictionaries. */
		const inject = ["sessions", "locale"];
		/**
		 * Client plugin body: 订阅会话列表，检测当前会话回复完成边沿并弹通知。
		 * @param ctx - client root context。
		 */
		function apply(ctx) {
			console.log("[dsh-task-notify] apply called");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-task-notify: dictionaries");

			ctx.inject(["sessions", "locale"], (scope) => {
				console.log("[dsh-task-notify] sessions inject resolved");
				const t = scope.locale.bind(NS);

				// 权限：default → 首次手势请求；denied → 提示
				ensurePermission(t);

				// 配置：加载拉取一次，窗口 focus / visibilitychange 时刷新
				void shared.refresh();
				const refreshConfig = () => void shared.refresh();
				window.addEventListener("focus", refreshConfig);
				document.addEventListener("visibilitychange", refreshConfig);

				// 回合完成检测：当前选中会话 running true→false 边沿
				const prevRunning = new Map();
				let lastNotifyAt = 0;
				const MIN_INTERVAL_MS = 2000; // 防抖：相邻两次通知至少间隔 2s

				const onListChange = () => {
					const snap = scope.sessions.list.getSnapshot();
					if (snap === null || typeof snap !== "object") return;
					const current = snap.current;
					if (current === void 0 || current === null) return;
					const entry = snap.byId !== null && typeof snap.byId === "object" ? snap.byId[current] : void 0;
					const running = entry !== void 0 && entry !== null && entry.running === true;

					// 首帧只记录，不通知（避免加载即弹）
					if (!prevRunning.has(current)) {
						prevRunning.set(current, running);
						return;
					}
					const wasRunning = prevRunning.get(current);
					prevRunning.set(current, running);
					if (!wasRunning || running) return; // 只处理 true→false 边沿

					const now = Date.now();
					if (now - lastNotifyAt < MIN_INTERVAL_MS) return;
					const cfg = shared.config;
					if (cfg.enabled !== true) return;
					if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
					if (cfg.onlyWhenUnfocused === true && document.hasFocus()) return; // 正盯着界面时不打扰

					// 取回复摘要（最后一条 assistant 文本 / turn-error 信息）
					let kind = "none";
					let text = "";
					try {
						const binding = scope.sessions.binding(current);
						const session = binding !== void 0 && binding !== null ? binding.session : void 0;
						const snapshot = session !== void 0 && typeof session.getSnapshot === "function" ? session.getSnapshot() : void 0;
						const nodes = snapshot !== void 0 && snapshot !== null ? (snapshot.chat?.legacy?.nodes ?? snapshot.nodes) : void 0;
						const tail = tailOf(nodes);
						kind = tail.kind;
						text = tail.text;
					} catch (error) {
						console.error("[dsh-task-notify] snapshot read failed:", error);
					}

					const displayTitle = entry !== void 0 && entry !== null && typeof entry.displayTitle === "string" && entry.displayTitle !== ""
						? entry.displayTitle
						: null;
					const title = (kind === "error" ? t("notify.title.error") : t("notify.title.done")) +
						(displayTitle === null ? "" : ` · ${displayTitle}`);
					let body;
					if (kind === "error") {
						body = t("notify.body.error", { summary: summarize(text) || "未知错误" });
					} else if (cfg.showBody === true && text !== "") {
						body = summarize(text);
					} else {
						body = t("notify.body.plain");
					}
					notify(title, body, current);
					lastNotifyAt = now;
				};

				const unsubscribe = scope.sessions.list.subscribe(onListChange);
				onListChange(); // 首帧：初始化 prevRunning
				ctx.effect(() => () => {
					if (typeof unsubscribe === "function") unsubscribe();
					window.removeEventListener("focus", refreshConfig);
					document.removeEventListener("visibilitychange", refreshConfig);
				});
			});
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
