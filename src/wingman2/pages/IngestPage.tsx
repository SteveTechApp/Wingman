import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { saveIngestAnalysisToProject } from "../data/projectStore";
import { extractDocuments } from "../lib/documentExtract";
import { analyzeRequirementsText } from "../lib/requirementsParser";
import {
  analyzeMultiSkuCompetitorDocument,
  buildMultiSkuResponseDraft,
  type MultiSkuCompetitorAnalysis,
} from "../lib/documentIngest/multiSkuCompetitorIngest";
import type { DocumentSkuTriageRow } from "../lib/documentIngest/skuTriage";
import {
  analyzeVisualAttachment,
  isSupportedVisualAttachment,
  type VisualAttachmentAnalysis,
} from "../lib/visionAttachments";

type RequestType =
  | "Email / message"
  | "RFI / information request"
  | "Formal RFQ"
  | "BOM / competitor list"
  | "Room brief / feature list"
  | "Multi-space scope"
  | "Direct competitor comparison"
  | "Rough notes";

type IngestAnalysis = {
  requirements: string[];
  unknowns: string[];
  skippedFiles: string[];
  files: string[];
};

const requestTypes: RequestType[] = [
  "Email / message",
  "RFI / information request",
  "Formal RFQ",
  "BOM / competitor list",
  "Room brief / feature list",
  "Multi-space scope",
  "Direct competitor comparison",
  "Rough notes",
];

// "auto" exists only for the "Email / message" default: an email is a delivery
// channel, not a content shape, so it keeps the heuristic instead of forcing a
// pipeline. Every other type is a rep's explicit statement of document shape
// and is trusted outright - see IngestPage.multiSku.test.tsx for the case this
// preserves (default type, no explicit selection, still auto-detects a bulk list).
type IngestPipeline = "plain" | "bulk" | "compare" | "auto";

function pipelineForRequestType(type: RequestType): IngestPipeline {
  if (type === "BOM / competitor list" || type === "Formal RFQ") return "bulk";
  if (type === "Direct competitor comparison") return "compare";
  if (type === "Email / message") return "auto";
  return "plain";
}

function requestTypeGuidance(type: RequestType) {
  if (type === "Email / message") {
    return {
      title: "Reply-ready decoder",
      output: "Create a concise response, ask for missing details and avoid over-technical wording.",
      voice: "Helpful, practical and clear."
    };
  }

  if (type === "RFI / information request") {
    return {
      title: "Information response",
      output: "Extract what the customer is really asking and produce structured information points with assumptions.",
      voice: "Customer-safe and evidence-led."
    };
  }

  if (type === "Formal RFQ") {
    return {
      title: "Tender / RFQ product review",
      output: "Treat the named product lines as a defined bill of materials: identify WyreStorm relevance, substitution paths and items needing comparison, same as a BOM.",
      voice: "Controlled, cautious and review-ready."
    };
  }

  if (type === "BOM / competitor list") {
    return {
      title: "Substitution review",
      output: "Identify likely WyreStorm relevance, competitor substitution paths and items needing comparison.",
      voice: "Fit-based, not like-for-like unless proven."
    };
  }

  if (type === "Room brief / feature list") {
    return {
      title: "Room brief decoder",
      output: "Turn a described range of features and capabilities into firm requirements, an implied system shape and the gaps to confirm before product selection.",
      voice: "Design-consultant style, capability-led not product-led."
    };
  }

  if (type === "Multi-space scope") {
    return {
      title: "Project splitter",
      output: "Split requirements by space, show missing information and prepare project handoff.",
      voice: "Design-consultant style with clear next actions."
    };
  }

  if (type === "Direct competitor comparison") {
    return {
      title: "Direct comparison handoff",
      output: "Detect the named competitor brand/product and hand straight off to Compare - no requirement analysis needed for a like-for-like ask.",
      voice: "Fast, single-purpose handoff."
    };
  }

  return {
    title: "Rough notes clean-up",
    output: "Turn messy notes into questions, risks, likely system shape and next workflow.",
    voice: "Plain, structured and practical."
  };
}

