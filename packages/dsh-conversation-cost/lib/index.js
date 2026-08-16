// @ts-check
/**
 * dsh-conversation-cost — host half.
 *
 * 在对话底部（内置统计条下方）显示「本轮 / 总会话」消耗的额度或费用。
 * 本文件是宿主侧半区：
 *  1. 设置命名空间 `dsh-conversation-cost`（Web 设置 → 插件可配）；
 *  2. 维护价格表：主源为 OpenCode GO 官方文档计价表（opencode.ai/docs/go，
 *     每百万 token 单价 + 各模型月用量），"2x usage" 标注来自官方首页
 *     （opencode.ai/go 的 data-bonus badge），DeepSeek API 人民币表为内置
 *     （官方定价页 2026-08-17 峰谷价，默认空闲价）；
 *  3. 注册 `GET /dsh-conversation-cost/prices` 路由供浏览器半区拉取。
 *     所有网络请求只发生在宿主侧；失败自动回退内置默认表。
 *
 * 计价口径（官方，https://opencode.ai/docs/go/）：
 *  - 额度按美元计价：消耗($) = Σ(token 桶 × 每百万单价)；限额 $12/5小时、$30/周、$60/月；
 *  - 每模型月限额不同（官方表 Usage 列：$60 或 $15）；
 *  - "2x usage" = 该模型用量上限翻倍（限时促销，如 DeepSeek V4 Flash），
 *    限额分母 ×2（同一配额可用 2 倍 token，更便宜）。
 */

import z from "@deepseek-ai/schemastery";

/** Stable Cordis plugin name. */
export const name = "dsh-conversation-cost";

/** Required services: the web server (route) and the user-settings seam. */
export const inject = ["webServer", "settings"];

/** Settings namespace owned by this plugin. */
export const namespace = "dsh-conversation-cost";

/** 官方 GO 计价表（docs）默认地址。 */
const DEFAULT_DATA_URL = "https://opencode.ai/docs/go/";
/** 官方 GO 首页（"2x usage" badge 标注）默认地址。 */
const DEFAULT_BADGE_URL = "https://opencode.ai/go";
/** 价格刷新间隔（毫秒），默认 1 小时。 */
const DEFAULT_REFRESH_MS = 60 * 60 * 1000;
/** 抓取超时。 */
const FETCH_TIMEOUT_MS = 30_000;
/** 官方通用限额（美元）：5 小时 / 周 / 月。 */
export const OFFICIAL_LIMITS = { fiveHour: 12, weekly: 30, monthly: 60 };
/** 官方 "2x usage" 标注的正则。 */
const BONUS_RE = /2\s*[×xX]\s*usage/i;

/**
 * 内置默认 GO 单价表（USD/百万 tokens）——官方 docs 计价表快照，
 * 网络不可达时的兜底；运行时以官方页解析结果为准，可被 overrides 覆盖。
 * 分段计价模型（GPT 5.6 Luna、Qwen3.7/3.6 Plus）取基础档（首行）。
 */
