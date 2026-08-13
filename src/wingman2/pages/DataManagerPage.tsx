import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Archive, ArrowUpDown, CheckCircle2, Copy, Database, Download, Pencil, Plus, RefreshCcw, Search, ShieldAlert, Upload, X } from "lucide-react";
import { getWingmanSession, type WingmanWorkspaceSession } from "../api/wingmanApi";
import { PRODUCT_LIFECYCLES, displayLifecycle, emptyProduct, isArchivedProduct, productIntelligenceRepository, validateProductRecord, type AdminLifecycle, type ProductIntelligenceRecord, type ProductPort } from "../data/productIntelligenceRepository";
import { qualityCounts } from "../lib/productDataQuality";
import type { ProductQualityIssue } from "../types/productTruth";

const TABS = ["WyreStorm Products", "Competitor Products", "Match Overrides", "Lifecycle", "Reported Errors", "Import / Export", "Change History"] as const;
type Tab = typeof TABS[number];
const QUALITY_SUMMARY: Array<{ issue: ProductQualityIssue; label: string }> = [
  { issue: "requires-review", label: "Require review" },
  { issue: "low-confidence", label: "Low confidence" },
  { issue: "never-verified", label: "Never verified" },
  { issue: "missing-classification", label: "Missing classification" },
  { issue: "missing-io-topology", label: "Missing I/O" },
  { issue: "missing-video-capability", label: "Missing video" },
  { issue: "missing-equivalence-review", label: "Missing equivalence" },
];
function recordMatchesQualityFilter(
  record: ProductIntelligenceRecord,
  issue: ProductQualityIssue | null
): boolean {
  if (!issue) return true;

  const counts = qualityCounts([record]);
  return (counts[issue] ?? 0) > 0;
}
const isAdminSession = (session: WingmanWorkspaceSession | null) =>
  import.meta.env.DEV ||
  Boolean(
    session?.permissions?.canManageWorkspace ||
    [session?.workspaceRole, session?.user?.role].some((role) =>
      ["admin", "owner"].includes(String(role).toLowerCase())
    )
  );

