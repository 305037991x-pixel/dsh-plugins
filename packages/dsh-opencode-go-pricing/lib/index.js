// @ts-check
/**
 * dsh-opencode-go-pricing — host half.
 *
 * Keeps the OpenCode GO provider's model display names in `llm-pi-ai`
 * settings in sync with the official "2x usage" markers published on the
 * OpenCode GO pricing page (`https://opencode.ai/go`), so the DSH model
 * selector always shows the current pricing label next to affected models.
 *
 * Why: OpenCode GO grants some models (e.g. DeepSeek V4 Flash) 2× usage
 * limits for a limited time — the plan's per-5-hour request allowance is
 * doubled, a promotion rather than a surcharge. That marker changes over
 * time; DSH's own pi-ai catalog is static and cannot follow it. This plugin
 * polls the official source (ETag-conditional, so an unchanged page costs
 * nothing) and, when the marker set changes, rewrites the `name` fields of
 * the configured `models` list through the DSH settings seam. The settings
 * change flows through `llm-pi-ai`'s own `scope.watch` → `onChange` hook, so
 * the adapter's model directory is rebuilt live — no restart required after
 * the initial plugin install.
 *
 * The plugin only touches models the user already listed in the
 * `llm-pi-ai.providers.<provider>.models` array; it never adds or removes
 * models, and it never edits other settings namespaces or the catalog
 * itself.
 *
 * Settings namespace `dsh-opencode-go-pricing`:
 *   - enabled:     master switch (default true)
 *   - provider:    llm-pi-ai provider route to label (default "opencode-go")
 *   - source:      "go-page" (default; official pricing page HTML) or
 *                  "models.dev" (registry JSON)
 *   - dataUrl:     source URL (default https://opencode.ai/go)
 *   - intervalMs:  poll interval (default 3600000 = 1h)
 *   - label:       suffix appended to 2x models' display names
 *                  (default "（2x 额度）")
 *
 * Note on network: `fetch` in Node does not honor the HTTP_PROXY/HTTPS_PROXY
 * environment variables, and the models.dev registry is unreachable directly
 * from some networks (China mainland). The default source is therefore the
 * official pricing page at opencode.ai, which is directly reachable from the
 * same networks that can use the GO plan at all.
 */

import z from "@deepseek-ai/schemastery";

export const name = "dsh-opencode-go-pricing";

/** Required services: the user-settings seam. */
export const inject = ["settings"];

/** Settings namespace owned by this plugin. */
export const namespace = "dsh-opencode-go-pricing";

const DEFAULT_PROVIDER = "opencode-go";
const DEFAULT_SOURCE = "go-page";
const DEFAULT_DATA_URL = "https://opencode.ai/go";
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_LABEL = "（2x 额度）";
/** English marker the pi-ai catalog ships in a 2x model's display name. */
const OFFICIAL_MARKER = "(2x usage)";
/** Historical labels this plugin wrote under earlier default wording; stripped too, so a wording change migrates cleanly. */
const LEGACY_LABELS = ["（2x 计费）"];
/** How long after boot the first sync waits (ms). */
const FIRST_SYNC_DELAY_MS = 10_000;
/** Registry fetch timeout (ms). */
const FETCH_TIMEOUT_MS = 30_000;

/** Settings schema for this plugin's namespace. */
export const Config = z.object({
	enabled: z.boolean().default(true),
	provider: z.string().default(DEFAULT_PROVIDER),
	/** Data source: "go-page" (official pricing page) or "models.dev" (registry JSON). */
	source: z.string().default(DEFAULT_SOURCE),
	dataUrl: z.string().default(DEFAULT_DATA_URL),
	intervalMs: z.number().default(DEFAULT_INTERVAL_MS),
	label: z.string().default(DEFAULT_LABEL)
});

