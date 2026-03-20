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
    <div style={{ ...pageWrapStyle(), ...stackStyle(18) }}>
      <PageHeader
        eyebrow="REFERENCE"
        title="Product Intelligence"
        description="Work through the highest-risk records first, fill the core comparison fields, and only approve products when the data is strong enough to trust."
        actions={
          <button type="button" onClick={() => void loadRecords(true)} disabled={refreshing || loading} style={{ height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: "#f8fafc", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, cursor: "pointer" }}>
            <RefreshCw size={15} />
            Refresh queue
          </button>
        }
      />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {[["Needs Review", metrics.needsReview], ["Drafts", metrics.drafts], ["Approved", metrics.approved], ["High Priority", metrics.highPriority]].map(([label, value]) => (
          <div key={String(label)} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", padding: 14, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.84)" }}>{label}</div>
            <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 900, color: "#f8fafc" }}>{value}</div>
          </div>
        ))}
      </section>

      {error ? <section style={{ ...cardStyle(), borderColor: "rgba(239,68,68,0.22)", color: "#fecaca" }}>{error}</section> : null}
      {message ? <section style={{ ...cardStyle(), borderColor: messageTone === "good" ? "rgba(34,197,94,0.22)" : "rgba(245,158,11,0.22)", color: messageTone === "good" ? "#bbf7d0" : "#fde68a" }}>{message}</section> : null}

      <section style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <aside style={{ ...cardStyle(), display: "grid", gap: 14, position: "sticky", top: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={sectionTitleStyle()}>Review Queue</div>
            <div style={sectionTextStyle()}>Start with records missing I/O, taxonomy, video, distance, or output behavior.</div>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={fieldLabelStyle()}>Search</div>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: 13, color: "rgba(148,163,184,0.75)" }} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, brand, category" style={{ ...inputStyle(), paddingLeft: 36 }} />
            </div>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["review", "draft", "approved", "all"] as QueueFilter[]).map((item) => (
              <button key={item} type="button" onClick={() => setQueueFilter(item)} style={{ height: 34, padding: "0 12px", borderRadius: 999, border: queueFilter === item ? "1px solid rgba(96,165,250,0.42)" : "1px solid rgba(255,255,255,0.08)", background: queueFilter === item ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)", color: queueFilter === item ? "#dbeafe" : "#cbd5e1", fontWeight: 700, cursor: "pointer" }}>
                {item === "review" ? "Needs review" : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {([{ value: "all", label: "All vendors" }, { value: "competitor", label: "Competitors" }, { value: "wyrestorm", label: "WyreStorm" }] as const).map((item) => (
              <button key={item.value} type="button" onClick={() => setVendorFilter(item.value)} style={{ height: 34, padding: "0 12px", borderRadius: 999, border: vendorFilter === item.value ? "1px solid rgba(96,165,250,0.42)" : "1px solid rgba(255,255,255,0.08)", background: vendorFilter === item.value ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)", color: vendorFilter === item.value ? "#dbeafe" : "#cbd5e1", fontWeight: 700, cursor: "pointer" }}>{item.label}</button>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            {loading ? <div style={{ color: "rgba(226,232,240,0.76)" }}>Loading product intelligence records...</div> : queueRecords.length === 0 ? <div style={{ color: "rgba(226,232,240,0.76)" }}>No records match the current queue filter.</div> : queueRecords.map((record) => {
              const issues = recordIssues(record);
              return (
                <button key={record.id} type="button" onClick={() => setSelectedId(record.id)} style={{ textAlign: "left", borderRadius: 16, border: selectedId === record.id ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(255,255,255,0.08)", background: selectedId === record.id ? "linear-gradient(180deg, rgba(18,42,76,0.78), rgba(8,20,34,0.92))" : "linear-gradient(180deg, rgba(10,20,33,0.9), rgba(6,14,24,0.94))", padding: 14, display: "grid", gap: 10, cursor: "pointer" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "#5eead4" }}>{record.brand} · {record.sku}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, color: "#f8fafc" }}>{record.name}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.45, color: "rgba(226,232,240,0.74)" }}>{record.category} / {record.subcategory}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: record.status === "approved" ? "#bbf7d0" : "#bfdbfe", border: record.status === "approved" ? "1px solid rgba(34,197,94,0.22)" : "1px solid rgba(59,130,246,0.22)", background: record.status === "approved" ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)" }}>{record.status}</span>
                    {issues.slice(0, 4).map((issue) => <span key={`${record.id}-${issue}`} style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: "#fde68a", border: "1px solid rgba(245,158,11,0.22)", background: "rgba(245,158,11,0.12)" }}>{issue}</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        <main style={{ ...cardStyle(), display: "grid", gap: 16 }}>
          {!selected ? <div style={{ color: "rgba(226,232,240,0.76)" }}>Pick a record from the review queue to start enriching it.</div> : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "#5eead4" }}>{selected.brand} · {selected.vendorType}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1, color: "#f8fafc" }}>{selected.sku}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "rgba(226,232,240,0.94)" }}>{selected.name}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
                    {recordIssues(selected).map((issue) => <span key={issue} style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: "#fde68a", border: "1px solid rgba(245,158,11,0.22)", background: "rgba(245,158,11,0.12)" }}>{issue}</span>)}
                  </div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(226,232,240,0.72)" }}>Fill the core comparison fields below, then approve the record once it is strong enough for automated matching.</div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" onClick={() => void saveCoreFields()} disabled={saving} style={{ height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(96,165,250,0.32)", background: "rgba(59,130,246,0.16)", color: "#dbeafe", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}><Save size={15} />Save core fields</button>
                <button type="button" onClick={() => void setStatus("approved")} disabled={saving} style={{ height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.12)", color: "#bbf7d0", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}><CheckCircle2 size={15} />Mark approved</button>
                <button type="button" onClick={() => void setStatus("draft")} disabled={saving} style={{ height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#e2e8f0", fontWeight: 800, cursor: "pointer" }}>Keep as draft</button>
              </div>

              <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <Field label="Summary"><textarea rows={4} value={editor.summary} onChange={(event) => setField("summary", event.target.value)} style={textareaStyle(4)} /></Field>
                <Field label="Notes"><textarea rows={4} value={editor.notes} onChange={(event) => setField("notes", event.target.value)} style={textareaStyle(4)} /></Field>
                <Field label="Technology"><input value={editor.technology} onChange={(event) => setField("technology", event.target.value)} style={inputStyle()} /></Field>
                <Field label="Topology"><input value={editor.topology} onChange={(event) => setField("topology", event.target.value)} style={inputStyle()} /></Field>
                <Field label="Role"><input value={editor.role} onChange={(event) => setField("role", event.target.value)} style={inputStyle()} /></Field>
                <Field label="Directionality"><input value={editor.directionality} onChange={(event) => setField("directionality", event.target.value)} style={inputStyle()} /></Field>
                <Field label="Transport"><input value={editor.transport} onChange={(event) => setField("transport", event.target.value)} style={inputStyle()} /></Field>
                <Field label="Output Behavior"><input value={editor.outputBehavior} onChange={(event) => setField("outputBehavior", event.target.value)} style={inputStyle()} /></Field>
                <Field label="Inputs"><input value={editor.inputsText} onChange={(event) => setField("inputsText", event.target.value)} placeholder="HDMI:4, USB-C:1" style={inputStyle()} /></Field>
                <Field label="Outputs"><input value={editor.outputsText} onChange={(event) => setField("outputsText", event.target.value)} placeholder="HDMI:2, HDBaseT:2" style={inputStyle()} /></Field>
                <Field label="Features"><input value={editor.featuresText} onChange={(event) => setField("featuresText", event.target.value)} placeholder="wireless presentation, KVM, audio de-embed" style={inputStyle()} /></Field>
                <Field label="Control / Connectivity"><input value={editor.controlText} onChange={(event) => setField("controlText", event.target.value)} placeholder="RS-232, IR, LAN, relay" style={inputStyle()} /></Field>
                <Field label="Audio"><input value={editor.audioText} onChange={(event) => setField("audioText", event.target.value)} placeholder="analog audio out, de-embed" style={inputStyle()} /></Field>
                <Field label="Source URL"><input value={editor.sourceUrl} onChange={(event) => setField("sourceUrl", event.target.value)} placeholder="https://..." style={inputStyle()} /></Field>
              </section>

              <section style={{ display: "grid", gap: 12 }}>
                <div style={sectionTitleStyle()}>Video and Distance</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <Field label="Max Resolution"><input value={editor.maxResolution} onChange={(event) => setField("maxResolution", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="Bandwidth (Gbps)"><input value={editor.bandwidthGbps} onChange={(event) => setField("bandwidthGbps", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="HDMI Version"><input value={editor.hdmiVersion} onChange={(event) => setField("hdmiVersion", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="HDCP Version"><input value={editor.hdcpVersion} onChange={(event) => setField("hdcpVersion", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="4K Distance (m)"><input value={editor.meters4k} onChange={(event) => setField("meters4k", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="1080p Distance (m)"><input value={editor.meters1080p} onChange={(event) => setField("meters1080p", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="HDBaseT Class"><select value={editor.hdbasetClass} onChange={(event) => setField("hdbasetClass", event.target.value)} style={inputStyle()}><option value="">Not set</option><option value="Class A">Class A</option><option value="Class B">Class B</option></select></Field>
                  <Field label="Network Speed"><input value={editor.networkSpeed} onChange={(event) => setField("networkSpeed", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="Codec"><input value={editor.codec} onChange={(event) => setField("codec", event.target.value)} style={inputStyle()} /></Field>
                </div>
              </section>

              <section style={{ display: "grid", gap: 12 }}>
                <div style={sectionTitleStyle()}>Key Feature Toggles</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                  {([
                    ["airplay", "AirPlay"], ["miracast", "Miracast"], ["mst", "MST"], ["rs232", "RS-232"], ["ir", "IR"], ["lanControl", "LAN Control"],
                  ] as const).map(([key, label]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 42, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#e2e8f0", fontWeight: 700 }}>
                      <input type="checkbox" checked={editor[key]} onChange={(event) => setField(key, event.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <section style={{ ...cardStyle(), padding: 16, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={sectionTitleStyle()}>Evidence Capture</div>
                  <div style={sectionTextStyle()}>Add a short evidence note when you confirm a key spec from a product page or datasheet.</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: 10, alignItems: "end" }}>
                  <Field label="Evidence Label"><input value={editor.evidenceLabel} onChange={(event) => setField("evidenceLabel", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="Evidence Detail"><input value={editor.evidenceValue} onChange={(event) => setField("evidenceValue", event.target.value)} style={inputStyle()} /></Field>
                  <Field label="Evidence URL"><input value={editor.evidenceUrl} onChange={(event) => setField("evidenceUrl", event.target.value)} style={inputStyle()} /></Field>
                  <button type="button" onClick={() => void saveEvidence()} disabled={saving || !tidy(editor.evidenceLabel) || !tidy(editor.evidenceValue)} style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontWeight: 800, cursor: "pointer" }}>Add evidence</button>
                </div>
              </section>
            </>
          )}
        </main>
      </section>
    </div>
  );
}
