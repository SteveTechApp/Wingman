import { startTransition, useMemo, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import type { WingmanShellInput } from "@/features/wingmanUx/types";
import { useWingmanUxPipeline } from "@/features/wingmanUx/useWingmanUxPipeline";
import { loadProposal } from "@/proposal/bom/persist";

type ProposalStage = "architecture" | "bom" | "proposal";

const STAGES: Array<{ id: ProposalStage; title: string; copy: string }> = [
  {
    id: "architecture",
    title: "Architecture",
    copy: "Validate the family, transport, and signal path before moving into commercial detail.",
  },
  {
    id: "bom",
    title: "Bill of Materials",
    copy: "Review the generated hardware set and any saved proposal lines together.",
  },
  {
    id: "proposal",
    title: "Proposal Output",
    copy: "Keep the client-facing narrative separate from the design detail so the page stays readable.",
  },
];

function normalizeStage(value: string | null): ProposalStage {
  return value === "bom" || value === "proposal" ? value : "architecture";
}

function normalizeNodeName(name: string) {
  if (/^Source \d+$/i.test(name)) return "Video Source";
  if (/^Encoder \d+$/i.test(name)) return "AVoIP Transmitter";
  if (/^Decoder \d+$/i.test(name)) return "AVoIP Receiver";
  return name;
}

function groupSignalLinks(links: Array<{ from: string; to: string }>) {
  const map = new Map<string, Set<string>>();

  for (const link of links) {
    const from = normalizeNodeName(link.from);
    const to = normalizeNodeName(link.to);
    if (!map.has(from)) map.set(from, new Set<string>());
    map.get(from)?.add(to);
  }

  return Array.from(map.entries()).map(([from, values]) => ({
    from,
    to: Array.from(values),
  }));
}

function buildProjectState(project: StoredProject | undefined): WingmanShellInput {
  return {
    projectName: project?.name ?? "New Wingman Project",
    customer: project?.customer ?? "",
    roomType: project?.roomName ?? "",
    application: project?.discovery?.applicationType ?? "",
    sourceCount: Number(project?.discovery?.sourceCount ?? 0) || 0,
    displayCount: Number(project?.discovery?.displayCount ?? 0) || 0,
    distanceM: Number(project?.discovery?.cableDistanceM ?? 0) || 0,
    resolution: project?.discovery?.signalFormats ?? "",
    notes: project?.discovery?.notes ?? project?.notes ?? "",
    avGuide: {
      usb: project?.discovery?.usbNeeds ?? "",
      audio: project?.discovery?.audioNeeds ?? "",
      control: project?.discovery?.controlNeeds ?? "",
    },
    videoWall: {
      wallType:
        project?.discovery?.workflowTrack?.toLowerCase().includes("wall")
          ? "Video Wall"
          : "",
    },
  };
}

export default function ProposalPage() {
  const project = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const stage = normalizeStage(searchParams.get("stage"));
  const stageMeta = STAGES.find((item) => item.id === stage) ?? STAGES[0];
  const projectState = useMemo(() => buildProjectState(project), [project]);
  const pipeline = useWingmanUxPipeline(projectState);
  const savedProposal = project?.id ? loadProposal(project.id) : null;

  const groupedLinks = useMemo(
    () =>
      groupSignalLinks(
        Array.isArray(pipeline?.signalPath?.links) ? pipeline.signalPath.links : [],
      ),
    [pipeline?.signalPath?.links],
  );

  function goToStage(nextStage: ProposalStage) {
    startTransition(() => {
      setSearchParams({ stage: nextStage });
    });
  }

  if (!project) {
    return (
      <SplitWorkspaceFrame
        title="Proposal Workspace"
        subtitle="Architecture, BOM, and proposal output all read from the active project. Start from a project shell first."
        leftTitle="Project Status"
        rightTitle="Next Step"
        left={
          <div className="wm-workspace-stack">
            <div className="wm-start-step">
              Create or select a project before opening the proposal workspace.
            </div>
          </div>
        }
        right={
          <div className="wm-workspace-stack">
            <div className="wm-workspace-empty">
              No active project is selected, so there is nothing to render yet.
            </div>
          </div>
        }
        top={
          <div className="wm-workspace-action-row">
            <Link to={WM_ROUTES.projectLauncher} className="wm-btn-primary">
              Open Project Launcher
            </Link>
          </div>
        }
      />
    );
  }

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">
        Keep the stage controls on the left and the generated output on the right so the commercial view never hides the technical basis.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Proposal stages</h3>
          <p className="wm-workspace-card__copy">Work one output layer at a time instead of stacking architecture, BOM, and proposal content into one long page.</p>
        </div>

        <div className="wm-workspace-list">
          {STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === stage}
              className={`wm-workspace-list-item${item.id === stage ? " wm-workspace-list-item--active" : ""}`}
              onClick={() => goToStage(item.id)}
            >
              <span className="wm-workspace-list-item__title">{item.title}</span>
              <span className="wm-workspace-list-item__copy">{item.copy}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Project snapshot</h3>
          <p className="wm-workspace-card__copy">The pipeline on the right is reading directly from the active project state.</p>
        </div>

        <div className="wm-workspace-list">
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__title">{project.name}</span>
            <span className="wm-workspace-list-item__copy">
              {project.customer ? `${project.customer} | ` : ""}{project.roomName || "Room not named yet"}
            </span>
          </div>
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__title">Application</span>
            <span className="wm-workspace-list-item__copy">
              {project.discovery?.applicationType || project.discovery?.workflowTrack || "Not defined yet"}
            </span>
          </div>
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__title">Notes</span>
            <span className="wm-workspace-list-item__copy">
              {project.discovery?.notes || project.notes || "No project notes yet."}
            </span>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Sources</span>
            <strong>{projectState.sourceCount || 0}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Displays</span>
            <strong>{projectState.displayCount || 0}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Distance</span>
            <strong>{projectState.distanceM ? `${projectState.distanceM}m` : "Not set"}</strong>
          </div>
        </div>

        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Primary family</span>
            <strong>{pipeline?.recommendation?.primaryFamily || "Running"}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Confidence</span>
            <strong>{pipeline?.recommendation?.confidenceLabel || "Pending"}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Next tool</span>
            <strong>{pipeline?.room?.nextTool || "Pending"}</strong>
          </div>
        </div>

        <div className="wm-next-step">
          Use the left side to switch stages. Keep the right side reserved for the output the user is reviewing right now.
        </div>
      </section>
    </div>
  );

  const architectureView = pipeline ? (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Recommended architecture</h3>
          <p className="wm-workspace-card__copy">{stageMeta.copy}</p>
        </div>

        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Primary family</span>
            <strong>{pipeline.recommendation?.primaryFamily || "Unknown"}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Transport</span>
            <strong>{pipeline.topology?.transport || "Unknown"}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Switch path</span>
            <strong>{pipeline.topology?.switchRecommendation || "Pending"}</strong>
          </div>
        </div>

        <div className="wm-workspace-list">
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__title">Why this answer</span>
            <span className="wm-workspace-list-item__copy">
              {(pipeline.recommendation?.whyThisAnswer ?? []).join(" ") || "No explanation returned."}
            </span>
          </div>
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__title">Bandwidth estimate</span>
            <span className="wm-workspace-list-item__copy">
              {pipeline.topology?.bandwidthEstimate || "Unknown bandwidth profile"}
            </span>
          </div>
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__title">Risk to confirm</span>
            <span className="wm-workspace-list-item__copy">
              {(pipeline.recommendation?.whatsMissing ?? []).slice(0, 2).join(" ") || "No open qualification issues returned."}
            </span>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Signal path summary</h3>
          <p className="wm-workspace-card__copy">Keep the path readable instead of hiding it inside the wider proposal chrome.</p>
        </div>

        <div className="wm-workspace-list">
          {groupedLinks.length > 0 ? (
            groupedLinks.slice(0, 8).map((group) => (
              <div key={`${group.from}-${group.to.join("|")}`} className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">{group.from}</span>
                <span className="wm-workspace-list-item__copy">{group.to.join(", ")}</span>
              </div>
            ))
          ) : (
            <div className="wm-workspace-empty">No generated signal path is available yet.</div>
          )}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Suggested hardware preview</h3>
          <p className="wm-workspace-card__copy">This keeps the shortlist visible without forcing the user into the BOM stage prematurely.</p>
        </div>

        <div className="wm-workspace-list">
          {Array.isArray(pipeline.room?.suggestedBom) && pipeline.room.suggestedBom.length > 0 ? (
            pipeline.room.suggestedBom.slice(0, 5).map((item: any, index: number) => (
              <div key={`${item.sku || index}`} className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">{item.sku || item.name || "Suggested item"}</span>
                <span className="wm-workspace-list-item__copy">
                  {(item.description || item.role || "Suggested BOM item")} | Qty {item.qty || item.quantity || 1}
                </span>
              </div>
            ))
          ) : (
            <div className="wm-workspace-empty">No BOM suggestion has been returned yet.</div>
          )}
        </div>
      </section>
    </div>
  ) : (
    <div className="wm-workspace-empty">Running the recommendation pipeline…</div>
  );

  const bomView = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Saved proposal lines</h3>
          <p className="wm-workspace-card__copy">Lines added from other tools stay separate from the generated BOM preview.</p>
        </div>

        {savedProposal?.lines?.length ? (
          <div className="wm-workspace-table-wrap">
            <table className="wm-workspace-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {savedProposal.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.sku || "—"}</td>
                    <td>{line.description || "Unnamed line"}</td>
                    <td>{line.qty || 1}</td>
                    <td>{line.category || "Other"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="wm-workspace-empty">No saved proposal lines yet.</div>
        )}
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Pipeline BOM suggestion</h3>
          <p className="wm-workspace-card__copy">This table reflects the current project interpretation rather than manually added quote lines.</p>
        </div>

        {Array.isArray(pipeline?.room?.suggestedBom) && pipeline.room.suggestedBom.length > 0 ? (
          <div className="wm-workspace-table-wrap">
            <table className="wm-workspace-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.room.suggestedBom.map((item: any, index: number) => (
                  <tr key={`${item.sku || "item"}-${index}`}>
                    <td>{item.sku || "—"}</td>
                    <td>{item.name || item.description || "Unnamed item"}</td>
                    <td>{item.qty || item.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="wm-workspace-empty">The current pipeline did not return a BOM suggestion.</div>
        )}
      </section>
    </div>
  );

  const proposalView = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">{pipeline?.proposal?.title || "Proposal draft"}</h3>
          <p className="wm-workspace-card__copy">Keep the client-facing narrative in its own stage so it is not mixed into the architecture review.</p>
        </div>

        <div className="wm-workspace-grid-3">
          <div className="wm-workspace-metric">
            <span>Currency</span>
            <strong>{savedProposal?.meta?.currency || "USD"}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Price tier</span>
            <strong>{savedProposal?.meta?.priceTier || "Silver"}</strong>
          </div>
          <div className="wm-workspace-metric">
            <span>Saved lines</span>
            <strong>{savedProposal?.lines?.length || 0}</strong>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-list">
          {Array.isArray(pipeline?.proposal?.sections) && pipeline.proposal.sections.length > 0 ? (
            pipeline.proposal.sections.map((section: any, index: number) => (
              <div key={`${section.heading || "section"}-${index}`} className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__title">{section.heading || `Section ${index + 1}`}</span>
                <span className="wm-workspace-list-item__copy">{section.content || "No section content returned."}</span>
              </div>
            ))
          ) : (
            <div className="wm-workspace-empty">No proposal sections have been generated yet.</div>
          )}
        </div>
      </section>
    </div>
  );

  const right =
    stage === "bom"
      ? bomView
      : stage === "proposal"
        ? proposalView
        : architectureView;

  return (
    <SplitWorkspaceFrame
      title="Proposal Workspace"
      subtitle="Use the left side to move between architecture, BOM, and proposal stages, and keep the right side focused on one output at a time."
      leftTitle="Workflow Control"
      rightTitle={stageMeta.title}
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row">
          <Link to={WM_ROUTES.catalog} className="wm-btn-secondary">
            Review catalogue
          </Link>
          <Link to={WM_ROUTES.guru} className="wm-btn-secondary">
            Ask Guru
          </Link>
          <button type="button" className="wm-btn-primary" onClick={() => goToStage("proposal")}>
            Open proposal output
          </button>
        </div>
      }
    />
  );
}
