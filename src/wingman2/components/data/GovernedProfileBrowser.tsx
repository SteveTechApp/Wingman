import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronRight, CheckCircle, AlertTriangle, RotateCcw, Download, Pencil, Trash2 } from "lucide-react";
import governedTechnicalProfiles from "../../../../data/governance/wyrestorm-technical-profiles.json";
import { downloadBlob } from "../../lib/downloadBlob";
import { confirmGovernedProfile } from "../../api/wingmanApi";
import { governedProfileFieldApplicability } from "../../lib/governedConfirmationBacklog";
import { confirmationGroupView, confirmationGroupForSku, type GroupingKind } from "../../lib/governedConfirmationBatches";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GovernedProfile {
  [key: string]: unknown;
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
  power?: string[];
  specs?: Record<string, unknown>;
  inputCount?: number;
  outputCount?: number;
  dependencies?: string[];
  checks?: string[];
  warnings?: string[];
  evidence?: Array<{
    sourceType?: string;
    sourceUrl?: string;
    checkedAt?: string;
    excerpt?: string;
    reviewedOn?: string;
    reviewer?: string;
    note?: string;
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

const profileOptions = (key: keyof GovernedProfile): string[] => Array.from(new Set(
  allProfiles.flatMap((profile) => {
    const value = profile[key];
    return Array.isArray(value) ? value : [value];
  }).filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
)).sort();

const ROLE_OPTIONS = profileOptions("role");
const PRODUCT_TYPE_OPTIONS = profileOptions("productType");
const TRANSPORT_OPTIONS = profileOptions("transport");
const RESOLUTION_OPTIONS = profileOptions("maxResolution");
const CONNECTOR_OPTIONS = Array.from(new Set(allProfiles.flatMap((profile) => profile.ports ?? []).map((port) => port.connector).filter((value): value is string => Boolean(value)))).sort();
const PORT_CATEGORY_OPTIONS = Array.from(new Set(allProfiles.flatMap((profile) => profile.ports ?? []).map((port) => port.category).filter((value): value is string => Boolean(value)))).sort();
const EVIDENCE_TYPE_OPTIONS = Array.from(new Set(allProfiles.flatMap((profile) => profile.evidence ?? []).map((item) => item.sourceType).filter((value): value is string => Boolean(value)))).sort();

const STRUCTURED_STRING_OPTIONS = allProfiles.reduce<Record<string, string[]>>((options, profile) => {
  for (const container of [profile.specs, profile.features] as Array<Record<string, unknown> | undefined>) {
    for (const [key, value] of Object.entries(container ?? {})) {
      if (typeof value !== "string" || !value.trim()) continue;
      options[key] = Array.from(new Set([...(options[key] ?? []), value])).sort();
    }
  }
  return options;
}, {});

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

type CapabilityListKey = "video" | "audio" | "usb" | "network" | "control" | "power";

function capabilityListApplicability(profile: GovernedProfile): Record<CapabilityListKey, boolean> {
  const productClass = String(profile.productClass ?? "").toUpperCase();
  const role = String(profile.role ?? "").toLowerCase();
  const transport = (profile.transport ?? []).join(" ").toLowerCase();
  const ports = profile.ports ?? [];
  const has = (key: CapabilityListKey) => (profile[key] ?? []).length > 0 || ports.some((port) => port.category === key);
  const passive = /mount|bracket|rack|cable management|passive/.test(role);
  return {
    video: !["AUDIO", "CONTROL"].includes(productClass) && !passive && (has("video") || Boolean(profile.maxResolution) || /video|hdmi|hdbaset|camera|presentation|matrix|switcher|avoip|uc/.test(`${role} ${transport} ${productClass.toLowerCase()}`)),
    audio: !passive && (has("audio") || productClass === "AUDIO" || /audio|dante|microphone|speaker|amplifier|uc/.test(`${role} ${transport}`)),
    usb: !passive && (has("usb") || /usb|kvm|uc|camera/.test(`${role} ${transport}`)),
    network: !passive && (has("network") || ["AVOIP", "CONTROL"].includes(productClass) || /network|ethernet|dante|aes67|ndi|wireless|wi-fi|ip/.test(`${role} ${transport}`)),
    control: !passive && (has("control") || ["CONTROL", "MATRIX", "HDBASET", "AVOIP", "PRESENTATION", "SWITCHER"].includes(productClass) || /control|matrix|switcher|hdbaset|avoip/.test(`${role} ${transport}`)),
    power: governedProfileFieldApplicability(profile).power,
  };
}

function defaultPortCategory(profile: GovernedProfile): string {
  const productClass = String(profile.productClass ?? "").toUpperCase();
  if (productClass === "AUDIO") return "audio";
  if (productClass === "CONTROL") return "control";
  if (productClass === "AVOIP") return "network";
  if (productClass === "ACCESSORY") return "power";
  return "video";
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
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), filename);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GovernedProfileBrowser({ reviewer = "ADMIN" }: { reviewer?: string }) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("");
  const [grouping, setGrouping] = useState<GroupingKind>("batches");
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<GovernedProfile | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<GovernedProfile[]>(allProfiles);

  // Confirmation triage groupings (reviewer batches R1-R5, product families
  // T1-T10): one chip per group with its live awaiting/verified split, so the
  // backlog is worked group by group - by sitting or by family. Computed from
  // the raw payload, not the editable state, because the grouping is the
  // review-workflow lens over the tracked data.
  const groupView = useMemo(() => confirmationGroupView(grouping), [grouping]);
  const batchScope = useMemo(() => {
    if (!batchFilter) return null;
    return groupView.groups.find((group) => group.id === batchFilter) ?? null;
  }, [batchFilter, groupView]);



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

    if (batchScope) {
      const batchSkus = new Set(batchScope.skus);
      list = list.filter((p) => batchSkus.has(p.sku));
    }

    return [...list].sort((a, b) => {
      const sa = STATUS_ORDER[a.status ?? ""] ?? 9;
      const sb = STATUS_ORDER[b.status ?? ""] ?? 9;
      if (sa !== sb) return sa - sb;
      return a.sku.localeCompare(b.sku);
    });
  }, [query, classFilter, statusFilter, batchScope, profiles]);

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
  }, [profiles]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const s = p.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [profiles]);

  const toggleStatusFilter = useCallback((status: string) => {
    setStatusFilter((current) => current === status ? "" : status);
  }, []);  const startEditing = useCallback((profile: GovernedProfile) => {
    setExpandedSku(null);
    setEditingProfile({ ...profile });
  }, []);

  const startEditingSku = useCallback((sku: string) => {
    const profile = profiles.find((candidate) => candidate.sku === sku);
    if (profile) startEditing(profile);
  }, [profiles, startEditing]);

  const toggleRowSku = useCallback((sku: string) => {
    setExpandedSku((current) => current === sku ? null : sku);
  }, []);

  const saveEditedProfile = useCallback(() => {
    if (!editingProfile) return;
    setProfiles((current) => current.map((profile) => profile.sku === editingProfile.sku ? editingProfile : profile));
    setEditingProfile(null);
  }, [editingProfile]);

  // Sku-keyed and written with functional updates so its identity never
  // changes — otherwise every dialog keystroke (which updates editingProfile)
  // would re-render the whole 206-row table through this callback prop.
  const deleteProfile = useCallback((sku: string) => {
    if (!window.confirm(`Delete governed profile ${sku} from this working set?`)) return;
    setProfiles((current) => current.filter((candidate) => candidate.sku !== sku));
    setSelectedSkus((current) => {
      const next = new Set(current);
      next.delete(sku);
      return next;
    });
    setExpandedSku((current) => (current === sku ? null : current));
    setEditingProfile((current) => (current?.sku === sku ? null : current));
  }, []);

  return (
    <section className="wm-governed-browser">
      {/* Summary chips */}
      <div className="wm-governed-summary">
        <span className="wm-governed-summary-count">
          <strong>{batchScope ? batchScope.skus.length : profiles.length}</strong> {batchScope ? `governed profiles in ${batchScope.id}` : "governed profiles"}
        </span>
        {batchScope ? (
          <span className="wm-governed-summary-detail">
            {batchScope.awaiting.length} awaiting · {batchScope.verifiedCount} confirmed in this group
            {batchScope.scope ? ` — ${batchScope.scope}` : ""}
          </span>
        ) : (
          <>
            <span className="wm-governed-summary-detail">
              {statusCounts["verified"] ?? 0} verified
            </span>
            <button
              type="button"
              className="wm-governed-summary-detail wm-governed-summary-filter"
              aria-label={`Filter by Warning status (${statusCounts["verified-with-warning"] ?? 0} profiles)`}
              aria-pressed={statusFilter === "verified-with-warning"}
              onClick={() => toggleStatusFilter("verified-with-warning")}
            >
              {statusCounts["verified-with-warning"] ?? 0} warnings
            </button>
            <button
              type="button"
              className="wm-governed-summary-detail wm-governed-summary-filter"
              aria-label={`Filter by Review required status (${statusCounts["review-required"] ?? 0} profiles)`}
              aria-pressed={statusFilter === "review-required"}
              onClick={() => toggleStatusFilter("review-required")}
            >
              {statusCounts["review-required"] ?? 0} review required
            </button>
          </>
        )}
      </div>

      {/* Confirmation triage group strip (reviewer batches R1-R5 / families T1-T10) */}
      {groupView.groups.length > 0 ? (
        <div className="wm-governed-batches" role="group" aria-label="Confirmation triage groups">
          <div className="wm-governed-batches__toggle" role="radiogroup" aria-label="Grouping">
            <button
              type="button"
              className={`wm-governed-batches__toggle-option ${grouping === "batches" ? "is-active" : ""}`}
              aria-pressed={grouping === "batches"}
              onClick={() => { setGrouping("batches"); setBatchFilter(""); }}
            >
              Reviewer batches
            </button>
            <button
              type="button"
              className={`wm-governed-batches__toggle-option ${grouping === "families" ? "is-active" : ""}`}
              aria-pressed={grouping === "families"}
              onClick={() => { setGrouping("families"); setBatchFilter(""); }}
            >
              Product families
            </button>
          </div>
          {groupView.groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`wm-governed-batch ${batchFilter === group.id ? "is-active" : ""}`}
              aria-pressed={batchFilter === group.id}
              disabled={group.awaiting.length === 0 && group.unknownSkus.length === 0}
              title={group.awaiting.length === 0 ? "Every profile in this group is human-verified" : `Scope: ${group.scope}`}
              onClick={() => setBatchFilter((current) => (current === group.id ? "" : group.id))}
            >
              <span className="wm-governed-batch__id">{group.id}</span>
              <span className="wm-governed-batch__count">
                {group.awaiting.length === 0
                  ? `${group.verifiedCount} confirmed`
                  : `${group.awaiting.length} awaiting · ${group.verifiedCount} confirmed`}
              </span>
              {group.unknownSkus.length > 0 ? (
                <span className="wm-governed-batch__unknown" title={`Not in the governed set: ${group.unknownSkus.join(", ")}`}>
                  {group.unknownSkus.length} unknown
                </span>
              ) : null}
            </button>
          ))}
          {groupView.ungrouped.length > 0 ? (
            <span className="wm-governed-batch wm-governed-batch--unbatched" title={`Awaiting confirmation but not assigned to any group: ${groupView.ungrouped.map((profile) => profile.sku).join(", ")}`}>
              <span className="wm-governed-batch__id">—</span>
              <span className="wm-governed-batch__count">{groupView.ungrouped.length} ungrouped</span>
            </span>
          ) : null}
        </div>
      ) : null}

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
          <option value="">All classes ({profiles.length})</option>
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
          <option value="">All statuses ({profiles.length})</option>
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
            const governedEnvelope = {
              ...governedTechnicalProfiles,
              updatedAt: new Date().toISOString(),
              profiles,
            };
            downloadBlob(
              new Blob([JSON.stringify(governedEnvelope, null, 2)], { type: "application/json" }),
              `wyrestorm-technical-profiles-${new Date().toISOString().slice(0, 10)}.json`,
            );
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
                <th className="wm-governed-actions-heading">Actions</th>
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
                    onToggle={toggleRowSku}
                    onSelect={toggleSelect}
                    onEdit={startEditingSku}
                    onDelete={deleteProfile}
                  />
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--wm-text-muted)" }}>
                    No profiles match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {editingProfile ? (
        <div className="wm-governed-editor-backdrop" role="presentation">
          <button type="button" className="wm-governed-editor-scrim" aria-label="Close SKU editor" onClick={() => setEditingProfile(null)} />
          <section className="wm-governed-editor-workspace" role="dialog" aria-modal="true" aria-labelledby="governed-editor-title">
            <header>
              <div className="wm-governed-editor-workspace-title">
                <span>Governed SKU record</span>
                <h2 id="governed-editor-title">{editingProfile.sku}</h2>
                <p>{editingProfile.productType || editingProfile.role || "Product profile"}</p>
              </div>
              <button type="button" aria-label="Close editor" onClick={() => setEditingProfile(null)}>×</button>
            </header>
            <div className="wm-governed-editor-workspace-body">
              <ProfileEditor
                profile={editingProfile}
                reviewer={reviewer}
                onChange={setEditingProfile}
                onSave={saveEditedProfile}
                onCancel={() => setEditingProfile(null)}
                onConfirmed={(verifiedAt) => {
                  setProfiles((current) => current.map((candidate) => candidate.sku === editingProfile.sku ? { ...candidate, status: "verified", verifiedBy: reviewer, verifiedAt } : candidate));
                  setEditingProfile(null);
                }}
              />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile row (expandable)                                           */
/* ------------------------------------------------------------------ */

// A dialog edit types into this table's parent state; without memoization
// every keystroke re-rendered all 206 rows and made the dialog sluggish in
// jsdom (a measured test-suite flake source).
const ProfileRow = memo(function ProfileRow({
  profile,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
}: {
  profile: GovernedProfile;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (sku: string) => void;
  onSelect: (sku: string) => void;
  onEdit: (sku: string) => void;
  onDelete: (sku: string) => void;
}) {
  const inp = inputCount(profile);
  const out = outputCount(profile);
  const ioStr = inp || out ? `${inp}×${out || "–"}` : "—";

  return (
    <>
      <tr className="wm-governed-row">
        <td onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${profile.sku}`}
            checked={isSelected}
            onChange={() => onSelect(profile.sku)}
          />
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <button
            type="button"
            className="wm-governed-expand"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </button>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <strong>{profile.sku}</strong>
          <small>{profile.role}</small>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <span className="wm-governed-class-badge">
            {profile.productClass}
          </span>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <span className={`wm-status ${statusClass(profile.status)}`}>
            {statusLabel(profile.status)}
          </span>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <small>{profile.transport?.join(", ") || "—"}</small>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <small>{ioStr}</small>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <small>{profile.maxResolution || "—"}</small>
        </td>
        <td onClick={() => onToggle(profile.sku)}>
          <small>{profile.status || "—"}</small>
        </td>
        <td>
          <div className="wm-governed-row-actions">
            <button type="button" onClick={() => onEdit(profile.sku)} aria-label={`Edit ${profile.sku}`} title={`Edit ${profile.sku}`}>
              <Pencil aria-hidden="true" />
            </button>
            <button type="button" className="is-delete" onClick={() => onDelete(profile.sku)} aria-label={`Delete ${profile.sku}`} title={`Delete ${profile.sku}`}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded ? (
        <tr className="wm-governed-detail-row">
          <td colSpan={10}>
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
});

function ProfileEditor({ profile, reviewer, onChange, onSave, onCancel, onConfirmed }: {
  profile: GovernedProfile;
  reviewer: string;
  onChange: (profile: GovernedProfile) => void;
  onSave: () => void;
  onCancel: () => void;
  onConfirmed: (verifiedAt: string) => void;
}) {
  const update = (patch: Partial<GovernedProfile>) => onChange({ ...profile, ...patch });
  const applicable = governedProfileFieldApplicability(profile);
  return (
    <div className="wm-governed-editor" aria-label={`Edit ${profile.sku} profile`}>
      <div className="wm-governed-editor-grid">
        <label>SKU<input value={profile.sku} readOnly aria-readonly="true" /></label>
        <GovernedOptionInput label="Role" value={profile.role ?? ""} options={ROLE_OPTIONS} onChange={(role) => update({ role })} />
        <GovernedOptionInput label="Product type" value={profile.productType ?? ""} options={PRODUCT_TYPE_OPTIONS} onChange={(productType) => update({ productType })} />
        <label>Class<select value={profile.productClass ?? ""} onChange={(event) => update({ productClass: event.target.value })}>{PRODUCT_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Status<select value={profile.status ?? ""} onChange={(event) => update({ status: event.target.value })}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
        <label>Transport<input value={profile.transport?.join(", ") ?? ""} readOnly aria-readonly="true" title="Edit transport using the governed selector below" /></label>
        {applicable["max-resolution"] ? <GovernedOptionInput label="Resolution" value={profile.maxResolution ?? ""} options={RESOLUTION_OPTIONS} onChange={(maxResolution) => update({ maxResolution })} /> : null}
        {applicable["routed-io"] ? <><label>Input count<input type="number" min="0" value={profile.inputCount ?? ""} onChange={(event) => update({ inputCount: event.target.value === "" ? undefined : Number(event.target.value) })} /></label><label>Output count<input type="number" min="0" value={profile.outputCount ?? ""} onChange={(event) => update({ outputCount: event.target.value === "" ? undefined : Number(event.target.value) })} /></label></> : null}
        <label>Verified by<input value={profile.verifiedBy ?? ""} onChange={(event) => update({ verifiedBy: event.target.value })} /></label>
        <label>Verified at<input value={profile.verifiedAt ?? ""} onChange={(event) => update({ verifiedAt: event.target.value })} /></label>
      </div>
      <p className="wm-governed-editor-applicability">Only fields applicable to this product class and role are shown.</p>
      <div className="wm-governed-editor-actions">
        <button type="button" className="wm-btn wm-btn--primary" onClick={onSave}>Apply edit</button>
        <button type="button" className="wm-btn wm-btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
      <FullProfileRecordEditor profile={profile} onChange={onChange} />
      {profile.status !== "verified" || !profile.verifiedBy ? (
        <AdminProfileConfirmation profile={profile} reviewer={reviewer} onConfirmed={onConfirmed} />
      ) : null}
    </div>
  );
}

function GovernedOptionInput({ label, value, options, onChange, idSuffix = "profile" }: { label: string; value: string; options: string[]; onChange: (value: string) => void; idSuffix?: string }) {
  const listId = `governed-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idSuffix}-options`;
  return <label>{label}<input list={listId} value={value} onChange={(event) => onChange(event.target.value)} /><datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist></label>;
}

function GovernedMultiValueField({ label, values, options, onChange }: { label: string; values: string[]; options: string[]; onChange: (values: string[]) => void }) {
  const remaining = options.filter((option) => !values.includes(option));
  return <div className="wm-governed-multi-value"><span>{label}</span><div>{values.map((value) => <button type="button" key={value} title={`Remove ${value}`} onClick={() => onChange(values.filter((candidate) => candidate !== value))}>{value}<b aria-hidden="true">×</b></button>)}</div><select aria-label={`Add ${label}`} value="" onChange={(event) => { if (event.target.value) onChange([...values, event.target.value]); }}><option value="">Add governed option…</option>{remaining.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function FullProfileRecordEditor({ profile, onChange }: { profile: GovernedProfile; onChange: (profile: GovernedProfile) => void }) {
  const [json, setJson] = useState(() => JSON.stringify(profile, null, 2));
  const [message, setMessage] = useState("");
  const capabilityApplicability = capabilityListApplicability(profile);

  useEffect(() => {
    setJson(JSON.stringify(profile, null, 2));
  }, [profile]);

  function applyFullRecord() {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setMessage("The full record must be a JSON object.");
        return;
      }
      const next = parsed as GovernedProfile;
      if (next.sku !== profile.sku) {
        setMessage(`SKU identity is protected. Keep sku as ${profile.sku}.`);
        return;
      }
      onChange(next);
      setMessage("Full record validated. Choose Apply edit to keep the changes in this working set.");
    } catch (error) {
      setMessage(error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON.");
    }
  }

  const listFields: Array<[keyof GovernedProfile, string]> = [
    ["transport", "Transport"], ["video", "Video capabilities"], ["audio", "Audio capabilities"],
    ["usb", "USB capabilities"], ["network", "Network"], ["control", "Control"], ["power", "Power"],
    ["physical", "Physical"], ["dependencies", "Dependencies"], ["compatibleFamilies", "Compatible families"],
    ["checks", "Review checks"], ["warnings", "Warnings"], ["confirmedFields", "Confirmed fields"],
  ];
  const updateList = (key: keyof GovernedProfile, value: string) => onChange({ ...profile, [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) });
  const updatePort = (index: number, patch: Partial<NonNullable<GovernedProfile["ports"]>[number]>) => onChange({ ...profile, ports: (profile.ports ?? []).map((port, current) => current === index ? { ...port, ...patch } : port) });
  const updateEvidence = (index: number, patch: Partial<NonNullable<GovernedProfile["evidence"]>[number]>) => onChange({ ...profile, evidence: (profile.evidence ?? []).map((item, current) => current === index ? { ...item, ...patch } : item) });

  return <div className="wm-governed-record-form">
    <section className="wm-governed-record-section">
      <h4>Capabilities and review data</h4>
      <p>Enter one item per line. Empty lines are removed when the record is saved.</p>
      <div className="wm-governed-record-list-grid">{listFields.map(([key, label]) => {
        if (key === "transport") return <GovernedMultiValueField key={key} label={label} values={profile.transport ?? []} options={TRANSPORT_OPTIONS} onChange={(transport) => onChange({ ...profile, transport })} />;
        const governedKey = key as CapabilityListKey;
        const isCapability = ["video", "audio", "usb", "network", "control", "power"].includes(String(key));
        const applicable = !isCapability || capabilityApplicability[governedKey];
        return <label key={String(key)} className={applicable ? "" : "is-not-applicable"}>{label}{!applicable ? <small>N/A for this product type</small> : null}<textarea aria-label={`${label} for ${profile.sku}`} disabled={!applicable} placeholder={applicable ? "Enter one item per line" : "Not applicable"} value={applicable && Array.isArray(profile[key]) ? (profile[key] as unknown[]).map(String).join("\n") : ""} onChange={(event) => updateList(key, event.target.value)} /></label>;
      })}</div>
    </section>

    <section className="wm-governed-record-section">
      <h4>Structured specifications</h4>
      <p>Edit nested specification objects independently; each container validates before updating the record.</p>
      <div className="wm-governed-structured-grid">
        {(["specs", "features", "chroma"] as const).map((key) => <StructuredRecordField key={key} label={key === "specs" ? "Specifications" : key === "features" ? "Features" : "Chroma"} value={profile[key] ?? {}} onApply={(value) => onChange({ ...profile, [key]: value })} />)}
      </div>
    </section>

    <section className="wm-governed-record-section">
      <div className="wm-governed-record-section-heading"><div><h4>Ports and connectors</h4><p>Review counts, direction, signal category, connector and source detail.</p></div><button type="button" className="wm-btn" onClick={() => onChange({ ...profile, ports: [...(profile.ports ?? []), { count: 1, connector: "", direction: "input", category: defaultPortCategory(profile), detail: "" }] })}>Add port</button></div>
      <div className="wm-governed-repeaters">{(profile.ports ?? []).map((port, index) => <fieldset key={`${index}-${port.connector}`}><legend>Port {index + 1}</legend>
        <label>Count<input type="number" min="0" value={port.count ?? 1} onChange={(event) => updatePort(index, { count: Number(event.target.value) })} /></label>
        <GovernedOptionInput label="Connector" idSuffix={`port-${index}`} value={port.connector ?? ""} options={CONNECTOR_OPTIONS} onChange={(connector) => updatePort(index, { connector })} />
        <label>Direction<select value={port.direction ?? ""} onChange={(event) => updatePort(index, { direction: event.target.value })}><option value="">Not specified</option><option value="input">Input</option><option value="output">Output</option><option value="bidirectional">Bidirectional</option></select></label>
        <GovernedOptionInput label="Category" idSuffix={`port-${index}`} value={port.category ?? ""} options={PORT_CATEGORY_OPTIONS} onChange={(category) => updatePort(index, { category })} />
        <label className="is-wide">Detail<input value={port.detail ?? ""} onChange={(event) => updatePort(index, { detail: event.target.value })} /></label>
        <button type="button" className="wm-btn wm-btn--ghost is-remove" onClick={() => onChange({ ...profile, ports: (profile.ports ?? []).filter((_, current) => current !== index) })}>Remove port</button>
      </fieldset>)}</div>
    </section>

    <section className="wm-governed-record-section">
      <div className="wm-governed-record-section-heading"><div><h4>Evidence and reviewer trail</h4><p>Every source remains attached to the governed record.</p></div><button type="button" className="wm-btn" onClick={() => onChange({ ...profile, evidence: [...(profile.evidence ?? []), { sourceType: "manufacturer", sourceUrl: "", reviewedOn: "", reviewer: "", note: "" }] })}>Add evidence</button></div>
      <div className="wm-governed-repeaters">{(profile.evidence ?? []).map((item, index) => <fieldset key={`${index}-${item.sourceUrl ?? item.sourceType}`}><legend>Evidence {index + 1}</legend>
        <GovernedOptionInput label="Source type" idSuffix={`evidence-${index}`} value={item.sourceType ?? ""} options={EVIDENCE_TYPE_OPTIONS} onChange={(sourceType) => updateEvidence(index, { sourceType })} />
        <label className="is-wide">Source URL<input type="url" value={item.sourceUrl ?? ""} onChange={(event) => updateEvidence(index, { sourceUrl: event.target.value })} /></label>
        <label>Reviewed on<input type="date" value={item.reviewedOn ?? ""} onChange={(event) => updateEvidence(index, { reviewedOn: event.target.value })} /></label>
        <label>Reviewer<input value={item.reviewer ?? ""} onChange={(event) => updateEvidence(index, { reviewer: event.target.value })} /></label>
        <label className="is-wide">Note<textarea value={item.note ?? ""} onChange={(event) => updateEvidence(index, { note: event.target.value })} /></label>
        <button type="button" className="wm-btn wm-btn--ghost is-remove" onClick={() => onChange({ ...profile, evidence: (profile.evidence ?? []).filter((_, current) => current !== index) })}>Remove evidence</button>
      </fieldset>)}</div>
    </section>

    <details className="wm-governed-full-record">
      <summary>Advanced JSON and unrecognised fields</summary>
      <p>The form above writes back to this complete JSON object. Advanced edits remain available for nested specifications and future fields.</p>
      <textarea aria-label={`Full record JSON for ${profile.sku}`} value={json} onChange={(event) => { setJson(event.target.value); setMessage(""); }} spellCheck={false} />
      <div className="wm-governed-full-record-actions"><button type="button" className="wm-btn" onClick={applyFullRecord}>Validate full record</button><button type="button" className="wm-btn wm-btn--ghost" onClick={() => { setJson(JSON.stringify(profile, null, 2)); setMessage(""); }}>Reset JSON</button></div>
      {message ? <p className="wm-governed-full-record-message" role="status">{message}</p> : null}
    </details>
  </div>;
}

function StructuredRecordField({ label, value, onApply }: { label: string; value: unknown; onApply: (value: unknown) => void }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  useEffect(() => setDraft(JSON.stringify(value, null, 2)), [value]);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const updateEntry = (key: string, next: unknown, remove = false) => {
      const updated = { ...record };
      if (remove) delete updated[key]; else updated[key] = next;
      onApply(updated);
    };
    return <div className="wm-governed-structured-field wm-governed-structured-field--guided">
      <h5>{label}</h5>
      <p>Use governed choices where available. N/A removes a field that does not apply to this SKU.</p>
      <div className="wm-governed-guided-values">{Object.entries(record).map(([key, entry]) => {
        const fieldLabel = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase());
        if (typeof entry === "boolean") return <label key={key}>{fieldLabel}<select aria-label={`${label} ${fieldLabel}`} value={entry ? "yes" : "no"} onChange={(event) => event.target.value === "na" ? updateEntry(key, undefined, true) : updateEntry(key, event.target.value === "yes")}><option value="yes">Yes</option><option value="no">No</option><option value="na">N/A</option></select></label>;
        if (typeof entry === "number") return <label key={key}>{fieldLabel}<input aria-label={`${label} ${fieldLabel}`} type="number" min="0" value={entry} onChange={(event) => updateEntry(key, Number(event.target.value))} /></label>;
        if (typeof entry === "string" && (STRUCTURED_STRING_OPTIONS[key]?.length ?? 0) > 1) return <GovernedOptionInput key={key} label={fieldLabel} idSuffix={`${label}-${key}`} value={entry} options={STRUCTURED_STRING_OPTIONS[key]} onChange={(next) => updateEntry(key, next)} />;
        return <label key={key}>{fieldLabel}<input aria-label={`${label} ${fieldLabel}`} value={typeof entry === "string" ? entry : JSON.stringify(entry)} onChange={(event) => updateEntry(key, event.target.value)} /></label>;
      })}</div>
      {Object.keys(record).length === 0 ? <p className="wm-governed-guided-empty">No governed values apply to this SKU.</p> : null}
    </div>;
  }
  return <div className="wm-governed-structured-field">
    <label>{label}<textarea aria-label={`${label} JSON`} value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} spellCheck={false} /></label>
    <button type="button" className="wm-btn wm-btn--ghost" onClick={() => { try { onApply(JSON.parse(draft)); setError(""); } catch { setError(`${label} must be valid JSON.`); } }}>Apply {label.toLowerCase()}</button>
    {error ? <small role="alert">{error}</small> : null}
  </div>;
}

const POWER_SPEC_KEYS = ["poe", "poh", "poc", "internalPsu", "externalPsu", "powerSupply"];

function confirmableFields(profile: GovernedProfile): Array<{ id: string; label: string; value: string }> {
  const fields: Array<{ id: string; label: string; value: string }> = [];
  const applicable = governedProfileFieldApplicability(profile);
  if (applicable["max-resolution"] && profile.maxResolution?.trim()) fields.push({ id: "max-resolution", label: "Max resolution", value: profile.maxResolution });
  const ioValue = inputCount(profile) || outputCount(profile);
  if (applicable["routed-io"] && ioValue) fields.push({ id: "routed-io", label: "Routed I/O", value: `${inputCount(profile)} in / ${outputCount(profile)} out` });
  const power = (profile.power ?? []).filter(Boolean).join(" · ") || POWER_SPEC_KEYS.map((key) => profile.specs?.[key]).find((value) => value)?.toString() || "";
  if (applicable.power && power) fields.push({ id: "power", label: "Power", value: power });
  if (fields.length === 0) fields.push({ id: "profile-scope", label: "Profile scope / N/A fields", value: [profile.productClass, profile.role].filter(Boolean).join(" · ") });
  return fields;
}

function AdminProfileConfirmation({ profile, reviewer, onConfirmed }: { profile: GovernedProfile; reviewer: string; onConfirmed: (verifiedAt: string) => void }) {
  const fields = confirmableFields(profile);
  const [selected, setSelected] = useState(() => new Set(fields.map((field) => field.id)));
  const defaultEvidence = [...(profile.evidence ?? [])].reverse().find((item) => item.sourceUrl)?.sourceUrl;
  const [evidenceUrl, setEvidenceUrl] = useState(typeof defaultEvidence === "string" ? defaultEvidence : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function confirmReview() {
    if (!evidenceUrl.trim()) { setMessage("Add the manufacturer or datasheet source used for this review."); return; }
    if (selected.size === 0) { setMessage("Confirm at least one applicable field."); return; }
    setSaving(true);
    setMessage("");
    try {
      const result = await confirmGovernedProfile({ sku: profile.sku, verifiedBy: reviewer, confirmedFields: [...selected], evidenceUrl: evidenceUrl.trim() });
      if (!result.ok) { setMessage(result.error || "Confirmation was rejected."); return; }
      onConfirmed(result.verifiedAt || new Date().toISOString());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Confirmation failed.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="wm-governed-confirm" aria-label={`Confirm review for ${profile.sku}`}>
    <h4>Administrator review</h4>
    <p>Signed as <strong>{reviewer}</strong>. Confirm only the values checked against the source below.</p>
    <div className="wm-governed-confirm-fields">{fields.map((field) => <label key={field.id}>
      <input type="checkbox" aria-label={`Confirm ${field.label}`} checked={selected.has(field.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(field.id)) next.delete(field.id); else next.add(field.id); return next; })} />
      <span><strong>{field.label}</strong><small>{field.value}</small></span>
    </label>)}</div>
    <label className="wm-governed-confirm-source">Manufacturer or datasheet source<input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://wyrestorm.com/product/..." /></label>
    <button type="button" className="wm-btn wm-btn--primary" disabled={saving} onClick={() => void confirmReview()}>{saving ? "Confirming…" : "Confirm review and mark verified"}</button>
    {message ? <p role="alert">{message}</p> : null}
  </section>;
}

export default GovernedProfileBrowser;