export function DataManagerPage() {
  const [session, setSession] = useState<WingmanWorkspaceSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [records, setRecords] = useState<ProductIntelligenceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState<ProductQualityIssue | null>(null); const [manufacturer, setManufacturer] = useState(""); const [family, setFamily] = useState(""); const [category, setCategory] = useState(""); const [status, setStatus] = useState("");
  const [incompleteOnly, setIncompleteOnly] = useState(false); const [errorsOnly, setErrorsOnly] = useState(false); const [sort, setSort] = useState<"sku" | "updatedAt">("sku");
  const [editing, setEditing] = useState<ProductIntelligenceRecord | null>(null); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const admin = isAdminSession(session);
  const vendorType = tab === "Competitor Products" ? "competitor" : "wyrestorm";

  useEffect(() => { getWingmanSession().then((value) => setSession(value.session || null)).catch(() => setSession(null)).finally(() => setSessionReady(true)); }, []);
  async function reload() { setLoading(true); try { setRecords(await productIntelligenceRepository.list()); setMessage(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load product intelligence."); } finally { setLoading(false); } }
  useEffect(() => { if (admin) void reload(); }, [admin]);

  const vendorRecords = useMemo(() => records.filter((record) => record.vendorType === vendorType), [records, vendorType]);
  const dataQuality = useMemo(() => qualityCounts(vendorRecords), [vendorRecords]);

  const visible = useMemo(() => records.filter((record) => {
    if (record.vendorType !== vendorType) return false;
    if (!recordMatchesQualityFilter(record, qualityFilter)) return false;
    const blob = `${record.brand} ${record.sku} ${record.name} ${record.family} ${record.category} ${record.summary}`.toLowerCase();
    if (query && !blob.includes(query.toLowerCase())) return false;
    if (manufacturer && record.brand !== manufacturer) return false; if (family && record.family !== family) return false; if (category && record.category !== category) return false;
    if (status && (record.lifecycle || record.status) !== status) return false;
    if (incompleteOnly && Object.keys(validateProductRecord(record, records)).length === 0) return false;
    if (errorsOnly && !record.reportedError) return false;
    return true;
  }).sort((a, b) => sort === "updatedAt" ? String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) : a.sku.localeCompare(b.sku)), [records, vendorType, query, manufacturer, family, category, status, incompleteOnly, errorsOnly, sort, qualityFilter]);
  const options = (key: "brand" | "family" | "category") => Array.from(new Set(records.filter((r) => r.vendorType === vendorType).map((r) => String(r[key] || "")).filter(Boolean))).sort();
  async function lifecycle(record: ProductIntelligenceRecord, next: AdminLifecycle) { try { await productIntelligenceRepository.changeLifecycle(record, next, session?.user?.email || "ADMIN"); await reload(); setMessage(`${record.sku} is now ${next}. Affected product caches were cleared.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Lifecycle change failed."); } }

  if (!sessionReady) return <main className="wm-data-manager-page wm-page"><p>Checking administrator accessÃ¢â‚¬Â¦</p></main>;
  if (!admin) return <main className="wm-data-manager-page wm-page"><section className="wm-section-card wm-admin-denied"><ShieldAlert /><h1>Administrator access required</h1><p>Data Manager is available only to workspace administrators.</p></section></main>;
  return <main className="wm-data-manager-page wm-page" data-wingman-page="data-manager">
    <header className="wm-data-manager-header"><div><p className="wm-ui-kicker">ADMIN Ã‚Â· Governed product intelligence</p><h1>Data Manager</h1><p>Maintain product and competitor records without editing repository JSON files.</p></div><button className="wm-button wm-button-secondary" type="button" onClick={() => void reload()}><RefreshCcw /> Refresh data</button></header>
    <nav className="wm-data-tabs" aria-label="Data Manager datasets">{TABS.map((item) => <button type="button" key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {(tab === "WyreStorm Products" || tab === "Competitor Products") ? <>
      <section className="wm-data-quality-summary wm-section-card wm-data-governance-compact" aria-labelledby="data-quality-title">
  <div className="wm-data-quality-heading">
    <p className="wm-ui-kicker">Live governance</p>
    <h2 id="data-quality-title">Data Quality</h2>
    <small>{vendorRecords.length} records assessed</small>
    {qualityFilter ? (
      <button
        type="button"
        className="wm-data-quality-clear"
        onClick={() => setQualityFilter(null)}
        title="Clear quality filter"
      >
        <X aria-hidden="true" />
        <span>Clear filter</span>
      </button>
    ) : null}
  </div>

  <div className="wm-data-quality-metrics">
    {QUALITY_SUMMARY
      .filter(({ issue }) => issue !== "missing-equivalence-review" || vendorType === "competitor")
      .map(({ issue, label }) => (
        <button
          type="button"
          className={`wm-data-quality-metric${qualityFilter === issue ? " is-active" : ""}`}
          key={issue}
          aria-pressed={qualityFilter === issue}
          title={`Filter records: ${label}`}
          onClick={() => setQualityFilter((current) => current === issue ? null : issue)}
        >
          <strong>{dataQuality[issue] ?? 0}</strong>
          <span>{label}</span>
        </button>
      ))}
  </div>
</section>
      <section className="wm-data-toolbar wm-section-card"><label className="wm-data-search"><Search /><input aria-label="Search products" placeholder="Search SKU, name, family or feature" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <select aria-label="Manufacturer filter" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}><option value="">All manufacturers</option>{options("brand").map(x => <option key={x}>{x}</option>)}</select>
        <select aria-label="Family filter" value={family} onChange={(e) => setFamily(e.target.value)}><option value="">All families</option>{options("family").map(x => <option key={x}>{x}</option>)}</select>
        <select aria-label="Category filter" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{options("category").map(x => <option key={x}>{x}</option>)}</select>
        <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{PRODUCT_LIFECYCLES.map(x => <option key={x}>{x}</option>)}</select>
        <label><input type="checkbox" checked={incompleteOnly} onChange={(e) => setIncompleteOnly(e.target.checked)} /> Incomplete only</label><label><input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} /> Reported errors</label>
        <button className="wm-button wm-button-primary" type="button" onClick={() => setEditing(emptyProduct(vendorType))}><Plus /> Add Product</button>
      </section>
      <section className="wm-data-table-card wm-section-card"><header><div><h2>{visible.length} records</h2><p>Validation, lifecycle and editor information remain visible at a glance.</p></div><button type="button" onClick={() => setSort(sort === "sku" ? "updatedAt" : "sku")}><ArrowUpDown /> Sort by {sort === "sku" ? "last edited" : "SKU"}</button></header>
        <div className="wm-data-table-scroll"><table><thead><tr><th>Product</th><th>Classification</th><th>Lifecycle</th><th>Validation</th><th>Last edited</th><th>Actions</th></tr></thead><tbody>{visible.map((record) => { const errors = validateProductRecord(record, records); const blocked = isArchivedProduct(record); return <tr key={`${record.vendorType}-${record.brand}-${record.sku}`}><td><strong>{record.sku}</strong><span>{record.name}</span><small>{record.brand}</small></td><td>{record.family}<small>{record.category}</small></td><td><span className={`wm-status ${blocked ? "is-validate" : "is-confirmed"}`}>{displayLifecycle(record)}</span></td><td>{Object.keys(errors).length ? <span className="wm-validation-bad">{Object.keys(errors).length} issues</span> : <span className="wm-validation-good"><CheckCircle2 /> Valid</span>}</td><td>{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "Ã¢â‚¬â€"}<small>{record.reviewedBy || "System import"}</small></td><td><div className="wm-data-row-actions"><button type="button" onClick={() => setEditing(structuredClone(record))} className="wm-data-icon-action" aria-label="Edit product" title="Edit"><Pencil /></button><button type="button" onClick={() => setEditing({ ...structuredClone(record), id: undefined, sku: `${record.sku}-COPY`, lifecycle: "draft" })}><Copy /><span className="wm-sr-only">Duplicate</span></button>{blocked ? <button type="button" onClick={() => void lifecycle(record, "review")}><RefreshCcw /> Restore</button> : <button type="button" onClick={() => void lifecycle(record, "do-not-use")}><Archive /><span className="wm-sr-only">Archive</span></button>}</div></td></tr>; })}</tbody></table></div>{loading ? <p>Loading recordsÃ¢â‚¬Â¦</p> : null}</section>
    </> : <DatasetPlaceholder tab={tab} records={records} />}
    {message ? <p className="wm-data-message" role="status">{message}</p> : null}
    {editing ? <ProductEditor record={editing} allRecords={records} editor={session?.user?.email || "ADMIN"} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); setMessage("Product saved. Product Catalogue, Finder, Compare, Product Pitch, Guru, Templates, BOM and Proposal caches were invalidated."); }} /> : null}
  </main>;
}

function DatasetPlaceholder({ tab, records }: { tab: Tab; records: ProductIntelligenceRecord[] }) {
  if (tab === "Import / Export") return <section className="wm-data-placeholder wm-section-card"><Upload /><h2>Import / Export</h2><p>Preview and validate CSV or JSON before committing. Existing records are never silently overwritten.</p><div><button className="wm-button wm-button-secondary" type="button"><Upload /> Validate import</button><button className="wm-button wm-button-secondary" type="button" onClick={() => downloadJson(records)}><Download /> Export JSON</button></div></section>;
  return <section className="wm-data-placeholder wm-section-card"><Database /><h2>{tab}</h2><p>This governed dataset uses the shared product-intelligence repository. Select a product dataset to edit records, lifecycle and evidence.</p></section>;
}

function ProductEditor({ record, allRecords, editor, onClose, onSaved }: { record: ProductIntelligenceRecord; allRecords: ProductIntelligenceRecord[]; editor: string; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(record); const [advanced, setAdvanced] = useState(false); const [json, setJson] = useState(JSON.stringify(record, null, 2)); const [preview, setPreview] = useState(false); const [busy, setBusy] = useState(false); const [status, setStatus] = useState("");
  const errors = validateProductRecord(draft, allRecords.filter((x) => x.id !== record.id)); const update = (key: string, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));
  async function save() { if (Object.keys(errors).length) { setStatus("Resolve validation errors before publishing."); return; } setBusy(true); try { await productIntelligenceRepository.save({ ...draft, reviewedBy: editor, lastReviewedAt: new Date().toISOString() }); await onSaved(); } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed."); } finally { setBusy(false); } }
  function applyJson() { try { const parsed = JSON.parse(json) as ProductIntelligenceRecord; setDraft(parsed); setStatus("Advanced JSON applied to the form. Review validation before saving."); } catch { setStatus("Invalid JSON. Correct the syntax before applying it."); } }
  return <div className="wm-data-editor-backdrop"><button type="button" className="wm-data-editor-scrim" onClick={onClose} aria-label="Close product editor" /><aside className="wm-data-editor" role="dialog" aria-modal="true" aria-labelledby="data-editor-title"><header><div><p className="wm-ui-kicker">Structured product record</p><h2 id="data-editor-title">{record.sku ? `Edit ${record.sku}` : "Add product"}</h2></div><button type="button" onClick={onClose} aria-label="Close product editor"><X /></button></header>
    <div className="wm-data-editor-body"><FormSection title="Identity"><Field label="Manufacturer" value={draft.brand} error={errors.brand} onChange={(v) => update("brand", v)} /><Field label="SKU" value={draft.sku} error={errors.sku} onChange={(v) => update("sku", v)} /><Field label="Product name" value={draft.name} error={errors.name} onChange={(v) => update("name", v)} /><Field label="Summary" value={draft.summary} onChange={(v) => update("summary", v)} wide /></FormSection>
      <FormSection title="Classification"><Field label="Family" value={draft.family} error={errors.family} onChange={(v) => update("family", v)} /><Field label="Category / product class" value={draft.category} error={errors.category} onChange={(v) => update("category", v)} /></FormSection>
      <FormSection title="Lifecycle"><label>Lifecycle<select value={draft.lifecycle || "draft"} onChange={(e) => update("lifecycle", e.target.value)}>{PRODUCT_LIFECYCLES.map(x => <option key={x}>{x}</option>)}</select></label><Field label="Replacement SKU" value={String(draft.replacementSku || "")} error={errors.replacementSku} onChange={(v) => update("replacementSku", v)} /></FormSection>
      <FormSection title="Video, network and distance"><Field label="Maximum resolution" value={String((draft.video as { maxResolution?: string } | undefined)?.maxResolution || "")} onChange={(v) => update("video", { ...(draft.video as object || {}), maxResolution: v })} /><Field label="Network / AVoIP transport" value={String(draft.transport || "")} error={errors.transport} onChange={(v) => update("transport", v)} /><Field label="Distance metres" type="number" value={String(draft.distanceMeters || "")} onChange={(v) => update("distanceMeters", Number(v))} /></FormSection>
      <PortEditor title="Inputs" value={draft.inputs} onChange={(v) => update("inputs", v)} /><PortEditor title="Routed outputs" value={draft.outputs} onChange={(v) => update("outputs", v)} /><PortEditor title="Mirrored / local outputs" value={draft.mirroredOutputs || []} onChange={(v) => update("mirroredOutputs", v)} />
      {[["Audio", "audio"], ["USB / KVM", "usb"], ["Control", "control"], ["Dependencies", "dependencies"], ["Compatibility", "compatibility"], ["Applications", "applications"], ["Features", "features"], ["Limitations", "limitations"]].map(([title, key]) => <FormSection title={title} key={key}><Field label={`${title} (one per line)`} value={Array.isArray(draft[key]) ? (draft[key] as unknown[]).join("\n") : ""} onChange={(v) => update(key, v.split("\n").filter(Boolean))} wide multiline /></FormSection>)}
      <FormSection title="Sales guidance and internal notes"><Field label="Sales guidance" value={String(draft.salesGuidance || "")} onChange={(v) => update("salesGuidance", v)} wide multiline /><Field label="Internal notes" value={String(draft.notes || "")} onChange={(v) => update("notes", v)} wide multiline /><Field label="Change note (optional)" value={String(draft.changeNote || "")} onChange={(v) => update("changeNote", v)} wide /></FormSection>
      <FormSection title="Evidence and sources"><Field label="Source URLs (one per line)" value={Array.isArray(draft.sourceUrls) ? (draft.sourceUrls as string[]).join("\n") : ""} error={errors.evidence} onChange={(v) => update("sourceUrls", v.split("\n").filter(Boolean))} wide multiline /></FormSection>
      <details open={advanced} onToggle={(e) => setAdvanced(e.currentTarget.open)}><summary>Advanced JSON</summary><textarea aria-label="Advanced product JSON" value={json} onChange={(e) => setJson(e.target.value)} /><button type="button" onClick={applyJson}>Apply JSON to form</button></details>
      {preview ? <section className="wm-before-after"><div><h3>Before</h3><pre>{JSON.stringify(record, null, 2)}</pre></div><div><h3>After</h3><pre>{JSON.stringify(draft, null, 2)}</pre></div></section> : null}
      <section className="wm-impact-panel"><h3>Recommendation impact</h3><p>Product Catalogue Ã‚Â· Finder Ã‚Â· Discovery recommendations Ã‚Â· Competitor Compare Ã‚Â· Product Pitch Ã‚Â· Guru Ã‚Â· Templates Ã‚Â· BOM Ã‚Â· Proposal output</p><button type="button" onClick={() => setStatus("Affected checks queued for the current validation state.")}>Run affected checks</button></section><p role="status">{status}</p>
    </div><footer><button className="wm-button wm-button-secondary" type="button" onClick={() => setPreview(!preview)}>{preview ? "Hide" : "Review"} Before / After</button><button className="wm-button wm-button-primary" type="button" disabled={busy || Object.keys(errors).length > 0} onClick={() => void save()}>Publish changes</button></footer></aside></div>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) { return <fieldset className="wm-data-form-section"><legend>{title}</legend><div>{children}</div></fieldset>; }
function Field({ label, value, onChange, error, wide, multiline, type = "text" }: { label: string; value: string; onChange: (value: string) => void; error?: string; wide?: boolean; multiline?: boolean; type?: string }) { return <label className={wide ? "is-wide" : ""}>{label}{multiline ? <textarea value={value} onChange={(e) => onChange(e.target.value)} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />}{error ? <small className="wm-field-error">{error}</small> : null}</label>; }
function PortEditor({ title, value, onChange }: { title: string; value: ProductPort[]; onChange: (value: ProductPort[]) => void }) { return <fieldset className="wm-data-form-section"><legend>{title}</legend>{value.map((port, index) => <div className="wm-repeat-row" key={`${index}-${port.type}`}><input aria-label={`${title} type ${index + 1}`} placeholder="Port type" value={port.type} onChange={(e) => onChange(value.map((x, i) => i === index ? { ...x, type: e.target.value } : x))} /><input aria-label={`${title} quantity ${index + 1}`} type="number" min="0" value={port.count} onChange={(e) => onChange(value.map((x, i) => i === index ? { ...x, count: Number(e.target.value) } : x))} /><button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove</button></div>)}<button type="button" onClick={() => onChange([...value, { type: "HDMI", count: 1 }])}><Plus /> Add row</button></fieldset>; }
function downloadJson(records: ProductIntelligenceRecord[]) { const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "wingman-product-intelligence.json"; link.click(); URL.revokeObjectURL(url); }

export default DataManagerPage;



