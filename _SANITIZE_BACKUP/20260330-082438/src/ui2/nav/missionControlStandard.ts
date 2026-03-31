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
        short: "MC",
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
        title: "Guided Project",
        short: "GP",
        to: "/app/tools/discovery",
        description: "Capture the brief and shape the system direction.",
        match: { pathname: "/app/tools/discovery", mode: "prefix" },
      },
      {
        id: "products",
        title: "Products",
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
        id: "proposal",
        title: "Proposal",
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
    label: "Reference",
    cue: "Launch specialist tools without crowding the rail.",
    description: "Deep-dive utilities stay available but separate from flow.",
    tone: "tools",
    items: [
      {
        id: "tool-hub",
        title: "Tool Hub",
        short: "TH",
        to: "/app/tools",
        description: "Browse the wider toolset from a single launch point.",
        match: { pathname: "/app/tools", mode: "exact" },
      },
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
        title: "Competitors",
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
