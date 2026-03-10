import * as React from "react";
import { useNavigate } from "react-router-dom";
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
  type CompetitorLookupRuntimeEvent,
  type CompetitorLookupCacheEntrySummary,
} from "@/services/competitorLookupService";
import {
  clearApprovalQueue,
  flushApprovalQueue,
  getApprovalQueueEntries,
  getCompetitorApprovalEndpoint,
  saveApprovedLookupEntry,
} from "@/services/competitorApprovalService";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function entryActionId(entry: CompetitorLookupCacheEntrySummary): string {
  return `${entry.cacheKey}::${entry.sku}`;
}

type RuntimeSeverityFilter = "all" | "warn-error" | "warn" | "error" | "info";

function severityRank(value: string): number {
  const severity = String(value ?? "").trim().toLowerCase();
  if (severity === "error") return 3;
  if (severity === "warn" || severity === "warning") return 2;
  if (severity === "info") return 1;
  return 0;
}

function matchesSeverityFilter(value: string, filter: RuntimeSeverityFilter): boolean {
  const rank = severityRank(value);
  if (filter === "all") return true;
  if (filter === "warn-error") return rank >= 2;
  if (filter === "warn") return rank === 2;
  if (filter === "error") return rank === 3;
  if (filter === "info") return rank === 1;
  return true;
}

