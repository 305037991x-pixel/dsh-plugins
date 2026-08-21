// dsh-open-file — browser half.
//
// 整合交互约定（用户确认版）：
//   单击路径      → 话内预览（文本高亮 / markdown / 图片 / xlsx 表格）
//   Ctrl/⌘+点击   → 系统默认应用打开（host 端 Invoke-Item）
//   预览面板按钮  → 「打开」「打开所在文件夹」（explorer /select 定位）
//
// 识别范围（用户确认版）：反引号路径（官方 inline code）+ 官方产物 chip
// （button[title] 路径形态）+ 正文明显路径形态（含 \ 或 / 分隔符，或
// 白名单扩展名裸文件名），本地正则过滤，点击时经 host 存在性校验。
//
// 实现要点（参考 dsh-file-mentions / dsh-pathlink 的成熟做法）：
//   - 文档级 capture 点击委托：官方渲染入口被官方产物插件占用，DOM 委托
//     是唯一不与官方冲突的路径；官方 inline-code / 产物 chip 的点击在
//     capture 阶段被拦截，防止冒泡到官方 handler。
//   - MutationObserver 包裹裸文本路径：React 重渲染会冲掉 span，
//     observer 持续恢复（data 属性守卫防重复包裹）。
//   - 预览用固定浮层（不动 React 渲染树），Esc / 关闭按钮可关。
window.__ModuleLoader__.load({
	id: "dsh-open-file",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region 常量
		const SELF_ATTR = "data-dsh-open-file";
		const TOKEN_CLS = "dsh-open-file-token";
		const OVERLAY_CLS = "dsh-open-file-overlay";
		const EXT_WHITELIST = new Set([
			"xlsx", "xlsm", "md", "markdown", "txt", "csv", "json", "yaml", "yml",
			"png", "jpg", "jpeg", "gif", "webp", "svg", "pdf", "docx", "doc", "pptx",
			"py", "js", "ts", "html", "htm", "log"
		]);
		//#endregion

		//#region 样式
		// 自包含暗色方案：不依赖任何主题 token（DSH 主题 token 命名不统一），
		// 所有颜色硬编码，保证浮层在任何 DSH 主题下都清晰可读。
		const CSS = `
.${TOKEN_CLS}{text-decoration:underline dotted;text-decoration-color:rgba(120,120,180,.5);cursor:pointer;border-radius:3px;transition:background .12s}
.${TOKEN_CLS}:hover{background:rgba(99,102,241,.12)}
.${TOKEN_CLS}[data-invalid]{text-decoration:none;cursor:not-allowed;opacity:.55}
.${OVERLAY_CLS}{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(720px,calc(100vw - 32px));max-height:min(70vh,640px);display:flex;flex-direction:column;border-radius:10px;background:#18181b;border:1px solid rgba(255,255,255,.1);box-shadow:0 10px 34px rgba(0,0,0,.5);font-size:13px;line-height:1.6;color:#e4e4e7;overflow:hidden;color-scheme:dark}
.${OVERLAY_CLS}-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.1);background:#27272a;flex:none}
.${OVERLAY_CLS}-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:#f4f4f5}
.${OVERLAY_CLS}-actions{display:flex;gap:6px;flex:none}
.${OVERLAY_CLS}-actions button{font:inherit;font-size:12px;color:#a1a1aa;background:#27272a;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:2px 10px;cursor:pointer}
.${OVERLAY_CLS}-actions button:hover{color:#e4e4e7;text-decoration:underline}
.${OVERLAY_CLS}-actions button.primary{color:#fff;background:#3b82f6;border-color:transparent}
.${OVERLAY_CLS}-body{overflow:auto;padding:12px 16px;min-height:60px;flex:1}
.${OVERLAY_CLS}-body pre{margin:0;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Consolas,'Courier New',monospace;font-size:12.5px;color:#d4d4d8}
.${OVERLAY_CLS}-body img{max-width:100%;border-radius:6px}
.${OVERLAY_CLS}-body table{border-collapse:collapse;font-size:12px;max-width:100%;color:#d4d4d8}
.${OVERLAY_CLS}-body table td,.${OVERLAY_CLS}-body table th{border:1px solid rgba(255,255,255,.1);padding:3px 8px;white-space:nowrap;background:transparent;color:#d4d4d8}
.${OVERLAY_CLS}-body table th{background:#27272a;color:#e4e4e7;position:sticky;top:0}
.${OVERLAY_CLS}-body h1,.${OVERLAY_CLS}-body h2,.${OVERLAY_CLS}-body h3{font-size:1.1em;margin:10px 0 6px;color:#e4e4e7}
.${OVERLAY_CLS}-body p{margin:6px 0;color:#d4d4d8}
.${OVERLAY_CLS}-body a{color:#60a5fa}
.${OVERLAY_CLS}-body code{background:rgba(255,255,255,.06);border-radius:4px;padding:1px 5px;font-size:12px;color:#d4d4d8}
.${OVERLAY_CLS}-body pre code{background:none;padding:0}
.${OVERLAY_CLS}-sheet{margin:8px 0 14px}
.${OVERLAY_CLS}-sheet-title{font-weight:600;margin-bottom:4px;color:#a1a1aa}
.${OVERLAY_CLS}-hint{color:#71717a;font-size:12px}
.dsh-open-file-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483001;background:rgba(24,24,27,.95);color:#e4e4e7;font-size:13px;padding:8px 16px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.5);pointer-events:none;max-width:70vw;border:1px solid rgba(255,255,255,.1)}
`;
		let stylesInjected = false;
		function ensureStyles() {
			if (stylesInjected) return;
			stylesInjected = true;
			const style = document.createElement("style");
			style.textContent = CSS;
			document.head.appendChild(style);
		}
		//#endregion

		//#region 路径识别
		/** 判断字符串是否像文件路径（含分隔符，或白名单扩展名结尾）。 */
		function looksLikePath(s) {
			if (!s || typeof s !== "string") return false;
			const t = s.trim();
			if (t.length === 0 || t.length > 1024) return false;
			if (t.includes("://")) return false;
			if (t.includes("/") || t.includes("\\")) return true;
			const at = t.lastIndexOf(".");
			if (at === -1 || at === t.length - 1) return false;
			return EXT_WHITELIST.has(t.slice(at + 1).toLowerCase());
		}

		/** 从文本中提取路径候选：盘符/UNC 绝对路径 + 含分隔符相对路径 + 白名单扩展名裸文件名。 */
		function extractCandidates(text) {
			const out = [];
			const seen = new Set();
			const add = (start, end, token) => {
				if (seen.has(token)) return;
				seen.add(token);
				out.push({ start, end, token });
			};
			// 路径内部允许：字母数字/中文/./-/ _/空格外的可见字符；排除结尾常见标点（中英文）
			const TAIL = String.raw`\s"'` + "`" + String.raw`<>|?*，。；：、！？（）【】\[\]{}`;
			let m;
			// 1) 绝对盘符路径：D:\xxx 或 D:/xxx（(?![/\\]) 防 URL 的 s:// 被误匹配）
			const drive = new RegExp(String.raw`[A-Za-z]:[\\/](?![/\\])[^${TAIL}]+`, "g");
			while ((m = drive.exec(text)) !== null) add(m.index, m.index + m[0].length, m[0]);
			// 2) UNC 路径：\\server\share
			const unc = new RegExp(String.raw`\\\\[^${TAIL}]+`, "g");
			while ((m = unc.exec(text)) !== null) add(m.index, m.index + m[0].length, m[0]);
			// 3) 含分隔符的相对路径 token（可带 ~/ 前缀；前视排除 URL 段与单词中间截断）
			const rel = /(?<![:/~\w.\-\u4e00-\u9fff])(?:~[\\/])?[\w.\-\u4e00-\u9fff]+(?:[\\/][\w.\-\u4e00-\u9fff]+)+(?:\.[A-Za-z0-9]{1,12})?/g;
			while ((m = rel.exec(text)) !== null) {
				const token = m[0];
				if (token.includes("://")) continue;
				if (/^[\d.]+$/.test(token.replace(/[\\/]/g, "."))) continue;
				add(m.index, m.index + token.length, token);
			}
			// 4) 无分隔符裸文件名（白名单扩展名，前后不能是路径字符）
			const bare = /(?<![\w.\-\u4e00-\u9fff])([\w.\-\u4e00-\u9fff]+)\.([A-Za-z0-9]{1,12})(?![\w\u4e00-\u9fff])/g;
			while ((m = bare.exec(text)) !== null) {
				if (!EXT_WHITELIST.has(m[2].toLowerCase())) continue;
				if (/^\d+$/.test(m[1])) continue;
				add(m.index, m.index + m[0].length, m[0]);
			}
			// 去重叠：按起始位置排序，与已选区间重叠的丢弃（保留更长的盘符/UNC 匹配）
			out.sort((a, b) => a.start - b.start || b.end - a.end);
			const merged = [];
			let lastEnd = -1;
			for (const c of out) {
				if (c.start < lastEnd) continue;
				merged.push(c);
				lastEnd = c.end;
			}
			return merged;
		}

		/** 把文本节点中的路径候选包成可点击 span（返回是否处理）。 */
		function processTextNode(node) {
			const text = node.nodeValue;
			if (!text) return false;
			const candidates = extractCandidates(text);
			if (candidates.length === 0) return false;
			const parent = node.parentNode;
			if (!parent || parent.nodeType !== 1) return false;
			if (parent.closest(`[${SELF_ATTR}], .${OVERLAY_CLS}`)) return false;
			const frag = document.createDocumentFragment();
			let last = 0;
			for (const c of candidates) {
				if (c.start > last) frag.appendChild(document.createTextNode(text.slice(last, c.start)));
				const span = document.createElement("span");
				span.setAttribute(SELF_ATTR, c.token);
				span.className = TOKEN_CLS;
				span.title = "单击预览 · Ctrl/⌘+点击系统打开";
				span.textContent = c.token;
				frag.appendChild(span);
				last = c.end;
			}
			if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
			parent.replaceChild(frag, node);
			return true;
		}
		//#endregion

		//#region MutationObserver（流式更新 / React 重渲染恢复）
		let pending = new Set();
		let rafScheduled = false;
		function scheduleProcess(node) {
			pending.add(node);
			if (rafScheduled) return;
			rafScheduled = true;
			requestAnimationFrame(() => {
				rafScheduled = false;
				const batch = pending;
				pending = new Set();
				for (const n of batch) {
					if (n.isConnected && n.nodeValue) {
						try { processTextNode(n); } catch (err) { /* 单节点失败不影响 */ }
					}
				}
			});
		}

		function setupObserver() {
			const observer = new MutationObserver((mutations) => {
				for (const m of mutations) {
					if (m.type === "characterData") {
						if (m.target.nodeValue) scheduleProcess(m.target);
					} else if (m.type === "childList") {
						for (const n of m.addedNodes) {
							if (n.nodeType === 3) {
								if (n.nodeValue) scheduleProcess(n);
							} else if (n.nodeType === 1 && !n.hasAttribute(SELF_ATTR)) {
								// 元素内文本节点（跳过我们自己的 span 子树）
								if (n.querySelector !== undefined && n.querySelector(`[${SELF_ATTR}]`) === null) {
									const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
									while (walker.nextNode()) {
										const tn = walker.currentNode;
										if (tn.parentElement && tn.parentElement.closest(`[${SELF_ATTR}]`)) continue;
										if (tn.nodeValue) scheduleProcess(tn);
									}
								}
							}
						}
					}
				}
			});
			observer.observe(document.body, { childList: true, characterData: true, subtree: true });
		}
		//#endregion

		//#region host 调用与提示
		async function api(path, body) {
			const r = await fetch(path, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body || {})
			});
			let data = {};
			try { data = await r.json(); } catch (err) { /* 非 JSON */ }
			if (!r.ok) throw new Error(data && data.error ? data.error : "HTTP " + r.status);
			return data;
		}

		let toastTimer = null;
		function showToast(text) {
			let el = document.querySelector(".dsh-open-file-toast");
			if (!el) {
				el = document.createElement("div");
				el.className = "dsh-open-file-toast";
				document.body.appendChild(el);
			}
			el.textContent = text;
			el.style.opacity = "1";
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 2600);
		}
		//#endregion

		//#region 预览浮层
		let overlay = null;
		function ensureOverlay() {
			if (overlay && overlay.isConnected) return overlay;
			overlay = document.createElement("div");
			overlay.className = OVERLAY_CLS;
			document.body.appendChild(overlay);
			return overlay;
		}

		function actionButtons(token) {
			const row = document.createElement("div");
			row.className = OVERLAY_CLS + "-actions";
			const mk = (label, cls, fn) => {
				const b = document.createElement("button");
				b.textContent = label;
				if (cls) b.className = cls;
				b.addEventListener("click", fn);
				return b;
			};
			row.appendChild(mk("打开", "primary", async () => {
				try { await api("/api/open-file/open", { path: token }); showToast("已调用系统打开"); }
				catch (err) { showToast("打开失败：" + err.message); }
			}));
			row.appendChild(mk("打开所在文件夹", "", async () => {
				try { await api("/api/open-file/reveal", { path: token }); showToast("已在文件管理器中定位"); }
				catch (err) { showToast("定位失败：" + err.message); }
			}));
			row.appendChild(mk("关闭", "", () => { overlay.remove(); overlay = null; }));
			return row;
		}

		/** 渲染预览结果到浮层。 */
		function renderOverlay(result, token) {
			const box = ensureOverlay();
			box.innerHTML = "";
			const head = document.createElement("div");
			head.className = OVERLAY_CLS + "-head";
			const name = document.createElement("div");
			name.className = OVERLAY_CLS + "-name";
			name.textContent = result.name || token;
			name.title = token;
			head.appendChild(name);
			head.appendChild(actionButtons(token));
			box.appendChild(head);

			const body = document.createElement("div");
			body.className = OVERLAY_CLS + "-body";

			if (result.kind === "text") {
				const pre = document.createElement("pre");
				pre.textContent = result.content;
				body.appendChild(pre);
				if (result.truncated) {
					const hint = document.createElement("div");
					hint.className = OVERLAY_CLS + "-hint";
					hint.textContent = "内容过长，仅显示前 256KB";
					body.appendChild(hint);
				}
			} else if (result.kind === "md") {
				const div = document.createElement("div");
				div.innerHTML = result.html;
				body.appendChild(div);
				if (result.truncated) {
					const hint = document.createElement("div");
					hint.className = OVERLAY_CLS + "-hint";
					hint.textContent = "内容过长，仅显示前 256KB";
					body.appendChild(hint);
				}
			} else if (result.kind === "image") {
				const img = document.createElement("img");
				img.src = "data:" + result.mime + ";base64," + result.data;
				img.alt = result.name;
				body.appendChild(img);
			} else if (result.kind === "xlsx") {
				for (const sheet of result.sheets) {
					const wrap = document.createElement("div");
					wrap.className = OVERLAY_CLS + "-sheet";
					const title = document.createElement("div");
					title.className = OVERLAY_CLS + "-sheet-title";
					title.textContent = sheet.name;
					wrap.appendChild(title);
					const table = document.createElement("div");
					table.innerHTML = sheet.html;
					wrap.appendChild(table);
					body.appendChild(wrap);
				}
				if (result.truncated) {
					const hint = document.createElement("div");
					hint.className = OVERLAY_CLS + "-hint";
					hint.textContent = "sheet 过多，仅预览前 " + result.sheets.length + " 个";
					body.appendChild(hint);
				}
			} else if (result.kind === "dir") {
				const hint = document.createElement("div");
				hint.className = OVERLAY_CLS + "-hint";
				hint.textContent = "这是一个目录";
				body.appendChild(hint);
			} else {
				const hint = document.createElement("div");
				hint.className = OVERLAY_CLS + "-hint";
				hint.textContent = "暂不支持预览 ." + (result.ext || "?") + "（" + (result.reason === "too-large" ? "文件过大" : result.reason === "parse-error" ? "解析失败" : "二进制/复杂格式") + "）—— 请用「打开」或 Ctrl/⌘+点击系统打开";
				body.appendChild(hint);
			}
			box.appendChild(body);
		}

		async function handleToken(token, ctrl) {
			try {
				const check = await api("/api/open-file/check", { paths: [token] });
				if (!check.valid || !check.valid.includes(token)) {
					showToast("路径不存在：" + token);
					return;
				}
				if (ctrl) {
					await api("/api/open-file/open", { path: token });
					showToast("已调用系统打开");
				} else {
					const result = await api("/api/open-file/preview", { path: token });
					renderOverlay(result, token);
				}
			} catch (err) {
				showToast("请求失败：" + err.message);
			}
		}
		//#endregion

		//#region 点击委托（capture 阶段，拦截官方 handler 冒泡）
		function setupClick() {
			document.addEventListener("click", (e) => {
				const ctrl = e.ctrlKey || e.metaKey;
				const target = e.target;
				if (!(target instanceof Element)) return;
				if (target.closest("." + OVERLAY_CLS)) return;
				// 1) 我们包裹的 token span
				const span = target.closest(`[${SELF_ATTR}]`);
				if (span) {
					e.preventDefault();
					e.stopPropagation();
					handleToken(span.getAttribute(SELF_ATTR), ctrl);
					return;
				}
				// 2) 官方 inline code（反引号路径）
				const code = target.closest("code");
				if (code && !code.closest("pre") && looksLikePath(code.textContent)) {
					e.preventDefault();
					e.stopPropagation();
					handleToken(code.textContent.trim(), ctrl);
					return;
				}
				// 3) 官方产物 chip（button[title] 且 title 是路径）
				const btn = target.closest("button[title]");
				if (btn && looksLikePath(btn.getAttribute("title"))) {
					e.preventDefault();
					e.stopPropagation();
					handleToken(btn.getAttribute("title").trim(), ctrl);
					return;
				}
			}, true);
			document.addEventListener("keydown", (e) => {
				if (e.key === "Escape" && overlay && overlay.isConnected) {
					overlay.remove();
					overlay = null;
				}
			});
		}
		//#endregion

		//#region 启动
		function start() {
			ensureStyles();
			setupClick();
			setupObserver();
		}
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", start);
		} else {
			start();
		}
		//#endregion

		//#region plugin body
		const name = "dsh-open-file";
		const inject = [];

		/** DOM 副作用在模块 materialize 时已生效，apply 仅满足客户端插件契约。 */
		function apply() {}
		//#endregion

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
