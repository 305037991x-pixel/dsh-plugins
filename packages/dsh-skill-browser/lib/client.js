window.__ModuleLoader__.load({
	id: "dsh-skill-browser",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region SkillBrowser.module.css
		const css = ".skillBrowser_action{box-sizing:border-box;width:36px;height:36px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:8px;justify-content:center;align-items:center;display:inline-flex;flex:none}.skillBrowser_action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.skillBrowser_action[data-open=true]{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}.skillBrowser_actionWide{box-sizing:border-box;width:100%;height:36px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:10px;padding:4px 12px;display:flex;flex:none}.skillBrowser_actionWide:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.skillBrowser_actionWide[data-open=true]{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}.skillBrowser_actionLabel{min-width:0;text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:13px;line-height:24px;overflow:hidden}.skillBrowser_overlay{box-sizing:border-box;pointer-events:auto;position:absolute;left:76px;bottom:12px;width:420px;max-width:calc(100vw - 88px);max-height:min(600px,calc(100vh - 24px));color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:var(--dsw-shadow-lv2);flex-direction:column;display:flex;overflow:hidden}.skillBrowser_overlayHead{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;height:40px;align-items:center;gap:8px;padding:0 8px 0 14px;display:flex}.skillBrowser_overlayTitle{color:var(--dsw-alias-label-primary);flex:auto;font-size:13px;font-weight:500;line-height:20px;align-items:center;gap:6px;display:flex}.skillBrowser_overlayClose{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:8px;justify-content:center;align-items:center;display:inline-flex;flex:none}.skillBrowser_overlayClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.skillBrowser_overlayBody{min-height:0;flex:auto;flex-direction:column;padding:8px;display:flex}.skillBrowser_filter{box-sizing:border-box;width:100%;height:28px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;outline:0;padding:0 8px;font-size:13px;line-height:20px;margin-bottom:6px;flex:none}.skillBrowser_filter:focus{border-color:var(--dsw-alias-state-business-primary)}.skillBrowser_list{max-height:min(440px,calc(100vh - 240px));margin:0;padding:0;list-style:none;overflow-y:auto}.skillBrowser_row{box-sizing:border-box;border-radius:8px;align-items:flex-start;gap:8px;width:100%;min-height:36px;padding:5px 4px 5px 8px;display:flex}.skillBrowser_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.skillBrowser_info{min-width:0;flex:1}.skillBrowser_name{color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);word-break:break-all;font-size:12px;line-height:18px}.skillBrowser_badge{color:var(--dsw-alias-label-caption);border:1px solid var(--dsw-alias-border-l2);border-radius:4px;margin-left:6px;padding:0 4px;font-size:11px;line-height:16px;display:inline-block;vertical-align:1px}.skillBrowser_badgeRec{color:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-secondary);background:var(--dsw-alias-state-business-tertiary)}.skillBrowser_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.skillBrowser_actions{flex:none;align-self:center;gap:2px;display:flex}.skillBrowser_open{height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:var(--dsw-alias-interactive-bg-hover-solid);border:none;border-radius:6px;padding:0 10px;font-size:12px;line-height:24px}.skillBrowser_open:hover{color:var(--dsw-alias-label-primary)}.skillBrowser_small{height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:0 8px;font-size:12px;line-height:24px}.skillBrowser_small:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}.skillBrowser_smallDanger:hover{color:var(--dsw-alias-state-error-primary)}.skillBrowser_smallConfirm{color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-secondary)}.skillBrowser_hint{color:var(--dsw-alias-label-caption);flex:none;font-size:11px;line-height:16px;padding:6px 8px 0}.skillBrowser_update{flex:none;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:var(--dsw-alias-interactive-bg-hover-solid);border:none;border-radius:8px;padding:0 12px;font-size:12px;line-height:28px}.skillBrowser_update:hover{color:var(--dsw-alias-label-primary)}.skillBrowser_empty{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;padding:8px}.skillBrowser_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:20px;padding:8px}.skillBrowser_retry{margin-left:6px;color:var(--dsw-alias-state-business-primary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px}";
		const tagId = "dsh-skill-browser/SkillBrowser.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-skill-browser";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const cssMap = {
			action: "skillBrowser_action",
			actionWide: "skillBrowser_actionWide",
			actionLabel: "skillBrowser_actionLabel",
			overlay: "skillBrowser_overlay",
			overlayHead: "skillBrowser_overlayHead",
			overlayTitle: "skillBrowser_overlayTitle",
			overlayClose: "skillBrowser_overlayClose",
			update: "skillBrowser_update",
			overlayBody: "skillBrowser_overlayBody",
			filter: "skillBrowser_filter",
			list: "skillBrowser_list",
			row: "skillBrowser_row",
			info: "skillBrowser_info",
			name: "skillBrowser_name",
			badge: "skillBrowser_badge",
			badgeRec: "skillBrowser_badgeRec",
			desc: "skillBrowser_desc",
			actions: "skillBrowser_actions",
			open: "skillBrowser_open",
			small: "skillBrowser_small",
			smallDanger: "skillBrowser_smallDanger",
			smallConfirm: "skillBrowser_smallConfirm",
			hint: "skillBrowser_hint",
			empty: "skillBrowser_empty",
			error: "skillBrowser_error",
			retry: "skillBrowser_retry"
		};
		//#endregion

		//#region locales
		const NS = "skillBrowser";
		const zh = {
			"dock.label": "技能",
			"dock.count": "{count} 个技能",
			"dock.loading": "技能加载中…",
			"dock.empty": "没有可用技能",
			"dock.nosession": "请先打开一个会话",
			"dock.error": "技能列表加载失败",
			"dock.retry": "重试",
			"dock.open": "打开",
			"dock.userOnly": "仅用户",
			"dock.recommended": "推荐",
			"dock.filter": "筛选技能…",
			"dock.openHint": "把 /{name} 写入输入框",
			"dock.disable": "禁用",
			"dock.delete": "删除",
			"dock.confirmDelete": "确认删除?",
			"dock.disableHint": "从技能目录隐藏（文件保留，可恢复）",
			"dock.deleteHint": "移入回收目录（可恢复）",
			"dock.recoverHint": "已禁用/删除的技能可恢复：直接说「恢复技能 xxx」",
			"dock.update": "一键更新",
			"dock.updateHint": "检查并更新已安装技能（需联网）",
			"dock.close": "关闭"
		};
		const en = {
			"dock.label": "Skills",
			"dock.count": "{count} skills",
			"dock.loading": "Loading skills…",
			"dock.empty": "No skills available",
			"dock.nosession": "Open a session first",
			"dock.error": "Failed to load skills",
			"dock.retry": "Retry",
			"dock.open": "Open",
			"dock.userOnly": "user-only",
			"dock.recommended": "Recommended",
			"dock.filter": "Filter skills…",
			"dock.openHint": "Insert /{name} into the input",
			"dock.disable": "Disable",
			"dock.delete": "Delete",
			"dock.confirmDelete": "Confirm delete?",
			"dock.disableHint": "Hide from the catalog (files kept, recoverable)",
			"dock.deleteHint": "Move to the trash folder (recoverable)",
			"dock.recoverHint": "Recover disabled/deleted skills by saying \"recover skill xxx\"",
			"dock.update": "Update",
			"dock.updateHint": "Check and update installed skills (needs network)",
			"dock.close": "Close"
		};
		//#endregion

		//#region recommended list（推荐技能，可自行增删；显示在面板顶部并打「推荐」标）
		const RECOMMENDED = [
			"claude-vision-skill",
			"find-skills",
			"video-frames",
			"ui-ux-pro-max",
			"frontend-design",
			"parallel-deep-research",
			"brainstorming",
			"writing-plans",
			"executing-plans",
			"skill-vetter",
			"skill-creator",
			"session-logs",
			"git-essentials",
			"clawdefender"
		];
		//#endregion

		//#region shared store（侧边栏按钮与浮层面板共享开合状态）
		const uiStore = {
			open: false,
			listeners: new Set(),
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			},
			getSnapshot() {
				return this.open;
			},
			set(value) {
				if (this.open !== value) {
					this.open = value;
					for (const listener of [...this.listeners]) {
						try {
							listener();
						} catch (error) {
							console.error("[skill-browser] store listener failed:", error);
						}
					}
				}
			},
			toggle() {
				this.set(!this.open);
			}
		};
		const useOpen = () => react.useSyncExternalStore(uiStore.subscribe.bind(uiStore), uiStore.getSnapshot.bind(uiStore));
		//#endregion

		//#region SkillBrowserAction（侧边栏脚部按钮）
		/**
		 * 侧边栏脚部「技能」开关：折叠栏显示图标，展开栏显示 图标+文字。
		 * @param props - { wide, t }
		 */
		function SkillBrowserAction(props) {
			const { wide, t } = props;
			const open = useOpen();
			const glyph = react_jsx_runtime.jsx(primitives.IconSkillOutline16, { size: 16 });
			const button = react_jsx_runtime.jsx("button", {
				type: "button",
				"aria-label": t("dock.label"),
				"aria-expanded": open,
				className: wide ? cssMap.actionWide : cssMap.action,
				"data-open": open,
				onClick: () => uiStore.toggle(),
				children: wide
					? react_jsx_runtime.jsxs("span", {
						className: cssMap.actionLabel,
						children: [glyph, " ", t("dock.label")]
					})
					: glyph
			});
			if (primitives.Tooltip !== undefined && !wide) {
				return react_jsx_runtime.jsx(primitives.Tooltip, {
					label: t("dock.label"),
					side: "right",
					delayMs: 400,
					children: button
				});
			}
			return button;
		}
		//#endregion

		//#region SkillBrowserPanel（浮层面板）
		/**
		 * shell.overlay 里的技能面板：打开时列出当前会话可调用的技能，
		 * 支持过滤与「打开」（把 /技能名 写入输入框并关闭面板）。
		 * @param props - 标准 props（t、useSessions）+ inject 注入的 listSkills / writeDraft
		 */
		function SkillBrowserPanel(props) {
			const { t, useSessions, listSkills, writeDraft, submitDraft } = props;
			const open = useOpen();
			const sessionId = typeof useSessions === "function" ? useSessions((s) => s.current) : undefined;
			const [skills, setSkills] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [query, setQuery] = react.useState("");
			const [confirmDelete, setConfirmDelete] = react.useState(null);

			/** 禁用指令：加到 SKILL.md frontmatter 即可让技能从目录消失（文件保留，可恢复）。 */
			const disableDirective = (name) =>
				`【禁用技能】${name}：编辑它的 SKILL.md frontmatter，添加 disable-model-invocation: true 和 user-invocable: false（其余内容保持不变），完成后确认它从技能目录消失。`;
			/** 删除指令：整个目录移入回收目录（可恢复），不物理删除。 */
			const deleteDirective = (name) =>
				`【删除技能】${name}：把它的整个技能目录移动到 C:\\Users\\180458\\.agents\\skills\\_trash\\ 下（保留文件，可恢复），完成后确认。`;
			/** 一键更新指令：提交给模型执行技能更新流程（只更新当前启用的技能，不碰已删除/已禁用的）。 */
			const updateDirective =
				"【一键更新技能】请执行技能更新流程（只更新当前启用的技能，不更新已删除/_trash 回收目录里或已禁用的技能）：① 运行 npx skills check 查看可更新项；② 有可更新项则运行 npx skills update 更新（.skill-lock.json 管理的技能：find-skills、frontend-design）；③ 检查 C:\\Users\\180458\\.agents\\skills 下当前启用的、带 _meta.json 的版本化技能是否有可用的更新工具，有则更新（跳过 _trash 回收目录）；④ 完成后汇报：更新了哪些技能、当前技能目录是否有变化。缺工具或断网则跳过并说明。";

			const load = react.useCallback(() => {
				setSkills(null);
				setError(null);
				if (sessionId === undefined) return;
				listSkills(sessionId).then((payload) => {
					if (!payload.result.ok) throw new Error(`${payload.result.error.code}: ${payload.result.error.message}`);
					setSkills(payload.result.value.skills);
				}).catch((e) => {
					setError(e && e.message ? e.message : String(e));
				});
			}, [sessionId, listSkills]);

			react.useEffect(() => {
				if (open) load();
			}, [open, load]);

			react.useEffect(() => {
				if (!open) return undefined;
				const onKey = (event) => {
					if (event.key === "Escape") uiStore.set(false);
				};
				document.addEventListener("keydown", onKey);
				return () => document.removeEventListener("keydown", onKey);
			}, [open]);

			if (!open) return null;

			const count = skills === null ? 0 : skills.length;
			const q = query.trim().toLowerCase();
			const all = skills ?? [];
			const order = (a, b) => {
				const ra = RECOMMENDED.includes(a.name) ? 0 : 1;
				const rb = RECOMMENDED.includes(b.name) ? 0 : 1;
				if (ra !== rb) return ra - rb;
				return a.name.localeCompare(b.name);
			};
			const filtered = all.filter((s) => q === "" || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).sort(order);

			const openButton = (name) => {
				const hint = t("dock.openHint", { name });
				const inner = react_jsx_runtime.jsx("button", {
					type: "button",
					className: cssMap.open,
					onClick: () => {
						writeDraft(sessionId, "/" + name + " ");
						uiStore.set(false);
					},
					children: t("dock.open")
				});
				if (primitives.Tooltip !== undefined) {
					return react_jsx_runtime.jsx(primitives.Tooltip, {
						label: hint,
						side: "left",
						delayMs: 400,
						children: inner
					});
				}
				return inner;
			};

			const disableButton = (name) => {
				const inner = react_jsx_runtime.jsx("button", {
					type: "button",
					className: cssMap.small,
					onClick: () => {
						writeDraft(sessionId, disableDirective(name));
						uiStore.set(false);
					},
					children: t("dock.disable")
				});
				if (primitives.Tooltip !== undefined) {
					return react_jsx_runtime.jsx(primitives.Tooltip, {
						label: t("dock.disableHint"),
						side: "left",
						delayMs: 400,
						children: inner
					});
				}
				return inner;
			};

			const deleteButton = (name) => {
				const confirming = confirmDelete === name;
				const inner = react_jsx_runtime.jsx("button", {
					type: "button",
					className: `${cssMap.small} ${cssMap.smallDanger}${confirming ? " " + cssMap.smallConfirm : ""}`,
					onClick: () => {
						if (!confirming) {
							setConfirmDelete(name);
							return;
						}
						writeDraft(sessionId, deleteDirective(name));
						setConfirmDelete(null);
						uiStore.set(false);
					},
					children: confirming ? t("dock.confirmDelete") : t("dock.delete")
				});
				if (primitives.Tooltip !== undefined && !confirming) {
					return react_jsx_runtime.jsx(primitives.Tooltip, {
						label: t("dock.deleteHint"),
						side: "left",
						delayMs: 400,
						children: inner
					});
				}
				return inner;
			};

			const rowActions = (name) => react_jsx_runtime.jsx("div", {
				className: cssMap.actions,
				children: [openButton(name), disableButton(name), deleteButton(name)]
			});

			const list = sessionId === undefined
				? react_jsx_runtime.jsx("div", { className: cssMap.empty, children: t("dock.nosession") })
				: error !== null
					? react_jsx_runtime.jsx("div", {
						className: cssMap.error,
						children: [error, react_jsx_runtime.jsx("button", {
							type: "button",
							className: cssMap.retry,
							onClick: load,
							children: t("dock.retry")
						})]
					})
					: skills === null
						? react_jsx_runtime.jsx("div", { className: cssMap.empty, children: t("dock.loading") })
						: filtered.length === 0
							? react_jsx_runtime.jsx("div", { className: cssMap.empty, children: t("dock.empty") })
							: react_jsx_runtime.jsx("ul", {
								className: cssMap.list,
								children: filtered.map((s) => react_jsx_runtime.jsx("li", {
									className: cssMap.row,
									children: [
										react_jsx_runtime.jsx("div", {
											className: cssMap.info,
											children: [
												react_jsx_runtime.jsx("div", {
													className: cssMap.name,
													children: [
														s.name,
														RECOMMENDED.includes(s.name) ? react_jsx_runtime.jsx("span", { className: `${cssMap.badge} ${cssMap.badgeRec}`, children: t("dock.recommended") }) : null,
														s.modelInvocable ? null : react_jsx_runtime.jsx("span", { className: cssMap.badge, children: t("dock.userOnly") })
													]
												}),
												s.description !== "" ? react_jsx_runtime.jsx("div", { className: cssMap.desc, children: s.description }) : null
											]
										}),
										rowActions(s.name)
									]
								}, s.name))
							});

			return react_jsx_runtime.jsxs("div", {
				className: cssMap.overlay,
				"data-skill-browser-panel": "",
				children: [
					react_jsx_runtime.jsxs("div", {
						className: cssMap.overlayHead,
						children: [
							react_jsx_runtime.jsx("span", {
								className: cssMap.overlayTitle,
								children: [react_jsx_runtime.jsx(primitives.IconSkillOutline16, { size: 14 }), t("dock.label"), react_jsx_runtime.jsx("span", { children: `(${count})` })]
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: cssMap.update,
								title: t("dock.updateHint"),
								onClick: () => {
									if (sessionId === undefined) return;
									writeDraft(sessionId, updateDirective);
									submitDraft(sessionId);
									uiStore.set(false);
								},
								children: t("dock.update")
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: cssMap.overlayClose,
								"aria-label": t("dock.close"),
								onClick: () => uiStore.set(false),
								children: react_jsx_runtime.jsx(primitives.IconCloseOutline16, { size: 14 })
							})
						]
					}),
					react_jsx_runtime.jsxs("div", {
						className: cssMap.overlayBody,
						children: [
							react_jsx_runtime.jsx("input", {
								className: cssMap.filter,
								type: "text",
								value: query,
								placeholder: t("dock.filter"),
								"aria-label": t("dock.filter"),
								onChange: (e) => {
									setQuery(e.target.value);
									setConfirmDelete(null);
								}
							}),
							list,
							react_jsx_runtime.jsx("div", { className: cssMap.hint, children: t("dock.recoverHint") })
						]
					})
				]
			});
		}
		//#endregion

		//#region plugin body
		const inject = ["slots", "connection", "sessions", "locale"];
		/**
		 * Client plugin body：侧边栏脚部注册「技能」按钮（sidebar.footer.action），
		 * 浮层注册技能面板（shell.overlay）；两者通过 uiStore 共享开合状态。
		 * @param ctx - client root context。
		 */
		function SkillBrowserSettingsSection(props) {
			const { t } = props;
			const connection = props.connection;
			const sessions = props.sessions;
			const useSessions = sessions && typeof sessions.useSessions === "function" ? sessions.useSessions : null;
			const current = useSessions ? useSessions((s) => s.current) : undefined;
			const sessionId = current;
			const [skills, setSkills] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [query, setQuery] = react.useState("");
			const [confirmDelete, setConfirmDelete] = react.useState(null);
			const disableDirective = (name) =>
				`【禁用技能】` + name + `：编辑它的 SKILL.md frontmatter，添加 disable-model-invocation: true 和 user-invocable: false（其余内容保持不变），完成后确认它从技能目录消失。`;
			const deleteDirective = (name) =>
				`【删除技能】` + name + `：把它的整个技能目录移动到 C:\\Users\\180458\\.agents\\skills\\_trash\\ 下（保留文件，可恢复），完成后确认。`;
			const updateDirective =
				"【一键更新技能】请执行技能更新流程（只更新当前启用的技能，不更新已删除/_trash 回收目录里或已禁用的技能）：① 运行 npx skills check 查看可更新项；② 有可更新项则运行 npx skills update 更新；③ 完成后汇报。";
			const load = react.useCallback(() => {
				setSkills(null); setError(null);
				// settings 页无会话时用任意会话兜底
				let sid = sessionId;
				if (sid === undefined && sessions && typeof sessions.list === "function") {
					const all = sessions.list();
					if (all && all.length > 0) sid = all[0].header ? all[0].header.id : all[0].id;
					if (sid === undefined) {
						try { const ids = Object.keys(sessions); if (ids.length) sid = ids[0]; } catch(e){}
					}
				}
				if (sid === undefined) return;
				const api = connection && connection.api && connection.api.skills;
				if (!api) { setError("connection not ready"); return; }
				api.list({ sessionId: sid }).then((payload) => {
					if (!payload.result.ok) throw new Error(`${payload.result.error.code}: ${payload.result.error.message}`);
					setSkills(payload.result.value.skills);
				}).catch((e) => setError(e && e.message ? e.message : String(e)));
			}, [sessionId, connection, sessions]);
			react.useEffect(() => { load(); }, [load]);
			const count = skills === null ? 0 : skills.length;
			const q = query.trim().toLowerCase();
			const all = skills ?? [];
			const filtered = all.filter((s) => q === "" || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).sort((a,b)=>{
				const ra = RECOMMENDED.includes(a.name)?0:1, rb=RECOMMENDED.includes(b.name)?0:1;
				if(ra!==rb) return ra-rb; return a.name.localeCompare(b.name);
			});
			const list = !connection ? react_jsx_runtime.jsx("div", { className: cssMap.empty, children: "连接未就绪" })
				: error !== null ? react_jsx_runtime.jsx("div", { className: cssMap.error, children: [error, react_jsx_runtime.jsx("button", { type:"button", className: cssMap.retry, onClick: load, children: t("dock.retry") })] })
				: skills === null ? react_jsx_runtime.jsx("div", { className: cssMap.empty, children: t("dock.loading") })
				: filtered.length === 0 ? react_jsx_runtime.jsx("div", { className: cssMap.empty, children: t("dock.empty") })
				: react_jsx_runtime.jsx("ul", { className: cssMap.list, children: filtered.map((s)=> react_jsx_runtime.jsx("li",{className: cssMap.row, children:[
					react_jsx_runtime.jsx("div",{className: cssMap.info, children:[
						react_jsx_runtime.jsx("div",{className: cssMap.name, children:[s.name, RECOMMENDED.includes(s.name)? react_jsx_runtime.jsx("span",{className: cssMap.badge+ " " + cssMap.badgeRec, children: t("dock.recommended")}):null, s.modelInvocable?null: react_jsx_runtime.jsx("span",{className: cssMap.badge, children: t("dock.userOnly")})]}),
						s.description!==""? react_jsx_runtime.jsx("div",{className: cssMap.desc, children: s.description}):null
					]}),
					react_jsx_runtime.jsx("div",{className: cssMap.actions, children:[
						react_jsx_runtime.jsx("button",{type:"button", className: cssMap.open, onClick:()=>{
							if(!sessionId) return;
							const actx=sessions.scope(sessionId); if(!actx) return;
							const conv=actx.get("conversation"); if(!conv) return;
							conv.input.for(actx).setDraft("/"+s.name+" ");
						}, children: t("dock.open")}),
						react_jsx_runtime.jsx("button",{type:"button", className: cssMap.small, onClick:()=>{
							if(!sessionId) return;
							const actx=sessions.scope(sessionId); if(!actx) return;
							actx.get("conversation").input.for(actx).setDraft(`【禁用技能】`+s.name+`：编辑它的 SKILL.md frontmatter，添加 disable-model-invocation: true 和 user-invocable: false，完成后确认。`);
						}, children: t("dock.disable")})
					]})
				]}, s.name))});
			return react_jsx_runtime.jsxs("div",{children:[
				react_jsx_runtime.jsxs("div",{className: cssMap.overlayHead, children:[
					react_jsx_runtime.jsxs("span",{className: cssMap.overlayTitle, children:[react_jsx_runtime.jsx(primitives.IconSkillOutline16,{size:14}), " ", t("dock.label"), react_jsx_runtime.jsx("span",{children:` (${count})`})]}),
					react_jsx_runtime.jsx("button",{type:"button", className: cssMap.update, onClick:()=>{
						if(!sessionId) return;
						const actx=sessions.scope(sessionId); if(!actx) return;
						const conv=actx.get("conversation"); if(!conv) return;
						conv.input.for(actx).setDraft(updateDirective); conv.input.for(actx).actions.submit();
					}, children: t("dock.update")})
				]}),
				react_jsx_runtime.jsx("input",{className: cssMap.filter, type:"text", value: query, placeholder: t("dock.filter"), onChange:(e)=>{setQuery(e.target.value); setConfirmDelete(null);}}),
				list
			]});
		}

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "skill-browser: dictionaries");
			// 设置页：齿轮→设置 新增「技能」区
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skill-browser",
				order: 8,
				label: () => ctx.locale.bind(NS)("dock.label"),
				locale: NS
			}, (props) => react_jsx_runtime.jsx(SkillBrowserSettingsSection, { t: props.t, connection: ctx.get("connection"), sessions: ctx.get("sessions") })));
			// 侧边栏：保留原有入口（用户之前说显示有问题，仅保留设置入口会导致无会话时看不到；此处保留两者，互不冲突）
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "skill-browser",
				order: 0,
				locale: NS
			}, SkillBrowserAction));

			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "skill-browser",
				order: 100,
				locale: NS,
				inject: () => {
					const connection = ctx.get("connection");
					const sessions = ctx.get("sessions");
					if (connection === undefined || sessions === undefined) {
						return {
							listSkills: async () => ({ result: { ok: false, error: { code: "not_ready", message: "connection not ready" } } }),
							writeDraft: () => {},
							submitDraft: () => {}
						};
					}
					return {
						listSkills: (sessionId) => connection.api.skills.list({ sessionId }),
						writeDraft: (sessionId, text) => {
							const actx = sessions.scope(sessionId);
							if (actx === undefined) return;
							const conversation = actx.get("conversation");
							if (conversation === undefined) return;
							const input = conversation.input.for(actx);
							const draft = input.snapshot.draft;
							input.setDraft(draft === "" ? text : draft + " " + text);
						},
						submitDraft: (sessionId) => {
							const actx = sessions.scope(sessionId);
							if (actx === undefined) return;
							const conversation = actx.get("conversation");
							if (conversation === undefined) return;
							const input = conversation.input.for(actx);
							input.actions.submit();
						}
					};
				}
			}, SkillBrowserPanel));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