/**
 * Parse the official Go pricing page (`opencode.ai/go`, server-rendered HTML)
 * and return model id → { name, is2x } for the Go plan models.
 *
 * The chart is server-rendered: one `<span data-item ... data-model="id">`
 * per model, followed by its children (value, name, and — for 2x models —
 * a `data-bonus` span) up to the block's closing `</span>`. Each block is
 * cut out with a lookahead on the next `data-item` (or the pills container's
 * end), then scanned for the bonus marker, so a bonus can never be
 * attributed across blocks regardless of the comments/attributes the renderer
 * inserts between the fixed children.
 * @param {string} html - page HTML.
 * @returns {Map<string, { name: string, is2x: boolean }>}
 */
function parseGoPage(html) {
	const out = new Map();
	const blockRe = /data-model="([^"]+)"[^>]*>([\s\S]*?)(?=<span[^>]*data-item|<\/div><figcaption)/g;
	let m;
	while ((m = blockRe.exec(html)) !== null) {
		const id = m[1];
		const body = m[2];
		const nameMatch = /<span data-name>([^<]*)<\/span>/.exec(body);
		if (nameMatch === null) continue;
		const bonusMatch = /<span[^>]*data-bonus[^>]*>([^<]*)<\/span>/.exec(body);
		out.set(id, {
			name: nameMatch[1],
			is2x: bonusMatch !== null && (/2\s*[×xX]\s*usage/i.test(bonusMatch[1]) || /2x/i.test(bonusMatch[1]))
		});
	}
	return out;
}

/**
 * Parse the models.dev registry JSON into the same shape: model id →
 * { name, is2x }, where is2x means the official display name carries the
 * "(2x usage)" marker.
 * @param {string} jsonText - registry JSON text.
 * @returns {Map<string, { name: string, is2x: boolean }>}
 */
function parseModelsDev(jsonText) {
	const json = /** @type {any} */ (JSON.parse(jsonText));
	const provider = json?.[DEFAULT_PROVIDER];
	if (provider === null || typeof provider !== "object") {
		throw new Error(`no "${DEFAULT_PROVIDER}" entry in the models.dev registry`);
	}
	const out = new Map();
	for (const [id, entry] of Object.entries(provider.models ?? {})) {
		if (entry !== null && typeof entry === "object" && typeof entry.name === "string") {
			out.set(id, { name: entry.name, is2x: entry.name.includes("(2x usage)") });
		}
	}
	return out;
}

/**
 * Fetch the chosen data source and return model id → {name, is2x}, or `null`
 * when the source is unchanged since the last fetch (HTTP 304).
 * @param {string} source - "go-page" or "models.dev".
 * @param {string} dataUrl - URL of the source.
 * @param {string | null} etag - last seen ETag, if any.
 * @returns {Promise<{ models: Map<string, { name: string, is2x: boolean }>, etag: string | null } | null>}
 */
async function fetchOfficialModels(source, dataUrl, etag) {
	const headers = etag === null ? {} : { "If-None-Match": etag };
	const res = await fetch(dataUrl, {
		headers,
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
	});
	if (res.status === 304) return null;
	if (!res.ok) throw new Error(`source ${res.status} for ${dataUrl}`);
	const nextEtag = res.headers.get("etag");
	const text = await res.text();
	const models = source === "models.dev" ? parseModelsDev(text) : parseGoPage(text);
	if (models.size === 0) throw new Error(`no models parsed from ${dataUrl}`);
	return { models, etag: nextEtag };
}

/**
 * Strip fields a settings write cannot carry (undefined / non-JSON values)
 * and drop empty containers (schema-resolved defaults like `input: []` or
 * `compat: {}`), so the persisted `models` list stays as lean as the user's
 * own entries.
 */
