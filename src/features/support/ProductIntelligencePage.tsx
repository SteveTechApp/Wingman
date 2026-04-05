import * as React from "react";
import { CheckCircle2, RefreshCw, Save, Search } from "lucide-react";
import { Link } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  addProductIntelligenceEvidence,
  fetchProductIntelligenceRecords,
  updateProductIntelligenceStatus,
  upsertProductIntelligenceRecord,
  type ProductIntelligenceRecord,
} from "@/services/productIntelligenceService";
import "./product-intelligence-page.css";

type QueueFilter = "all" | "review" | "draft" | "approved";
type MessageTone = "good" | "warn";
type EditorTab = "core" | "specs" | "review";
type EditorState = {
  summary: string;
  technology: string;
  topology: string;
  role: string;
  directionality: string;
  outputBehavior: string;
  transport: string;
  inputsText: string;
  outputsText: string;
  featuresText: string;
  controlText: string;
  audioText: string;
  maxResolution: string;
  bandwidthGbps: string;
  hdmiVersion: string;
  hdcpVersion: string;
  meters4k: string;
  meters1080p: string;
  hdbasetClass: string;
  networkSpeed: string;
  codec: string;
  sourceUrl: string;
  notes: string;
  airplay: boolean;
  miracast: boolean;
  mst: boolean;
  rs232: boolean;
  ir: boolean;
  lanControl: boolean;
  evidenceLabel: string;
  evidenceValue: string;
  evidenceUrl: string;
};

const QUEUE_FILTER_OPTIONS: Array<{ value: QueueFilter; label: string }> = [
  { value: "review", label: "Needs Review" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
];

const VENDOR_FILTER_OPTIONS = [
  { value: "all", label: "All Vendors" },
  { value: "competitor", label: "Competitors" },
  { value: "wyrestorm", label: "WyreStorm" },
] as const;

const FEATURE_TOGGLE_OPTIONS = [
  ["airplay", "AirPlay"],
  ["miracast", "Miracast"],
  ["mst", "MST"],
  ["rs232", "RS-232"],
  ["ir", "IR"],
  ["lanControl", "LAN Control"],
] as const;

const EDITOR_TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "core", label: "Core Fields" },
  { id: "specs", label: "Specs & Evidence" },
  { id: "review", label: "Review Context" },
];

