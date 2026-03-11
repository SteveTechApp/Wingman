import * as React from "react";
import { ArrowRight, Copy, FolderOpen, Search, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  duplicateProject,
  getActiveProject,
  loadProjects,
  setActiveProjectId,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";

type WingmanCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type CommandAction = {
  id: string;
  label: string;
  description: string;
  category: string;
  keywords: string[];
  run: () => void;
};

function buildSearchText(action: CommandAction): string {
  return [
    action.label,
    action.description,
    action.category,
    ...action.keywords,
  ]
    .join(" ")
    .toLowerCase();
}

function filterActions(actions: CommandAction[], query: string): CommandAction[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return actions.slice(0, 12);

  const tokens = needle.split(/\s+/).filter(Boolean);

  return actions
    .map((action) => {
      const haystack = buildSearchText(action);
      const matchesAll = tokens.every((token) => haystack.includes(token));
      if (!matchesAll) return null;

      let score = 0;
      if (action.label.toLowerCase().startsWith(needle)) score += 5;
      if (action.category.toLowerCase().startsWith(needle)) score += 2;
      for (const token of tokens) {
        if (action.label.toLowerCase().includes(token)) score += 2;
        if (action.description.toLowerCase().includes(token)) score += 1;
      }

      return { action, score };
    })
    .filter((item): item is { action: CommandAction; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .map((item) => item.action)
    .slice(0, 16);
}

function buildProjectActions(
  project: StoredProject,
  navigate: ReturnType<typeof useNavigate>,
  onClose: () => void,
): CommandAction[] {
  const resumeAction = getProjectResumeAction(project);
  const summaryBits = [project.customer, project.site, project.roomName].filter(Boolean);
  const summary = summaryBits.length > 0 ? summaryBits.join(" · ") : "Project workspace";

  return [
    {
      id: `project-open-${project.id}`,
      label: `Open ${project.name}`,
      description: summary,
      category: "Project",
      keywords: [project.customer, project.site, project.roomName, project.stage, project.status].filter(Boolean) as string[],
      run: () => {
        setActiveProjectId(project.id);
        onClose();
        navigate(`/app/projects/${encodeURIComponent(project.id)}`);
      },
    },
    {
      id: `project-resume-${project.id}`,
      label: `${resumeAction.label} · ${project.name}`,
      description: `${summary} · ${project.stage || "Discovery"}`,
      category: "Resume",
      keywords: [resumeAction.shortLabel, project.customer, project.site, project.roomName].filter(Boolean) as string[],
      run: () => {
        setActiveProjectId(project.id);
        onClose();
        navigate(resumeAction.to);
      },
    },
    {
      id: `project-duplicate-${project.id}`,
      label: `Duplicate ${project.name}`,
      description: "Create a new project prefilled from this baseline.",
      category: "Duplicate",
      keywords: [project.customer, project.site, project.roomName, "copy", "clone"].filter(Boolean) as string[],
      run: () => {
        const duplicate = duplicateProject(project.id, {
          name: `${project.name} Copy`,
          status: "Draft",
        });
        onClose();
        if (duplicate) {
          navigate(`/app/projects/${encodeURIComponent(duplicate.id)}`);
        }
      },
    },
  ];
}

export default function WingmanCommandPalette({
  open,
  onClose,
}: WingmanCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const projectsVersion = React.useSyncExternalStore(
    subscribeProjects,
    () => "projects-version",
    () => "projects-version",
  );

  const activeProject = React.useMemo(() => {
    void projectsVersion;
    return getActiveProject() ?? null;
  }, [projectsVersion]);

  const projects = React.useMemo(() => {
    void projectsVersion;
    return loadProjects().slice(0, 5);
  }, [projectsVersion]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  const actions = React.useMemo(() => {
    const core: CommandAction[] = [
      {
        id: "new-project",
        label: "Start New Project",
        description: "Open the launcher with guided, template, and import starting methods.",
        category: "Create",
        keywords: ["launcher", "project", "guided", "template", "import"],
        run: () => {
          onClose();
          navigate(WM_ROUTES.newProject);
        },
      },
      {
        id: "guided-project",
        label: "Open Guided Project",
        description: "Capture room, source, and signal-path detail.",
        category: "Workflow",
        keywords: ["discovery", "requirements", "room", "wizard"],
        run: () => {
          onClose();
          navigate(WM_ROUTES.discovery);
        },
      },
      {
        id: "projects-workspace",
        label: "Open Projects Workspace",
        description: "Browse all active work and continue the right opportunity.",
        category: "Navigation",
        keywords: ["projects", "workspace", "opportunities"],
        run: () => {
          onClose();
          navigate(WM_ROUTES.projects);
        },
      },
      {
        id: "tool-hub",
        label: "Open Tool Hub",
        description: "Jump to all Wingman tools and specialist workflows.",
        category: "Navigation",
        keywords: ["tool hub", "tools", "reference"],
        run: () => {
          onClose();
          navigate(WM_ROUTES.tools);
        },
      },
      {
        id: "proposal",
        label: "Open Proposal Builder",
        description: "Move the active project toward customer-ready output.",
        category: "Workflow",
        keywords: ["proposal", "commercial", "output"],
        run: () => {
          onClose();
          navigate(WM_ROUTES.proposals);
        },
      },
      {
        id: "import-intake",
        label: "Import Brief or Diagram",
        description: "Capture a customer brief, email thread, or existing system note.",
        category: "Workflow",
        keywords: ["import", "brief", "diagram", "document"],
        run: () => {
          onClose();
          navigate("/app/tools/import-intake");
        },
      },
      {
        id: "workspace-settings",
        label: "Open Workspace Settings",
        description: "Manage members, roles, and invites.",
        category: "Admin",
        keywords: ["workspace", "settings", "invites", "roles"],
        run: () => {
          onClose();
          navigate(WM_ROUTES.settings);
        },
      },
    ];

    const dynamic: CommandAction[] = [];

    if (activeProject) {
      const resumeAction = getProjectResumeAction(activeProject);
      dynamic.push({
        id: "active-project",
        label: `Open Active Project · ${activeProject.name}`,
        description: [activeProject.customer, activeProject.site].filter(Boolean).join(" · ") || "Project overview",
        category: "Active",
        keywords: [activeProject.name, activeProject.customer, activeProject.site, activeProject.roomName].filter(Boolean) as string[],
        run: () => {
          setActiveProjectId(activeProject.id);
          onClose();
          navigate(`/app/projects/${encodeURIComponent(activeProject.id)}`);
        },
      });
      dynamic.push({
        id: "active-resume",
        label: `${resumeAction.label} · Active project`,
        description: activeProject.name,
        category: "Active",
        keywords: [resumeAction.shortLabel, activeProject.name, activeProject.customer].filter(Boolean) as string[],
        run: () => {
          setActiveProjectId(activeProject.id);
          onClose();
          navigate(resumeAction.to);
        },
      });
    }

    const recentProjectActions = projects.flatMap((project) => buildProjectActions(project, navigate, onClose));

    return [...dynamic, ...core, ...recentProjectActions];
  }, [activeProject, navigate, onClose, projects]);

  const filteredActions = React.useMemo(
    () => filterActions(actions, query),
    [actions, query],
  );

  React.useEffect(() => {
    if (activeIndex > filteredActions.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, filteredActions.length]);

  if (!open) return null;

  return (
    <div className="wm-commandPalette__backdrop" onClick={onClose}>
      <div
        className="wm-commandPalette"
        role="dialog"
        aria-modal="true"
        aria-label="Wingman command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wm-commandPalette__head">
          <div className="wm-commandPalette__searchShell">
            <Search size={18} />
            <input
              ref={inputRef}
              className="wm-commandPalette__input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  if (filteredActions.length === 0) return;
                  setActiveIndex((value) => Math.min(filteredActions.length - 1, value + 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  if (filteredActions.length === 0) return;
                  setActiveIndex((value) => Math.max(0, value - 1));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  filteredActions[activeIndex]?.run();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
              placeholder="Search tools, projects, and next actions"
            />
          </div>

          <button type="button" className="wm-commandPalette__close" onClick={onClose} aria-label="Close command palette">
            <X size={18} />
          </button>
        </div>

        <div className="wm-commandPalette__hint">
          <Sparkles size={14} />
          <span>Jump to tools, resume active work, or duplicate a recent project from anywhere.</span>
        </div>

        <div className="wm-commandPalette__list">
          {filteredActions.length === 0 ? (
            <div className="wm-commandPalette__empty">
              No matching actions yet. Try a project name, customer, tool, or workflow.
            </div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                type="button"
                className={`wm-commandPalette__item${index === activeIndex ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={action.run}
              >
                <div className="wm-commandPalette__itemCopy">
                  <div className="wm-commandPalette__itemTitle">{action.label}</div>
                  <div className="wm-commandPalette__itemDesc">{action.description}</div>
                </div>
                <div className="wm-commandPalette__itemMeta">
                  <span className="wm-commandPalette__itemTag">
                    {action.category === "Duplicate" ? <Copy size={12} /> : action.category === "Project" || action.category === "Active" ? <FolderOpen size={12} /> : <ArrowRight size={12} />}
                    {action.category}
                  </span>
                  {index === activeIndex ? <ArrowRight size={14} /> : null}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
