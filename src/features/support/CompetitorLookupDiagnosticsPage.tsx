import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  clearCompetitorLookupCache,
  getCompetitorLookupCacheEntries,
  getCompetitorLookupContractSummary,
  getCompetitorLookupEndpoint,
  pruneExpiredCompetitorLookupCache,
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

export default function CompetitorLookupDiagnosticsPage() {
  const nav = useNavigate();
  const [entries, setEntries] = React.useState<CompetitorLookupCacheEntrySummary[]>(() => getCompetitorLookupCacheEntries());
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
  const [actionMessage, setActionMessage] = React.useState<string>("");
  const [activeActionId, setActiveActionId] = React.useState<string>("");
  const [queueCount, setQueueCount] = React.useState<number>(() => getApprovalQueueEntries().length);

  const lookupEndpoint = getCompetitorLookupEndpoint();
  const approvalEndpoint = getCompetitorApprovalEndpoint();
  const contractSummary = getCompetitorLookupContractSummary();

  const refresh = React.useCallback(() => {
    setEntries(getCompetitorLookupCacheEntries());
    setQueueCount(getApprovalQueueEntries().length);
  }, []);

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

  const copySnapshot = React.useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        setCopyState("failed");
        return;
      }

      const payload = {
        generatedAt: new Date().toISOString(),
        lookupEndpoint: lookupEndpoint ?? "not-configured",
        approvalEndpoint: approvalEndpoint ?? "not-configured",
        entryCount: entries.length,
        queueCount,
        entries,
      };

      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyState("copied");
      setActionMessage("Diagnostics snapshot copied.");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("failed");
    }
  }, [approvalEndpoint, entries, lookupEndpoint, queueCount]);

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
            <button type="button" className="wm-btn" onClick={copySnapshot} disabled={entries.length === 0}>
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

