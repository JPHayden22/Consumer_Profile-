import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Orbit,
  LayoutDashboard,
  Network,
  Activity,
  Fingerprint,
  Layers,
  Compass,
  Sparkles,
  ScanEye,
  ShieldCheck,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowRight,
  Upload,
  Plus,
  X,
  Search,
  ChevronRight,
  Chrome,
  Trash2,
  Lock,
  Check,
  Menu,
} from "lucide-react";
import Graph from "./Graph";
import Footprint from "./Footprint";
import {
  RecordItem,
  Product,
  analyze,
  parseImport,
  recommendations,
  domain,
  classify,
  safeUrl,
} from "./engine";
import "./style.css";
const nav = [
  ["Consumer overview", LayoutDashboard],
  ["Interest universe", Network],
  ["Digital footprint", Activity],
  ["Personality & shopping", Fingerprint],
  ["Consumer segments", Layers],
  ["Product discovery", Compass],
  ["Recommendations", Sparkles],
  ["AI vs. reality", ScanEye],
  ["Connections & privacy", ShieldCheck],
] as const;
function App() {
  const [graphMode, setGraphMode] = useState("categories");
  const [graphCategory, setGraphCategory] = useState("All");
  const [page, setPage] = useState(0),
    [records, setRecords] = useState<RecordItem[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [feedback, setFeedback] = useState<Record<string, string>>({}),
    [light, setLight] = useState(false),
    [query, setQuery] = useState(""),
    [dialog, setDialog] = useState(false),
    [consent, setConsent] = useState(false),
    [days, setDays] = useState(30),
    [status, setStatus] = useState(""),
    [detail, setDetail] = useState<{ name: string; e: RecordItem[] } | null>(
      null,
    ),
    [connected, setConnected] = useState(false),
    [retailer, setRetailer] = useState(""),
    [mobile, setMobile] = useState(false);
  const a = useMemo(() => analyze(records, feedback), [records, feedback]);
  const recs = useMemo(() => recommendations(products, a), [products, a]);
  const select = useCallback(
    (name: string, e: RecordItem[]) => setDetail({ name, e }),
    [],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
  }, [light]);
  async function imports(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > 30 * 1024 * 1024) {
        setStatus("File too large. Limit: 30 MB.");
        continue;
      }
      try {
        const result = parseImport(await f.text(), f.name);
        setRecords((old) => {
          const seen = new Set(
            old.map((r) => r.url + "|" + r.title + "|" + r.time),
          );
          return [
            ...old,
            ...result.records.filter(
              (r) =>
                !seen.has(r.url + "|" + r.title + "|" + r.time) &&
                !!seen.add(r.url + "|" + r.title + "|" + r.time),
            ),
          ];
        });
        setProducts((old) => [...old, ...result.products]);
        setStatus(
          `${result.records.length} records and ${result.products.length} products read; ${result.skipped} unsupported entries skipped. Duplicates are removed.`,
        );
      } catch (e) {
        setStatus(
          `${f.name}: ${e instanceof Error ? e.message : "Import failed"}`,
        );
      }
    }
  }
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (
        e.source !== window ||
        e.origin !== location.origin ||
        e.data?.channel !== "orbit-extension"
      )
        return;
      if (e.data.type === "ready") setConnected(true);
      if (e.data.type === "revoked") setConnected(false);
    };
    window.addEventListener("message", listener);
    window.postMessage(
      { channel: "orbit-dashboard", type: "ping" },
      location.origin,
    );
    return () => window.removeEventListener("message", listener);
  }, []);
  function connect() {
    if (!consent) return;
    setStatus(
      "Waiting for the extension. Approve history access in the extension popup, then return here.",
    );
    const requestId = crypto.randomUUID();
    const listener = (e: MessageEvent) => {
      if (
        e.source !== window ||
        e.origin !== location.origin ||
        e.data?.channel !== "orbit-extension" ||
        e.data.requestId !== requestId
      )
        return;
      window.removeEventListener("message", listener);
      clearTimeout(timer);
      if (e.data.error) {
        setStatus(e.data.error);
        return;
      }
      try {
        const result = parseImport(
          JSON.stringify(e.data.records),
          "Chrome history",
        );
        setRecords((old) => [
          ...old.filter((r) => r.source !== "Chrome history"),
          ...result.records,
        ]);
        setStatus(
          `${result.records.length} real Chrome visits analyzed. ${e.data.truncated ? "Coverage limited by the 5,000-page/30,000-visit safety cap." : ""}`,
        );
        setDialog(false);
      } catch {
        setStatus("Invalid extension response.");
      }
    };
    window.addEventListener("message", listener);
    const timer = setTimeout(() => {
      window.removeEventListener("message", listener);
      setStatus(
        "Extension did not respond. Install it and approve history access using its popup.",
      );
    }, 60000);
    window.postMessage(
      { channel: "orbit-dashboard", type: "history", requestId, days },
      location.origin,
    );
  }
  const empty = (
    <div className="empty">
      <div className="empty-orbit">
        <Orbit size={48} />
      </div>
      <span className="eyebrow">YOUR NEXT DISCOVERY STARTS HERE</span>
      <h2>A universe, waiting to be connected.</h2>
      <p>
        Connect your Chrome history or import your own records.
        <br />
        Your interests will take shape here, supported by real evidence.
      </p>
      <button className="primary" onClick={() => setDialog(true)}>
        <Chrome size={17} /> Connect Chrome <ArrowRight size={16} />
      </button>
      <small>Local processing · No account required · No data uploaded</small>
    </div>
  );
  const evidence = (rs: RecordItem[]) => (
    <div className="evidence">
      {rs.slice(0, 100).map((r) => (
        <div className="record" key={r.id}>
          <div>
            <b>{r.title || domain(r.url)}</b>
            <small>
              {domain(r.url)} ·{" "}
              {r.time ? new Date(r.time).toLocaleString() : "Date unavailable"}{" "}
              · {r.source} · {r.kind}
            </small>
          </div>
          <button
            aria-label="Remove record"
            onClick={() => setRecords((v) => v.filter((x) => x.id !== r.id))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {rs.length > 100 && (
        <p>
          Showing first 100 of {rs.length}. Filter the dataset to narrow
          results.
        </p>
      )}
    </div>
  );
  return (
    <div className="app">
      <aside className={mobile ? "open" : ""}>
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <div className="logo">
            <Orbit size={25} />
          </div>
          orbit<span>INTELLIGENCE LAB</span>
        </a>
        <div className="workspace">
          <span className="avatar">P</span>
          <div>
            Personal workspace<small>Consumer intelligence</small>
          </div>
          <Lock size={13} />
        </div>
        <label className="nav-label">EXPLORE YOUR SIGNALS</label>
        <nav>
          {nav.map(([name, Icon], i) => (
            <button
              key={name}
              className={page === i ? "active" : ""}
              onClick={() => {
                setPage(i);
                setMobile(false);
                setQuery("");
              }}
            >
              <Icon size={18} />
              {name}
              {i === 1 && <span className="new">GRAPH</span>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="privacy-icon">
            <ShieldCheck size={21} />
          </div>
          <b>Private by design.</b>
          <p>Your activity stays on this device. You decide what connects.</p>
          <button onClick={() => setPage(8)}>
            Your privacy controls <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="side-footer">
          <span className="dot" /> Local intelligence engine <span>v1.0</span>
        </div>
      </aside>
      <main>
        <header>
          <button
            className="mobile-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Personal workspace <ChevronRight size={13} /> <b>{nav[page][0]}</b>
          </div>
          <div className="top-actions">
            <span className="local">
              <Lock size={12} /> On-device processing
            </span>
            <button
              onClick={() => setLight(!light)}
              aria-label="Toggle color theme"
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span className="avatar small">P</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">THE SIGNAL BEHIND YOUR SCROLL</span>
              <h1>
                {nav[page][0]}
                <span className="title-dot">.</span>
              </h1>
              <p>
                {
                  [
                    "A clearer picture of you. Built from the trails you choose to share.",
                    "Follow the connections between your attention, interests, and intent.",
                    "See the rhythm of your digital life, one real visit at a time.",
                    "Tentative interpretations. Transparent methods. Always open to correction.",
                    "Explore overlapping patterns in your consumer behavior.",
                    "Bring real products into your personal discovery space.",
                    "Real products, connected to your observed interests.",
                    "You are the expert on you. Help refine the interpretation.",
                    "Your data. Your permissions. Your control.",
                  ][page]
                }
              </p>
            </div>
            <button className="primary" onClick={() => setDialog(true)}>
              <Plus size={16} /> Connect data
            </button>
          </div>
          {status && (
            <div className="notice" role="status">
              {status}
              <button onClick={() => setStatus("")} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}
          {page === 0 && (
            <>
              <div className="welcome">
                <div>
                  <span className="pill">
                    <span className="dot" />{" "}
                    {records.length
                      ? "REAL DATA CONNECTED"
                      : "READY WHEN YOU ARE"}
                  </span>
                  <h2>
                    Your digital life.
                    <br />
                    <em>A new perspective.</em>
                  </h2>
                  <p>
                    Turn everyday activity into meaningful insight.
                    <br />
                    Discover what captures your attention—and why.
                  </p>
                  <button onClick={() => setDialog(true)}>
                    Connect your first source <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <div className="ring r1" />
                  <div className="ring r2" />
                  <div className="ring r3" />
                  <Orbit size={70} />
                  <span className="sat s1" />
                  <span className="sat s2" />
                  <span className="sat s3" />
                  <span className="art-caption">
                    EVERY SIGNAL TELLS A STORY
                  </span>
                </div>
              </div>
              <div className="stats">
                {[
                  [
                    "Records analyzed",
                    records.length,
                    "Voluntarily shared activity",
                  ],
                  [
                    "Interest clusters",
                    a.interests.length,
                    "Explainable category signals",
                  ],
                  [
                    "Shopping signals",
                    a.shop.length,
                    "Observed activity, not purchases",
                  ],
                  [
                    "Data sources",
                    new Set(records.map((r) => r.source)).size,
                    "Connected in this session",
                  ],
                ].map(([l, v, s]) => (
                  <div className="stat" key={l}>
                    <span>
                      {l}
                      <ArrowUpRight size={14} />
                    </span>
                    <strong>{v}</strong>
                    <small>{s}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>
                        <Network size={17} /> Your interest universe
                      </h3>
                      <p>Connections emerge from the activity you share.</p>
                    </div>
                    <button onClick={() => setPage(1)}>
                      Explore <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {records.length ? (
                    <Graph
                      records={records}
                      products={products}
                      query=""
                      onSelect={select}
                    />
                  ) : (
                    empty
                  )}
                  <div className="panel-foot">
                    <span>
                      <i className="legend purple" /> Interests
                    </span>
                    <span>
                      <i className="legend mint" /> Websites
                    </span>
                    <small>Evidence-weighted connections</small>
                  </div>
                </section>
                <section className="panel insights">
                  <div className="panel-head">
                    <h3>
                      <Sparkles size={17} /> Emerging insights
                    </h3>
                    <span className="tag">EXPLAINABLE</span>
                  </div>
                  {a.interests.length ? (
                    a.interests.slice(0, 4).map((i) => (
                      <button
                        className="insight"
                        key={i.name}
                        onClick={() => select(i.name, i.evidence)}
                      >
                        <span>{i.name}</span>
                        <strong>{i.evidence.length} signals</strong>
                        <p>
                          Keyword-based interest hypothesis · {i.score}% of
                          records
                        </p>
                        <small>
                          {i.evidence.length < 3
                            ? "INSUFFICIENT DATA"
                            : "Tentative inference"}{" "}
                          <ArrowUpRight size={12} />
                        </small>
                      </button>
                    ))
                  ) : (
                    <div className="insight-empty">
                      <ScanEye size={32} />
                      <h3>Insight needs evidence.</h3>
                      <p>
                        Your strongest patterns will appear here once you
                        connect a source.
                      </p>
                      <div className="skeleton" />
                      <div className="skeleton short" />
                      <div className="skeleton" />
                    </div>
                  )}
                  <div className="method-note">
                    <ShieldCheck size={16} />
                    <p>
                      Observed behavior and inferred preferences are always kept
                      distinct.
                    </p>
                  </div>
                </section>
              </div>
              <div className="bottom-cards">
                <button onClick={() => setPage(2)}>
                  <Activity />
                  <div>
                    <b>Find your rhythm</b>
                    <p>Explore your activity over time.</p>
                  </div>
                  <ArrowUpRight />
                </button>
                <button onClick={() => setPage(7)}>
                  <ScanEye />
                  <div>
                    <b>Challenge the algorithm</b>
                    <p>Compare AI inference with reality.</p>
                  </div>
                  <ArrowUpRight />
                </button>
                <button onClick={() => setPage(8)}>
                  <ShieldCheck />
                  <div>
                    <b>You hold the controls</b>
                    <p>Review, remove, or reset your data.</p>
                  </div>
                  <ArrowUpRight />
                </button>
              </div>
            </>
          )}
          {page === 1 && (
            <section className="panel">
              <div className="panel-head">
                <h3>Evidence network</h3>
                <label className="filter-label">
                  Color by
                  <select
                    aria-label="Graph clustering"
                    value={graphMode}
                    onChange={(e) => setGraphMode(e.target.value)}
                  >
                    <option value="categories">Interest categories</option>
                    <option value="communities">Detected communities</option>
                  </select>
                </label>
                <label className="filter-label">
                  Interest
                  <select
                    aria-label="Graph category filter"
                    value={graphCategory}
                    onChange={(e) => setGraphCategory(e.target.value)}
                  >
                    <option>All</option>
                    {a.interests.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a website or interest"
                  />
                </label>
              </div>
              {records.length ? (
                <Graph
                  records={
                    graphCategory === "All"
                      ? records
                      : records.filter((r) =>
                          classify(r).includes(graphCategory),
                        )
                  }
                  products={products}
                  mode={graphMode}
                  query={query}
                  onSelect={select}
                />
              ) : (
                empty
              )}
              <div className="panel-foot">
                Drag nodes · Scroll to zoom · Drag background to pan · Select
                for evidence. Choose category colors or deterministic weighted
                label-propagation communities (20-iteration cap). Website, known
                brand, search-title, and imported product nodes are shown where
                evidence exists. Product edges indicate category matches, not
                purchases. Up to 50 domains, 20 catalog products, and 12
                search-title nodes.
              </div>
            </section>
          )}
          {page === 2 && (
            <>
              {!a.dated.length ? (
                empty
              ) : (
                <>
                  <section className="panel padded">
                    <h3>
                      Weekly rhythm <span className="tag">LOCAL TIME</span>
                    </h3>
                    <p>
                      Individual timestamped records by day and hour. Missing
                      timestamps are excluded.
                    </p>
                    <div className="heatmap">
                      {Array.from({ length: 7 }, (_, d) => (
                        <div className="heat-row" key={d}>
                          <small>
                            {
                              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                                d
                              ]
                            }
                          </small>
                          {Array.from({ length: 24 }, (_, h) => {
                            const rs = a.dated.filter(
                              (r) =>
                                new Date(r.time!).getDay() === d &&
                                new Date(r.time!).getHours() === h,
                            );
                            return (
                              <button
                                key={h}
                                style={{
                                  background: `rgba(174,145,248,${rs.length ? Math.min(0.95, 0.2 + Math.log(rs.length + 1) / 4) : 0.04})`,
                                }}
                                title={`${d} / ${h}:00 · ${rs.length} records`}
                                aria-label={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]} ${h}:00, ${rs.length} records`}
                                onClick={() => select(`${h}:00 activity`, rs)}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="hour-labels">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>23:00</span>
                    </div>
                  </section>
                  <section className="panel padded">
                    <h3>Activity orbit · last 30 days</h3>
                    <svg viewBox="0 0 700 300" className="radial">
                      {Array.from({ length: 30 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - 29 + i);
                        const rs = a.dated.filter(
                          (r) =>
                            new Date(r.time!).toDateString() ===
                            date.toDateString(),
                        );
                        const angle = (i / 30) * Math.PI * 2 - Math.PI / 2;
                        const x = 350 + Math.cos(angle) * 110,
                          y = 150 + Math.sin(angle) * 110;
                        return (
                          <g
                            key={i}
                            onClick={() => select(date.toDateString(), rs)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              select(date.toDateString(), rs)
                            }
                          >
                            <circle
                              cx={x}
                              cy={y}
                              r={4 + Math.min(16, Math.sqrt(rs.length) * 2)}
                              fill={rs.length ? "#b7a0ff" : "#333142"}
                            />
                            <title>
                              {date.toDateString()}: {rs.length} records
                            </title>
                          </g>
                        );
                      })}
                      <text
                        x="350"
                        y="147"
                        textAnchor="middle"
                        fill="var(--text)"
                        fontSize="28"
                      >
                        {a.dated.length}
                      </text>
                      <text
                        x="350"
                        y="171"
                        textAnchor="middle"
                        fill="var(--muted)"
                        fontSize="11"
                      >
                        TIMESTAMPED RECORDS
                      </text>
                    </svg>
                    <p>
                      Circle radius increases with daily activity (capped at 20
                      pixels). Comparison across sources is limited by export
                      coverage.
                    </p>
                  </section>
                </>
              )}
              <section className="panel padded">
                <h3>Frequently observed domains</h3>
                {a.sites.slice(0, 20).map((s) => (
                  <button
                    className="list-row"
                    key={s.name}
                    onClick={() => select(s.name, s.evidence)}
                  >
                    <span>{s.name}</span>
                    <b>{s.evidence.length} records</b>
                  </button>
                ))}
              </section>
            </>
          )}
          {page === 2 && <Footprint records={records} onSelect={select} />}
          {page === 3 && (
            <div className="cards">
              {a.tendencies.map((t) => (
                <section className="panel padded" key={t.name}>
                  <Fingerprint className="accent" />
                  <h2>{t.name}</h2>
                  <strong className="big-number">
                    {t.score === null ? "—" : t.score + "%"}
                  </strong>
                  <span className="tag">
                    {t.score === null
                      ? "INSUFFICIENT DATA"
                      : "TENTATIVE SIGNAL"}
                  </span>
                  <p>{t.method}</p>
                  <p>
                    Method: matching records ÷ eligible records. Minimum 5
                    eligible records. Coverage and ambiguous page titles limit
                    interpretation.
                  </p>
                  <button onClick={() => select(t.name, t.evidence)}>
                    Inspect {t.evidence.length} supporting records{" "}
                    <ArrowUpRight size={14} />
                  </button>
                </section>
              ))}
              <section className="panel padded">
                <h3>Interpretation boundaries</h3>
                <p>
                  Novelty seeking, brand exploration, convenience orientation,
                  and premium versus value orientation: INSUFFICIENT DATA.
                  Domain visits alone cannot support these judgments. These are
                  behavioral summaries, never psychological measurements.
                </p>
                <p>
                  {a.excluded} records excluded from category inference by the
                  sensitive-topic filter. Sensitive attributes are never scored.
                </p>
              </section>
            </div>
          )}
          {page === 4 && (
            <>
              {a.interests.length ? (
                <div className="cards">
                  {a.interests.map((i) => (
                    <section className="panel padded" key={i.name}>
                      <Layers className="accent" />
                      <h2>{i.name} explorer</h2>
                      <div
                        className="segment-ring"
                        style={{
                          background: `conic-gradient(#b7a0ff ${i.score}%,var(--line) 0)`,
                        }}
                      >
                        <span>{i.score}%</span>
                      </div>
                      <p>
                        {i.evidence.length >= 3
                          ? "Possible segment"
                          : "INSUFFICIENT DATA"}{" "}
                        · {i.evidence.length} matching records /{" "}
                        {records.length} total records.
                      </p>
                      <p>
                        Overlapping rule-based membership; category keywords can
                        match multiple segments. No population comparison or
                        validated segmentation model.
                      </p>
                      <button onClick={() => select(i.name, i.evidence)}>
                        Inspect evidence <ArrowUpRight size={14} />
                      </button>
                    </section>
                  ))}
                </div>
              ) : (
                empty
              )}
            </>
          )}
          {page === 5 && (
            <section className="panel padded">
              <span className="eyebrow">REAL PRODUCTS ONLY</span>
              <h2>Your discovery workspace</h2>
              <p>
                Open a retailer, then import a catalog or product URLs you
                choose to share. This dashboard does not scrape retailers,
                bypass restrictions, or invent product details.
              </p>
              <div className="inline-form">
                <input
                  value={retailer}
                  onChange={(e) => setRetailer(e.target.value)}
                  placeholder="https://www.bestbuy.com/…"
                  aria-label="Retailer URL"
                />
                <button
                  className="primary"
                  onClick={() => {
                    const u = safeUrl(retailer);
                    if (u && new URL(u).protocol === "https:")
                      window.open(u, "_blank", "noopener,noreferrer");
                    else setStatus("Enter a valid HTTPS retailer URL.");
                  }}
                >
                  Open retailer <ArrowUpRight size={15} />
                </button>
              </div>
              <p>
                Catalog JSON/CSV fields: name, url, category. Optional price,
                currency, verifiedAt. A dated imported price is source-provided
                and may be stale; it is never advertised as a live verified
                price.
              </p>
              <label
                className="drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  imports(e.dataTransfer.files);
                }}
              >
                <Upload />
                <b>Import your product catalog</b>
                <span>
                  CSV or JSON · category should match an interest name
                </span>
                <input
                  type="file"
                  accept=".csv,.json"
                  multiple
                  onChange={(e) => imports(e.target.files)}
                />
              </label>
              {products.map((p, i) => (
                <div className="list-row" key={i}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.name} ↗
                  </a>
                  <span>{p.category}</span>
                  <button
                    onClick={() =>
                      setProducts((v) => v.filter((_, j) => j !== i))
                    }
                    aria-label="Remove product"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </section>
          )}
          {page === 6 && (
            <>
              {recs.length ? (
                <div className="cards">
                  {recs.map((p, i) => (
                    <section className="panel padded" key={i}>
                      <Compass className="accent" />
                      <span className="tag">{p.score}% CATEGORY AFFINITY</span>
                      <h2>{p.name}</h2>
                      <p>
                        Matches your {p.category} interest through {p.evidence}{" "}
                        records. Score = category records / all records; it is
                        not purchase probability.
                      </p>
                      <p>
                        {p.price !== undefined
                          ? `${p.currency} ${p.price} · imported price as of ${p.verifiedAt}. Not independently verified; check source.`
                          : "Price unavailable. Check the retailer for current details."}
                      </p>
                      <a
                        className="primary"
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View product <ArrowUpRight size={16} />
                      </a>
                    </section>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  {empty}
                  <p className="center-note">
                    Recommendations require an imported real catalog and at
                    least 3 matching behavioral records. No prices, images,
                    ratings, or stock are fabricated.
                  </p>
                </section>
              )}
            </>
          )}
          {page === 7 && (
            <>
              {a.interests.length ? (
                <div className="cards">
                  {a.interests.map((i) => (
                    <section className="panel padded" key={i.name}>
                      <span className="tag">
                        AI HYPOTHESIS ·{" "}
                        {i.evidence.length < 3
                          ? "INSUFFICIENT DATA"
                          : "TENTATIVE"}
                      </span>
                      <h2>Interested in {i.name.toLowerCase()}?</h2>
                      <p>
                        {i.evidence.length} records contain category keywords.
                        This may reflect work, gifts, shared-device activity, or
                        curiosity.
                      </p>
                      <div className="feedback">
                        {["accurate", "inaccurate", "uncertain"].map((v) => (
                          <button
                            className={feedback[i.name] === v ? "selected" : ""}
                            key={v}
                            onClick={() =>
                              setFeedback((old) => ({ ...old, [i.name]: v }))
                            }
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <p>
                        Self report: {feedback[i.name] || "Not reviewed"}.
                        Inaccurate categories are excluded from recommendations.
                        Observed evidence remains visible.
                      </p>
                      <button onClick={() => select(i.name, i.evidence)}>
                        Review evidence
                      </button>
                    </section>
                  ))}
                </div>
              ) : (
                empty
              )}
            </>
          )}
          {page === 8 && (
            <>
              <section className="panel padded">
                <ShieldCheck className="accent" />
                <h2>Built around your permission.</h2>
                <p>
                  Raw records and feedback live only in this page’s memory.
                  Refreshing or closing this tab clears them. No analytics,
                  external AI calls, cloud database, or automatic persistence.
                  Public application hosting still receives normal page
                  requests.
                </p>
                <div className="privacy-grid">
                  <div>
                    <b>{records.length}</b>
                    <span>Real records in memory</span>
                  </div>
                  <div>
                    <b>{a.dated.length}</b>
                    <span>With usable timestamps</span>
                  </div>
                  <div>
                    <b>{connected ? "Detected" : "Not detected"}</b>
                    <span>Chrome extension</span>
                  </div>
                </div>
                <p>
                  Full URLs can contain private information. Import strips URL
                  query strings and fragments. Titles and conversation
                  statements remain private in memory. Conversation imports use
                  user messages only and remove common quotation formats;
                  unmarked quotations cannot be reliably detected. Review and
                  remove records before relying on results.
                </p>
                <button
                  onClick={() => {
                    window.postMessage(
                      { channel: "orbit-dashboard", type: "revoke" },
                      location.origin,
                    );
                    setRecords((v) =>
                      v.filter((r) => r.source !== "Chrome history"),
                    );
                    setConnected(false);
                    setStatus(
                      "Chrome records removed. If extension is unavailable, revoke history manually at chrome://extensions.",
                    );
                  }}
                >
                  Disconnect Chrome & revoke history
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setRecords([]);
                    setProducts([]);
                    setFeedback({});
                    setDetail(null);
                    setStatus(
                      "All imported records, products, and feedback deleted from memory.",
                    );
                  }}
                >
                  <Trash2 size={15} /> Delete all session data
                </button>
              </section>
              <section className="panel padded">
                <h3>Sources & coverage</h3>
                {Array.from(new Set(records.map((r) => r.source))).map(
                  (source) => (
                    <div className="list-row" key={source}>
                      <span>{source}</span>
                      <b>
                        {records.filter((r) => r.source === source).length}{" "}
                        records
                      </b>
                      <button
                        onClick={() =>
                          setRecords((v) =>
                            v.filter((r) => r.source !== source),
                          )
                        }
                      >
                        Remove source
                      </button>
                    </div>
                  ),
                )}
                <p>
                  Exports may be partial. Missing dates are excluded from
                  timelines. Imported Chrome summaries count URL records;
                  extension records count individual visits. Comparisons across
                  sources are approximate. Records with no matching category
                  remain unclassified.
                </p>
                <label className="search">
                  <Search size={15} />
                  <input
                    placeholder="Search your records"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {evidence(
                  records.filter((r) =>
                    (r.title + " " + r.url)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  ),
                )}
              </section>
            </>
          )}
          <footer>
            <span>
              <Orbit size={13} /> ORBIT / CONSUMER INTELLIGENCE LAB
            </span>
            <span>Evidence first. You always have the final word.</span>
          </footer>
        </div>
      </main>
      {dialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-title"
          >
            <button
              className="close"
              onClick={() => setDialog(false)}
              aria-label="Close"
            >
              <X />
            </button>
            <span className="eyebrow">YOUR DATA, ON YOUR TERMS</span>
            <h2 id="connect-title">Connect your signals.</h2>
            <p>
              The dashboard cannot read Chrome history on its own. The companion
              extension asks Chrome for permission and transfers only the period
              you select to this exact dashboard.
            </p>
            <div className="connection-status">
              <Chrome />
              <b>
                {connected
                  ? "Extension detected"
                  : "Extension not installed or not detected"}
              </b>
              <span className="tag">UNPUBLISHED</span>
            </div>
            <details>
              <summary>Temporary extension installation · 3 steps</summary>
              <ol>
                <li>
                  <a href="./orbit-extension.zip" download>
                    Download the extension ZIP
                  </a>{" "}
                  and unzip it.
                </li>
                <li>
                  Open <b>chrome://extensions</b>, enable Developer mode, choose{" "}
                  <b>Load unpacked</b>, and select the unzipped folder.
                </li>
                <li>
                  Click the Orbit extension icon and choose{" "}
                  <b>Approve history access</b>. Chrome shows the actual
                  permission prompt. Return here.
                </li>
              </ol>
              <p>
                Not published to the Chrome Web Store. Installation and history
                approval require your explicit action. No credentials, cookies,
                or passwords are accessed.
              </p>
            </details>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              I approve reading page titles, sanitized URLs, and visit
              timestamps for the selected period, locally in this dashboard.
            </label>
            <label className="period">
              History period{" "}
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
            <button
              className="primary full"
              disabled={!consent || !connected}
              onClick={connect}
            >
              <Chrome size={16} /> Analyze approved history{" "}
              <ArrowRight size={16} />
            </button>
            <div className="divider">OR IMPORT YOUR OWN EXPORT</div>
            <label
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                imports(e.dataTransfer.files);
              }}
            >
              <Upload />
              <b>Drop a CSV or JSON export here</b>
              <span>
                Takeout · ChatGPT conversations · browsing · orders · catalogs
              </span>
              <input
                type="file"
                accept=".json,.csv"
                multiple
                onChange={(e) => imports(e.target.files)}
              />
            </label>
            {status && <p role="status">{status}</p>}
            <small className="muted">
              File selection voluntarily shares those records for local
              analysis. Unzip archives before importing. Limit 30 MB per file.
            </small>
          </section>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop">
          <section
            className="modal wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
          >
            <button
              className="close"
              onClick={() => setDetail(null)}
              aria-label="Close"
            >
              <X />
            </button>
            <span className="eyebrow">OBSERVED EVIDENCE</span>
            <h2 id="evidence-title">{detail.name}</h2>
            <p>
              Relationships use shared category keyword matches. Node size
              reflects record count; links are weighted by supporting records.
              Category colors are rule-based; detected communities describe
              graph topology, never psychological traits.
            </p>
            {evidence(
              detail.e.filter((r) => records.some((v) => v.id === r.id)),
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