function buildSystemShape(requirements: string[], unknowns: string[]) {
  const text = `${requirements.join(" ")} ${unknowns.join(" ")}`.toLowerCase();

  if (text.includes("video wall") || text.includes("led wall") || text.includes("lcd wall")) {
    return "Video wall or display-wall workflow. Confirm wall type, layout, source behaviour, processing and whether fixed wall processing or NetworkHD is required.";
  }

  if (text.includes("ndi") || text.includes("camera") || text.includes("stream") || text.includes("record")) {
    return "Camera, capture or streaming workflow. Confirm camera type, host, USB/HDMI/NDI path, audio ownership and control.";
  }

  if (text.includes("usb") || text.includes("teams") || text.includes("zoom") || text.includes("byod") || text.includes("byom")) {
    return "Meeting-room / UC workflow. Confirm host ownership, USB devices, display count, source inputs and cable landing points.";
  }

  if (text.includes("matrix") || text.includes("multiple displays") || text.includes("several screens") || text.includes("av over ip") || text.includes("avoip")) {
    return "Routed AV workflow. Confirm source count, display count, zones, distances, network ownership and control requirements.";
  }

  return "System shape is not yet safe to call. Use Discovery to confirm application, source count, display count, USB, audio, control and infrastructure.";
}

function cleanList(items: string[], fallback: string[]) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length) return cleaned;
  return fallback;
}

function resolveBulkAnalysis(pipeline: IngestPipeline, text: string): MultiSkuCompetitorAnalysis | null {
  if (pipeline === "bulk") return analyzeMultiSkuCompetitorDocument(text);
  if (pipeline !== "auto") return null;

  const detected = analyzeMultiSkuCompetitorDocument(text);
  return detected.documentType === "multi_sku_competitor_list" ? detected : null;
}

