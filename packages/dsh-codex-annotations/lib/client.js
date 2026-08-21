window.__ModuleLoader__.load({
	id: "dsh-codex-annotations",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const h = react.createElement;

		//#region styles
		const css = [
			'.dshq-float{position:fixed;z-index:9999;display:inline-flex;align-items:center;gap:6px;',
			'background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);',
			'border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:5px 12px;',
			'font-size:13px;line-height:18px;cursor:pointer;user-select:none;pointer-events:auto;',
			'white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.16)}',
			'.dshq-float:hover{border-color:var(--dsw-alias-brand-primary)}',
			'.dshq-pop{position:fixed;z-index:9999;pointer-events:auto;width:300px;',
			'background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);',
			'border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:10px 12px;',
			'box-shadow:0 8px 28px rgba(0,0,0,.2);display:flex;flex-direction:column;gap:8px}',
			'.dshq-pop-label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
			'.dshq-pop-preview{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);',
			'border-left:3px solid var(--dsw-alias-brand-primary);border-radius:6px;',
			'padding:6px 8px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);',
			'max-height:96px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;',
			'word-break:break-word;white-space:pre-wrap}',
			'.dshq-pop-input{box-sizing:border-box;width:100%;resize:vertical;min-height:54px;',
			'background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);',
			'border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;',
			'font:inherit;font-size:13px;line-height:20px}',
			'.dshq-pop-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}',
			'.dshq-pop-actions{display:flex;justify-content:flex-end;gap:8px}',
			'.dshq-pop-btn{border:none;border-radius:8px;padding:4px 14px;font-size:13px;line-height:20px;cursor:pointer}',
			'.dshq-pop-cancel{background:transparent;color:var(--dsw-alias-label-secondary)}',
			'.dshq-pop-cancel:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}',
			'.dshq-pop-ok{background:var(--dsw-alias-brand-primary);color:#fff}',
			'.dshq-pop-ok:hover{opacity:.9}',
			'mark[data-quote-ui]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);',
			'border-radius:3px;padding:0 1px;color:inherit}',
			'.dshq-pin{position:fixed;z-index:9998;pointer-events:auto;min-width:20px;height:20px;',
			'border-radius:50%;background:#2f6fed;color:#fff;',
			'display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;',
			'cursor:pointer;border:1px solid rgba(255,255,255,.25);box-shadow:0 2px 8px rgba(0,0,0,.25);',
			'user-select:none;transform:translate(6px,-110%)}',
			'.dshq-pin:hover{filter:brightness(1.1)}',
			'.dshq-bubble{position:fixed;z-index:9999;width:300px;pointer-events:auto;',
			'background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);',
			'border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:10px 12px;',
			'box-shadow:0 8px 28px rgba(0,0,0,.2);display:flex;flex-direction:column;gap:8px}',
			'.dshq-bubble-title{display:flex;align-items:center;justify-content:space-between;gap:8px}',
			'.dshq-bubble-num{background:#2f6fed;color:#fff;',
			'border-radius:50%;min-width:18px;height:18px;display:inline-flex;align-items:center;',
			'justify-content:center;font-size:11px;font-weight:700;padding:0 2px}',
			'.dshq-bubble-del{border:none;background:transparent;color:var(--dsw-alias-label-secondary);',
			'cursor:pointer;font-size:12px;line-height:18px;padding:2px 6px;border-radius:6px}',
			'.dshq-bubble-del:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));',
			'color:var(--dsw-alias-state-error-primary)}',
			'.dshq-bubble-preview{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);',
			'border-left:3px solid var(--dsw-alias-brand-primary);border-radius:6px;',
			'padding:6px 8px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);',
			'max-height:120px;overflow:auto;word-break:break-word;white-space:pre-wrap}',
			'.dshq-bubble-comment{display:flex;align-items:flex-start;gap:6px;color:var(--dsw-alias-label-secondary);',
			'font-size:13px;line-height:20px;word-break:break-word;white-space:pre-wrap}',
			'.dshq-edit-btn{flex:none;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);',
			'cursor:pointer;font-size:12px;line-height:18px;padding:0 4px;border-radius:4px}',
			'.dshq-edit-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));',
			'color:var(--dsw-alias-label-secondary)}',
			'.dshq-inbox{position:fixed;z-index:9997;pointer-events:auto;display:inline-flex;align-items:center;gap:4px;',
			'background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);',
			'border-radius:12px;padding:2px 10px;font-size:12px;line-height:20px;cursor:pointer;',
			'color:var(--dsw-alias-label-secondary);user-select:none;white-space:nowrap;',
			'box-shadow:0 2px 8px rgba(0,0,0,.12)}',
			'.dshq-inbox:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}',
			'.dshq-inbox-list{display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto}',
			'.dshq-inbox-row{display:flex;align-items:flex-start;gap:6px;min-width:0}',
			'.dshq-inbox-item{flex:auto;min-width:0;display:flex;flex-direction:column;gap:3px;',
			'background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);',
			'border-radius:8px;padding:5px 8px}',
			'.dshq-inbox-text{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);',
			'word-break:break-word;white-space:pre-wrap;max-height:60px;overflow:hidden;',
			'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}',
			'.dshq-inbox-comment{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);',
			'word-break:break-word;white-space:pre-wrap}',
			'.dshq-edit-row{display:flex;align-items:center;gap:6px}',
			'.dshq-edit-input{box-sizing:border-box;width:100%;resize:vertical;min-height:36px;',
			'background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);',
			'border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:4px 8px;',
			'font:inherit;font-size:13px;line-height:18px}',
			'.dshq-edit-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}',
		].join('\n');
		const tagId = "dsh-codex-annotations/annot.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-codex-annotations";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region logic
		const ANNOT_RE = /(?:^|\n)\s*📌 批注\s*\n[\s\S]*$/;

		function buildBlock(id, text, comment) {
			const lines = ['**批注 ' + id + '**'];
			lines.push('> ' + text.split('\n').join('\n> '));
			if (comment) lines.push('', '我的评论：' + comment);
			return lines.join('\n');
		}

		function buildLine(it) {
			const body = it.comment ? it.comment : '（无评论）';
			return it.id + '。' + body;
		}

		function buildArea(mine) {
			if (!mine.length) return '';
			return '📌 批注\n' + mine.map(buildLine).join('\n');
		}

		function createQuoteStore() {
			let items = [];
			let nextId = 1;
			const listeners = new Set();
			const emit = () => listeners.forEach((fn) => fn());
			return {
				items() { return items; },
				add(text, comment) {
					const trimmed = comment.trim();
					const id = nextId++;
					const item = { id, text, comment: trimmed, block: buildBlock(id, text, trimmed), markEl: null, sessionId: null };
					items = items.concat(item);
					emit();
					return item;
				},
				updateComment(id, comment) {
					const trimmed = comment.trim();
					items = items.map((i) => (i.id === id ? { ...i, comment: trimmed, block: buildBlock(i.id, i.text, trimmed) } : i));
					emit();
				},
				remove(id) {
					items = items.filter((i) => i.id !== id);
					emit();
				},
				clear() {
					items = [];
					emit();
				},
				poke() { emit(); },
				subscribe(fn) {
					listeners.add(fn);
					return () => { listeners.delete(fn); };
				},
			};
		}

		function useStoreItems(store) {
			const [items, setItems] = react.useState(store.items());
			react.useEffect(() => store.subscribe(() => setItems(store.items())), [store]);
			return items;
		}

		function readSelection() {
			const s = window.getSelection();
			if (!s || s.isCollapsed || s.rangeCount === 0) return null;
			const text = s.toString().trim();
			if (!text) return null;
			const range = s.getRangeAt(0);
			const node = range.commonAncestorContainer;
			const el = node && node.nodeType === 3 ? node.parentElement : node;
			if (!el || typeof el.closest !== 'function') return null;
			if (!el.closest('[data-conversation-scroll]')) return null;
			if (el.closest('textarea, input, [contenteditable="true"], [data-composer-seat], [data-quote-ui], [data-streaming]')) return null;
			return { text, range };
		}

		function markRange(range, id) {
			const start = range.startContainer;
			const end = range.endContainer;
			if (start !== end || start.nodeType !== 3) return null;
			const text = range.toString();
			if (!text) return null;
			const mark = document.createElement('mark');
			mark.dataset.quoteUi = '';
			mark.dataset.commentId = String(id);
			const parent = start.parentNode;
			if (!parent) return null;
			const after = start.splitText(range.startOffset);
			const tail = after.splitText(text.length);
			mark.appendChild(after);
			parent.insertBefore(mark, tail);
			return mark;
		}

		function restoreMark(mark) {
			if (!mark || !mark.isConnected) return;
			const parent = mark.parentNode;
			if (!parent) return;
			while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
			mark.remove();
		}

		function useMarkPositions(store) {
			const [pos, setPos] = react.useState({});
			const last = react.useRef('');
			react.useEffect(() => {
				const compute = () => {
					const next = {};
					for (const it of store.items()) {
						const el = it.markEl;
						if (el && el.isConnected) {
							const r = el.getBoundingClientRect();
							if (r && r.width > 0) next[it.id] = { left: r.right, top: r.top };
						}
					}
					const key = JSON.stringify(next);
					if (key !== last.current) {
						last.current = key;
						setPos(next);
					}
				};
				const un = store.subscribe(compute);
				let raf;
				const loop = () => {
					compute();
					raf = requestAnimationFrame(loop);
				};
				raf = requestAnimationFrame(loop);
				return () => {
					un();
					cancelAnimationFrame(raf);
				};
			}, [store]);
			return pos;
		}

		function useDismissOutside(refs, onDismiss) {
			react.useEffect(() => {
				if (typeof document === 'undefined') return;
				const onDown = (e) => {
					const t = e.target;
					if (!t || !t.closest) return;
					for (const el of refs) {
						if (el && el.contains(t)) return;
					}
					if (t.closest('[data-quote-ui]')) return;
					onDismiss();
				};
				document.addEventListener('mousedown', onDown, true);
				return () => document.removeEventListener('mousedown', onDown, true);
			}, []);
		}
		//#endregion

		//#region FloatingButton（原文编号徽章 + 添加评论 + 悬停气泡）
		function FloatingButton(props) {
			const { store } = props;
			const items = useStoreItems(store);
			const positions = useMarkPositions(store);
			const [sel, setSel] = react.useState(null);
			const [open, setOpen] = react.useState(false);
			const [comment, setComment] = react.useState('');
			const [hoverId, setHoverId] = react.useState(null);
			const [editId, setEditId] = react.useState(null);
			const [editText, setEditText] = react.useState('');
			const openRef = react.useRef(false);
			openRef.current = open;
			useDismissOutside([], () => {
				setHoverId(null);
				setOpen(false);
				setEditId(null);
			});
			react.useEffect(() => {
				if (typeof window === 'undefined' || typeof document === 'undefined') return;
				function compute() {
					if (openRef.current) return;
					try {
						const s = window.getSelection();
						if (s && s.rangeCount > 0) {
							const node = s.getRangeAt(0).commonAncestorContainer;
							const el = node && node.nodeType === 3 ? node.parentElement : node;
							if (el && typeof el.closest === 'function' && el.closest('[data-quote-ui]')) return;
						}
						setSel(readSelection());
					} catch {
						setSel(null);
					}
				}
				document.addEventListener('selectionchange', compute);
				window.addEventListener('scroll', compute, true);
				window.addEventListener('resize', compute);
				return () => {
					document.removeEventListener('selectionchange', compute);
					window.removeEventListener('scroll', compute, true);
					window.removeEventListener('resize', compute);
				};
			}, []);
			const confirm = () => {
				if (!sel) return;
				const item = store.add(sel.text, comment);
				item.markEl = markRange(sel.range, item.id);
				store.poke();
				setComment('');
				setOpen(false);
				setSel(null);
			};
			const removeItem = (it) => {
				restoreMark(it.markEl);
				store.remove(it.id);
				setHoverId(null);
				setEditId(null);
			};
			const startEdit = (it) => {
				setEditId(it.id);
				setEditText(it.comment);
			};
			const saveEdit = () => {
				if (editId !== null) store.updateComment(editId, editText);
				setEditId(null);
			};
			const active = items.filter((it) => it.markEl && it.markEl.isConnected);
			const selRect = sel ? sel.range.getBoundingClientRect() : null;
			return h('div', { 'data-quote-ui': true },
				active.map((it) => {
					const p = positions[it.id];
					if (!p) return null;
					const showBubble = hoverId === it.id || editId === it.id;
					return h('div', {
						key: String(it.id),
						'data-quote-ui': true,
						onMouseEnter: () => { setHoverId(it.id); },
						onMouseLeave: () => { if (editId !== it.id) setHoverId(null); },
					},
						h('button', {
							className: 'dshq-pin',
							style: { left: p.left + 'px', top: p.top + 'px' },
							title: '批注 ' + it.id + (it.comment ? '：' + it.comment : ''),
							onClick: (e) => { e.stopPropagation(); setEditId(null); },
						}, String(it.id)),
						showBubble && h('div', {
							className: 'dshq-bubble',
							style: { left: Math.max(8, Math.min(p.left - 150, window.innerWidth - 316)) + 'px', top: Math.max(8, p.top - 230) + 'px' },
						},
							h('div', { className: 'dshq-bubble-title' },
								h('span', { className: 'dshq-bubble-num' }, String(it.id)),
								h('button', { className: 'dshq-bubble-del', type: 'button', onClick: () => removeItem(it) }, '删除'),
							),
							h('div', { className: 'dshq-bubble-preview' }, it.text),
							editId === it.id
								? h('div', { className: 'dshq-edit-row', style: { flexDirection: 'column', alignItems: 'stretch' } },
									h('textarea', {
										className: 'dshq-edit-input',
										value: editText,
										onChange: (e) => setEditText(e.target.value),
										onKeyDown: (e) => {
											if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
											if (e.key === 'Escape') { setEditId(null); }
										},
									}),
									h('div', { className: 'dshq-pop-actions' },
										h('button', { className: 'dshq-pop-btn dshq-pop-cancel', type: 'button', onClick: () => setEditId(null) }, '取消'),
										h('button', { className: 'dshq-pop-btn dshq-pop-ok', type: 'button', onClick: saveEdit }, '保存'),
									),
								)
								: h('div', { className: 'dshq-bubble-comment' },
									h('span', { style: { flex: 'auto', minWidth: 0 } }, it.comment ? '💬 ' + it.comment : '（无评论）'),
									h('button', { className: 'dshq-edit-btn', type: 'button', onClick: () => startEdit(it) }, '编辑'),
								),
						),
					);
				}),
				!open && sel && selRect && h('button', {
					className: 'dshq-float',
					style: {
						left: Math.max(8, Math.min(selRect.right + 4, window.innerWidth - 140)) + 'px',
						top: Math.max(8, selRect.top - 40) + 'px',
					},
					title: '为选中文本添加评论',
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => { setOpen(true); },
				}, '💬 添加评论'),
				open && sel && selRect && h('div', {
					className: 'dshq-pop',
					style: {
						left: Math.max(8, Math.min(selRect.right + 4, window.innerWidth - 316)) + 'px',
						top: Math.max(8, selRect.bottom + 8) + 'px',
					},
				},
					h('div', { className: 'dshq-pop-label' }, '对选中文本添加评论：'),
					h('div', { className: 'dshq-pop-preview' }, sel.text),
					h('textarea', {
						className: 'dshq-pop-input',
						autoFocus: true,
						placeholder: '输入你的评论，例如：这里逻辑有问题，应该改成 X',
						value: comment,
						onChange: (e) => setComment(e.target.value),
						onKeyDown: (e) => {
							if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirm(); }
							if (e.key === 'Escape') { setOpen(false); }
						},
					}),
					h('div', { className: 'dshq-pop-actions' },
						h('button', { className: 'dshq-pop-btn dshq-pop-cancel', type: 'button', onClick: () => { setOpen(false); setComment(''); } }, '取消'),
						h('button', { className: 'dshq-pop-btn dshq-pop-ok', type: 'button', onClick: confirm }, 'OK'),
					),
				),
			);
		}
		//#endregion

		//#region InboxBadge（输入框右上角注释计数徽章 + 悬停列表）
		function InboxBadge(props) {
			const { store } = props;
			const items = useStoreItems(store);
			const [pos, setPos] = react.useState(null);
			const posKey = react.useRef('');
			const [hover, setHover] = react.useState(false);
			const [editId, setEditId] = react.useState(null);
			const [editText, setEditText] = react.useState('');
			react.useEffect(() => {
				if (typeof document === 'undefined') return;
				let raf;
				const loop = () => {
					raf = requestAnimationFrame(loop);
					try {
						const ta = document.querySelector('[data-composer-seat] textarea');
						if (!ta) {
							if (posKey.current !== 'none') { posKey.current = 'none'; setPos(null); }
							return;
						}
						const r = ta.getBoundingClientRect();
						const key = r.left + '|' + r.top + '|' + r.width + '|' + r.height;
						if (key !== posKey.current) {
							posKey.current = key;
							setPos({ left: r.right - 118, top: r.top + 4 });
						}
					} catch {
						if (posKey.current !== 'none') { posKey.current = 'none'; setPos(null); }
					}
				};
				raf = requestAnimationFrame(loop);
				return () => cancelAnimationFrame(raf);
			}, []);
			const active = items.filter((it) => it.markEl && it.markEl.isConnected);
			if (!active.length || !pos) return null;
			const removeItem = (it) => {
				restoreMark(it.markEl);
				store.remove(it.id);
				if (editId === it.id) setEditId(null);
			};
			const startEdit = (it) => {
				setEditId(it.id);
				setEditText(it.comment);
			};
			const saveEdit = () => {
				if (editId !== null) store.updateComment(editId, editText);
				setEditId(null);
			};
			const clearAll = () => {
				for (const it of items) restoreMark(it.markEl);
				store.clear();
				setHover(false);
			};
			const bubbleLeft = Math.max(8, Math.min(pos.left - 90, window.innerWidth - 316));
			const bubbleTop = pos.top + 28;
			return h('div', {
				'data-quote-ui': true,
				onMouseEnter: () => setHover(true),
				onMouseLeave: () => { if (editId === null) setHover(false); },
			},
				h('button', {
					className: 'dshq-inbox',
					style: { left: pos.left + 'px', top: pos.top + 'px' },
					title: '悬停查看注释列表',
				}, '💬 ' + active.length + ' 条注释'),
				hover && h('div', { className: 'dshq-bubble', style: { left: bubbleLeft + 'px', top: bubbleTop + 'px' } },
					h('div', { className: 'dshq-bubble-title' },
						h('span', { className: 'dshq-bubble-num' }, String(active.length)),
						h('button', { className: 'dshq-bubble-del', type: 'button', onClick: clearAll }, '清空'),
					),
					h('div', { className: 'dshq-inbox-list' },
						active.map((it) => h('div', { className: 'dshq-inbox-row', key: String(it.id) },
							editId === it.id
								? h('div', { className: 'dshq-edit-row', style: { flexDirection: 'column', alignItems: 'stretch', flex: 'auto' } },
									h('textarea', {
										className: 'dshq-edit-input',
										value: editText,
										onChange: (e) => setEditText(e.target.value),
										onKeyDown: (e) => {
											if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
											if (e.key === 'Escape') { setEditId(null); }
										},
									}),
									h('div', { className: 'dshq-pop-actions' },
										h('button', { className: 'dshq-pop-btn dshq-pop-cancel', type: 'button', onClick: () => setEditId(null) }, '取消'),
										h('button', { className: 'dshq-pop-btn dshq-pop-ok', type: 'button', onClick: saveEdit }, '保存'),
									),
								)
								: h('div', { className: 'dshq-inbox-item' },
									h('div', { className: 'dshq-inbox-text' }, it.text),
									h('div', { className: 'dshq-inbox-comment' }, it.comment ? '💬 ' + it.comment : '（无评论）'),
									h('div', { className: 'dshq-pop-actions' },
										h('button', { className: 'dshq-edit-btn', type: 'button', onClick: () => startEdit(it) }, '✏️ 编辑'),
									),
								),
							h('button', { className: 'dshq-bubble-del', type: 'button', onClick: () => removeItem(it), title: '删除该条' }, '×'),
						)),
					),
				),
			);
		}
		//#endregion

		//#region QuoteDock（草稿同步宿主：条目区重建 + 发送展开 + 恢复）
		function QuoteDock(props) {
			const { store, sessionId, input, inputActions } = props;
			if (!input || !inputActions) return null;
			const items = useStoreItems(store);
			const draftRef = react.useRef(input.draft);
			const phaseRef = react.useRef(input.phase);
			const sessionRef = react.useRef(sessionId);
			const itemsRef = react.useRef(items);
			const expandDeadline = react.useRef(0);
			react.useEffect(() => {
				draftRef.current = input.draft;
				phaseRef.current = input.phase;
				sessionRef.current = sessionId;
				itemsRef.current = items;
			});
			react.useEffect(() => {
				const mine = items.filter((it) => !it.sessionId);
				if (mine.length) {
					for (const it of mine) it.sessionId = sessionId;
					store.poke();
				}
			}, [items]);
			react.useEffect(() => {
				const mine = items.filter((it) => it.sessionId === sessionId);
				if (!mine.length) return;
				if (expandDeadline.current > Date.now()) return;
				const area = buildArea(mine);
				const draft = draftRef.current;
				if (draft.includes(area)) return;
				const base = draft.replace(ANNOT_RE, '').replace(/^\n+/, '').replace(/\n+$/, '');
				const next = base ? base + '\n\n' + area : area;
				if (next !== draft) inputActions.setDraft(next);
			}, [items]);
			react.useEffect(() => {
				if (typeof document === 'undefined') return;
				const maybeExpand = () => {
					const mine = itemsRef.current.filter((it) => it.sessionId === sessionRef.current);
					if (!mine.length) return;
					const draft = draftRef.current;
					if (!ANNOT_RE.test(draft)) return;
					const payload = mine.map((it) => it.block).join('\n\n');
					const expanded = draft.replace(ANNOT_RE, payload);
					if (expanded !== draft) {
						inputActions.setDraft(expanded);
						expandDeadline.current = Date.now() + 2500;
					}
				};
				const onKey = (e) => {
					if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
					const t = e.target;
					if (!t || !t.closest || !t.closest('[data-composer-seat]')) return;
					maybeExpand();
				};
				const onClick = (e) => {
					const t = e.target;
					if (!t || !t.closest || !t.closest('[data-composer-seat]')) return;
					if (!t.closest('button')) return;
					maybeExpand();
				};
				document.addEventListener('keydown', onKey, true);
				document.addEventListener('click', onClick, true);
				return () => {
					document.removeEventListener('keydown', onKey, true);
					document.removeEventListener('click', onClick, true);
				};
			}, []);
			react.useEffect(() => {
				let raf;
				const loop = () => {
					raf = requestAnimationFrame(loop);
					const dl = expandDeadline.current;
					if (!dl || Date.now() < dl) return;
					expandDeadline.current = 0;
					if (phaseRef.current !== 'plain') return;
					const mine = itemsRef.current.filter((it) => it.sessionId === sessionRef.current);
					if (!mine.length) return;
					const draft = draftRef.current;
					if (ANNOT_RE.test(draft)) return;
					const area = buildArea(mine);
					let base = draft.replace(ANNOT_RE, '');
					for (const it of mine) base = base.split(it.block).join('');
					base = base.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
					inputActions.setDraft(base ? base + '\n\n' + area : area);
				};
				raf = requestAnimationFrame(loop);
				return () => cancelAnimationFrame(raf);
			}, []);
			return null;
		}
		//#endregion

		//#region plugin body
		const inject = ['slots'];
		/**
		 * Client plugin body：shell.overlay 注册原文编号徽章/添加按钮（comment-float）
		 * 与输入框计数徽章（comment-inbox）；conversation.input.dock 注册草稿同步宿主（comment-collector）。
		 * @param ctx - client root context。
		 */
		function apply(ctx) {
			const slots = ctx.get('slots');
			if (slots === undefined) return;
			const store = createQuoteStore();
			ctx.slots.inject('shell.overlay', () => ctx.slots.register({
				name: 'shell.overlay',
				id: 'comment-float',
				order: 0
			}, (props) => h(FloatingButton, Object.assign({ store }, props))));
			ctx.slots.inject('shell.overlay', () => ctx.slots.register({
				name: 'shell.overlay',
				id: 'comment-inbox',
				order: 1
			}, (props) => h(InboxBadge, Object.assign({ store }, props))));
			ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
				name: 'conversation.input.dock',
				id: 'comment-collector',
				order: 30
			}, (props) => h(QuoteDock, Object.assign({ store }, props))));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
