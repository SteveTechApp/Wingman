import { startTransition, useMemo, useSyncExternalStore } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import type { WingmanShellInput } from "@/features/wingmanUx/types";
import { useWingmanUxPipeline } from "@/features/wingmanUx/useWingmanUxPipeline";
import { loadProposal } from "@/proposal/bom/persist";
import "./proposal-page.css";

type ProposalStage = "architecture" | "bom" | "proposal";

type StageMeta = {
  id: ProposalStage;
  step: string;
  label: string;
  title: string;
  copy: string;
};

const STAGES: StageMeta[] = [
  {
    id: "architecture",
    step: "1",
    label: "Architecture",
    title: "Check the room direction",
    copy: "Confirm the family, transport, and signal logic before getting lost in product detail.",
  },
  {
    id: "bom",
    step: "2",
    label: "BOM",
    title: "Review the hardware set",
    copy: "Compare the stored quote lines against the live pipeline suggestion in one readable place.",
  },
  {
    id: "proposal",
    step: "3",
    label: "Proposal",
    title: "Shape the client-facing output",
    copy: "Keep the customer narrative clean while technical detail stays available elsewhere in Wingman.",
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

    if (!map.has(from)) {
      map.set(from, new Set<string>());
    }

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

function toDisplayText(value: number, singular: string, plural: string) {
  if (!value) return `No ${plural}`;
  if (value === 1) return `1 ${singular}`;
  return `${value} ${plural}`;
}

function uniqueStrings(items: Array<string | undefined>) {
  const next = items
    .filter((item): item is string => Boolean(item && item.trim()))
    .map((item) => item.trim());

  return next.filter((item, index) => next.indexOf(item) === index);
}

function routeLabel(route?: string) {
  if (route === WM_ROUTES.catalog) return "Catalogue";
  if (route === WM_ROUTES.proposal) return "Proposal";
  if (route === WM_ROUTES.videowall) return "Video Wall Planner";
  if (route === WM_ROUTES.roomWizard) return "Room Wizard";
  return "Next workspace";
}

function formatLineAux(parts: Array<string | number | undefined>) {
  return parts
    .filter((part) => part !== undefined && part !== null && String(part).trim())
    .map((part) => String(part).trim())
    .join(" / ");
}

function StageButton(props: {
  item: StageMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        props.active
          ? "wm-proposal-page__stage-button wm-proposal-page__stage-button--active"
          : "wm-proposal-page__stage-button"
      }
      onClick={props.onClick}
    >
      <span className="wm-proposal-page__stage-step">{props.item.step}</span>
      <span className="wm-proposal-page__stage-copy">
        <strong>{props.item.label}</strong>
        <span>{props.item.title}</span>
      </span>
    </button>
  );
}

function SummaryMetric(props: { label: string; value: string | number }) {
  return (
    <div className="wm-proposal-page__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function ReadingPanel(props: {
  title: string;
  copy?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="wm-proposal-page__panel">
      <div className="wm-proposal-page__panel-head">
        <h3>{props.title}</h3>
        {props.copy ? <p>{props.copy}</p> : null}
      </div>
      {props.children}
    </section>
  );
}

function EmptyState(props: { title: string; copy: string }) {
  return (
    <div className="wm-proposal-page__empty">
      <h3>{props.title}</h3>
      <p>{props.copy}</p>
    </div>
  );
}

export default function ProposalPage() {
  const navigate = useNavigate();
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

  const familyTags = useMemo(
    () =>
      uniqueStrings([
        ...(project?.discovery?.recommendedFamilies ?? []),
        ...(project?.template?.recommendedFamilies ?? []),
        pipeline?.recommendation?.primaryFamily,
      ]),
    [
      pipeline?.recommendation?.primaryFamily,
      project?.discovery?.recommendedFamilies,
      project?.template?.recommendedFamilies,
    ],
  );

  function goToStage(nextStage: ProposalStage) {
    startTransition(() => {
      setSearchParams({ stage: nextStage });
    });
  }

  if (!project) {
    return (
      <div className="wm-proposal-page">
        <section className="wm-proposal-page__hero">
          <div className="wm-proposal-page__hero-copy">
            <div className="wm-proposal-page__eyebrow">Proposal Workspace</div>
            <h1>Open a project before building the output.</h1>
            <p>
              Proposal output only makes sense once Wingman has a room, customer, and design direction to work from.
            </p>
          </div>

          <div className="wm-proposal-page__hero-actions">
            <Link to={WM_ROUTES.templates} className="wm-btn-primary">
              Open Templates
            </Link>
            <Link to={WM_ROUTES.projectLauncher} className="wm-btn-secondary">
              Open Project Launcher
            </Link>
          </div>
        </section>

        <EmptyState
          title="No active project selected"
          copy="Start from a room type or project shell, then return here once Wingman has enough context to build a recommendation."
        />
      </div>
    );
  }

  const projectName = project.name || "Untitled Project";
  const application =
    project.discovery?.applicationType ||
    project.discovery?.workflowTrack ||
    "Not defined yet";
  const projectNotes =
    project.discovery?.notes || project.notes || "No project notes captured yet.";
  const nextRoute =
    project.discovery?.recommendedNextTool ||
    pipeline?.room?.nextTool ||
    WM_ROUTES.catalog;
  const sourceCountText = toDisplayText(Number(projectState.sourceCount ?? 0), "source", "sources");
  const displayCountText = toDisplayText(Number(projectState.displayCount ?? 0), "display", "displays");
  const distanceText = projectState.distanceM ? `${projectState.distanceM}m longest run` : "Distance not set";
  const confidenceText = pipeline?.recommendation?.confidenceLabel || "Pending";
  const primaryFamily = pipeline?.recommendation?.primaryFamily || familyTags[0] || "Pending";

  const architectureContent = pipeline ? (
    <div className="wm-proposal-page__content-grid">
      <ReadingPanel
        title="System direction"
        copy="This is the current read on the room before you commit to SKU-level detail."
      >
        <div className="wm-proposal-page__reading-list">
          <div className="wm-proposal-page__reading-row">
            <span>Primary family</span>
            <strong>{primaryFamily}</strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Transport</span>
            <strong>{pipeline.topology?.transport || "Pending"}</strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Switch path</span>
            <strong>{pipeline.topology?.switchRecommendation || "Pending"}</strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Confidence</span>
            <strong>{confidenceText}</strong>
          </div>
        </div>
      </ReadingPanel>

      <ReadingPanel
        title="Why Wingman is leaning this way"
        copy="The reasoning should stay readable enough for sales and technical users alike."
      >
        <div className="wm-proposal-page__body-copy">
          {(pipeline.recommendation?.whyThisAnswer ?? []).join(" ") || "No explanation returned yet."}
        </div>
      </ReadingPanel>

      <ReadingPanel
        title="Risk to confirm"
        copy="Use this as the shortlist of details still worth qualifying before final product selection."
      >
        <div className="wm-proposal-page__body-copy">
          {(pipeline.recommendation?.whatsMissing ?? []).slice(0, 3).join(" ") ||
            "No open qualification issues returned."}
        </div>
      </ReadingPanel>

      <ReadingPanel
        title="Signal path summary"
        copy="Readable routing should stay simpler than the eventual technical drawing."
      >
        {groupedLinks.length > 0 ? (
          <div className="wm-proposal-page__row-list">
            {groupedLinks.slice(0, 8).map((group) => (
              <div
                key={`${group.from}-${group.to.join("|")}`}
                className="wm-proposal-page__row-item"
              >
                <strong>{group.from}</strong>
                <span>{group.to.join(", ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="wm-proposal-page__body-copy">
            No generated signal path is available yet.
          </div>
        )}
      </ReadingPanel>

      <ReadingPanel
        title="Early hardware preview"
        copy="A light preview is enough here. The detailed BOM belongs in the next stage."
      >
        {Array.isArray(pipeline.room?.suggestedBom) && pipeline.room.suggestedBom.length > 0 ? (
          <div className="wm-proposal-page__row-list">
            {pipeline.room.suggestedBom.slice(0, 6).map((item: any, index: number) => (
              <div key={`${item.sku || index}`} className="wm-proposal-page__row-item">
                <strong>{item.sku || item.name || "Suggested item"}</strong>
                <span>
                  {formatLineAux([
                    item.description || item.role || "Suggested BOM item",
                    `Qty ${item.qty || item.quantity || 1}`,
                  ])}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="wm-proposal-page__body-copy">
            No BOM suggestion has been returned yet.
          </div>
        )}
      </ReadingPanel>
    </div>
  ) : (
    <EmptyState
      title="Building the room recommendation"
      copy="Wingman is still assembling the architecture, signal path, and product direction for this project."
    />
  );

  const bomContent = (
    <div className="wm-proposal-page__content-grid">
      <ReadingPanel
        title="Saved quote lines"
        copy="These are the lines already stored against the project."
      >
        {savedProposal?.lines?.length ? (
          <div className="wm-proposal-page__row-list">
            {savedProposal.lines.map((line) => (
              <div key={line.id} className="wm-proposal-page__row-item">
                <strong>{line.sku || line.description || "Saved line"}</strong>
                <span>
                  {formatLineAux([
                    line.description || "Unnamed line",
                    `Qty ${line.qty || 1}`,
                    line.category || "Other",
                  ])}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="wm-proposal-page__body-copy">No saved proposal lines yet.</div>
        )}
      </ReadingPanel>

      <ReadingPanel
        title="Live pipeline suggestion"
        copy="This is the current BOM read from Wingman's recommendation pipeline."
      >
        {Array.isArray(pipeline?.room?.suggestedBom) && pipeline.room.suggestedBom.length > 0 ? (
          <div className="wm-proposal-page__row-list">
            {pipeline.room.suggestedBom.map((item: any, index: number) => (
              <div key={`${item.sku || "item"}-${index}`} className="wm-proposal-page__row-item">
                <strong>{item.sku || item.name || "Suggested item"}</strong>
                <span>
                  {formatLineAux([
                    item.name || item.description || "Unnamed item",
                    `Qty ${item.qty || item.quantity || 1}`,
                  ])}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="wm-proposal-page__body-copy">
            The current pipeline did not return a BOM suggestion.
          </div>
        )}
      </ReadingPanel>

      <ReadingPanel
        title="BOM stage checks"
        copy="Keep the review practical so you can decide whether the proposal is ready to package."
      >
        <div className="wm-proposal-page__reading-list">
          <div className="wm-proposal-page__reading-row">
            <span>Saved lines</span>
            <strong>{savedProposal?.lines?.length || 0}</strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Pipeline items</span>
            <strong>
              {Array.isArray(pipeline?.room?.suggestedBom)
                ? pipeline.room.suggestedBom.length
                : 0}
            </strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Currency</span>
            <strong>{savedProposal?.meta?.currency || "USD"}</strong>
          </div>
        </div>
      </ReadingPanel>
    </div>
  );

  const proposalContent = (
    <div className="wm-proposal-page__content-grid">
      <ReadingPanel
        title={pipeline?.proposal?.title || "Proposal draft"}
        copy="This is the customer-facing layer. Keep it concise and credible."
      >
        <div className="wm-proposal-page__reading-list">
          <div className="wm-proposal-page__reading-row">
            <span>Currency</span>
            <strong>{savedProposal?.meta?.currency || "USD"}</strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Price tier</span>
            <strong>{savedProposal?.meta?.priceTier || "Silver"}</strong>
          </div>
          <div className="wm-proposal-page__reading-row">
            <span>Saved lines</span>
            <strong>{savedProposal?.lines?.length || 0}</strong>
          </div>
        </div>
      </ReadingPanel>

      <ReadingPanel
        title="Proposal narrative"
        copy="These sections should be readable by the customer without exposing internal design noise."
      >
        {Array.isArray(pipeline?.proposal?.sections) && pipeline.proposal.sections.length > 0 ? (
          <div className="wm-proposal-page__section-list">
            {pipeline.proposal.sections.map((section: any, index: number) => (
              <article
                key={`${section.heading || "section"}-${index}`}
                className="wm-proposal-page__section-item"
              >
                <strong>{section.heading || `Section ${index + 1}`}</strong>
                <p>{section.content || "No section content returned."}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="wm-proposal-page__body-copy">
            No proposal sections have been generated yet.
          </div>
        )}
      </ReadingPanel>
    </div>
  );

  const content =
    stage === "bom"
      ? bomContent
      : stage === "proposal"
        ? proposalContent
        : architectureContent;

  return (
    <div className="wm-proposal-page">
      <section className="wm-proposal-page__hero">
        <div className="wm-proposal-page__hero-copy">
          <div className="wm-proposal-page__eyebrow">Proposal Workspace</div>
          <h1>{projectName}</h1>
          <p>
            Move through architecture, BOM, and proposal one layer at a time without losing the room brief.
          </p>
        </div>

        <div className="wm-proposal-page__hero-metrics">
          <SummaryMetric label="Room" value={project.roomName || "Not set"} />
          <SummaryMetric label="Application" value={application} />
          <SummaryMetric label="Primary family" value={primaryFamily} />
          <SummaryMetric label="Next workspace" value={routeLabel(nextRoute)} />
        </div>
      </section>

      <section className="wm-proposal-page__brief">
        <div className="wm-proposal-page__brief-copy">
          <div className="wm-proposal-page__section-eyebrow">Current room brief</div>
          <h2>Keep the proposal attached to the room logic.</h2>
          <p>{projectNotes}</p>
        </div>

        <div className="wm-proposal-page__brief-metrics">
          <SummaryMetric label="Inputs" value={sourceCountText} />
          <SummaryMetric label="Outputs" value={displayCountText} />
          <SummaryMetric label="Distance" value={distanceText} />
          <SummaryMetric label="Confidence" value={confidenceText} />
        </div>

        {familyTags.length > 0 ? (
          <div className="wm-proposal-page__chip-row">
            {familyTags.map((tag) => (
              <span key={tag} className="wm-proposal-page__chip">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="wm-proposal-page__stage-strip">
        {STAGES.map((item) => (
          <StageButton
            key={item.id}
            item={item}
            active={item.id === stage}
            onClick={() => goToStage(item.id)}
          />
        ))}
      </section>

      <section className="wm-proposal-page__workspace">
        <aside className="wm-proposal-page__support">
          <ReadingPanel title={stageMeta.title} copy={stageMeta.copy}>
            <div className="wm-proposal-page__reading-list">
              <div className="wm-proposal-page__reading-row">
                <span>Customer</span>
                <strong>{project.customer || "Not set"}</strong>
              </div>
              <div className="wm-proposal-page__reading-row">
                <span>Site</span>
                <strong>{project.site || "Not set"}</strong>
              </div>
              <div className="wm-proposal-page__reading-row">
                <span>USB</span>
                <strong>{projectState.avGuide?.usb || "Not set"}</strong>
              </div>
              <div className="wm-proposal-page__reading-row">
                <span>Audio</span>
                <strong>{projectState.avGuide?.audio || "Not set"}</strong>
              </div>
              <div className="wm-proposal-page__reading-row">
                <span>Control</span>
                <strong>{projectState.avGuide?.control || "Not set"}</strong>
              </div>
            </div>
          </ReadingPanel>

        <ReadingPanel
          title="Next moves"
          copy="Keep adjacent workspaces one click away."
        >
            <div className="wm-proposal-page__action-stack">
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() =>
                  stage === "architecture"
                    ? goToStage("bom")
                    : stage === "bom"
                      ? goToStage("proposal")
                      : navigate(WM_ROUTES.projects)
                }
              >
                {stage === "architecture"
                  ? "Open BOM Review"
                  : stage === "bom"
                    ? "Open Proposal Output"
                    : "Back to Projects"}
              </button>
              <Link to={WM_ROUTES.catalog} className="wm-btn-secondary">
                Review Catalogue
              </Link>
              <Link to={WM_ROUTES.guru} className="wm-btn-secondary">
                Ask Guru
              </Link>
            </div>
          </ReadingPanel>
        </aside>

        <main className="wm-proposal-page__main">{content}</main>
      </section>
    </div>
  );
}
