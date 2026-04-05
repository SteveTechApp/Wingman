import {
  ArrowRight,
  BookOpen,
  Brain,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitCompare,
  Import,
  LayoutPanelTop,
  Monitor,
  SearchCheck,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMemo, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";

import {
  getActiveProject,
  subscribeProjects,
} from "@/features/projects/projectStore";
import "./tool-hub-compact.css";

type ToolAction = {
  title: string;
  detail: string;
  route: string;
  icon: LucideIcon;
  helper?: string;
};

type ToolTrack = {
  eyebrow: string;
  title: string;
  description: string;
  actions: ToolAction[];
};

const START_ACTIONS: ToolAction[] = [
  {
    title: "Start from room templates",
    detail: "Choose a real room first, then inherit AV assumptions.",
    route: WM_ROUTES.templates,
    icon: FileSpreadsheet,
    helper: "Best starting point",
  },
  {
    title: "Project launcher",
    detail: "Create a project shell when only basic info is known.",
    route: WM_ROUTES.projectLauncher,
    icon: FolderOpen,
  },
  {
    title: "Discovery wizard",
    detail: "Guided qualification when requirements are unclear.",
    route: WM_ROUTES.discovery,
    icon: SearchCheck,
  },
  {
    title: "Import brief",
    detail: "Convert messy input into structured workflow.",
    route: WM_ROUTES.importIntake,
    icon: Import,
  },
];

const DESIGN_ACTIONS: ToolAction[] = [
  {
    title: "Room Wizard",
    detail: "Refine counts, transport, USB and architecture.",
    route: WM_ROUTES.roomWizard,
    icon: LayoutPanelTop,
  },
  {
    title: "Catalogue",
    detail: "Move into product family and SKU selection.",
    route: WM_ROUTES.catalog,
    icon: LayoutPanelTop,
  },
  {
    title: "Video Wall",
    detail: "Plan wall layouts and processor strategy.",
    route: WM_ROUTES.videoWall,
    icon: Monitor,
  },
  {
    title: "Proposal",
    detail: "Turn design into client-ready output.",
    route: WM_ROUTES.proposal,
    icon: FileText,
  },
];

const HELP_ACTIONS: ToolAction[] = [
  {
    title: "Guru",
    detail: "Ask AV questions and validate direction.",
    route: WM_ROUTES.guru,
    icon: Wand2,
  },
  {
    title: "Compare",
    detail: "Review competitive alternatives.",
    route: WM_ROUTES.compare,
    icon: GitCompare,
  },
  {
    title: "Product Intelligence",
    detail: "Deep technical insight and evidence.",
    route: WM_ROUTES.productIntelligence,
    icon: Brain,
  },
  {
    title: "Training",
    detail: "Support less technical users.",
    route: WM_ROUTES.training,
    icon: BookOpen,
  },
];

const TRACKS: ToolTrack[] = [
  {
    eyebrow: "Start",
    title: "Start the project correctly",
    description: "Choose the clearest entry point instead of guessing.",
    actions: START_ACTIONS,
  },
  {
    eyebrow: "Design",
    title: "Shape the AV solution",
    description: "Turn requirements into real system architecture.",
    actions: DESIGN_ACTIONS,
  },
  {
    eyebrow: "Support",
    title: "Get help and validation",
    description: "Use Guru, comparison and intelligence tools.",
    actions: HELP_ACTIONS,
  },
];

function ActionCard({
  action,
  onOpen,
}: {
  action: ToolAction;
  onOpen: (route: string) => void;
}) {
  const Icon = action.icon;

  return (
    <button
      type="button"
      className="wm-card wm-interactive wm-tool-hub-page__action"
      onClick={() => onOpen(action.route)}
    >
      <div className="wm-card-body wm-tool-hub-page__action-body">
        <div className="wm-tool-hub-page__action-copy">
          <div className="wm-tool-hub-page__action-icon-row">
            {action.helper ? (
              <span className="wm-tool-hub-page__helper">{action.helper}</span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Icon size={18} />
            <div>
              <div className="wm-title">{action.title}</div>
              <div className="wm-text-muted">{action.detail}</div>
            </div>
          </div>
        </div>

        <div className="wm-tool-hub-page__action-cta">
          Open <ArrowRight size={14} />
        </div>
      </div>
    </button>
  );
}

function TrackColumn({
  track,
  onOpen,
}: {
  track: ToolTrack;
  onOpen: (route: string) => void;
}) {
  return (
    <article className="wm-section wm-tool-hub-page__track">
      <div className="wm-tool-hub-page__track-head">
        <div className="wm-page-kicker">{track.eyebrow}</div>
        <h2 className="wm-section-title">{track.title}</h2>
        <p className="wm-section-copy">{track.description}</p>
      </div>

      <div className="wm-tool-hub-page__action-list">
        {track.actions.map((action) => (
          <ActionCard
            key={action.title}
            action={action}
            onOpen={onOpen}
          />
        ))}
      </div>
    </article>
  );
}

export default function ToolHubPage() {
  const navigate = useNavigate();

  const project = useSyncExternalStore(
    subscribeProjects,
    getActiveProject,
    () => undefined,
  );

  const projectAction = useMemo(() => {
    if (!project) return null;
    return WM_ROUTES.roomWizard;
  }, [project]);

  return (
    <div className="wm-page-shell wm-tool-hub-page">
      <div className="wm-page-header wm-page-header--split">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">Tool Hub</div>
          <h1 className="wm-page-title">Open the right workspace fast.</h1>
          <p className="wm-page-subtitle">
            Choose the outcome you need, not the internal tool name.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn-secondary"
            onClick={() => navigate(WM_ROUTES.projects)}
          >
            Open Projects
          </button>

          <button
            type="button"
            className="wm-btn-primary"
            onClick={() => navigate(project ? projectAction! : WM_ROUTES.templates)}
          >
            {project ? "Continue Current Project" : "Start from Templates"}
          </button>
        </div>
      </div>

      <section className="wm-section wm-tool-hub-page__current">
        <div className="wm-tool-hub-page__current-copy">
          <div className="wm-page-kicker">{project ? "Current project" : "Recommended start"}</div>
          <h2 className="wm-section-title">
            {project ? project.name : "Templates, launcher, discovery, and import cover most starts."}
          </h2>
          <p className="wm-section-copy">
            {project
              ? "Resume the active project first, then branch into the next workspace only when needed."
              : "Choose the cleanest entry point, keep the context attached, and let the next workspace stay obvious."}
          </p>
        </div>

        <div className="wm-page-actions">
          {project ? (
            <>
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() => navigate(projectAction!)}
              >
                Continue <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="wm-btn-secondary"
                onClick={() => navigate(WM_ROUTES.projects)}
              >
                View Project Store
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="wm-btn-primary"
                onClick={() => navigate(WM_ROUTES.templates)}
              >
                Start Project <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="wm-btn-secondary"
                onClick={() => navigate(WM_ROUTES.projectLauncher)}
              >
                Open Launcher
              </button>
            </>
          )}
        </div>
      </section>

      <section className="wm-page-grid wm-page-grid--3 wm-tool-hub-page__track-grid">
        {TRACKS.map((track) => (
          <TrackColumn
            key={track.title}
            track={track}
            onOpen={(route) => navigate(route)}
          />
        ))}
      </section>
    </div>
  );
}
