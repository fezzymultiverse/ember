import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DaJMWN6i.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var GROUPS = [
	{
		id: "chat",
		icon: "✧",
		tone: "chat",
		title: "Chat & AI",
		blurb: "Talk, think, and work with your AI engines.",
		items: [
			{
				id: "start",
				name: "Start a conversation",
				action: "start"
			},
			{
				id: "engine",
				name: "Choose an AI engine",
				action: "engines",
				detail: "engine"
			},
			{
				id: "memory",
				name: "Memory & persona",
				action: "memory"
			}
		]
	},
	{
		id: "create",
		icon: "✦",
		tone: "create",
		title: "Create",
		blurb: "Make music, lyrics, documents, and ideas.",
		items: [
			{
				id: "music",
				name: "Create music",
				action: "music-panel",
				payload: { tab: "ai" },
				detail: "music"
			},
			{
				id: "lyrics",
				name: "Write lyrics",
				action: "music-panel",
				payload: { tab: "ai" },
				detail: "lyrics"
			},
			{
				id: "doc",
				name: "Draft a document",
				action: "docs",
				payload: { fresh: "1" }
			}
		]
	},
	{
		id: "research",
		icon: "⌕",
		tone: "research",
		title: "Research & web",
		blurb: "Search the web, browse pages, and gather sources.",
		items: [
			{
				id: "search",
				name: "Web search",
				action: "browser",
				detail: "search"
			},
			{
				id: "browser",
				name: "Open browser",
				action: "browser"
			},
			{
				id: "scrape",
				name: "Scrape a page",
				action: "scrape",
				detail: "scrape"
			}
		]
	},
	{
		id: "media",
		icon: "▷",
		tone: "media",
		title: "Media & downloads",
		blurb: "Play, find, and save audio or video.",
		items: [
			{
				id: "player",
				name: "Music player",
				action: "music-panel",
				payload: { tab: "lib" }
			},
			{
				id: "find",
				name: "Find media",
				action: "music-panel",
				payload: { tab: "get" }
			},
			{
				id: "downloads",
				name: "Downloads",
				action: "downloads"
			}
		]
	},
	{
		id: "files",
		icon: "▤",
		tone: "files",
		title: "Projects & files",
		blurb: "Keep work together and manage your outputs.",
		items: [
			{
				id: "projects",
				name: "Projects",
				action: "projects"
			},
			{
				id: "tasks",
				name: "Tasks",
				action: "tasks",
				detail: "tasks"
			},
			{
				id: "files",
				name: "Files & deliverables",
				action: "docs"
			}
		]
	},
	{
		id: "device",
		icon: "⌘",
		tone: "device",
		title: "Device & tools",
		blurb: "Connect your phone, terminal, and integrations.",
		items: [
			{
				id: "device",
				name: "Device controls",
				action: "device"
			},
			{
				id: "terminal",
				name: "Terminal",
				action: "terminal",
				detail: "terminal",
				badge: "ADVANCED"
			},
			{
				id: "github",
				name: "GitHub & integrations",
				action: "github",
				payload: { tab: "repos" },
				detail: "github"
			}
		]
	},
	{
		id: "settings",
		icon: "⚙",
		tone: "settings",
		title: "Settings & connections",
		blurb: "Manage providers, API keys, privacy, and app setup.",
		items: [
			{
				id: "keys",
				name: "AI providers & API keys",
				action: "keys"
			},
			{
				id: "perms",
				name: "Permissions & privacy",
				action: "permissions"
			},
			{
				id: "appset",
				name: "App settings",
				action: "settings"
			}
		]
	}
];
function narrow() {
	return window.matchMedia("(max-width: 760px)").matches;
}
function Home() {
	const frame = (0, import_react.useRef)(null);
	const searchRef = (0, import_react.useRef)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [pane, setPane] = (0, import_react.useState)("tools");
	const [query, setQuery] = (0, import_react.useState)("");
	const [open, setOpen] = (0, import_react.useState)({ chat: true });
	const [selected, setSelected] = (0, import_react.useState)("");
	const [detail, setDetail] = (0, import_react.useState)(null);
	const [result, setResult] = (0, import_react.useState)("");
	const [ccOpen, setCcOpen] = (0, import_react.useState)(false);
	const [metrics, setMetrics] = (0, import_react.useState)({
		online: true,
		engine: "Auto route",
		lines: []
	});
	const [engines, setEngines] = (0, import_react.useState)([]);
	const [pinned, setPinned] = (0, import_react.useState)("");
	const [timers, setTimers] = (0, import_react.useState)([]);
	const [mood, setMood] = (0, import_react.useState)("");
	const [style, setStyle] = (0, import_react.useState)("");
	const [theme, setTheme] = (0, import_react.useState)("");
	const [lyricMood, setLyricMood] = (0, import_react.useState)("");
	const [searchQ, setSearchQ] = (0, import_react.useState)("");
	const [pageUrl, setPageUrl] = (0, import_react.useState)("");
	const [minutes, setMinutes] = (0, import_react.useState)("15");
	const [reminder, setReminder] = (0, import_react.useState)("");
	function send(action, payload) {
		const win = frame.current?.contentWindow;
		if (!win) return;
		win.postMessage({
			type: "ember-nav",
			action,
			payload: payload ?? {}
		}, window.location.origin);
	}
	(0, import_react.useEffect)(() => {
		function onMessage(event) {
			if (event.origin !== window.location.origin) return;
			const data = event.data;
			if (!data || data.type !== "ember-nav" || !data.event) return;
			const payload = data.payload ?? {};
			if (data.event === "ready") {
				setReady(true);
				const metric = payload;
				if (metric && typeof metric.engine === "string") setMetrics(metric);
			} else if (data.event === "result" && typeof payload.text === "string") setResult(payload.text);
			else if (data.event === "metrics") setMetrics(payload);
			else if (data.event === "engines") {
				const list = payload.list;
				if (Array.isArray(list)) setEngines(list);
				if (typeof payload.pinned === "string") setPinned(payload.pinned);
			} else if (data.event === "timers") {
				const list = payload.timers;
				if (Array.isArray(list)) setTimers(list);
			}
		}
		window.addEventListener("message", onMessage);
		function onKey(event) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setPane("tools");
				setDetail(null);
				searchRef.current?.focus();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("message", onMessage);
			window.removeEventListener("keydown", onKey);
		};
	}, []);
	function choose(item) {
		setSelected(item.id);
		setDetail(item.detail ?? null);
		send(item.action, item.payload);
		if (narrow() && !item.detail) setPane("workspace");
	}
	const q = query.trim().toLowerCase();
	const visible = GROUPS.map((group) => {
		const head = `${group.title} ${group.blurb}`.toLowerCase().includes(q);
		const items = group.items.filter((item) => !q || head || item.name.toLowerCase().includes(q));
		return {
			group,
			items,
			show: !q || head || items.length > 0
		};
	}).filter((row) => row.show);
	function submitMusic() {
		send("ask", { text: `Write a song idea. Mood: ${mood || "warm"}. Style: ${style || "open"}. Give a title, a short arrangement, one verse and a chorus.` });
		if (narrow()) setPane("workspace");
	}
	function submitLyrics() {
		send("ask", { text: `Write lyrics about ${theme || "starting over"}. Mood: ${lyricMood || "honest"}. Use a verse and a chorus.` });
		if (narrow()) setPane("workspace");
	}
	function submitSearch() {
		send("browser", { q: searchQ || "ember" });
		if (narrow()) setPane("workspace");
	}
	function submitScrape(openTools) {
		if (openTools || !pageUrl.trim()) send("scrape", {});
		else send("scrape", { url: pageUrl.trim() });
		if (narrow()) setPane("workspace");
	}
	function submitTimer() {
		send("add-timer", {
			minutes: Number(minutes) || 15,
			note: reminder || "Reminder"
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "ember-app",
		"data-pane": pane,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "workspace",
			children: [
				!ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "workspace-boot",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "boot-top",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "boot-mark",
								children: "✦"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Ember" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Workspace" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "boot-draft",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "boot-glow",
								children: "✦"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "What would you like to do?" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Choose a category from the right panel, or ask Ember directly." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "rp-result",
								children: result
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
					ref: frame,
					className: ready ? void 0 : "booting",
					title: "Ember workspace",
					src: "/ember/index.html",
					onLoad: () => send("metrics")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "rp-reopen",
					onClick: () => setPane("tools"),
					children: "✦ Tools"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "rp",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "rp-head",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rp-brand",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Ember" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								className: "rp-logo",
								src: "/ember/ember-icon.svg",
								alt: "Ember flame logo"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rp-sub",
							children: "Your tools, organized around what you want to do."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "rp-search",
							children: ["⌕", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: searchRef,
								type: "search",
								placeholder: "Find a tool or setting",
								value: query,
								autoComplete: "off",
								onChange: (event) => {
									setQuery(event.target.value);
									setDetail(null);
								}
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rp-result",
							"aria-live": "polite",
							children: result
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rp-list",
					children: [detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Detail, {
						detail,
						engines,
						pinned,
						timers,
						mood,
						styleName: style,
						theme,
						lyricMood,
						searchQ,
						pageUrl,
						minutes,
						reminder,
						onMood: setMood,
						onStyle: setStyle,
						onTheme: setTheme,
						onLyricMood: setLyricMood,
						onSearchQ: setSearchQ,
						onPageUrl: setPageUrl,
						onMinutes: setMinutes,
						onReminder: setReminder,
						onBack: () => setDetail(null),
						onPin: (id) => send("pin", { id }),
						onKeys: () => {
							send("keys");
							if (narrow()) setPane("workspace");
						},
						onMusic: submitMusic,
						onOpenPlayer: () => {
							send("music-panel", { tab: "lib" });
							if (narrow()) setPane("workspace");
						},
						onLyrics: submitLyrics,
						onSearch: submitSearch,
						onScrape: submitScrape,
						onTimer: submitTimer,
						onCancel: (id) => send("cancel-timer", { id }),
						onTerminal: () => {
							send("terminal");
							if (narrow()) setPane("workspace");
						},
						onTermux: () => {
							send("termux");
							if (narrow()) setPane("workspace");
						},
						onGithub: (tab) => {
							send("github", { tab });
							if (narrow()) setPane("workspace");
						}
					}) : visible.map(({ group, items }) => {
						const expanded = Boolean(q) || Boolean(open[group.id]);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: expanded ? "rp-group open" : "rp-group",
							"data-tone": group.tone,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "rp-group-head",
								"aria-expanded": expanded,
								onClick: () => setOpen((prev) => ({
									...prev,
									[group.id]: !prev[group.id]
								})),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rp-icon",
										children: group.icon
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rp-label",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: group.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: group.blurb })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rp-chev",
										children: "⌄"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rp-items",
								children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: selected === item.id ? "rp-item selected" : "rp-item",
									onClick: () => choose(item),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.name }), item.badge ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rp-badge",
										children: item.badge
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "›" })]
								}, item.id))
							})]
						}, group.id);
					}), !detail && visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rp-sub",
						children: "No tools match that."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
					className: "rp-bottom",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: ccOpen ? "rp-cc expanded" : "rp-cc",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "rp-cc-head",
							"aria-expanded": ccOpen,
							onClick: () => setCcOpen((v) => !v),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rp-cc-icon",
									children: "◫"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rp-cc-title",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Command Centre" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Workspace status · activity · routing" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rp-live",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "rp-dot" }),
										" ",
										metrics.online ? "READY" : "OFFLINE"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rp-cc-arrow",
									children: "⌃"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rp-cc-body",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rp-metrics",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rp-metric",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "WORKSPACE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: metrics.online ? "Ember · Online" : "Ember · Offline" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rp-metric",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "ACTIVE ENGINE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: metrics.engine || "Auto route" })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rp-log",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "●" }),
										" ",
										metrics.lines[0] || "Ready for your next request",
										"\n",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rp-log-dim",
											children: metrics.lines[1] || "No active jobs right now"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rp-cc-actions",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setCcOpen(true);
												send("cc-activity");
												if (narrow()) setPane("workspace");
											},
											children: "Activity log"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setCcOpen(true);
												send("cc-routing");
											},
											children: "Engine routing"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setCcOpen(true);
												send("cc-status");
											},
											children: "Status"
										})
									]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rp-foot",
						children: "Tap a category to browse · Tap Command Centre to expand"
					})]
				})
			]
		})]
	});
}
function Detail(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rp-detail",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "rp-back",
				onClick: props.onBack,
				children: "‹ All tools"
			}),
			props.detail === "engine" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Choose an AI engine" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Pin who answers first. Auto falls through if that engine cannot." }),
				(props.engines.length ? props.engines : [{
					id: "",
					name: "Auto route",
					hint: "Loading engines…"
				}]).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: props.pinned === row.id ? "rp-choice on" : "rp-choice",
					onClick: () => props.onPin(row.id),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [row.name, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: row.hint })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.pinned === row.id ? "●" : "›" })]
				}, row.id || "auto")),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rp-actions",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: props.onKeys,
						children: "Open key settings"
					})
				})
			] }),
			props.detail === "music" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Create music" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Ember drafts the idea in chat and opens the music studio." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["Mood", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.mood,
						onChange: (e) => props.onMood(e.target.value),
						placeholder: "late night, hopeful"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["Style", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.styleName,
						onChange: (e) => props.onStyle(e.target.value),
						placeholder: "lo-fi, choir, guitar"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rp-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: props.onMusic,
						children: "Ask Ember"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: props.onOpenPlayer,
						children: "Open player"
					})]
				})
			] }),
			props.detail === "lyrics" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Write lyrics" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Sends a lyrics request into the conversation." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["About", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						rows: 3,
						value: props.theme,
						onChange: (e) => props.onTheme(e.target.value),
						placeholder: "a drive home after the rain"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["Mood", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.lyricMood,
						onChange: (e) => props.onLyricMood(e.target.value),
						placeholder: "quiet, direct"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rp-actions",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: props.onLyrics,
						children: "Write lyrics"
					})
				})
			] }),
			props.detail === "search" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Web search" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Opens the browser and reads the results." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["Search", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.searchQ,
						onChange: (e) => props.onSearchQ(e.target.value),
						placeholder: "What do you want to look up?",
						onKeyDown: (e) => {
							if (e.key === "Enter") props.onSearch();
						}
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rp-actions",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: props.onSearch,
						children: "Search"
					})
				})
			] }),
			props.detail === "scrape" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Scrape a page" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Read a public page, or open the scraping keys and tests." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["Page", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.pageUrl,
						onChange: (e) => props.onPageUrl(e.target.value),
						placeholder: "https://example.com"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rp-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: () => props.onScrape(false),
						children: "Read page"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => props.onScrape(true),
						children: "Scraper settings"
					})]
				})
			] }),
			props.detail === "tasks" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Tasks" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Reminders fire while Ember is open. They are saved on this device." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["In minutes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						inputMode: "numeric",
						value: props.minutes,
						onChange: (e) => props.onMinutes(e.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "rp-field",
					children: ["Note", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: props.reminder,
						onChange: (e) => props.onReminder(e.target.value),
						placeholder: "Stretch, check the build…"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rp-actions",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: props.onTimer,
						children: "Set reminder"
					})
				}),
				props.timers.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No reminders yet." }),
				props.timers.map((timer) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rp-timer",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [timer.note, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: timer.fires })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => props.onCancel(timer.id),
						children: "Cancel"
					})]
				}, timer.id))
			] }),
			props.detail === "terminal" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Terminal" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Live tool output sits under the chat. Termux is the advanced persona and docked terminal." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rp-actions",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "primary",
						onClick: props.onTerminal,
						children: "Live terminal"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: props.onTermux,
						children: "Termux tools"
					})]
				})
			] }),
			props.detail === "github" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "GitHub & integrations" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Brain, search, and Run & Push stay behind the existing confirmation gates." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rp-actions",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => props.onGithub("connect"),
							children: "Brain"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "primary",
							onClick: () => props.onGithub("repos"),
							children: "Search"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => props.onGithub("build"),
							children: "Run & Push"
						})
					]
				})
			] })
		]
	});
}
//#endregion
export { Home as component };