function jsonClean(value) {
	if (Array.isArray(value)) {
		const out = value.map(jsonClean);
		return out.length === 0 ? undefined : out;
	}
	if (value !== null && typeof value === "object") {
		const out = {};
		for (const [key, child] of Object.entries(value)) {
			if (child === undefined) continue;
			const cleaned = jsonClean(child);
			if (cleaned === undefined) continue;
			if (typeof cleaned === "object" && Object.keys(cleaned).length === 0) continue;
			out[key] = cleaned;
		}
		return Object.keys(out).length === 0 ? undefined : out;
	}
	return value;
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown>} rawConfig - loader entry config (becomes the settings `base` layer).
 */
export function apply(ctx, rawConfig = {}) {
	// Register the settings namespace. The loader entry config (rawConfig) is
	// handed to the settings seam as `base`, so a legacy manual patch keeps
	// working while the user document (settings.yaml / Web UI) wins over it.
	ctx.settings.register(namespace, Config, { base: rawConfig });

	const readConfig = () => ctx.settings.get(namespace) ?? {};

	/** Last ETag observed from the registry; null = unknown / never fetched. */
	let etag = null;
	/** Re-entrancy guard: one sync at a time, no overlapping fetches. */
	let syncing = false;

	/**
	 * One sync pass: fetch the official names, compare against the current
	 * llm-pi-ai model list, and write back only the names that changed.
	 */
	async function syncOnce() {
		if (syncing) return;
		syncing = true;
		try {
			const cfg = readConfig();
			if (cfg.enabled === false) return;

			const fetched = await fetchOfficialModels(cfg.source, cfg.dataUrl, etag);
			if (fetched === null) return; // 304 — nothing changed upstream
			etag = fetched.etag;

			const llm = ctx.settings.get("llm-pi-ai");
			const profile = llm?.providers?.[cfg.provider];
			const models = profile?.models;
			if (!Array.isArray(models) || models.length === 0) {
				// Nothing to label: no explicit `models` list (built-in catalog
				// serving) or a route we do not own. Leave it alone.
				return;
			}

			let changed = false;
			const next = models.map((m) => {
				const id = m?.id;
				if (typeof id !== "string") return m;
				const official = fetched.models.get(id);
				const is2x = official?.is2x === true;
				const officialName = official?.name;
				const raw = typeof m?.name === "string" ? m.name : (officialName ?? id);
				// The plugin owns two markers: the configured label and the
				// English "(2x usage)" suffix the pi-ai catalog ships. Strip
				// both (plus any legacy wording this plugin wrote in earlier
				// versions), then re-apply the label exactly when the official
				// source says the model is 2x — so a marker that went stale
				// (e.g. Kimi K3) is removed, and a model that became 2x gets
				// the label without duplicating a leftover one.
				let bare = raw.replaceAll(cfg.label, "");
				for (const legacy of LEGACY_LABELS) bare = bare.replaceAll(legacy, "");
				bare = bare.replaceAll(OFFICIAL_MARKER, "").trim();
				const name = is2x ? bare + cfg.label : bare;
				if (name === raw) return m;
				changed = true;
				return { ...m, name };
			});
			if (!changed) return;

			await ctx.settings.mutate("llm-pi-ai", [{
				op: "set",
				path: ["providers", cfg.provider, "models"],
				value: jsonClean(next)
			}]);
			ctx.logger.info(
				`dsh-opencode-go-pricing: synced "${cfg.provider}" model names with official 2x markers (${fetched.models.size} models from ${cfg.source})`
			);
		} catch (error) {
			ctx.logger.warn("dsh-opencode-go-pricing: sync failed; will retry on the next interval");
			ctx.logger.warn(error);
		} finally {
			syncing = false;
		}
	}

	// First sync shortly after boot (the settings service and llm-pi-ai are
	// both mounted by then), then poll on the configured interval. Timers are
	// native Node handles; the fiber effect clears them on unload.
	const first = setTimeout(() => void syncOnce(), FIRST_SYNC_DELAY_MS);
	const timer = setInterval(() => void syncOnce(), readConfig().intervalMs ?? DEFAULT_INTERVAL_MS);
	ctx.effect(() => () => {
		clearTimeout(first);
		clearInterval(timer);
	});
}
