import { loadActiveProjectSnapshot, type WingmanActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";
import type { WingmanInputs } from "@/app/logic/wingmanDecisionEngine";

export const WINGMAN_PERSISTED_PROJECTS_KEY = "wingman.persistedProjects.v1";
export const WINGMAN_ACTIVE_PERSISTED_PROJECT_ID_KEY = "wingman.activePersistedProjectId.v1";

export type WingmanPersistedProject = {
  id: string;
  name: string;
  customer?: string;
  application?: string;
  discovery: WingmanInputs;
  proposal?: {
    tone?: "Standard" | "Concise" | "Executive";
    scopeSummary?: string;
    includeBom?: boolean;
    includeArchitecture?: boolean;
  };
  videoWall?: {
    wallType?: "LCD Video Wall" | "LED Wall";
    rows?: number;
    cols?: number;
    sourceCount?: number;
    bezelMm?: number;
    driveMode?: "Single canvas" | "Multiview canvas" | "Addressed panels";
    notes?: string;
  };
  updatedAt: string;
};

function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadAllPersistedProjects(): WingmanPersistedProject[] {
  try {
    const raw = localStorage.getItem(WINGMAN_PERSISTED_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as WingmanPersistedProject[] : [];
  } catch {
    return [];
  }
}

export function saveAllPersistedProjects(projects: WingmanPersistedProject[]) {
  localStorage.setItem(WINGMAN_PERSISTED_PROJECTS_KEY, JSON.stringify(projects));
}

export function setActivePersistedProjectId(id: string) {
  localStorage.setItem(WINGMAN_ACTIVE_PERSISTED_PROJECT_ID_KEY, id);
}

export function getActivePersistedProjectId(): string | null {
  return localStorage.getItem(WINGMAN_ACTIVE_PERSISTED_PROJECT_ID_KEY);
}

export function loadPersistedProject(id: string): WingmanPersistedProject | null {
  return loadAllPersistedProjects().find((project) => project.id === id) ?? null;
}

export function upsertPersistedProject(input: WingmanPersistedProject): WingmanPersistedProject {
  const projects = loadAllPersistedProjects();
  const normalized: WingmanPersistedProject = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  const index = projects.findIndex((project) => project.id === normalized.id);
  if (index >= 0) {
    projects[index] = normalized;
  } else {
    projects.unshift(normalized);
  }

  saveAllPersistedProjects(projects);
  setActivePersistedProjectId(normalized.id);
  return normalized;
}

export function buildPersistedProjectBase(
  snapshot: WingmanActiveProjectSnapshot | null
): WingmanPersistedProject {
  return {
    id: getActivePersistedProjectId() || buildId(),
    name: snapshot?.project.name || "New Wingman Project",
    customer: snapshot?.project.customer || "",
    application: snapshot?.project.application || "",
    discovery: snapshot?.project.discovery || {
      sources: 0,
      displays: 0,
      distanceM: 0,
      usbRequired: false,
      wireless: false,
      videoWall: false,
      advancedMultiview: false,
      hybridMeeting: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function loadActivePersistedProject(): WingmanPersistedProject | null {
  const id = getActivePersistedProjectId();
  if (!id) return null;
  return loadPersistedProject(id);
}

export function buildProposalPersistedProject(input: {
  snapshot?: WingmanActiveProjectSnapshot | null;
  name: string;
  customer: string;
  tone: "Standard" | "Concise" | "Executive";
  scopeSummary: string;
  includeBom: boolean;
  includeArchitecture: boolean;
}): WingmanPersistedProject {
  const base = buildPersistedProjectBase(input.snapshot ?? loadActiveProjectSnapshot());

  return {
    ...base,
    name: input.name || base.name,
    customer: input.customer || base.customer,
    proposal: {
      tone: input.tone,
      scopeSummary: input.scopeSummary,
      includeBom: input.includeBom,
      includeArchitecture: input.includeArchitecture,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildVideoWallPersistedProject(input: {
  snapshot?: WingmanActiveProjectSnapshot | null;
  name?: string;
  customer?: string;
  wallType: "LCD Video Wall" | "LED Wall";
  rows: number;
  cols: number;
  sourceCount: number;
  bezelMm: number;
  driveMode: "Single canvas" | "Multiview canvas" | "Addressed panels";
  notes: string;
}): WingmanPersistedProject {
  const base = buildPersistedProjectBase(input.snapshot ?? loadActiveProjectSnapshot());

  return {
    ...base,
    name: input.name || base.name,
    customer: input.customer || base.customer,
    videoWall: {
      wallType: input.wallType,
      rows: input.rows,
      cols: input.cols,
      sourceCount: input.sourceCount,
      bezelMm: input.bezelMm,
      driveMode: input.driveMode,
      notes: input.notes,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildDiscoveryPersistedProject(input: {
  name?: string;
  customer?: string;
  application?: string;
  roomType?: string;
  discovery: {
    sources: number;
    displays: number;
    distanceM: number;
    usbRequired: boolean;
    wireless: boolean;
    videoWall: boolean;
    advancedMultiview: boolean;
    hybridMeeting: boolean;
    networkReady?: boolean;
    futureExpansion?: boolean;
  };
}): WingmanPersistedProject {
  const base = buildPersistedProjectBase(loadActiveProjectSnapshot());

  return {
    ...base,
    name: input.name || base.name,
    customer: input.customer || base.customer,
    application: input.application || input.roomType || base.application || "",
    discovery: {
      ...base.discovery,
      ...input.discovery,
    },
    updatedAt: new Date().toISOString(),
  };
}
