import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

type DetailId = "engine" | "music" | "lyrics" | "search" | "scrape" | "tasks" | "terminal" | "github";

type Item = {
  id: string;
  name: string;
  action: string;
  payload?: Record<string, string>;
  detail?: DetailId;
  badge?: string;
};

type Group = {
  id: string;
  icon: string;
  tone: string;
  title: string;
  blurb: string;
  items: Item[];
};

type EngineRow = { id: string; name: string; hint: string };
type TimerRow = { id: string; note: string; fires: string };
type Metrics = { online: boolean; engine: string; lines: string[] };

const GROUPS: Group[] = [
  {
    id: "chat",
    icon: "✧",
    tone: "chat",
    title: "Chat & AI",
    blurb: "Talk, think, and work with your AI engines.",
    items: [
      { id: "start", name: "Start a conversation", action: "start" },
      { id: "engine", name: "Choose an AI engine", action: "engines", detail: "engine" },
      { id: "memory", name: "Memory & persona", action: "memory" },
    ],
  },
  {
    id: "create",
    icon: "✦",
    tone: "create",
    title: "Create",
    blurb: "Make music, lyrics, documents, and ideas.",
    items: [
      { id: "music", name: "Create music", action: "music-panel", payload: { tab: "ai" }, detail: "music" },
      { id: "lyrics", name: "Write lyrics", action: "music-panel", payload: { tab: "ai" }, detail: "lyrics" },
      { id: "doc", name: "Draft a document", action: "docs", payload: { fresh: "1" } },
    ],
  },
  {
    id: "research",
    icon: "⌕",
    tone: "research",
    title: "Research & web",
    blurb: "Search the web, browse pages, and gather sources.",
    items: [
      { id: "search", name: "Web search", action: "browser", detail: "search" },
      { id: "browser", name: "Open browser", action: "browser" },
      { id: "scrape", name: "Scrape a page", action: "scrape", detail: "scrape" },
    ],
  },
  {
    id: "media",
    icon: "▷",
    tone: "media",
    title: "Media & downloads",
    blurb: "Play, find, and save audio or video.",
    items: [
      { id: "player", name: "Music player", action: "music-panel", payload: { tab: "lib" } },
      { id: "find", name: "Find media", action: "music-panel", payload: { tab: "get" } },
      { id: "downloads", name: "Downloads", action: "downloads" },
    ],
  },
  {
    id: "files",
    icon: "▤",
    tone: "files",
    title: "Projects & files",
    blurb: "Keep work together and manage your outputs.",
    items: [
      { id: "projects", name: "Projects", action: "projects" },
      { id: "tasks", name: "Tasks", action: "tasks", detail: "tasks" },
      { id: "files", name: "Files & deliverables", action: "docs" },
    ],
  },
  {
    id: "device",
    icon: "⌘",
    tone: "device",
    title: "Device & tools",
    blurb: "Connect your phone, terminal, and integrations.",
    items: [
      { id: "device", name: "Device controls", action: "device" },
      { id: "terminal", name: "Terminal", action: "terminal", detail: "terminal", badge: "ADVANCED" },
      { id: "github", name: "GitHub & integrations", action: "github", payload: { tab: "repos" }, detail: "github" },
    ],
  },
  {
    id: "settings",
    icon: "⚙",
    tone: "settings",
    title: "Settings & connections",
    blurb: "Manage providers, API keys, privacy, and app setup.",
    items: [
      { id: "keys", name: "AI providers & API keys", action: "keys" },
      { id: "perms", name: "Permissions & privacy", action: "permissions" },
      { id: "appset", name: "App settings", action: "settings" },
    ],
  },
];

