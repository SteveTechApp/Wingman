/**
 * AuditLogPanel — Displays a project's audit trail as a timeline.
 *
 * Shows discovery edits, product selection changes, proposal modifications,
 * comparison runs, stage transitions, and approval actions with actor name,
 * timestamp, and detail.
 */

import { useMemo, useState } from "react";
import { Clock, Filter, GitBranch, Search, Shield, ShoppingCart, FileText, ArrowRightLeft, CheckCircle } from "lucide-react";
import type { ProjectAuditEntry } from "../data/projectStore";

type AuditLogPanelProps = {
  entries: ProjectAuditEntry[];
};

const SCOPE_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  discovery: { icon: GitBranch, label: "Discovery", color: "#60a5fa" },
  products: { icon: ShoppingCart, label: "Products", color: "#34d399" },
  proposal: { icon: FileText, label: "Proposal", color: "#a78bfa" },
  compare: { icon: ArrowRightLeft, label: "Compare", color: "#fbbf24" },
  approval: { icon: CheckCircle, label: "Approval", color: "#f472b6" },
  project: { icon: Shield, label: "Project", color: "#94a3b8" },
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function AuditLogPanel({ entries }: AuditLogPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (scopeFilter) {
      result = result.filter((e) => e.scope === scopeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.detail.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.actorName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, scopeFilter, searchQuery]);

  const scopeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.scope] = (counts[entry.scope] || 0) + 1;
    }
    return counts;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="wm-audit-empty">
        <Clock size={20} aria-hidden="true" />
        <p>No audit events recorded yet. Actions will appear here as the project progresses.</p>
      </div>
    );
  }

  return (
    <div className="wm-audit-panel">
      <div className="wm-audit-controls">
        <div className="wm-audit-search-wrap">
          <Search size={14} className="wm-audit-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="wm-audit-search"
            placeholder="Search audit log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search audit log"
          />
        </div>
        <div className="wm-audit-scope-filters">
          <button
            type="button"
            className={`wm-audit-scope-chip ${scopeFilter === null ? "is-active" : ""}`}
            onClick={() => setScopeFilter(null)}
          >
            All ({entries.length})
          </button>
          {Object.entries(scopeCounts).map(([scope, count]) => {
            const config = SCOPE_CONFIG[scope] || { label: scope, color: "#94a3b8" };
            return (
              <button
                key={scope}
                type="button"
                className={`wm-audit-scope-chip ${scopeFilter === scope ? "is-active" : ""}`}
                onClick={() => setScopeFilter(scopeFilter === scope ? null : scope)}
                style={{ "--chip-color": config.color } as React.CSSProperties}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="wm-audit-timeline" role="list" aria-label="Project audit trail">
        {filteredEntries.length === 0 ? (
          <div className="wm-audit-empty">
            <Filter size={16} aria-hidden="true" />
            <p>No events match your filter.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const config = SCOPE_CONFIG[entry.scope] || { icon: Clock, label: entry.scope, color: "#94a3b8" };
            const Icon = config.icon;
            return (
              <div key={entry.id} className="wm-audit-entry" role="listitem">
                <div className="wm-audit-entry-icon" style={{ color: config.color }}>
                  <Icon size={14} aria-hidden="true" />
                </div>
                <div className="wm-audit-entry-content">
                  <div className="wm-audit-entry-header">
                    <span className="wm-audit-entry-action" style={{ color: config.color }}>
                      {config.label}
                    </span>
                    <span className="wm-audit-entry-time">{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  <p className="wm-audit-entry-detail">{entry.detail}</p>
                  <span className="wm-audit-entry-actor">{entry.actorName}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