function tidy(value: unknown): string { return String(value ?? "").trim(); }
function parseList(value: string): string[] { return value.split(/[\n,;]+/g).map((item) => tidy(item)).filter(Boolean); }
function formatList(values?: string[]): string { return Array.isArray(values) ? values.join(", ") : ""; }
function toNumber(value: string): number | undefined { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function formatPorts(ports?: Array<{ type: string; count: number }>): string {
  return Array.isArray(ports) ? ports.map((port) => `${port.type}:${Math.max(0, Number(port.count) || 0)}`).join(", ") : "";
}
function parsePorts(value: string): Array<{ type: string; count: number }> {
  return value.split(/[\n,;]+/g).map((raw) => tidy(raw)).filter(Boolean).map((entry) => {
    const match = entry.match(/^(.+?)\s*[:x]\s*(\d+)$/i) || entry.match(/^(.+?)\s+(\d+)$/);
    if (match) return { type: tidy(match[1]), count: Number(match[2]) || 0 };
    return { type: entry, count: 1 };
  }).filter((entry) => entry.type && entry.count > 0);
}
function isControllerRecord(record: ProductIntelligenceRecord): boolean {
  return tidy(record.role).toLowerCase() === "controller" || tidy(record.topology).toLowerCase() === "controller" || tidy(record.category).toLowerCase() === "control";
}
function needsDistance(record: ProductIntelligenceRecord): boolean {
  const blob = [record.transport, record.technology, record.topology, record.role, record.directionality, record.category, record.subcategory, record.summary, ...(record.features || [])].map((item) => tidy(item).toLowerCase()).join(" ");
  return /hdbaset|avoip|encoder|decoder|transmitter|receiver|extender/.test(blob);
}
function needsVideo(record: ProductIntelligenceRecord): boolean {
  if (isControllerRecord(record)) return false;
  return tidy(record.transport).toLowerCase() !== "usb extension";
}
function recordIssues(record: ProductIntelligenceRecord): string[] {
  const inputTotal = (record.inputs || []).reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const outputTotal = (record.outputs || []).reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const isController = isControllerRecord(record);
  const issues: string[] = [];
  if (!isController && (inputTotal === 0 || outputTotal === 0)) issues.push("I/O");
  if (!tidy(record.technology) || !tidy(record.topology) || !tidy(record.role)) issues.push("Taxonomy");
  if (needsVideo(record) && !tidy(record.video?.maxResolution) && !Number(record.video?.bandwidthGbps)) issues.push("Video");
  if (!isController && needsDistance(record) && !(record.distance?.meters || record.distance?.meters4k || record.distance?.meters1080p || tidy(record.distance?.hdbasetClass) || tidy(record.distance?.networkSpeed) || tidy(record.distance?.codec) || record.distanceMeters)) issues.push("Distance");
  if (!isController && outputTotal > 1 && !tidy(record.outputBehavior)) issues.push("Output");
  return issues;
}
function priority(record: ProductIntelligenceRecord): number {
  let score = recordIssues(record).length * 10;
  if (record.status === "draft") score += 8;
  if ((record.openReviewFlagCount ?? record.reviewFlags.filter((flag) => flag.status === "open").length) > 0) score += 5;
  if (record.vendorType === "competitor") score += 2;
  return score;
}
function evidenceCount(record: ProductIntelligenceRecord): number { return record.evidenceCount ?? record.evidence.length; }
function openFlagCount(record: ProductIntelligenceRecord): number { return record.openReviewFlagCount ?? record.reviewFlags.filter((flag) => flag.status === "open").length; }

function buildEditor(record: ProductIntelligenceRecord | null): EditorState {
  return {
    summary: tidy(record?.summary), technology: tidy(record?.technology), topology: tidy(record?.topology), role: tidy(record?.role),
    directionality: tidy(record?.directionality), outputBehavior: tidy(record?.outputBehavior), transport: tidy(record?.transport),
    inputsText: formatPorts(record?.inputs), outputsText: formatPorts(record?.outputs), featuresText: formatList(record?.features),
    controlText: formatList(record?.control), audioText: formatList(record?.audio), maxResolution: tidy(record?.video?.maxResolution),
    bandwidthGbps: record?.video?.bandwidthGbps != null ? String(record.video.bandwidthGbps) : "", hdmiVersion: tidy(record?.video?.hdmiVersion || record?.video?.hdmi),
    hdcpVersion: tidy(record?.video?.hdcpVersion), meters4k: record?.distance?.meters4k != null ? String(record.distance.meters4k) : "",
    meters1080p: record?.distance?.meters1080p != null ? String(record.distance.meters1080p) : "", hdbasetClass: tidy(record?.distance?.hdbasetClass),
    networkSpeed: tidy(record?.distance?.networkSpeed), codec: tidy(record?.distance?.codec), sourceUrl: tidy(record?.sourceUrls?.[0]), notes: tidy(record?.notes),
    airplay: Boolean(record?.wireless?.airplay), miracast: Boolean(record?.wireless?.miracast), mst: Boolean(record?.wireless?.mst),
    rs232: Boolean(record?.integration?.rs232), ir: Boolean(record?.integration?.ir), lanControl: Boolean(record?.integration?.lanControl),
    evidenceLabel: "", evidenceValue: "", evidenceUrl: tidy(record?.sourceUrls?.[0]),
  };
}

function formatDateTime(value?: string): string {
  if (!value) return "Not captured";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function issueHelp(issue: string): string {
  switch (issue) {
    case "I/O": return "Confirm input and output counts before this record is used in automated comparisons.";
    case "Taxonomy": return "Set technology, topology, and role so the matching engine can classify the product correctly.";
    case "Video": return "Capture at least one dependable video capability such as max resolution or bandwidth.";
    case "Distance": return "Add extension distance, codec, or network-speed detail so transport guidance stays trustworthy.";
    case "Output": return "Multi-output products need clear output behavior so mirror, matrix, and wall guidance stays accurate.";
    default: return "Capture the missing detail before approving this record.";
  }
}

function nextStepSummary(record: ProductIntelligenceRecord | null): string {
  if (!record) return "Choose a record from the review queue to begin editing.";
  const issues = recordIssues(record);
  if (issues.length === 0) return "Core fields look complete. Confirm the source evidence, then approve the record when you are comfortable with the data.";
  return `Focus on ${issues.join(", ")} next so this record is safe for guided compare and proposal work.`;
}

function statusChipClass(status: ProductIntelligenceRecord["status"] | "issue") {
  if (status === "approved") return "wm-product-intelligence-page__status-chip is-approved";
  if (status === "draft") return "wm-product-intelligence-page__status-chip is-draft";
  return "wm-product-intelligence-page__status-chip is-issue";
}

function FieldShell(props: { label: string; htmlFor: string; className?: string; hint?: string; children: React.ReactNode }) {
  const className = ["wm-workspace-field", props.className].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <label htmlFor={props.htmlFor} className="wm-workspace-label">{props.label}</label>
      {props.hint ? <div className="wm-workspace-card__copy">{props.hint}</div> : null}
      {props.children}
    </div>
  );
}

export default function ProductIntelligencePage() {
  const [records, setRecords] = React.useState<ProductIntelligenceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [messageTone, setMessageTone] = React.useState<MessageTone>("good");
  const [loadWarning, setLoadWarning] = React.useState("");
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>("review");
  const [vendorFilter, setVendorFilter] = React.useState<"all" | "competitor" | "wyrestorm">("all");
  const [selectedId, setSelectedId] = React.useState("");
  const [editorTab, setEditorTab] = React.useState<EditorTab>("core");
  const [editor, setEditor] = React.useState<EditorState>(() => buildEditor(null));

  const loadRecords = React.useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      setError("");
      setLoadWarning("");
      const result = await fetchProductIntelligenceRecords({ limit: 500, includeArchived: false }, { recordShape: "full" });
      const ordered = [...result.records].sort((left, right) => priority(right) - priority(left) || left.sku.localeCompare(right.sku));
      setRecords(ordered);
      setLoadWarning(result.warnings[0] || "");
      setSelectedId((current) => (ordered.some((record) => record.id === current) ? current : ordered[0]?.id || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load product intelligence records.");
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { void loadRecords(false); }, [loadRecords]);

  const queueRecords = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || [record.sku, record.name, record.brand, record.category, record.subcategory, record.summary].some((item) => tidy(item).toLowerCase().includes(query));
      const matchesVendor = vendorFilter === "all" || record.vendorType === vendorFilter;
      const needsReview = recordIssues(record).length > 0 || record.status !== "approved" || openFlagCount(record) > 0;
      const matchesQueue = queueFilter === "all" || (queueFilter === "draft" && record.status === "draft") || (queueFilter === "approved" && record.status === "approved") || (queueFilter === "review" && needsReview);
      return matchesSearch && matchesVendor && matchesQueue;
    });
  }, [deferredSearch, queueFilter, records, vendorFilter]);

  const selected = React.useMemo(() => queueRecords.find((record) => record.id === selectedId) ?? records.find((record) => record.id === selectedId) ?? null, [queueRecords, records, selectedId]);

  React.useEffect(() => { setEditor(buildEditor(selected)); }, [selected]);
  React.useEffect(() => {
    if (!queueRecords.length) return;
    if (queueRecords.some((record) => record.id === selectedId)) return;
    setSelectedId(queueRecords[0].id);
  }, [queueRecords, selectedId]);

  const metrics = React.useMemo(() => ({
    needsReview: records.filter((record) => recordIssues(record).length > 0 || record.status !== "approved" || openFlagCount(record) > 0).length,
    drafts: records.filter((record) => record.status === "draft").length,
    approved: records.filter((record) => record.status === "approved").length,
    highPriority: records.filter((record) => priority(record) >= 20).length,
  }), [records]);

  function setField<K extends keyof EditorState>(key: K, value: EditorState[K]) { setEditor((current) => ({ ...current, [key]: value })); }

  const selectedIssues = selected ? recordIssues(selected) : [];
  const tabPanelId = (tab: EditorTab) => `product-intelligence-panel-${tab}`;
  const tabId = (tab: EditorTab) => `product-intelligence-tab-${tab}`;

  async function saveCoreFields() {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await upsertProductIntelligenceRecord({
        vendorType: selected.vendorType, brand: selected.brand, sku: selected.sku, name: selected.name, family: selected.family,
        category: selected.category, subcategory: selected.subcategory, group: selected.group, summary: editor.summary,
        technology: editor.technology, topology: editor.topology, role: editor.role, directionality: editor.directionality,
        outputBehavior: editor.outputBehavior, transport: editor.transport, inputs: parsePorts(editor.inputsText),
        outputs: parsePorts(editor.outputsText), features: parseList(editor.featuresText), control: parseList(editor.controlText),
        audio: parseList(editor.audioText),
        video: { maxResolution: tidy(editor.maxResolution) || undefined, bandwidthGbps: toNumber(editor.bandwidthGbps), hdmiVersion: tidy(editor.hdmiVersion) || undefined, hdcpVersion: tidy(editor.hdcpVersion) || undefined },
        distance: { meters4k: toNumber(editor.meters4k), meters1080p: toNumber(editor.meters1080p), hdbasetClass: editor.hdbasetClass === "Class A" || editor.hdbasetClass === "Class B" ? editor.hdbasetClass : undefined, networkSpeed: tidy(editor.networkSpeed) || undefined, codec: tidy(editor.codec) || undefined },
        wireless: { airplay: editor.airplay || undefined, miracast: editor.miracast || undefined, mst: editor.mst || undefined },
        integration: { rs232: editor.rs232 || undefined, ir: editor.ir || undefined, lanControl: editor.lanControl || undefined },
        sourceUrls: editor.sourceUrl ? [editor.sourceUrl] : selected.sourceUrls, notes: editor.notes,
      });
      setMessage(result.message);
      setMessageTone(result.available ? "good" : "warn");
      await loadRecords(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
      setMessageTone("warn");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvidence() {
    if (!selected || !tidy(editor.evidenceLabel) || !tidy(editor.evidenceValue)) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await addProductIntelligenceEvidence({
        vendorType: selected.vendorType, brand: selected.brand, sku: selected.sku, type: "spec",
        label: editor.evidenceLabel, value: editor.evidenceValue, sourceUrl: tidy(editor.evidenceUrl) || tidy(editor.sourceUrl) || undefined,
      });
      setMessage(result.message);
      setMessageTone(result.available ? "good" : "warn");
      setEditor((current) => ({ ...current, evidenceLabel: "", evidenceValue: "" }));
      await loadRecords(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to add evidence.");
      setMessageTone("warn");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: "approved" | "draft") {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await updateProductIntelligenceStatus({
        vendorType: selected.vendorType, brand: selected.brand, sku: selected.sku, status, reviewedBy: "wingman-admin",
      });
      setMessage(result.message);
      setMessageTone(result.available ? "good" : "warn");
      await loadRecords(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update status.");
      setMessageTone("warn");
    } finally {
      setSaving(false);
    }
  }

  const statusText = error
    ? error
    : message
      ? message
      : loadWarning
        ? loadWarning
      : loading
        ? "Loading product intelligence records…"
        : queueRecords.length > 0
          ? `${queueRecords.length} records match the current queue filters.`
          : "No records match the current queue filters.";
  const statusClass = error ? "wm-product-intelligence-page__status-region is-error" : message ? `wm-product-intelligence-page__status-region ${messageTone === "good" ? "is-good" : "is-warn"}` : loadWarning ? "wm-product-intelligence-page__status-region is-warn" : "wm-product-intelligence-page__status-region";

  const left = (
    <div className="wm-product-intelligence-page__pane wm-workspace-stack">
      <div className="wm-start-step">Filter the review queue on the left, then keep the selected record editor and supporting detail on the right.</div>
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Review Queue</h3>
          <p className="wm-workspace-card__copy">Search by SKU, brand, or category, then work top-down through the riskiest records first.</p>
        </div>
        <FieldShell label="Search" htmlFor="product-intelligence-search">
          <div className="wm-product-intelligence-page__search">
            <Search size={15} aria-hidden="true" />
            <input id="product-intelligence-search" name="product_intelligence_search" className="wm-input-dark" type="search" autoComplete="off" placeholder="SKU, brand, or category…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </FieldShell>
        <div className="wm-product-intelligence-page__filter-group">
          <span className="wm-workspace-label">Queue</span>
          <div className="wm-product-intelligence-page__filter-row" role="group" aria-label="Queue filter">
            {QUEUE_FILTER_OPTIONS.map((item) => (
              <button key={item.value} type="button" className={`wm-product-intelligence-page__filter-chip${queueFilter === item.value ? " is-active" : ""}`} aria-pressed={queueFilter === item.value} onClick={() => setQueueFilter(item.value)}>{item.label}</button>
            ))}
          </div>
        </div>
        <div className="wm-product-intelligence-page__filter-group">
          <span className="wm-workspace-label">Vendor</span>
          <div className="wm-product-intelligence-page__filter-row" role="group" aria-label="Vendor filter">
            {VENDOR_FILTER_OPTIONS.map((item) => (
              <button key={item.value} type="button" className={`wm-product-intelligence-page__filter-chip${vendorFilter === item.value ? " is-active" : ""}`} aria-pressed={vendorFilter === item.value} onClick={() => setVendorFilter(item.value)}>{item.label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-2 wm-product-intelligence-page__metric-grid">
          <div className="wm-workspace-metric"><span>Needs Review</span><strong>{metrics.needsReview}</strong></div>
          <div className="wm-workspace-metric"><span>Drafts</span><strong>{metrics.drafts}</strong></div>
          <div className="wm-workspace-metric"><span>Approved</span><strong>{metrics.approved}</strong></div>
          <div className="wm-workspace-metric"><span>High Priority</span><strong>{metrics.highPriority}</strong></div>
        </div>
        <div className="wm-next-step">{nextStepSummary(selected)}</div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Filtered Records</h3>
          <p className="wm-workspace-card__copy">{queueRecords.length} visible of {records.length} total records in this workspace.</p>
        </div>
        <div className="wm-workspace-list wm-product-intelligence-page__queue-list">
          {loading ? <div className="wm-workspace-empty">Loading product intelligence records…</div> : queueRecords.length === 0 ? <div className="wm-workspace-empty">No records match the current queue filters.</div> : queueRecords.map((record) => {
            const issues = recordIssues(record);
            const active = selectedId === record.id;
            return (
              <button key={record.id} type="button" className={`wm-workspace-list-item wm-product-intelligence-page__queue-item${active ? " wm-workspace-list-item--active" : ""}`} aria-pressed={active} onClick={() => setSelectedId(record.id)}>
                <span className="wm-product-intelligence-page__queue-item-meta">{record.brand} | {record.sku}</span>
                <span className="wm-product-intelligence-page__queue-item-title">{record.name}</span>
                <span className="wm-product-intelligence-page__queue-item-subtitle">{record.category}{record.subcategory ? ` / ${record.subcategory}` : ""}</span>
                <span className="wm-product-intelligence-page__queue-item-chips">
                  <span className={statusChipClass(record.status)}>{record.status}</span>
                  {issues.slice(0, 3).map((issue) => <span key={`${record.id}-${issue}`} className={statusChipClass("issue")}>{issue}</span>)}
                  {openFlagCount(record) > 0 ? <span className={statusChipClass("issue")}>{openFlagCount(record)} open flags</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  const right = !selected ? (
    <div className="wm-workspace-stack"><div className="wm-workspace-empty">Pick a record from the review queue to begin editing.</div></div>
  ) : (
    <div className="wm-product-intelligence-page__pane wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <span className="wm-product-intelligence-page__queue-item-meta">{selected.brand} | {selected.vendorType}</span>
          <h3 className="wm-product-intelligence-page__record-title">{selected.sku} · {selected.name}</h3>
          <p className="wm-workspace-card__copy">{selected.summary || "Fill the core comparison fields below, then approve the record once the evidence is strong enough to trust."}</p>
        </div>
        <div className="wm-product-intelligence-page__queue-item-chips">
          <span className={statusChipClass(selected.status)}>{selected.status}</span>
          <span className="wm-workspace-tag">{selected.group}</span>
          <span className="wm-workspace-tag">{evidenceCount(selected)} evidence</span>
          {selectedIssues.map((issue) => <span key={issue} className={statusChipClass("issue")}>{issue}</span>)}
        </div>
        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-primary" onClick={() => { void saveCoreFields(); }} disabled={saving}><Save size={15} aria-hidden="true" />{saving ? "Saving…" : "Save Core Fields"}</button>
          <button type="button" className="wm-btn-secondary" onClick={() => { void setStatus("approved"); }} disabled={saving}><CheckCircle2 size={15} aria-hidden="true" />Mark Approved</button>
          <button type="button" className="wm-btn" onClick={() => { void setStatus("draft"); }} disabled={saving}>Keep as Draft</button>
          {selected.sourceUrls[0] ? <a className="wm-btn" href={selected.sourceUrls[0]} target="_blank" rel="noreferrer">Open Source</a> : null}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row" role="tablist" aria-label="Product intelligence editor sections">
          {EDITOR_TABS.map((tab) => (
            <button key={tab.id} id={tabId(tab.id)} type="button" role="tab" aria-selected={editorTab === tab.id} aria-controls={tabPanelId(tab.id)} className={`wm-workspace-tab${editorTab === tab.id ? " wm-workspace-tab--active" : ""}`} onClick={() => setEditorTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {editorTab === "core" ? (
          <div id={tabPanelId("core")} role="tabpanel" aria-labelledby={tabId("core")} className="wm-workspace-tabpanel">
            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Narrative & Taxonomy</h3>
                <p className="wm-workspace-card__copy">Capture the language that powers compare, Guru, and proposal guidance.</p>
              </div>
              <div className="wm-workspace-grid-2">
                <FieldShell label="Summary" htmlFor="pi-summary" className="wm-product-intelligence-page__field-span"><textarea id="pi-summary" name="product_intelligence_summary" className="wm-textarea-dark" rows={5} autoComplete="off" value={editor.summary} onChange={(event) => setField("summary", event.target.value)} /></FieldShell>
                <FieldShell label="Notes" htmlFor="pi-notes" className="wm-product-intelligence-page__field-span"><textarea id="pi-notes" name="product_intelligence_notes" className="wm-textarea-dark" rows={5} autoComplete="off" value={editor.notes} onChange={(event) => setField("notes", event.target.value)} /></FieldShell>
                <FieldShell label="Technology" htmlFor="pi-technology"><input id="pi-technology" name="product_intelligence_technology" className="wm-input-dark" autoComplete="off" value={editor.technology} onChange={(event) => setField("technology", event.target.value)} /></FieldShell>
                <FieldShell label="Topology" htmlFor="pi-topology"><input id="pi-topology" name="product_intelligence_topology" className="wm-input-dark" autoComplete="off" value={editor.topology} onChange={(event) => setField("topology", event.target.value)} /></FieldShell>
                <FieldShell label="Role" htmlFor="pi-role"><input id="pi-role" name="product_intelligence_role" className="wm-input-dark" autoComplete="off" value={editor.role} onChange={(event) => setField("role", event.target.value)} /></FieldShell>
                <FieldShell label="Directionality" htmlFor="pi-directionality"><input id="pi-directionality" name="product_intelligence_directionality" className="wm-input-dark" autoComplete="off" value={editor.directionality} onChange={(event) => setField("directionality", event.target.value)} /></FieldShell>
              </div>
            </section>

            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Positioning & I/O</h3>
                <p className="wm-workspace-card__copy">Keep the operational details here so matching and guidance stay consistent.</p>
              </div>
              <div className="wm-workspace-grid-2">
                <FieldShell label="Transport" htmlFor="pi-transport"><input id="pi-transport" name="product_intelligence_transport" className="wm-input-dark" autoComplete="off" value={editor.transport} onChange={(event) => setField("transport", event.target.value)} /></FieldShell>
                <FieldShell label="Output Behavior" htmlFor="pi-output-behavior"><input id="pi-output-behavior" name="product_intelligence_output_behavior" className="wm-input-dark" autoComplete="off" value={editor.outputBehavior} onChange={(event) => setField("outputBehavior", event.target.value)} /></FieldShell>
                <FieldShell label="Inputs" htmlFor="pi-inputs" hint="Example: HDMI:4, USB-C:1"><input id="pi-inputs" name="product_intelligence_inputs" className="wm-input-dark" autoComplete="off" placeholder="HDMI:4, USB-C:1…" value={editor.inputsText} onChange={(event) => setField("inputsText", event.target.value)} /></FieldShell>
                <FieldShell label="Outputs" htmlFor="pi-outputs" hint="Example: HDMI:2, HDBaseT:2"><input id="pi-outputs" name="product_intelligence_outputs" className="wm-input-dark" autoComplete="off" placeholder="HDMI:2, HDBaseT:2…" value={editor.outputsText} onChange={(event) => setField("outputsText", event.target.value)} /></FieldShell>
                <FieldShell label="Features" htmlFor="pi-features" hint="Example: wireless presentation, KVM, audio de-embed" className="wm-product-intelligence-page__field-span"><input id="pi-features" name="product_intelligence_features" className="wm-input-dark" autoComplete="off" placeholder="wireless presentation, KVM, audio de-embed…" value={editor.featuresText} onChange={(event) => setField("featuresText", event.target.value)} /></FieldShell>
                <FieldShell label="Control / Connectivity" htmlFor="pi-control" hint="Example: RS-232, IR, LAN, relay"><input id="pi-control" name="product_intelligence_control" className="wm-input-dark" autoComplete="off" placeholder="RS-232, IR, LAN, relay…" value={editor.controlText} onChange={(event) => setField("controlText", event.target.value)} /></FieldShell>
                <FieldShell label="Audio" htmlFor="pi-audio" hint="Example: analog audio out, de-embed"><input id="pi-audio" name="product_intelligence_audio" className="wm-input-dark" autoComplete="off" placeholder="analog audio out, de-embed…" value={editor.audioText} onChange={(event) => setField("audioText", event.target.value)} /></FieldShell>
                <FieldShell label="Source URL" htmlFor="pi-source-url" className="wm-product-intelligence-page__field-span"><input id="pi-source-url" name="product_intelligence_source_url" className="wm-input-dark" type="url" inputMode="url" autoComplete="off" placeholder="https://…" value={editor.sourceUrl} onChange={(event) => setField("sourceUrl", event.target.value)} /></FieldShell>
              </div>
            </section>
          </div>
        ) : null}
        {editorTab === "specs" ? (
          <div id={tabPanelId("specs")} role="tabpanel" aria-labelledby={tabId("specs")} className="wm-workspace-tabpanel">
            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Video & Distance</h3>
                <p className="wm-workspace-card__copy">These are the fields most likely to break compare accuracy when they are missing or vague.</p>
              </div>
              <div className="wm-workspace-grid-3 wm-product-intelligence-page__spec-grid">
                <FieldShell label="Max Resolution" htmlFor="pi-max-resolution"><input id="pi-max-resolution" name="product_intelligence_max_resolution" className="wm-input-dark" autoComplete="off" value={editor.maxResolution} onChange={(event) => setField("maxResolution", event.target.value)} /></FieldShell>
                <FieldShell label="Bandwidth (Gbps)" htmlFor="pi-bandwidth"><input id="pi-bandwidth" name="product_intelligence_bandwidth" className="wm-input-dark" type="number" inputMode="decimal" autoComplete="off" value={editor.bandwidthGbps} onChange={(event) => setField("bandwidthGbps", event.target.value)} /></FieldShell>
                <FieldShell label="HDMI Version" htmlFor="pi-hdmi-version"><input id="pi-hdmi-version" name="product_intelligence_hdmi_version" className="wm-input-dark" autoComplete="off" value={editor.hdmiVersion} onChange={(event) => setField("hdmiVersion", event.target.value)} /></FieldShell>
                <FieldShell label="HDCP Version" htmlFor="pi-hdcp-version"><input id="pi-hdcp-version" name="product_intelligence_hdcp_version" className="wm-input-dark" autoComplete="off" value={editor.hdcpVersion} onChange={(event) => setField("hdcpVersion", event.target.value)} /></FieldShell>
                <FieldShell label="4K Distance (m)" htmlFor="pi-distance-4k"><input id="pi-distance-4k" name="product_intelligence_distance_4k" className="wm-input-dark" type="number" inputMode="decimal" autoComplete="off" value={editor.meters4k} onChange={(event) => setField("meters4k", event.target.value)} /></FieldShell>
                <FieldShell label="1080p Distance (m)" htmlFor="pi-distance-1080p"><input id="pi-distance-1080p" name="product_intelligence_distance_1080p" className="wm-input-dark" type="number" inputMode="decimal" autoComplete="off" value={editor.meters1080p} onChange={(event) => setField("meters1080p", event.target.value)} /></FieldShell>
                <FieldShell label="HDBaseT Class" htmlFor="pi-hdbaset-class"><select id="pi-hdbaset-class" name="product_intelligence_hdbaset_class" className="wm-select-dark" value={editor.hdbasetClass} onChange={(event) => setField("hdbasetClass", event.target.value)}><option value="">Not set</option><option value="Class A">Class A</option><option value="Class B">Class B</option></select></FieldShell>
                <FieldShell label="Network Speed" htmlFor="pi-network-speed"><input id="pi-network-speed" name="product_intelligence_network_speed" className="wm-input-dark" autoComplete="off" value={editor.networkSpeed} onChange={(event) => setField("networkSpeed", event.target.value)} /></FieldShell>
                <FieldShell label="Codec" htmlFor="pi-codec"><input id="pi-codec" name="product_intelligence_codec" className="wm-input-dark" autoComplete="off" value={editor.codec} onChange={(event) => setField("codec", event.target.value)} /></FieldShell>
              </div>
            </section>

            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Key Feature Toggles</h3>
                <p className="wm-workspace-card__copy">Keep the high-signal yes/no capabilities visible here so review stays fast.</p>
              </div>
              <div className="wm-product-intelligence-page__toggle-grid">
                {FEATURE_TOGGLE_OPTIONS.map(([key, label]) => (
                  <label key={key} className="wm-product-intelligence-page__toggle"><input type="checkbox" checked={editor[key]} onChange={(event) => setField(key, event.target.checked)} /><span>{label}</span></label>
                ))}
              </div>
            </section>

            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Evidence Capture</h3>
                <p className="wm-workspace-card__copy">Add a short evidence note whenever you confirm a critical spec from a product page or datasheet.</p>
              </div>
              <div className="wm-workspace-grid-2">
                <FieldShell label="Evidence Label" htmlFor="pi-evidence-label"><input id="pi-evidence-label" name="product_intelligence_evidence_label" className="wm-input-dark" autoComplete="off" value={editor.evidenceLabel} onChange={(event) => setField("evidenceLabel", event.target.value)} /></FieldShell>
                <FieldShell label="Evidence Detail" htmlFor="pi-evidence-value"><input id="pi-evidence-value" name="product_intelligence_evidence_value" className="wm-input-dark" autoComplete="off" value={editor.evidenceValue} onChange={(event) => setField("evidenceValue", event.target.value)} /></FieldShell>
                <FieldShell label="Evidence URL" htmlFor="pi-evidence-url" className="wm-product-intelligence-page__field-span"><input id="pi-evidence-url" name="product_intelligence_evidence_url" className="wm-input-dark" type="url" inputMode="url" autoComplete="off" placeholder="https://…" value={editor.evidenceUrl} onChange={(event) => setField("evidenceUrl", event.target.value)} /></FieldShell>
              </div>
              <div className="wm-workspace-action-row"><button type="button" className="wm-btn-primary" onClick={() => { void saveEvidence(); }} disabled={saving || !tidy(editor.evidenceLabel) || !tidy(editor.evidenceValue)}>{saving ? "Saving…" : "Add Evidence"}</button></div>
            </section>

            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Captured Evidence</h3>
                <p className="wm-workspace-card__copy">Keep the supporting notes separate from the main editor so the core fields stay easy to scan.</p>
              </div>
              {selected.evidence.length === 0 ? <div className="wm-workspace-empty">No structured evidence has been saved for this record yet.</div> : <div className="wm-workspace-list wm-product-intelligence-page__evidence-list">{selected.evidence.slice(0, 8).map((entry) => <div key={entry.id} className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">{entry.type}</span><span className="wm-workspace-list-item__title">{entry.label}</span><span className="wm-workspace-list-item__copy">{entry.value}</span><span className="wm-product-intelligence-page__meta-note">{formatDateTime(entry.capturedAt)}{entry.sourceUrl ? ` | ${entry.sourceUrl}` : ""}</span></div>)}</div>}
            </section>
          </div>
        ) : null}

        {editorTab === "review" ? (
          <div id={tabPanelId("review")} role="tabpanel" aria-labelledby={tabId("review")} className="wm-workspace-tabpanel">
            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Review Blockers</h3>
                <p className="wm-workspace-card__copy">These are the gaps to close before the record should drive compare or proposal outcomes.</p>
              </div>
              {selectedIssues.length === 0 ? <div className="wm-workspace-empty">Core blockers are clear. Review the evidence and source links, then approve when ready.</div> : <div className="wm-workspace-list wm-product-intelligence-page__issue-list">{selectedIssues.map((issue) => <div key={issue} className="wm-workspace-list-item"><span className="wm-workspace-list-item__title">{issue}</span><span className="wm-workspace-list-item__copy">{issueHelp(issue)}</span></div>)}</div>}
            </section>

            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Record Context</h3>
                <p className="wm-workspace-card__copy">Status, freshness, and review metadata stay here instead of crowding the main form.</p>
              </div>
              <div className="wm-product-intelligence-page__meta-grid">
                <div className="wm-workspace-metric"><span>Status</span><strong>{selected.status}</strong></div>
                <div className="wm-workspace-metric"><span>Vendor Type</span><strong>{selected.vendorType}</strong></div>
                <div className="wm-workspace-metric"><span>Confidence</span><strong>{Math.round(selected.confidence * 100)}%</strong></div>
                <div className="wm-workspace-metric"><span>Last Captured</span><strong>{formatDateTime(selected.lastCapturedAt)}</strong></div>
                <div className="wm-workspace-metric"><span>Family</span><strong>{selected.family}</strong></div>
                <div className="wm-workspace-metric"><span>Open Flags</span><strong>{openFlagCount(selected)}</strong></div>
              </div>
            </section>

            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Sources & Review Flags</h3>
                <p className="wm-workspace-card__copy">Supporting links and review flags stay separated here so the editing flow remains clean.</p>
              </div>
              {selected.sourceUrls.length > 0 ? <div className="wm-workspace-list">{selected.sourceUrls.map((sourceUrl) => <a key={sourceUrl} className="wm-workspace-list-item" href={sourceUrl} target="_blank" rel="noreferrer"><span className="wm-workspace-list-item__title">Source URL</span><span className="wm-workspace-list-item__copy">{sourceUrl}</span></a>)}</div> : <div className="wm-workspace-empty">No source URLs have been saved yet.</div>}
              {selected.reviewFlags.length > 0 ? <div className="wm-workspace-list">{selected.reviewFlags.map((flag) => <div key={flag.id} className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">{flag.kind} | {flag.status}</span><span className="wm-workspace-list-item__title">{flag.message}</span><span className="wm-workspace-list-item__copy">{flag.note || "No additional note recorded."}</span></div>)}</div> : <div className="wm-workspace-empty">No open review flags are attached to this record.</div>}
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Product Intelligence"
      subtitle="Keep queue management on the left, then edit core fields, evidence, and review context in separate right-side tabs."
      leftTitle="Queue"
      rightTitle="Editor"
      left={left}
      right={right}
      top={<div className="wm-workspace-action-row"><button type="button" className="wm-btn-secondary" onClick={() => { void loadRecords(true); }} disabled={loading || refreshing}><RefreshCw size={15} aria-hidden="true" />{refreshing ? "Refreshing…" : "Refresh Queue"}</button><Link to="/app/tools/competitor-lookup-diagnostics" className="wm-btn">Lookup Diagnostics</Link><Link to={WM_ROUTES.tools} className="wm-btn">Tool Hub</Link></div>}
      bottom={<div className={statusClass} role="status" aria-live="polite">{statusText}</div>}
    />
  );
}

