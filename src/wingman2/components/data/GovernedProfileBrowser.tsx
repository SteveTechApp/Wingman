import { useCallback, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronRight, ExternalLink, CheckCircle, AlertTriangle, RotateCcw, Download } from "lucide-react";
import governedTechnicalProfiles from "../../../../data/governance/wyrestorm-technical-profiles.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GovernedProfile {
  sku: string;
  status?: string;
  productClass?: string;
  role?: string;
  productType?: string;
  transport?: string[];
  maxResolution?: string;
  ports?: Array<{
    count?: number;
    connector?: string;
    direction?: string;
    category?: string;
    detail?: string;
  }>;
  video?: string[];
  audio?: string[];
  usb?: string[];
  network?: string[];
  control?: string[];
  physical?: string[];
  dependencies?: string[];
  checks?: string[];
  warnings?: string[];
  evidence?: Array<{
    sourceType?: string;
    checkedAt?: string;
    excerpt?: string;
  }>;
  verifiedBy?: string;
  verifiedAt?: string;
}



/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const allProfiles: GovernedProfile[] =
  (governedTechnicalProfiles as { profiles?: GovernedProfile[] }).profiles ?? [];



/* ------------------------------------------------------------------ */
/*  Derived constants                                                  */
/* ------------------------------------------------------------------ */

const PRODUCT_CLASSES = Array.from(
  new Set(allProfiles.map((p) => p.productClass).filter(Boolean))
).sort() as string[];

const STATUSES = Array.from(
  new Set(allProfiles.map((p) => p.status).filter(Boolean))
).sort() as string[];

