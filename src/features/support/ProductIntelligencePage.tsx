import * as React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import {
  addProductIntelligenceEvidence,
  fetchProductIntelligenceHealth,
  fetchProductIntelligenceRecords,
  flagProductIntelligenceRecord,
  getProductIntelligenceContractSummary,
  getProductIntelligenceEndpoint,
  getProductIntelligenceHealthEndpoint,
  refreshProductIntelligenceCatalogSeed,
  setProductIntelligenceRecordArchived,
  updateProductIntelligenceFlagStatus,
  updateProductIntelligenceStatus,
  upsertProductIntelligenceRecord,
  type ProductApprovalStatus,
  type ProductIntelligenceRecord,
  type ProductReviewFlag,
  type ProductVendorType,
} from "@/services/productIntelligenceService";

type StatusOption = "all" | ProductApprovalStatus;
type VendorTypeOption = "all" | ProductVendorType;
type ViewOption = "active" | "flagged" | "archived" | "all";

type EditorState = {
  vendorType: ProductVendorType;
  brand: string;
  sku: string;
  name: string;
  family: string;
  group: ProductIntelligenceRecord["group"];
  category: string;
  subcategory: string;
  summary: string;
  transport: string;
  sourceUrl: string;
  status: ProductApprovalStatus;
  confidence: string;
  features: string;
  notes: string;
};

const GROUP_OPTIONS: ProductIntelligenceRecord["group"][] = [
  "distribution",
  "extender",
  "matrix",
  "avoip",
  "camera",
  "audio",
  "uc",
  "switcher",
  "control",
  "casting",
  "videowall",
  "other",
];

const EMPTY_EDITOR: EditorState = {
  vendorType: "wyrestorm",
  brand: "WyreStorm",
  sku: "",
  name: "",
  family: "",
  group: "other",
  category: "",
  subcategory: "",
  summary: "",
  transport: "",
  sourceUrl: "",
  status: "draft",
  confidence: "0.78",
  features: "",
  notes: "",
};

