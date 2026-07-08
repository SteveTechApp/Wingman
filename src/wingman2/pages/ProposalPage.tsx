import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ShieldCheck, Table, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { WingmanCoachPanel } from "../components/WingmanCoachPanel";
import { ResponsePackContextPanel } from "../components/ResponsePackContextPanel";
import {
  getCurrentWorkflowProject,
  readProjectStore,
  saveProjectProposalToProject,
  saveRecommendationFeedback,
  type StoredProject,
} from "../data/projectStore";
import { exportBomCsv, exportProposalHtml } from "../lib/proposalExport";
import { buildSalesReadinessPackage, type SalesBomRow, type SalesBomType } from "../lib/salesReadiness";
import { getStoredWingmanProfile } from "../data/wingmanProfile";
import { buildWingmanCoachState } from "../lib/wingmanCoach";
import { rankProductsByFamilyScores } from "../lib/productFamilyShortlistRanking";

import TemplateProposalSeedPanel, { hasTemplateProposalSeed } from "../components/TemplateProposalSeedPanel";
const feedbackActions: Array<{
  rating: "accepted" | "needs-review" | "missing-accessory" | "wrong-fit";
  label: string;
  Icon: LucideIcon;
}> = [
  { rating: "accepted", label: "Accepted", Icon: CheckCircle2 },
  { rating: "needs-review", label: "Needs review", Icon: AlertTriangle },
  { rating: "missing-accessory", label: "Missing accessory", Icon: Wrench },
  { rating: "wrong-fit", label: "Wrong fit", Icon: XCircle },
];

function readSelectedProducts(project: StoredProject | null) {
  if (!project) {
    return [];
  }

  if (project.productSelections?.length) {
    return project.productSelections.slice(0, 5);
  }

  return [];
}

function readDiscoveryBrief(project: StoredProject | null) {
  if (!project) {
    return {
      projectTitle: "No active project",
      summary: "Proposal Builder is locked until a project is selected.",
      roomSize: "Not available",
      displays: "Not available",
      displayCount: "",
      displayBehaviour: "Not available",
      sourceCount: "",
      sourceConnection: "",
      signal: "",
      usb: "Not available",
      distance: "Not available",
      network: "",
      audio: "",
      control: "",
      budget: "Not available",
      avoipProfile: "",
      architecture: "",
      nextQuestion: "",
    };
  }

  if (!project.discoveryBrief && project.proposal) {
    return {
      projectTitle: project.proposal.title || project.name,
      summary: project.proposal.summary || "Template boilerplate proposal content.",
      roomSize: "Template-defined",
      displays: "Template-defined",
      displayCount: "",
      displayBehaviour: "Template-defined",
      sourceCount: "",
      sourceConnection: "",
      signal: "",
      usb: "Template-defined",
      distance: "Template-defined",
      network: "",
      audio: "",
      control: "",
      budget: "Template-defined",
      avoipProfile: "",
      architecture: "",
      nextQuestion: "",
    };
  }

  const brief = project.discoveryBrief;
  const roomModel = brief?.roomModel ?? {};
  const joinValues = (value: unknown) => (Array.isArray(value) ? value.map((item) => String(item ?? "")).filter(Boolean).join(", ") : String(value || ""));

  return {
    projectTitle: String(roomModel.roomType || project.name || "Project proposal"),
    summary: String(brief?.inference?.summary || "No discovery brief has been saved to this project yet."),
    roomSize: String(roomModel.roomSize || "Not confirmed"),
    displays: String(
      [
        roomModel.displayCount || roomModel.displays || "",
        roomModel.displayBehaviour || roomModel.displayArrangement || "",
      ].filter(Boolean).join(" - ") || "Not confirmed",
    ),
    displayCount: String(roomModel.displayCount || roomModel.displays || ""),
    displayBehaviour: String(roomModel.displayBehaviour || roomModel.displayArrangement || ""),
    sourceCount: String(roomModel.sourceCount || ""),
    sourceConnection: joinValues(roomModel.sourceConnections || roomModel.sourceTypes),
    signal: String(roomModel.resolutionRequirement || roomModel.signalStandard || "Not confirmed"),
    usb: String(roomModel.usbTransport || "Not confirmed"),
    distance: String(roomModel.longestRun || "Not confirmed"),
    network: String(roomModel.networkAvailability || ""),
    audio: joinValues(roomModel.audioNeeds),
    control: joinValues(roomModel.controlNeeds),
    budget: String(roomModel.budgetStyle || "Not confirmed"),
    avoipProfile: String(roomModel.avoipProfile || roomModel.avoipSeriesHint || ""),
    architecture: String(brief?.inference?.architecture || roomModel.inferredArchitectureDirection || ""),
    nextQuestion: String(brief?.nextBestQuestion || brief?.inference?.nextBestQuestion || ""),
  };
}

