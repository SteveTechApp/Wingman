import { WM_ROUTES } from "@/core/wingman/routeMap";
import type { DiscoveryProductFamily } from "@/features/projects/projectStore";
import type { RoomTemplateScenario } from "@/features/templates/roomTemplateLibrary";

export type IntakeStartPathId =
  | "rough-notes"
  | "consultant-brief"
  | "site-survey"
  | "existing-system"
  | "commercial-summary";

export type IntakeStartPath = {
  id: IntakeStartPathId;
  label: string;
  summary: string;
  detail: string;
  sourceLabel: string;
  bias: "early" | "guided" | "validation" | "commercial";
  defaultRoute: string;
  secondaryRoute: string;
  families: DiscoveryProductFamily[];
};

export type RoomWorkflowGuidance = {
  recommendedFamilies: DiscoveryProductFamily[];
  primaryRoute: string;
  secondaryRoute: string;
  complexityLabel: string;
  architectureSummary: string;
  transportSummary: string;
  routeSummary: string;
  signalSummary: string[];
};

export const INTAKE_START_PATHS: IntakeStartPath[] = [
  {
    id: "rough-notes",
    label: "Rough notes or customer email",
    summary: "Use this when the brief is messy and the room still needs to be clarified.",
    detail: "Best for early opportunities where the customer intent is real but the room, topology, or scope still needs to be shaped.",
    sourceLabel: "Rough opportunity notes",
    bias: "early",
    defaultRoute: WM_ROUTES.discovery,
    secondaryRoute: WM_ROUTES.roomWizard,
    families: ["Apollo", "USB Extension"],
  },
  {
    id: "consultant-brief",
    label: "Consultant brief or tender",
    summary: "Use this when the room intent is already documented and the next job is structured qualification.",
    detail: "Best for more complete briefs where you want to confirm room assumptions and then move into architecture or proposal work.",
    sourceLabel: "Consultant brief",
    bias: "guided",
    defaultRoute: WM_ROUTES.discovery,
    secondaryRoute: WM_ROUTES.proposal,
    families: ["Matrix", "HDBaseT"],
  },
  {
    id: "site-survey",
    label: "Site survey summary",
    summary: "Use this when distances, display positions, and installation constraints are already emerging.",
    detail: "Best for site-driven work where physical reality matters as much as room type.",
    sourceLabel: "Site survey summary",
    bias: "guided",
    defaultRoute: WM_ROUTES.discovery,
    secondaryRoute: WM_ROUTES.catalog,
    families: ["HDBaseT", "Matrix"],
  },
  {
    id: "existing-system",
    label: "Existing system or sketch",
    summary: "Use this when topology already exists and the next question is product fit, validation, or refresh strategy.",
    detail: "Best for upgrade work, replacement conversations, and legacy-system validation.",
    sourceLabel: "Existing system reference",
    bias: "validation",
    defaultRoute: WM_ROUTES.catalog,
    secondaryRoute: WM_ROUTES.proposal,
    families: ["Matrix", "AVoIP", "HDBaseT"],
  },
  {
    id: "commercial-summary",
    label: "Commercial summary",
    summary: "Use this when scope is mostly understood and the user mainly needs a proposal-ready next step.",
    detail: "Best for late-stage opportunities where the room direction is already credible and momentum matters.",
    sourceLabel: "Commercial summary",
    bias: "commercial",
    defaultRoute: WM_ROUTES.proposal,
    secondaryRoute: WM_ROUTES.discovery,
    families: ["Apollo", "Matrix"],
  },
];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

const DISCOVERY_FAMILY_ORDER: DiscoveryProductFamily[] = [
  "Apollo",
  "HDBaseT",
  "AVoIP",
  "Matrix",
  "USB Extension",
  "Video Wall",
];

