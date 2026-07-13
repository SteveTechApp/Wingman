import { useCallback, useEffect, useMemo, useState } from "react";
import { runCompetitorLookup, WingmanApiError, type CompetitorLookupResponse } from "../../api/wingmanApi";
import { extractDocumentText } from "../../lib/documentExtract";
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
export function CompetitorEvidencePanel({ brand, sku, onSaved }: { brand: string; sku: string; onSaved: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<CompetitorLookupResponse | null>(null);
  const [error, setError] = useState<{ message: string; needsSignIn: boolean } | null>(null);
  const [form, setForm] = useState<SavedSpecFormState>(emptySavedSpecForm);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [documentState, setDocumentState] = useState<{ status: "idle" | "reading" | "done" | "error"; fileName?: string; warnings: string[] }>({ status: "idle", warnings: [] });
  const [imagePreview, setImagePreview] = useState<{ fileName: string; objectUrl: string } | null>(null);

  const existingSaved = useMemo(() => findSavedCompetitorSpec(brand, sku), [brand, sku]);

  useEffect(() => {
    setForm(existingSaved ? savedSpecToForm(existingSaved) : emptySavedSpecForm());
    setResult(null);
    setError(null);
    setStatus("idle");
    setSavedAt(null);
    setDocumentState({ status: "idle", warnings: [] });
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current.objectUrl);
      return null;
    });
  }, [brand, sku, existingSaved]);

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

  async function handleDocumentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setDocumentState({ status: "reading", fileName: file.name, warnings: [] });
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

  function saveForm() {
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
      savedFrom: result?.ok ? "live-lookup" : "manual",
    });
    setSavedAt(new Date().toLocaleTimeString());
    onSaved();
  }

  if (!sku.trim()) return null;

  const canSave = form.title.trim().length > 0 || form.domain !== "UNKNOWN";

  return (
    <section className="compare-native-card wm-ui-section wm-ui-card">
      <h3 className="wm-ui-title">Add evidence for this product</h3>
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

      {error ? <p className="compare-native-muted wm-ui-copy">{error.message}</p> : null}
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
          <p className="compare-native-muted wm-ui-copy">
            No manufacturer page could be resolved automatically. Confirm the product type manually below.
          </p>
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
          <button type="button" className="compare-native-more wm-ui-button wm-ui-button-primary" onClick={saveForm} disabled={!canSave}>
            Save for next time
          </button>
          {savedAt ? <p className="compare-native-muted wm-ui-copy">Saved at {savedAt}. This SKU will use your saved data next time.</p> : null}
        </div>
      </div>
    </section>
  );
}