function salesBomType(value: string | undefined): SalesBomType {
  return value === "Required" || value === "Optional" || value === "Validate" ? value : "Validate";
}

function openGuruFromProposal(prompt: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wingman:open-guru", { detail: { prompt } }));
}

export function ProposalPageProjectMode() {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const context = useMemo(() => {
    const project = getCurrentWorkflowProject(readProjectStore());
    const profile = getStoredWingmanProfile();
    const discovery = readDiscoveryBrief(project);
    const products = readSelectedProducts(project);
    const ingestUnknowns = project?.ingest?.unknowns ?? [];
    const compareRun = project?.compareRuns?.[0] ?? null;
    const compareWarnings = compareRun?.warnings ?? [];
    const recommendationEvidence = project?.recommendationEvidence ?? project?.discoveryBrief?.recommendationEvidence;
    const evidenceWarnings = recommendationEvidence
      ? [
          recommendationEvidence.quoteSafetyMessage,
          ...recommendationEvidence.missingInformation.map((item) => `Missing for quote: ${item}`),
        ]
      : [];
    const visualContextNotes = (project?.ingest?.visualContext ?? []).map(
      (item) => `Visual context (${item.fileName}): ${item.summary}`,
    );
    const assumptions = [...ingestUnknowns, ...compareWarnings, ...evidenceWarnings, ...visualContextNotes].slice(0, 8);

    return {
      project,
      discovery,
      products,
      profile,
      ingest: project?.ingest,
      compareRun,
      recommendationEvidence,
      assumptions: assumptions.length ? assumptions : ["Validate final product specifications, accessories, firmware notes, lifecycle, and regional suitability before issue."],
      hasLiveContext: Boolean(project),
    };
  }, []);

  const productFamilyScores = useMemo(
    () => context.recommendationEvidence?.productFamilyScores ?? [],
    [context.recommendationEvidence?.productFamilyScores],
  );
  const leadingProductFamilyScore = productFamilyScores[0] ?? null;
  const rankedProducts = useMemo(
    () => rankProductsByFamilyScores(context.products, productFamilyScores),
    [context.products, productFamilyScores],
  );

  const sections = useMemo(
    () => [
      "Cover",
      "Confirmed Requirement",
      "Design Assumptions",
      "Recommended Architecture",
      "Required WyreStorm Products",
      "Optional Enhancements",
      "Risks / Needs Validation",
      "Next Steps",
      "Contact",
    ],
    [],
  );
  const salesReadiness = useMemo(
    () =>
      buildSalesReadinessPackage({
        products: rankedProducts,
        discovery: context.discovery,
        assumptions: context.assumptions,
        ingest: context.ingest,
        compareRun: context.compareRun,
      }),
    [context.assumptions, context.compareRun, context.discovery, context.ingest, rankedProducts],
  );
  const bomRows = useMemo<SalesBomRow[]>(() => {
    if (context.project?.stage === "Templates" && context.project.proposal?.bomRows?.length) {
      return context.project.proposal.bomRows.map((row, index) => ({
        item: index + 1,
        sku: row.sku,
        description: row.description,
        role: row.role,
        qty: row.qty,
        type: salesBomType(row.type),
        status: row.status,
        evidence: row.evidence ?? "Selected from a standalone room template.",
        notes: row.notes,
      }));
    }

    return salesReadiness.bomRows;
  }, [context.project, salesReadiness.bomRows]);
  const proposalCoach = useMemo(
    () =>
      buildWingmanCoachState({
        source: "proposal",
        audience: "dealer",
        discovery: context.discovery,
        selectedProducts: context.products,
        bomRows,
        assumptions: context.assumptions,
        readinessScore: salesReadiness.readinessScore,
        compareRun: context.compareRun,
      }),
    [bomRows, context.assumptions, context.compareRun, context.discovery, context.products, salesReadiness.readinessScore],
  );
  const hasCoreProducts = rankedProducts.length > 0;
  const readinessLabel = !hasCoreProducts
    ? "Not proposal ready"
    : salesReadiness.reviewRequired
      ? "Review required"
      : "Proposal draft readiness";
  const readinessMessage = !hasCoreProducts
    ? "Discovery is saved, but no WyreStorm core products have been selected. Open Product Finder and add the recommended product path before export."
    : salesReadiness.reviewRequired
      ? "Resolve validate items before this is treated as customer-ready."
      : "Suitable for proposal drafting after final validation checks.";
  const topProduct = rankedProducts[0] ?? null;
  const discoverySummaryItems = [
    ["Application", context.discovery.projectTitle],
    ["Sources", [context.discovery.sourceCount, context.discovery.sourceConnection].filter(Boolean).join(" - ")],
    ["Displays", context.discovery.displays || "Not confirmed"],
    ["Signal", context.discovery.signal || "Not confirmed"],
    ["AVoIP fit", context.discovery.avoipProfile || ""],
    ["USB", context.discovery.usb || "Not confirmed"],
    ["Network", context.discovery.network || "Not confirmed"],
    ["Audio", context.discovery.audio || "Not confirmed"],
    ["Control", context.discovery.control || "Not confirmed"],
    ["Architecture", context.discovery.architecture || ""],
  ].filter(([, value]) => Boolean(value));
  const keyValidationItems = useMemo(
    () =>
      Array.from(
        new Set([
          ...(context.recommendationEvidence?.missingInformation.map((item) => `Confirm ${item}.`) ?? []),
          ...salesReadiness.validationNotes,
          ...salesReadiness.governanceWarnings,
        ]),
      ).slice(0, 5),
    [context.recommendationEvidence?.missingInformation, salesReadiness.governanceWarnings, salesReadiness.validationNotes],
  );
  const proposalGuruPrompt = useMemo(() => {
    const leadProduct = topProduct?.sku ? `${topProduct.sku} ${topProduct.title || ""}`.trim() : "no core SKU selected yet";

    return [
      `Explain this proposal simply for a live sales call.`,
      `Project: ${context.discovery.projectTitle}.`,
      `Summary: ${context.discovery.summary}.`,
      `Lead product path: ${leadProduct}.`,
      `Leading product family: ${leadingProductFamilyScore?.family || "not confirmed"}.`,
      `Key validation items: ${(keyValidationItems.slice(0, 3).join(" ")) || "none listed yet"}.`,
      `Help me explain only what matters and what I should ask next.`,
    ].join(" ");
  }, [context.discovery.projectTitle, context.discovery.summary, keyValidationItems, leadingProductFamilyScore?.family, topProduct?.sku, topProduct?.title]);

  const proposal = useMemo(
    () => ({
      title: context.discovery.projectTitle,
      summary: context.discovery.summary,
      sections,
      products: rankedProducts,
      productFamilyScores,
      assumptions: context.assumptions,
      outputPurpose: salesReadiness.outputPurpose,
      governedDependencies: salesReadiness.governedDependencies,
      bomRows,
      evidence: Array.from(new Set([...salesReadiness.evidence, ...(context.recommendationEvidence?.evidenceUsed ?? [])])),
      repGuidance: [
        proposalCoach.playback,
        proposalCoach.nextAction,
        ...(context.recommendationEvidence?.internalGuidance ?? []),
        ...salesReadiness.repGuidance,
      ].slice(0, 10),
      governanceWarnings: Array.from(new Set([
        ...(context.recommendationEvidence?.quoteSafetyStatus === "do-not-quote-yet"
          ? [context.recommendationEvidence.quoteSafetyMessage]
          : []),
        ...salesReadiness.governanceWarnings,
      ])),
      validationNotes: salesReadiness.validationNotes,
      visualBlocks: proposalCoach.visualBlocks,
      readinessScore: salesReadiness.readinessScore,
      companyName: context.profile.companyName,
      preparedBy: context.profile.reportPreparedBy || context.profile.userName,
      proposalFooter: context.profile.proposalFooter,
      companyLogoDataUrl: context.profile.companyLogoDataUrl,
      contactEmail: context.profile.email,
      contactPhone: context.profile.phone,
      updatedAt: new Date().toISOString(),
    }),
    [bomRows, context.assumptions, context.discovery.projectTitle, context.discovery.summary, rankedProducts, context.profile, context.recommendationEvidence, productFamilyScores, proposalCoach, salesReadiness, sections],
  );

  useEffect(() => {
    if (!context.project || !context.hasLiveContext) return;
    saveProjectProposalToProject(proposal);
  }, [context.hasLiveContext, context.project, proposal]);

  function captureFeedback(rating: "accepted" | "needs-review" | "missing-accessory" | "wrong-fit", label: string) {
    const saved = saveRecommendationFeedback(
      {
        scope: "proposal",
        rating,
        label,
        sku: context.products[0]?.sku,
      },
      { requireExistingProject: true },
    );

    setFeedbackMessage(saved ? "Feedback saved to the active project." : "Feedback is available when a project is active.");
  }

  if (!context.project) {
    return (
      <div data-wingman-template-detail-page="true" className="pb-10 wm-ui-page wingman-page-host">
        <PageHero
          eyebrow="Customer Proposal Builder"
          title="Open a project before building a proposal."
          purpose="Proposal Builder is locked until there is an active project. This prevents old discovery notes, standalone shortlists, or unrelated product selections being mixed into a customer proposal."
          nextMove="Open Project Management, choose or create the correct project, then return to Proposal Builder."
          actions={[
            { label: "Open projects", to: routeCatalogByKey.projects.path },
            { label: "Start discovery", to: routeCatalogByKey.discovery.path, variant: "secondary" },
          ]}
        />

        <SectionCard
          title="No active project selected"
          subtitle="Proposal output must belong to a real project before Wingman can create a customer-safe proposal or BOM."
        >
          <div className="rounded-3xl border p-6 wm-ui-card">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl wm-ui-card">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black wm-ui-title">Proposal Builder is inactive</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 wm-ui-copy">
                  There is no current project in play. Open or create a project first so the proposal can use only that project's discovery brief, product shortlist, assumptions, BOM rows, and approval notes.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to={routeCatalogByKey.projects.path}
                    className="rounded-full px-5 py-2 text-sm font-semibold transition wm-ui-card wm-ui-copy"
                  >
                    Open Project Management
                  </Link>

                  <Link
                    to={routeCatalogByKey.discovery.path}
                    className="rounded-full border px-5 py-2 text-sm font-semibold transition wm-ui-card wm-ui-copy"
                  >
                    Start Discovery
                  </Link>

                  <Link
                    to={routeCatalogByKey.finder.path}
                    className="rounded-full border px-5 py-2 text-sm font-semibold transition wm-ui-card wm-ui-copy"
                  >
                    Open Product Finder
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Proposal Builder"
        title="Review the WyreStorm SKU and BOM, then export."
        purpose="The core products and proposal readiness are shown first. Supporting evidence stays collapsed."
        nextMove="Resolve any highlighted blocker, then export the proposal."
      />

      <SectionCard
        title="Proposal preview"
        subtitle="Use polished sectioning, recommendation logic, assumptions, and next steps for a customer-presentable SKU or BOM."
        rightSlot={
          <div className="flex flex-wrap gap-3">
            <button className={["wm-ui-button wm-ui-button-secondary", "inline-flex items-center gap-2 rounded-full border border-[#29465e] px-4 py-2 text-sm text-white/70 transition hover:bg-[#0d2133]"].filter(Boolean).join(" ")}
              type="button"
              onClick={() => exportProposalHtml(proposal, bomRows)}

            >
              <Download className="h-4 w-4" />
              Export proposal
            </button>
            <button className={["wm-ui-button wm-ui-button-secondary", "inline-flex items-center gap-2 rounded-full border border-[#29465e] px-4 py-2 text-sm text-white/70 transition hover:bg-[#0d2133]"].filter(Boolean).join(" ")}
              type="button"
              onClick={() => exportBomCsv(proposal, bomRows)}

            >
              <Table className="h-4 w-4" />
              Export BOM
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="order-0 grid gap-4 xl:grid-cols-2">
            <div className={`rounded-2xl border p-4 ${
              !hasCoreProducts
                ? "border-rose-200 bg-rose-50 text-rose-950"
                : salesReadiness.reviewRequired
                  ? "border-cyan-200 bg-cyan-50 text-cyan-950"
                  : "border-emerald-200 bg-emerald-50 text-emerald-950"
            }`}>
              <p className="wingman-kicker wm-ui-copy wm-ui-kicker">{readinessLabel}</p>
              <p className="mt-2 text-3xl font-black wm-ui-copy">{salesReadiness.readinessScore}%</p>
              <p className="mt-2 text-sm leading-6 wm-ui-copy">{readinessMessage}</p>
            </div>

            <div className="rounded-2xl border p-4 wm-ui-card">
              <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Lead direction</p>
              <p className="mt-2 text-xl font-black wm-ui-copy">{leadingProductFamilyScore?.family || "Core path not confirmed"}</p>
              <p className="mt-2 text-sm leading-6 wm-ui-copy">
                {topProduct
                  ? `${topProduct.sku} - ${topProduct.title || topProduct.family || "Selected core product"}`
                  : "No WyreStorm core product is selected yet. Use Finder before exporting a customer proposal."}
              </p>
            </div>

          </div>

          <div className="order-2 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border p-4 wm-ui-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Only what matters live</p>
                  <p className="mt-1 text-sm leading-6 wm-ui-copy">
                    Keep the sales conversation on the room, the core WyreStorm path, and the blockers that still need confirming.
                  </p>
                </div>
                <button className={["wm-ui-button wm-ui-button-secondary", "rounded-full border border-cyan-300 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-[#12314a]"].filter(Boolean).join(" ")}
                  type="button"
                  onClick={() => openGuruFromProposal(proposalGuruPrompt)}

                >
                  Ask Guru to explain this proposal
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {discoverySummaryItems.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border p-3 wm-ui-card">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#edf6ff] wm-ui-copy">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-4 wm-ui-card">
              <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Validate before issue</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 wm-ui-copy">
                {keyValidationItems.length ? (
                  keyValidationItems.map((item) => (
                    <li key={item} className="rounded-2xl border p-3 wm-ui-card">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border p-3 wm-ui-card">
                    No major validation blockers are currently visible.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="order-1 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border p-4 wm-ui-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Core BOM view</p>
                  <p className="mt-1 text-sm leading-6 wm-ui-copy">Show only the first rows you need for the live conversation.</p>
                </div>
                <button className={["wm-ui-button wm-ui-button-secondary", "rounded-full border border-[#29465e] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-[#12314a]"].filter(Boolean).join(" ")}
                  type="button"
                  onClick={() => openGuruFromProposal(`${proposalGuruPrompt} Explain the BOM rows and dependencies in simple sales language.`)}

                >
                  Ask Guru about BOM
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border wm-template-detail-no-horizontal-scroll wm-ui-card">
                <table className="min-w-full text-left text-sm wm-ui-copy">
                  <thead className="wm-ui-card">
                    <tr>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomRows.length ? (
                      bomRows.slice(0, 5).map((row) => (
                        <tr key={`${row.item}-${row.sku}`} className="border-t wm-ui-card">
                          <td className="px-4 py-3 font-semibold text-[#edf6ff]">{row.sku}</td>
                          <td className="px-4 py-3 text-white/70">{row.role}</td>
                          <td className="px-4 py-3 text-white/70">{row.qty}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-4 text-white/55" colSpan={3}>
                          No WyreStorm BOM items are selected yet. Open Product Finder and add the required products before exporting.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border p-4 wm-ui-card">
              <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Live talk track</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border p-3 text-sm leading-6 wm-ui-card wm-ui-copy">
                  <p className="font-black wm-ui-copy">Sales motion</p>
                  <p className="mt-2 wm-ui-copy">{salesReadiness.outputPurpose.motion}</p>
                </div>
                <div className="rounded-2xl border p-3 text-sm leading-6 wm-ui-card wm-ui-copy">
                  <p className="font-black wm-ui-copy">Customer-safe wording</p>
                  <p className="mt-2 wm-ui-copy">{context.recommendationEvidence?.customerSafeWording?.[0] || "Use the room outcome first, then the WyreStorm path, then the validation point."}</p>
                </div>
                <div className="rounded-2xl border p-3 text-sm leading-6 wm-ui-card wm-ui-copy">
                  <p className="font-black wm-ui-copy">Why this route fits</p>
                  <p className="mt-2 wm-ui-copy">{leadingProductFamilyScore?.reasons?.[0] || "Family path selected from the current recommendation evidence."}</p>
                </div>
              </div>
            </div>
          </div>

          <details className="order-3 wm-decision-details">
            <summary>Open coach and response-pack support</summary>
            <div className="mt-4 grid gap-4">
              <WingmanCoachPanel coach={proposalCoach} compact showFunnel={false} showVisuals />
              <ResponsePackContextPanel />
            </div>
          </details>

          <details className="order-3 wm-decision-details">
            <summary>Open full proposal preview</summary>
            <div className="mt-4 overflow-hidden rounded-3xl border wm-template-detail-no-horizontal-scroll wm-ui-card">
              <div className="px-8 py-8 wm-ui-card">
                <p className="wingman-kicker wm-ui-copy wm-ui-kicker">WyreStorm Wingman proposal</p>
                <h2 className="wingman-display mt-3 text-4xl wm-ui-title">{context.discovery.projectTitle}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 wm-ui-copy">{context.discovery.summary}</p>
              </div>
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div>
                  <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Executive summary</p>
                  <p className="mt-2 text-sm leading-7 wm-ui-copy">
                    Room size: {context.discovery.roomSize}. Display behaviour: {context.discovery.displays}. USB requirement: {context.discovery.usb}. Longest run: {context.discovery.distance}. Budget posture: {context.discovery.budget}.
                  </p>
                </div>
                <div>
                  <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Recommended core products</p>
                  <p className="mt-2 text-sm leading-7 wm-ui-copy">
                    {rankedProducts.length
                      ? rankedProducts.map((product) => `${product.sku} - ${product.title || product.family || product.category || "Selected product"}`).join("; ")
                      : "No WyreStorm product has been selected yet. Open Product Finder, choose the core product path, and add it to this project before exporting a customer proposal."}
                  </p>
                </div>
                <div className="lg:col-span-2">
                  <div className="rounded-2xl border p-4 wm-ui-card">
                    <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Proposal product-family decision</p>
                    {leadingProductFamilyScore ? (
                      <div className="mt-2 grid gap-4 lg:grid-cols-[220px_1fr]">
                        <div>
                          <p className="text-2xl font-black wm-ui-copy">{leadingProductFamilyScore.family}</p>
                          <p className="mt-2 text-sm font-semibold wm-ui-copy">{leadingProductFamilyScore.score}/100 family confidence before SKU selection</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border p-3 text-sm leading-6 wm-ui-card wm-ui-copy">
                            <p className="font-black wm-ui-copy">Why this route fits</p>
                            <p className="mt-2 wm-ui-copy">{leadingProductFamilyScore.reasons[0] || "Family path selected from recommendation evidence."}</p>
                          </div>
                          <div className="rounded-2xl border p-3 text-sm leading-6 wm-ui-card wm-ui-copy">
                            <p className="font-black wm-ui-copy">Validation before proposal issue</p>
                            <p className="mt-2 wm-ui-copy">{leadingProductFamilyScore.cautions[0] || "Validate datasheet, dependencies, firmware, lifecycle, regional suitability and accessories before customer issue."}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 wm-ui-copy">
                        No product-family decision has been stored yet. Rebuild recommendation evidence from Discovery or Finder before issuing a final proposal.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="order-3 wm-decision-details">
            <summary>Open full BOM, governance and evidence</summary>
            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border p-4 wm-ui-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Dependency governance</p>
                    <p className="mt-2 text-sm leading-6 wm-ui-copy">
                      Exact rows come from governed SKU rules; prompt rows show what still needs design validation.
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-indigo-700" />
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {salesReadiness.governedDependencies.length ? (
                    salesReadiness.governedDependencies.slice(0, 6).map((dependency) => {
                      const governanceKind = dependency.governanceKind ?? (dependency.sku.startsWith("TBC-") ? "Prompt" : "Exact");

                      return (
                        <div key={dependency.id} className="rounded-2xl border p-3 text-sm leading-6 wm-ui-card wm-ui-copy">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-black wm-ui-copy">{dependency.label}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full px-2.5 py-1 text-xs font-black wm-ui-card">{governanceKind}</span>
                              <span className="rounded-full px-2.5 py-1 text-xs font-black wm-ui-card">{dependency.confidence}</span>
                            </div>
                          </div>
                          <p className="mt-1 font-mono text-xs font-semibold wm-ui-copy">{dependency.sku}</p>
                          <p className="mt-2 wm-ui-copy">{dependency.trigger}</p>
                          <p className="mt-2 font-semibold wm-ui-copy">{dependency.validationQuestion}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border p-3 text-sm wm-ui-card wm-ui-copy">
                      No governed dependencies have been triggered yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border wm-template-detail-no-horizontal-scroll wm-ui-card">
                <table className="min-w-full text-left text-sm wm-ui-copy">
                  <thead className="wm-ui-card">
                    <tr>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomRows.length ? (
                      bomRows.map((row) => (
                        <tr key={`${row.item}-${row.sku}`} className="border-t wm-ui-card">
                          <td className="px-4 py-3 font-semibold text-[#edf6ff]">{row.sku}</td>
                          <td className="px-4 py-3 text-white/70">{row.role}</td>
                          <td className="px-4 py-3 text-white/70">{row.qty}</td>
                          <td className="px-4 py-3 text-white/70">{row.type}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-4 text-white/55" colSpan={4}>
                          No WyreStorm BOM items are selected yet. Open Product Finder and add the required products before exporting.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-2 text-sm leading-6 md:grid-cols-2 wm-ui-copy">
                {context.recommendationEvidence ? (
                  <div className="rounded-2xl border p-3 wm-ui-card">
                    <p className="font-black wm-ui-copy">Quote safety: {context.recommendationEvidence.quoteSafetyStatus === "quote-ready" ? "Quote-ready draft" : context.recommendationEvidence.quoteSafetyStatus === "validate-before-quote" ? "Validate before quote" : "Do not quote yet"}</p>
                    <p className="mt-1 wm-ui-copy">{context.recommendationEvidence.quoteSafetyMessage}</p>
                  </div>
                ) : null}
                {salesReadiness.evidence.slice(0, 8).map((item) => (
                  <div key={item} className="rounded-2xl border p-3 wm-ui-card">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </details>

          <details className="order-3 wm-decision-details">
            <summary>Open assumptions, sections and feedback</summary>
            <div className="mt-4 grid gap-4 xl:grid-cols-[260px_1fr]">
              <div className="rounded-2xl border p-4 wm-ui-card">
                <p className="text-sm font-semibold text-[#edf6ff] wm-ui-copy">Sections</p>
                <div className="mt-4 space-y-2 text-sm wm-ui-copy">
                  {sections.map((item) => (
                    <div key={item} className="rounded-2xl border px-4 py-3 wm-ui-card">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2 text-sm leading-6 md:grid-cols-2 wm-ui-copy">
                  {context.assumptions.map((assumption) => (
                    <div key={assumption} className="rounded-2xl border p-3 wm-ui-card">
                      {assumption}
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border p-4 wm-ui-card">
                  <p className="wingman-kicker wm-ui-copy wm-ui-kicker">Recommendation feedback</p>
                  <p className="mt-2 text-sm leading-6 wm-ui-copy">
                    Save the rep's outcome on this proposal recommendation so the active project keeps a record of fit, missing items, and review pressure.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {feedbackActions.map(({ rating, label, Icon }) => (
                      <button className={["wm-ui-button wm-ui-button-secondary", "inline-flex items-center gap-2 rounded-full border border-[#29465e] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-[#12314a]"].filter(Boolean).join(" ")}
                        key={rating}
                        type="button"
                        onClick={() => captureFeedback(rating, label)}

                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {feedbackMessage ? <p className="mt-3 text-sm font-semibold wm-ui-copy">{feedbackMessage}</p> : null}
                </div>

              </div>
            </div>
          </details>
        </div>
      </SectionCard>
    </div>
  );
}

function ProposalPage() {
  if (hasTemplateProposalSeed()) {
    return <TemplateProposalSeedPanel />;
  }

  return <ProposalPageProjectMode />;
}

export { ProposalPage };
export default ProposalPage;