const DEFAULT_GO_RATES = {
	"grok-4.5": { input: 2.0, output: 6.0, cacheRead: 0.3, cacheWrite: 0, monthlyUsageUsd: 15 },
	"gpt-5.6-luna": { input: 0.2, output: 1.2, cacheRead: 0.02, cacheWrite: 0.25, monthlyUsageUsd: 15 },
	"glm-5.3": { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0, monthlyUsageUsd: 15 },
	"glm-5.2": { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0, monthlyUsageUsd: 60 },
	"glm-5.1": { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0, monthlyUsageUsd: 60 },
	"kimi-k3": { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 0, monthlyUsageUsd: 15 },
	"kimi-k2.7-code": { input: 0.95, output: 4.0, cacheRead: 0.19, cacheWrite: 0, monthlyUsageUsd: 60 },
	"kimi-k2.6": { input: 0.95, output: 4.0, cacheRead: 0.16, cacheWrite: 0, monthlyUsageUsd: 60 },
	"mimo-v2.5": { input: 0.14, output: 0.28, cacheRead: 0.0028, cacheWrite: 0, monthlyUsageUsd: 60 },
	"mimo-v2.5-pro": { input: 0.435, output: 0.87, cacheRead: 0.003625, cacheWrite: 0, monthlyUsageUsd: 15 },
	"minimax-m3": { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0, monthlyUsageUsd: 60 },
	"minimax-m2.7": { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375, monthlyUsageUsd: 60 },
	"minimax-m2.5": { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375, monthlyUsageUsd: 60 },
	"qwen3.8-max": { input: 2.0, output: 6.0, cacheRead: 0.25, cacheWrite: 2.5, monthlyUsageUsd: 15 },
	"qwen3.7-max": { input: 2.5, output: 7.5, cacheRead: 0.5, cacheWrite: 3.125, monthlyUsageUsd: 60 },
	"qwen3.7-plus": { input: 0.4, output: 1.6, cacheRead: 0.04, cacheWrite: 0.5, monthlyUsageUsd: 60 },
	"qwen3.6-plus": { input: 0.5, output: 3.0, cacheRead: 0.05, cacheWrite: 0.625, monthlyUsageUsd: 60 },
	"deepseek-v4-pro": { input: 0.435, output: 0.87, cacheRead: 0.003625, cacheWrite: 0, monthlyUsageUsd: 15 },
	"deepseek-v4-flash": { input: 0.14, output: 0.28, cacheRead: 0.0028, cacheWrite: 0, monthlyUsageUsd: 60 },
	"hy3": { input: 0.14, output: 0.58, cacheRead: 0.035, cacheWrite: 0, monthlyUsageUsd: 60 }
};

/**
 * 内置 DeepSeek API 人民币单价表（¥/百万 tokens，空闲价）——
 * 官方定价页 https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ 2026-08-17 生效价。
 * 高峰价 = 空闲价 × 2（北京 9:00–12:00、14:00–18:00），由 deepseekPeak 开关决定。
 */
const DEFAULT_DEEPSEEK_RATES = {
	"deepseek-v4-flash": { hit: 0.05, miss: 1.5, output: 4.5, name: "DeepSeek V4 Flash" },
	"deepseek-v4-pro": { hit: 0.15, miss: 4.5, output: 13.5, name: "DeepSeek V4 Pro" }
};

/** Settings schema for this plugin's namespace. */
export const Config = z.object({
	enabled: z.boolean().default(true),
	/** 官方 GO 计价表地址（每百万 token 单价表）。 */
	dataUrl: z.string().default(DEFAULT_DATA_URL),
	/** 官方 GO 首页地址（"2x usage" 标注）。 */
	badgeUrl: z.string().default(DEFAULT_BADGE_URL),
	/** 价格刷新间隔（毫秒）。 */
	refreshMs: z.number().default(DEFAULT_REFRESH_MS),
	/** 美元→人民币汇率（仅其他 provider 换算显示用）。 */
	rateUsdCny: z.number().default(7.2),
	/** "2x usage" 模型限额分母翻倍（用量上限翻倍、更便宜）。 */
	apply2x: z.boolean().default(true),
	/** DeepSeek API 计价时段：false=空闲价（默认），true=高峰价。 */
	deepseekPeak: z.boolean().default(false),
	/** 手动覆盖单价：{"opencode-go": {modelId: {...}}, "deepseek": {modelId: {...}}}。 */
	overrides: z.dict(z.dict(z.dict(z.any()))).default({})
});

/**
 * 模型显示名 → 稳定 id（小写、空格→连字符、去括号备注、保留版本号点）。
 * @param {string} display - 官方表中的模型显示名，如 "DeepSeek V4 Flash" / "GPT 5.6 Luna"。
 * @returns {string} 稳定 id，如 "deepseek-v4-flash" / "gpt-5.6-luna"。
 */
function modelIdOf(display) {
	return display
		.replace(/\([^)]*\)/g, "")
		.replace(/[^a-zA-Z0-9.]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.toLowerCase();
}

/**
 * 解析官方 docs 计价表 HTML，返回 modelId → 单价对象。
 * 表格为 Docusaurus 渲染的 <table>；取含 "Cached Read" 表头的表格，
 * 行格式 [Model, Input, Output, Cached Read, Cached Write, Usage]。
 * 同一模型分段计价（如 ≤272K / >272K）时取第一行（基础档）。
 * @param {string} html - 官方 docs 页 HTML。
 * @returns {Map<string, object>} modelId → {input, output, cacheRead, cacheWrite, monthlyUsageUsd, name}。
 */
