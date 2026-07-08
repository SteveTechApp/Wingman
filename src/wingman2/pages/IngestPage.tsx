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

type RequestType = "Email / message" | "RFI / information request" | "Formal RFQ" | "BOM / competitor list" | "Multi-space scope" | "Rough notes";

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
  "Multi-space scope",
  "Rough notes",
];

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
      title: "Formal request review",
      output: "Separate firm requirements from assumptions, verification gates and technical review items.",
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

  if (type === "Multi-space scope") {
    return {
      title: "Project splitter",
      output: "Split requirements by space, show missing information and prepare project handoff.",
      voice: "Design-consultant style with clear next actions."
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requestGuidance = useMemo(() => requestTypeGuidance(requestType), [requestType]);
  const nextStep = useMemo(() => {
    if (requestType === "BOM / competitor list") {
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

    return {
      label: "Next: create response",
      path: routeCatalogByKey.responsePack.path,
      summary: "Turn the decoded request into a concise customer response.",
    };
  }, [requestType]);
  const requirements = cleanList(analysis.requirements, ["No requirements extracted yet."]);
  const unknowns = cleanList(analysis.unknowns, ["No missing details extracted yet."]);
  const systemShape = useMemo(() => buildSystemShape(analysis.requirements, analysis.unknowns), [analysis.requirements, analysis.unknowns]);

  const analyseText = (text: string, warnings: string[] = [], files: string[] = []) => {
    const parsed = analyzeRequirementsText(text, warnings);
    const nextAnalysis: IngestAnalysis = {
      requirements: parsed.requirements,
      unknowns: parsed.unknowns,
      skippedFiles: [],
      files,
    };

    const multiSku = analyzeMultiSkuCompetitorDocument(text);
    const isBulk = multiSku.documentType === "multi_sku_competitor_list";

    setAnalysis(nextAnalysis);
    setBulkAnalysis(isBulk ? multiSku : null);
    saveIngestAnalysisToProject(
      { ...nextAnalysis, multiSkuIntelligence: isBulk ? multiSku : undefined },
      { requireExistingProject: true },
    );
    setExtractState("complete");
  };

  const saveBulkOpportunity = () => {
    if (!bulkAnalysis) return;
    saveIngestAnalysisToProject({
      requirements: analysis.requirements,
      unknowns: analysis.unknowns,
      skippedFiles: analysis.skippedFiles,
      files: analysis.files,
      multiSkuIntelligence: bulkAnalysis,
    });
  };

  const continueBulkToProposal = () => {
    saveBulkOpportunity();
    navigate(routeCatalogByKey.proposal.path);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files.map((file) => file.name));
    setExtractState("extracting");

    const extracted = await extractDocuments(files);
    const text = extracted.map((item) => item.text).filter(Boolean).join("\n\n");
    const extractionWarnings = extracted.flatMap((item) => item.warnings);
    const skippedFiles = extracted.filter((item) => !item.text).map((item) => item.fileName);
    const combinedText = [pastedText, text].filter(Boolean).join("\n\n");

    if (!combinedText.trim()) {
      setAnalysis({
        requirements: [],
        unknowns: ["No usable text could be extracted. Paste the customer request manually or convert the file to text first."],
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

    const multiSku = analyzeMultiSkuCompetitorDocument(combinedText);
    const isBulk = multiSku.documentType === "multi_sku_competitor_list";

    setAnalysis(nextAnalysis);
    setBulkAnalysis(isBulk ? multiSku : null);
    saveIngestAnalysisToProject(
      { ...nextAnalysis, multiSkuIntelligence: isBulk ? multiSku : undefined },
      { requireExistingProject: true },
    );
    setExtractState(extractionWarnings.length && !text ? "error" : "complete");
  };

  const runPasteAnalysis = () => {
    analyseText(pastedText, [], selectedFiles);
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
        <BulkEnquiryResults
          analysis={bulkAnalysis}
          onSave={saveBulkOpportunity}
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
    <div className="pb-8" data-wingman-request-decoder="true">
      <PageHero
        eyebrow="Request Decoder"
        title="Decode the request, review the result, then take one clear next step."
        purpose="Paste or upload the customer request. Wingman separates usable requirements from missing information."
        nextMove={nextStep.summary}
        actions={[
          { label: nextStep.label, to: nextStep.path },
        ]}
      />

      <SectionCard
        title="Decode the incoming request"
        subtitle="Start with the customer communication, not a product assumption."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Request type</span>
                <select
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value as RequestType)}
                  className="min-h-11 rounded-2xl border border-[#29465e] bg-[#0d2133] px-3 text-sm font-semibold text-white"
                >
                  {requestTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Paste customer wording</span>
                <textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  placeholder="Paste the email, RFQ text, notes, BOM lines or customer message here."
                  className="min-h-[220px] rounded-2xl border border-[#29465e] bg-[#0d2133] p-4 text-sm leading-6 text-white outline-none focus:border-cyan-300"
                />
              </label>

              <button
                type="button"
                onClick={runPasteAnalysis}
                disabled={!pastedText.trim()}
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Decode pasted request
              </button>

              <div className="rounded-2xl border-2 border-dashed border-[#29465e] bg-[#081724] p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.eml"
                />
                <p className="text-sm font-black text-white">Upload readable files</p>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  Use this for exported emails, text files, CSV BOMs, markdown notes or documents with extractable text.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extractState === "extracting"}
                  className="mt-3 rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100 disabled:opacity-40"
                >
                  {extractState === "extracting" ? "Extracting..." : "Select files"}
                </button>

                {selectedFiles.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-white/60">
                    {selectedFiles.map((fileName) => (
                      <li key={fileName}>{fileName}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Extracted requirements</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {requirements.slice(0, 10).map((requirement, index) => (
                  <li key={`${requirement}-${index}`} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                    {requirement}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Likely system shape</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{systemShape}</p>
            </article>
          </section>

          <aside className="grid gap-4">
            <article className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">{requestGuidance.title}</p>
              <h2 className="mt-2 text-xl font-black text-white">Correct response voice</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">{requestGuidance.voice}</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{requestGuidance.output}</p>
            </article>

            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Unknowns / next actions</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {unknowns.slice(0, 10).map((unknown, index) => (
                  <li key={`${unknown}-${index}`} className="rounded-2xl border border-[#29465e] bg-[#081724] p-3">
                    {unknown}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Next step</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{nextStep.summary}</p>
              <Link
                to={nextStep.path}
                className="mt-4 block rounded-full bg-cyan-300 px-4 py-3 text-center text-sm font-black text-slate-950"
              >
                {nextStep.label}
              </Link>
            </article>
          </aside>
        </div>
      </SectionCard>
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

function BulkEnquiryResults({
  analysis,
  onSave,
  onReset,
}: {
  analysis: MultiSkuCompetitorAnalysis;
  onSave: () => void;
  onReset: () => void;
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
          <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Product selection</p>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Every extracted line, classified by WyreStorm-addressable direction. Noise and non-addressable context is kept out by default.
            </p>
            <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-[#29465e]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">SKU</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">Description</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">Status</th>
                    <th className="p-2 text-xs font-black uppercase tracking-[0.1em] text-cyan-300">WyreStorm direction</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row) => (
                    <tr key={row.id} className="border-t border-[#29465e]">
                      <td className="p-2 font-semibold text-white">{row.sku}</td>
                      <td className="p-2 text-white/70">{row.rawItem}</td>
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
                    <p className="font-semibold text-white">{row.sku}</p>
                    <p>{row.wyrestormDirection}</p>
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
