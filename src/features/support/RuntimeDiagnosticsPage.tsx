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
    <div className="wm-page" style={{ display: "grid", gap: 10 }}>
      <section className="wm-hero">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
          <div>
            <div className="wm-title-xl">Runtime Diagnostics</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Support view for recent uncaught runtime errors captured in this browser session.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools")}>
              Tool Hub
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

      <section className="wm-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="wm-card" style={{ padding: 12 }}>
          <div className="wm-section-title">Captured errors</div>
          <div className="wm-title-lg">{entries.length}</div>
        </div>
        <div className="wm-card" style={{ padding: 12 }}>
          <div className="wm-section-title">Latest timestamp</div>
          <div className="wm-title-lg" style={{ fontSize: 14 }}>
            {latest ? formatTimestamp(latest.timestamp) : "-"}
          </div>
        </div>
        <div className="wm-card" style={{ padding: 12 }}>
          <div className="wm-section-title">Latest kind</div>
          <div className="wm-title-lg">{latest?.kind ?? "-"}</div>
        </div>
        <div className="wm-card" style={{ padding: 12 }}>
          <div className="wm-section-title">Clipboard</div>
          <div className="wm-title-lg" style={{ fontSize: 14 }}>
            {copyState === "idle" ? "Ready" : copyState === "copied" ? "Copied" : "Copy failed"}
          </div>
        </div>
      </section>

      <section className="wm-card" style={{ padding: 12 }}>
        <div className="wm-section-title">Recent runtime errors</div>

        {entries.length === 0 ? (
          <div className="wm-body" style={{ marginTop: 8 }}>No runtime errors captured for this session.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className="wm-panel"
                style={{ padding: 10, border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>#{index + 1} {entry.kind}</strong>
                    <span style={{ opacity: 0.75, fontSize: 12 }}>{formatTimestamp(entry.timestamp)}</span>
                  </div>

                  <div style={{ fontSize: 13, lineHeight: 1.45 }}>{entry.message}</div>

                  {entry.source ? (
                    <div style={{ fontSize: 12, opacity: 0.78 }}>
                      Source: {entry.source}{entry.line != null ? `:${entry.line}` : ""}{entry.column != null ? `:${entry.column}` : ""}
                    </div>
                  ) : null}

                  {entry.stack ? (
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 12, opacity: 0.86 }}>Stack trace</summary>
                      <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.86 }}>{entry.stack}</pre>
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
