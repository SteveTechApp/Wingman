import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardCopy,
  RadioTower,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import {
  clearRecentRuntimeErrors,
  getRecentRuntimeErrors,
  type RuntimeErrorEntry,
} from "@/app/runtime/errorReporting";
import {
  fetchDeploymentTelemetry,
  getPersistedDeploymentSession,
  type DeploymentTelemetryEvent,
} from "@/app/api/wingmanDeploymentClient";
import { useAuth } from "@/context";

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

function entryTone(kind: string): "warning" | "critical" {
  const normalized = kind.toLowerCase();
  return normalized.includes("unhandled") || normalized.includes("fatal") ? "critical" : "warning";
}

export default function RuntimeDiagnosticsPage() {
  const nav = useNavigate();
  const { mode, workspace } = useAuth();
  const [entries, setEntries] = React.useState<RuntimeErrorEntry[]>(() => getRecentRuntimeErrors());
  const [remoteEntries, setRemoteEntries] = React.useState<DeploymentTelemetryEvent[]>([]);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");

  const loadRemote = React.useCallback(async () => {
    if (mode !== "backend") {
      setRemoteEntries([]);
      return;
    }
    try {
      const session = getPersistedDeploymentSession();
      if (!session || session.mode !== "backend") return;
      const response = await fetchDeploymentTelemetry(session);
      setRemoteEntries(response.events);
    } catch {
      setRemoteEntries([]);
    }
  }, [mode]);

  const refresh = React.useCallback(() => {
    setEntries(getRecentRuntimeErrors());
    void loadRemote();
  }, [loadRemote]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadInitialRemote() {
      try {
        if (mode !== "backend") {
          setRemoteEntries([]);
          return;
        }
        const session = getPersistedDeploymentSession();
        if (!session || session.mode !== "backend") return;
        const response = await fetchDeploymentTelemetry(session);
        if (!cancelled) {
          setRemoteEntries(response.events);
        }
      } catch {
        if (!cancelled) {
          setRemoteEntries([]);
        }
      }
    }

    void loadInitialRemote();
    return () => {
      cancelled = true;
    };
  }, [mode]);

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
      <section className="wm-hero wm-runtime-page__hero">
        <div className="wm-runtime-page__hero-grid">
          <div className="wm-runtime-page__hero-copy">
            <div className="wm-kicker">Support Utility</div>
            <div className="wm-title-xl">Runtime Diagnostics</div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Review recent browser and deployment failures without wading through raw logs first.
            </div>

            <div className="wm-runtime-page__hero-chips">
              <div className="wm-runtime-page__hero-chip wm-runtime-page__hero-chip--amber">
                <ShieldAlert size={15} />
                <span>{entries.length} captured errors</span>
              </div>
              <div className="wm-runtime-page__hero-chip wm-runtime-page__hero-chip--cyan">
                <RadioTower size={15} />
                <span>{mode === "backend" ? `${remoteEntries.length} remote events` : "Demo mode only"}</span>
              </div>
              <div className="wm-runtime-page__hero-chip wm-runtime-page__hero-chip--indigo">
                <ClipboardCopy size={15} />
                <span>{copyState === "idle" ? "Clipboard ready" : copyState === "copied" ? "Copied" : "Copy failed"}</span>
              </div>
            </div>
          </div>

          <div className="wm-runtime-page__hero-panel">
            <div className="wm-runtime-page__hero-panel-kicker">
              <AlertTriangle size={15} />
              <span>Support actions</span>
            </div>

            <div className="wm-actions-row wm-runtime-page__hero-actions">
              <button type="button" className="wm-btn" onClick={() => nav("/app/tools")}>
                Tool Hub
              </button>
              <button type="button" className="wm-btn" onClick={() => nav("/app/tools/competitor-lookup-diagnostics")}>
                Lookup Diagnostics
              </button>
              <button type="button" className="wm-btn" onClick={() => nav("/app/tools/product-intelligence")}>
                Product Intelligence
              </button>
              <button type="button" className="wm-btn" onClick={refresh}>
                <RefreshCw size={15} />
                <span>Refresh</span>
              </button>
              <button type="button" className="wm-btn" onClick={copyForSupport} disabled={entries.length === 0}>
                Copy for Support
              </button>
              <button type="button" className="wm-btn wm-btn-primary" onClick={clearAll} disabled={entries.length === 0}>
                Clear Errors
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-indigo">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Runtime pulse</h2>
            <p>Quick readout of the current browser session and remote deployment visibility.</p>
          </div>
        </div>

        <div className="wm-runtime-page__stats">
          <article className="wm-work-card wm-runtime-page__stat-card wm-runtime-page__stat-card--amber">
            <div className="wm-runtime-page__stat-label">Captured errors</div>
            <div className="wm-title-lg">{entries.length}</div>
          </article>
          <article className="wm-work-card wm-runtime-page__stat-card wm-runtime-page__stat-card--indigo">
            <div className="wm-runtime-page__stat-label">Latest timestamp</div>
            <div className="wm-title-lg wm-runtime-page__meta">
              {latest ? formatTimestamp(latest.timestamp) : "-"}
            </div>
          </article>
          <article className="wm-work-card wm-runtime-page__stat-card wm-runtime-page__stat-card--cyan">
            <div className="wm-runtime-page__stat-label">Latest kind</div>
            <div className="wm-title-lg">{latest?.kind ?? "-"}</div>
          </article>
          <article className="wm-work-card wm-runtime-page__stat-card wm-runtime-page__stat-card--emerald">
            <div className="wm-runtime-page__stat-label">Remote telemetry</div>
            <div className="wm-title-lg wm-runtime-page__meta">
              {mode === "backend" ? remoteEntries.length : "Demo only"}
            </div>
          </article>
        </div>
      </section>

      <section className="wm-section wm-section--tone-amber">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Recent runtime errors</h2>
            <p>Session-level failures captured by Wingman error reporting.</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="wm-work-card wm-runtime-page__empty-state">
            <div className="wm-title-lg">No runtime errors captured</div>
            <div className="wm-body">This browser session is currently clear.</div>
          </div>
        ) : (
          <div className="wm-runtime-page__list">
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                className={`wm-panel wm-runtime-page__entry-card wm-runtime-page__entry-card--${entryTone(entry.kind)}`}
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
                    <details className="wm-runtime-page__stack-shell">
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

      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Remote deployment telemetry</h2>
            <p>
              {mode === "backend"
                ? `Server-side runtime events captured for ${workspace?.name ?? "this workspace"}.`
                : "Sign into a persisted workspace to capture remote telemetry and audit history."}
            </p>
          </div>
        </div>

        {mode !== "backend" ? (
          <div className="wm-work-card wm-runtime-page__empty-state">
            <div className="wm-title-lg">Remote telemetry unavailable</div>
            <div className="wm-body">Remote telemetry only appears in backend workspace mode.</div>
          </div>
        ) : remoteEntries.length === 0 ? (
          <div className="wm-work-card wm-runtime-page__empty-state">
            <div className="wm-title-lg">No remote runtime events yet</div>
            <div className="wm-body">The deployment feed is connected, but it has not captured any events yet.</div>
          </div>
        ) : (
          <div className="wm-runtime-page__list">
            {remoteEntries.map((entry, index) => (
              <article
                key={entry.id ?? `${entry.timestamp}_${index}`}
                className={`wm-panel wm-runtime-page__entry-card wm-runtime-page__entry-card--${entryTone(entry.kind)}`}
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
                    <details className="wm-runtime-page__stack-shell">
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
