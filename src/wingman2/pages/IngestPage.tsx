import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { saveIngestAnalysisToProject } from "../data/projectStore";
import { extractDocuments } from "../lib/documentExtract";
import {
  analyzeMultiSkuCompetitorDocument,
  buildMultiSkuResponseDraft,
  type MultiSkuCompetitorAnalysis,
} from "../lib/documentIngest/multiSkuCompetitorIngest";
import type { DocumentSkuTriageRow } from "../lib/documentIngest/skuTriage";
import { analyzeRequirementsText } from "../lib/requirementsParser";

type RequestType = "Email / message" | "RFI / information request" | "Formal RFQ" | "BOM / competitor list" | "Multi-space scope" | "Rough notes";

type IngestAnalysis = {
  requirements: string[];
  unknowns: string[];
  skippedFiles: string[];
  files: string[];
  multiSkuIntelligence?: MultiSkuCompetitorAnalysis;
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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [extractState, setExtractState] = useState<"idle" | "extracting" | "complete" | "error">("idle");
  const [requestType, setRequestType] = useState<RequestType>("Email / message");
  const [pastedText, setPastedText] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showBatchChecks, setShowBatchChecks] = useState(false);
  const [showResponseDraft, setShowResponseDraft] = useState(false);
  const [showDiscoveryQuestions, setShowDiscoveryQuestions] = useState(false);
  const [showIgnoredRows, setShowIgnoredRows] = useState(false);
  const [showBatchQueue, setShowBatchQueue] = useState(false);
  const [selectedTriageRowIds, setSelectedTriageRowIds] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<IngestAnalysis>({
    requirements: [],
    unknowns: ["Paste a customer message, RFQ, RFI, notes or upload readable files to decode the request."],
    skippedFiles: [],
    files: [],
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requestGuidance = useMemo(() => requestTypeGuidance(requestType), [requestType]);
  const requirements = cleanList(analysis.requirements, ["No requirements extracted yet."]);
  const unknowns = cleanList(analysis.unknowns, ["No missing details extracted yet."]);
  const systemShape = useMemo(() => buildSystemShape(analysis.requirements, analysis.unknowns), [analysis.requirements, analysis.unknowns]);
  const multiSkuIntelligence = analysis.multiSkuIntelligence;
  const triage = multiSkuIntelligence?.triage;
  const mainTriageRows = triage?.rows.filter((row) => row.status !== "not_wyrestorm_addressable") ?? [];
  const ignoredTriageRows = triage?.rows.filter((row) => row.status === "not_wyrestorm_addressable") ?? [];
  const selectedTriageRows = triage?.rows.filter((row) => selectedTriageRowIds.includes(row.id) && row.batchCompareEligible) ?? [];

  const analyseText = (text: string, warnings: string[] = [], files: string[] = []) => {
    const parsed = analyzeRequirementsText(text, warnings);
    const structured = analyzeMultiSkuCompetitorDocument(text);
    const multiSku = structured.documentType === "multi_sku_competitor_list" ? structured : undefined;
    const nextAnalysis: IngestAnalysis = {
      requirements: multiSku
        ? [
            `${multiSku.skuCount} competitor SKU(s) detected across ${multiSku.productSets.length} related product sets.`,
            `Manufacturer: ${multiSku.manufacturer}.`,
            `Account/customer: ${multiSku.accountCustomer}.`,
            ...parsed.requirements,
          ]
        : parsed.requirements,
      unknowns: multiSku ? cleanList([...multiSku.quoteRisks, ...parsed.unknowns], multiSku.quoteRisks) : parsed.unknowns,
      skippedFiles: [],
      files,
      multiSkuIntelligence: multiSku,
    };

    if (multiSku) setRequestType("BOM / competitor list");
    setAnalysis(nextAnalysis);
    setSaveMessage("");
    setShowBatchChecks(false);
    setShowResponseDraft(false);
    setShowDiscoveryQuestions(false);
    setShowIgnoredRows(false);
    setShowBatchQueue(false);
    setSelectedTriageRowIds(multiSku?.triage.batchEligibleRowIds ?? []);
    saveIngestAnalysisToProject({
      requirements: nextAnalysis.requirements,
      unknowns: nextAnalysis.unknowns,
      skippedFiles: nextAnalysis.skippedFiles,
      files: nextAnalysis.files,
    }, { requireExistingProject: true });
    setExtractState("complete");
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
    const structured = analyzeMultiSkuCompetitorDocument(combinedText);
    const multiSku = structured.documentType === "multi_sku_competitor_list" ? structured : undefined;
    const nextAnalysis: IngestAnalysis = {
      requirements: multiSku
        ? [
            `${multiSku.skuCount} competitor SKU(s) detected across ${multiSku.productSets.length} related product sets.`,
            `Manufacturer: ${multiSku.manufacturer}.`,
            `Account/customer: ${multiSku.accountCustomer}.`,
            ...parsed.requirements,
          ]
        : parsed.requirements,
      unknowns: multiSku ? cleanList([...multiSku.quoteRisks, ...parsed.unknowns], multiSku.quoteRisks) : parsed.unknowns,
      skippedFiles,
      files: files.map((file) => file.name),
      multiSkuIntelligence: multiSku,
    };

    if (multiSku) setRequestType("BOM / competitor list");
    setAnalysis(nextAnalysis);
    setSaveMessage("");
    setShowBatchChecks(false);
    setShowResponseDraft(false);
    setShowDiscoveryQuestions(false);
    setShowIgnoredRows(false);
    setShowBatchQueue(false);
    setSelectedTriageRowIds(multiSku?.triage.batchEligibleRowIds ?? []);
    saveIngestAnalysisToProject({
      requirements: nextAnalysis.requirements,
      unknowns: nextAnalysis.unknowns,
      skippedFiles: nextAnalysis.skippedFiles,
      files: nextAnalysis.files,
    }, { requireExistingProject: true });
    setExtractState(extractionWarnings.length && !text ? "error" : "complete");
  };

  const runPasteAnalysis = () => {
    analyseText(pastedText, [], selectedFiles);
  };

  const saveMultiSkuOpportunity = () => {
    if (!multiSkuIntelligence) return;
    const eligibleSelectedIds = selectedTriageRowIds.filter((id) =>
      multiSkuIntelligence.triage.rows.some((row) => row.id === id && row.batchCompareEligible));
    const project = saveIngestAnalysisToProject({
      ...analysis,
      multiSkuIntelligence: {
        ...multiSkuIntelligence,
        triage: {
          ...multiSkuIntelligence.triage,
          batchEligibleRowIds: eligibleSelectedIds,
        },
      },
    });
    setSaveMessage(project
      ? `Saved ${eligibleSelectedIds.length} selected candidate row(s) and the full triage context to ${project.name}. Competitor SKUs were not added to the WyreStorm BOM.`
      : "Choose or create an active project before saving this intelligence.");
  };

  const compareLink = (item: DocumentSkuTriageRow) => {
    const params = new URLSearchParams({
      brand: item.brand !== "Not confirmed" ? item.brand : multiSkuIntelligence?.manufacturer ?? "",
      sku: item.sku,
      context: [item.productClass, item.rawItem, item.status, item.wyrestormDirection].filter(Boolean).join(" | "),
      source: "document-ingest-batch",
    });
    return `${routeCatalogByKey.compare.path}?${params.toString()}`;
  };

  const toggleTriageRow = (row: DocumentSkuTriageRow) => {
    if (!row.batchCompareEligible) return;
    setSelectedTriageRowIds((current) => current.includes(row.id)
      ? current.filter((id) => id !== row.id)
      : [...current, row.id]);
  };

  return (
    <div className="pb-8" data-wingman-request-decoder="true">
      <PageHero
        eyebrow="Request Decoder"
        title="Turn emails, RFIs, RFQs, BOMs and rough notes into usable pre-sales direction."
        purpose="Use this when the customer sends something ambiguous. Wingman extracts requirements, unknowns, system shape, response voice and next actions before product selection begins."
        nextMove="Paste or upload the request, choose the request type, review what matters, then continue to Discovery, Compare, Product Finder, Response Pack or Schematic."
        actions={[
          { label: "Open discovery", to: routeCatalogByKey.discovery.path },
          { label: "Create response pack", to: routeCatalogByKey.responsePack.path, variant: "secondary" },
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
                  accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.xlsx,.eml"
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
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Continue</p>
              <div className="mt-4 grid gap-2">
                <Link to={routeCatalogByKey.discovery.path} className="rounded-full border border-cyan-300 px-4 py-2 text-center text-sm font-black text-cyan-100">Open Discovery</Link>
                <Link to={routeCatalogByKey.finder.path} className="rounded-full border border-cyan-300 px-4 py-2 text-center text-sm font-black text-cyan-100">Open Product Finder</Link>
                <Link to={routeCatalogByKey.compare.path} className="rounded-full border border-cyan-300 px-4 py-2 text-center text-sm font-black text-cyan-100">Compare competitor items</Link>
                <Link to={routeCatalogByKey.responsePack.path} className="rounded-full bg-cyan-300 px-4 py-2 text-center text-sm font-black text-slate-950">Create Response Pack</Link>
              </div>
            </article>
          </aside>
        </div>
      </SectionCard>

      {multiSkuIntelligence ? (
        <SectionCard
          title="Multi-SKU competitor intelligence"
          subtitle="Grouped product-set opportunities and quote-safety checks. Competitor SKUs remain reference data and are never added to a WyreStorm BOM."
        >
          <div className="grid gap-4">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Detected document type", multiSkuIntelligence.documentType],
                ["Extracted row count", String(multiSkuIntelligence.triage.extractedRowCount)],
                ["WyreStorm candidate count", String(multiSkuIntelligence.triage.wyrestormCandidateCount)],
                ["Architecture alternative count", String(multiSkuIntelligence.triage.architectureAlternativeCount)],
                ["Accessory / dependency count", String(multiSkuIntelligence.triage.accessoryDependencyCount)],
                ["Ignored / noise count", String(multiSkuIntelligence.triage.ignoredNoiseCount)],
                ["Unknown / review count", String(multiSkuIntelligence.triage.unknownReviewCount)],
                ["Manufacturer / account", `${multiSkuIntelligence.manufacturer} / ${multiSkuIntelligence.accountCustomer}`],
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-[#29465e] bg-[#071522] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">{label}</p>
                  <p className="mt-2 break-words text-sm font-bold text-white">{value}</p>
                </article>
              ))}
            </section>

            {multiSkuIntelligence.senderContext || multiSkuIntelligence.subject ? (
              <section className="rounded-2xl border border-[#29465e] bg-[#071522] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Sender context</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {[multiSkuIntelligence.senderContext, multiSkuIntelligence.subject && `Subject: ${multiSkuIntelligence.subject}`].filter(Boolean).join(" | ")}
                </p>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-3xl border border-[#29465e] bg-[#071522]">
              <div className="border-b border-[#29465e] p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Main candidate table</p>
                <p className="mt-2 text-sm text-white/60">Only governed candidates and architecture alternatives can enter the batch compare queue.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#0d2133] text-xs uppercase tracking-[0.12em] text-cyan-200">
                    <tr>
                      <th className="px-4 py-3">Include</th>
                      <th className="px-4 py-3">Raw item</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3">Product class</th>
                      <th className="px-4 py-3">WyreStorm status</th>
                      <th className="px-4 py-3">WyreStorm SKU / family / direction</th>
                      <th className="px-4 py-3">Match type</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#29465e] text-white/75">
                    {mainTriageRows.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Include ${item.sku || item.rawItem}`}
                            checked={selectedTriageRowIds.includes(item.id)}
                            disabled={!item.batchCompareEligible}
                            onChange={() => toggleTriageRow(item)}
                            className="size-4 accent-cyan-300 disabled:opacity-30"
                          />
                        </td>
                        <td className="min-w-[260px] px-4 py-3">{item.rawItem}</td>
                        <td className="px-4 py-3 font-black text-white">{item.sku || "—"}</td>
                        <td className="px-4 py-3">{item.brand}</td>
                        <td className="min-w-[190px] px-4 py-3">{item.productClass.replace(/-/g, " ")}</td>
                        <td className="min-w-[210px] px-4 py-3 font-bold text-cyan-100">{item.status}</td>
                        <td className="min-w-[280px] px-4 py-3">{item.wyrestormDirection}</td>
                        <td className="px-4 py-3">{item.matchType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">{item.confidence}</td>
                        <td className="min-w-[300px] px-4 py-3">{item.reason}</td>
                        <td className="px-4 py-3">
                          {item.batchCompareEligible && item.sku ? (
                            <Link className="font-black text-cyan-200 underline" to={compareLink(item)}>
                              Compare SKU
                            </Link>
                          ) : item.status === "accessory_dependency" ? (
                            <span className="font-bold text-amber-200">Dependency only</span>
                          ) : (
                            <span className="font-bold text-amber-200">Review required</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-[#29465e] bg-[#071522]">
              <button
                type="button"
                aria-expanded={showIgnoredRows}
                onClick={() => setShowIgnoredRows((current) => !current)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span>
                  <span className="block text-xs font-black uppercase tracking-[0.16em] text-amber-200">Ignored / noisy items</span>
                  <span className="mt-2 block text-sm text-white/60">{ignoredTriageRows.length} row(s) excluded from batch compare; useful context is retained.</span>
                </span>
                <span className="font-black text-cyan-100">{showIgnoredRows ? "Hide" : "Review"}</span>
              </button>
              {showIgnoredRows ? (
                <div className="overflow-x-auto border-t border-[#29465e]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#0d2133] text-xs uppercase tracking-[0.12em] text-cyan-200">
                      <tr>
                        <th className="px-4 py-3">Raw item</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Brand</th>
                        <th className="px-4 py-3">Product class</th>
                        <th className="px-4 py-3">Context</th>
                        <th className="px-4 py-3">Confidence</th>
                        <th className="px-4 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#29465e] text-white/70">
                      {ignoredTriageRows.map((item) => (
                        <tr key={item.id}>
                          <td className="min-w-[260px] px-4 py-3">{item.rawItem}</td>
                          <td className="px-4 py-3">{item.sku || "—"}</td>
                          <td className="px-4 py-3">{item.brand}</td>
                          <td className="px-4 py-3">{item.productClass}</td>
                          <td className="px-4 py-3">{item.retainAsProjectContext ? "Retain" : "Suppress"}</td>
                          <td className="px-4 py-3">{item.confidence}</td>
                          <td className="min-w-[300px] px-4 py-3">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              {multiSkuIntelligence.productSets.map((group) => (
                <article key={group.id} className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Product-set opportunity</p>
                      <h3 className="mt-2 text-lg font-black text-white">{group.title}</h3>
                    </div>
                    <span className="rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-black text-cyan-100">
                      {group.skuCount} SKU{group.skuCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/70">{group.summary}</p>
                  <p className="mt-3 text-sm font-bold leading-6 text-cyan-100">{group.salesDirection}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/45">{group.skus.join(" · ")}</p>
                  {showBatchChecks ? (
                    <ul className="mt-4 space-y-2 text-sm text-white/70">
                      {group.checks.map((check) => <li key={check}>• {check}</li>)}
                    </ul>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">Missing information / quote risks</p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                  {multiSkuIntelligence.quoteRisks.map((risk) => <li key={risk}>• {risk}</li>)}
                </ul>
              </article>
              <article className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Recommended WyreStorm sales directions</p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                  {multiSkuIntelligence.recommendedSalesDirections.map((direction) => <li key={direction}>• {direction}</li>)}
                </ul>
              </article>
            </section>

            <section className="rounded-3xl border border-[#29465e] bg-[#071522] p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Batch actions</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!selectedTriageRows.length}
                  onClick={() => {
                    setShowBatchChecks(true);
                    setShowBatchQueue((current) => !current);
                  }}
                  className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Batch compare selected candidates ({selectedTriageRows.length})
                </button>
                <button type="button" onClick={saveMultiSkuOpportunity} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">
                  Create opportunity from candidates
                </button>
                <button type="button" onClick={() => setShowResponseDraft((current) => !current)} className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">
                  Generate sales response
                </button>
                <button type="button" onClick={() => setShowDiscoveryQuestions((current) => !current)} className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">
                  Generate discovery questions
                </button>
              </div>
              {saveMessage ? <p className="mt-4 text-sm font-bold text-cyan-100">{saveMessage}</p> : null}
              {showBatchQueue ? (
                <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                  <p className="text-sm font-black text-white">Eligible batch compare queue</p>
                  <ul className="mt-3 space-y-2 text-sm text-white/75">
                    {selectedTriageRows.map((row) => (
                      <li key={row.id} className="flex flex-wrap items-center justify-between gap-3">
                        <span>{row.brand} {row.sku} — {row.wyrestormDirection}</span>
                        <Link className="font-black text-cyan-100 underline" to={compareLink(row)}>Open comparison</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {showResponseDraft ? (
                <div className="mt-4 rounded-2xl border border-[#29465e] bg-[#081724] p-4 text-sm leading-6 text-white/75">
                  {buildMultiSkuResponseDraft(multiSkuIntelligence)}
                </div>
              ) : null}
              {showDiscoveryQuestions ? (
                <ul className="mt-4 space-y-2 rounded-2xl border border-[#29465e] bg-[#081724] p-4 text-sm leading-6 text-white/75">
                  {multiSkuIntelligence.discoveryQuestions.map((question) => <li key={question}>• {question}</li>)}
                </ul>
              ) : null}
            </section>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