export function IngestPage() {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [extractState, setExtractState] = useState<"idle" | "extracting" | "complete" | "error">("idle");
  const [requestType, setRequestType] = useState<RequestType>("Email / message");
  const [pastedText, setPastedText] = useState("");
  const [bulkAnalysis, setBulkAnalysis] = useState<MultiSkuCompetitorAnalysis | null>(null);
  const [analysis, setAnalysis] = useState<IngestAnalysis>({
    requirements: [],
    unknowns: ["Paste a customer message, RFQ, RFI, notes or upload readable files to decode the request."],
    skippedFiles: [],
    files: [],
  });
  const [visualAttachments, setVisualAttachments] = useState<VisualAttachmentAnalysis[]>([]);
  const [attachmentStatus, setAttachmentStatus] = useState<"idle" | "analyzing" | "error">("idle");
  const [attachmentError, setAttachmentError] = useState("");
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [saveWarning, setSaveWarning] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const requestGuidance = useMemo(() => requestTypeGuidance(requestType), [requestType]);
  const nextStep = useMemo(() => {
    if (requestType === "BOM / competitor list" || requestType === "Formal RFQ") {
      return {
        label: "Next: build proposal",
        path: routeCatalogByKey.proposal.path,
        summary: "Take the extracted product requirement straight into the proposal workflow.",
      };
    }

    if (requestType === "Multi-space scope") {
      return {
        label: "Next: complete discovery",
        path: routeCatalogByKey.discovery.path,
        summary: "Confirm the remaining room and workflow details before product selection.",
      };
    }

    if (requestType === "Direct competitor comparison") {
      return {
        label: "Next: open Compare",
        path: routeCatalogByKey.compare.path,
        summary: "Decode to detect the competitor brand/product and jump straight into Compare.",
      };
    }

    return {
      label: "Next: create response",
      path: routeCatalogByKey.responsePack.path,
      summary: "Turn the decoded request into a concise customer response.",
    };
  }, [requestType]);
  const requirements = cleanList(analysis.requirements, ["No requirements extracted yet."]);
  const unknowns = cleanList(analysis.unknowns, ["No missing details extracted yet."]);
  const systemShape = useMemo(() => buildSystemShape(analysis.requirements, analysis.unknowns), [analysis.requirements, analysis.unknowns]);
  const hasDecodedResult = extractState === "complete";
  const showCaptureWorkspace = !hasDecodedResult || isEditingRequest;
  const decodedSourceSummary = [
    pastedText.trim() ? `${pastedText.trim().length.toLocaleString()} characters pasted` : "",
    selectedFiles.length ? `${selectedFiles.length} readable file${selectedFiles.length === 1 ? "" : "s"}` : "",
    visualAttachments.length ? `${visualAttachments.length} visual attachment${visualAttachments.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);

  const redirectToCompare = (text: string) => {
    if (!text.trim()) return false;

    const detected = analyzeMultiSkuCompetitorDocument(text);
    const sku = detected.skus[0]?.sku;
    if (!sku) return false;

    const params = new URLSearchParams();
    if (detected.manufacturer && detected.manufacturer !== "Not confirmed") {
      params.set("brand", detected.manufacturer);
    }
    params.set("sku", sku);
    navigate(`${routeCatalogByKey.compare.path}?${params.toString()}`);
    return true;
  };

  const analyseText = (text: string, warnings: string[] = [], files: string[] = []) => {
    const pipeline = pipelineForRequestType(requestType);

    if (pipeline === "compare") {
      if (redirectToCompare(text)) return;
      setBulkAnalysis(null);
      setAnalysis({
        requirements: [],
        unknowns: ["No competitor brand or SKU could be detected in this text. Add the product name/SKU, or open Compare directly."],
        skippedFiles: [],
        files,
      });
      setExtractState("error");
      return;
    }

    const parsed = analyzeRequirementsText(text, warnings);
    const nextAnalysis: IngestAnalysis = {
      requirements: parsed.requirements,
      unknowns: parsed.unknowns,
      skippedFiles: [],
      files,
    };

    const multiSku = resolveBulkAnalysis(pipeline, text);

    setAnalysis(nextAnalysis);
    setBulkAnalysis(multiSku);
    const saved = saveIngestAnalysisToProject(
      { ...nextAnalysis, multiSkuIntelligence: multiSku ?? undefined, visualContext: visualAttachments },
      { requireExistingProject: true },
    );
    setSaveWarning(saved ? "" : "Open or start a project first. The decoded analysis is shown below but was not attached to a project.");
    setExtractState("complete");
    setIsEditingRequest(false);
  };

  const updateBulkRowQuantity = (rowId: string, quantity: number) => {
    setBulkAnalysis((current) =>
      current
        ? {
            ...current,
            triage: {
              ...current.triage,
              rows: current.triage.rows.map((row) => (row.id === rowId ? { ...row, quantity } : row)),
            },
          }
        : current,
    );
  };

  const saveBulkOpportunity = () => {
    if (!bulkAnalysis) return;
    saveIngestAnalysisToProject({
      requirements: analysis.requirements,
      unknowns: analysis.unknowns,
      skippedFiles: analysis.skippedFiles,
      files: analysis.files,
      multiSkuIntelligence: bulkAnalysis,
      visualContext: visualAttachments,
    });
  };

  const continueBulkToProposal = () => {
    saveBulkOpportunity();
    navigate(routeCatalogByKey.proposal.path);
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter(isSupportedVisualAttachment);
    if (!files.length) return;

    setAttachmentStatus("analyzing");
    setAttachmentError("");

    try {
      const results = await Promise.all(files.map((file) => analyzeVisualAttachment(file, requestType)));
      const nextAttachments = [...visualAttachments, ...results];
      setVisualAttachments(nextAttachments);
      const saved = saveIngestAnalysisToProject(
        {
          requirements: analysis.requirements,
          unknowns: analysis.unknowns,
          skippedFiles: analysis.skippedFiles,
          files: analysis.files,
          multiSkuIntelligence: bulkAnalysis ?? undefined,
          visualContext: nextAttachments,
        },
        { requireExistingProject: true },
      );
      setSaveWarning(saved ? "" : "Open or start a project first. The attachment was analyzed but was not attached to a project.");
      setAttachmentStatus("idle");
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Could not analyze the attached image.");
      setAttachmentStatus("error");
    } finally {
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files.map((file) => file.name));
    setExtractState("extracting");

    let extracted: Awaited<ReturnType<typeof extractDocuments>>;
    try {
      extracted = await extractDocuments(files);
    } catch (error) {
      setAnalysis({
        requirements: [],
        unknowns: [
          error instanceof Error
            ? `Could not read the uploaded files: ${error.message}`
            : "Could not read the uploaded files. Paste the customer request manually instead.",
        ],
        skippedFiles: files.map((file) => file.name),
        files: files.map((file) => file.name),
      });
      setExtractState("error");
      return;
    }

    const text = extracted.map((item) => item.text).filter(Boolean).join("\n\n");
    const extractionWarnings = extracted.flatMap((item) => item.warnings);
    const skippedFiles = extracted.filter((item) => !item.text).map((item) => item.fileName);
    const combinedText = [pastedText, text].filter(Boolean).join("\n\n");

    if (!combinedText.trim()) {
      setAnalysis({
        requirements: [],
        unknowns: [
          ...extractionWarnings,
          "No usable text could be extracted. Paste the customer request manually or convert the file to text first.",
        ],
        skippedFiles,
        files: files.map((file) => file.name),
      });
      setExtractState("error");
      return;
    }

    const pipeline = pipelineForRequestType(requestType);

    if (pipeline === "compare") {
      if (redirectToCompare(combinedText)) return;
      setBulkAnalysis(null);
      setAnalysis({
        requirements: [],
        unknowns: ["No competitor brand or SKU could be detected in this file. Add the product name/SKU, or open Compare directly."],
        skippedFiles,
        files: files.map((file) => file.name),
      });
      setExtractState("error");
      return;
    }

    const parsed = analyzeRequirementsText(combinedText, extractionWarnings);
    const nextAnalysis: IngestAnalysis = {
      ...parsed,
      skippedFiles,
      files: files.map((file) => file.name),
    };

    const multiSku = resolveBulkAnalysis(pipeline, combinedText);

    setAnalysis(nextAnalysis);
    setBulkAnalysis(multiSku);
    const saved = saveIngestAnalysisToProject(
      { ...nextAnalysis, multiSkuIntelligence: multiSku ?? undefined, visualContext: visualAttachments },
      { requireExistingProject: true },
    );
    setSaveWarning(saved ? "" : "Open or start a project first. The decoded analysis is shown below but was not attached to a project.");
    setExtractState(extractionWarnings.length && !text ? "error" : "complete");
    if (!(extractionWarnings.length && !text)) setIsEditingRequest(false);
  };

  const runPasteAnalysis = () => {
    analyseText(pastedText, [], selectedFiles);
  };

  const resetStandardRequest = () => {
    setSelectedFiles([]);
    setExtractState("idle");
    setPastedText("");
    setBulkAnalysis(null);
    setAnalysis({
      requirements: [],
      unknowns: ["Paste a customer message, RFQ, RFI, notes or upload readable files to decode the request."],
      skippedFiles: [],
      files: [],
    });
    setVisualAttachments([]);
    setAttachmentStatus("idle");
    setAttachmentError("");
    setIsEditingRequest(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  if (bulkAnalysis) {
    return (
      <div className="pb-8" data-wingman-request-decoder="true">
        <PageHero
          eyebrow="Request Decoder"
          title="Bulk enquiry ready"
          purpose="Wingman separated the competitor product list from supporting analysis. Review the WyreStorm direction, then carry it into the proposal."
          nextMove="Carry the batch-eligible items into the proposal workflow."
          actions={[{ label: "Continue to proposal", onClick: continueBulkToProposal }]}
        />
        {saveWarning ? (
          <div className="wm-ingest-inline-alert" role="alert">
            <strong>Not saved to a project.</strong>
            <span>{saveWarning}</span>
          </div>
        ) : null}
        <BulkEnquiryResults
          analysis={bulkAnalysis}
          visualAttachments={visualAttachments}
          onSave={saveBulkOpportunity}
          onQuantityChange={updateBulkRowQuantity}
          onReset={() => {
            setBulkAnalysis(null);
            setPastedText("");
            setExtractState("idle");
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="wm-ingest-page"
      data-wingman-request-decoder="true"
      data-workspace-view={showCaptureWorkspace ? "capture" : "results"}
    >
      <header className="wm-ingest-compact-header">
        <div className="wm-ingest-header-copy">
          <p className="wm-ingest-kicker">Request Decoder</p>
          <h1>{showCaptureWorkspace ? "Decode the incoming request" : "Decoded request"}</h1>
          <p>
            {showCaptureWorkspace
              ? "Paste or upload the customer wording, then let Wingman separate requirements from missing information."
              : "Review the requirements, system direction and open questions before moving into the next workflow."}
          </p>
        </div>

        <div className="wm-ingest-header-actions">
          <Link
            className="wm-ingest-button wm-ingest-button-secondary"
            data-ingest-next-step="true"
            to={nextStep.path}
          >
            {nextStep.label}
          </Link>
          {showCaptureWorkspace ? (
            <Link
              className="wm-ingest-button wm-ingest-button-secondary"
              to={nextStep.path}
            >
              {nextStep.label}
            </Link>
          ) : null}
          {hasDecodedResult && !showCaptureWorkspace ? (
            <>
              <button
                type="button"
                className="wm-ingest-button wm-ingest-button-secondary"
                onClick={() => setIsEditingRequest(true)}
              >
                Edit request
              </button>
              <Link className="wm-ingest-button wm-ingest-button-primary" to={nextStep.path}>
                {nextStep.label}
              </Link>
            </>
          ) : null}
        </div>
      </header>

      {showCaptureWorkspace ? (
        <main className="wm-ingest-capture-layout">
          <section className="wm-ingest-panel wm-ingest-input-panel">
            <div className="wm-ingest-panel-heading">
              <div>
                <span>Customer input</span>
                <h2>What has the customer asked for?</h2>
              </div>
              {hasDecodedResult ? (
                <button
                  type="button"
                  className="wm-ingest-text-button"
                  onClick={() => setIsEditingRequest(false)}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="wm-ingest-request-controls">
              <label>
                <span>Request type</span>
                <select
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value as RequestType)}
                >
                  {requestTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={runPasteAnalysis}
                disabled={!pastedText.trim() || extractState === "extracting"}
                className="wm-ingest-button wm-ingest-button-primary wm-ingest-decode-button"

              aria-label="Decode pasted request">
                {extractState === "extracting" ? "Decoding..." : "Decode pasted request"}
              </button>
            </div>

            <label className="wm-ingest-textarea-label">
              <span>Customer wording</span>
              <textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                placeholder="Paste the email, RFQ text, notes, BOM lines or customer message here."
                rows={10}
              />
            </label>

            <div className="wm-ingest-upload-grid">
              <section className="wm-ingest-upload-card">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.eml"
                />
                <div>
                  <strong>Readable documents</strong>
                  <span>PDF, Word, text, CSV, email or markdown</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extractState === "extracting"}
                  className="wm-ingest-button wm-ingest-button-secondary"
                >
                  {extractState === "extracting" ? "Extracting..." : "Select files"}
                </button>
                {selectedFiles.length ? (
                  <small>{selectedFiles.length} selected: {selectedFiles.slice(0, 2).join(", ")}{selectedFiles.length > 2 ? "…" : ""}</small>
                ) : null}
              </section>

              <section className="wm-ingest-upload-card">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                  accept="image/*"
                />
                <div>
                  <strong>Photos or diagrams</strong>
                  <span>Add visual context without replacing the brief</span>
                </div>
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={attachmentStatus === "analyzing"}
                  className="wm-ingest-button wm-ingest-button-secondary"
                >
                  {attachmentStatus === "analyzing" ? "Analysing..." : "Add attachment"}
                </button>
                {visualAttachments.length ? (
                  <small>{visualAttachments.length} visual attachment{visualAttachments.length === 1 ? "" : "s"}</small>
                ) : null}
              </section>
            </div>

            {extractState === "error" ? (
              <div className="wm-ingest-inline-alert" role="alert">
                <strong>Wingman could not complete the decode.</strong>
                <span>{unknowns[0]}</span>
              </div>
            ) : null}

            {attachmentStatus === "error" && attachmentError ? (
              <div className="wm-ingest-inline-alert" role="alert">
                <strong>Attachment analysis failed.</strong>
                <span>{attachmentError}</span>
              </div>
            ) : null}

            {saveWarning ? (
              <div className="wm-ingest-inline-alert" role="alert">
                <strong>Not saved to a project.</strong>
                <span>{saveWarning}</span>
              </div>
            ) : null}
          </section>

          <aside className="wm-ingest-panel wm-ingest-guidance-panel">
            <div className="wm-ingest-panel-heading">
              <div>
                <span>{requestGuidance.title}</span>
                <h2>How Wingman will handle it</h2>
              </div>
            </div>

            <div className="wm-ingest-guidance-summary">
              <strong>Response voice</strong>
              <p>{requestGuidance.voice}</p>
            </div>

            <div className="wm-ingest-process-list">
              <article>
                <span>1</span>
                <div>
                  <strong>Decode</strong>
                  <p>Separate firm requirements from assumptions and missing information.</p>
                </div>
              </article>
              <article>
                <span>2</span>
                <div>
                  <strong>Review</strong>
                  <p>{requestGuidance.output}</p>
                </div>
              </article>
              <article>
                <span>3</span>
                <div>
                  <strong>Move forward</strong>
                  <p>{nextStep.summary}</p>
                </div>
              </article>
            </div>

            <div className="wm-ingest-guidance-note">
              <strong>No blank result panels</strong>
              <p>Results stay hidden until Wingman has decoded usable customer content.</p>
            </div>
          </aside>
        </main>
      ) : (
        <>
          <section className="wm-ingest-result-toolbar">
            <div>
              <span>Source</span>
              <strong>{requestType}</strong>
              <small>{decodedSourceSummary.join(" · ") || "Decoded customer wording"}</small>
            </div>

            <div className="wm-ingest-result-toolbar-actions">
              <button
                type="button"
                className="wm-ingest-button wm-ingest-button-secondary"
                onClick={() => setIsEditingRequest(true)}
              >
                Edit request
              </button>
              <button
                type="button"
                className="wm-ingest-text-button"
                onClick={resetStandardRequest}
              >
                Start new request
              </button>
            </div>
          </section>

          <main className="wm-ingest-results-grid">
            <article className="wm-ingest-panel wm-ingest-result-card wm-ingest-requirements-card">
              <div className="wm-ingest-panel-heading">
                <div>
                  <span>Extracted requirements</span>
                  <h2>{analysis.requirements.length} captured</h2>
                </div>
              </div>
              <ul className="wm-ingest-compact-list">
                {requirements.slice(0, 10).map((requirement, index) => (
                  <li key={`${requirement}-${index}`}>
                    <span>{index + 1}</span>
                    <p>{requirement}</p>
                  </li>
                ))}
              </ul>
            </article>

            <div className="wm-ingest-result-stack">
              <article className="wm-ingest-panel wm-ingest-result-card">
                <div className="wm-ingest-panel-heading">
                  <div>
                    <span>Likely system shape</span>
                    <h2>Architecture direction</h2>
                  </div>
                </div>
                <p className="wm-ingest-result-copy">{systemShape}</p>
              </article>

              <article className="wm-ingest-panel wm-ingest-result-card wm-ingest-voice-card">
                <div className="wm-ingest-panel-heading">
                  <div>
                    <span>{requestGuidance.title}</span>
                    <h2>Response voice</h2>
                  </div>
                </div>
                <p className="wm-ingest-result-copy">{requestGuidance.voice}</p>
                <p className="wm-ingest-result-muted">{requestGuidance.output}</p>
              </article>
            </div>

            <aside className="wm-ingest-result-stack">
              <article className="wm-ingest-panel wm-ingest-result-card">
                <div className="wm-ingest-panel-heading">
                  <div>
                    <span>Unknowns / next actions</span>
                    <h2>{analysis.unknowns.length} to confirm</h2>
                  </div>
                </div>
                <ul className="wm-ingest-compact-list wm-ingest-unknown-list">
                  {unknowns.slice(0, 8).map((unknown, index) => (
                    <li key={`${unknown}-${index}`}>
                      <span>?</span>
                      <p>{unknown}</p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="wm-ingest-panel wm-ingest-next-card">
                <span>Next workflow</span>
                <h2>{nextStep.label.replace(/^Next:\s*/i, "")}</h2>
                <p>{nextStep.summary}</p>
                <Link className="wm-ingest-button wm-ingest-button-primary" to={nextStep.path}>
                  {nextStep.label}
                </Link>
              </article>
            </aside>
          </main>

          {visualAttachments.length ? (
            <section className="wm-ingest-panel wm-ingest-visual-strip">
              <div className="wm-ingest-panel-heading">
                <div>
                  <span>Visual context</span>
                  <h2>{visualAttachments.length} attachment{visualAttachments.length === 1 ? "" : "s"}</h2>
                </div>
              </div>
              <div className="wm-ingest-visual-grid">
                {visualAttachments.map((item) => (
                  <article key={item.id}>
                    <strong>{item.fileName}</strong>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

type BulkTab = "products" | "groups" | "risks" | "source";

const BULK_TABS: Array<{ id: BulkTab; label: string }> = [
  { id: "products", label: "Products" },
  { id: "groups", label: "Product groups" },
  { id: "risks", label: "Risks & response" },
  { id: "source", label: "Source details" },
];

function statusLabel(status: DocumentSkuTriageRow["status"]): string {
  return status.replace(/_/g, " ");
}

const SOURCE_ROLES = new Set(["transmitter", "kit"]);
const DISPLAY_ROLES = new Set(["receiver", "kit"]);

function BulkEnquiryResults({
  analysis,
  visualAttachments,
  onSave,
  onReset,
  onQuantityChange,
}: {
  analysis: MultiSkuCompetitorAnalysis;
  visualAttachments: VisualAttachmentAnalysis[];
  onSave: () => void;
  onReset: () => void;
  onQuantityChange: (rowId: string, quantity: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<BulkTab>("products");
  const [showQueue, setShowQueue] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [saved, setSaved] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [showDiscoveryQuestions, setShowDiscoveryQuestions] = useState(false);
  const { triage } = analysis;
  const productRows = triage.rows.filter((row) => row.status !== "not_wyrestorm_addressable");
  const queueRows = triage.rows.filter((row) => row.batchCompareEligible);
  const ignoredRows = triage.rows.filter((row) => row.status === "not_wyrestorm_addressable" && row.retainAsProjectContext);

  const setQuantity = (rowId: string, value: number) => {
    const clamped = Number.isFinite(value) && value >= 0 ? Math.min(999, Math.round(value)) : 0;
    onQuantityChange(rowId, clamped);
  };

  const inferredSourceCount = productRows
    .filter((row) => SOURCE_ROLES.has(row.role))
    .reduce((total, row) => total + (row.quantity ?? 1), 0);
  const inferredDisplayCount = productRows
    .filter((row) => DISPLAY_ROLES.has(row.role))
    .reduce((total, row) => total + (row.quantity ?? 1), 0);
  const uncountedRowCount = productRows.filter((row) => !SOURCE_ROLES.has(row.role) && !DISPLAY_ROLES.has(row.role)).length;

  return (
    <SectionCard
      title="Review the bulk enquiry"
      subtitle="Competitor SKUs are intelligence inputs only - review the WyreStorm direction before quoting."
      rightSlot={
        <button type="button" className="wingman-hero-action wingman-hero-action-secondary" onClick={onReset}>
          Start over
        </button>
      }
    >
      <div
        role="tablist"
        aria-label="Bulk enquiry sections"
        className="mb-4 flex flex-wrap gap-2"
      >
        {BULK_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? "rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
                : "rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "products" ? (
        <div role="tabpanel" aria-label="Products" className="grid gap-4">
          <section className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Inferred room design</p>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Sources: {inferredSourceCount} · Displays: {inferredDisplayCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Inferred from BOM roles - one transmitter or extender kit counts as one source, one receiver or extender kit counts as one display. Shared infrastructure (matrix), accessories and unclear items ({uncountedRowCount}) are not counted. Edit the quantities below before committing this to the design.
            </p>
          </section>

          <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Product selection</p>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Every extracted line, classified by WyreStorm-addressable direction. Noise and non-addressable context is kept out by default. Edit quantities to correct the inferred count.
            </p>
            <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-[#29465e]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">SKU</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">Description</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">Qty</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">Status</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">WyreStorm direction</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row) => (
                    <tr key={row.id} className="border-t border-[#29465e]">
                      <td className="p-2 font-semibold text-white">{row.sku}</td>
                      <td className="p-2 text-white/70">{row.rawItem}</td>
                      <td className="p-2 text-white/70">
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={row.quantity ?? 1}
                          onChange={(event) => setQuantity(row.id, Number(event.target.value))}
                          aria-label={`Quantity for ${row.sku || row.rawItem}`}
                          className="w-16 rounded-lg border border-[#29465e] bg-[#081724] px-2 py-1 text-sm text-white"
                        />
                      </td>
                      <td className="p-2 text-white/70">{statusLabel(row.status)}</td>
                      <td className="p-2 text-white/70">{row.wyrestormDirection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="wingman-action-row flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
              onClick={() => setShowQueue((current) => !current)}
            >
              {showQueue ? "Hide selected comparisons" : `Review selected comparisons (${queueRows.length})`}
            </button>
            <button
              type="button"
              className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
              onClick={() => setShowIgnored((current) => !current)}
            >
              {showIgnored ? "Hide ignored items" : "Review ignored items"}
            </button>
          </div>

          {showQueue ? (
            <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Selected comparison queue</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {queueRows.map((row) => (
                  <li key={row.id} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{row.sku}</p>
                        <p>{row.wyrestormDirection}</p>
                      </div>
                      <Link
                        className="wm-ui-button wm-ui-button-secondary rounded-xl px-3 py-2 font-black"
                        to={`${routeCatalogByKey.compare.path}?${new URLSearchParams({
                          ...(row.brand ? { brand: row.brand } : {}),
                          sku: row.sku,
                          context: row.rawItem,
                          source: "document-ingest-batch",
                        }).toString()}`}
                      >
                        Compare {row.sku}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showIgnored ? (
            <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Ignored items (retained as project context)</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {ignoredRows.map((row) => (
                  <li key={row.id} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                    <p className="font-semibold text-white">{row.sku || row.rawItem}</p>
                    <p>{row.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "groups" ? (
        <div role="tabpanel" aria-label="Product groups" className="grid gap-3">
          {analysis.productSets.map((group) => (
            <article key={group.id} className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-sm font-black text-white">{group.title}</p>
              <p className="mt-1 text-sm leading-6 text-white/70">{group.summary}</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{group.salesDirection}</p>
            </article>
          ))}
        </div>
      ) : null}

      {activeTab === "risks" ? (
        <div role="tabpanel" aria-label="Risks and response" className="grid gap-4">
          <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Quote risks</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
              {analysis.quoteRisks.map((risk) => (
                <li key={risk} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">{risk}</li>
              ))}
            </ul>
          </article>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
              onClick={() => setResponseDraft(buildMultiSkuResponseDraft(analysis))}
            >
              Generate sales response
            </button>
            <button
              type="button"
              className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
              onClick={() => setShowDiscoveryQuestions(true)}
            >
              Generate discovery questions
            </button>
          </div>

          {responseDraft ? (
            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Sales response draft</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{responseDraft}</p>
            </article>
          ) : null}

          {showDiscoveryQuestions ? (
            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Discovery questions</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {analysis.discoveryQuestions.map((question) => (
                  <li key={question} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">{question}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      ) : null}

      {activeTab === "source" ? (
        <div role="tabpanel" aria-label="Source details" className="grid gap-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Document type</p>
          <p className="text-sm text-white/75">{analysis.documentType}</p>
          <p className="text-sm text-white/75">{analysis.manufacturer} / {analysis.accountCustomer}</p>
          {analysis.senderContext ? <p className="text-sm text-white/60">{analysis.senderContext}</p> : null}
          {analysis.subject ? <p className="text-sm text-white/60">Subject: {analysis.subject}</p> : null}
          <p className="text-sm text-white/60">Source kind: {analysis.sourceKind}</p>

          {visualAttachments.length ? (
            <div className="mt-4 grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Visual context</p>
              <ul className="grid gap-2">
                {visualAttachments.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                    <p className="font-semibold text-white">{item.fileName}</p>
                    <p className="mt-1 text-sm text-white/60">{item.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
        <p className="text-sm leading-6 text-white/85">
          Competitor SKUs were not added to the WyreStorm BOM or product selections - they remain intelligence inputs until confirmed.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
            onClick={() => {
              onSave();
              setSaved(true);
            }}
          >
            Save opportunity
          </button>
          {saved ? <span className="text-sm font-semibold text-cyan-200">Saved.</span> : null}
        </div>
      </div>
    </SectionCard>
  );
}
