import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  ClipboardList,
  FileText,
  FolderOpen,
  Grid3X3,
  LayoutTemplate,
  Package,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import type { WmIcon } from "@/ui2/primitives/workspacePrimitives";
import {
  WmButton,
  WmCard,
  WmHeroCard,
  WmHeroHeader,
  WmInset,
  WmMetaPill,
  WmPage,
  WmSectionHeader,
  WmTextLinkButton,
  WmTile,
  useWindowWidth,
} from "@/ui2/primitives/workspacePrimitives";

type ToolTone = "design" | "product" | "sales";

type ToolItem = {
  key: string;
  title: string;
  desc: string;
  to: string;
  tone: ToolTone;
  Icon: WmIcon;
};

type ActiveProject = {
  name: string;
  status: string;
  skuCount: number;
  proposalState: string;
  updatedAt: string;
};

const TOOLS: ToolItem[] = [
  { key: "discovery", title: "Discovery", desc: "Capture customer requirements", to: "/app/tools/discovery", tone: "design", Icon: Search },
  { key: "room-wizard", title: "Room Wizard", desc: "Create a guided room baseline", to: "/app/tools/room-wizard", tone: "design", Icon: Grid3X3 },
  { key: "templates", title: "Templates", desc: "Start from repeatable room types", to: "/app/tools/templates", tone: "design", Icon: LayoutTemplate },
  { key: "catalog", title: "Product Catalog", desc: "Browse WyreStorm SKUs", to: "/app/tools/catalog", tone: "product", Icon: Package },
  { key: "competitor", title: "Competitor Compare", desc: "Position against alternatives", to: "/app/tools/competitor-compare", tone: "product", Icon: Boxes },
  { key: "proposal", title: "Proposal Builder", desc: "Create BOM and proposal outputs", to: "/app/tools/proposal-builder", tone: "sales", Icon: FileText },
  { key: "documents", title: "Documents", desc: "Exports and customer-facing files", to: "/app/tools/proposal-builder", tone: "sales", Icon: ClipboardList },
];

