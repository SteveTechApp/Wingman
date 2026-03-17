import * as React from "react";
import {
  ArrowRight,
  Copy,
  FileUp,
  FolderOpen,
  FolderPlus,
  LayoutTemplate,
  Route,
  ScanSearch,
  Search,
  Sparkles,
  X,
} from "lucide-react";
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

type CommandGroup = "Continue" | "Start" | "Workflow" | "Workspace" | "Admin";
type CommandKind =
  | "project"
  | "resume"
  | "duplicate"
  | "create"
  | "import"
  | "template"
  | "workflow"
  | "workspace"
  | "admin";

type CommandAction = {
  id: string;
  label: string;
  description: string;
  group: CommandGroup;
  kind: CommandKind;
  badge: string;
  keywords: string[];
  run: () => void;
};

type ProjectActionBundle = {
  project: StoredProject;
  summary: string;
  resumeTag: string;
  open: CommandAction;
  resume: CommandAction;
  duplicate: CommandAction;
};

const GROUP_ORDER: CommandGroup[] = ["Continue", "Start", "Workflow", "Workspace", "Admin"];

function buildSearchText(action: CommandAction): string {
  return [
    action.label,
    action.description,
    action.group,
    action.badge,
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
      if (action.label.toLowerCase().startsWith(needle)) score += 6;
      if (action.badge.toLowerCase().startsWith(needle)) score += 3;
      if (action.group.toLowerCase().startsWith(needle)) score += 2;

      for (const token of tokens) {
        if (action.label.toLowerCase().includes(token)) score += 3;
        if (action.description.toLowerCase().includes(token)) score += 2;
        if (action.keywords.some((keyword) => keyword.toLowerCase().includes(token))) score += 1;
      }

      return { action, score };
    })
    .filter((item): item is { action: CommandAction; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .map((item) => item.action)
    .slice(0, 16);
}

function groupActions(actions: CommandAction[]): Array<{ group: CommandGroup; actions: CommandAction[] }> {
  return GROUP_ORDER
    .map((group) => ({
      group,
      actions: actions.filter((action) => action.group === group),
    }))
    .filter((group) => group.actions.length > 0);
}

function commandIcon(action: CommandAction, size = 18) {
  if (action.kind === "project" || action.kind === "workspace") {
    return <FolderOpen size={size} />;
  }
  if (action.kind === "resume" || action.kind === "workflow") {
    return <Route size={size} />;
  }
  if (action.kind === "duplicate") {
    return <Copy size={size} />;
  }
  if (action.kind === "create") {
    return <FolderPlus size={size} />;
  }
  if (action.kind === "import") {
    return <FileUp size={size} />;
  }
  if (action.kind === "template") {
    return <LayoutTemplate size={size} />;
  }
  if (action.kind === "admin") {
    return <ScanSearch size={size} />;
  }
  return <Sparkles size={size} />;
}

function buildProjectActionBundle(
  project: StoredProject,
  navigate: ReturnType<typeof useNavigate>,
  onClose: () => void,
): ProjectActionBundle {
  const resumeAction = getProjectResumeAction(project);
  const summaryBits = [project.customer, project.site, project.roomName].filter(Boolean);
  const summary = summaryBits.length > 0 ? summaryBits.join(" ?f??s� ") : "Project workspace";

  return {
    project,
    summary,
    resumeTag: resumeAction.shortLabel,
    open: {
      id: `project-open-${project.id}`,
      label: `Open ${project.name}`,
      description: summary,
      group: "Continue",
      kind: "project",
      badge: "Project",
      keywords: [project.customer, project.site, project.roomName, project.stage, project.status].filter(Boolean) as string[],
      run: () => {
        setActiveProjectId(project.id);
        onClose();
        navigate(`/app/projects/${encodeURIComponent(project.id)}`);
      },
    },
    resume: {
      id: `project-resume-${project.id}`,
      label: `${resumeAction.label} ?f??s� ${project.name}`,
      description: `${summary} ?f??s� ${project.stage || "Discovery"}`,
      group: "Continue",
      kind: "resume",
      badge: resumeAction.shortLabel,
      keywords: [resumeAction.shortLabel, project.customer, project.site, project.roomName].filter(Boolean) as string[],
      run: () => {
        setActiveProjectId(project.id);
        onClose();
        navigate(resumeAction.to);
      },
    },
    duplicate: {
      id: `project-duplicate-${project.id}`,
      label: `Duplicate ${project.name}`,
      description: "Create a fresh opportunity using this project as the baseline.",
      group: "Start",
      kind: "duplicate",
      badge: "Duplicate",
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
  };
}

function PreviewPanel({
  action,
}: {
  action: CommandAction | null;
}) {
  if (!action) return null;

  return (
    <aside className="wm-commandPalette__preview">
      <div className="wm-commandPalette__previewTitle">{action.label}</div>
      <div className="wm-commandPalette__previewBody">{action.description}</div>

      <button type="button" className="wm-commandPalette__previewButton" onClick={action.run}>
        Open This Action
        <ArrowRight size={15} />
      </button>
    </aside>
  );
}

export default function WingmanCommandPalette({
  open,
  onClose,
}: WingmanCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [previewActionId, setPreviewActionId] = React.useState<string | null>(null);
  const projectsVersion = React.useSyncExternalStore(
    subscribeProjects,
    () => "projects-version",
    () => "projects-version",
  );

  const activeProject = React.useMemo(() => {
    void projectsVersion;
    return getActiveProject() ?? null;
  }, [projectsVersion]);

  const recentProjects = React.useMemo(() => {
    void projectsVersion;
    const allProjects = loadProjects();
    return allProjects
      .filter((project) => project.id !== activeProject?.id)
      .slice(0, 4);
  }, [activeProject?.id, projectsVersion]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  const coreActions = React.useMemo<CommandAction[]>(() => [
    {
      id: "new-project",
      label: "Start New Project",
      description: "Open the project launcher with guided, template, and import starting methods.",
      group: "Start",
      kind: "create",
      badge: "Launcher",
      keywords: ["launcher", "project", "guided", "template", "import"],
      run: () => {
        onClose();
        navigate(WM_ROUTES.newProject);
      },
    },
    {
      id: "import-intake",
      label: "Import Tender, RFQ, or Email",
      description: "Bring in formal documents, interrogate email threads, or structure a new enquiry from scratch.",
      group: "Start",
      kind: "import",
      badge: "Import",
      keywords: ["import", "brief", "diagram", "document", "tender", "rfq", "email"],
      run: () => {
        onClose();
        navigate("/app/tools/import-intake");
      },
    },
    {
      id: "templates",
      label: "Open Templates",
      description: "Start from a proven room archetype and tailor it to the opportunity.",
      group: "Start",
      kind: "template",
      badge: "Template",
      keywords: ["template", "archetype", "room type", "starting point"],
      run: () => {
        onClose();
        navigate(WM_ROUTES.templates);
      },
    },
    {
      id: "guided-project",
      label: "Open Guided Project",
      description: "Capture room, source, and signal-path detail for a live opportunity.",
      group: "Workflow",
      kind: "workflow",
      badge: "Discovery",
      keywords: ["discovery", "requirements", "room", "wizard"],
      run: () => {
        onClose();
        navigate(WM_ROUTES.discovery);
      },
    },
    {
      id: "proposal",
      label: "Open Proposal Builder",
      description: "Move the active project toward customer-ready commercial output.",
      group: "Workflow",
      kind: "workflow",
      badge: "Proposal",
      keywords: ["proposal", "commercial", "output"],
      run: () => {
        onClose();
        navigate(WM_ROUTES.proposals);
      },
    },
    {
      id: "projects-workspace",
      label: "Open Projects Workspace",
      description: "Browse all active work and continue the right opportunity.",
      group: "Workspace",
      kind: "workspace",
      badge: "Projects",
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
      group: "Workspace",
      kind: "workspace",
      badge: "Tools",
      keywords: ["tool hub", "tools", "reference"],
      run: () => {
        onClose();
        navigate(WM_ROUTES.tools);
      },
    },
    {
      id: "workspace-settings",
      label: "Open Workspace Settings",
      description: "Manage members, roles, and invites for the workspace.",
      group: "Admin",
      kind: "admin",
      badge: "Admin",
      keywords: ["workspace", "settings", "invites", "roles"],
      run: () => {
        onClose();
        navigate(WM_ROUTES.settings);
      },
    },
  ], [navigate, onClose]);

  const activeBundle = React.useMemo(
    () => activeProject ? buildProjectActionBundle(activeProject, navigate, onClose) : null,
    [activeProject, navigate, onClose],
  );

  const recentBundles = React.useMemo(
    () => recentProjects.map((project) => buildProjectActionBundle(project, navigate, onClose)),
    [navigate, onClose, recentProjects],
  );

  const actionMap = React.useMemo(() => {
    const searchActions = [
      ...(activeBundle ? [activeBundle.open, activeBundle.resume] : []),
      ...coreActions,
      ...recentBundles.flatMap((bundle) => [bundle.open, bundle.resume, bundle.duplicate]),
    ];

    return new Map(searchActions.map((action) => [action.id, action]));
  }, [activeBundle, coreActions, recentBundles]);

  const searchActions = React.useMemo(
    () => Array.from(actionMap.values()),
    [actionMap],
  );

  const filteredActions = React.useMemo(
    () => filterActions(searchActions, query),
    [query, searchActions],
  );

  const groupedResults = React.useMemo(
    () => groupActions(filteredActions),
    [filteredActions],
  );

  const indexedResults = React.useMemo(
    () => new Map(filteredActions.map((action, index) => [action.id, index])),
    [filteredActions],
  );

  const primaryAction = activeBundle?.resume ?? actionMap.get("new-project") ?? null;
  const launchActions = [
    actionMap.get("new-project"),
    actionMap.get("import-intake"),
    actionMap.get("templates"),
  ].filter((action): action is CommandAction => Boolean(action));
  const quickRouteActions = [
    activeBundle?.open ?? null,
    actionMap.get("guided-project") ?? null,
    actionMap.get("proposal") ?? null,
    actionMap.get("projects-workspace") ?? null,
    actionMap.get("tool-hub") ?? null,
    actionMap.get("workspace-settings") ?? null,
  ].filter((action): action is CommandAction => Boolean(action));

  const defaultPreviewAction = primaryAction ?? launchActions[0] ?? filteredActions[0] ?? null;
  const hasQuery = query.trim().length > 0;
  const previewAction = hasQuery
    ? filteredActions[activeIndex] ?? defaultPreviewAction
    : (previewActionId ? actionMap.get(previewActionId) ?? defaultPreviewAction : defaultPreviewAction);

  React.useEffect(() => {
    if (!open) return;
    setPreviewActionId(defaultPreviewAction?.id ?? null);
  }, [defaultPreviewAction?.id, open]);

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
        <div className="wm-commandPalette__topline">
          <div>
            <div className="wm-commandPalette__eyebrow">Workspace Launcher</div>
            <div className="wm-commandPalette__title">Find the right next move</div>
          </div>

          <div className="wm-commandPalette__topActions">
            <span className="wm-commandPalette__keycap">Ctrl+K</span>
            <button
              type="button"
              className="wm-commandPalette__close"
              onClick={onClose}
              aria-label="Close command palette"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="wm-commandPalette__subhead">
          Continue the active opportunity, start from a tender pack, or jump straight into the right workflow without digging through the navigation.
        </div>

        <div className="wm-commandPalette__head">
          <div className="wm-commandPalette__searchShell">
            <Search size={18} />
            <input
              ref={inputRef}
              className="wm-commandPalette__input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
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
                  (hasQuery ? filteredActions[activeIndex] : previewAction)?.run();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
              placeholder="Search customers, tools, workflows, and project names"
            />
          </div>

        </div>

        {!hasQuery ? (
          <div className="wm-commandPalette__launcher">
            <div className="wm-commandPalette__hero">
              {primaryAction ? (
                <button
                  type="button"
                  className="wm-commandPalette__spotlight"
                  onMouseEnter={() => setPreviewActionId(primaryAction.id)}
                  onFocus={() => setPreviewActionId(primaryAction.id)}
                  onClick={primaryAction.run}
                >
                  <div className="wm-commandPalette__spotlightTitle">{primaryAction.label}</div>
                  <div className="wm-commandPalette__spotlightBody">
                    {activeBundle
                      ? `${activeBundle.project.name} ?f��??s�� ${activeBundle.summary}`
                      : primaryAction.description}
                  </div>
                  <div className="wm-commandPalette__spotlightFooter">
                    <ArrowRight size={16} />
                  </div>
                </button>
              ) : null}

              <PreviewPanel action={previewAction} />
            </div>

            <div className="wm-commandPalette__cardGrid">
              {launchActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`wm-commandPalette__card wm-commandPalette__card--${action.kind}`}
                  onMouseEnter={() => setPreviewActionId(action.id)}
                  onFocus={() => setPreviewActionId(action.id)}
                  onClick={action.run}
                >
                  <div className="wm-commandPalette__cardIcon">{commandIcon(action, 18)}</div>
                  <div className="wm-commandPalette__cardTitle">{action.label}</div>
                  <div className="wm-commandPalette__cardDesc">{action.description}</div>
                  <div className="wm-commandPalette__cardBadge">
                    <ArrowRight size={14} />
                  </div>
                </button>
              ))}
            </div>

            <div className="wm-commandPalette__sectionGrid">
              <section className="wm-commandPalette__section">
                <div className="wm-commandPalette__sectionHead">
                  <div>
                    <div className="wm-commandPalette__sectionTitle">Recent opportunities</div>
                    <div className="wm-commandPalette__sectionNote">
                      Resume, open, or duplicate recent work without filling the launcher with repeated rows.
                    </div>
                  </div>
                </div>

                {recentBundles.length === 0 ? (
                  <div className="wm-commandPalette__empty">
                    No recent projects yet. Start with a new project or import a tender, email, or RFQ to seed the workspace.
                  </div>
                ) : (
                  <div className="wm-commandPalette__projectList">
                    {recentBundles.map((bundle) => (
                      <article
                        key={bundle.project.id}
                        className="wm-commandPalette__projectCard"
                      >
                        <div className="wm-commandPalette__projectHead">
                          <div>
                            <div className="wm-commandPalette__projectName">{bundle.project.name}</div>
                            <div className="wm-commandPalette__projectMeta">{bundle.summary}</div>
                          </div>
                        </div>

                        <div className="wm-commandPalette__projectActions">
                          <button
                            type="button"
                            className="wm-commandPalette__miniAction is-primary"
                            onMouseEnter={() => setPreviewActionId(bundle.resume.id)}
                            onFocus={() => setPreviewActionId(bundle.resume.id)}
                            onClick={bundle.resume.run}
                          >
                            Resume {bundle.resumeTag}
                          </button>
                          <button
                            type="button"
                            className="wm-commandPalette__miniAction"
                            onMouseEnter={() => setPreviewActionId(bundle.open.id)}
                            onFocus={() => setPreviewActionId(bundle.open.id)}
                            onClick={bundle.open.run}
                          >
                            Open project
                          </button>
                          <button
                            type="button"
                            className="wm-commandPalette__miniAction"
                            onMouseEnter={() => setPreviewActionId(bundle.duplicate.id)}
                            onFocus={() => setPreviewActionId(bundle.duplicate.id)}
                            onClick={bundle.duplicate.run}
                          >
                            Duplicate
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="wm-commandPalette__section">
                <div className="wm-commandPalette__sectionHead">
                  <div>
                    <div className="wm-commandPalette__sectionTitle">Jump straight in</div>
                    <div className="wm-commandPalette__sectionNote">
                      Use these when you know the destination and do not need the launcher path cards.
                    </div>
                  </div>
                </div>

                <div className="wm-commandPalette__quickList">
                  {quickRouteActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="wm-commandPalette__quickAction"
                      onMouseEnter={() => setPreviewActionId(action.id)}
                      onFocus={() => setPreviewActionId(action.id)}
                      onClick={action.run}
                    >
                      <span className="wm-commandPalette__quickIcon">{commandIcon(action, 16)}</span>
                      <span className="wm-commandPalette__quickCopy">
                        <strong>{action.label}</strong>
                        <span>{action.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="wm-commandPalette__resultsShell">
            <div className="wm-commandPalette__resultsGroups">
              {groupedResults.length === 0 ? (
                <div className="wm-commandPalette__empty">
                  No matching actions yet. Try a customer name, project, room type, tool, or workflow.
                </div>
              ) : (
                groupedResults.map((group) => (
                  <section key={group.group} className="wm-commandPalette__group">
                    <div className="wm-commandPalette__groupTitle">{group.group}</div>
                    <div className="wm-commandPalette__list">
                      {group.actions.map((action) => {
                        const resultIndex = indexedResults.get(action.id) ?? 0;

                        return (
                          <button
                            key={action.id}
                            type="button"
                            className={`wm-commandPalette__item${resultIndex === activeIndex ? " is-active" : ""}`}
                            onMouseEnter={() => {
                              setActiveIndex(resultIndex);
                            }}
                            onFocus={() => {
                              setActiveIndex(resultIndex);
                            }}
                            onClick={action.run}
                          >
                            <span className="wm-commandPalette__itemIcon">{commandIcon(action, 16)}</span>
                            <div className="wm-commandPalette__itemCopy">
                              <div className="wm-commandPalette__itemTitle">{action.label}</div>
                              <div className="wm-commandPalette__itemDesc">{action.description}</div>
                            </div>
                            {resultIndex === activeIndex ? (
                              <div className="wm-commandPalette__itemMeta">
                                <ArrowRight size={14} />
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>

            <PreviewPanel action={previewAction} />
          </div>
        )}
      </div>
    </div>
  );
}
