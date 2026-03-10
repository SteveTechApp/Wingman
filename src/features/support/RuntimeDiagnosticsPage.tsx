import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  clearRecentRuntimeErrors,
  getRecentRuntimeErrors,
  type RuntimeErrorEntry,
} from "@/app/runtime/errorReporting";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toSupportText(entries: RuntimeErrorEntry[]): string {
  return entries
    .map((entry, index) => {
      const lines = [
        `#${index + 1}`,
        `id: ${entry.id}`,
        `time: ${entry.timestamp}`,
        `kind: ${entry.kind}`,
        `message: ${entry.message}`,
      ];

      if (entry.source) lines.push(`source: ${entry.source}`);
      if (entry.line != null || entry.column != null) {
        lines.push(`position: ${entry.line ?? "?"}:${entry.column ?? "?"}`);
      }
      if (entry.stack) lines.push(`stack: ${entry.stack}`);

      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}

export default function RuntimeDiagnosticsPage() {
  const nav = useNavigate();
  const [entries, setEntries] = React.useState<RuntimeErrorEntry[]>(() => getRecentRuntimeErrors());
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");

  const refresh = React.useCallback(() => {
    setEntries(getRecentRuntimeErrors());
  }, []);

  const clearAll = React.useCallback(() => {
    clearRecentRuntimeErrors();
    setEntries([]);
  }, []);

  const copyForSupport = React.useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        setCopyState("failed");
        return;
      }
      await navigator.clipboard.writeText(toSupportText(entries));
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      setCopyState("failed");
    }
  }, [entries]);

  const latest = entries[0];

  return (
    <div className="wm-page wm-runtime-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid">
            <div className="wm-title-xl">Runtime Diagnostics</div>
            <div className="wm-body-sm wm-page-subtitle">
              Support view for recent uncaught runtime errors captured in this browser session.
            </div>
          </div>

          <div className="wm-actions-row">
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools")}>
              Tool Hub
            </button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools/competitor-lookup-diagnostics")}>
              Lookup Diagnostics
            </button>
            <button type="button" className="wm-btn" onClick={refresh}>
              Refresh
            </button>
            <button type="button" className="wm-btn" onClick={copyForSupport} disabled={entries.length === 0}>
              Copy for Support
            </button>
            <button type="button" className="wm-btn wm-btn-primary" onClick={clearAll} disabled={entries.length === 0}>
              Clear Errors
            </button>
          </div>
        </div>
      </section>

      <section className="wm-grid-cards wm-runtime-page__stats">
        <article className="wm-work-card">
          <div className="wm-section-title">Captured errors</div>
          <div className="wm-title-lg">{entries.length}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Latest timestamp</div>
          <div className="wm-title-lg wm-runtime-page__meta">
            {latest ? formatTimestamp(latest.timestamp) : "-"}
          </div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Latest kind</div>
          <div className="wm-title-lg">{latest?.kind ?? "-"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Clipboard</div>
          <div className="wm-title-lg wm-runtime-page__meta">
            {copyState === "idle" ? "Ready" : copyState === "copied" ? "Copied" : "Copy failed"}
          </div>
        </article>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Recent runtime errors</h2>
            <p>Session-level runtime failures captured by Wingman error reporting.</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="wm-body">No runtime errors captured for this session.</div>
        ) : (
          <div className="wm-runtime-page__list">
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className="wm-panel"
              >
                <div className="wm-runtime-page__entry">
                  <div className="wm-runtime-page__entry-head">
                    <strong>#{index + 1} {entry.kind}</strong>
                    <span className="wm-runtime-page__entry-time">{formatTimestamp(entry.timestamp)}</span>
                  </div>

                  <div className="wm-runtime-page__entry-message">{entry.message}</div>

                  {entry.source ? (
                    <div className="wm-runtime-page__entry-source">
                      Source: {entry.source}{entry.line != null ? `:${entry.line}` : ""}{entry.column != null ? `:${entry.column}` : ""}
                    </div>
                  ) : null}

                  {entry.stack ? (
                    <details>
                      <summary className="wm-runtime-page__stack-summary">Stack trace</summary>
                      <pre className="wm-runtime-page__stack">{entry.stack}</pre>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