function readActiveProject(): ActiveProject {
  const fallback: ActiveProject = {
    name: "No active project",
    status: "Draft",
    skuCount: 0,
    proposalState: "None",
    updatedAt: new Date().toLocaleString(),
  };

  try {
    const raw =
      localStorage.getItem("wm_active_project") ||
      localStorage.getItem("wm_project_active") ||
      localStorage.getItem("wm_current_project");

    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return {
      name: parsed?.name || parsed?.projectName || parsed?.title || fallback.name,
      status: parsed?.status || fallback.status,
      skuCount:
        typeof parsed?.skuCount === "number"
          ? parsed.skuCount
          : Array.isArray(parsed?.skus)
            ? parsed.skus.length
            : Array.isArray(parsed?.items)
              ? parsed.items.length
              : 0,
      proposalState:
        parsed?.proposalState ||
        parsed?.proposalStatus ||
        parsed?.proposal ||
        fallback.proposalState,
      updatedAt:
        parsed?.updatedAt ||
        parsed?.modifiedAt ||
        parsed?.lastUpdated ||
        fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}

function toneMap(tone: ToolTone): "design" | "product" | "sales" {
  return tone;
}

export default function ToolHubPage() {
  const navigate = useNavigate();
  const activeProject = React.useMemo(() => readActiveProject(), []);
  const width = useWindowWidth();

  const go = React.useCallback((to: string) => navigate(to), [navigate]);

  const startBlankProject = React.useCallback(() => {
    try {
      const blankProject = {
        name: `New Project ${Math.floor(Math.random() * 900 + 100)}`,
        status: "Draft",
        skuCount: 0,
        proposalState: "None",
        updatedAt: new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
        items: [],
        skus: [],
      };
      localStorage.setItem("wm_active_project", JSON.stringify(blankProject));
    } catch {
      // continue regardless
    }

    navigate("/app/projects");
  }, [navigate]);

  const compact = width < 1400;
  const stackPage = width < 1180;
  const actionCols = width < 860 ? 1 : 3;
  const quickCols =
    width < 900 ? "repeat(2, minmax(0,1fr))" :
    width < 1200 ? "repeat(3, minmax(0,1fr))" :
    width < 1600 ? "repeat(5, minmax(0,1fr))" :
    "repeat(6, minmax(0,1fr))";

  return (
    <WmPage>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: stackPage
            ? "minmax(0, 1fr)"
            : "minmax(0, 1.6fr) 320px",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 14,
            minWidth: 0,
          }}
        >
          <WmHeroCard compact>
            <WmHeroHeader
              title="ToolHub"
              subtitle="Continue current work or launch the next tool in the sales workflow."
              compact
              actions={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <WmButton
                    label="Projects"
                    onClick={() => go("/app/projects")}
                    Icon={FolderOpen}
                    compact
                  />
                  <WmButton
                    label="Dashboard"
                    onClick={() => go("/app/dashboard")}
                    compact
                  />
                </div>
              }
            />

            <WmInset compact>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <WmMetaPill compact>Project: {activeProject.name}</WmMetaPill>
                  <WmMetaPill compact>Status: {activeProject.status}</WmMetaPill>
                  <WmMetaPill compact>SKUs: {activeProject.skuCount}</WmMetaPill>
                  <WmMetaPill compact>Proposal: {activeProject.proposalState}</WmMetaPill>
                  <WmMetaPill compact>Updated: {String(activeProject.updatedAt)}</WmMetaPill>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(214,226,240,0.68)",
                  }}
                >
                  Active workspace
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${actionCols}, minmax(0, 1fr))`,
                  gap: 10,
                }}
              >
                <WmButton
                  label="Open Discovery"
                  onClick={() => go("/app/tools/discovery")}
                  Icon={Sparkles}
                  primary
                  full
                  compact={compact}
                />
                <WmButton
                  label="Open Catalog"
                  onClick={() => go("/app/tools/catalog")}
                  Icon={Package}
                  full
                  compact={compact}
                />
                <WmButton
                  label="Open Proposal"
                  onClick={() => go("/app/tools/proposal-builder")}
                  Icon={FileText}
                  full
                  compact={compact}
                />
              </div>
            </WmInset>
          </WmHeroCard>

          <WmCard padding={14}>
            <WmSectionHeader
              title="Quick Launch"
              subtitle="Select a tool directly without scrolling through large cards."
              action={
                <WmTextLinkButton
                  label="Open existing project"
                  onClick={() => go("/app/projects")}
                />
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: quickCols,
                gap: 12,
              }}
            >
              {TOOLS.map((item) => (
                <WmTile
                  key={item.key}
                  title={item.title}
                  desc={item.desc}
                  tone={toneMap(item.tone)}
                  Icon={item.Icon}
                  tag={
                    item.tone === "design"
                      ? "Design"
                      : item.tone === "product"
                        ? "Product"
                        : "Sales"
                  }
                  onOpen={() => go(item.to)}
                  compact
                  minHeight={110}
                />
              ))}
            </div>
          </WmCard>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            alignSelf: "start",
            position: stackPage ? "static" : "sticky",
            top: stackPage ? undefined : 10,
          }}
        >
          <WmCard tone="primary" padding={16}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                marginBottom: 10,
              }}
            >
              <Plus size={18} />
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#f5fbff",
                lineHeight: 1.08,
                marginBottom: 6,
              }}
            >
              Start New Project
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: "rgba(230,240,250,0.84)",
                marginBottom: 14,
              }}
            >
              Create a blank workspace for a new customer opportunity or quotation.
            </div>

            <WmButton
              label="Create Blank Project"
              onClick={startBlankProject}
              Icon={Plus}
              primary
              full
              compact={compact}
            />
          </WmCard>

          <WmCard padding={14}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 900,
                color: "#f5fbff",
                lineHeight: 1.1,
                marginBottom: 8,
              }}
            >
              Suggested workflow
            </div>

            <div
              style={{
                fontSize: 12,
                color: "rgba(221,230,242,0.76)",
                lineHeight: 1.45,
                marginBottom: 12,
              }}
            >
              Best path for most sales users.
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <WmButton
                label="1. Discovery"
                onClick={() => go("/app/tools/discovery")}
                Icon={Search}
                primary
                full
                compact
              />
              <WmButton
                label="2. Product Catalog"
                onClick={() => go("/app/tools/catalog")}
                Icon={Package}
                full
                compact
              />
              <WmButton
                label="3. Proposal Builder"
                onClick={() => go("/app/tools/proposal-builder")}
                Icon={FileText}
                full
                compact
              />
            </div>
          </WmCard>
        </div>
      </div>
    </WmPage>
  );
}