function dedupeFamilies(values: string[]): DiscoveryProductFamily[] {
  const seen = new Set<string>();
  const out: DiscoveryProductFamily[] = [];

  for (const value of values) {
    const key = tidy(value).toLowerCase();
    if (!key || seen.has(key)) continue;
    const normalized = DISCOVERY_FAMILY_ORDER.find((family) => family.toLowerCase() === key);
    if (!normalized) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out;
}

function isLargeRoom(room: RoomTemplateScenario): boolean {
  return room.ioProfile.displayCount >= 4 || room.ioProfile.sourceCount >= 5;
}

function isVideoWallRoom(room: RoomTemplateScenario): boolean {
  return room.recommendedFamilies.includes("Video Wall") || /video wall|videowall/i.test(room.roomType);
}

export function findIntakeStartPath(id?: string | null): IntakeStartPath | undefined {
  const key = tidy(id).toLowerCase();
  if (!key) return undefined;
  return INTAKE_START_PATHS.find((item) => item.id === key);
}

export function buildReadinessLabel(characterCount: number): string {
  if (characterCount >= 900) return "Detailed brief";
  if (characterCount >= 320) return "Usable brief";
  if (characterCount >= 80) return "Early-stage brief";
  return "Not enough detail yet";
}

export function getRouteLabel(route: string): string {
  if (route === WM_ROUTES.discovery) return "Discovery";
  if (route === WM_ROUTES.roomWizard) return "Room Wizard";
  if (route === WM_ROUTES.catalog) return "Catalog";
  if (route === WM_ROUTES.proposal) return "Proposal";
  if (route === WM_ROUTES.videoWall) return "Video Wall";
  return "Next tool";
}

export function buildRoomWorkflowGuidance(input: {
  room: RoomTemplateScenario;
  sourceCount: number;
  displayCount: number;
  distanceM: number;
  usbNeeds: boolean;
  networkReady: boolean;
  futureExpansion: boolean;
}): RoomWorkflowGuidance {
  const room = input.room;
  const recommendedFamilies = dedupeFamilies([
    ...room.recommendedFamilies,
    ...(input.usbNeeds ? (["USB Extension"] as DiscoveryProductFamily[]) : []),
    ...((input.distanceM > 30 || room.recommendedFamilies.includes("HDBaseT")) ? (["HDBaseT"] as DiscoveryProductFamily[]) : []),
    ...((input.futureExpansion || input.networkReady || input.displayCount >= 6) ? (["AVoIP"] as DiscoveryProductFamily[]) : []),
    ...((input.sourceCount >= 4 || input.displayCount >= 3) ? (["Matrix"] as DiscoveryProductFamily[]) : []),
    ...((input.sourceCount <= 3 && input.displayCount <= 2) ? (["Apollo"] as DiscoveryProductFamily[]) : []),
  ]);

  let primaryRoute = room.recommendedTool || WM_ROUTES.roomWizard;
  if (isVideoWallRoom(room)) {
    primaryRoute = WM_ROUTES.videoWall;
  } else if (input.displayCount >= 6 || input.sourceCount >= 5 || isLargeRoom(room)) {
    primaryRoute = WM_ROUTES.proposal;
  } else if (input.distanceM <= 20 && input.sourceCount <= 3 && input.displayCount <= 2) {
    primaryRoute = WM_ROUTES.roomWizard;
  }

  const secondaryRoute =
    primaryRoute === WM_ROUTES.videoWall
      ? WM_ROUTES.proposal
      : primaryRoute === WM_ROUTES.proposal
        ? WM_ROUTES.catalog
        : WM_ROUTES.proposal;

  const complexityLabel =
    input.displayCount >= 6 || input.sourceCount >= 5 || isLargeRoom(room)
      ? "Larger room or venue workflow"
      : input.displayCount >= 3 || input.sourceCount >= 4 || input.distanceM > 30
        ? "Medium-complexity room workflow"
        : "Straightforward room workflow";

  const architectureSummary =
    primaryRoute === WM_ROUTES.videoWall
      ? "The display canvas is the main design driver, so wall topology and processor direction should stay front and centre."
      : primaryRoute === WM_ROUTES.proposal
        ? "This room is complex enough that architecture and commercial scope should stay visible before locking products."
        : "This room is still simple enough to keep the next step focused on room assumptions and product fit.";

  const transportSummary =
    input.networkReady && (input.displayCount >= 4 || input.futureExpansion)
      ? "A managed-network path is credible here because routing flexibility or future scaling is already part of the brief."
      : input.distanceM > 30
        ? "Signal distance is long enough that structured transport should be treated as baseline, not an afterthought."
        : "Transport looks manageable for a contained room workflow, subject to final USB and control needs.";

  const routeSummary = `${getRouteLabel(primaryRoute)} is the clearest next move for this ${room.roomType.toLowerCase()} workflow.`;

  const signalSummary = [
    `${Math.max(1, input.sourceCount)} source${input.sourceCount === 1 ? "" : "s"}`,
    `${Math.max(1, input.displayCount)} display${input.displayCount === 1 ? "" : "s"}`,
    input.distanceM > 0 ? `${input.distanceM}m longest run` : "",
    input.usbNeeds ? "USB collaboration required" : "",
    input.futureExpansion ? "Future expansion expected" : "",
  ].filter(Boolean);

  return {
    recommendedFamilies,
    primaryRoute,
    secondaryRoute,
    complexityLabel,
    architectureSummary,
    transportSummary,
    routeSummary,
    signalSummary,
  };
}

export function recommendImportRoutes(input: {
  path: IntakeStartPath;
  readiness: string;
  guidance: RoomWorkflowGuidance;
}): { primaryRoute: string; secondaryRoute: string; reasoning: string } {
  const readiness = input.readiness.toLowerCase();

  if (input.guidance.primaryRoute === WM_ROUTES.videoWall) {
    return {
      primaryRoute: WM_ROUTES.videoWall,
      secondaryRoute: WM_ROUTES.proposal,
      reasoning: "The selected room is wall-led, so the next move should stay focused on the display canvas and processor strategy.",
    };
  }

  if (input.path.bias === "validation") {
    return {
      primaryRoute: WM_ROUTES.catalog,
      secondaryRoute: WM_ROUTES.proposal,
      reasoning: "This looks more like a validation or refresh task, so product fit should happen before deeper room workflow.",
    };
  }

  if (input.path.bias === "commercial" && readiness !== "not enough detail yet") {
    return {
      primaryRoute: WM_ROUTES.proposal,
      secondaryRoute: WM_ROUTES.discovery,
      reasoning: "The opportunity is already commercially framed, so proposal scope is the clearest place to keep momentum.",
    };
  }

  if (readiness === "not enough detail yet" || input.path.bias === "early") {
    return {
      primaryRoute: WM_ROUTES.discovery,
      secondaryRoute: WM_ROUTES.roomWizard,
      reasoning: "The brief is still early, so the next move should tighten room assumptions before locking architecture or products.",
    };
  }

  return {
    primaryRoute: input.guidance.primaryRoute || input.path.defaultRoute,
    secondaryRoute: input.guidance.secondaryRoute || input.path.secondaryRoute,
    reasoning: input.guidance.routeSummary,
  };
}
