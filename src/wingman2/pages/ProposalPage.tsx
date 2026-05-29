import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ShieldCheck, Table, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
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
      usb: "Not available",
      distance: "Not available",
      network: "",
      audio: "",
      control: "",
      budget: "Not available",
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
      usb: "Template-defined",
      distance: "Template-defined",
      network: "",
      audio: "",
      control: "",
      budget: "Template-defined",
    };
  }

  const brief = project.discoveryBrief;
  const roomModel = brief?.roomModel ?? {};
  const joinValues = (value: unknown) => (Array.isArray(value) ? value.map((item) => String(item ?? "")).filter(Boolean).join(", ") : String(value || ""));

  return {
    projectTitle: String(roomModel.roomType || project.name || "Project proposal"),
    summary: String(brief?.inference?.summary || "No discovery brief has been saved to this project yet."),
    roomSize: String(roomModel.roomSize || "Not confirmed"),
    displays: String(roomModel.displayArrangement || "Not confirmed"),
    displayCount: String(roomModel.displayCount || ""),
    displayBehaviour: String(roomModel.displayBehaviour || ""),
    sourceCount: String(roomModel.sourceCount || ""),
    usb: String(roomModel.usbTransport || "Not confirmed"),
    distance: String(roomModel.longestRun || "Not confirmed"),
    network: String(roomModel.networkAvailability || ""),
    audio: joinValues(roomModel.audioNeeds),
    control: joinValues(roomModel.controlNeeds),
    budget: String(roomModel.budgetStyle || "Not confirmed"),
  };
}

function salesBomType(value: string | undefined): SalesBomType {
  return value === "Required" || value === "Optional" || value === "Validate" ? value : "Validate";
}