const STATUS_ORDER: Record<string, number> = {
  verified: 0,
  "verified-with-warning": 1,
  "review-required": 2,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusLabel(status?: string): string {
  if (status === "verified") return "Verified";
  if (status === "verified-with-warning") return "Warning";
  if (status === "review-required") return "Review required";
  return status ?? "Unknown";
}

function statusClass(status?: string): string {
  if (status === "verified") return "is-confirmed";
  if (status === "verified-with-warning") return "is-validate";
  return "is-pending";
}

function inputCount(profile: GovernedProfile): number {
  return (
    profile.ports?.filter((p) => p.direction === "input").reduce((s, p) => s + (p.count ?? 1), 0) ??
    0
  );
}

function outputCount(profile: GovernedProfile): number {
  return (
    profile.ports?.filter((p) => p.direction === "output").reduce((s, p) => s + (p.count ?? 1), 0) ??
    0
  );
}

/* ------------------------------------------------------------------ */
/*  CSV export                                                         */
/* ------------------------------------------------------------------ */

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function profilesToCsv(profiles: GovernedProfile[]): string {
  const headers = [
    'SKU', 'Product Class', 'Status', 'Role', 'Product Type',
    'Transport', 'Resolution', 'Inputs', 'Outputs', 'Ports',
    'Video Features', 'Audio Features', 'USB', 'Network', 'Control',
    'Physical', 'Dependencies', 'Checks', 'Warnings',
    'Evidence Sources', 'Verified By', 'Verified At',
  ];

  const rows = profiles.map((p) => [
    p.sku,
    p.productClass ?? '',
    p.status ?? '',
    p.role ?? '',
    p.productType ?? '',
    (p.transport ?? []).join('; '),
    p.maxResolution ?? '',
    String(inputCount(p)),
    String(outputCount(p)),
    (p.ports ?? []).map((pt) => `${pt.count ?? 1}x${pt.connector} ${pt.direction}`).join('; '),
    (p.video ?? []).join('; '),
    (p.audio ?? []).join('; '),
    (p.usb ?? []).join('; '),
    (p.network ?? []).join('; '),
    (p.control ?? []).join('; '),
    (p.physical ?? []).join('; '),
    (p.dependencies ?? []).join('; '),
    (p.checks ?? []).join('; '),
    (p.warnings ?? []).join('; '),
    (p.evidence ?? []).map((e) => e.sourceType ?? '').filter(Boolean).join('; '),
    p.verifiedBy ?? '',
    p.verifiedAt ?? '',
  ].map(escapeCsv).join(','));

  return [headers.map(escapeCsv).join(','), ...rows].join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GovernedProfileBrowser() {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<GovernedProfile[]>(allProfiles);



  const filtered = useMemo(() => {
    let list = profiles;

    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => {
        const blob = [
          p.sku,
          p.role,
          p.productType,
          p.productClass,
          ...(p.transport ?? []),
          ...(p.video ?? []),
          ...(p.audio ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }

    if (classFilter) {
      list = list.filter((p) => p.productClass === classFilter);
    }

    if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    }

    return [...list].sort((a, b) => {
      const sa = STATUS_ORDER[a.status ?? ""] ?? 9;
      const sb = STATUS_ORDER[b.status ?? ""] ?? 9;
      if (sa !== sb) return sa - sb;
      return a.sku.localeCompare(b.sku);
    });
  }, [query, classFilter, statusFilter, profiles]);

  const toggleSelect = useCallback((sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedSkus((prev) => {
      if (prev.size === filtered.length) return new Set<string>();
      return new Set(filtered.map((p) => p.sku));
    });
  }, [filtered]);

  /** Bulk update status for selected profiles. Persists to audit log + downloadable JSON. */
  const bulkUpdateStatus = useCallback((newStatus: string) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const dateStr = timestamp.slice(0, 10);
    const skusChanged = Array.from(selectedSkus);

    // Update React state
    setProfiles((prev) =>
      prev.map((p) =>
        selectedSkus.has(p.sku)
          ? {
              ...p,
              status: newStatus,
              verifiedAt: dateStr,
              verifiedBy: "admin-bulk",
            }
          : p
      )
    );

    // Record audit entry in localStorage
    try {
      const auditKey = "wingman:governed-profile-audit";
      const existing: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem(auditKey) ?? "[]");
      existing.push({
        timestamp,
        action: "bulk-status-update",
        newStatus,
        skus: skusChanged,
        count: skusChanged.length,
      });
      // Keep last 200 entries
      localStorage.setItem(auditKey, JSON.stringify(existing.slice(-200)));
    } catch { /* localStorage unavailable */ }

    setSelectedSkus(new Set());
  }, [selectedSkus]);

  const exportCsv = useCallback(() => {
    const csv = profilesToCsv(filtered);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `wyrestorm-governed-profiles-${timestamp}.csv`);
  }, [filtered]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const cls = p.productClass ?? "OTHER";
      counts[cls] = (counts[cls] ?? 0) + 1;
    }
    return counts;
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const s = p.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, []);

  return (
    <section className="wm-governed-browser">
      {/* Summary chips */}
      <div className="wm-governed-summary">
        <span className="wm-governed-summary-count">
          <strong>{allProfiles.length}</strong> governed profiles
        </span>
        <span className="wm-governed-summary-detail">
          {statusCounts["verified"] ?? 0} verified
        </span>
        <span className="wm-governed-summary-detail">
          {statusCounts["verified-with-warning"] ?? 0} warnings
        </span>
        <span className="wm-governed-summary-detail">
          {statusCounts["review-required"] ?? 0} review required
        </span>
      </div>

      {/* Bulk action bar */}
      {selectedSkus.size > 0 ? (
        <div className="wm-governed-bulk-bar">
          <span className="wm-governed-bulk-count">
            <strong>{selectedSkus.size}</strong> profile{selectedSkus.size !== 1 ? "s" : ""} selected
          </span>
          <div className="wm-governed-bulk-actions">
            <button
              type="button"
              className="wm-btn wm-btn--primary"
              onClick={() => bulkUpdateStatus("verified")}
            >
              <CheckCircle size={14} /> Approve
            </button>
            <button
              type="button"
              className="wm-btn wm-btn--warning"
              onClick={() => bulkUpdateStatus("verified-with-warning")}
            >
              <AlertTriangle size={14} /> Mark warning
            </button>
            <button
              type="button"
              className="wm-btn"
              onClick={() => bulkUpdateStatus("review-required")}
            >
              <RotateCcw size={14} /> Revoke to review
            </button>
            <button
              type="button"
              className="wm-btn wm-btn--ghost"
              onClick={() => setSelectedSkus(new Set())}
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className="wm-governed-toolbar">
        <label className="wm-data-search">
          <Search />
          <input
            aria-label="Search governed profiles"
            placeholder="Search SKU, role, transport, resolution…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Product class filter"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All classes ({allProfiles.length})</option>
          {PRODUCT_CLASSES.map((cls) => (
            <option key={cls} value={cls}>
              {cls} ({classCounts[cls] ?? 0})
            </option>
          ))}
        </select>
        <select
          aria-label="Status filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses ({allProfiles.length})</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)} ({statusCounts[s] ?? 0})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="wm-btn wm-btn--export"
          onClick={exportCsv}
          title={`Export ${filtered.length} profiles to CSV`}
        >
          <Download size={14} /> Export CSV
        </button>
        <button
          type="button"
          className="wm-btn wm-btn--export"
          onClick={() => {
            const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `wyrestorm-technical-profiles-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          title="Download updated profiles as JSON — commit this file to persist changes"
        >
          <Download size={14} /> Save Changes
        </button>
      </div>

      {/* Results */}
      <div className="wm-data-table-card wm-section-card">
        <header>
          <div>
            <h2>{filtered.length} profiles</h2>
            <p>
              {filtered.length === profiles.length
                ? "Showing all governed technical profiles."
                : `Filtered from ${profiles.length} total profiles.`}
            </p>
          </div>
        </header>
        <div className="wm-data-table-scroll">
          <table className="wm-governed-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={filtered.length > 0 && selectedSkus.size === filtered.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedSkus.size > 0 && selectedSkus.size < filtered.length;
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: 36 }} />
                <th>Product</th>
                <th>Class</th>
                <th>Status</th>
                <th>Transport</th>
                <th>I/O</th>
                <th>Resolution</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => {
                const isExpanded = expandedSku === profile.sku;
                return (
                  <ProfileRow
                    key={profile.sku}
                    profile={profile}
                    isExpanded={isExpanded}
                    isSelected={selectedSkus.has(profile.sku)}
                    onToggle={() =>
                      setExpandedSku(isExpanded ? null : profile.sku)
                    }
                    onSelect={() => toggleSelect(profile.sku)}
                  />
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--wm-text-muted)" }}>
                    No profiles match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile row (expandable)                                           */
/* ------------------------------------------------------------------ */

function ProfileRow({
  profile,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
}: {
  profile: GovernedProfile;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const inp = inputCount(profile);
  const out = outputCount(profile);
  const ioStr = inp || out ? `${inp}×${out || "–"}` : "—";

  return (
    <>
      <tr className="wm-governed-row">
        <td onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${profile.sku}`}
            checked={isSelected}
            onChange={onSelect}
          />
        </td>
        <td onClick={onToggle}>
          <button
            type="button"
            className="wm-governed-expand"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </button>
        </td>
        <td onClick={onToggle}>
          <strong>{profile.sku}</strong>
          <small>{profile.role}</small>
        </td>
        <td onClick={onToggle}>
          <span className="wm-governed-class-badge">
            {profile.productClass}
          </span>
        </td>
        <td onClick={onToggle}>
          <span className={`wm-status ${statusClass(profile.status)}`}>
            {statusLabel(profile.status)}
          </span>
        </td>
        <td onClick={onToggle}>
          <small>{profile.transport?.join(", ") || "—"}</small>
        </td>
        <td onClick={onToggle}>
          <small>{ioStr}</small>
        </td>
        <td onClick={onToggle}>
          <small>{profile.maxResolution || "—"}</small>
        </td>
        <td onClick={onToggle}>
          <small>{profile.status || "—"}</small>
        </td>
      </tr>
      {isExpanded ? (
        <tr className="wm-governed-detail-row">
          <td colSpan={9}>
            <div className="wm-governed-detail">
              <div className="wm-governed-detail-grid">
                <div>
                  <h4>Product type</h4>
                  <p>{profile.productType || "—"}</p>
                </div>
                <div>
                  <h4>Transport</h4>
                  <p>{profile.transport?.join(", ") || "—"}</p>
                </div>
                <div>
                  <h4>Resolution</h4>
                  <p>{profile.maxResolution || "—"}</p>
                </div>

              </div>



              {profile.ports && profile.ports.length > 0 ? (
                <div className="wm-governed-detail-ports">
                  <h4>Ports ({profile.ports.length})</h4>
                  <div className="wm-governed-port-list">
                    {profile.ports.map((port, i) => (
                      <span key={i} className="wm-governed-port-chip">
                        {port.count ?? 1}× {port.connector}
                        <small>{port.direction}</small>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.video && profile.video.length > 0 ? (
                <div>
                  <h4>Video</h4>
                  <div className="wm-governed-tag-list">
                    {profile.video.map((v, i) => (
                      <span key={i} className="wm-governed-tag">{v}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.audio && profile.audio.length > 0 ? (
                <div>
                  <h4>Audio</h4>
                  <div className="wm-governed-tag-list">
                    {profile.audio.map((a, i) => (
                      <span key={i} className="wm-governed-tag">{a}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.network && profile.network.length > 0 ? (
                <div>
                  <h4>Network</h4>
                  <div className="wm-governed-tag-list">
                    {profile.network.map((n, i) => (
                      <span key={i} className="wm-governed-tag">{n}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.control && profile.control.length > 0 ? (
                <div>
                  <h4>Control</h4>
                  <div className="wm-governed-tag-list">
                    {profile.control.map((c, i) => (
                      <span key={i} className="wm-governed-tag">{c}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.evidence && profile.evidence.length > 0 ? (
                <div className="wm-governed-detail-evidence">
                  <h4>Evidence ({profile.evidence.length} sources)</h4>
                  <p className="wm-governed-evidence-meta">
                    {profile.verifiedBy ? `Verified by ${profile.verifiedBy}` : "No reviewer"}
                    {profile.verifiedAt
                      ? ` on ${profile.verifiedAt.slice(0, 10)}`
                      : ""}
                  </p>
                </div>
              ) : null}

              {profile.checks && profile.checks.length > 0 ? (
                <div>
                  <h4>Checks</h4>
                  <ul className="wm-governed-checks">
                    {profile.checks.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}


            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default GovernedProfileBrowser;
