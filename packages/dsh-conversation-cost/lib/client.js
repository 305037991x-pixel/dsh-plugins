// dsh-conversation-cost — browser half.
//
// 在对话底部（内置统计条「conversation.composer.dock」插槽，排在 stats 之后）
// 显示一行「本轮 / 总会话」消耗的额度或费用：
//   - opencode-go（GO 套餐）：估算美元额度 + 占官方限额百分比
//     （本轮 → 5h 限额 $12；总会话 → 当前模型的月限额，官方表 Usage 列 $60/$15，
//      "2x usage" 模型限额分母翻倍——用量上限翻倍、更便宜）；
//   - deepseek（DeepSeek API）：人民币费用（官方 ¥/M 峰谷价，默认空闲价）；
//   - 其他 provider：美元额度（可选人民币换算）。
// 数据流：token 用量来自 useProjection("tokenUsage")（总会话，全日志权威值）+
// 窗口节点按轮求和（本轮）；当前模型来自 session.models RPC；价格表来自宿主侧
// 路由 /dsh-conversation-cost/prices（模块级共享缓存 + 5 分钟定时刷新）。
window.__ModuleLoader__.load({
	id: "dsh-conversation-cost",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region CostLine.module.css
		const css = ".costLine_root{text-align:center;max-width:var(--dsh-chat-content-width);box-sizing:border-box;width:100%;padding:2px calc(var(--dsh-composer-side-clearance) + 16px) 0px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;margin:0 auto;font-size:12px;line-height:20px;display:block;overflow:hidden}.costLine_sep{color:var(--dsw-alias-separator-primary);margin:0 10px}.costLine_model{color:var(--dsw-alias-label-secondary);font-weight:500}";
		const tagId = "dsh-conversation-cost/CostLine.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-conversation-cost";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const cssMap = {
			root: "costLine_root",
			sep: "costLine_sep",
			model: "costLine_model"
		};
		//#endregion

		//#region locales
		const NS = "dshConversationCost";
		const zh = {
			"line.go": "本轮 ≈ {roundUsd}（5h 额度 {roundPct}）· 总会话 ≈ {totalUsd}（月额度 {totalPct}）",
			"line.deepseek": "本轮费用 ¥{roundCny} · 总会话 ¥{totalCny}",
			"line.other": "本轮 ≈ {roundUsd} · 总会话 ≈ {totalUsd}",
			"line.unknown": "本轮 {roundTokens} · 总会话 {totalTokens} · 价格未知",
			"model.badge": "{name}（2x 用量）",
			"detail.go.round": "本轮 输入 {in}×${input}/M + 缓存读 {cr}×${cacheRead}/M + 缓存写 {cw}×${cacheWrite}/M + 输出 {out}×${output}/M = {usd}",
			"detail.go.total": "总会话 输入 {in}×${input}/M + 缓存读 {cr}×${cacheRead}/M + 缓存写 {cw}×${cacheWrite}/M + 输出 {out}×${output}/M = {usd}",
			"detail.go.limits": "5h 限额 ${fiveHour} · 月限额 ${monthly}（2x 用量限额翻倍）· 官方限额 $12/5h、$30/周、$60/月 · 估算",
			"detail.deepseek.round": "本轮 输入未命中 {in}×¥{miss}/M + 缓存命中 {cr}×¥{hit}/M + 输出 {out}×¥{output}/M = ¥{cny}（{tier}价）",
			"detail.deepseek.total": "总会话 输入未命中 {in}×¥{miss}/M + 缓存命中 {cr}×¥{hit}/M + 输出 {out}×¥{output}/M = ¥{cny}（{tier}价）",
			"tier.peak": "高峰",
			"tier.offpeak": "空闲",
			"detail.other": "{tokens} · 单价 $/{M} tokens（估算）",
			"unknown": "该模型暂无价格数据"
		};
		const en = {
			"line.go": "This round ≈ {roundUsd} ({roundPct} of 5h) · Session ≈ {totalUsd} ({totalPct} of month)",
			"line.deepseek": "This round ¥{roundCny} · Session ¥{totalCny}",
			"line.other": "This round ≈ {roundUsd} · Session ≈ {totalUsd}",
			"line.unknown": "This round {roundTokens} · Session {totalTokens} · price unknown",
			"model.badge": "{name} (2x usage)",
			"detail.go.round": "Round  in {in}×${input}/M + cached-read {cr}×${cacheRead}/M + cached-write {cw}×${cacheWrite}/M + out {out}×${output}/M = {usd}",
			"detail.go.total": "Session in {in}×${input}/M + cached-read {cr}×${cacheRead}/M + cached-write {cw}×${cacheWrite}/M + out {out}×${output}/M = {usd}",
			"detail.go.limits": "5h limit ${fiveHour} · monthly limit ${monthly} (2x usage doubles limits) · official $12/5h, $30/wk, $60/mo · estimate",
			"detail.deepseek.round": "Round  miss {in}×¥{miss}/M + hit {cr}×¥{hit}/M + out {out}×¥{output}/M = ¥{cny} ({tier})",
			"detail.deepseek.total": "Session miss {in}×¥{miss}/M + hit {cr}×¥{hit}/M + out {out}×¥{output}/M = ¥{cny} ({tier})",
			"tier.peak": "peak",
			"tier.offpeak": "off-peak",
			"detail.other": "{tokens} · $/M tokens (estimate)",
			"unknown": "No price data for this model"
		};
		//#endregion

		//#region helpers
		/** 紧凑 token 数：517 / 12.2K / 517K / 1.2M。 */
		function formatTokens(n) {
			const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
			if (n < 1e3) return String(n);
			if (n < 1e6) return `${scaled(n / 1e3)}K`;
			return `${scaled(n / 1e6)}M`;
		}
		/** 金额：$0.0123 / $1.23 / $123.45（去尾零，至少 2 位小数）。 */
		function formatUsd(n) {
			if (!Number.isFinite(n) || n <= 0) return "0";
			if (n < 0.01) return n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
			return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
		}
		/** 百分比：0.12% / <0.01%。 */
		function formatPct(n) {
			if (!Number.isFinite(n) || n <= 0) return "0%";
			if (n < 0.01) return "<0.01%";
			return `${Math.round(n * 100) / 100}%`;
		}
		/** 求和多个 token 四桶。 */
		function sumBuckets(list) {
			const out = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
			for (const u of list) {
				if (u === null || typeof u !== "object") continue;
				out.input += u.inputTokens ?? 0;
				out.output += u.outputTokens ?? 0;
				out.cacheRead += u.cacheReadTokens ?? 0;
				out.cacheWrite += u.cacheWriteTokens ?? 0;
			}
			return out;
		}
		/** 从已加载窗口节点求「本轮」（最大 turn 的 assistant 节点用量之和）。 */
		function roundBuckets(nodes) {
			let maxTurn = -1;
			for (const node of nodes) {
				if (node.kind === "assistant" && typeof node.turn === "number" && node.turn > maxTurn) maxTurn = node.turn;
			}
			if (maxTurn < 0) return null;
			return sumBuckets(nodes.filter((node) => node.kind === "assistant" && node.turn === maxTurn).map((node) => node.usage));
		}
		/** 项目录（tokenUsage 投影）为四桶。 */
		function projectionBuckets(usage) {
			if (usage === null || typeof usage !== "object") return null;
			return {
				input: usage.uncachedInputTokens ?? 0,
				output: usage.outputTokens ?? 0,
				cacheRead: usage.cacheReadTokens ?? 0,
				cacheWrite: usage.cacheWriteTokens ?? 0
			};
		}
		/**
		 * GO 档：美元消耗 + 限额。单价为 $/百万 tokens，故 token 数 × 单价后 ÷1e6。
		 * 2x 模型限额分母翻倍（= 消耗÷(限额×2)，与「按半价计入」数学等价，官方口径更直观）。
		 * @param {object} b - token 四桶 {input, output, cacheRead, cacheWrite}。
		 * @param {object} r - 单价 {input, output, cacheRead, cacheWrite, monthlyUsageUsd, is2x}。
		 * @param {object} cfg - 配置快照 {apply2x, limits:{fiveHour, weekly, monthly}}。
		 * @returns {{usd: number, fiveHourLimit: number, monthlyLimit: number}}
		 */
		function goCost(b, r, cfg) {
			const usd = (b.input * r.input + b.cacheRead * r.cacheRead + b.cacheWrite * r.cacheWrite + b.output * r.output) / 1e6;
			const mult = r.is2x === true && cfg.apply2x !== false ? 2 : 1;
			return {
				usd,
				fiveHourLimit: (cfg.limits?.fiveHour ?? 12) * mult,
				monthlyLimit: (r.monthlyUsageUsd ?? cfg.limits?.monthly ?? 60) * mult
			};
		}
		/** DeepSeek API 档：人民币（单价 ¥/百万 tokens；缓存命中/未命中分桶，写入按未命中计）。 */
		function deepseekCost(b, r) {
			return (b.input * r.miss + b.cacheRead * r.hit + b.cacheWrite * r.miss + b.output * r.output) / 1e6;
		}
		//#endregion

		//#region shared prices store（模块级共享：价格表 + 5 分钟定时刷新）
		const PRICES_REFRESH_MS = 300000;
		const shared = {
			prices: null,
			phase: "idle", // idle | loading | ready | error
			version: 0,
			fetching: null,
			timer: null,
			listeners: new Set(),
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			},
			getSnapshot() {
				return this.version;
			}
		};
		const notify = () => {
			shared.version++;
			for (const listener of [...shared.listeners]) {
				try {
					listener();
				} catch (error) {
					console.error("[dsh-conversation-cost] store listener failed:", error);
				}
			}
		};
		/** 拉取一次价格表；并发去重。 */
		const fetchPrices = () => {
			if (shared.fetching !== null) return shared.fetching;
			shared.fetching = (async () => {
				shared.phase = "loading";
				notify();
				try {
					const response = await fetch("/dsh-conversation-cost/prices", {
						headers: { accept: "application/json" },
						cache: "no-store"
					});
					const payload = await response.json().catch(() => null);
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					if (payload === null || typeof payload !== "object") throw new Error("bad payload");
					shared.prices = payload;
					shared.phase = "ready";
				} catch (error) {
					shared.phase = "error";
					console.error("[dsh-conversation-cost] prices fetch failed:", error);
				} finally {
					shared.fetching = null;
					notify();
				}
			})();
			return shared.fetching;
		};
		/** 确保共享定时器存在（跨组件只建一个；组件卸载不清理）。 */
		const ensureTimer = () => {
			if (shared.timer === null) {
				shared.timer = setInterval(() => {
					void fetchPrices();
				}, PRICES_REFRESH_MS);
			}
		};
		//#endregion

		//#region CostLine
		/**
		 * 对话底部额度/费用行：本轮 + 总会话。
		 * @param props - session standard kit（useSession/useProjection/t/sessionId）
		 *                + 条目注入的 loadModel（session.models RPC）。
		 */
		function CostLine(props) {
			const { t, sessionId, loadModel } = props;
			react.useSyncExternalStore(shared.subscribe.bind(shared), shared.getSnapshot.bind(shared));

			// 总会话：tokenUsage 投影（全日志权威值）
			const total = projectionBuckets(props.useProjection("tokenUsage"));
			// 本轮：已加载窗口节点中最大 turn 的 assistant 节点用量之和
			const nodes = props.useSession((s) => s.chat.legacy.nodes);
			const round = react.useMemo(() => roundBuckets(nodes), [nodes]);

			// 当前模型：session.models RPC（sessionId 变化时重新拉）
			const [model, setModel] = react.useState(null);
			react.useEffect(() => {
				let alive = true;
				if (sessionId === void 0 || loadModel === void 0) {
					setModel(null);
					return;
				}
				// 用 Promise.resolve().then 包裹：loadModel 同步抛错也不能让 React
				// effect 崩溃（否则整个组件树被卸载，UI 直接消失）。
				Promise.resolve().then(() => loadModel()).then(({ result }) => {
					if (!alive) return;
					if (result.ok && result.value?.current !== void 0) {
						setModel({
							provider: result.value.current.provider,
							model: result.value.current.model
						});
					} else {
						setModel(null);
					}
				}).catch((error) => {
					console.error("[dsh-conversation-cost] loadModel failed:", error);
					if (alive) setModel(null);
				});
				return () => {
					alive = false;
				};
			}, [sessionId, loadModel]);

			react.useEffect(() => {
				ensureTimer();
				if (shared.phase === "idle" && shared.prices === null) void fetchPrices();
			}, []);

			const { prices } = shared;
			const cfg = prices?.config ?? {};
			const provider = model === null ? null : prices?.providers?.[model.provider];
			const rate = provider === null || provider === void 0 ? null : provider[model.model];

			const hasTokens = (total !== null && (total.input > 0 || total.output > 0 || total.cacheRead > 0 || total.cacheWrite > 0)) ||
				(round !== null && (round.input > 0 || round.output > 0 || round.cacheRead > 0 || round.cacheWrite > 0));
			if (!hasTokens) return null;

			const modelLabel = model === null ? "" : rate !== null && rate.name !== void 0 ? rate.name : model.model;
			const badge = rate !== null && rate.is2x === true ? t("model.badge", { name: modelLabel }) : modelLabel;

			// 计算两档
			const compute = (b) => {
				if (b === null) return null;
				if (model === null || rate === null) return { kind: "unknown", tokens: b };
				const key = model.provider;
				if (key === "opencode-go") {
					const c = goCost(b, rate, cfg);
					return {
						kind: "go",
						b,
						rate,
						cfg,
						usd: c.usd,
						roundPct: formatPct(c.usd / c.fiveHourLimit * 100),
						monthPct: formatPct(c.usd / c.monthlyLimit * 100),
						fiveHourLimit: c.fiveHourLimit,
						monthlyLimit: c.monthlyLimit
					};
				}
				if (key === "deepseek") {
					return { kind: "deepseek", b, rate, cfg, cny: deepseekCost(b, rate) };
				}
				const r = rate;
				const usd = (b.input * (r.input ?? 0) + b.cacheRead * (r.cacheRead ?? 0) + b.cacheWrite * (r.cacheWrite ?? 0) + b.output * (r.output ?? 0)) / 1e6;
				return { kind: "other", b, rate, usd };
			};
			const roundCalc = compute(round);
			const totalCalc = compute(total);
			if (roundCalc === null && totalCalc === null) return null;

			// 渲染行
			let line;
			const modelNode = badge === "" ? null : react_jsx_runtime.jsx("span", { className: cssMap.model, children: badge });
			if (roundCalc?.kind === "go" && totalCalc?.kind === "go") {
				line = t("line.go", {
					roundUsd: `$${formatUsd(roundCalc.usd)}`,
					roundPct: roundCalc.roundPct,
					totalUsd: `$${formatUsd(totalCalc.usd)}`,
					totalPct: totalCalc.monthPct
				});
			} else if (roundCalc?.kind === "deepseek" || totalCalc?.kind === "deepseek") {
				line = t("line.deepseek", {
					roundCny: formatUsd(roundCalc?.kind === "deepseek" ? roundCalc.cny : 0),
					totalCny: formatUsd(totalCalc?.kind === "deepseek" ? totalCalc.cny : 0)
				});
			} else if (roundCalc?.kind === "other" || totalCalc?.kind === "other") {
				line = t("line.other", {
					roundUsd: `$${formatUsd(roundCalc?.kind === "other" ? roundCalc.usd : 0)}`,
					totalUsd: `$${formatUsd(totalCalc?.kind === "other" ? totalCalc.usd : 0)}`
				});
			} else {
				line = t("line.unknown", {
					roundTokens: round === null ? "0" : `${formatTokens(round.input + round.output)}`,
					totalTokens: total === null ? "0" : `${formatTokens(total.input + total.output)}`
				});
			}

			// tooltip 明细
			const details = [];
			const bucketText = (b) => `输入 ${formatTokens(b.input)} · 缓存读 ${formatTokens(b.cacheRead)} · 缓存写 ${formatTokens(b.cacheWrite)} · 输出 ${formatTokens(b.output)}`;
			if (roundCalc?.kind === "go") {
				details.push(t("detail.go.round", {
					in: formatTokens(roundCalc.b.input),
					input: formatUsd(roundCalc.rate.input),
					cr: formatTokens(roundCalc.b.cacheRead),
					cacheRead: formatUsd(roundCalc.rate.cacheRead),
					cw: formatTokens(roundCalc.b.cacheWrite),
					cacheWrite: formatUsd(roundCalc.rate.cacheWrite),
					out: formatTokens(roundCalc.b.output),
					output: formatUsd(roundCalc.rate.output),
					usd: `$${formatUsd(roundCalc.usd)}`
				}));
			}
			if (totalCalc?.kind === "go") {
				details.push(t("detail.go.total", {
					in: formatTokens(totalCalc.b.input),
					input: formatUsd(totalCalc.rate.input),
					cr: formatTokens(totalCalc.b.cacheRead),
					cacheRead: formatUsd(totalCalc.rate.cacheRead),
					cw: formatTokens(totalCalc.b.cacheWrite),
					cacheWrite: formatUsd(totalCalc.rate.cacheWrite),
					out: formatTokens(totalCalc.b.output),
					output: formatUsd(totalCalc.rate.output),
					usd: `$${formatUsd(totalCalc.usd)}`
				}));
				details.push(t("detail.go.limits", {
					fiveHour: formatUsd(totalCalc.fiveHourLimit),
					monthly: formatUsd(totalCalc.monthlyLimit)
				}));
			}
			if (roundCalc?.kind === "deepseek") {
				details.push(t("detail.deepseek.round", {
					in: formatTokens(roundCalc.b.input),
					miss: formatUsd(roundCalc.rate.miss),
					cr: formatTokens(roundCalc.b.cacheRead),
					hit: formatUsd(roundCalc.rate.hit),
					out: formatTokens(roundCalc.b.output),
					output: formatUsd(roundCalc.rate.output),
					cny: formatUsd(roundCalc.cny),
					tier: roundCalc.cfg.deepseekPeak === true ? t("tier.peak") : t("tier.offpeak")
				}));
			}
			if (totalCalc?.kind === "deepseek") {
				details.push(t("detail.deepseek.total", {
					in: formatTokens(totalCalc.b.input),
					miss: formatUsd(totalCalc.rate.miss),
					cr: formatTokens(totalCalc.b.cacheRead),
					hit: formatUsd(totalCalc.rate.hit),
					out: formatTokens(totalCalc.b.output),
					output: formatUsd(totalCalc.rate.output),
					cny: formatUsd(totalCalc.cny),
					tier: totalCalc.cfg.deepseekPeak === true ? t("tier.peak") : t("tier.offpeak")
				}));
			}
			if (roundCalc?.kind === "other" || totalCalc?.kind === "other") {
				const b = (roundCalc?.kind === "other" ? roundCalc : totalCalc).b;
				details.push(t("detail.other", { tokens: bucketText(b) }));
			}
			if ((roundCalc?.kind ?? null) === null && (totalCalc?.kind ?? null) === null) {
				details.push(t("unknown"));
			}
			const detail = details.join("；");

			const row = react_jsx_runtime.jsxs("div", {
				className: cssMap.root,
				"data-cost-line": "",
				children: [
					react_jsx_runtime.jsx("span", { children: line }),
					modelNode === null ? null : react_jsx_runtime.jsxs(react.Fragment, { children: [
						react_jsx_runtime.jsx("span", { className: cssMap.sep, "aria-hidden": true, children: "·" }),
						modelNode
					] })
				]
			});
			if (detail !== "" && primitives.Tooltip !== void 0) {
				return react_jsx_runtime.jsx(primitives.Tooltip, { label: detail, side: "top", delayMs: 500, children: row });
			}
			return row;
		}
		//#endregion

		//#region plugin body
		const inject = ["slots", "locale", "connection"];
		/**
		 * Client plugin body: register the cost line below the built-in stats
		 * strip (conversation.composer.dock, after id "stats").
		 * @param ctx - client root context。
		 */
		function apply(ctx) {
			console.log("[dsh-conversation-cost] apply called");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-conversation-cost: dictionaries");
			ctx.inject(["slots", "connection"], (scope) => {
				console.log("[dsh-conversation-cost] slot inject resolved");
				scope.slots.inject("conversation.composer.dock", () => scope.slots.register({
					name: "conversation.composer.dock",
					id: "dsh-conversation-cost",
					order: 10,
					locale: NS,
					inject: (sessionId) => ({
						loadModel: () => scope.connection.api.sessions.models({ sessionId })
					})
				}, CostLine));
			});
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