function parseDocsTable(html) {
	const out = new Map();
	const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
	for (const table of tables) {
		if (!/Cached\s*Read/i.test(table[1])) continue;
		const rows = [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
		for (const row of rows) {
			const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
				.map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim());
			if (cells.length < 6) continue;
			const name = cells[0];
			if (!name || /^Model$/i.test(name)) continue;
			const id = modelIdOf(name);
			if (id.length === 0 || out.has(id)) continue; // 分段计价只取首行
			const num = (s) => {
				const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
				return Number.isFinite(n) ? n : 0;
			};
			const usage = num(cells[5]);
			out.set(id, {
				input: num(cells[1]),
				output: num(cells[2]),
				cacheRead: num(cells[3]),
				cacheWrite: num(cells[4]),
				monthlyUsageUsd: usage,
				name
			});
		}
		if (out.size > 0) break;
	}
	return out;
}

/**
 * 解析官方 GO 首页的 "2x usage" badge，返回标注 2x 的模型 id 集合。
 * 图表为 SSR 渲染：每个模型一个 `<span data-item ... data-model="id">` 块，
 * 2x 模型块内带 `<span data-bonus>2x usage</span>`（跨块归属用 lookahead 切断）。
 * @param {string} html - 官方 GO 首页 HTML。
 * @returns {Set<string>} 2x 模型 id 集合。
 */
function parseBadges(html) {
	const out = new Set();
	const blockRe = /data-model="([^"]+)"[^>]*>([\s\S]*?)(?=<span[^>]*data-item|<\/div><figcaption)/g;
	let m;
	while ((m = blockRe.exec(html)) !== null) {
		const bonusMatch = /<span[^>]*data-bonus[^>]*>([^<]*)<\/span>/.exec(m[2]);
		if (bonusMatch !== null && BONUS_RE.test(bonusMatch[1])) out.add(m[1]);
	}
	return out;
}

/**
 * 抓取一个 URL 的文本（带超时）。
 * @param {string} url - 目标地址。
 * @returns {Promise<string>} 响应文本。
 */
async function fetchText(url) {
	const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	if (!res.ok) throw new Error(`source ${res.status} for ${url}`);
	return res.text();
}

/**
 * 构建 GO provider 价格表：官方 docs 表 → 合并 2x badge → 覆盖 overrides。
 * @param {object} cfg - 当前设置。
 * @returns {Promise<object>} modelId → 单价对象（含 is2x）。
 */
async function buildGoRates(cfg) {
	let rates = new Map(Object.entries(DEFAULT_GO_RATES));
	let badges = new Set();
	try {
		const [docsHtml, badgeHtml] = await Promise.all([
			fetchText(cfg.dataUrl),
			fetchText(cfg.badgeUrl)
		]);
		const parsed = parseDocsTable(docsHtml);
		if (parsed.size > 0) {
			rates = parsed;
			// 表里没有而内置表有的模型（兜底），补进去
			for (const [id, rate] of Object.entries(DEFAULT_GO_RATES)) {
				if (!rates.has(id)) rates.set(id, rate);
			}
		}
		badges = parseBadges(badgeHtml);
	} catch (error) {
		// 网络/解析失败 → 回退内置表；标注留空由 overrides 兜底
	}
	const out = {};
	for (const [id, rate] of rates) {
		const is2x = badges.has(id) || rate.is2x === true;
		out[id] = {
			input: rate.input,
			output: rate.output,
			cacheRead: rate.cacheRead ?? 0,
			cacheWrite: rate.cacheWrite ?? 0,
			monthlyUsageUsd: rate.monthlyUsageUsd ?? 60,
			is2x,
			name: rate.name ?? id
		};
	}
	return out;
}

/**
 * 构建 DeepSeek API provider 价格表（人民币，空闲/高峰价）。
 * @param {object} cfg - 当前设置。
 * @returns {object} modelId → {hit, miss, output, name}。
 */
function buildDeepseekRates(cfg) {
	const peak = cfg.deepseekPeak === true ? 2 : 1;
	const out = {};
	for (const [id, rate] of Object.entries(DEFAULT_DEEPSEEK_RATES)) {
		out[id] = {
			hit: rate.hit * peak,
			miss: rate.miss * peak,
			output: rate.output * peak,
			name: rate.name ?? id
		};
	}
	return out;
}

