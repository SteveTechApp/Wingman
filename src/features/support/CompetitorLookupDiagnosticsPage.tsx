import * as React from "react";
import { Link } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";
import {
  clearCompetitorLookupRuntimeDiagnosticsFeed,
  clearCompetitorLookupCache,
  fetchCompetitorLookupRuntimeDiagnostics,
  getCompetitorLookupCacheEntries,
  getCompetitorLookupContractSummary,
  getCompetitorLookupDiagnosticsEndpoint,
  getCompetitorLookupEndpoint,
  pruneCompetitorLookupRuntimeDiagnosticsFeed,
  pruneExpiredCompetitorLookupCache,
  type CompetitorLookupCacheEntrySummary,
  type CompetitorLookupRuntimeEvent,
} from "@/services/competitor/lookupService";
import {
  clearApprovalQueue,
  flushApprovalQueue,
  getApprovalQueueEntries,
  getCompetitorApprovalEndpoint,
  saveApprovedLookupEntry,
} from "@/services/competitorApprovalService";
import "./competitor-lookup-diagnostics-page.css";

type ViewId = "overview" | "runtime" | "cache";
type SeverityFilter = "all" | "warn-error" | "warn" | "error" | "info";

function formatDateTime(value?: string) {
  if (!value) return "Not captured";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function actionId(entry: CompetitorLookupCacheEntrySummary) {
  return `${entry.cacheKey}::${entry.sku}`;
}

function severityRank(value: string) {
  const severity = String(value ?? "").trim().toLowerCase();
  if (severity === "error") return 3;
  if (severity === "warn" || severity === "warning") return 2;
  if (severity === "info") return 1;
  return 0;
}

function matchesSeverity(value: string, filter: SeverityFilter) {
  const rank = severityRank(value);
  if (filter === "all") return true;
  if (filter === "warn-error") return rank >= 2;
  if (filter === "warn") return rank === 2;
  if (filter === "error") return rank === 3;
  return rank === 1;
}

export default function CompetitorLookupDiagnosticsPage() {
  const auth = useAuth();
  const canAdmin = Boolean(auth.permissions.canManageWorkspace || auth.workspaceRole === "admin" || auth.workspaceRole === "owner" || auth.user?.role === "admin");
  const [view, setView] = React.useState<ViewId>("overview");
  const [entries, setEntries] = React.useState<CompetitorLookupCacheEntrySummary[]>(() => getCompetitorLookupCacheEntries());
  const [queueCount, setQueueCount] = React.useState<number>(() => getApprovalQueueEntries().length);
  const [actionMessage, setActionMessage] = React.useState("");
  const [activeAction, setActiveAction] = React.useState("");
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
  const [runtimeEvents, setRuntimeEvents] = React.useState<CompetitorLookupRuntimeEvent[]>([]);
  const [runtimeWarnings, setRuntimeWarnings] = React.useState<string[]>([]);
  const [runtimeFeedAvailable, setRuntimeFeedAvailable] = React.useState(false);
  const [runtimeFeedFetchedAt, setRuntimeFeedFetchedAt] = React.useState("");
  const [runtimeFeedMaxEvents, setRuntimeFeedMaxEvents] = React.useState(0);
  const [runtimeHealthSummary, setRuntimeHealthSummary] = React.useState("-");
  const [severityFilter, setSeverityFilter] = React.useState<SeverityFilter>("warn-error");
  const [scopeFilter, setScopeFilter] = React.useState("all");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [retainDays, setRetainDays] = React.useState("30");

  const lookupEndpoint = getCompetitorLookupEndpoint();
  const diagnosticsEndpoint = getCompetitorLookupDiagnosticsEndpoint();
  const approvalEndpoint = getCompetitorApprovalEndpoint();
  const contractSummary = getCompetitorLookupContractSummary();

  const refreshLocal = React.useCallback(() => {
    setEntries(getCompetitorLookupCacheEntries());
    setQueueCount(getApprovalQueueEntries().length);
  }, []);

  const refreshRuntime = React.useCallback(async () => {
    const diagnostics = await fetchCompetitorLookupRuntimeDiagnostics();
    setRuntimeEvents(diagnostics.events);
    setRuntimeWarnings(diagnostics.warnings);
    setRuntimeFeedAvailable(diagnostics.available);
    setRuntimeFeedFetchedAt(diagnostics.fetchedAt);
    setRuntimeFeedMaxEvents(diagnostics.maxEvents);
    if (!diagnostics.available) {
      setRuntimeHealthSummary("Diagnostics endpoint unavailable.");
      return;
    }
    const buffered = Number(diagnostics.health?.runtimeEventsBuffered ?? diagnostics.count);
    const maxEvents = Number(diagnostics.health?.liveRuntimeEventMax ?? diagnostics.maxEvents);
    const liveMode = diagnostics.health?.liveEnrichmentEnabled === true ? "Live enrichment on" : "Live enrichment off";
    const persistence = diagnostics.health?.runtimeEventsPersistenceEnabled === true ? `${diagnostics.mode || "unknown"} persistence active` : "memory-only diagnostics";
    setRuntimeHealthSummary(`${liveMode} / ${persistence} / buffered ${buffered}/${maxEvents || diagnostics.maxEvents || "-"}`);
  }, []);

  const refresh = React.useCallback(() => {
    if (!canAdmin) return;
    refreshLocal();
    void refreshRuntime();
  }, [canAdmin, refreshLocal, refreshRuntime]);

  React.useEffect(() => {
    if (!canAdmin) return;
    refresh();
  }, [canAdmin, refresh]);

  const runtimeScopes = React.useMemo(() => Array.from(new Set(runtimeEvents.map((event) => String(event.scope || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [runtimeEvents]);
  const filteredRuntimeEvents = React.useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    return runtimeEvents.filter((event) => {
      if (!matchesSeverity(event.severity, severityFilter)) return false;
      if (scopeFilter !== "all" && event.scope !== scopeFilter) return false;
      if (!query) return true;
      const blob = [event.scope, event.severity, event.mode, event.message, event.query, event.brand, event.sku, ...(event.warnings ?? [])].join(" ").toLowerCase();
      return blob.includes(query);
    });
  }, [runtimeEvents, severityFilter, scopeFilter, searchFilter]);
  const sources = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.source, (counts.get(entry.source) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([source, count]) => `${source}: ${count}`).join(" / ") || "-";
  }, [entries]);

  const setMessage = React.useCallback((text: string) => setActionMessage(text), []);

  async function approve(entry: CompetitorLookupCacheEntrySummary) {
    const id = actionId(entry);
    setActiveAction(id);
    const result = await saveApprovedLookupEntry(entry);
    refresh();
    setActiveAction("");
    setMessage(`${result.message}${result.warnings.length ? ` Warnings: ${result.warnings.join(" ")}` : ""}`);
  }

  async function copySnapshot() {
    try {
      if (!navigator.clipboard) {
        setCopyState("failed");
        return;
      }
      await navigator.clipboard.writeText(JSON.stringify({ generatedAt: new Date().toISOString(), lookupEndpoint, diagnosticsEndpoint, approvalEndpoint, queueCount, entries, runtimeEvents, runtimeWarnings }, null, 2));
      setCopyState("copied");
      setMessage("Diagnostics snapshot copied.");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("failed");
      setMessage("Unable to copy the diagnostics snapshot.");
    }
  }

  if (!canAdmin) {
    return (
      <div className="wm-page">
        <section className="wm-project-overview-page__intro">
          <div className="wm-project-overview-page__intro-copy">
            <div className="wm-project-overview-page__eyebrow">Support</div>
            <h1>Competitor Lookup Diagnostics</h1>
            <p>This support console is restricted to administrator roles.</p>
          </div>
          <div className="wm-project-overview-page__intro-actions">
            <Link to={WM_ROUTES.tools} className="wm-btn-primary">Back to Tool Hub</Link>
          </div>
        </section>
      </div>
    );
  }

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">Choose the maintenance view on the left, then keep runtime health or cache approval detail visible on the right.</div>
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Support views</h3><p className="wm-workspace-card__copy">Switch between workspace health, live runtime diagnostics, and the approval queue without leaving the tool.</p></div>
        <div className="wm-workspace-tab-row" role="tablist" aria-label="Diagnostics views">
          {["overview", "runtime", "cache"].map((item) => <button key={item} type="button" className={`wm-workspace-tab${view === item ? " wm-workspace-tab--active" : ""}`} onClick={() => setView(item as ViewId)}>{item === "cache" ? "Cache & Queue" : item[0].toUpperCase() + item.slice(1)}</button>)}
        </div>
      </section>
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Admin controls</h3><p className="wm-workspace-card__copy">Run maintenance actions here instead of burying them inside collapsible cards.</p></div>
        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-secondary" onClick={refresh}>Refresh</button>
          <button type="button" className="wm-btn-secondary" onClick={() => { const removed = pruneExpiredCompetitorLookupCache(); refresh(); setMessage(`Pruned ${removed} expired cache entr${removed === 1 ? "y" : "ies"}.`); }}>Prune Expired</button>
          <button type="button" className="wm-btn-secondary" onClick={copySnapshot}>Copy Snapshot</button>
          <button type="button" className="wm-btn-secondary" disabled={queueCount === 0 || activeAction === "flush-queue"} onClick={() => { setActiveAction("flush-queue"); void flushApprovalQueue().then((result) => { refresh(); setActiveAction(""); setMessage(`Queue flush complete. Sent: ${result.sent}, failed: ${result.failed}, remaining: ${result.remaining}.`); }); }}>{activeAction === "flush-queue" ? "Flushing..." : "Flush Queue"}</button>
          <button type="button" className="wm-btn-secondary" disabled={queueCount === 0} onClick={() => { clearApprovalQueue(); refresh(); setMessage("Approval queue cleared."); }}>Clear Queue</button>
          <button type="button" className="wm-btn-primary" disabled={entries.length === 0} onClick={() => { clearCompetitorLookupCache(); refresh(); setMessage("Lookup cache cleared."); }}>Clear Lookup Cache</button>
        </div>
      </section>
      {view === "runtime" ? (
        <section className="wm-workspace-card">
          <div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Runtime filters</h3><p className="wm-workspace-card__copy">Filter the feed before pruning or clearing it.</p></div>
          <div className="wm-lookup-diagnostics-page__filter-grid">
            <label className="wm-workspace-field"><span className="wm-workspace-label">Severity</span><select className="wm-form-input" value={severityFilter} onChange={(event) => setSeverityFilter(event.currentTarget.value as SeverityFilter)}><option value="warn-error">Warn + Error</option><option value="all">All</option><option value="error">Error only</option><option value="warn">Warn only</option><option value="info">Info only</option></select></label>
            <label className="wm-workspace-field"><span className="wm-workspace-label">Scope</span><select className="wm-form-input" value={scopeFilter} onChange={(event) => setScopeFilter(event.currentTarget.value)}><option value="all">All scopes</option>{runtimeScopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
            <label className="wm-workspace-field wm-lookup-diagnostics-page__field-span"><span className="wm-workspace-label">Search</span><input className="wm-form-input" value={searchFilter} onChange={(event) => setSearchFilter(event.currentTarget.value)} placeholder="mode, brand, sku, warning..." /></label>
            <label className="wm-workspace-field"><span className="wm-workspace-label">Retain days</span><input className="wm-form-input" type="number" min={1} max={3650} value={retainDays} onChange={(event) => setRetainDays(event.currentTarget.value)} /></label>
          </div>
          <div className="wm-workspace-action-row">
            <button type="button" className="wm-btn-secondary" disabled={activeAction === "prune-runtime-feed"} onClick={() => { const days = Math.max(1, Math.min(3650, Number(retainDays) || 30)); setActiveAction("prune-runtime-feed"); void pruneCompetitorLookupRuntimeDiagnosticsFeed(days).then((result) => { refresh(); setActiveAction(""); setMessage(`${result.message}${result.warnings.length ? ` Warnings: ${result.warnings.join(" ")}` : ""}`); }); }}>{activeAction === "prune-runtime-feed" ? "Pruning..." : "Prune Runtime Feed"}</button>
            <button type="button" className="wm-btn-primary" disabled={activeAction === "clear-runtime-feed"} onClick={() => { setActiveAction("clear-runtime-feed"); void clearCompetitorLookupRuntimeDiagnosticsFeed().then((result) => { refresh(); setActiveAction(""); setMessage(`${result.message}${result.warnings.length ? ` Warnings: ${result.warnings.join(" ")}` : ""}`); }); }}>{activeAction === "clear-runtime-feed" ? "Clearing..." : "Clear Runtime Feed"}</button>
          </div>
        </section>
      ) : null}
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Environment</h3><p className="wm-workspace-card__copy">Keep the integration endpoints visible while you diagnose the feed.</p></div>
        <div className="wm-lookup-diagnostics-page__meta-list">
          <div className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">Lookup endpoint</span><span className="wm-workspace-list-item__copy">{lookupEndpoint || "Not configured"}</span></div>
          <div className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">Approval endpoint</span><span className="wm-workspace-list-item__copy">{approvalEndpoint || "Not configured"}</span></div>
          <div className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">Diagnostics endpoint</span><span className="wm-workspace-list-item__copy">{diagnosticsEndpoint || "Not configured"}</span></div>
        </div>
      </section>
    </div>
  );

  const overview = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card"><div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Workspace health</h3><p className="wm-workspace-card__copy">{runtimeHealthSummary}</p></div><div className="wm-workspace-grid-3"><div className="wm-workspace-metric"><span>Cache entries</span><strong>{entries.length}</strong></div><div className="wm-workspace-metric"><span>Approval queue</span><strong>{queueCount}</strong></div><div className="wm-workspace-metric"><span>Runtime feed</span><strong>{runtimeFeedAvailable ? "Online" : "Offline"}</strong></div><div className="wm-workspace-metric"><span>Visible events</span><strong>{filteredRuntimeEvents.length}</strong></div><div className="wm-workspace-metric"><span>Source mix</span><strong>{sources}</strong></div><div className="wm-workspace-metric"><span>Clipboard</span><strong>{copyState === "idle" ? "Ready" : copyState === "copied" ? "Copied" : "Copy failed"}</strong></div></div></section>
      <section className="wm-workspace-card wm-workspace-card--muted"><div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Contract summary</h3><p className="wm-workspace-card__copy">{contractSummary}</p></div></section>
      {runtimeWarnings.length > 0 ? <section className="wm-workspace-card"><div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Warnings</h3><p className="wm-workspace-card__copy">Recent issues that should be reviewed before relying on cached lookup results.</p></div><div className="wm-workspace-list">{runtimeWarnings.map((warning, index) => <div key={`${warning}_${index}`} className="wm-workspace-list-item"><span className="wm-workspace-list-item__title">{warning}</span></div>)}</div></section> : null}
    </div>
  );

  const runtime = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card"><div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Runtime feed</h3><p className="wm-workspace-card__copy">{runtimeHealthSummary}</p></div>{runtimeEvents.length === 0 ? <div className="wm-workspace-empty">No backend warning or trace events have been captured yet.</div> : filteredRuntimeEvents.length === 0 ? <div className="wm-workspace-empty">No backend events match the current filters.</div> : <div className="wm-workspace-list">{filteredRuntimeEvents.map((event) => <article key={event.id} className="wm-workspace-list-item wm-lookup-diagnostics-page__runtime-item"><span className="wm-workspace-list-item__eyebrow">{event.scope} / {event.mode} / {event.severity}</span><span className="wm-workspace-list-item__title">{event.message}</span><span className="wm-workspace-list-item__copy">{formatDateTime(event.timestamp)}{event.brand || event.sku ? ` / ${event.brand ?? "-"} ${event.sku ?? ""}` : ""}</span>{event.warnings.length > 0 ? <div className="wm-lookup-diagnostics-page__warning-stack">{event.warnings.map((warning, index) => <span key={`${event.id}_${index}`} className="wm-lookup-diagnostics-page__warning">{warning}</span>)}</div> : null}{event.trace.length > 0 ? <details><summary className="wm-lookup-diagnostics-page__trace-summary">Trace ({event.trace.length})</summary><pre className="wm-lookup-diagnostics-page__trace">{JSON.stringify(event.trace, null, 2)}</pre></details> : null}</article>)}</div>}</section>
    </div>
  );

  const cache = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card"><div className="wm-workspace-card__header"><h3 className="wm-workspace-card__title">Approval queue</h3><p className="wm-workspace-card__copy">Review and approve cached lookup records into the competitor pipeline.</p></div>{entries.length === 0 ? <div className="wm-workspace-empty">No lookup cache entries were found.</div> : <div className="wm-workspace-list">{entries.map((entry) => <article key={`${entry.cacheKey}_${entry.savedAt}`} className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">{entry.brand} / {entry.sku}</span><span className="wm-workspace-list-item__title">{entry.name}</span><span className="wm-workspace-list-item__copy">Source {entry.source} / saved {formatDateTime(entry.savedAt)} / age {entry.ageSeconds}s / {entry.expired ? "expired" : `expires in ${entry.expiresInSeconds}s`}</span><div className="wm-workspace-inline-actions">{entry.sourceUrl ? <a className="wm-btn-secondary" href={entry.sourceUrl} target="_blank" rel="noreferrer">Open Source</a> : null}<button type="button" className="wm-btn-primary" disabled={activeAction === actionId(entry)} onClick={() => { void approve(entry); }}>{activeAction === actionId(entry) ? "Saving..." : "Save Approved Entry"}</button></div></article>)}</div>}</section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Competitor Lookup Diagnostics"
      subtitle="Keep support controls on the left, then inspect workspace health, live runtime diagnostics, or cache approvals on the right."
      leftTitle="Controls"
      rightTitle={view === "overview" ? "Workspace Health" : view === "runtime" ? "Runtime Feed" : "Cache & Queue"}
      left={left}
      right={view === "overview" ? overview : view === "runtime" ? runtime : cache}
      top={<div className="wm-workspace-action-row"><Link to={WM_ROUTES.tools} className="wm-btn-secondary">Tool Hub</Link><Link to="/app/tools/product-intelligence" className="wm-btn-secondary">Product Intelligence</Link></div>}
      bottom={<div className="wm-lookup-diagnostics-page__status" role="status" aria-live="polite">{actionMessage || `${entries.length} cache entries / ${queueCount} queued approvals / feed refreshed ${formatDateTime(runtimeFeedFetchedAt)}`}</div>}
    />
  );
}

