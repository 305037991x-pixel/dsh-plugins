// dsh-task-notify — browser half.
//
// 四类场景弹 Windows 系统通知（浏览器 Notification API 系统 toast）：
//  1. 任务完成       —— 当前选中会话 running true→false 边沿且无错误信号；
//  2. 任务失败/出错  —— ① 当前会话 running 结束边沿存在错误信号（promptError /
//                        lastAgentError / 末尾 turn-error 节点）；② promptError
//                        从无到有（消息发送直接被拒）；
//  3. 等待批准       —— 任意会话 pendingInteraction 变为 'approval' / 'plan-review'
//                        （dsh-user-approval 审批 / 计划审阅），agent 被阻塞等你操作；
//  4. Agent 提问     —— 任意会话 pendingInteraction 变为 'question'
//                        （dsh-tool-ask-user / user-questions 选择题）。
//
// 信号源（与内置「完成绿点 / 琥珀点」同源）：
//  - sessions.list 快照 byId[].running / byId[].pendingInteraction / current；
//  - 会话快照 binding(id).session.getSnapshot()：promptError / lastAgentError /
//    nodes（turn-error）/ pending[]（approval/question 载荷）。
//
// 弹出条件：设置 enabled 且 Notification.permission === "granted"；
// onlyWhenUnfocused 开时还需 !document.hasFocus()（切到其他窗口才弹）。
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
			"notify.title.done": "DSH · 任务完成",
			"notify.title.error": "DSH · 任务失败",
			"notify.title.approval": "DSH · 等待批准",
			"notify.title.question": "DSH · Agent 提问",
			"notify.body.done.plain": "本轮回复已完成。",
			"notify.body.error.plain": "本轮回复出错。",
			"notify.body.approval.plain": "有操作等待你批准。",
			"notify.body.planreview": "计划已生成，等待你审阅批准。",
			"notify.body.question.plain": "Agent 有提问等待你回答。",
			"notify.permission.denied": "通知权限被拒绝：请在浏览器站点设置中允许 http://127.0.0.1:3080 的通知权限后刷新页面"
		};
		const en = {
			"notify.title.done": "DSH · task finished",
			"notify.title.error": "DSH · task failed",
			"notify.title.approval": "DSH · approval needed",
			"notify.title.question": "DSH · agent question",
			"notify.body.done.plain": "This reply has finished.",
			"notify.body.error.plain": "This reply failed.",
			"notify.body.approval.plain": "An action is waiting for your approval.",
			"notify.body.planreview": "A plan is ready for your review.",
			"notify.body.question.plain": "The agent has a question for you.",
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
		 * 从已加载窗口节点取「最后一条 assistant 文本」（任务完成正文用）。
		 * @param {unknown} nodes - ConversationSnapshot 的 nodes（chat.legacy.nodes 或顶层 nodes）。
		 * @returns {string} 最后一条 assistant 文本（无则空串）。
		 */
		function tailText(nodes) {
			if (!Array.isArray(nodes) || nodes.length === 0) return "";
			for (let i = nodes.length - 1; i >= 0; i--) {
				const node = nodes[i];
				if (node === null || typeof node !== "object") continue;
				if (node.kind === "assistant" && Array.isArray(node.blocks)) {
					const text = node.blocks
						.filter((b) => b !== null && typeof b === "object" && b.kind === "text" && typeof b.text === "string")
						.map((b) => b.text)
						.join("")
						.trim();
					if (text !== "") return text;
				}
			}
			return "";
		}

		/**
		 * 错误判定：promptError / lastAgentError / 末尾 turn-error 节点。
		 * @param {object|null|undefined} snapshot - 会话快照。
		 * @param {unknown} nodes - 已加载节点。
		 * @returns {string} 错误消息（无错误返回空串）。
		 */
		function firstError(snapshot, nodes) {
			if (snapshot !== null && typeof snapshot === "object") {
				const pe = snapshot.promptError;
				if (pe !== null && pe !== void 0) {
					const msg = typeof pe.message === "string" ? pe.message : "";
					if (msg !== "") return msg;
				}
				if (typeof snapshot.lastAgentError === "string" && snapshot.lastAgentError !== "") return snapshot.lastAgentError;
			}
			if (Array.isArray(nodes)) {
				for (let i = nodes.length - 1; i >= 0; i--) {
					const node = nodes[i];
					if (node !== null && typeof node === "object" && node.kind === "turn-error") {
						return typeof node.message === "string" ? node.message : "";
					}
				}
			}
			return "";
		}

		/**
		 * 取 pending 等待的正文（按状态从快照 pending[] 载荷提取）。
		 * @param {object|null|undefined} snapshot - 会话快照。
		 * @param {string} status - 'approval' | 'plan-review' | 'question'。
		 * @returns {string} 正文文本（无则空串，由调用方回退固定文案）。
		 */
		function pendingBody(snapshot, status) {
			const pendings = snapshot !== null && typeof snapshot === "object" && Array.isArray(snapshot.pending) ? snapshot.pending : [];
			if (status === "approval") {
				const wait = pendings.find((p) => p !== null && typeof p === "object" && p.kind === "approval");
				const pl = wait !== void 0 && wait !== null ? wait.payload : void 0;
				if (pl !== void 0 && pl !== null) {
					if (typeof pl.reason === "string" && pl.reason !== "") return pl.reason;
					if (typeof pl.toolName === "string" && pl.toolName !== "") return `[${pl.toolName}]`;
				}
				return "";
			}
			if (status === "question") {
				const wait = pendings.find((p) => p !== null && typeof p === "object" && p.kind === "question");
				const question = wait !== void 0 && wait !== null && wait.payload !== null && typeof wait.payload === "object"
					? wait.payload.questions?.[0]
					: void 0;
				if (question !== void 0 && question !== null && typeof question.question === "string" && question.question !== "") {
					return question.question;
				}
				return "";
			}
			// plan-review：计划审阅用固定文案
			return "";
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
		 * @param {(key: string) => string} t - translate。
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

		/** 弹出一条系统通知（tag 去重：同类同会话只保留最新一条）。 */
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
		 * Client plugin body: 订阅会话列表，检测四类场景边沿并弹通知。
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

				// 状态跟踪（首帧只记录，不通知）
				const prevRunning = new Map();      // sessionId -> running
				const prevPending = new Map();      // sessionId -> pendingInteraction 状态（undefined 表示无）
				const prevPromptError = new Map();  // sessionId -> promptError 是否存在

				let lastNotifyAt = 0;
				const MIN_INTERVAL_MS = 2000; // 防抖：相邻两次通知至少间隔 2s

				/** 读取一个会话的快照（失败返回 null，不抛）。 */
				const readSnapshot = (sessionId) => {
					try {
						const binding = scope.sessions.binding(sessionId);
						const session = binding !== void 0 && binding !== null ? binding.session : void 0;
						return session !== void 0 && typeof session.getSnapshot === "function" ? session.getSnapshot() : null;
					} catch (error) {
						console.error("[dsh-task-notify] snapshot read failed:", error);
						return null;
					}
				};

				/** 统一前置检查：开关 / 权限 / 聚焦。 */
				const canNotify = () => {
					const cfg = shared.config;
					if (cfg.enabled !== true) return false;
					if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
					if (cfg.onlyWhenUnfocused === true && document.hasFocus()) return false;
					return true;
				};

				/** 拼标题：`<类别标题> · <会话标题>`。 */
				const titleOf = (base, entry) => {
					const displayTitle = entry !== void 0 && entry !== null && typeof entry.displayTitle === "string" && entry.displayTitle !== ""
						? entry.displayTitle
						: null;
					return displayTitle === null ? base : `${base} · ${displayTitle}`;
				};

				/** 发一条通知（含防抖与前置检查）。 */
				const emit = (kind, title, body, tag) => {
					const now = Date.now();
					if (now - lastNotifyAt < MIN_INTERVAL_MS) return;
					if (!canNotify()) return;
					notify(title, body, `${kind}:${tag}`);
					lastNotifyAt = now;
				};

				const onListChange = () => {
					const snap = scope.sessions.list.getSnapshot();
					if (snap === null || typeof snap !== "object") return;
					const byId = snap.byId !== null && typeof snap.byId === "object" ? snap.byId : {};
					const current = snap.current;

					// ① 任意会话：pendingInteraction 边沿（等待批准 / Agent 提问）
					for (const sessionId of Object.keys(byId)) {
						const entry = byId[sessionId];
						const status = entry !== void 0 && entry !== null ? entry.pendingInteraction : void 0;
						const prev = prevPending.get(sessionId);
						if (status === void 0 || status === null) {
							prevPending.set(sessionId, void 0);
							continue;
						}
						if (prev === status) continue; // 无变化
						prevPending.set(sessionId, status);

						const snapshot = readSnapshot(sessionId);
						let kind;
						let titleKey;
						let body;
						if (status === "approval") {
							kind = "approval";
							titleKey = "notify.title.approval";
							body = pendingBody(snapshot, "approval") || t("notify.body.approval.plain");
						} else if (status === "plan-review") {
							kind = "approval";
							titleKey = "notify.title.approval";
							body = t("notify.body.planreview");
						} else {
							kind = "question";
							titleKey = "notify.title.question";
							body = pendingBody(snapshot, "question") || t("notify.body.question.plain");
						}
						emit(kind, titleOf(t(titleKey), entry), summarize(body), sessionId);
					}

					// ② 当前会话：running 边沿（完成 / 失败）+ promptError 边沿（请求出错）
					if (current === void 0 || current === null) return;
					const entry = byId[current];
					const running = entry !== void 0 && entry !== null && entry.running === true;

					if (!prevRunning.has(current)) {
						prevRunning.set(current, running);
					} else {
						const wasRunning = prevRunning.get(current);
						prevRunning.set(current, running);
						if (wasRunning && !running) {
							// running true→false：回合结束 → 完成 or 失败
							const snapshot = readSnapshot(current);
							const nodes = snapshot !== null ? (snapshot.chat?.legacy?.nodes ?? snapshot.nodes) : void 0;
							const err = firstError(snapshot, nodes);
							if (err !== "") {
								emit("error", titleOf(t("notify.title.error"), entry), summarize(err) || t("notify.body.error.plain"), current);
							} else {
								const text = tailText(nodes);
								const cfg = shared.config;
								const body = cfg.showBody !== false && text !== "" ? summarize(text) : t("notify.body.done.plain");
								emit("done", titleOf(t("notify.title.done"), entry), body, current);
							}
						}
					}

					// promptError 从无到有：消息发送直接被拒
					const snapshot = readSnapshot(current);
					const hasPromptError = snapshot !== null && snapshot.promptError !== null && snapshot.promptError !== void 0;
					if (!prevPromptError.has(current)) {
						prevPromptError.set(current, hasPromptError);
					} else if (!prevPromptError.get(current) && hasPromptError) {
						prevPromptError.set(current, true);
						const msg = snapshot !== null && typeof snapshot.promptError?.message === "string" ? snapshot.promptError.message : "";
						emit("error", titleOf(t("notify.title.error"), entry), summarize(msg) || t("notify.body.error.plain"), current);
					} else {
						prevPromptError.set(current, hasPromptError);
					}
				};

				const unsubscribe = scope.sessions.list.subscribe(onListChange);
				onListChange(); // 首帧：初始化全部 prev* 记录
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
