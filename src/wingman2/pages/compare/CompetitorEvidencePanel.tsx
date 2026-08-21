import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runCompetitorLookup, submitLiveResearchReview, WingmanApiError, type CompetitorLookupResponse, type CompetitorMatchResponse } from "../../api/wingmanApi";
import { inferSpecFormFieldsFromText } from "../../lib/competitorSpecRegistry";
import { findSavedCompetitorSpec, saveCompetitorSpec, type SavedCompetitorSpec } from "../../lib/savedCompetitorSpecs";

export const SAVED_SPEC_DOMAIN_OPTIONS: Array<{ value: SavedCompetitorSpec["domain"]; label: string }> = [
  { value: "UNKNOWN", label: "Not sure yet" },
  { value: "AVOIP", label: "AV-over-IP" },
  { value: "HDBASET", label: "HDBaseT" },
  { value: "PRESENTATION", label: "Presentation switcher" },
  { value: "MATRIX", label: "Matrix switcher" },
  { value: "VIDEO_WALL", label: "Video wall processor" },
  { value: "MULTIVIEW", label: "Multiview processor" },
  { value: "USB_EXTENSION", label: "USB extension" },
  { value: "CONTROL", label: "Control" },
  { value: "WIRELESS_COLLAB", label: "Wireless collaboration" },
];

export const SAVED_SPEC_ROLE_OPTIONS: Array<SavedCompetitorSpec["role"]> = [
  "Unknown", "Transceiver", "Encoder", "Decoder", "Presentation Switcher", "Matrix",
  "Video Wall Processor", "Multiview Processor", "Extender", "USB Extender", "Controller", "Wireless Collaboration",
];

type SavedSpecFormState = {
  title: string;
  domain: SavedCompetitorSpec["domain"];
  role: SavedCompetitorSpec["role"];
  transport: string;
  maxResolution: string;
  chroma: string;
  inputCount: string;
  outputCount: string;
  notes: string;
  sourceUrl: string;
};

function emptySavedSpecForm(): SavedSpecFormState {
  return { title: "", domain: "UNKNOWN", role: "Unknown", transport: "", maxResolution: "", chroma: "", inputCount: "", outputCount: "", notes: "", sourceUrl: "" };
}

function savedSpecToForm(spec: SavedCompetitorSpec): SavedSpecFormState {
  return {
    title: spec.title,
    domain: spec.domain,
    role: spec.role,
    transport: spec.transport,
    maxResolution: spec.maxResolution,
    chroma: spec.chroma,
    inputCount: spec.inputCount != null ? String(spec.inputCount) : "",
    outputCount: spec.outputCount != null ? String(spec.outputCount) : "",
    notes: spec.notes,
    sourceUrl: spec.sourceUrl || "",
  };
}

function liveResearchNotes(result: CompetitorMatchResponse): string {
  const product = result.competitor_product;
  if (!product) return "";
  const ioGroups = [
    ...(product.ioProfile?.videoInputs ?? []),
    ...(product.ioProfile?.videoOutputs ?? []),
    ...(product.ioProfile?.usb ?? []),
    ...(product.ioProfile?.audio ?? []),
    ...(product.ioProfile?.networkControl ?? []),
  ].map((group) => group.label || [group.count, group.type].filter(Boolean).join("x ")).filter(Boolean);
  const features = Object.entries(product.features ?? {}).filter(([, enabled]) => enabled).map(([name]) => name);
  return Array.from(new Set([
    product.summary,
    product.hdbtGeneration ? `HDBaseT ${product.hdbtGeneration}` : "",
    product.video?.bandwidth ? `Video bandwidth ${product.video.bandwidth}` : "",
    ...ioGroups,
    ...features,
  ].filter(Boolean))).join(". ");
}

const DOCUMENT_ACCEPT = ".pdf,.docx,.txt";

