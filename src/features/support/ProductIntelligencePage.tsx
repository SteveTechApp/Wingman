import * as React from "react";
import { CheckCircle2, RefreshCw, Save, Search } from "lucide-react";

import {
  addProductIntelligenceEvidence,
  fetchProductIntelligenceRecords,
  updateProductIntelligenceStatus,
  upsertProductIntelligenceRecord,
  type ProductIntelligenceRecord,
} from "@/services/productIntelligenceService";
import {
  Field,
  PageHeader,
  cardStyle,
  fieldLabelStyle,
  inputStyle,
  pageWrapStyle,
  sectionTextStyle,
  sectionTitleStyle,
  stackStyle,
  textareaStyle,
} from "@/ui2/page/PageChrome";

type QueueFilter = "all" | "review" | "draft" | "approved";
type MessageTone = "good" | "warn";
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
  { value: "review", label: "Needs review" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
];

const VENDOR_FILTER_OPTIONS = [
  { value: "all", label: "All vendors" },
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
function needsDistance(record: ProductIntelligenceRecord): boolean {
  const blob = [record.transport, record.technology, record.topology, record.role, record.directionality, record.category, record.subcategory, record.summary, ...(record.features || [])].map((item) => tidy(item).toLowerCase()).join(" ");
  return /hdbaset|avoip|encoder|decoder|transmitter|receiver|extender/.test(blob);
}
function needsVideo(record: ProductIntelligenceRecord): boolean {
  if (isControllerRecord(record)) return false;
  return tidy(record.transport).toLowerCase() !== "usb extension";
}
function isControllerRecord(record: ProductIntelligenceRecord): boolean {
  return tidy(record.role).toLowerCase() === "controller" || tidy(record.topology).toLowerCase() === "controller" || tidy(record.category).toLowerCase() === "control";
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
  if (record.reviewFlags.some((flag) => flag.status === "open")) score += 5;
  if (record.vendorType === "competitor") score += 2;
  return score;
}
function buildEditor(record: ProductIntelligenceRecord | null): EditorState {
  return {
    summary: tidy(record?.summary),
    technology: tidy(record?.technology),
    topology: tidy(record?.topology),
    role: tidy(record?.role),
    directionality: tidy(record?.directionality),
    outputBehavior: tidy(record?.outputBehavior),
    transport: tidy(record?.transport),
    inputsText: formatPorts(record?.inputs),
    outputsText: formatPorts(record?.outputs),
    featuresText: formatList(record?.features),
    controlText: formatList(record?.control),
    audioText: formatList(record?.audio),
    maxResolution: tidy(record?.video?.maxResolution),
    bandwidthGbps: record?.video?.bandwidthGbps != null ? String(record.video.bandwidthGbps) : "",
    hdmiVersion: tidy(record?.video?.hdmiVersion || record?.video?.hdmi),
    hdcpVersion: tidy(record?.video?.hdcpVersion),
    meters4k: record?.distance?.meters4k != null ? String(record.distance.meters4k) : "",
    meters1080p: record?.distance?.meters1080p != null ? String(record.distance.meters1080p) : "",
    hdbasetClass: tidy(record?.distance?.hdbasetClass),
    networkSpeed: tidy(record?.distance?.networkSpeed),
    codec: tidy(record?.distance?.codec),
    sourceUrl: tidy(record?.sourceUrls?.[0]),
    notes: tidy(record?.notes),
    airplay: Boolean(record?.wireless?.airplay),
    miracast: Boolean(record?.wireless?.miracast),
    mst: Boolean(record?.wireless?.mst),
    rs232: Boolean(record?.integration?.rs232),
    ir: Boolean(record?.integration?.ir),
    lanControl: Boolean(record?.integration?.lanControl),
    evidenceLabel: "",
    evidenceValue: "",
    evidenceUrl: tidy(record?.sourceUrls?.[0]),
  };
}

function FieldShell(props: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={props.className}>
      <Field label={props.label}>{props.children}</Field>
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
  const [search, setSearch] = React.useState("");
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>("review");
  const [vendorFilter, setVendorFilter] = React.useState<"all" | "competitor" | "wyrestorm">("all");
  const [selectedId, setSelectedId] = React.useState("");
  const [editor, setEditor] = React.useState<EditorState>(() => buildEditor(null));

  const loadRecords = React.useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      setError("");
      const result = await fetchProductIntelligenceRecords({ limit: 500, includeArchived: false });
      const ordered = [...result.records].sort((left, right) => priority(right) - priority(left) || left.sku.localeCompare(right.sku));
      setRecords(ordered);
      setSelectedId((current) => current || ordered[0]?.id || "");
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
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !q || [record.sku, record.name, record.brand, record.category, record.subcategory, record.summary].some((item) => tidy(item).toLowerCase().includes(q));
      const matchesVendor = vendorFilter === "all" || record.vendorType === vendorFilter;
      const needsReview = recordIssues(record).length > 0 || record.status !== "approved" || record.reviewFlags.some((flag) => flag.status === "open");
      const matchesQueue = queueFilter === "all" || (queueFilter === "draft" && record.status === "draft") || (queueFilter === "approved" && record.status === "approved") || (queueFilter === "review" && needsReview);
      return matchesSearch && matchesVendor && matchesQueue;
    });
  }, [queueFilter, records, search, vendorFilter]);

  const selected = React.useMemo(() => queueRecords.find((record) => record.id === selectedId) ?? records.find((record) => record.id === selectedId) ?? null, [queueRecords, records, selectedId]);
  React.useEffect(() => { setEditor(buildEditor(selected)); }, [selected]);
  React.useEffect(() => { if (!selectedId && queueRecords[0]) setSelectedId(queueRecords[0].id); }, [queueRecords, selectedId]);

  const metrics = React.useMemo(() => ({
    needsReview: records.filter((record) => recordIssues(record).length > 0 || record.status !== "approved").length,
    drafts: records.filter((record) => record.status === "draft").length,
    approved: records.filter((record) => record.status === "approved").length,
    highPriority: records.filter((record) => priority(record) >= 20).length,
  }), [records]);

  function setField<K extends keyof EditorState>(key: K, value: EditorState[K]) { setEditor((current) => ({ ...current, [key]: value })); }

  async function saveCoreFields() {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await upsertProductIntelligenceRecord({
        vendorType: selected.vendorType,
        brand: selected.brand,
        sku: selected.sku,
        name: selected.name,
        family: selected.family,
        category: selected.category,
        subcategory: selected.subcategory,
        group: selected.group,
        summary: editor.summary,
        technology: editor.technology,
        topology: editor.topology,
        role: editor.role,
        directionality: editor.directionality,
        outputBehavior: editor.outputBehavior,
        transport: editor.transport,
        inputs: parsePorts(editor.inputsText),
        outputs: parsePorts(editor.outputsText),
        features: parseList(editor.featuresText),
        control: parseList(editor.controlText),
        audio: parseList(editor.audioText),
        video: {
          maxResolution: tidy(editor.maxResolution) || undefined,
          bandwidthGbps: toNumber(editor.bandwidthGbps),
          hdmiVersion: tidy(editor.hdmiVersion) || undefined,
          hdcpVersion: tidy(editor.hdcpVersion) || undefined,
        },
        distance: {
          meters4k: toNumber(editor.meters4k),
          meters1080p: toNumber(editor.meters1080p),
          hdbasetClass: editor.hdbasetClass === "Class A" || editor.hdbasetClass === "Class B" ? editor.hdbasetClass : undefined,
          networkSpeed: tidy(editor.networkSpeed) || undefined,
          codec: tidy(editor.codec) || undefined,
        },
        wireless: {
          airplay: editor.airplay || undefined,
          miracast: editor.miracast || undefined,
          mst: editor.mst || undefined,
        },
        integration: {
          rs232: editor.rs232 || undefined,
          ir: editor.ir || undefined,
          lanControl: editor.lanControl || undefined,
        },
        sourceUrls: editor.sourceUrl ? [editor.sourceUrl] : selected.sourceUrls,
        notes: editor.notes,
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
        vendorType: selected.vendorType,
        brand: selected.brand,
        sku: selected.sku,
        type: "spec",
        label: editor.evidenceLabel,
        value: editor.evidenceValue,
        sourceUrl: tidy(editor.evidenceUrl) || tidy(editor.sourceUrl) || undefined,
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
        vendorType: selected.vendorType,
        brand: selected.brand,
        sku: selected.sku,
        status,
        reviewedBy: "wingman-admin",
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

  return (
    <div
      className="wm-page wm-product-intelligence-page"
      style={{ ...pageWrapStyle(), ...stackStyle(18) }}
    >
      <PageHeader
        eyebrow="REFERENCE"
        title="Product Intelligence"
        description="Work through the highest-risk records first, fill the core comparison fields, and only approve products when the data is strong enough to trust."
        actions={
          <button
            className="wm-btn wm-product-intelligence-page__refresh"
            type="button"
            onClick={() => void loadRecords(true)}
            disabled={refreshing || loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} />
            Refresh queue
          </button>
        }
      />

      <section className="wm-product-intelligence-page__metrics">
        {[["Needs Review", metrics.needsReview], ["Drafts", metrics.drafts], ["Approved", metrics.approved], ["High Priority", metrics.highPriority]].map(([label, value]) => (
          <div key={String(label)} className="wm-product-intelligence-page__metric">
            <div className="wm-product-intelligence-page__metric-label">{label}</div>
            <div className="wm-product-intelligence-page__metric-value">{value}</div>
          </div>
        ))}
      </section>

      {error ? (
        <section
          className="wm-card wm-product-intelligence-page__notice wm-product-intelligence-page__notice--error"
          style={{ ...cardStyle(), color: "#fecaca" }}
        >
          {error}
        </section>
      ) : null}
      {message ? (
        <section
          className={`wm-card wm-product-intelligence-page__notice ${
            messageTone === "good"
              ? "wm-product-intelligence-page__notice--good"
              : "wm-product-intelligence-page__notice--warn"
          }`}
          style={{
            ...cardStyle(),
            color: messageTone === "good" ? "#bbf7d0" : "#fde68a",
          }}
        >
          {message}
        </section>
      ) : null}

      <section className="wm-product-intelligence-page__workspace">
        <aside
          className="wm-card wm-product-intelligence-page__queue"
          style={{ ...cardStyle(), display: "grid", gap: 14, position: "sticky", top: 16 }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={sectionTitleStyle()}>Review Queue</div>
            <div style={sectionTextStyle()}>Start with records missing I/O, taxonomy, video, distance, or output behavior.</div>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={fieldLabelStyle()}>Search</div>
            <div className="wm-product-intelligence-page__search" style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: 13, color: "rgba(148,163,184,0.75)" }} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, brand, category" style={{ ...inputStyle(), paddingLeft: 36 }} />
            </div>
          </label>
          <div className="wm-product-intelligence-page__filter-row">
            {QUEUE_FILTER_OPTIONS.map((item) => (
              <button
                key={item.value}
                className={`wm-product-intelligence-page__filter-chip${queueFilter === item.value ? " is-active" : ""}`}
                type="button"
                onClick={() => setQueueFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="wm-product-intelligence-page__filter-row">
            {VENDOR_FILTER_OPTIONS.map((item) => (
              <button
                key={item.value}
                className={`wm-product-intelligence-page__filter-chip${vendorFilter === item.value ? " is-active" : ""}`}
                type="button"
                onClick={() => setVendorFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="wm-product-intelligence-page__queue-list" style={{ display: "grid", gap: 10, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            {loading ? <div style={{ color: "rgba(226,232,240,0.76)" }}>Loading product intelligence records...</div> : queueRecords.length === 0 ? <div style={{ color: "rgba(226,232,240,0.76)" }}>No records match the current queue filter.</div> : queueRecords.map((record) => {
              const issues = recordIssues(record);
              return (
                <button
                  key={record.id}
                  className={`wm-product-intelligence-page__queue-item${selectedId === record.id ? " is-selected" : ""}`}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  style={{ textAlign: "left", borderRadius: 16, border: selectedId === record.id ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(255,255,255,0.08)", background: selectedId === record.id ? "linear-gradient(180deg, rgba(18,42,76,0.78), rgba(8,20,34,0.92))" : "linear-gradient(180deg, rgba(10,20,33,0.9), rgba(6,14,24,0.94))", padding: 14, display: "grid", gap: 10, cursor: "pointer" }}
                >
                  <div className="wm-product-intelligence-page__queue-item-meta">{record.brand} · {record.sku}</div>
                  <div className="wm-product-intelligence-page__queue-item-title">{record.name}</div>
                  <div className="wm-product-intelligence-page__queue-item-subtitle">{record.category} / {record.subcategory}</div>
                  <div className="wm-product-intelligence-page__queue-item-chips">
                    <span className={`wm-product-intelligence-page__status-chip ${record.status === "approved" ? "is-approved" : "is-draft"}`}>{record.status}</span>
                    {issues.slice(0, 4).map((issue) => <span key={`${record.id}-${issue}`} className="wm-product-intelligence-page__status-chip is-issue">{issue}</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        <main
          className="wm-card wm-product-intelligence-page__editor"
          style={{ ...cardStyle(), display: "grid", gap: 16 }}
        >
          {!selected ? <div className="wm-product-intelligence-page__empty">Pick a record from the review queue to start enriching it.</div> : (
            <>
              <div className="wm-product-intelligence-page__record-header">
                <div className="wm-product-intelligence-page__record-top">
                  <div className="wm-product-intelligence-page__record-copy">
                    <div className="wm-product-intelligence-page__queue-item-meta">{selected.brand} · {selected.vendorType}</div>
                    <div className="wm-product-intelligence-page__record-sku">{selected.sku}</div>
                    <div className="wm-product-intelligence-page__record-name">{selected.name}</div>
                  </div>
                  <div className="wm-product-intelligence-page__record-chips">
                    {recordIssues(selected).map((issue) => <span key={issue} className="wm-product-intelligence-page__status-chip is-issue">{issue}</span>)}
                  </div>
                </div>
                <div className="wm-product-intelligence-page__record-description">Fill the core comparison fields below, then approve the record once it is strong enough for automated matching.</div>
              </div>

              <div className="wm-product-intelligence-page__editor-actions">
                <button className="wm-btn wm-btn-primary wm-product-intelligence-page__save-btn" type="button" onClick={() => void saveCoreFields()} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Save size={15} />Save core fields</button>
                <button className="wm-btn wm-product-intelligence-page__approve-btn" type="button" onClick={() => void setStatus("approved")} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={15} />Mark approved</button>
                <button className="wm-btn" type="button" onClick={() => void setStatus("draft")} disabled={saving}>Keep as draft</button>
              </div>

              <section className="wm-product-intelligence-page__summary-grid">
                <FieldShell label="Summary" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><textarea rows={4} value={editor.summary} onChange={(event) => setField("summary", event.target.value)} style={textareaStyle(4)} /></FieldShell>
                <FieldShell label="Notes" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><textarea rows={4} value={editor.notes} onChange={(event) => setField("notes", event.target.value)} style={textareaStyle(4)} /></FieldShell>
              </section>

              <section className="wm-product-intelligence-page__taxonomy-grid">
                <FieldShell label="Technology" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.technology} onChange={(event) => setField("technology", event.target.value)} style={inputStyle()} /></FieldShell>
                <FieldShell label="Topology" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.topology} onChange={(event) => setField("topology", event.target.value)} style={inputStyle()} /></FieldShell>
                <FieldShell label="Role" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.role} onChange={(event) => setField("role", event.target.value)} style={inputStyle()} /></FieldShell>
                <FieldShell label="Directionality" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.directionality} onChange={(event) => setField("directionality", event.target.value)} style={inputStyle()} /></FieldShell>
                <FieldShell label="Transport" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.transport} onChange={(event) => setField("transport", event.target.value)} style={inputStyle()} /></FieldShell>
                <FieldShell label="Output Behavior" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.outputBehavior} onChange={(event) => setField("outputBehavior", event.target.value)} style={inputStyle()} /></FieldShell>
                <FieldShell label="Source URL" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.sourceUrl} onChange={(event) => setField("sourceUrl", event.target.value)} placeholder="https://..." style={inputStyle()} /></FieldShell>
              </section>

              <section className="wm-product-intelligence-page__detail-grid">
                <FieldShell label="Inputs" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.inputsText} onChange={(event) => setField("inputsText", event.target.value)} placeholder="HDMI:4, USB-C:1" style={inputStyle()} /></FieldShell>
                <FieldShell label="Outputs" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.outputsText} onChange={(event) => setField("outputsText", event.target.value)} placeholder="HDMI:2, HDBaseT:2" style={inputStyle()} /></FieldShell>
                <FieldShell label="Features" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.featuresText} onChange={(event) => setField("featuresText", event.target.value)} placeholder="wireless presentation, KVM, audio de-embed" style={inputStyle()} /></FieldShell>
                <FieldShell label="Control / Connectivity" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.controlText} onChange={(event) => setField("controlText", event.target.value)} placeholder="RS-232, IR, LAN, relay" style={inputStyle()} /></FieldShell>
                <FieldShell label="Audio" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.audioText} onChange={(event) => setField("audioText", event.target.value)} placeholder="analog audio out, de-embed" style={inputStyle()} /></FieldShell>
              </section>

              <section className="wm-product-intelligence-page__video-section">
                <div style={sectionTitleStyle()}>Video and Distance</div>
                <div className="wm-product-intelligence-page__video-grid">
                  <FieldShell label="Max Resolution" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.maxResolution} onChange={(event) => setField("maxResolution", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="Bandwidth (Gbps)" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.bandwidthGbps} onChange={(event) => setField("bandwidthGbps", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="HDMI Version" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.hdmiVersion} onChange={(event) => setField("hdmiVersion", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="HDCP Version" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.hdcpVersion} onChange={(event) => setField("hdcpVersion", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="4K Distance (m)" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.meters4k} onChange={(event) => setField("meters4k", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="1080p Distance (m)" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.meters1080p} onChange={(event) => setField("meters1080p", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="HDBaseT Class" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><select value={editor.hdbasetClass} onChange={(event) => setField("hdbasetClass", event.target.value)} style={inputStyle()}><option value="">Not set</option><option value="Class A">Class A</option><option value="Class B">Class B</option></select></FieldShell>
                  <FieldShell label="Network Speed" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.networkSpeed} onChange={(event) => setField("networkSpeed", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="Codec" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.codec} onChange={(event) => setField("codec", event.target.value)} style={inputStyle()} /></FieldShell>
                </div>
              </section>

              <section className="wm-product-intelligence-page__toggle-section">
                <div style={sectionTitleStyle()}>Key Feature Toggles</div>
                <div className="wm-product-intelligence-page__toggle-grid">
                  {FEATURE_TOGGLE_OPTIONS.map(([key, label]) => (
                    <label key={key} className="wm-product-intelligence-page__toggle" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 42, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#e2e8f0", fontWeight: 700 }}>
                      <input type="checkbox" checked={editor[key]} onChange={(event) => setField(key, event.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <section
                className="wm-card wm-product-intelligence-page__evidence"
                style={{ ...cardStyle(), padding: 16, display: "grid", gap: 12 }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={sectionTitleStyle()}>Evidence Capture</div>
                  <div style={sectionTextStyle()}>Add a short evidence note when you confirm a key spec from a product page or datasheet.</div>
                </div>
                <div className="wm-product-intelligence-page__evidence-grid">
                  <FieldShell label="Evidence Label" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--compact"><input value={editor.evidenceLabel} onChange={(event) => setField("evidenceLabel", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="Evidence Detail" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.evidenceValue} onChange={(event) => setField("evidenceValue", event.target.value)} style={inputStyle()} /></FieldShell>
                  <FieldShell label="Evidence URL" className="wm-product-intelligence-page__field wm-product-intelligence-page__field--wide"><input value={editor.evidenceUrl} onChange={(event) => setField("evidenceUrl", event.target.value)} style={inputStyle()} /></FieldShell>
                  <button className="wm-btn" type="button" onClick={() => void saveEvidence()} disabled={saving || !tidy(editor.evidenceLabel) || !tidy(editor.evidenceValue)}>Add evidence</button>
                </div>
              </section>
            </>
          )}
        </main>
      </section>
    </div>
  );
}