function narrow() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function Home() {
  const frame = useRef<HTMLIFrameElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [pane, setPane] = useState<"tools" | "workspace">("tools");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ chat: true });
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<DetailId | null>(null);
  const [result, setResult] = useState("");
  const [ccOpen, setCcOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({ online: true, engine: "Auto route", lines: [] });
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [pinned, setPinned] = useState("");
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [mood, setMood] = useState("");
  const [style, setStyle] = useState("");
  const [theme, setTheme] = useState("");
  const [lyricMood, setLyricMood] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [minutes, setMinutes] = useState("15");
  const [reminder, setReminder] = useState("");

  function send(action: string, payload?: Record<string, string | number>) {
    const win = frame.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "ember-nav", action, payload: payload ?? {} }, window.location.origin);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; event?: string; payload?: Record<string, unknown> } | null;
      if (!data || data.type !== "ember-nav" || !data.event) return;
      const payload = data.payload ?? {};
      if (data.event === "ready") {
        setReady(true);
        const metric = payload as unknown as Metrics;
        if (metric && typeof metric.engine === "string") setMetrics(metric);
      } else if (data.event === "result" && typeof payload.text === "string") {
        setResult(payload.text);
      } else if (data.event === "metrics") {
        setMetrics(payload as unknown as Metrics);
      } else if (data.event === "engines") {
        const list = payload.list;
        if (Array.isArray(list)) setEngines(list as EngineRow[]);
        if (typeof payload.pinned === "string") setPinned(payload.pinned);
      } else if (data.event === "timers") {
        const list = payload.timers;
        if (Array.isArray(list)) setTimers(list as TimerRow[]);
      }
    }
    window.addEventListener("message", onMessage);
    function onKey(event: KeyboardEvent) {
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

  function choose(item: Item) {
    setSelected(item.id);
    setDetail(item.detail ?? null);
    send(item.action, item.payload);
    if (narrow() && !item.detail) setPane("workspace");
  }

  const q = query.trim().toLowerCase();
  const visible = GROUPS.map((group) => {
    const head = `${group.title} ${group.blurb}`.toLowerCase().includes(q);
    const items = group.items.filter((item) => !q || head || item.name.toLowerCase().includes(q));
    return { group, items, show: !q || head || items.length > 0 };
  }).filter((row) => row.show);

  function submitMusic() {
    const text = `Write a song idea. Mood: ${mood || "warm"}. Style: ${style || "open"}. Give a title, a short arrangement, one verse and a chorus.`;
    send("ask", { text });
    if (narrow()) setPane("workspace");
  }

  function submitLyrics() {
    const text = `Write lyrics about ${theme || "starting over"}. Mood: ${lyricMood || "honest"}. Use a verse and a chorus.`;
    send("ask", { text });
    if (narrow()) setPane("workspace");
  }

  function submitSearch() {
    send("browser", { q: searchQ || "ember" });
    if (narrow()) setPane("workspace");
  }

  function submitScrape(openTools: boolean) {
    if (openTools || !pageUrl.trim()) send("scrape", {});
    else send("scrape", { url: pageUrl.trim() });
    if (narrow()) setPane("workspace");
  }

  function submitTimer() {
    send("add-timer", { minutes: Number(minutes) || 15, note: reminder || "Reminder" });
  }

  return (
    <main className="ember-app" data-pane={pane}>
      <section className="workspace">
        {!ready && (
          <div className="workspace-boot">
            <div className="boot-top">
              <div className="boot-mark">✦</div>
              <strong>Ember</strong>
              <span>·</span>
              <span>Workspace</span>
            </div>
            <div className="boot-draft">
              <div className="boot-glow">✦</div>
              <h1>What would you like to do?</h1>
              <p>Choose a category from the right panel, or ask Ember directly.</p>
              <p className="rp-result">{result}</p>
            </div>
          </div>
        )}
        <iframe
          ref={frame}
          className={ready ? undefined : "booting"}
          title="Ember workspace"
          src="/ember/index.html"
          onLoad={() => send("metrics")}
        />
        <button type="button" className="rp-reopen" onClick={() => setPane("tools")}>
          ✦ Tools
        </button>
      </section>
      <aside className="rp">
        <header className="rp-head">
          <div className="rp-brand">
            <h2>Ember</h2>
            <img className="rp-logo" src="/ember/ember-icon.svg" alt="Ember flame logo" />
          </div>
          <p className="rp-sub">Your tools, organized around what you want to do.</p>
          <label className="rp-search">
            ⌕
            <input
              ref={searchRef}
              type="search"
              placeholder="Find a tool or setting"
              value={query}
              autoComplete="off"
              onChange={(event) => {
                setQuery(event.target.value);
                setDetail(null);
              }}
            />
          </label>
          <p className="rp-result" aria-live="polite">
            {result}
          </p>
        </header>
        <div className="rp-list">
          {detail ? (
            <Detail
              detail={detail}
              engines={engines}
              pinned={pinned}
              timers={timers}
              mood={mood}
              styleName={style}
              theme={theme}
              lyricMood={lyricMood}
              searchQ={searchQ}
              pageUrl={pageUrl}
              minutes={minutes}
              reminder={reminder}
              onMood={setMood}
              onStyle={setStyle}
              onTheme={setTheme}
              onLyricMood={setLyricMood}
              onSearchQ={setSearchQ}
              onPageUrl={setPageUrl}
              onMinutes={setMinutes}
              onReminder={setReminder}
              onBack={() => setDetail(null)}
              onPin={(id) => send("pin", { id })}
              onKeys={() => {
                send("keys");
                if (narrow()) setPane("workspace");
              }}
              onMusic={submitMusic}
              onOpenPlayer={() => {
                send("music-panel", { tab: "lib" });
                if (narrow()) setPane("workspace");
              }}
              onLyrics={submitLyrics}
              onSearch={submitSearch}
              onScrape={submitScrape}
              onTimer={submitTimer}
              onCancel={(id) => send("cancel-timer", { id })}
              onTerminal={() => {
                send("terminal");
                if (narrow()) setPane("workspace");
              }}
              onTermux={() => {
                send("termux");
                if (narrow()) setPane("workspace");
              }}
              onGithub={(tab) => {
                send("github", { tab });
                if (narrow()) setPane("workspace");
              }}
            />
          ) : (
            visible.map(({ group, items }) => {
              const expanded = Boolean(q) || Boolean(open[group.id]);
              return (
                <section key={group.id} className={expanded ? "rp-group open" : "rp-group"} data-tone={group.tone}>
                  <button
                    type="button"
                    className="rp-group-head"
                    aria-expanded={expanded}
                    onClick={() => setOpen((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                  >
                    <span className="rp-icon">{group.icon}</span>
                    <span className="rp-label">
                      <b>{group.title}</b>
                      <small>{group.blurb}</small>
                    </span>
                    <span className="rp-chev">⌄</span>
                  </button>
                  <div className="rp-items">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={selected === item.id ? "rp-item selected" : "rp-item"}
                        onClick={() => choose(item)}
                      >
                        <span>{item.name}</span>
                        {item.badge ? <span className="rp-badge">{item.badge}</span> : <span>›</span>}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })
          )}
          {!detail && visible.length === 0 && <p className="rp-sub">No tools match that.</p>}
        </div>
        <footer className="rp-bottom">
          <section className={ccOpen ? "rp-cc expanded" : "rp-cc"}>
            <button type="button" className="rp-cc-head" aria-expanded={ccOpen} onClick={() => setCcOpen((v) => !v)}>
              <span className="rp-cc-icon">◫</span>
              <span className="rp-cc-title">
                <b>Command Centre</b>
                <small>Workspace status · activity · routing</small>
              </span>
              <span className="rp-live">
                <i className="rp-dot" /> {metrics.online ? "READY" : "OFFLINE"}
              </span>
              <span className="rp-cc-arrow">⌃</span>
            </button>
            <div className="rp-cc-body">
              <div className="rp-metrics">
                <div className="rp-metric">
                  <small>WORKSPACE</small>
                  <strong>{metrics.online ? "Ember · Online" : "Ember · Offline"}</strong>
                </div>
                <div className="rp-metric">
                  <small>ACTIVE ENGINE</small>
                  <strong>{metrics.engine || "Auto route"}</strong>
                </div>
              </div>
              <div className="rp-log">
                <em>●</em> {metrics.lines[0] || "Ready for your next request"}
                {"\n"}
                <span className="rp-log-dim">{metrics.lines[1] || "No active jobs right now"}</span>
              </div>
              <div className="rp-cc-actions">
                <button
                  type="button"
                  onClick={() => {
                    setCcOpen(true);
                    send("cc-activity");
                    if (narrow()) setPane("workspace");
                  }}
                >
                  Activity log
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCcOpen(true);
                    send("cc-routing");
                  }}
                >
                  Engine routing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCcOpen(true);
                    send("cc-status");
                  }}
                >
                  Status
                </button>
              </div>
            </div>
          </section>
          <p className="rp-foot">Tap a category to browse · Tap Command Centre to expand</p>
        </footer>
      </aside>
    </main>
  );
}

