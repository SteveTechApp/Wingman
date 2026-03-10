import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  addProductIntelligenceEvidence,
  fetchProductIntelligenceHealth,
  fetchProductIntelligenceRecords,
  getProductIntelligenceContractSummary,
  getProductIntelligenceEndpoint,
  getProductIntelligenceHealthEndpoint,
  refreshProductIntelligenceCatalogSeed,
  updateProductIntelligenceStatus,
  type ProductApprovalStatus,
  type ProductIntelligenceRecord,
  type ProductVendorType,
} from "@/services/productIntelligenceService";

type StatusOption = "all" | ProductApprovalStatus;
type VendorTypeOption = "all" | ProductVendorType;

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

function inferVendorType(brand: string): ProductVendorType {
  return brand.trim().toLowerCase() === "wyrestorm" ? "wyrestorm" : "competitor";
}

export default function ProductIntelligencePage() {
  const nav = useNavigate();
  const [records, setRecords] = React.useState<ProductIntelligenceRecord[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [statusFilter, setStatusFilter] = React.useState<StatusOption>("all");
  const [vendorTypeFilter, setVendorTypeFilter] = React.useState<VendorTypeOption>("all");
  const [searchFilter, setSearchFilter] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [activeId, setActiveId] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [summary, setSummary] = React.useState({
    total: 0,
    byStatus: { draft: 0, approved: 0, expired: 0 },
    byVendorType: { wyrestorm: 0, competitor: 0 },
    stale90Days: 0,
    highConfidence: 0,
  });
  const [endpointAvailable, setEndpointAvailable] = React.useState<boolean>(false);
  const [healthUpdatedAt, setHealthUpdatedAt] = React.useState<string>("");
  const [evidenceBrand, setEvidenceBrand] = React.useState<string>("");
  const [evidenceSku, setEvidenceSku] = React.useState<string>("");
  const [evidenceType, setEvidenceType] = React.useState<"spec" | "io" | "compatibility" | "positioning" | "application" | "other">("spec");
  const [evidenceLabel, setEvidenceLabel] = React.useState<string>("");
  const [evidenceValue, setEvidenceValue] = React.useState<string>("");
  const [evidenceSourceUrl, setEvidenceSourceUrl] = React.useState<string>("");

  const endpoint = getProductIntelligenceEndpoint();
  const healthEndpoint = getProductIntelligenceHealthEndpoint();
  const contractSummary = getProductIntelligenceContractSummary();

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const queryResult = await fetchProductIntelligenceRecords({
      vendorType: vendorTypeFilter === "all" ? undefined : vendorTypeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: searchFilter || undefined,
      limit: 400,
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

  const updateStatus = React.useCallback(
    async (record: ProductIntelligenceRecord, status: ProductApprovalStatus) => {
      const opId = `${record.id}:${status}`;
      setActiveId(opId);
      const result = await updateProductIntelligenceStatus({
        brand: record.brand,
        sku: record.sku,
        vendorType: record.vendorType,
        status,
        reviewedBy: "wingman-support",
      });
      setActiveId("");
      setMessage(result.message);
      if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 8));
      await refresh();
    },
    [refresh],
  );

  const refreshCatalogSeed = React.useCallback(async () => {
    setActiveId("refresh-seed");
    const result = await refreshProductIntelligenceCatalogSeed();
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 8));
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
      vendorType: inferVendorType(brand),
      brand,
      sku,
      type: evidenceType,
      label,
      value,
      sourceUrl: evidenceSourceUrl.trim() || undefined,
      confidence: 0.76,
      notes: "Captured by support workflow",
    });
    setActiveId("");
    setMessage(result.message);
    if (result.warnings.length > 0) setWarnings((prev) => [...result.warnings, ...prev].slice(0, 8));

    if (result.available) {
      setEvidenceLabel("");
      setEvidenceValue("");
      setEvidenceSourceUrl("");
      await refresh();
    }
  }, [evidenceBrand, evidenceLabel, evidenceSku, evidenceSourceUrl, evidenceType, evidenceValue, refresh]);

  return (
    <div className="wm-page wm-product-intel-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid">
            <div className="wm-title-xl">Product Intelligence</div>
            <div className="wm-body-sm wm-page-subtitle">
              Canonical WyreStorm and competitor records with evidence, confidence, and approval states for support and sales workflows.
            </div>
          </div>

          <div className="wm-actions-row">
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools")}>
              Tool Hub
            </button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools/competitor-lookup-diagnostics")}>
              Lookup Diagnostics
            </button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/tools/runtime-diagnostics")}>
              Runtime Diagnostics
            </button>
            <button type="button" className="wm-btn" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" className="wm-btn wm-btn-primary" onClick={() => void refreshCatalogSeed()} disabled={activeId === "refresh-seed"}>
              {activeId === "refresh-seed" ? "Refreshing Seed..." : "Refresh Catalog Seed"}
            </button>
          </div>
        </div>
      </section>

      <section className="wm-grid-cards wm-product-intel-page__stats">
        <article className="wm-work-card">
          <div className="wm-section-title">Endpoint status</div>
          <div className="wm-title-lg wm-product-intel-page__meta">{endpointAvailable ? "Online" : "Fallback mode"}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Visible records</div>
          <div className="wm-title-lg">{records.length}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Total records</div>
          <div className="wm-title-lg">{total}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Approved</div>
          <div className="wm-title-lg">{summary.byStatus.approved}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Draft</div>
          <div className="wm-title-lg">{summary.byStatus.draft}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Expired</div>
          <div className="wm-title-lg">{summary.byStatus.expired}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">Stale &gt; 90 days</div>
          <div className="wm-title-lg">{summary.stale90Days}</div>
        </article>
        <article className="wm-work-card">
          <div className="wm-section-title">High confidence</div>
          <div className="wm-title-lg">{summary.highConfidence}</div>
        </article>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Contract and endpoint</h2>
            <p>{contractSummary}</p>
          </div>
        </div>
        <div className="wm-product-intel-page__meta-grid">
          <div><span>Data endpoint:</span><strong>{endpoint ?? "Not configured"}</strong></div>
          <div><span>Health endpoint:</span><strong>{healthEndpoint ?? "Not configured"}</strong></div>
          <div><span>Health updated:</span><strong>{formatTimestamp(healthUpdatedAt)}</strong></div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Filters</h2>
            <p>Narrow records by approval state, vendor type, or free-text search.</p>
          </div>
        </div>

        <div className="wm-product-intel-page__filters">
          <label className="wm-product-intel-page__filter">
            <span>Status</span>
            <select className="wm-form-input" value={statusFilter} onChange={(event) => setStatusFilter(event.currentTarget.value as StatusOption)}>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label className="wm-product-intel-page__filter">
            <span>Vendor</span>
            <select className="wm-form-input" value={vendorTypeFilter} onChange={(event) => setVendorTypeFilter(event.currentTarget.value as VendorTypeOption)}>
              <option value="all">All vendors</option>
              <option value="wyrestorm">WyreStorm</option>
              <option value="competitor">Competitor</option>
            </select>
          </label>
          <label className="wm-product-intel-page__filter wm-product-intel-page__filter--search">
            <span>Search</span>
            <input
              className="wm-form-input"
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.currentTarget.value)}
              placeholder="brand, sku, family, feature..."
            />
          </label>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Evidence capture</h2>
            <p>Add source-backed evidence to any SKU to improve trust and sales guidance quality.</p>
          </div>
        </div>
        <div className="wm-product-intel-page__evidence">
          <label>
            <span>Brand</span>
            <input className="wm-form-input" value={evidenceBrand} onChange={(event) => setEvidenceBrand(event.currentTarget.value)} placeholder="WyreStorm" />
          </label>
          <label>
            <span>SKU</span>
            <input className="wm-form-input" value={evidenceSku} onChange={(event) => setEvidenceSku(event.currentTarget.value)} placeholder="EX-70-H2" />
          </label>
          <label>
            <span>Type</span>
            <select className="wm-form-input" value={evidenceType} onChange={(event) => setEvidenceType(event.currentTarget.value as typeof evidenceType)}>
              <option value="spec">Spec</option>
              <option value="io">I/O</option>
              <option value="compatibility">Compatibility</option>
              <option value="positioning">Positioning</option>
              <option value="application">Application</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="wm-product-intel-page__evidence-wide">
            <span>Label</span>
            <input className="wm-form-input" value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.currentTarget.value)} placeholder="HDBaseT distance capability" />
          </label>
          <label className="wm-product-intel-page__evidence-wide">
            <span>Evidence value</span>
            <input className="wm-form-input" value={evidenceValue} onChange={(event) => setEvidenceValue(event.currentTarget.value)} placeholder="Supports up to 70m over Cat6." />
          </label>
          <label className="wm-product-intel-page__evidence-wide">
            <span>Source URL</span>
            <input className="wm-form-input" value={evidenceSourceUrl} onChange={(event) => setEvidenceSourceUrl(event.currentTarget.value)} placeholder="https://..." />
          </label>
          <div className="wm-product-intel-page__evidence-actions">
            <button type="button" className="wm-btn wm-btn-primary" onClick={() => void submitEvidence()} disabled={activeId === "add-evidence"}>
              {activeId === "add-evidence" ? "Saving..." : "Add Evidence"}
            </button>
          </div>
        </div>
      </section>

      <section className="wm-section">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Records</h2>
            <p>Use approval state controls to maintain trusted product intelligence for sales teams.</p>
          </div>
        </div>

        {message ? <div className="wm-body-sm wm-product-intel-page__message">{message}</div> : null}
        {warnings.length > 0 ? (
          <div className="wm-product-intel-page__warnings">
            {warnings.slice(0, 8).map((warning, index) => (
              <div key={`${warning}_${index}`} className="wm-product-intel-page__warning-item">
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {records.length === 0 ? (
          <div className="wm-body">No product intelligence records found for the selected filters.</div>
        ) : (
          <div className="wm-product-intel-page__records">
            {records.map((record) => {
              const approveId = `${record.id}:approved`;
              const draftId = `${record.id}:draft`;
              const expireId = `${record.id}:expired`;
              return (
                <article key={record.id} className="wm-panel">
                  <div className="wm-product-intel-page__record">
                    <div className="wm-product-intel-page__record-head">
                      <strong>{record.brand} {record.sku}</strong>
                      <span className={statusChipClass(record.status)}>{record.status}</span>
                    </div>

                    <div className="wm-product-intel-page__record-grid">
                      <div><span>Name:</span><strong>{record.name}</strong></div>
                      <div><span>Vendor type:</span><strong>{record.vendorType}</strong></div>
                      <div><span>Family:</span><strong>{record.family}</strong></div>
                      <div><span>Category:</span><strong>{record.category}</strong></div>
                      <div><span>Confidence:</span><strong>{record.confidence.toFixed(2)}</strong></div>
                      <div><span>Evidence entries:</span><strong>{record.evidence.length}</strong></div>
                      <div><span>Last captured:</span><strong>{formatTimestamp(record.lastCapturedAt)}</strong></div>
                      <div><span>Last reviewed:</span><strong>{formatTimestamp(record.lastReviewedAt)}</strong></div>
                    </div>

                    <div className="wm-body-sm wm-product-intel-page__record-summary">{record.summary}</div>

                    <div className="wm-product-intel-page__record-actions">
                      <button type="button" className="wm-btn" disabled={activeId === approveId} onClick={() => void updateStatus(record, "approved")}>
                        {activeId === approveId ? "Saving..." : "Mark Approved"}
                      </button>
                      <button type="button" className="wm-btn" disabled={activeId === draftId} onClick={() => void updateStatus(record, "draft")}>
                        {activeId === draftId ? "Saving..." : "Mark Draft"}
                      </button>
                      <button type="button" className="wm-btn" disabled={activeId === expireId} onClick={() => void updateStatus(record, "expired")}>
                        {activeId === expireId ? "Saving..." : "Mark Expired"}
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
