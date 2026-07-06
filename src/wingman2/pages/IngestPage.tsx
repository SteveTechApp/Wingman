import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
type BulkResultTab = "products" | "opportunities" | "guidance" | "source";

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
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [extractState, setExtractState] = useState<"idle" | "extracting" | "complete" | "error">("idle");
  const [requestType, setRequestType] = useState<RequestType>("Email / message");
  const [pastedText, setPastedText] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showResponseDraft, setShowResponseDraft] = useState(false);
  const [showDiscoveryQuestions, setShowDiscoveryQuestions] = useState(false);
  const [showIgnoredRows, setShowIgnoredRows] = useState(false);
  const [showBatchQueue, setShowBatchQueue] = useState(false);
  const [selectedTriageRowIds, setSelectedTriageRowIds] = useState<string[]>([]);
  const [bulkResultTab, setBulkResultTab] = useState<BulkResultTab>("products");
  const [showSourceWorkspace, setShowSourceWorkspace] = useState(false);
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
    setShowResponseDraft(false);
    setShowDiscoveryQuestions(false);
    setShowIgnoredRows(false);
    setShowBatchQueue(false);
    setSelectedTriageRowIds(multiSku?.triage.batchEligibleRowIds ?? []);
    setBulkResultTab("products");
    setShowSourceWorkspace(false);
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
    setShowResponseDraft(false);
    setShowDiscoveryQuestions(false);
    setShowIgnoredRows(false);
    setShowBatchQueue(false);
    setSelectedTriageRowIds(multiSku?.triage.batchEligibleRowIds ?? []);
    setBulkResultTab("products");
    setShowSourceWorkspace(false);
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
    return project;
  };

  const continueBulkToProposal = () => {
    const project = saveMultiSkuOpportunity();
    if (project) navigate(routeCatalogByKey.proposal.path);
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
    <div className="flex flex-col pb-8" data-wingman-request-decoder="true">
      <div className="order-0">
        {multiSkuIntelligence ? (
          <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-500/30 bg-slate-900 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Bulk enquiry ready</p>
              <h1 className="mt-1 text-2xl font-black text-white">
                {multiSkuIntelligence.triage.wyrestormCandidateCount + multiSkuIntelligence.triage.architectureAlternativeCount} product opportunities for {multiSkuIntelligence.accountCustomer}
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Products are shown first. Supporting analysis is available in the tabs below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowSourceWorkspace((current) => !current)}
                className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
              >
                {showSourceWorkspace ? "Hide source" : "Review source"}
              </button>
              <button
                type="button"
                onClick={continueBulkToProposal}
                disabled={!selectedTriageRows.length}
                className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to proposal
              </button>
            </div>
          </section>
        ) : (
          <PageHero
            eyebrow="Request Decoder"
            title="Turn emails, RFIs, RFQs, BOMs and rough notes into usable pre-sales direction."
            purpose="Use this when the customer sends something ambiguous. Wingman extracts requirements, unknowns, system shape, response voice and next actions before product selection begins."
            nextMove="Paste or upload the request, choose the request type, then review the extracted products."
          />
        )}
      </div>

      {(!multiSkuIntelligence || showSourceWorkspace) ? (
      <div className={multiSkuIntelligence ? "order-2 mt-4" : "order-1"}>
      <SectionCard
        title="Decode the incoming request"
        subtitle={multiSkuIntelligence ? "Supporting source text and extraction details." : "Start with the customer communication, not a product assumption."}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-cyan-300">Request type</span>
                <select
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value as RequestType)}
                  className="min-h-11 rounded-2xl border border-slate-700 bg-slate-800 px-3 text-sm font-semibold text-white"
                >
                  {requestTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-cyan-300">Paste customer wording</span>
                <textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  placeholder="Paste the email, RFQ text, notes, BOM lines or customer message here."
                  className="min-h-[220px] rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm leading-6 text-white outline-none focus:border-cyan-300"
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

              <div className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-4">
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
            <article className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Extracted requirements</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {requirements.slice(0, 10).map((requirement, index) => (
                  <li key={`${requirement}-${index}`} className="rounded-2xl border border-slate-700 bg-slate-950 p-3">
                    {requirement}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Likely system shape</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{systemShape}</p>
            </article>
          </section>

          <aside className="grid gap-4">
            <article className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-200">{requestGuidance.title}</p>
              <h2 className="mt-2 text-xl font-black text-white">Correct response voice</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">{requestGuidance.voice}</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{requestGuidance.output}</p>
            </article>

            <article className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Unknowns / next actions</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-white/75">
                {unknowns.slice(0, 10).map((unknown, index) => (
                  <li key={`${unknown}-${index}`} className="rounded-2xl border border-slate-700 bg-slate-950 p-3">
                    {unknown}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Continue</p>
              <div className="mt-4 grid gap-2">
                {multiSkuIntelligence ? (
                  <button type="button" onClick={continueBulkToProposal} className="rounded-full bg-cyan-300 px-4 py-2 text-center text-sm font-black text-slate-950">
                    Continue to proposal
                  </button>
                ) : (
                  <>
                    <Link to={routeCatalogByKey.discovery.path} className="rounded-full border border-cyan-300 px-4 py-2 text-center text-sm font-black text-cyan-100">Open Discovery</Link>
                    <Link to={routeCatalogByKey.responsePack.path} className="rounded-full bg-cyan-300 px-4 py-2 text-center text-sm font-black text-slate-950">Create Response Pack</Link>
                  </>
                )}
              </div>
            </article>
          </aside>
        </div>
      </SectionCard>
      </div>
      ) : null}

      {multiSkuIntelligence ? (
        <div className="order-1">
          <SectionCard
            title="Products from this bulk enquiry"
            subtitle="Select the product opportunities to carry into the proposal. Supporting detail is separated into tabs."
          >
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Bulk enquiry result sections">
                  {([
                    ["products", `Products (${mainTriageRows.length})`],
                    ["opportunities", `Product groups (${multiSkuIntelligence.productSets.length})`],
                    ["guidance", "Risks & response"],
                    ["source", "Source details"],
                  ] as Array<[BulkResultTab, string]>).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={bulkResultTab === tab}
                      onClick={() => setBulkResultTab(tab)}
                      className={bulkResultTab === tab
                        ? "rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
                        : "rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-white/70"}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={continueBulkToProposal}
                  disabled={!selectedTriageRows.length}
                  className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue to proposal
                </button>
              </div>

              {bulkResultTab === "products" ? (
                <>
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["Selected", String(selectedTriageRows.length)],
                      ["Candidates", String(multiSkuIntelligence.triage.wyrestormCandidateCount)],
                      ["Architecture", String(multiSkuIntelligence.triage.architectureAlternativeCount)],
                      ["Dependencies", String(multiSkuIntelligence.triage.accessoryDependencyCount)],
                      ["Needs review", String(multiSkuIntelligence.triage.unknownReviewCount)],
                    ].map(([label, value]) => (
                      <article key={label} className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-widest text-cyan-300">{label}</p>
                        <p className="mt-1 text-xl font-black text-white">{value}</p>
                      </article>
                    ))}
                  </section>

                  <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900">
                    <div className="border-b border-slate-700 px-4 py-3">
                      <p className="text-sm font-black text-white">Product selection</p>
                      <p className="mt-1 text-sm text-white/55">Detailed evidence stays behind each product row.</p>
                    </div>
                    <div className="max-h-96 overflow-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-xs uppercase tracking-widest text-cyan-200">
                          <tr>
                            <th className="px-4 py-3">Include</th>
                            <th className="px-4 py-3">Competitor product</th>
                            <th className="px-4 py-3">WyreStorm direction</th>
                            <th className="px-4 py-3">Confidence</th>
                            <th className="px-4 py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 text-white/75">
                          {mainTriageRows.map((item) => (
                            <tr key={item.id} className="align-top">
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
                              <td className="min-w-64 px-4 py-3">
                                <p className="font-black text-white">{item.sku || item.rawItem}</p>
                                <p className="mt-1 text-xs text-white/55">{item.brand} · {item.productClass.replace(/-/g, " ")}</p>
                                <details className="mt-2 text-xs text-white/55">
                                  <summary className="cursor-pointer font-bold text-cyan-200">Product details</summary>
                                  <div className="mt-2 max-w-xl space-y-1 rounded-xl border border-slate-700 bg-slate-950 p-3">
                                    <p><strong>Raw item:</strong> {item.rawItem}</p>
                                    <p><strong>Match type:</strong> {item.matchType.replace(/_/g, " ")}</p>
                                    <p><strong>Reason:</strong> {item.reason}</p>
                                  </div>
                                </details>
                              </td>
                              <td className="min-w-72 px-4 py-3">
                                <p className="font-bold text-cyan-100">{item.wyrestormDirection}</p>
                                <p className="mt-1 text-xs text-white/50">{item.status.replace(/_/g, " ")}</p>
                              </td>
                              <td className="px-4 py-3 capitalize">{item.confidence}</td>
                              <td className="px-4 py-3">
                                {item.batchCompareEligible && item.sku ? (
                                  <Link className="font-black text-cyan-200 underline" to={compareLink(item)}>Compare</Link>
                                ) : item.status === "accessory_dependency" ? (
                                  <span className="font-bold text-amber-200">Dependency only</span>
                                ) : (
                                  <span className="font-bold text-amber-200">Review</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                    <div>
                      <p className="text-sm font-black text-white">Ignored / noisy items</p>
                      <p className="mt-1 text-sm text-white/55">{ignoredTriageRows.length} row(s) excluded from product selection.</p>
                    </div>
                    <button
                      type="button"
                      aria-expanded={showIgnoredRows}
                      onClick={() => setShowIgnoredRows((current) => !current)}
                      className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100"
                    >
                      {showIgnoredRows ? "Hide ignored items" : "Review ignored items"}
                    </button>
                  </section>

                  {showIgnoredRows ? (
                    <section className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-800 text-xs uppercase tracking-widest text-cyan-200">
                          <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Class</th>
                            <th className="px-4 py-3">Context</th>
                            <th className="px-4 py-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 text-white/70">
                          {ignoredTriageRows.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3">{item.sku || item.rawItem}</td>
                              <td className="px-4 py-3">{item.productClass}</td>
                              <td className="px-4 py-3">{item.retainAsProjectContext ? "Retain" : "Suppress"}</td>
                              <td className="max-w-xl px-4 py-3">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  ) : null}

                  <section className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!selectedTriageRows.length}
                      onClick={() => setShowBatchQueue((current) => !current)}
                      className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100 disabled:opacity-40"
                    >
                      Review selected comparisons ({selectedTriageRows.length})
                    </button>
                    <button type="button" onClick={saveMultiSkuOpportunity} className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">
                      Save opportunity
                    </button>
                    <button type="button" onClick={continueBulkToProposal} className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-black text-slate-950">
                      Continue to proposal
                    </button>
                  </section>

                  {saveMessage ? <p className="text-sm font-bold text-cyan-100">{saveMessage}</p> : null}
                  {showBatchQueue ? (
                    <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <p className="text-sm font-black text-white">Selected comparison queue</p>
                      <ul className="mt-3 grid gap-2 md:grid-cols-2">
                        {selectedTriageRows.map((row) => (
                          <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 p-3 text-sm text-white/75">
                            <span>{row.brand} {row.sku}</span>
                            <Link className="font-black text-cyan-100 underline" to={compareLink(row)}>Compare</Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </>
              ) : null}

              {bulkResultTab === "opportunities" ? (
                <section className="grid gap-3 lg:grid-cols-2">
                  {multiSkuIntelligence.productSets.map((group) => (
                    <article key={group.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-black text-white">{group.title}</h3>
                        <span className="rounded-full border border-cyan-500/30 px-2 py-1 text-xs font-black text-cyan-100">{group.skuCount} SKU</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/65">{group.summary}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-cyan-100">{group.salesDirection}</p>
                      <details className="mt-3 text-sm text-white/60">
                        <summary className="cursor-pointer font-bold text-cyan-200">Checks and included SKUs</summary>
                        <p className="mt-2">{group.skus.join(" · ")}</p>
                        <ul className="mt-2 space-y-1">{group.checks.map((check) => <li key={check}>• {check}</li>)}</ul>
                      </details>
                    </article>
                  ))}
                </section>
              ) : null}

              {bulkResultTab === "guidance" ? (
                <div className="grid gap-4">
                  <section className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-amber-200">Quote risks</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-white/75">{multiSkuIntelligence.quoteRisks.map((risk) => <li key={risk}>• {risk}</li>)}</ul>
                    </article>
                    <article className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Sales directions</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-white/75">{multiSkuIntelligence.recommendedSalesDirections.map((direction) => <li key={direction}>• {direction}</li>)}</ul>
                    </article>
                  </section>
                  <section className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setShowResponseDraft((current) => !current)} className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">Generate sales response</button>
                    <button type="button" onClick={() => setShowDiscoveryQuestions((current) => !current)} className="rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">Generate discovery questions</button>
                  </section>
                  {showResponseDraft ? <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white/75">{buildMultiSkuResponseDraft(multiSkuIntelligence)}</div> : null}
                  {showDiscoveryQuestions ? <ul className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white/75">{multiSkuIntelligence.discoveryQuestions.map((question) => <li key={question}>• {question}</li>)}</ul> : null}
                </div>
              ) : null}

              {bulkResultTab === "source" ? (
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Document type", multiSkuIntelligence.documentType],
                    ["Extracted rows", String(multiSkuIntelligence.triage.extractedRowCount)],
                    ["Ignored rows", String(multiSkuIntelligence.triage.ignoredNoiseCount)],
                    ["Manufacturer / account", `${multiSkuIntelligence.manufacturer} / ${multiSkuIntelligence.accountCustomer}`],
                  ].map(([label, value]) => (
                    <article key={label} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-cyan-300">{label}</p>
                      <p className="mt-2 text-sm font-bold text-white">{value}</p>
                    </article>
                  ))}
                  <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4 md:col-span-2 xl:col-span-4">
                    <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Sender context</p>
                    <p className="mt-2 text-sm text-white/65">{[multiSkuIntelligence.senderContext, multiSkuIntelligence.subject && `Subject: ${multiSkuIntelligence.subject}`].filter(Boolean).join(" | ") || "No sender context detected."}</p>
                    <button type="button" onClick={() => setShowSourceWorkspace(true)} className="mt-3 rounded-full border border-cyan-300 px-4 py-2 text-sm font-black text-cyan-100">Open source workspace</button>
                  </article>
                </section>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
