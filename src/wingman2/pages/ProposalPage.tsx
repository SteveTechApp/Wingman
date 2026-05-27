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
  type StoredProductSelection,
} from "../data/projectStore";
import { exportBomCsv, exportProposalHtml } from "../lib/proposalExport";
import { buildSalesReadinessPackage, type SalesBomRow, type SalesBomType } from "../lib/salesReadiness";

type StoredSelection = StoredProductSelection & {
  sku?: string;
  title?: string;
  family?: string;
  category?: string;
};

const PRODUCT_SELECTION_STORE_KEY = "wingman-project-product-selections-v1";
const STANDALONE_SHORTLIST_KEY = "wingman-finder-standalone-shortlist-v1";
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

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readSelectedProducts(project: StoredProject | null) {
  if (project?.productSelections?.length) {
    return project.productSelections.slice(0, 5);
  }

  const standalone = readJson<StoredSelection[]>(STANDALONE_SHORTLIST_KEY, []);
  const byProject = readJson<Record<string, StoredSelection[]>>(PRODUCT_SELECTION_STORE_KEY, {});
  const projectSelections = Object.values(byProject).flat();
  const bySku = new Map<string, StoredSelection>();

  [...standalone, ...projectSelections].forEach((selection) => {
    if (selection?.sku && !bySku.has(selection.sku)) {
      bySku.set(selection.sku, selection);
    }
  });

  return Array.from(bySku.values()).slice(0, 5);
}

function readDiscoveryBrief(project: StoredProject | null) {
  if (!project?.discoveryBrief && project?.proposal) {
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

  const brief =
    project?.discoveryBrief ??
    readJson<{ roomModel?: Record<string, unknown>; inference?: Record<string, unknown> } | null>(
      "wingman-discovery-brief",
      null,
    );
  const roomModel = brief?.roomModel ?? {};
  const joinValues = (value: unknown) => (Array.isArray(value) ? value.map((item) => String(item ?? "")).filter(Boolean).join(", ") : String(value || ""));
  return {
    projectTitle: String(roomModel.roomType || project?.name || "Unqualified AV Opportunity"),
    summary: String(brief?.inference?.summary || "Discovery has not been saved into this proposal yet."),
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
      ingest: project?.ingest,
      compareRun,
      assumptions: assumptions.length ? assumptions : ["Validate final product specifications, accessories, firmware notes, lifecycle, and regional suitability before issue."],
      hasLiveContext: Boolean(project || products.length || discovery.summary !== "Discovery has not been saved into this proposal yet."),
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
      updatedAt: new Date().toISOString(),
    }),
    [bomRows, context.assumptions, context.discovery.projectTitle, context.discovery.summary, context.products, salesReadiness, sections],
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
                  salesReadiness.reviewRequired
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950"
                }`}>
                  <p className="wingman-kicker">{salesReadiness.reviewRequired ? "Review required" : "Proposal draft readiness"}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm leading-6">
                      Readiness score: <span className="font-black">{salesReadiness.readinessScore}%</span>.{" "}
                      {salesReadiness.reviewRequired
                        ? "Resolve validate items before this is treated as customer-ready."
                        : "Suitable for proposal drafting after final validation checks."}
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
                    : "No product shortlist has been carried into the proposal yet. Add products from Finder before customer export."}
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
                            No WyreStorm BOM items are selected yet.
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
