import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  ShieldCheck,
  Table,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
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

type FeedbackRating = "accepted" | "needs-review" | "missing-accessory" | "wrong-fit";

const PRODUCT_SELECTION_STORE_KEY = "wingman-project-product-selections-v1";
const STANDALONE_SHORTLIST_KEY = "wingman-finder-standalone-shortlist-v1";

const feedbackActions: Array<{
  rating: FeedbackRating;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    rating: "accepted",
    label: "Accepted",
    description: "Record that the proposal direction is suitable.",
    Icon: CheckCircle2,
  },
  {
    rating: "needs-review",
    label: "Needs review",
    description: "Flag for pre-sales or design validation.",
    Icon: AlertTriangle,
  },
  {
    rating: "missing-accessory",
    label: "Missing accessory",
    description: "Flag a missing receiver, cable, PSU, mount or dependency.",
    Icon: Wrench,
  },
  {
    rating: "wrong-fit",
    label: "Wrong fit",
    description: "Record that the recommendation is not suitable.",
    Icon: XCircle,
  },
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
  const joinValues = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => String(item ?? "")).filter(Boolean).join(", ") : String(value || "");

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

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="proposal-clean-info-block">
      <p className="proposal-clean-kicker">{title}</p>
      <div>{children}</div>
    </section>
  );
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
      assumptions: assumptions.length
        ? assumptions
        : ["Validate final product specifications, accessories, firmware notes, lifecycle, and regional suitability before issue."],
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

  function captureFeedback(rating: FeedbackRating, label: string) {
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
    <main className="proposal-clean-shell">
      <section className="proposal-clean-hero">
        <div>
          <p className="proposal-clean-eyebrow">Customer Proposal Builder</p>
          <h1>Turn requirements into SKUs and BOMs a sales person can present.</h1>
          <p>
            Package discovery, product selection, assumptions, governance and sales guidance into a clearer
            customer-safe proposal preview.
          </p>
        </div>

        <div className="proposal-clean-actions">
          <Link className="proposal-clean-button secondary" to={routeCatalogByKey.support.path}>
            Open support
          </Link>
          <Link className="proposal-clean-button secondary" to={routeCatalogByKey.projects.path}>
            Back to projects
          </Link>
        </div>
      </section>

      <section className="proposal-clean-toolbar">
        <div>
          <p className="proposal-clean-eyebrow">Proposal preview</p>
          <h2>Readable draft output</h2>
          <p>Review the sales motion, recommended products, BOM, evidence and assumptions before export.</p>
        </div>

        <div className="proposal-clean-actions">
          <button type="button" className="proposal-clean-button secondary" onClick={() => exportProposalHtml(proposal, bomRows)}>
            <Download className="proposal-clean-button-icon" />
            Export proposal
          </button>
          <button type="button" className="proposal-clean-button secondary" onClick={() => exportBomCsv(proposal, bomRows)}>
            <Table className="proposal-clean-button-icon" />
            Export BOM
          </button>
          <Link className="proposal-clean-button primary" to={routeCatalogByKey.projects.path}>
            Return to project
          </Link>
        </div>
      </section>

      <section className="proposal-clean-layout">
        <aside className="proposal-clean-sections">
          <p className="proposal-clean-kicker">Sections</p>
          <div>
            {sections.map((item, index) => (
              <button key={item} type="button" className={index === 0 ? "is-active" : ""}>
                {item}
              </button>
            ))}
          </div>
        </aside>

        <article className="proposal-clean-document">
          <header className="proposal-clean-cover">
            <p>WyreStorm Wingman proposal</p>
            <h2>{context.discovery.projectTitle}</h2>
            <span>{context.discovery.summary}</span>
          </header>

          <div className="proposal-clean-document-body">
            <section className={salesReadiness.reviewRequired ? "proposal-clean-readiness warning" : "proposal-clean-readiness good"}>
              <div>
                <p className="proposal-clean-kicker">
                  {salesReadiness.reviewRequired ? "Review required" : "Proposal draft readiness"}
                </p>
                <strong>{salesReadiness.readinessScore}% readiness</strong>
                <span>
                  {salesReadiness.reviewRequired
                    ? "Resolve validate items before treating this as customer-ready."
                    : "Suitable for proposal drafting after final validation checks."}
                </span>
              </div>

              <Link to={routeCatalogByKey.support.path}>Request review</Link>
            </section>

            <section className="proposal-clean-output">
              <p className="proposal-clean-kicker">Output purpose</p>
              <div>
                <div>
                  <strong>{salesReadiness.outputPurpose.motion}</strong>
                  <span>{salesReadiness.outputPurpose.summary}</span>
                </div>
                <div>{salesReadiness.outputPurpose.customerOutput}</div>
                <div>{salesReadiness.outputPurpose.nextAction}</div>
              </div>
            </section>

            <section className="proposal-clean-two-col">
              <InfoBlock title="Executive summary">
                <p>
                  Room size: {context.discovery.roomSize}. Display behaviour: {context.discovery.displays}. USB requirement:{" "}
                  {context.discovery.usb}. Longest run: {context.discovery.distance}. Budget posture: {context.discovery.budget}.
                </p>
              </InfoBlock>

              <InfoBlock title="Recommended core products">
                <p>
                  {context.products.length
                    ? context.products
                        .map((product) => `${product.sku} - ${product.title || product.family || product.category || "Selected product"}`)
                        .join("; ")
                    : "No product shortlist has been carried into the proposal yet. Add products from Finder before customer export."}
                </p>
              </InfoBlock>
            </section>

            <section className="proposal-clean-governance">
              <div className="proposal-clean-governance-head">
                <div>
                  <p className="proposal-clean-kicker">Dependency governance</p>
                  <span>Exact rows come from governed SKU rules. Prompt rows show what still needs validation.</span>
                </div>
                <ShieldCheck />
              </div>

              <div className="proposal-clean-governance-grid">
                {salesReadiness.governedDependencies.length ? (
                  salesReadiness.governedDependencies.slice(0, 6).map((dependency) => {
                    const governanceKind = dependency.governanceKind ?? (dependency.sku.startsWith("TBC-") ? "Prompt" : "Exact");

                    return (
                      <div key={dependency.id} className="proposal-clean-governance-card">
                        <div>
                          <strong>{dependency.label}</strong>
                          <span>{governanceKind}</span>
                        </div>
                        <p>{dependency.sku}</p>
                        <small>{dependency.validationQuestion}</small>
                      </div>
                    );
                  })
                ) : (
                  <div className="proposal-clean-governance-card">
                    <div>
                      <strong>Core WyreStorm selection</strong>
                      <span>Low</span>
                    </div>
                    <p>TBC-CORE-SOLUTION</p>
                    <small>No WyreStorm product has been selected yet. Confirm the outcome, signal path and architecture.</small>
                  </div>
                )}
              </div>
            </section>

            <section>
              <p className="proposal-clean-kicker">Bill of materials</p>
              <div className="proposal-clean-table-wrap">
                <table className="proposal-clean-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Role</th>
                      <th>Qty</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomRows.length ? (
                      bomRows.map((row) => (
                        <tr key={`${row.item}-${row.sku}`}>
                          <td>{row.sku}</td>
                          <td>{row.role}</td>
                          <td>{row.qty}</td>
                          <td>{row.type}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>No WyreStorm BOM items are selected yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="proposal-clean-two-col">
              <InfoBlock title="Evidence basis">
                <ul>
                  {salesReadiness.evidence.slice(0, 8).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </InfoBlock>

              <InfoBlock title="Rep guidance">
                <ul>
                  {salesReadiness.repGuidance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </InfoBlock>
            </section>

            <section className="proposal-clean-two-col">
              <InfoBlock title="Governance / validation">
                <ul>
                  {[...salesReadiness.governanceWarnings.slice(0, 3), ...salesReadiness.validationNotes].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </InfoBlock>

              <InfoBlock title="Assumptions to validate">
                <ul>
                  {context.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </InfoBlock>
            </section>

            <section>
              <p className="proposal-clean-kicker">Recommendation feedback</p>
              <div className="proposal-clean-feedback-grid">
                {feedbackActions.map(({ rating, label, description, Icon }) => (
                  <button key={rating} type="button" onClick={() => captureFeedback(rating, label)}>
                    <Icon />
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </button>
                ))}
              </div>
              {feedbackMessage ? <p className="proposal-clean-feedback-message">{feedbackMessage}</p> : null}
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}