/**
 * 把用户 overrides 合并进价格表（按 provider/model 覆盖字段）。
 * @param {object} providers - {provider: {modelId: rate}}。
 * @param {object} overrides - 用户设置中的 overrides。
 * @returns {object} 合并后的 providers。
 */
function applyOverrides(providers, overrides) {
	for (const [provider, models] of Object.entries(overrides ?? {})) {
		if (models === null || typeof models !== "object") continue;
		if (providers[provider] === void 0) providers[provider] = {};
		for (const [modelId, patch] of Object.entries(models)) {
			if (patch === null || typeof patch !== "object") continue;
			providers[provider][modelId] = {
				...(providers[provider][modelId] ?? {}),
				...patch,
				name: providers[provider][modelId]?.name ?? patch.name ?? modelId
			};
		}
	}
	return providers;
}

/**
 * 组装完整的 /prices 响应：配置快照 + 各 provider 价格表。
 * @param {object} cfg - 当前设置。
 * @returns {Promise<object>} {config, providers}。
 */
async function buildPrices(cfg) {
	const goRates = await buildGoRates(cfg);
	const providers = applyOverrides({
		"opencode-go": goRates,
		deepseek: buildDeepseekRates(cfg)
	}, cfg.overrides);
	return {
		config: {
			apply2x: cfg.apply2x !== false,
			rateUsdCny: cfg.rateUsdCny ?? 7.2,
			deepseekPeak: cfg.deepseekPeak === true,
			limits: OFFICIAL_LIMITS
		},
		providers
	};
}

export { modelIdOf, parseDocsTable, parseBadges, fetchText, buildGoRates, buildDeepseekRates, applyOverrides, buildPrices, DEFAULT_GO_RATES, DEFAULT_DEEPSEEK_RATES };

/**
 * 注册价格路由 + 定时刷新。返回 200 + {config, providers}；
 * 本地失败（无网络）时返回 200 + 内置兜底表（不会挂）。
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context。
 * @param {Record<string, unknown>} rawConfig - loader entry config（成为 settings base 层）。
 */
export function apply(ctx, rawConfig = {}) {
	ctx.settings.register(namespace, Config, { base: rawConfig });

	const readConfig = () => ctx.settings.get(namespace) ?? {};

	/** 价格缓存：{payload, at, fetching}。 */
	const cache = {
		payload: null,
		at: 0,
		fetching: null
	};

	/**
	 * 刷新一次价格缓存（并发去重）；失败时保留旧缓存（首刷失败则下次再试）。
	 * @returns {Promise<object>} 构建出的 payload。
	 */
	async function refresh() {
		if (cache.fetching !== null) return cache.fetching;
		cache.fetching = (async () => {
			try {
				const cfg = readConfig();
				if (cfg.enabled === false) return cache.payload ?? { config: {}, providers: {} };
				const payload = await buildPrices(cfg);
				cache.payload = payload;
				cache.at = Date.now();
				return payload;
			} catch (error) {
				ctx.logger.warn("dsh-conversation-cost: prices refresh failed; keeping cached/builtin table");
				ctx.logger.warn(error);
				return cache.payload ?? { config: {}, providers: {} };
			} finally {
				cache.fetching = null;
			}
		})();
		return cache.fetching;
	}

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/dsh-conversation-cost/prices",
		handler: async (req, res) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			const sendJson = (payload) => {
				res.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				res.end(JSON.stringify(payload));
			};
			try {
				const payload = await refresh();
				sendJson(payload);
			} catch (error) {
				// 极端兜底：连内置表构建都失败时给空表，客户端显示「价格未知」
				sendJson({ config: {}, providers: {} });
			}
		}
	}), "dsh-conversation-cost: prices route");

	// 启动后尽快刷一次，然后按 refreshMs 轮询；卸载时清理定时器
	const first = setTimeout(() => void refresh(), 3000);
	const timer = setInterval(() => void refresh(), readConfig().refreshMs ?? DEFAULT_REFRESH_MS);
	ctx.effect(() => () => {
		clearTimeout(first);
		clearInterval(timer);
	});
}
