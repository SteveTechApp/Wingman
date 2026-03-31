export type MissionControlTone = "mission" | "workflow" | "tools";

export type MissionControlStageId = "control" | "workflow" | "reference";

type RouteMatch = {
  pathname: string;
  mode?: "exact" | "prefix";
  searchParams?: Record<string, string>;
  excludedSearchParams?: Record<string, string>;
};

export type MissionControlItem = {
  id: string;
  title: string;
  short: string;
  to: string;
  description: string;
  match: RouteMatch;
};

export type MissionControlStage = {
  id: MissionControlStageId;
  index: string;
  label: string;
  cue: string;
  description: string;
  tone: MissionControlTone;
  items: MissionControlItem[];
};

export const MISSION_CONTROL_STAGES: MissionControlStage[] = [
  {
    id: "control",
    index: "01",
    label: "Control",
    cue: "Set the workspace before work starts.",
    description: "Projects, ownership, and the command view live here.",
    tone: "mission",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        short: "DB",
        to: "/app/dashboard",
        description: "Track project health and live priorities.",
        match: {
          pathname: "/app/dashboard",
          mode: "exact",
          excludedSearchParams: { panel: "architecture" },
        },
      },
      {
        id: "projects",
        title: "Projects",
        short: "PR",
        to: "/app/projects",
        description: "Create, select, and manage active project records.",
        match: { pathname: "/app/projects", mode: "prefix" },
      },
      {
        id: "tool-hub",
        title: "Tool Hub",
        short: "TH",
        to: "/app/tools",
        description: "Browse the wider Wingman toolset from one place.",
        match: { pathname: "/app/tools", mode: "exact" },
      },
    ],
  },
  {
    id: "workflow",
    index: "02",
    label: "Workflow",
    cue: "Move from guided capture to proposal output.",
    description: "Core delivery steps stay grouped as one shared process.",
    tone: "workflow",
    items: [
      {
        id: "guided-project",
        title: "Discovery",
        short: "DS",
        to: "/app/tools/discovery",
        description: "Capture the brief and shape the system direction.",
        match: { pathname: "/app/tools/discovery", mode: "prefix" },
      },
      {
        id: "room-definition",
        title: "Room Definition",
        short: "RM",
        to: "/app/tools/room-wizard",
        description: "Define room layout, context, and physical constraints.",
        match: { pathname: "/app/tools/room-wizard", mode: "prefix" },
      },
      {
        id: "tech-selection",
        title: "Tech Selection",
        short: "TS",
        to: "/app/tools/navigator",
        description: "Choose the right transport and system approach.",
        match: { pathname: "/app/tools/navigator", mode: "prefix" },
      },
      {
        id: "products-workflow",
        title: "Product Selection",
        short: "PD",
        to: "/app/tools/catalog?mode=workflow",
        description: "Refine the shortlist into the product path.",
        match: {
          pathname: "/app/tools/catalog",
          mode: "exact",
          searchParams: { mode: "workflow" },
        },
      },
      {
        id: "architecture",
        title: "System Architecture",
        short: "AR",
        to: "/app/dashboard",
        description: "Shape the signal path and architecture view.",
        match: {
          pathname: "/app/dashboard",
          mode: "exact",
        },
      },
      {
        id: "bom",
        title: "Bill of Materials",
        short: "BM",
        to: "/app/tools/proposal?tab=bom",
        description: "Review line items and BOM structure.",
        match: {
          pathname: "/app/tools/proposal",
          mode: "exact",
          searchParams: { tab: "bom" },
        },
      },
      {
        id: "proposal",
        title: "Proposal Output",
        short: "PB",
        to: "/app/tools/proposal",
        description: "Turn the design path into a customer-ready pack.",
        match: { pathname: "/app/tools/proposal", mode: "prefix" },
      },
    ],
  },
  {
    id: "reference",
    index: "03",
    label: "Tools",
    cue: "Launch specialist tools without crowding the workflow.",
    description: "Deep-dive utilities and sales support stay available here.",
    tone: "tools",
    items: [
      {
        id: "catalogue",
        title: "Catalogue",
        short: "CT",
        to: "/app/tools/catalog",
        description: "Search the full product catalogue and specifications.",
        match: {
          pathname: "/app/tools/catalog",
          mode: "exact",
          excludedSearchParams: { mode: "workflow" },
        },
      },
      {
        id: "competitors",
        title: "Competitor Compare",
        short: "CC",
        to: "/app/tools/compare",
        description: "Compare positioning and replacement options quickly.",
        match: { pathname: "/app/tools/compare", mode: "prefix" },
      },
      {
        id: "video-wall",
        title: "Video Wall",
        short: "VW",
        to: "/app/tools/video-wall",
        description: "Handle LED and video wall planning in its own lane.",
        match: { pathname: "/app/tools/video-wall", mode: "prefix" },
      },
      {
        id: "import-brief",
        title: "Import Customer Brief",
        short: "IB",
        to: "/app/tools/import-intake",
        description: "Upload and structure a customer brief.",
        match: { pathname: "/app/tools/import-intake", mode: "prefix" },
      },
      {
        id: "product-intelligence",
        title: "Product Intelligence",
        short: "PI",
        to: "/app/tools/product-intelligence",
        description: "Review enrichment, intelligence, and product data quality.",
        match: { pathname: "/app/tools/product-intelligence", mode: "prefix" },
      },
      {
        id: "sales-positioning",
        title: "Sales Positioning",
        short: "SP",
        to: "/app/tools/sales",
        description: "Guide positioning against competitor options and fit.",
        match: { pathname: "/app/tools/sales", mode: "prefix" },
      },
      {
        id: "training",
        title: "Training Hub",
        short: "TR",
        to: "/app/tools/training",
        description: "Open training and sales enablement content.",
        match: { pathname: "/app/tools/training", mode: "prefix" },
      },
      {
        id: "guru",
        title: "Guru",
        short: "AI",
        to: "/app/tools/guru",
        description: "Launch the AI assistant workspace.",
        match: { pathname: "/app/tools/guru", mode: "prefix" },
      },
    ],
  },
];

function matchSearchParams(
  params: URLSearchParams,
  expected?: Record<string, string>,
  excluded?: Record<string, string>,
): boolean {
  if (expected) {
    for (const [key, value] of Object.entries(expected)) {
      if (params.get(key) !== value) return false;
    }
  }

  if (excluded) {
    for (const [key, value] of Object.entries(excluded)) {
      if (params.get(key) === value) return false;
    }
  }

  return true;
}

export function isMissionControlItemActive(
  item: MissionControlItem,
  pathname: string,
  search = "",
): boolean {
  const mode = item.match.mode ?? "exact";
  const pathMatches = mode === "prefix"
    ? pathname.startsWith(item.match.pathname)
    : pathname === item.match.pathname;

  if (!pathMatches) return false;

  return matchSearchParams(
    new URLSearchParams(search),
    item.match.searchParams,
    item.match.excludedSearchParams,
  );
}

export function getMissionControlStage(
  pathname: string,
  search = "",
): MissionControlStage {
  for (const stage of MISSION_CONTROL_STAGES) {
    if (stage.items.some((item) => isMissionControlItemActive(item, pathname, search))) {
      return stage;
    }
  }

  return MISSION_CONTROL_STAGES[0];
}