function formatTimestamp(value: string | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusChipClass(status: ProductApprovalStatus): string {
  if (status === "approved") return "wm-chip";
  if (status === "expired") return "wm-chip wm-chip--warn";
  return "wm-chip";
}

function formatFlagKind(value: ProductReviewFlag["kind"]): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function splitCommaValues(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function editorFromRecord(record: ProductIntelligenceRecord): EditorState {
  return {
    vendorType: record.vendorType,
    brand: record.brand,
    sku: record.sku,
    name: record.name,
    family: record.family,
    group: record.group,
    category: record.category,
    subcategory: record.subcategory || "",
    summary: record.summary,
    transport: record.transport || "",
    sourceUrl: record.sourceUrls[0] || "",
    status: record.status,
    confidence: String(record.confidence),
    features: record.features.join(", "),
    notes: record.notes || "",
  };
}

function openFlagCount(record: ProductIntelligenceRecord): number {
  return record.reviewFlags.filter((flag) => flag.status === "open").length;
}

export default function ProductIntelligencePage() {
  const nav = useNavigate();
  const auth = useAuth();
  const canAdmin = Boolean(
    auth.permissions.canManageWorkspace ||
    auth.workspaceRole === "admin" ||
    auth.workspaceRole === "owner" ||
    auth.user?.role === "admin",
  );

  const [records, setRecords] = React.useState<ProductIntelligenceRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState<StatusOption>("all");
  const [vendorTypeFilter, setVendorTypeFilter] = React.useState<VendorTypeOption>("all");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [viewFilter, setViewFilter] = React.useState<ViewOption>("active");
  const [loading, setLoading] = React.useState(false);
  const [activeId, setActiveId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [summary, setSummary] = React.useState({
    total: 0,
    byStatus: { draft: 0, approved: 0, expired: 0 },
    byVendorType: { wyrestorm: 0, competitor: 0 },
    stale90Days: 0,
    highConfidence: 0,
  });
  const [endpointAvailable, setEndpointAvailable] = React.useState(false);
  const [healthUpdatedAt, setHealthUpdatedAt] = React.useState("");
  const [evidenceBrand, setEvidenceBrand] = React.useState("WyreStorm");
  const [evidenceSku, setEvidenceSku] = React.useState("");
  const [evidenceType, setEvidenceType] = React.useState<"spec" | "io" | "compatibility" | "positioning" | "application" | "other">("spec");
  const [evidenceLabel, setEvidenceLabel] = React.useState("");
  const [evidenceValue, setEvidenceValue] = React.useState("");
  const [evidenceSourceUrl, setEvidenceSourceUrl] = React.useState("");
  const [editingRecordId, setEditingRecordId] = React.useState("");
  const [editor, setEditor] = React.useState<EditorState>(EMPTY_EDITOR);
  const [flagDrafts, setFlagDrafts] = React.useState<Record<string, string>>({});

  const endpoint = getProductIntelligenceEndpoint();
  const healthEndpoint = getProductIntelligenceHealthEndpoint();
  const contractSummary = getProductIntelligenceContractSummary();

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const queryResult = await fetchProductIntelligenceRecords({
      vendorType: vendorTypeFilter === "all" ? undefined : vendorTypeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: searchFilter || undefined,
      limit: 4000,
      includeArchived: true,
    });
    const health = await fetchProductIntelligenceHealth();

    setRecords(queryResult.records);
    setTotal(queryResult.total);
    setWarnings([...queryResult.warnings, ...health.warnings]);
    setSummary(queryResult.summary);
    setEndpointAvailable(queryResult.available);
    setHealthUpdatedAt(health.updatedAt || health.generatedAt || health.fetchedAt);
    setLoading(false);
  }, [searchFilter, statusFilter, vendorTypeFilter]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleRecords = React.useMemo(() => records.filter((record) => {
    if (viewFilter === "active") return !record.archived;
    if (viewFilter === "flagged") return openFlagCount(record) > 0;
    if (viewFilter === "archived") return Boolean(record.archived);
    return true;
  }), [records, viewFilter]);

  const openFlags = React.useMemo(
    () => records.flatMap((record) => record.reviewFlags.filter((flag) => flag.status === "open").map((flag) => ({ record, flag }))),
    [records],
  );

  const archivedCount = React.useMemo(() => records.filter((record) => record.archived).length, [records]);
  const manualCount = React.useMemo(() => records.filter((record) => record.classificationSource === "manual").length, [records]);

  const updateStatus = React.useCallback(async (record: ProductIntelligenceRecord, status: ProductApprovalStatus) => {
    const opId = `${record.id}:${status}`;
    setActiveId(opId);
    const result = await updateProductIntelligenceStatus({
      brand: record.brand,
      sku: record.sku,
      vendorType: record.vendorType,
      status,
      reviewedBy: auth.user?.email || "wingman-support",
    });
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    await refresh();
  }, [auth.user?.email, refresh]);

  const refreshCatalogSeed = React.useCallback(async () => {
    setActiveId("refresh-seed");
    const result = await refreshProductIntelligenceCatalogSeed();
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    await refresh();
  }, [refresh]);

  const submitEvidence = React.useCallback(async () => {
    const brand = evidenceBrand.trim();
    const sku = evidenceSku.trim();
    const label = evidenceLabel.trim();
    const value = evidenceValue.trim();
    if (!brand || !sku || !label || !value) {
      setMessage("Evidence requires brand, SKU, label, and value.");
      return;
    }

    setActiveId("add-evidence");
    const result = await addProductIntelligenceEvidence({
      vendorType: brand.toLowerCase() === "wyrestorm" ? "wyrestorm" : "competitor",
      brand,
      sku,
      type: evidenceType,
      label,
      value,
      sourceUrl: evidenceSourceUrl.trim() || undefined,
      confidence: 0.76,
      notes: "Captured by product-intelligence workflow",
    });
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    setEvidenceLabel("");
    setEvidenceValue("");
    setEvidenceSourceUrl("");
    await refresh();
  }, [evidenceBrand, evidenceLabel, evidenceSku, evidenceSourceUrl, evidenceType, evidenceValue, refresh]);

  const beginCreate = React.useCallback(() => {
    setEditingRecordId("new");
    setEditor(EMPTY_EDITOR);
  }, []);

  const beginEdit = React.useCallback((record: ProductIntelligenceRecord) => {
    setEditingRecordId(record.id);
    setEditor(editorFromRecord(record));
    setEvidenceBrand(record.brand);
    setEvidenceSku(record.sku);
  }, []);

  const cancelEdit = React.useCallback(() => {
    setEditingRecordId("");
    setEditor(EMPTY_EDITOR);
  }, []);

  const saveEditor = React.useCallback(async () => {
    if (!canAdmin) {
      setMessage("Only administrators can edit catalogue records.");
      return;
    }

    const brand = editor.brand.trim();
    const sku = editor.sku.trim();
    const family = editor.family.trim();
    const name = editor.name.trim();
    if (!brand || !sku || !family || !name) {
      setMessage("Brand, SKU, family, and name are required.");
      return;
    }

    setActiveId(`save:${editingRecordId || sku}`);
    const result = await upsertProductIntelligenceRecord({
      vendorType: editor.vendorType,
      brand,
      sku,
      name,
      family,
      group: editor.group,
      category: editor.category.trim(),
      subcategory: editor.subcategory.trim() || undefined,
      summary: editor.summary.trim(),
      transport: editor.transport.trim() || undefined,
      sourceUrls: editor.sourceUrl.trim() ? [editor.sourceUrl.trim()] : [],
      status: editor.status,
      confidence: Number(editor.confidence) || 0.78,
      features: splitCommaValues(editor.features),
      notes: editor.notes.trim() || undefined,
      classificationSource: "manual",
      sourceType: "manual",
    });
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    cancelEdit();
    await refresh();
  }, [canAdmin, cancelEdit, editor, editingRecordId, refresh]);

  const toggleArchive = React.useCallback(async (record: ProductIntelligenceRecord, archived: boolean) => {
    if (!canAdmin) {
      setMessage("Only administrators can remove or restore records.");
      return;
    }
    setActiveId(`${record.id}:${archived ? "archive" : "restore"}`);
    const result = await setProductIntelligenceRecordArchived({
      vendorType: record.vendorType,
      brand: record.brand,
      sku: record.sku,
      archived,
      reviewedBy: auth.user?.email || "wingman-admin",
      note: archived ? "Removed from active catalogue by administrator." : "Restored to active catalogue by administrator.",
      record,
    });
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    await refresh();
  }, [auth.user?.email, canAdmin, refresh]);

  const submitFlag = React.useCallback(async (record: ProductIntelligenceRecord) => {
    const note = flagDrafts[record.id]?.trim();
    setActiveId(`${record.id}:flag`);
    const result = await flagProductIntelligenceRecord({
      vendorType: record.vendorType,
      brand: record.brand,
      sku: record.sku,
      kind: "categorisation",
      message: note || `Review the family/category/group association for ${record.brand} ${record.sku}.`,
      note: note ? "Flag raised from product-intelligence maintenance view." : undefined,
      source: "product-intelligence",
      createdBy: auth.user?.email || "wingman-user",
      record,
    });
    setActiveId("");
    setMessage(result.message);
    setFlagDrafts((prev) => ({ ...prev, [record.id]: "" }));
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    await refresh();
  }, [auth.user?.email, flagDrafts, refresh]);

  const resolveFlag = React.useCallback(async (record: ProductIntelligenceRecord, flag: ProductReviewFlag) => {
    if (!canAdmin) {
      setMessage("Only administrators can resolve review flags.");
      return;
    }
    setActiveId(`${record.id}:${flag.id}:resolve`);
    const result = await updateProductIntelligenceFlagStatus({
      vendorType: record.vendorType,
      brand: record.brand,
      sku: record.sku,
      flagId: flag.id,
      status: "resolved",
      resolvedBy: auth.user?.email || "wingman-admin",
      note: "Resolved from product-intelligence maintenance view.",
      record,
    });
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 12));
    await refresh();
  }, [auth.user?.email, canAdmin, refresh]);

  return (
    <div className="wm-page wm-product-intel-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid">
            <div className="wm-title-xl">Product Intelligence</div>
            <div className="wm-body-sm wm-page-subtitle">
              Maintain trusted WyreStorm and competitor records with explicit group, category, and subcategory control.
              Flags, local overrides, and archive state now feed the live catalogue view.
            </div>
          </div>
          <div className="wm-actions-row">
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools/catalog")}>Product Reference</button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools")}>Tool Hub</button>
            <button type="button" className="wm-btn" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
            <button type="button" className="wm-btn wm-btn-primary" onClick={() => void refreshCatalogSeed()} disabled={activeId === "refresh-seed"}>
              {activeId === "refresh-seed" ? "Refreshing Seed..." : "Refresh Catalog Seed"}
            </button>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <CollapsibleCard
          id="product-intelligence-health"
          title="Health snapshot"
          subtitle="Endpoint and record health indicators."
          right={<span className="wm-chip">{endpointAvailable ? "Online" : "Fallback"}</span>}
          defaultCollapsed
        >
          <div className="wm-grid-cards wm-product-intel-page__stats">
            <article className="wm-work-card"><div className="wm-section-title">Endpoint status</div><div className="wm-title-lg wm-product-intel-page__meta">{endpointAvailable ? "Online" : "Fallback mode"}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">Visible records</div><div className="wm-title-lg">{visibleRecords.length}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">Matching total</div><div className="wm-title-lg">{total}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">Open flags</div><div className="wm-title-lg">{openFlags.length}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">Archived</div><div className="wm-title-lg">{archivedCount}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">Manual overrides</div><div className="wm-title-lg">{manualCount}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">Approved</div><div className="wm-title-lg">{summary.byStatus.approved}</div></article>
            <article className="wm-work-card"><div className="wm-section-title">High confidence</div><div className="wm-title-lg">{summary.highConfidence}</div></article>
          </div>
        </CollapsibleCard>
      </section>

      <section className="wm-section">
        <CollapsibleCard
          id="product-intelligence-contract-endpoint"
          title="Contract and endpoint"
          subtitle={contractSummary}
          defaultCollapsed
        >
          <div className="wm-product-intel-page__meta-grid">
            <div><span>Data endpoint:</span><strong>{endpoint ?? "Not configured"}</strong></div>
            <div><span>Health endpoint:</span><strong>{healthEndpoint ?? "Not configured"}</strong></div>
            <div><span>Health updated:</span><strong>{formatTimestamp(healthUpdatedAt)}</strong></div>
          </div>
        </CollapsibleCard>
      </section>

      <section className="wm-section">
        <CollapsibleCard
          id="product-intelligence-review-queue"
          title="Review queue"
          subtitle="Open issues raised for family, category, group, or source-link investigation."
          right={<span className={openFlags.length > 0 ? "wm-chip wm-chip--warn" : "wm-chip"}>{openFlags.length} open</span>}
          defaultCollapsed={openFlags.length === 0}
        >
          {openFlags.length === 0 ? (
            <div className="wm-body-sm">No open review flags at the moment.</div>
          ) : (
            <div className="wm-product-intel-page__flag-queue">
              {openFlags.map(({ record, flag }) => (
                <article key={`${record.id}:${flag.id}`} className="wm-work-card wm-product-intel-page__flag-card">
                  <div className="wm-product-intel-page__record-head">
                    <strong>{record.brand} {record.sku}</strong>
                    <span className="wm-chip">{formatFlagKind(flag.kind)}</span>
                  </div>
                  <div className="wm-body-sm">{flag.message}</div>
                  <div className="wm-body-sm wm-product-intel-page__record-summary">{record.family} / {record.group} / {record.category}{record.subcategory ? ` / ${record.subcategory}` : ""}</div>
                  <div className="wm-body-sm">Raised by {flag.createdBy} on {formatTimestamp(flag.createdAt)}</div>
                  {flag.note ? <div className="wm-body-sm">{flag.note}</div> : null}
                  <div className="wm-actions-row">
                    <button type="button" className="wm-btn" onClick={() => beginEdit(record)}>Edit record</button>
                    {canAdmin ? (
                      <button type="button" className="wm-btn" disabled={activeId === `${record.id}:${flag.id}:resolve`} onClick={() => void resolveFlag(record, flag)}>
                        {activeId === `${record.id}:${flag.id}:resolve` ? "Saving..." : "Resolve flag"}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CollapsibleCard>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles"><h2>Filters</h2><p>Narrow by approval state, vendor, search term, or review view.</p></div>
        </div>
        <div className="wm-product-intel-page__filters wm-product-intel-page__filters--wide">
          <label className="wm-product-intel-page__filter"><span>Status</span><select className="wm-form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as StatusOption)}><option value="all">All statuses</option><option value="approved">Approved</option><option value="draft">Draft</option><option value="expired">Expired</option></select></label>
          <label className="wm-product-intel-page__filter"><span>Vendor</span><select className="wm-form-input" value={vendorTypeFilter} onChange={(event) => setVendorTypeFilter(event.currentTarget.value as VendorTypeOption)}><option value="all">All vendors</option><option value="wyrestorm">WyreStorm</option><option value="competitor">Competitor</option></select></label>
          <label className="wm-product-intel-page__filter"><span>View</span><select className="wm-form-input" value={viewFilter} onChange={(event) => setViewFilter(event.currentTarget.value as ViewOption)}><option value="active">Active</option><option value="flagged">Flagged</option><option value="archived">Archived</option><option value="all">All records</option></select></label>
          <label className="wm-product-intel-page__filter wm-product-intel-page__filter--search"><span>Search</span><input className="wm-form-input" value={searchFilter} onChange={(event) => setSearchFilter(event.currentTarget.value)} placeholder="brand, sku, family, group, category..." /></label>
        </div>
      </section>

      <section className="wm-section">
        <CollapsibleCard
          id={`product-intelligence-record-maintenance-${editingRecordId ? "editing" : "idle"}`}
          title="Record maintenance"
          subtitle="Correct SKU grouping, add missing entries, or update classifications."
          right={<span className="wm-chip">{canAdmin ? "Admin" : "Read only"}</span>}
          defaultCollapsed={!editingRecordId}
        >
          <div className="wm-actions-row" style={{ marginBottom: 10 }}>
            <button type="button" className="wm-btn" onClick={beginCreate}>Add new entry</button>
            {!canAdmin ? <span className="wm-chip">Admin controls locked</span> : null}
          </div>
          <div className="wm-product-intel-page__editor">
            <label className="wm-product-intel-page__filter"><span>Vendor type</span><select className="wm-form-input" value={editor.vendorType} onChange={(event) => setEditor((prev) => ({ ...prev, vendorType: event.currentTarget.value as ProductVendorType }))}><option value="wyrestorm">WyreStorm</option><option value="competitor">Competitor</option></select></label>
            <label className="wm-product-intel-page__filter"><span>Brand</span><input className="wm-form-input" value={editor.brand} onChange={(event) => setEditor((prev) => ({ ...prev, brand: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter"><span>SKU</span><input className="wm-form-input" value={editor.sku} onChange={(event) => setEditor((prev) => ({ ...prev, sku: event.currentTarget.value.toUpperCase() }))} /></label>
            <label className="wm-product-intel-page__filter wm-product-intel-page__filter--span-2"><span>Name</span><input className="wm-form-input" value={editor.name} onChange={(event) => setEditor((prev) => ({ ...prev, name: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter"><span>Family</span><input className="wm-form-input" value={editor.family} onChange={(event) => setEditor((prev) => ({ ...prev, family: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter"><span>Group</span><select className="wm-form-input" value={editor.group} onChange={(event) => setEditor((prev) => ({ ...prev, group: event.currentTarget.value as ProductIntelligenceRecord["group"] }))}>{GROUP_OPTIONS.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
            <label className="wm-product-intel-page__filter"><span>Category</span><input className="wm-form-input" value={editor.category} onChange={(event) => setEditor((prev) => ({ ...prev, category: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter"><span>Subcategory</span><input className="wm-form-input" value={editor.subcategory} onChange={(event) => setEditor((prev) => ({ ...prev, subcategory: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter"><span>Status</span><select className="wm-form-input" value={editor.status} onChange={(event) => setEditor((prev) => ({ ...prev, status: event.currentTarget.value as ProductApprovalStatus }))}><option value="approved">Approved</option><option value="draft">Draft</option><option value="expired">Expired</option></select></label>
            <label className="wm-product-intel-page__filter"><span>Confidence</span><input className="wm-form-input" value={editor.confidence} onChange={(event) => setEditor((prev) => ({ ...prev, confidence: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter"><span>Transport</span><input className="wm-form-input" value={editor.transport} onChange={(event) => setEditor((prev) => ({ ...prev, transport: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter wm-product-intel-page__filter--span-2"><span>Source URL</span><input className="wm-form-input" value={editor.sourceUrl} onChange={(event) => setEditor((prev) => ({ ...prev, sourceUrl: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter wm-product-intel-page__filter--span-2"><span>Features</span><input className="wm-form-input" value={editor.features} onChange={(event) => setEditor((prev) => ({ ...prev, features: event.currentTarget.value }))} placeholder="wireless casting, usb-c, dual view" /></label>
            <label className="wm-product-intel-page__filter wm-product-intel-page__filter--full"><span>Summary</span><textarea className="wm-form-input" rows={3} value={editor.summary} onChange={(event) => setEditor((prev) => ({ ...prev, summary: event.currentTarget.value }))} /></label>
            <label className="wm-product-intel-page__filter wm-product-intel-page__filter--full"><span>Notes</span><textarea className="wm-form-input" rows={3} value={editor.notes} onChange={(event) => setEditor((prev) => ({ ...prev, notes: event.currentTarget.value }))} /></label>
            <div className="wm-product-intel-page__editor-actions">
              <button type="button" className="wm-btn" onClick={cancelEdit}>Clear</button>
              <button type="button" className="wm-btn wm-btn-primary" onClick={() => void saveEditor()} disabled={!canAdmin || activeId === `save:${editingRecordId || editor.sku}`}>
                {activeId === `save:${editingRecordId || editor.sku}` ? "Saving..." : editingRecordId === "new" ? "Add entry" : "Save changes"}
              </button>
            </div>
          </div>
        </CollapsibleCard>
      </section>

      <section className="wm-section">
        <CollapsibleCard
          id="product-intelligence-evidence"
          title="Evidence capture"
          subtitle="Add source-backed evidence to improve trust and classification confidence."
          defaultCollapsed
        >
          <div className="wm-product-intel-page__evidence">
            <label><span>Brand</span><input className="wm-form-input" value={evidenceBrand} onChange={(event) => setEvidenceBrand(event.currentTarget.value)} placeholder="WyreStorm" /></label>
            <label><span>SKU</span><input className="wm-form-input" value={evidenceSku} onChange={(event) => setEvidenceSku(event.currentTarget.value)} placeholder="EX-70-H2" /></label>
            <label><span>Type</span><select className="wm-form-input" value={evidenceType} onChange={(event) => setEvidenceType(event.currentTarget.value as typeof evidenceType)}><option value="spec">Spec</option><option value="io">I/O</option><option value="compatibility">Compatibility</option><option value="positioning">Positioning</option><option value="application">Application</option><option value="other">Other</option></select></label>
            <label className="wm-product-intel-page__evidence-wide"><span>Label</span><input className="wm-form-input" value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.currentTarget.value)} placeholder="HDBaseT distance capability" /></label>
            <label className="wm-product-intel-page__evidence-wide"><span>Evidence value</span><input className="wm-form-input" value={evidenceValue} onChange={(event) => setEvidenceValue(event.currentTarget.value)} placeholder="Supports up to 70m over Cat6." /></label>
            <label className="wm-product-intel-page__evidence-wide"><span>Source URL</span><input className="wm-form-input" value={evidenceSourceUrl} onChange={(event) => setEvidenceSourceUrl(event.currentTarget.value)} placeholder="https://..." /></label>
            <div className="wm-product-intel-page__evidence-actions">
              <button type="button" className="wm-btn wm-btn-primary" onClick={() => void submitEvidence()} disabled={activeId === "add-evidence"}>{activeId === "add-evidence" ? "Saving..." : "Add evidence"}</button>
            </div>
          </div>
        </CollapsibleCard>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles"><h2>Records</h2><p>Review the live classification, flag incorrect SKU associations, and maintain the active catalogue set.</p></div>
        </div>
        {message ? <div className="wm-body-sm wm-product-intel-page__message">{message}</div> : null}
        {warnings.length > 0 ? <div className="wm-product-intel-page__warnings">{warnings.slice(0, 12).map((warning, index) => <div key={`${warning}_${index}`} className="wm-product-intel-page__warning-item">{warning}</div>)}</div> : null}
        {visibleRecords.length === 0 ? (
          <div className="wm-body">No product intelligence records found for the selected filters.</div>
        ) : (
          <div className="wm-product-intel-page__records">
            {visibleRecords.map((record) => {
              const approveId = `${record.id}:approved`;
              const draftId = `${record.id}:draft`;
              const expireId = `${record.id}:expired`;
              const archiveId = `${record.id}:${record.archived ? "restore" : "archive"}`;
              return (
                <article key={record.id} className="wm-panel">
                  <div className="wm-product-intel-page__record">
                    <div className="wm-product-intel-page__record-head">
                      <strong>{record.brand} {record.sku}</strong>
                      <div className="wm-actions-row">
                        <span className={statusChipClass(record.status)}>{record.status}</span>
                        <span className="wm-chip">{record.group}</span>
                        {record.archived ? <span className="wm-chip wm-chip--warn">Archived</span> : null}
                        {openFlagCount(record) > 0 ? <span className="wm-chip wm-chip--warn">{openFlagCount(record)} open flag(s)</span> : null}
                      </div>
                    </div>
                    <div className="wm-product-intel-page__record-grid">
                      <div><span>Name</span><strong>{record.name}</strong></div>
                      <div><span>Vendor type</span><strong>{record.vendorType}</strong></div>
                      <div><span>Family</span><strong>{record.family}</strong></div>
                      <div><span>Group</span><strong>{record.group}</strong></div>
                      <div><span>Category</span><strong>{record.category}</strong></div>
                      <div><span>Subcategory</span><strong>{record.subcategory || "-"}</strong></div>
                      <div><span>Classification source</span><strong>{record.classificationSource}</strong></div>
                      <div><span>Confidence</span><strong>{record.confidence.toFixed(2)}</strong></div>
                      <div><span>Evidence entries</span><strong>{record.evidence.length}</strong></div>
                      <div><span>Last captured</span><strong>{formatTimestamp(record.lastCapturedAt)}</strong></div>
                      <div><span>Last reviewed</span><strong>{formatTimestamp(record.lastReviewedAt)}</strong></div>
                      <div><span>Source link</span><strong>{record.sourceUrls[0] || "-"}</strong></div>
                    </div>
                    <div className="wm-body-sm wm-product-intel-page__record-summary">{record.summary}</div>
                    {record.reviewFlags.length > 0 ? (
                      <div className="wm-product-intel-page__record-flags">
                        {record.reviewFlags.map((flag) => (
                          <div key={flag.id} className="wm-product-intel-page__record-flag">
                            <div className="wm-product-intel-page__record-head">
                              <strong>{formatFlagKind(flag.kind)}</strong>
                              <span className={flag.status === "resolved" ? "wm-chip" : "wm-chip wm-chip--warn"}>{flag.status}</span>
                            </div>
                            <div className="wm-body-sm">{flag.message}</div>
                            <div className="wm-body-sm">{flag.createdBy} �f�?s· {formatTimestamp(flag.createdAt)}{flag.resolvedAt ? ` �f�?s· resolved ${formatTimestamp(flag.resolvedAt)}` : ""}</div>
                            {flag.note ? <div className="wm-body-sm">{flag.note}</div> : null}
                            {flag.status === "open" && canAdmin ? <button type="button" className="wm-btn" disabled={activeId === `${record.id}:${flag.id}:resolve`} onClick={() => void resolveFlag(record, flag)}>{activeId === `${record.id}:${flag.id}:resolve` ? "Saving..." : "Resolve flag"}</button> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <label className="wm-product-intel-page__flag-entry">
                      <span>Flag for review</span>
                      <textarea className="wm-form-input" rows={2} value={flagDrafts[record.id] || ""} onChange={(event) => setFlagDrafts((prev) => ({ ...prev, [record.id]: event.currentTarget.value }))} placeholder="Describe the incorrect category, family, group, or association." />
                    </label>
                    <div className="wm-product-intel-page__record-actions">
                      <button type="button" className="wm-btn" disabled={activeId === `${record.id}:flag`} onClick={() => void submitFlag(record)}>{activeId === `${record.id}:flag` ? "Saving..." : "Flag issue"}</button>
                      <button type="button" className="wm-btn" onClick={() => beginEdit(record)}>Edit</button>
                      {canAdmin ? <>
                        <button type="button" className="wm-btn" disabled={activeId === approveId} onClick={() => void updateStatus(record, "approved")}>{activeId === approveId ? "Saving..." : "Mark approved"}</button>
                        <button type="button" className="wm-btn" disabled={activeId === draftId} onClick={() => void updateStatus(record, "draft")}>{activeId === draftId ? "Saving..." : "Mark draft"}</button>
                        <button type="button" className="wm-btn" disabled={activeId === expireId} onClick={() => void updateStatus(record, "expired")}>{activeId === expireId ? "Saving..." : "Mark expired"}</button>
                        <button type="button" className="wm-btn" disabled={activeId === archiveId} onClick={() => void toggleArchive(record, !record.archived)}>{activeId === archiveId ? "Saving..." : record.archived ? "Restore entry" : "Remove from catalogue"}</button>
                      </> : null}
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