export function ProposalPage() {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const context = useMemo(() => {
    const project = getCurrentWorkflowProject(readProjectStore());
    const profile = getStoredWingmanProfile();
    const discovery = readDiscoveryBrief(project);
    const products = readSelectedProducts(project);
    const ingestUnknowns = project?.ingest?.unknowns ?? [];
    const compareRun = project?.compareRuns?.[0] ?? null;
    const compareWarnings = compareRun?.warnings ?? [];
    const assumptions = [...ingestUnknowns, ...compareWarnings].slice(0, 6);

    return {
      project,
      discovery,
      products,
      profile,
      ingest: project?.ingest,
      compareRun,
      assumptions: assumptions.length ? assumptions : ["Validate final product specifications, accessories, firmware notes, lifecycle, and regional suitability before issue."],
      hasLiveContext: Boolean(project),
    };
  }, []);

  const sections = useMemo(
    () => [
      "Cover",
      "Executive Summary",
      "Sales Motion",
      "Discovered Requirements",
      "Recommended Solution",
      context.products.length ? "Product Shortlist" : "Product Gaps",
      "Assumptions",
      "Contact",
    ],
    [context.products.length],
  );
  const salesReadiness = useMemo(
    () =>
      buildSalesReadinessPackage({
        products: context.products,
        discovery: context.discovery,
        assumptions: context.assumptions,
        ingest: context.ingest,
        compareRun: context.compareRun,
      }),
    [context.assumptions, context.compareRun, context.discovery, context.ingest, context.products],
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
  const hasCoreProducts = context.products.length > 0;
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

  const proposal = useMemo(
    () => ({
      title: context.discovery.projectTitle,
      summary: context.discovery.summary,
      sections,
      products: context.products,
      assumptions: context.assumptions,
      outputPurpose: salesReadiness.outputPurpose,
      governedDependencies: salesReadiness.governedDependencies,
      bomRows,
      evidence: salesReadiness.evidence,
      repGuidance: salesReadiness.repGuidance,
      governanceWarnings: salesReadiness.governanceWarnings,
      validationNotes: salesReadiness.validationNotes,
      readinessScore: salesReadiness.readinessScore,
      companyName: context.profile.companyName,
      preparedBy: context.profile.reportPreparedBy || context.profile.userName,
      proposalFooter: context.profile.proposalFooter,
      companyLogoDataUrl: context.profile.companyLogoDataUrl,
      contactEmail: context.profile.email,
      contactPhone: context.profile.phone,
      updatedAt: new Date().toISOString(),
    }),
    [bomRows, context.assumptions, context.discovery.projectTitle, context.discovery.summary, context.products, context.profile, salesReadiness, sections],
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
      <div className="pb-10">
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
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black text-amber-950">Proposal Builder is inactive</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
                  There is no current project in play. Open or create a project first so the proposal can use only that project's discovery brief, product shortlist, assumptions, BOM rows, and approval notes.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to={routeCatalogByKey.projects.path}
                    className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Open Project Management
                  </Link>

                  <Link
                    to={routeCatalogByKey.discovery.path}
                    className="rounded-full border border-amber-300 bg-white px-5 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Start Discovery
                  </Link>

                  <Link
                    to={routeCatalogByKey.finder.path}
                    className="rounded-full border border-amber-300 bg-white px-5 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
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
        title="Turn requirements into SKUs and BOMs a sales person can present."
        purpose="This page packages competitor replacement, one-off outcome, and full-room tender work into WyreStorm-first outputs with evidence, dependencies, and customer-safe assumptions."
        nextMove="Confirm the sales motion, tighten the assumptions, and finalize the SKU or BOM output for customer presentation or internal approval."
        actions={[
          { label: "Open support", to: routeCatalogByKey.support.path },
          { label: "Back to projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Proposal preview"
        subtitle="Use polished sectioning, recommendation logic, assumptions, and next steps for a customer-presentable SKU or BOM."
        rightSlot={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => exportProposalHtml(proposal, bomRows)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export proposal
            </button>
            <button
              type="button"
              onClick={() => exportBomCsv(proposal, bomRows)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Table className="h-4 w-4" />
              Export BOM
            </button>
            <Link
              to={routeCatalogByKey.support.path}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Request review
            </Link>
            <Link
              to={routeCatalogByKey.projects.path}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Return to project
            </Link>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Sections</p>
            <div className="mt-4 space-y-2 text-sm">
              {sections.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 ${
                    index === 0
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-8 py-10 text-white">
              <p className="wingman-kicker text-slate-400">WyreStorm Wingman proposal</p>
              <h2 className="wingman-display mt-3 text-5xl">{context.discovery.projectTitle}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                {context.discovery.summary}
              </p>
            </div>
            <div className="grid gap-6 p-8 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <div className={`rounded-2xl border p-4 ${
                  !hasCoreProducts
                    ? "border-rose-200 bg-rose-50 text-rose-950"
                    : salesReadiness.reviewRequired
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-emerald-200 bg-emerald-50 text-emerald-950"
                }`}>
                  <p className="wingman-kicker">{readinessLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm leading-6">
                      Readiness score: <span className="font-black">{salesReadiness.readinessScore}%</span>.{" "}
                      {readinessMessage}
                    </p>
                    <Link
                      to={routeCatalogByKey.support.path}
                      className="rounded-full border border-current px-4 py-2 text-sm font-semibold"
                    >
                      Request review
                    </Link>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
                  <p className="wingman-kicker">Output purpose</p>
                  <div className="mt-2 grid gap-4 lg:grid-cols-[220px_1fr]">
                    <div>
                      <p className="text-2xl font-black">{salesReadiness.outputPurpose.motion}</p>
                      <p className="mt-2 text-sm leading-6">{salesReadiness.outputPurpose.summary}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-sky-200 bg-white p-3 text-sm leading-6">
                        {salesReadiness.outputPurpose.customerOutput}
                      </div>
                      <div className="rounded-2xl border border-sky-200 bg-white p-3 text-sm leading-6">
                        {salesReadiness.outputPurpose.nextAction}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="wingman-kicker">Executive summary</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  Room size: {context.discovery.roomSize}. Display behaviour: {context.discovery.displays}. USB requirement:
                  {" "}{context.discovery.usb}. Longest run: {context.discovery.distance}. Budget posture: {context.discovery.budget}.
                </p>
              </div>
              <div>
                <p className="wingman-kicker">Recommended core products</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {context.products.length
                    ? context.products.map((product) => `${product.sku} - ${product.title || product.family || product.category || "Selected product"}`).join("; ")
                    : "No WyreStorm product has been selected yet. Open Product Finder, choose the core product path, and add it to this project before exporting a customer proposal."}
                </p>
              </div>
              <details className="wm-decision-details lg:col-span-2">
                <summary>Dependency governance</summary>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="wingman-kicker">Dependency governance</p>
                      <p className="mt-2 text-sm leading-6">
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
                          <div key={dependency.id} className="rounded-2xl border border-indigo-200 bg-white p-3 text-sm leading-6">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-black text-indigo-950">{dependency.label}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700">
                                  {governanceKind}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                                  {dependency.confidence}
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 font-mono text-xs font-semibold text-indigo-700">{dependency.sku}</p>
                            <p className="mt-2 text-indigo-800">{dependency.trigger}</p>
                            <p className="mt-2 font-semibold text-indigo-950">{dependency.validationQuestion}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-indigo-200 bg-white p-3 text-sm text-indigo-800">
                        No governed dependencies have been triggered yet.
                      </div>
                    )}
                  </div>
                </div>
              </details>

              <div className="lg:col-span-2">
                <p className="wingman-kicker">Bill of materials</p>
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
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
                          <tr key={`${row.item}-${row.sku}`} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-slate-900">{row.sku}</td>
                            <td className="px-4 py-3 text-slate-700">{row.role}</td>
                            <td className="px-4 py-3 text-slate-700">{row.qty}</td>
                            <td className="px-4 py-3 text-slate-700">{row.type}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={4}>
                            No WyreStorm BOM items are selected yet. Open Product Finder and add the required products before exporting.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <details className="wm-decision-details lg:col-span-2">
                <summary>Evidence basis</summary>
                <div className="mt-2 grid gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
                  {salesReadiness.evidence.slice(0, 8).map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-3">
                      {item}
                    </div>
                  ))}
                </div>
              </details>
              <details className="wm-decision-details">
                <summary>Rep guidance</summary>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  {salesReadiness.repGuidance.map((item) => (
                    <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">{item}</li>
                  ))}
                </ul>
              </details>
              <details className="wm-decision-details">
                <summary>Governance / validation</summary>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                  {[...salesReadiness.governanceWarnings.slice(0, 3), ...salesReadiness.validationNotes].map((item) => (
                    <li key={item} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950">{item}</li>
                  ))}
                </ul>
              </details>
              <details className="wm-decision-details lg:col-span-2">
                <summary>Assumptions to validate</summary>
                <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
                  {context.assumptions.map((assumption) => (
                    <li key={assumption} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      {assumption}
                    </li>
                  ))}
                </ul>
              </details>
              <details className="wm-decision-details lg:col-span-2">
                <summary>Recommendation feedback</summary>
                <div className="mt-3 flex flex-wrap gap-3">
                  {feedbackActions.map(({ rating, label, Icon }) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => captureFeedback(rating, label)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                {feedbackMessage ? <p className="mt-3 text-sm font-semibold text-slate-600">{feedbackMessage}</p> : null}
              </details>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