export default function CompetitorLookupDiagnosticsPage() {
  const nav = useNavigate();
  const [entries, setEntries] = React.useState<CompetitorLookupCacheEntrySummary[]>(() => getCompetitorLookupCacheEntries());
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
  const [actionMessage, setActionMessage] = React.useState<string>("");
  const [activeActionId, setActiveActionId] = React.useState<string>("");
  const [queueCount, setQueueCount] = React.useState<number>(() => getApprovalQueueEntries().length);
  const [runtimeEvents, setRuntimeEvents] = React.useState<CompetitorLookupRuntimeEvent[]>([]);
  const [runtimeWarnings, setRuntimeWarnings] = React.useState<string[]>([]);
  const [runtimeFeedAvailable, setRuntimeFeedAvailable] = React.useState<boolean>(false);
  const [runtimeFeedFetchedAt, setRuntimeFeedFetchedAt] = React.useState<string>("");
  const [runtimeFeedMaxEvents, setRuntimeFeedMaxEvents] = React.useState<number>(0);
  const [runtimeHealthSummary, setRuntimeHealthSummary] = React.useState<string>("-");
  const [runtimeSeverityFilter, setRuntimeSeverityFilter] = React.useState<RuntimeSeverityFilter>("warn-error");
  const [runtimeScopeFilter, setRuntimeScopeFilter] = React.useState<string>("all");
  const [runtimeSearchFilter, setRuntimeSearchFilter] = React.useState<string>("");
  const [runtimePruneDays, setRuntimePruneDays] = React.useState<string>("30");

  const lookupEndpoint = getCompetitorLookupEndpoint();
  const diagnosticsEndpoint = getCompetitorLookupDiagnosticsEndpoint();
  const approvalEndpoint = getCompetitorApprovalEndpoint();
  const contractSummary = getCompetitorLookupContractSummary();

  const refreshLocal = React.useCallback(() => {
    setEntries(getCompetitorLookupCacheEntries());
    setQueueCount(getApprovalQueueEntries().length);
  }, []);

  const refreshRuntimeFeed = React.useCallback(async () => {
    const diagnostics = await fetchCompetitorLookupRuntimeDiagnostics();
    setRuntimeEvents(diagnostics.events);
    setRuntimeWarnings(diagnostics.warnings);
    setRuntimeFeedAvailable(diagnostics.available);
    setRuntimeFeedFetchedAt(diagnostics.fetchedAt);
    setRuntimeFeedMaxEvents(diagnostics.maxEvents);

    const buffered = Number(diagnostics.health?.runtimeEventsBuffered ?? diagnostics.count);
    const maxEvents = Number(diagnostics.health?.liveRuntimeEventMax ?? diagnostics.maxEvents);
    const liveEnabled = diagnostics.health?.liveEnrichmentEnabled === true ? "Live enrichment on" : "Live enrichment off";
    const persistenceEnabled = diagnostics.health?.runtimeEventsPersistenceEnabled === true;
    const persistenceMode = diagnostics.mode || "unknown";
    const persistedCount = Number(diagnostics.health?.runtimeEventsPersistedCount ?? 0);
    const persistFailures = Number(diagnostics.health?.runtimeEventsPersistFailures ?? 0);
    const persistence = persistenceEnabled
      ? `${persistenceMode} persisted:${persistedCount} failed:${persistFailures}`
      : "memory-only diagnostics";

    if (!diagnostics.available) {
      setRuntimeHealthSummary("Diagnostics endpoint unavailable.");
      return;
    }

    setRuntimeHealthSummary(`${liveEnabled} | ${persistence} | buffered ${buffered}/${maxEvents || diagnostics.maxEvents || "-"}`);
  }, []);

  const refresh = React.useCallback(() => {
    refreshLocal();
    void refreshRuntimeFeed();
  }, [refreshLocal, refreshRuntimeFeed]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const clearLookupCache = React.useCallback(() => {
    clearCompetitorLookupCache();
    setEntries([]);
    setActionMessage("Lookup cache cleared.");
  }, []);

  const pruneExpired = React.useCallback(() => {
    const removed = pruneExpiredCompetitorLookupCache();
    refresh();
    setActionMessage(`Pruned ${removed} expired cache entr${removed === 1 ? "y" : "ies"}.`);
  }, [refresh]);

  const flushQueue = React.useCallback(async () => {
    setActiveActionId("flush-queue");
    const result = await flushApprovalQueue();
    refresh();
    setActiveActionId("");
    setActionMessage(
      `Queue flush complete. Sent: ${result.sent}, failed: ${result.failed}, remaining: ${result.remaining}.`,
    );
  }, [refresh]);

  const clearQueue = React.useCallback(() => {
    clearApprovalQueue();
    refresh();
    setActionMessage("Approval queue cleared.");
  }, [refresh]);

  const approveEntry = React.useCallback(
    async (entry: CompetitorLookupCacheEntrySummary) => {
      const id = entryActionId(entry);
      setActiveActionId(id);
      const result = await saveApprovedLookupEntry(entry);
      refresh();
      setActiveActionId("");
      const warningText = result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(" ")}` : "";
      setActionMessage(`${result.message}${warningText}`);
    },
    [refresh],
  );

  const clearRuntimeFeed = React.useCallback(async () => {
    setActiveActionId("clear-runtime-feed");
    const result = await clearCompetitorLookupRuntimeDiagnosticsFeed();
    refresh();
    setActiveActionId("");
    const warningText = result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(" ")}` : "";
    setActionMessage(`${result.message}${warningText}`);
  }, [refresh]);

  const pruneRuntimeFeed = React.useCallback(async () => {
    const days = Math.max(1, Math.min(3650, Number(runtimePruneDays) || 30));
    setActiveActionId("prune-runtime-feed");
    const result = await pruneCompetitorLookupRuntimeDiagnosticsFeed(days);
    refresh();
    setActiveActionId("");
    const warningText = result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(" ")}` : "";
    setActionMessage(`${result.message}${warningText}`);
  }, [refresh, runtimePruneDays]);

  const copySnapshot = React.useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        setCopyState("failed");
        return;
      }

      const payload = {
        generatedAt: new Date().toISOString(),
        lookupEndpoint: lookupEndpoint ?? "not-configured",
        diagnosticsEndpoint: diagnosticsEndpoint ?? "not-configured",
        approvalEndpoint: approvalEndpoint ?? "not-configured",
        entryCount: entries.length,
        queueCount,
        runtimeFeedAvailable,
        runtimeFeedFetchedAt,
        runtimeFeedMaxEvents,
        runtimeHealthSummary,
        runtimeWarnings,
        runtimeEvents,
        entries,
      };

      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyState("copied");
      setActionMessage("Diagnostics snapshot copied.");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("failed");
    }
  }, [approvalEndpoint, diagnosticsEndpoint, entries, lookupEndpoint, queueCount, runtimeEvents, runtimeFeedAvailable, runtimeFeedFetchedAt, runtimeFeedMaxEvents, runtimeHealthSummary, runtimeWarnings]);

  const sources = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      map.set(entry.source, (map.get(entry.source) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => `${source}: ${count}`)
      .join(" | ") || "-";
  }, [entries]);

  const runtimeScopes = React.useMemo(() => {
    const scopes = Array.from(new Set(runtimeEvents.map((event) => String(event.scope || "").trim()).filter(Boolean)));
    return scopes.sort((a, b) => a.localeCompare(b));
  }, [runtimeEvents]);

  const filteredRuntimeEvents = React.useMemo(() => {
    const query = runtimeSearchFilter.trim().toLowerCase();
    return runtimeEvents.filter((event) => {
      if (!matchesSeverityFilter(event.severity, runtimeSeverityFilter)) return false;
      if (runtimeScopeFilter !== "all" && event.scope !== runtimeScopeFilter) return false;
      if (!query) return true;

      const blob = [
        event.scope,
        event.severity,
        event.mode,
        event.message,
        event.query,
        event.brand,
        event.sku,
        ...(event.warnings ?? []),
      ].join(" ").toLowerCase();
      return blob.includes(query);
    });
  }, [runtimeEvents, runtimeSeverityFilter, runtimeScopeFilter, runtimeSearchFilter]);

  return (
    <div className="wm-page wm-lookup-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid">
            <div className="wm-title-xl">Competitor Lookup Diagnostics</div>
            <div className="wm-body-sm wm-page-subtitle">
              Support view for lookup contract health, cache/provenance entries, and competitor DB approval actions.
            </div>
          </div>

          <div className="wm-actions-row">
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools")}>
              Tool Hub
            </button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools/runtime-diagnostics")}>
              Runtime Diagnostics
            </button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools/product-intelligence")}>
              Product Intelligence
            </button>
            <button type="button" className="wm-btn" onClick={refresh}>
              Refresh
            </button>
            <button type="button" className="wm-btn" onClick={pruneExpired}>
              Prune Expired
            </button>
            <button type="button" className="wm-btn" onClick={flushQueue} disabled={activeActionId === "flush-queue" || queueCount === 0}>
              {activeActionId === "flush-queue" ? "Flushing..." : "Flush Queue"}
            </button>
            <button type="button" className="wm-btn" onClick={clearQueue} disabled={queueCount === 0}>
              Clear Queue
            </button>
            <button
              type="button"
              className="wm-btn"
              onClick={copySnapshot}
              disabled={entries.length === 0 && runtimeEvents.length === 0 && runtimeWarnings.length === 0}
            >
              Copy Snapshot
            </button>
            <button type="button" className="wm-btn wm-btn-primary" onClick={clearLookupCache} disabled={entries.length === 0}>
              Clear Lookup Cache
            </button>
          </div>
        </div>
      </section>

      <section className="wm-grid-cards wm-lookup-page__stats">
        <article className="wm-work-card">
          <div className="wm-section-title">Cache entries</div>
          <div className="wm-title-lg">{entries.length}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Lookup endpoint</div>
          <div className="wm-title-lg wm-lookup-page__meta">{lookupEndpoint ?? "Not configured"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Approval endpoint</div>
          <div className="wm-title-lg wm-lookup-page__meta">{approvalEndpoint ?? "Not configured"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Approval queue</div>
          <div className="wm-title-lg wm-lookup-page__meta">{queueCount}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Diagnostics endpoint</div>
          <div className="wm-title-lg wm-lookup-page__meta">{diagnosticsEndpoint ?? "Not configured"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Runtime feed</div>
          <div className="wm-title-lg wm-lookup-page__meta">{runtimeFeedAvailable ? "Online" : "Offline"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Recent events</div>
          <div className="wm-title-lg wm-lookup-page__meta">
            {filteredRuntimeEvents.length} visible
            {runtimeEvents.length !== filteredRuntimeEvents.length ? ` (${runtimeEvents.length} total)` : ""}
            {runtimeFeedMaxEvents ? ` / ${runtimeFeedMaxEvents}` : ""}
          </div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Feed refreshed</div>
          <div className="wm-title-lg wm-lookup-page__meta">{runtimeFeedFetchedAt ? formatTimestamp(runtimeFeedFetchedAt) : "-"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Source mix</div>
          <div className="wm-title-lg wm-lookup-page__meta">{sources}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Clipboard</div>
          <div className="wm-title-lg wm-lookup-page__meta">
            {copyState === "idle" ? "Ready" : copyState === "copied" ? "Copied" : "Copy failed"}
          </div>
        </article>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Backend contract summary</h2>
            <p>{contractSummary}</p>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Backend fallback warnings and traces</h2>
            <p>{runtimeHealthSummary}</p>
          </div>
        </div>

        <div className="wm-lookup-page__runtime-filters">
          <label className="wm-lookup-page__runtime-filter">
            <span>Severity</span>
            <select
              className="wm-form-input"
              value={runtimeSeverityFilter}
              onChange={(event) => setRuntimeSeverityFilter(event.currentTarget.value as RuntimeSeverityFilter)}
            >
              <option value="warn-error">Warn + Error</option>
              <option value="all">All</option>
              <option value="error">Error only</option>
              <option value="warn">Warn only</option>
              <option value="info">Info only</option>
            </select>
          </label>

          <label className="wm-lookup-page__runtime-filter">
            <span>Scope</span>
            <select
              className="wm-form-input"
              value={runtimeScopeFilter}
              onChange={(event) => setRuntimeScopeFilter(event.currentTarget.value)}
            >
              <option value="all">All scopes</option>
              {runtimeScopes.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
          </label>

          <label className="wm-lookup-page__runtime-filter">
            <span>Search</span>
            <input
              className="wm-form-input"
              value={runtimeSearchFilter}
              onChange={(event) => setRuntimeSearchFilter(event.currentTarget.value)}
              placeholder="mode, brand, sku, warning..."
            />
          </label>
        </div>

        <div className="wm-lookup-page__runtime-maintenance">
          <label className="wm-lookup-page__runtime-filter wm-lookup-page__runtime-filter--days">
            <span>Retain days</span>
            <input
              className="wm-form-input"
              type="number"
              min={1}
              max={3650}
              value={runtimePruneDays}
              onChange={(event) => setRuntimePruneDays(event.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            className="wm-btn"
            onClick={pruneRuntimeFeed}
            disabled={activeActionId === "prune-runtime-feed"}
          >
            {activeActionId === "prune-runtime-feed" ? "Pruning..." : "Prune Runtime Feed"}
          </button>
          <button
            type="button"
            className="wm-btn wm-btn-primary"
            onClick={clearRuntimeFeed}
            disabled={activeActionId === "clear-runtime-feed"}
          >
            {activeActionId === "clear-runtime-feed" ? "Clearing..." : "Clear Runtime Feed"}
          </button>
        </div>

        {runtimeWarnings.length > 0 ? (
          <div className="wm-lookup-page__runtime-warnings">
            {runtimeWarnings.map((warning, index) => (
              <div key={`${warning}_${index}`} className="wm-lookup-page__runtime-warning-item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {runtimeEvents.length === 0 ? (
          <div className="wm-body">No backend warning/trace events captured yet.</div>
        ) : filteredRuntimeEvents.length === 0 ? (
          <div className="wm-body">No backend events match the selected filters.</div>
        ) : (
          <div className="wm-lookup-page__runtime-list">
            {filteredRuntimeEvents.map((event) => (
              <article key={event.id} className="wm-panel">
                <div className="wm-lookup-page__runtime-entry">
                  <div className="wm-lookup-page__runtime-head">
                    <strong>{event.scope} · {event.mode}</strong>
                    <span className={`wm-chip${event.severity === "warn" || event.severity === "error" ? " wm-chip--warn" : ""}`}>
                      {event.severity}
                    </span>
                  </div>
                  <div className="wm-lookup-page__runtime-meta">
                    {formatTimestamp(event.timestamp)}
                    {event.brand || event.sku ? ` | ${event.brand ?? "-"} ${event.sku ?? ""}` : ""}
                  </div>
                  <div className="wm-lookup-page__runtime-message">{event.message}</div>

                  {event.warnings.length > 0 ? (
                    <div className="wm-lookup-page__runtime-warning-stack">
                      {event.warnings.map((warning, index) => (
                        <div key={`${event.id}_warning_${index}`} className="wm-lookup-page__runtime-warning-item">
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {event.trace.length > 0 ? (
                    <details>
                      <summary className="wm-runtime-page__stack-summary">Trace ({event.trace.length})</summary>
                      <pre className="wm-runtime-page__stack">{JSON.stringify(event.trace, null, 2)}</pre>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Lookup cache entries</h2>
            <p>Review and approve cached lookup entries into the competitor DB pipeline.</p>
          </div>
        </div>

        {actionMessage ? <div className="wm-body-sm wm-lookup-page__action-msg">{actionMessage}</div> : null}

        {entries.length === 0 ? (
          <div className="wm-body">No lookup cache entries found.</div>
        ) : (
          <div className="wm-lookup-page__list">
            {entries.map((entry) => {
              const actionId = entryActionId(entry);
              const saving = activeActionId === actionId;
              return (
                <article key={`${entry.cacheKey}_${entry.savedAt}`} className="wm-panel">
                  <div className="wm-lookup-page__entry">
                    <div className="wm-lookup-page__entry-head">
                      <strong>{entry.brand} {entry.sku}</strong>
                      <span className={`wm-chip${entry.expired ? " wm-chip--warn" : ""}`}>
                        {entry.expired ? "Expired" : `Expires in ${entry.expiresInSeconds}s`}
                      </span>
                    </div>

                    <div className="wm-lookup-page__entry-grid">
                      <div><span>Source:</span><strong>{entry.source}</strong></div>
                      <div><span>Saved:</span><strong>{formatTimestamp(entry.savedAt)}</strong></div>
                      <div><span>Age:</span><strong>{entry.ageSeconds}s</strong></div>
                      <div><span>Name:</span><strong>{entry.name}</strong></div>
                      <div><span>Cache key:</span><strong>{entry.cacheKey}</strong></div>
                      <div>
                        <span>Source URL:</span>
                        {entry.sourceUrl ? (
                          <a className="wm-footer__link" href={entry.sourceUrl} target="_blank" rel="noreferrer">
                            {entry.sourceUrl}
                          </a>
                        ) : (
                          <strong>-</strong>
                        )}
                      </div>
                    </div>

                    <div className="wm-lookup-page__entry-actions">
                      <button
                        type="button"
                        className="wm-btn wm-btn-primary"
                        disabled={saving}
                        onClick={() => {
                          void approveEntry(entry);
                        }}
                      >
                        {saving ? "Saving..." : "Save Approved To Competitor DB"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