/**
 * Shared "we don't have good local data for this competitor product" panel,
 * mounted from two places in Compare: expanded in the true no-match empty
 * state, and collapsed under "Source validation" when local data resolved
 * but is thin. Three rep-controlled ways to add evidence - fetch the
 * manufacturer's page, upload a PDF/text spec sheet, or attach a screenshot
 * for reference - all funnel into the same manual-review form. Nothing here
 * feeds match scoring directly; only an explicit "Save for next time" click
 * does, same as before this panel grew upload support.
 */
export function CompetitorEvidencePanel({ brand, sku, onSaved, autoRun = false, primaryCriteria = [], liveResearchResult = null }: { brand: string; sku: string; onSaved: () => void; autoRun?: boolean; primaryCriteria?: string[]; liveResearchResult?: CompetitorMatchResponse | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<CompetitorLookupResponse | null>(null);
  const [error, setError] = useState<{ message: string; needsSignIn: boolean } | null>(null);
  const [form, setForm] = useState<SavedSpecFormState>(emptySavedSpecForm);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [documentState, setDocumentState] = useState<{ status: "idle" | "reading" | "done" | "error"; fileName?: string; warnings: string[] }>({ status: "idle", warnings: [] });
  const [imagePreview, setImagePreview] = useState<{ fileName: string; objectUrl: string } | null>(null);

  const existingSaved = useMemo(() => findSavedCompetitorSpec(brand, sku), [brand, sku]);

  useEffect(() => {
    setForm(existingSaved ? savedSpecToForm(existingSaved) : emptySavedSpecForm());
    setResult(null);
    setError(null);
    setStatus("idle");
    setSavedAt(null);
    setSubmissionState("idle");
    setDocumentState({ status: "idle", warnings: [] });
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current.objectUrl);
      return null;
    });
  }, [brand, sku, existingSaved]);

  useEffect(() => {
    const researched = liveResearchResult?.competitor_product;
    if (!liveResearchResult?.ok || liveResearchResult.competitor_lookup_mode !== "live" || !researched) return;

    const domain = SAVED_SPEC_DOMAIN_OPTIONS.some((option) => option.value === researched.comparisonDomain)
      ? researched.comparisonDomain as SavedCompetitorSpec["domain"]
      : "UNKNOWN";
    const role = SAVED_SPEC_ROLE_OPTIONS.includes(researched.role as SavedCompetitorSpec["role"])
      ? researched.role as SavedCompetitorSpec["role"]
      : "Unknown";
    const inputCount = researched.ioProfile?.headline?.inputs;
    const outputCount = researched.ioProfile?.headline?.outputs;

    setStatus("done");
    setForm((current) => ({
      ...current,
      title: researched.title || current.title || sku,
      domain: domain !== "UNKNOWN" ? domain : current.domain,
      role: role !== "Unknown" ? role : current.role,
      transport: researched.transport || current.transport,
      maxResolution: researched.video?.maxResolution || current.maxResolution,
      chroma: researched.video?.chroma || current.chroma,
      inputCount: Number.isFinite(inputCount) ? String(inputCount) : current.inputCount,
      outputCount: Number.isFinite(outputCount) ? String(outputCount) : current.outputCount,
      notes: liveResearchNotes(liveResearchResult) || current.notes,
      sourceUrl: researched.resolvedUrl || liveResearchResult.resolved_competitor_url || researched.sourceUrls?.[0] || current.sourceUrl,
    }));
  }, [liveResearchResult, sku]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview.objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runLookup = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await runCompetitorLookup({ brand, sku });
      setResult(response);
      setStatus("done");

      if (response.ok && response.record) {
        setForm((current) => ({
          ...current,
          title: current.title || response.record?.name || sku,
          notes: current.notes || response.record?.summary || response.record?.description || "",
          sourceUrl: current.sourceUrl || response.record?.sourceUrl || "",
        }));
      }
    } catch (lookupError) {
      const needsSignIn = lookupError instanceof WingmanApiError && lookupError.status === 401;
      setError({
        needsSignIn,
        message: needsSignIn
          ? "Fetching the manufacturer's page needs a signed-in Wingman workspace (Settings > Workspace sync). You can still enter the product details manually below."
          : lookupError instanceof WingmanApiError
            ? lookupError.message
            : "Live lookup failed. Confirm the product on the manufacturer's site directly.",
      });
      setStatus("error");
    }
  }, [brand, sku]);

  // When the panel is mounted for a no-match result, automatically kick off the
  // live lookup so "no match found" immediately becomes "here is what we could
  // fetch about this product" - the rep no longer has to find and press the
  // button. Guarded to fire once per brand+sku, and skipped when we already
  // have a saved spec for this SKU (that saved data is what should be used).
  const autoRunKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoRun || !brand.trim() || !sku.trim() || existingSaved) return;
    const key = `${brand}:::${sku}`;
    if (autoRunKeyRef.current === key) return;
    autoRunKeyRef.current = key;
    void runLookup();
  }, [autoRun, brand, sku, existingSaved, runLookup]);

  async function handleDocumentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setDocumentState({ status: "reading", fileName: file.name, warnings: [] });
    const { extractDocumentText } = await import("../../lib/documentExtract");
    const extracted = await extractDocumentText(file);

    if (!extracted.text.trim()) {
      setDocumentState({ status: extracted.warnings.length ? "error" : "done", fileName: file.name, warnings: extracted.warnings });
      return;
    }

    const inferred = inferSpecFormFieldsFromText(extracted.text);
    setForm((current) => ({
      ...current,
      maxResolution: current.maxResolution || inferred.maxResolution || current.maxResolution,
      chroma: current.chroma || inferred.chroma || current.chroma,
      inputCount: current.inputCount || (inferred.inputCount != null ? String(inferred.inputCount) : current.inputCount),
      outputCount: current.outputCount || (inferred.outputCount != null ? String(inferred.outputCount) : current.outputCount),
      notes: current.notes || (inferred.notesExcerpt ? `From ${file.name}: ${inferred.notesExcerpt}` : current.notes),
    }));
    setDocumentState({ status: "done", fileName: file.name, warnings: extracted.warnings });
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current.objectUrl);
      return { fileName: file.name, objectUrl: URL.createObjectURL(file) };
    });
  }

  function updateForm<K extends keyof SavedSpecFormState>(field: K, value: SavedSpecFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveForm() {
    saveCompetitorSpec({
      manufacturer: brand,
      sku,
      title: form.title,
      domain: form.domain,
      role: form.role,
      transport: form.transport,
      maxResolution: form.maxResolution,
      chroma: form.chroma,
      inputCount: form.inputCount.trim() ? Number(form.inputCount) : undefined,
      outputCount: form.outputCount.trim() ? Number(form.outputCount) : undefined,
      notes: form.notes,
      sourceUrl: form.sourceUrl,
      features: liveResearchResult?.competitor_product?.features as Record<string, boolean> | undefined,
      savedFrom: result?.ok || liveResearchResult?.competitor_lookup_mode === "live" ? "live-lookup" : "manual",
    });
    setSavedAt(new Date().toLocaleTimeString());
    onSaved();

    if (liveResearchResult?.ok && liveResearchResult.competitor_lookup_mode === "live") {
      setSubmissionState("submitting");
      try {
        await submitLiveResearchReview(liveResearchResult);
        setSubmissionState("submitted");
      } catch {
        setSubmissionState("error");
      }
    }
  }

  if (!sku.trim()) return null;

  const canSave = form.title.trim().length > 0 || form.domain !== "UNKNOWN";

  return (
    <section className="compare-native-card wm-compare-live-lookup wm-ui-section wm-ui-card" data-lookup-status={status}>
      <div className="wm-compare-live-lookup__status" role="status">
        <span className="wm-compare-live-lookup__pulse" aria-hidden="true" />
        <div>
          <strong>{status === "loading" ? "Live lookup in progress" : status === "done" ? "Live lookup complete" : status === "error" ? "Live lookup needs attention" : "Live lookup ready"}</strong>
          <span>{status === "loading" ? `Searching approved manufacturer sources for ${brand} ${sku}` : `Lookup target: ${brand} ${sku}`}</span>
        </div>
      </div>

      {primaryCriteria.length ? (
        <div className="wm-compare-lookup-criteria" aria-label="Primary search criteria">
          <strong>Primary search criteria</strong>
          <div>{primaryCriteria.map((criterion) => <span key={criterion}>{criterion}</span>)}</div>
        </div>
      ) : null}

      <h3 className="wm-ui-title">Add evidence for this product</h3>
      {liveResearchResult?.competitor_lookup_mode === "live" ? (
        <div className="wm-ui-card wm-compare-live-lookup__confirmation">
          <strong>Review before keeping these researched facts</strong>
          <p className="wm-ui-copy">Nothing is added to your local product data until you confirm it below. Confirmation also sends the cited research package to Wingman admin for formal review; it does not change the core database automatically.</p>
        </div>
      ) : null}
      <p className="wm-ui-copy">
        Wingman has limited local data for this competitor product. Fetch the manufacturer's own product page, upload a PDF spec sheet, or attach a screenshot for reference - then confirm the details below and save them. Saved details are reused automatically the next time this SKU comes up in Compare.
      </p>

      <div className="compare-native-action-row wm-ui-card">
        <button
          type="button"
          className="compare-native-secondary-action wm-ui-button wm-ui-button-primary"
          onClick={() => { void runLookup(); }}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Looking up..." : "Run live lookup"}
        </button>

        <label className="compare-native-secondary-action wm-ui-button wm-ui-button-primary">
          {documentState.status === "reading" ? "Reading..." : "Upload PDF / spec sheet"}
          <input type="file" accept={DOCUMENT_ACCEPT} style={{ display: "none" }} onChange={(event) => { void handleDocumentChange(event); }} disabled={documentState.status === "reading"} />
        </label>

        <label className="compare-native-secondary-action wm-ui-button wm-ui-button-primary">
          Attach screenshot
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
        </label>
      </div>

      {error ? (
        <div className="wm-ui-card" role="alert">
          <p className="wm-ui-copy"><strong>Live lookup could not run</strong></p>
          <p className="wm-ui-copy">{error.message}</p>
          {error.needsSignIn ? (
            <a className="compare-native-secondary-action wm-ui-button wm-ui-button-primary" href="/wingman/settings">
              Open Workspace settings
            </a>
          ) : (
            <button className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" type="button" onClick={() => { void runLookup(); }}>
              Try live lookup again
            </button>
          )}
        </div>
      ) : null}
      {status === "done" && result ? (
        result.ok && result.record ? (
          <div className="wm-ui-card">
            <p className="wm-ui-copy"><strong>{result.record.name || sku}</strong></p>
            {result.record.summary ? <p className="wm-ui-copy">{result.record.summary}</p> : null}
            {result.record.sourceUrl ? (
              <a className="compare-native-secondary-action" href={result.record.sourceUrl} target="_blank" rel="noreferrer">
                View manufacturer source
              </a>
            ) : null}
            {result.warnings?.length ? (
              <ul className="compare-native-bullet-list wm-ui-card">
                {result.warnings.slice(0, 3).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="wm-compare-lookup-explanation">
            <strong>No manufacturer product record was resolved</strong>
            <p className="compare-native-muted wm-ui-copy">
              Wingman searched for {brand} {sku}{primaryCriteria.length ? ` using ${primaryCriteria.join(", ")}` : ""}, but did not find enough reliable product evidence to classify it and recommend an equivalent safely. The SKU may be incomplete, discontinued, region-specific, blocked from automated access, or absent from approved manufacturer sources.
            </p>
          </div>
        )
      ) : null}

      {documentState.status !== "idle" ? (
        <div className="wm-ui-card">
          <p className="compare-native-muted wm-ui-copy">
            {documentState.status === "reading" ? `Reading ${documentState.fileName}...` : `Scanned ${documentState.fileName}.`}
            {documentState.status === "done" && !documentState.warnings.length ? " Matched fields below were pre-filled - check them against the source before saving." : ""}
          </p>
          {documentState.warnings.length ? (
            <ul className="compare-native-bullet-list wm-ui-card">
              {documentState.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {imagePreview ? (
        <div className="wm-ui-card">
          <p className="compare-native-muted wm-ui-copy">
            Attached {imagePreview.fileName} for your own reference - Wingman doesn't read spec data out of images yet, so key in what you see below.
          </p>
          <img src={imagePreview.objectUrl} alt={`Uploaded reference: ${imagePreview.fileName}`} style={{ maxWidth: "240px", maxHeight: "240px", borderRadius: "8px" }} />
        </div>
      ) : null}

      <div className="wm-ui-card">
        <p className="wm-ui-copy">
          <strong>{existingSaved ? "Update saved product data" : "Add product data"}</strong> - only fill in what you actually know; leave the rest blank.
        </p>
        <div className="wm-form-grid">
          <label className="wm-field">
            Product name
            <input className="wm-input" value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder={sku} />
          </label>
          <label className="wm-field">
            Product type
            <select className="wm-select" value={form.domain} onChange={(event) => updateForm("domain", event.target.value as SavedCompetitorSpec["domain"])}>
              {SAVED_SPEC_DOMAIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="wm-field">
            Role
            <select className="wm-select" value={form.role} onChange={(event) => updateForm("role", event.target.value as SavedCompetitorSpec["role"])}>
              {SAVED_SPEC_ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="wm-field">
            Transport
            <input className="wm-input" value={form.transport} onChange={(event) => updateForm("transport", event.target.value)} placeholder="e.g. HDBaseT, 1GbE AVoIP" />
          </label>
          <label className="wm-field">
            Max resolution
            <input className="wm-input" value={form.maxResolution} onChange={(event) => updateForm("maxResolution", event.target.value)} placeholder="e.g. 4K60" />
          </label>
          <label className="wm-field">
            Chroma
            <input className="wm-input" value={form.chroma} onChange={(event) => updateForm("chroma", event.target.value)} placeholder="e.g. 4:4:4" />
          </label>
          <label className="wm-field">
            Inputs
            <input className="wm-input" type="number" min="0" value={form.inputCount} onChange={(event) => updateForm("inputCount", event.target.value)} />
          </label>
          <label className="wm-field">
            Outputs
            <input className="wm-input" type="number" min="0" value={form.outputCount} onChange={(event) => updateForm("outputCount", event.target.value)} />
          </label>
        </div>
        <label className="wm-field">
          Source link
          <input className="wm-input" value={form.sourceUrl} onChange={(event) => updateForm("sourceUrl", event.target.value)} placeholder="Manufacturer product page" />
        </label>
        <label className="wm-field">
          Notes
          <textarea className="wm-textarea" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
        </label>
        <div className="compare-native-action-row wm-ui-card">
          <button type="button" className="compare-native-more wm-ui-button wm-ui-button-primary" onClick={() => { void saveForm(); }} disabled={!canSave || submissionState === "submitting"}>
            {submissionState === "submitting" ? "Saving and submitting..." : liveResearchResult?.competitor_lookup_mode === "live" ? "Keep researched facts" : "Save for next time"}
          </button>
          {savedAt ? <p className="compare-native-muted wm-ui-copy">Saved locally at {savedAt}. This SKU will use your saved data next time.</p> : null}
          {submissionState === "submitted" ? <p className="compare-native-muted wm-ui-copy" role="status">Sent to Wingman admin for formal review. Your local copy remains available while the core record is pending.</p> : null}
          {submissionState === "error" ? <p className="compare-native-muted wm-ui-copy" role="alert">Saved locally, but the admin review submission could not be sent. Keep this page open and try again when the workspace service is available.</p> : null}
        </div>
      </div>
    </section>
  );
}