function Detail(props: {
  detail: DetailId;
  engines: EngineRow[];
  pinned: string;
  timers: TimerRow[];
  mood: string;
  styleName: string;
  theme: string;
  lyricMood: string;
  searchQ: string;
  pageUrl: string;
  minutes: string;
  reminder: string;
  onMood: (v: string) => void;
  onStyle: (v: string) => void;
  onTheme: (v: string) => void;
  onLyricMood: (v: string) => void;
  onSearchQ: (v: string) => void;
  onPageUrl: (v: string) => void;
  onMinutes: (v: string) => void;
  onReminder: (v: string) => void;
  onBack: () => void;
  onPin: (id: string) => void;
  onKeys: () => void;
  onMusic: () => void;
  onOpenPlayer: () => void;
  onLyrics: () => void;
  onSearch: () => void;
  onScrape: (tools: boolean) => void;
  onTimer: () => void;
  onCancel: (id: string) => void;
  onTerminal: () => void;
  onTermux: () => void;
  onGithub: (tab: string) => void;
}) {
  return (
    <div className="rp-detail">
      <button type="button" className="rp-back" onClick={props.onBack}>
        ‹ All tools
      </button>
      {props.detail === "engine" && (
        <>
          <h3>Choose an AI engine</h3>
          <p>Pin who answers first. Auto falls through if that engine cannot.</p>
          {(props.engines.length ? props.engines : [{ id: "", name: "Auto route", hint: "Loading engines…" }]).map((row) => (
            <button key={row.id || "auto"} type="button" className={props.pinned === row.id ? "rp-choice on" : "rp-choice"} onClick={() => props.onPin(row.id)}>
              <span>
                {row.name}
                <small>{row.hint}</small>
              </span>
              <span>{props.pinned === row.id ? "●" : "›"}</span>
            </button>
          ))}
          <div className="rp-actions">
            <button type="button" onClick={props.onKeys}>
              Open key settings
            </button>
          </div>
        </>
      )}
      {props.detail === "music" && (
        <>
          <h3>Create music</h3>
          <p>Ember drafts the idea in chat and opens the music studio.</p>
          <label className="rp-field">
            Mood
            <input value={props.mood} onChange={(e) => props.onMood(e.target.value)} placeholder="late night, hopeful" />
          </label>
          <label className="rp-field">
            Style
            <input value={props.styleName} onChange={(e) => props.onStyle(e.target.value)} placeholder="lo-fi, choir, guitar" />
          </label>
          <div className="rp-actions">
            <button type="button" className="primary" onClick={props.onMusic}>
              Ask Ember
            </button>
            <button type="button" onClick={props.onOpenPlayer}>
              Open player
            </button>
          </div>
        </>
      )}
      {props.detail === "lyrics" && (
        <>
          <h3>Write lyrics</h3>
          <p>Sends a lyrics request into the conversation.</p>
          <label className="rp-field">
            About
            <textarea rows={3} value={props.theme} onChange={(e) => props.onTheme(e.target.value)} placeholder="a drive home after the rain" />
          </label>
          <label className="rp-field">
            Mood
            <input value={props.lyricMood} onChange={(e) => props.onLyricMood(e.target.value)} placeholder="quiet, direct" />
          </label>
          <div className="rp-actions">
            <button type="button" className="primary" onClick={props.onLyrics}>
              Write lyrics
            </button>
          </div>
        </>
      )}
      {props.detail === "search" && (
        <>
          <h3>Web search</h3>
          <p>Opens the browser and reads the results.</p>
          <label className="rp-field">
            Search
            <input value={props.searchQ} onChange={(e) => props.onSearchQ(e.target.value)} placeholder="What do you want to look up?" onKeyDown={(e) => { if (e.key === "Enter") props.onSearch(); }} />
          </label>
          <div className="rp-actions">
            <button type="button" className="primary" onClick={props.onSearch}>
              Search
            </button>
          </div>
        </>
      )}
      {props.detail === "scrape" && (
        <>
          <h3>Scrape a page</h3>
          <p>Read a public page, or open the scraping keys and tests.</p>
          <label className="rp-field">
            Page
            <input value={props.pageUrl} onChange={(e) => props.onPageUrl(e.target.value)} placeholder="https://example.com" />
          </label>
          <div className="rp-actions">
            <button type="button" className="primary" onClick={() => props.onScrape(false)}>
              Read page
            </button>
            <button type="button" onClick={() => props.onScrape(true)}>
              Scraper settings
            </button>
          </div>
        </>
      )}
      {props.detail === "tasks" && (
        <>
          <h3>Tasks</h3>
          <p>Reminders fire while Ember is open. They are saved on this device.</p>
          <label className="rp-field">
            In minutes
            <input inputMode="numeric" value={props.minutes} onChange={(e) => props.onMinutes(e.target.value)} />
          </label>
          <label className="rp-field">
            Note
            <input value={props.reminder} onChange={(e) => props.onReminder(e.target.value)} placeholder="Stretch, check the build…" />
          </label>
          <div className="rp-actions">
            <button type="button" className="primary" onClick={props.onTimer}>
              Set reminder
            </button>
          </div>
          {props.timers.length === 0 && <p>No reminders yet.</p>}
          {props.timers.map((timer) => (
            <div key={timer.id} className="rp-timer">
              <span>
                {timer.note}
                <small>{timer.fires}</small>
              </span>
              <button type="button" onClick={() => props.onCancel(timer.id)}>
                Cancel
              </button>
            </div>
          ))}
        </>
      )}
      {props.detail === "terminal" && (
        <>
          <h3>Terminal</h3>
          <p>Live tool output sits under the chat. Termux is the advanced persona and docked terminal.</p>
          <div className="rp-actions">
            <button type="button" className="primary" onClick={props.onTerminal}>
              Live terminal
            </button>
            <button type="button" onClick={props.onTermux}>
              Termux tools
            </button>
          </div>
        </>
      )}
      {props.detail === "github" && (
        <>
          <h3>GitHub & integrations</h3>
          <p>Brain, search, and Run & Push stay behind the existing confirmation gates.</p>
          <div className="rp-actions">
            <button type="button" onClick={() => props.onGithub("connect")}>
              Brain
            </button>
            <button type="button" className="primary" onClick={() => props.onGithub("repos")}>
              Search
            </button>
            <button type="button" onClick={() => props.onGithub("build")}>
              Run & Push
            </button>
          </div>
        </>
      )}
    </div>
  );
}
