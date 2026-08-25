import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  FolderKanban,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  buildQuoteSafetyDashboard,
  type ProjectSafetyRecord,
  type SafetyTier,
} from "../lib/quoteSafetyDashboard";

type SortKey = "safety" | "stale" | "products" | "name";

const TIER_STYLES: Record<SafetyTier, { bg: string; border: string; text: string; icon: typeof Shield }> = {
  ready: { bg: "bg-green-950/30", border: "border-green-500/30", text: "text-green-400", icon: ShieldCheck },
  "needs-review": { bg: "bg-amber-950/30", border: "border-amber-500/30", text: "text-amber-400", icon: ShieldAlert },
  "not-ready": { bg: "bg-red-950/30", border: "border-red-500/30", text: "text-red-400", icon: ShieldAlert },
};

function staleLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return `${days}d ago`;
  if (days <= 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function exportDashboardCsv(projects: ProjectSafetyRecord[]): void {
  const headers = ["Project", "Stage", "Status", "Safety Tier", "Blockers", "Warnings", "Products", "Days Since Update", "Deal Outcome"];
  const rows = projects.map((p) => [
    p.projectName,
    p.stage,
    p.status,
    p.safetyLabel,
    String(p.blockerCount),
    String(p.warningCount),
    String(p.productCount),
    String(p.daysSinceUpdate),
    p.dealOutcome ?? "",
  ]);
  const csvLines = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","));
  const csv = csvLines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wingman-quote-safety-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function QuoteSafetyDashboardPage() {
  const { projects, summary } = useMemo(() => buildQuoteSafetyDashboard(), []);
  const [tierFilter, setTierFilter] = useState<SafetyTier | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("safety");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = tierFilter === "all" ? projects : projects.filter((p) => p.safetyTier === tierFilter);
    if (sortBy === "stale") list = [...list].sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
    else if (sortBy === "products") list = [...list].sort((a, b) => b.productCount - a.productCount);
    else if (sortBy === "name") list = [...list].sort((a, b) => a.projectName.localeCompare(b.projectName));
    // default "safety" sort is already applied by the dashboard builder
    return list;
  }, [projects, tierFilter, sortBy]);

  return (
    <main className="wm-page wm-quote-safety-page wingman-page-host">
      <header className="wm-page-header">
        <div className="wm-page-header-icon"><Shield size={28} aria-hidden="true" /></div>
        <div>
          <h1 className="wm-page-title">Quote safety dashboard</h1>
          <p className="wm-page-subtitle">Portfolio view of all projects — blocker counts, staleness, and readiness to quote.</p>
        </div>
      </header>

      {/* Summary cards */}
      <div className="wm-safety-summary-grid">
        <div className="wm-safety-summary-card wm-safety-summary-total">
          <span className="wm-safety-summary-value">{summary.totalProjects}</span>
          <span className="wm-safety-summary-label">Total projects</span>
        </div>
        <div className="wm-safety-summary-card wm-safety-summary-ready">
          <CheckCircle2 size={18} className="text-green-400" aria-hidden="true" />
          <span className="wm-safety-summary-value">{summary.readyCount}</span>
          <span className="wm-safety-summary-label">Ready to quote</span>
        </div>
        <div className="wm-safety-summary-card wm-safety-summary-review">
          <AlertTriangle size={18} className="text-amber-400" aria-hidden="true" />
          <span className="wm-safety-summary-value">{summary.needsReviewCount}</span>
          <span className="wm-safety-summary-label">Needs review</span>
        </div>
        <div className="wm-safety-summary-card wm-safety-summary-blocked">
          <ShieldAlert size={18} className="text-red-400" aria-hidden="true" />
          <span className="wm-safety-summary-value">{summary.notReadyCount}</span>
          <span className="wm-safety-summary-label">Not ready</span>
        </div>
        <div className="wm-safety-summary-card wm-safety-summary-stale">
          <Clock size={18} className="text-slate-400" aria-hidden="true" />
          <span className="wm-safety-summary-value">{summary.staleCount}</span>
          <span className="wm-safety-summary-label">Stale (&gt;14 days)</span>
        </div>
        <div className="wm-safety-summary-card wm-safety-summary-issues">
          <AlertTriangle size={18} className="text-orange-400" aria-hidden="true" />
          <span className="wm-safety-summary-value">{summary.totalBlockers}</span>
          <span className="wm-safety-summary-label">Blockers across all</span>
        </div>
      </div>

      {/* Filters */}
      <div className="wm-safety-filters">
        <div className="wm-safety-filter-group">
          <Filter size={14} className="opacity-50" aria-hidden="true" />
          <span className="text-xs font-bold opacity-50">Tier:</span>
          {(["all", "not-ready", "needs-review", "ready"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              className={`wm-ui-button text-xs ${tierFilter === tier ? "is-active" : ""}`}
              onClick={() => setTierFilter(tier)}
            >
              {tier === "all" ? "All" : tier === "not-ready" ? "Not ready" : tier === "needs-review" ? "Needs review" : "Ready"}
            </button>
          ))}
        </div>
        <div className="wm-safety-filter-group">
          <span className="text-xs font-bold opacity-50">Sort:</span>
          {([["safety", "Safety"], ["stale", "Oldest first"], ["products", "Most products"], ["name", "Name"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`wm-ui-button text-xs ${sortBy === key ? "is-active" : ""}`}
              onClick={() => setSortBy(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="wm-safety-filter-group ml-auto">
          <button
            type="button"
            className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-1.5"
            onClick={() => exportDashboardCsv(filtered)}
          >
            <Download size={12} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Project list */}
      <div className="wm-safety-project-list">
        {filtered.length === 0 ? (
          <div className="wm-safety-empty">
            <FolderKanban size={32} className="opacity-30" aria-hidden="true" />
            <p className="opacity-50">No projects match the current filter.</p>
          </div>
        ) : (
          filtered.map((project) => {
            const tierStyle = TIER_STYLES[project.safetyTier];
            const TierIcon = tierStyle.icon;
            const isExpanded = expandedProject === project.projectId;

            return (
              <div
                key={project.projectId}
                className={`wm-safety-project-card ${tierStyle.bg} ${tierStyle.border}`}
              >
                <button
                  type="button"
                  className="wm-safety-project-header"
                  onClick={() => setExpandedProject(isExpanded ? null : project.projectId)}
                >
                  <div className="wm-safety-project-main">
                    <TierIcon size={18} className={tierStyle.text} aria-hidden="true" />
                    <div className="wm-safety-project-title">
                      <strong>{project.projectName}</strong>
                      <span className="text-xs opacity-50">{project.stage} · {project.status}</span>
                    </div>
                  </div>
                  <div className="wm-safety-project-badges">
                    <span className={`wm-safety-tier-badge ${tierStyle.text}`}>{project.safetyLabel}</span>
                    {project.blockerCount > 0 && (
                      <span className="wm-safety-badge wm-safety-badge--red">
                        {project.blockerCount} blocker{project.blockerCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {project.warningCount > 0 && (
                      <span className="wm-safety-badge wm-safety-badge--amber">
                        {project.warningCount} warning{project.warningCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="wm-safety-badge wm-safety-badge--slate">
                      {project.productCount} product{project.productCount !== 1 ? "s" : ""}
                    </span>
                    <span className={`wm-safety-badge ${project.daysSinceUpdate > 14 ? "wm-safety-badge--stale" : "wm-safety-badge--slate"}`}>
                      <Clock size={10} aria-hidden="true" />
                      {staleLabel(project.daysSinceUpdate)}
                    </span>
                    {project.dealOutcome && (
                      <span className={`wm-safety-badge ${
                        project.dealOutcome === "won" ? "wm-safety-badge--green" :
                        project.dealOutcome === "lost" ? "wm-safety-badge--red" :
                        "wm-safety-badge--amber"
                      }`}>
                        {project.dealOutcome}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="wm-safety-project-detail">
                    {project.blockers.length > 0 && (
                      <div className="wm-safety-issue-group wm-safety-issue-group--blocker">
                        <strong className="text-xs font-black text-red-400">Blockers</strong>
                        <ul>
                          {project.blockers.map((item) => (
                            <li key={item.id}>
                              {item.sku && <span className="font-bold">{item.sku}: </span>}
                              {item.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {project.warnings.length > 0 && (
                      <div className="wm-safety-issue-group wm-safety-issue-group--warning">
                        <strong className="text-xs font-black text-amber-400">Warnings</strong>
                        <ul>
                          {project.warnings.map((item) => (
                            <li key={item.id}>
                              {item.sku && <span className="font-bold">{item.sku}: </span>}
                              {item.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {project.blockers.length === 0 && project.warnings.length === 0 && (
                      <p className="text-xs opacity-50">No issues detected. This project is clean.</p>
                    )}
                    <div className="wm-safety-project-actions">
                      <Link
                        className="wm-ui-button wm-ui-button-secondary text-xs"
                        to={`${routeCatalogByKey.projects.path}`}
                      >
                        Open project
                      </Link>
                      {project.hasProposal && (
                        <Link
                          className="wm-ui-button wm-ui-button-secondary text-xs"
                          to={routeCatalogByKey.proposal.path}
                        >
                          View proposal
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
