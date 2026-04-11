import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  FileText,
  FolderOpen,
  Save,
  Send,
} from "lucide-react";

import WingmanPageFrame, { WingmanPageSection } from "@/components/layout/WingmanPageFrame";
import { buildCustomerSafeSummary } from "@/features/projects/customerSummary";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";
import {
  createProjectShare,
  getActiveProject,
  loadProjects,
  setActiveProjectId,
  subscribeProjects,
  updateProject,
  type StoredProject,
} from "@/features/projects/projectStore";
import { generateProposal, type ProposalResponse } from "@/services/proposalService";
import "./proposal-page.css";

type StatusTone = "good" | "warn";
type BusyAction = "generate" | "save" | "share" | null;

type DraftState = ProposalResponse & {
  body: string;
  generatedAt: string;
};

const proposalStages = [
  {
    badge: "Input",
    title: "Read the live project",
    description: "Proposal Builder now works from the active project instead of behaving like a disconnected document page.",
  },
  {
    badge: "Draft",
    title: "Generate a commercial draft",
    description: "Use the captured outcome, design context, and selected tier to shape a first-pass customer-ready narrative.",
  },
  {
    badge: "Save",
    title: "Return the output to the project",
    description: "Draft title, body, and customer-safe summary all save back into the same project record for handoff.",
  },
];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function formatDateTime(value?: string): string {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function resolveSelectedTier(project: StoredProject): string {
  return tidy(project.proposal?.selectedTier) || tidy(project.template?.tier) || "Silver";
}

function collectRecommendedFamilies(project: StoredProject): string[] {
  return unique([
    ...(project.discovery?.recommendedFamilies ?? []),
    ...(project.template?.recommendedFamilies ?? []),
    ...(project.compare?.recommendedFamilies ?? []),
  ]);
}

function buildProjectObjective(project: StoredProject): string {
  const details = unique([
    tidy(project.discovery?.customerOutcome),
    tidy(project.template?.solutionSummary),
    tidy(project.template?.summary),
    tidy(project.compare?.summary),
    tidy(project.videowall?.summary),
    tidy(project.catalog?.notes),
    tidy(project.notes).split("\n")[0] ?? "",
  ]);

  if (details.length > 0) {
    return details.slice(0, 3).join(" ");
  }

  const room = tidy(project.roomName) || tidy(project.discovery?.applicationType) || "AV room";
  const site = tidy(project.site) ? ` at ${project.site}` : "";
  return `Deliver a supportable WyreStorm-led proposal for ${room}${site} with a clear technical path and commercial next step.`;
}

function buildDraftBody(draft: ProposalResponse): string {
  return [
    draft.title,
    ...draft.sections.map((section) => `${section.heading}\n${section.content}`),
    draft.assumptions.length > 0
      ? `Assumptions\n${draft.assumptions.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildSharePackMessage(project: StoredProject): string {
  const summary = buildCustomerSafeSummary(project);
  return [
    summary.overview,
    summary.bullets.length > 0 ? `Key points: ${summary.bullets.join(" ")}` : "",
    summary.openRisks.length > 0 ? `Open checks: ${summary.openRisks.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function appendNote(existing: string | undefined, note: string): string {
  const current = tidy(existing);
  const next = tidy(note);
  if (!next) return current;
  if (current.includes(next)) return current;
  return [current, next].filter(Boolean).join("\n\n");
}

function projectSummaryLine(project: StoredProject): string {
  return (
    [tidy(project.customer), tidy(project.roomName) || tidy(project.discovery?.applicationType), tidy(project.site)]
      .filter(Boolean)
      .join(" / ") || "Customer, room, and site details are still being captured."
  );
}

export default function ProposalPage() {
  const projects = React.useSyncExternalStore(subscribeProjects, loadProjects, () => []);
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);

  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [draft, setDraft] = React.useState<DraftState | null>(null);
  const [busyAction, setBusyAction] = React.useState<BusyAction>(null);
  const [status, setStatus] = React.useState<{ tone: StatusTone; text: string } | null>(null);

  React.useEffect(() => {
    const fallbackId = activeProject?.id ?? projects[0]?.id ?? "";
    setSelectedProjectId((current) => {
      if (current && projects.some((project) => project.id === current)) {
        return current;
      }
      return fallbackId;
    });
  }, [activeProject?.id, projects]);

  const project = React.useMemo(
    () => projects.find((candidate) => candidate.id === selectedProjectId) ?? activeProject ?? null,
    [activeProject, projects, selectedProjectId],
  );

  React.useEffect(() => {
    setDraft(null);
    setStatus(null);
  }, [project?.id]);

  const selectedTier = React.useMemo(
    () => (project ? resolveSelectedTier(project) : "Silver"),
    [project],
  );
  const recommendedFamilies = React.useMemo(
    () => (project ? collectRecommendedFamilies(project) : []),
    [project],
  );
  const projectResume = React.useMemo(
    () => (project ? getProjectResumeAction(project) : null),
    [project],
  );

  const savedDocument = React.useMemo(() => {
    if (!project) return null;
    const title = tidy(project.proposal?.title) || `${project.name} Proposal Draft`;
    const body = tidy(project.proposal?.notes);
    if (!body) return null;
    return { title, body };
  }, [project]);

  const previewProject = React.useMemo(() => {
    if (!project) return null;
    if (!draft) return project;

    return {
      ...project,
      stage: "Proposal",
      proposal: {
        ...(project.proposal ?? {}),
        selectedTier,
        title: draft.title,
        notes: draft.body,
      },
    } satisfies StoredProject;
  }, [draft, project, selectedTier]);

  const customerSummary = React.useMemo(
    () => (previewProject ? buildCustomerSafeSummary(previewProject) : null),
    [previewProject],
  );

  const currentBody = draft?.body ?? savedDocument?.body ?? "";
  const currentTitle = draft?.title ?? savedDocument?.title ?? "";
  const shareReady = Boolean(savedDocument?.body);

  async function handleGenerateDraft() {
    if (!project) return;

    setBusyAction("generate");
    setStatus(null);

    try {
      const objective = buildProjectObjective(project);
      const response = await generateProposal({
        customer: project.customer || project.discovery?.customer,
        roomName: project.roomName || project.discovery?.roomName || project.discovery?.applicationType,
        selectedTier,
        objective,
        summary: objective,
        notes: project.notes,
      });

      setDraft({
        ...response,
        body: buildDraftBody(response),
        generatedAt: new Date().toISOString(),
      });
      setStatus({
        tone: "good",
        text: `Draft generated for ${project.name}. Review it, then save it back to the project record.`,
      });
    } catch (error) {
      setStatus({
        tone: "warn",
        text: error instanceof Error ? error.message : "Unable to generate a proposal draft.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  function handleSaveDraft() {
    if (!project || !draft) return;

    setBusyAction("save");
    setStatus(null);

    try {
      const proposalPatch = {
        ...(project.proposal ?? {}),
        selectedTier,
        title: draft.title,
        notes: draft.body,
      };

      const nextProject: StoredProject = {
        ...project,
        stage: "Proposal",
        proposal: proposalPatch,
      };

      const updated = updateProject(project.id, {
        stage: "Proposal",
        proposal: proposalPatch,
        notes: appendNote(project.notes, `Proposal draft updated on ${formatDateTime(draft.generatedAt)}.`),
        customerSummary: buildCustomerSafeSummary(nextProject),
      });

      if (!updated) {
        throw new Error("Unable to save the draft back to the project.");
      }

      setActiveProjectId(project.id);
      setStatus({
        tone: "good",
        text: `Draft saved to ${updated.name}. The project now carries the proposal output and refreshed customer summary.`,
      });
    } catch (error) {
      setStatus({
        tone: "warn",
        text: error instanceof Error ? error.message : "Unable to save the draft.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePrepareSharePack() {
    if (!project || !savedDocument) return;

    setBusyAction("share");
    setStatus(null);

    try {
      const shareSourceProject: StoredProject = {
        ...project,
        proposal: {
          ...(project.proposal ?? {}),
          title: savedDocument.title,
          notes: savedDocument.body,
        },
      };

      const summary = buildCustomerSafeSummary(shareSourceProject);
      await createProjectShare(project.id, {
        title: savedDocument.title,
        audience: "customer",
        summaryHeadline: summary.headline,
        message: buildSharePackMessage(shareSourceProject),
      });

      setStatus({
        tone: "good",
        text: "Customer share pack prepared from the saved proposal draft.",
      });
    } catch (error) {
      setStatus({
        tone: "warn",
        text: error instanceof Error ? error.message : "Unable to prepare the share pack.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  if (!project) {
    return (
      <WingmanPageFrame
        className="wm-proposal-builder-page"
        eyebrow="Commercial output"
        title="Proposal Builder needs a live project before it can draft anything useful."
        subtitle="Create or open a project first so proposal work stays connected to the same record as discovery, design, and handoff."
        actions={
          <div className="wm-workspace-actions">
            <Link to="/app/projects/new" className="wm-workspace-action wm-workspace-action--primary">
              Create project
            </Link>
            <Link to="/app/projects" className="wm-workspace-action">
              Open projects
            </Link>
          </div>
        }
      >
        <WingmanPageSection title="Why this matters" subtitle="Proposal output should never live on its own.">
          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Project-linked only</div>
            <strong>Start from a project so every draft, share pack, and handoff stays recoverable.</strong>
            <div className="wm-workspace-note">
              Once a project exists, Proposal Builder can generate a first-pass draft and save it back into the same record used across the rest of Wingman.
            </div>
          </div>
        </WingmanPageSection>
      </WingmanPageFrame>
    );
  }

  return (
    <WingmanPageFrame
      className="wm-proposal-builder-page"
      eyebrow="Commercial output"
      title={`Proposal Builder is now working from ${project.name}.`}
      subtitle="Generate a draft from the active project, save it back into the project record, and prepare the customer-facing share pack from the same source."
      actions={
        <div className="wm-workspace-actions">
          <button
            type="button"
            className="wm-workspace-action wm-workspace-action--primary"
            onClick={() => {
              void handleGenerateDraft();
            }}
            disabled={busyAction === "generate"}
          >
            {busyAction === "generate" ? "Generating..." : "Generate draft"}
          </button>
          <button
            type="button"
            className="wm-workspace-action"
            onClick={handleSaveDraft}
            disabled={busyAction === "save" || !draft}
          >
            {busyAction === "save" ? "Saving..." : "Save to project"}
          </button>
          <Link to={`/app/projects/${encodeURIComponent(project.id)}`} className="wm-workspace-action">
            Project overview
          </Link>
        </div>
      }
      stats={
        <div className="wm-workspace-stats">
          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Project in focus</div>
            <div className="wm-workspace-stat__value">{project.name}</div>
            <div className="wm-workspace-stat__meta">{projectSummaryLine(project)}</div>
          </div>
          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Commercial stage</div>
            <div className="wm-workspace-stat__value">{project.stage || "Draft"}</div>
            <div className="wm-workspace-stat__meta">
              Status: {project.status || "Draft"} / Tier: {selectedTier}
            </div>
          </div>
          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Continuity</div>
            <div className="wm-workspace-stat__value">{project.shares?.length ?? 0} share pack(s)</div>
            <div className="wm-workspace-stat__meta">
              Saved draft: {savedDocument ? "Yes" : "No"} / Attachments: {project.attachments?.length ?? 0}
            </div>
          </div>
        </div>
      }
      aside={
        <>
          <WingmanPageSection title="Project focus" subtitle="Choose which project Proposal Builder is drafting for.">
            <div className="wm-proposal-builder-page__sidebar-stack">
              <label className="wm-proposal-builder-page__field">
                <span className="wm-workspace-label">Active project</span>
                <select
                  className="wm-proposal-builder-page__input"
                  value={selectedProjectId}
                  onChange={(event) => {
                    const nextId = event.currentTarget.value;
                    setSelectedProjectId(nextId);
                    if (nextId) setActiveProjectId(nextId);
                  }}
                >
                  {projects.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="wm-workspace-link-list">
                <Link to="/app/projects" className="wm-workspace-link">
                  <span>Open projects</span>
                  <FolderOpen size={14} />
                </Link>
                <Link to={projectResume?.to ?? "/app/tools/discovery"} className="wm-workspace-link">
                  <span>{projectResume?.label ?? "Resume workflow"}</span>
                  <ArrowRight size={14} />
                </Link>
                <Link to="/app/tools/catalog" className="wm-workspace-link">
                  <span>Review product fit</span>
                  <Boxes size={14} />
                </Link>
              </div>
            </div>
          </WingmanPageSection>

          <WingmanPageSection title="Proposal checklist" subtitle="Before anything leaves the workspace.">
            <ul className="wm-workspace-list wm-workspace-list--plain">
              <li>Generate from the live project instead of rewriting discovery by hand.</li>
              <li>Save the approved draft back into the project before preparing a share pack.</li>
              <li>Use Project Overview for the final commercial-ready handoff once the pack is reviewed.</li>
            </ul>
          </WingmanPageSection>
        </>
      }
    >
      {status ? (
        <div className={`wm-proposal-builder-page__status is-${status.tone}`}>
          {status.text}
        </div>
      ) : null}

      <WingmanPageSection
        title="Proposal build stages"
        subtitle="The route now behaves like a real drafting surface instead of a static guidance page."
      >
        <div className="wm-workspace-tile-grid">
          {proposalStages.map((stage) => (
            <div key={stage.title} className="wm-workspace-tile">
              <div className="wm-workspace-tile__top">
                <span className="wm-workspace-tile__badge">{stage.badge}</span>
              </div>
              <div className="wm-workspace-tile__title">{stage.title}</div>
              <div className="wm-workspace-tile__description">{stage.description}</div>
            </div>
          ))}
        </div>
      </WingmanPageSection>

      <WingmanPageSection
        title="Project brief"
        subtitle="What Proposal Builder is reading from the active record."
      >
        <div className="wm-proposal-builder-page__grid">
          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Commercial objective</div>
            <strong>{buildProjectObjective(project)}</strong>
            <div className="wm-workspace-note">
              {project.discovery?.customerOutcome ||
                project.template?.summary ||
                project.compare?.summary ||
                "Discovery outcome text is still light, so the proposal will lean on the project notes and captured context."}
            </div>
          </div>

          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Design signals</div>
            <ul className="wm-workspace-list wm-workspace-list--plain">
              <li>Room: {tidy(project.roomName) || tidy(project.discovery?.applicationType) || "Not set"}</li>
              <li>Families: {recommendedFamilies.join(", ") || "Not set"}</li>
              <li>Catalogue SKUs: {project.catalog?.skus?.length ?? 0}</li>
              <li>Next move: {projectResume?.shortLabel ?? "Discovery"}</li>
            </ul>
          </div>
        </div>
      </WingmanPageSection>

      <WingmanPageSection
        title="Draft output"
        subtitle="Generate first, then save the version you want the project to carry."
      >
        {currentBody ? (
          <div className="wm-proposal-builder-page__draft-stack">
            <div className="wm-workspace-note-block">
              <div className="wm-workspace-kicker">Draft title</div>
              <strong>{currentTitle}</strong>
              <div className="wm-workspace-note">
                {draft
                  ? `Generated ${formatDateTime(draft.generatedAt)} from the active project context.`
                  : "Loaded from the project record."}
              </div>
            </div>

            {draft?.sections?.length ? (
              <div className="wm-workspace-link-list">
                {draft.sections.map((section) => (
                  <div key={section.heading} className="wm-workspace-link wm-proposal-builder-page__static-card">
                    <span>{section.heading}</span>
                    <div className="wm-proposal-builder-page__static-copy">{section.content}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wm-workspace-note-block">
                <div className="wm-workspace-kicker">Saved proposal body</div>
                <div className="wm-proposal-builder-page__draft-body">{currentBody}</div>
              </div>
            )}

            {draft?.assumptions?.length ? (
              <div className="wm-workspace-note-block">
                <div className="wm-workspace-kicker">Assumptions</div>
                <ul className="wm-workspace-list">
                  {draft.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Nothing drafted yet</div>
            <strong>Generate the first draft from the project before saving or sharing anything.</strong>
            <div className="wm-workspace-note">
              Proposal Builder will use discovery context, template tier, compare notes, and project notes to create a first-pass structure.
            </div>
          </div>
        )}
      </WingmanPageSection>

      <WingmanPageSection
        title="Customer-safe preview"
        subtitle="This is the summary layer the rest of the workflow can reuse."
      >
        {customerSummary ? (
          <div className="wm-proposal-builder-page__grid">
            <div className="wm-workspace-note-block">
              <div className="wm-workspace-kicker">Headline</div>
              <strong>{customerSummary.headline}</strong>
              <div className="wm-workspace-note">{customerSummary.overview}</div>
            </div>

            <div className="wm-workspace-note-block">
              <div className="wm-workspace-kicker">Key points</div>
              <ul className="wm-workspace-list wm-workspace-list--plain">
                {customerSummary.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {customerSummary.bullets.length === 0 ? <li>No customer-safe bullets captured yet.</li> : null}
              </ul>
            </div>

            <div className="wm-workspace-note-block">
              <div className="wm-workspace-kicker">Open risks</div>
              <ul className="wm-workspace-list wm-workspace-list--plain">
                {customerSummary.openRisks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {customerSummary.openRisks.length === 0 ? <li>No open customer-facing risks are currently flagged.</li> : null}
              </ul>
            </div>

            <div className="wm-workspace-note-block">
              <div className="wm-workspace-kicker">Updated</div>
              <strong>{formatDateTime(customerSummary.generatedAt)}</strong>
              <div className="wm-workspace-note">
                Save the generated draft first so this summary stays aligned with the version stored in the project.
              </div>
            </div>
          </div>
        ) : null}
      </WingmanPageSection>

      <WingmanPageSection
        title="Save and handoff"
        subtitle="Keep the commercial pack tied to the project all the way to handoff."
      >
        <div className="wm-proposal-builder-page__actions-grid">
          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Save draft</div>
            <strong>Write the proposal back into the project before anybody else uses it.</strong>
            <div className="wm-workspace-note">
              Saving updates the project proposal record and refreshes the customer-safe summary used by the rest of Wingman.
            </div>
            <button
              type="button"
              className="wm-proposal-builder-page__button wm-proposal-builder-page__button--primary"
              onClick={handleSaveDraft}
              disabled={busyAction === "save" || !draft}
            >
              <Save size={14} />
              <span>{busyAction === "save" ? "Saving..." : "Save draft to project"}</span>
            </button>
          </div>

          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Share pack</div>
            <strong>Prepare the customer-facing pack only from the saved project draft.</strong>
            <div className="wm-workspace-note">
              This creates a real project share pack so the commercial story stays in the same project activity trail.
            </div>
            <button
              type="button"
              className="wm-proposal-builder-page__button"
              onClick={() => {
                void handlePrepareSharePack();
              }}
              disabled={busyAction === "share" || !shareReady}
            >
              <Send size={14} />
              <span>{busyAction === "share" ? "Preparing..." : "Prepare customer share pack"}</span>
            </button>
          </div>

          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Final handoff</div>
            <strong>Use Project Overview to register attachments and complete the commercial-ready gate.</strong>
            <div className="wm-workspace-note">
              Proposal Builder now handles drafting and saveback. Project Overview remains the place for the last approval steps and broader handoff activity.
            </div>
            <div className="wm-workspace-link-list">
              <Link to={`/app/projects/${encodeURIComponent(project.id)}`} className="wm-workspace-link">
                <span>Open Project Overview</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/app/tools/discovery" className="wm-workspace-link">
                <span>Recheck discovery</span>
                <ClipboardList size={14} />
              </Link>
              <Link to="/app/tools/catalog" className="wm-workspace-link">
                <span>Review products</span>
                <FileText size={14} />
              </Link>
            </div>
          </div>
        </div>
      </WingmanPageSection>
    </WingmanPageFrame>
  );
}
