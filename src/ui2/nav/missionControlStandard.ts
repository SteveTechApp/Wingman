import { WM_ROUTES } from "@/core/wingman/routeMap";
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
    cue: "Keep the workspace clear and in motion.",
    description: "Projects, ownership, and the command view live here.",
    tone: "mission",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        short: "DB",
        to: WM_ROUTES.DASHBOARD,
        description: "Track project health and live priorities.",
        match: {
          pathname: WM_ROUTES.DASHBOARD,
          mode: "exact",
          excludedSearchParams: { panel: "architecture" },
        },
      },
      {
        id: "projects",
        title: "Projects",
        short: "PR",
        to: WM_ROUTES.PROJECTS,
        description: "Create, select, and manage active project records.",
        match: { pathname: WM_ROUTES.PROJECTS, mode: "prefix" },
      },
      {
        id: "tool-hub",
        title: "Tool Hub",
        short: "TH",
        to: WM_ROUTES.TOOLS,
        description: "Browse specialist tools from one compact hub.",
        match: { pathname: WM_ROUTES.TOOLS, mode: "exact" },
      },
    ],
  },
  {
    id: "workflow",
    index: "02",
    label: "Workflow",
    cue: "Step through the delivery path without losing context.",
    description: "Core delivery steps stay grouped as one shared process.",
    tone: "workflow",
    items: [
      {
        id: "guided-project",
        title: "Discovery",
        short: "DS",
        to: WM_ROUTES.DISCOVERY,
        description: "Capture the brief and shape the system direction.",
        match: { pathname: WM_ROUTES.DISCOVERY, mode: "prefix" },
      },
      {
        id: "room-definition",
        title: "Room Definition",
        short: "RM",
        to: WM_ROUTES.ROOM_WIZARD,
        description: "Define room layout, context, and physical constraints.",
        match: { pathname: WM_ROUTES.ROOM_WIZARD, mode: "prefix" },
      },
      {
        id: "tech-selection",
        title: "Tech Selection",
        short: "TS",
        to: WM_ROUTES.NAVIGATOR,
        description: "Choose the right transport and system approach.",
        match: { pathname: WM_ROUTES.NAVIGATOR, mode: "prefix" },
      },
      {
        id: "products-workflow",
        title: "Product Selection",
        short: "PD",
        to: "/app/tools/catalog?mode=workflow",
        description: "Refine the shortlist into the product path.",
        match: {
          pathname: WM_ROUTES.CATALOG,
          mode: "exact",
          searchParams: { mode: "workflow" },
        },
      },
      {
        id: "architecture",
        title: "System Architecture",
        short: "AR",
        to: "/app/tools/proposal?stage=architecture",
        description: "Shape the signal path and architecture view.",
        match: {
          pathname: WM_ROUTES.PROPOSAL,
          mode: "exact",
          searchParams: { stage: "architecture" },
        },
      },
      {
        id: "bom",
        title: "Bill of Materials",
        short: "BM",
        to: "/app/tools/proposal?stage=bom",
        description: "Review line items and BOM structure.",
        match: {
          pathname: WM_ROUTES.PROPOSAL,
          mode: "exact",
          searchParams: { stage: "bom" },
        },
      },
      {
        id: "proposal",
        title: "Proposal Output",
        short: "PB",
        to: "/app/tools/proposal?stage=proposal",
        description: "Turn the design path into a customer-ready pack.",
        match: {
          pathname: WM_ROUTES.PROPOSAL,
          mode: "exact",
          searchParams: { stage: "proposal" },
        },
      },
    ],
  },
  {
    id: "reference",
    index: "03",
    label: "Tools",
    cue: "Open deeper tools only when you need them.",
    description: "Deep-dive utilities and sales support stay available here.",
    tone: "tools",
    items: [
      {
        id: "catalogue",
        title: "Catalogue",
        short: "CT",
        to: WM_ROUTES.CATALOG,
        description: "Search the full product catalogue and specifications.",
        match: {
          pathname: WM_ROUTES.CATALOG,
          mode: "exact",
          excludedSearchParams: { mode: "workflow" },
        },
      },
      {
        id: "competitors",
        title: "Competitor Compare",
        short: "CC",
        to: WM_ROUTES.COMPARE,
        description: "Compare positioning and replacement options quickly.",
        match: { pathname: WM_ROUTES.COMPARE, mode: "prefix" },
      },
      {
        id: "video-wall",
        title: "Video Wall",
        short: "VW",
        to: WM_ROUTES.VIDEO_WALL,
        description: "Handle LED and video wall planning in its own lane.",
        match: { pathname: WM_ROUTES.VIDEO_WALL, mode: "prefix" },
      },
      {
        id: "import-brief",
        title: "Import Customer Brief",
        short: "IB",
        to: WM_ROUTES.IMPORT_INTAKE,
        description: "Upload and structure a customer brief.",
        match: { pathname: WM_ROUTES.IMPORT_INTAKE, mode: "prefix" },
      },
      {
        id: "product-intelligence",
        title: "Product Intelligence",
        short: "PI",
        to: WM_ROUTES.PRODUCT_INTELLIGENCE,
        description: "Review enrichment, intelligence, and product data quality.",
        match: { pathname: WM_ROUTES.PRODUCT_INTELLIGENCE, mode: "prefix" },
      },
      {
        id: "sales-positioning",
        title: "Sales Positioning",
        short: "SP",
        to: WM_ROUTES.SALES,
        description: "Guide positioning against competitor options and fit.",
        match: { pathname: WM_ROUTES.SALES, mode: "prefix" },
      },
      {
        id: "training",
        title: "Training Hub",
        short: "TR",
        to: WM_ROUTES.TRAINING,
        description: "Open training and sales enablement content.",
        match: { pathname: WM_ROUTES.TRAINING, mode: "prefix" },
      },
      {
        id: "guru",
        title: "Guru",
        short: "AI",
        to: WM_ROUTES.GURU,
        description: "Launch the AI assistant workspace.",
        match: { pathname: WM_ROUTES.GURU, mode: "prefix" },
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
