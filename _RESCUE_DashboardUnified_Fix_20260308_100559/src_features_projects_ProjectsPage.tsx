import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  FolderOpen,
  Package,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  WmButton,
  WmCard,
  WmEmptyState,
  WmHeroCard,
  WmHeroGrid,
  WmHeroHeader,
  WmPage,
  WmSectionHeader,
  WmStatCard,
  WmTextLinkButton,
  WmTile,
  useWindowWidth,
} from "@/ui2/primitives/workspacePrimitives";

type ProjectRecord = {
  id: string;
  name: string;
  status: string;
  skuCount: number;
  proposalState: string;
  updatedAt: string;
};

const STORAGE_KEYS = ["wm_projects", "wm_project_list", "wm_saved_projects"];

function normaliseProject(input: any, index: number): ProjectRecord {
  const skuCount =
    typeof input?.skuCount === "number"
      ? input.skuCount
      : Array.isArray(input?.skus)
        ? input.skus.length
        : Array.isArray(input?.items)
          ? input.items.length
          : 0;

  return {
    id: String(input?.id || input?.projectId || input?.name || input?.projectName || `project-${index + 1}`),
    name: String(input?.name || input?.projectName || input?.title || `Project ${index + 1}`),
    status: String(input?.status || "Draft"),
    skuCount,
    proposalState: String(input?.proposalState || input?.proposalStatus || input?.proposal || "None"),
    updatedAt: String(input?.updatedAt || input?.modifiedAt || input?.lastUpdated || new Date().toLocaleString()),
  };
}

function readProjects(): ProjectRecord[] {
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, index) => normaliseProject(item, index));
      }
    } catch {
      // ignore
    }
  }

  try {
    const activeRaw =
      localStorage.getItem("wm_active_project") ||
      localStorage.getItem("wm_project_active") ||
      localStorage.getItem("wm_current_project");

    if (activeRaw) {
      return [normaliseProject(JSON.parse(activeRaw), 0)];
    }
  } catch {
    // ignore
  }

  return [];
}

function saveActiveProject(project: ProjectRecord) {
  const next = {
    id: project.id,
    name: project.name,
    status: project.status,
    skuCount: project.skuCount,
    proposalState: project.proposalState,
    updatedAt: project.updatedAt,
    items: [],
    skus: Array.from({ length: project.skuCount }).map((_, index) => ({
      id: `sku-${index + 1}`,
    })),
  };

  localStorage.setItem("wm_active_project", JSON.stringify(next));
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = React.useState<ProjectRecord[]>(() => readProjects());
  const width = useWindowWidth();

  const startBlankProject = React.useCallback(() => {
    const blankProject = {
      id: `project-${Date.now()}`,
      name: `New Project ${Math.floor(Math.random() * 900 + 100)}`,
      status: "Draft",
      skuCount: 0,
      proposalState: "None",
      updatedAt: new Date().toLocaleString(),
    };

    try {
      const nextProjects = [blankProject, ...projects];
      localStorage.setItem("wm_projects", JSON.stringify(nextProjects));
      localStorage.setItem(
        "wm_active_project",
        JSON.stringify({
          ...blankProject,
          createdAt: new Date().toISOString(),
          items: [],
          skus: [],
        })
      );
      setProjects(nextProjects);
    } catch {
      // continue regardless
    }

    navigate("/app/tools/discovery");
  }, [navigate, projects]);

  const openProject = React.useCallback(
    (project: ProjectRecord) => {
      try {
        saveActiveProject(project);
      } catch {
        // continue regardless
      }
      navigate("/app/tools");
    },
    [navigate]
  );

  const compact = width < 1400;
  const actionCols = width < 860 ? 1 : 3;
  const projectCols =
    width < 900 ? "repeat(1, minmax(0, 1fr))" :
    width < 1200 ? "repeat(2, minmax(0, 1fr))" :
    width < 1600 ? "repeat(4, minmax(0, 1fr))" :
    "repeat(5, minmax(0, 1fr))";

  return (
    <WmPage>
      <WmHeroGrid
        left={
          <WmHeroCard compact>
            <WmHeroHeader
              title="Projects"
              subtitle="Open saved workspaces, continue opportunities, or create a new project."
              compact
              actions={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <WmButton
                    label="ToolHub"
                    onClick={() => navigate("/app/tools")}
                    Icon={Sparkles}
                    compact
                  />
                  <WmButton
                    label="Start New Project"
                    onClick={startBlankProject}
                    Icon={Plus}
                    primary
                    compact
                  />
                </div>
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${actionCols}, minmax(0, 1fr))`,
                gap: 10,
              }}
            >
              <WmButton
                label="Open Discovery"
                onClick={() => navigate("/app/tools/discovery")}
                Icon={Search}
                compact={compact}
              />
              <WmButton
                label="Open Catalog"
                onClick={() => navigate("/app/tools/catalog")}
                Icon={Package}
                compact={compact}
              />
              <WmButton
                label="Open Proposal"
                onClick={() => navigate("/app/tools/proposal-builder")}
                Icon={FileText}
                compact={compact}
              />
            </div>
          </WmHeroCard>
        }
        right={
          <div style={{ display: "grid", gap: 14 }}>
            <WmStatCard
              label="Saved Projects"
              value={projects.length}
              hint="Available workspaces stored locally in the current build."
            />
            <WmCard padding={16}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#f5fbff",
                  lineHeight: 1.1,
                  marginBottom: 8,
                }}
              >
                Recommended path
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(221,230,242,0.74)",
                  lineHeight: 1.45,
                  marginBottom: 12,
                }}
              >
                Start with Discovery for a new opportunity, then move to catalog and proposal.
              </div>
              <WmTextLinkButton
                label="Open Discovery"
                onClick={() => navigate("/app/tools/discovery")}
              />
            </WmCard>
          </div>
        }
      />

      <WmCard padding={16}>
        <WmSectionHeader
          title="Project Library"
          subtitle="Select a project to make it the active workspace."
        />

        {projects.length === 0 ? (
          <WmEmptyState
            title="No saved projects yet"
            body="Create a blank project to start a new opportunity, or begin with Discovery and let the workspace build from there."
            action={
              <WmButton
                label="Start New Project"
                onClick={startBlankProject}
                Icon={Plus}
                primary
              />
            }
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: projectCols,
              gap: 12,
            }}
          >
            {projects.map((project) => (
              <WmTile
                key={project.id}
                title={project.name}
                desc={`Status: ${project.status} • SKUs: ${project.skuCount} • Proposal: ${project.proposalState} • Updated: ${project.updatedAt}`}
                Icon={FolderOpen}
                tag={project.status}
                onOpen={() => openProject(project)}
                compact
                minHeight={130}
                tone="default"
              />
            ))}
          </div>
        )}
      </WmCard>
    </WmPage>
  );
}