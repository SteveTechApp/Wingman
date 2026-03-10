import type { WorkflowStage } from "./workflowStages";

export type WorkflowDiscoveryRecord = {
  customer?: string;
  site?: string;
  roomName?: string;
  applicationType?: string;
  roomLengthM?: string;
  roomWidthM?: string;
  roomHeightM?: string;
  displayLocation?: string;
  sourceLocation?: string;
  rackLocation?: string;
  cableDistanceM?: string;
  displayCount?: string;
  sourceCount?: string;
  usbNeeds?: string;
  audioNeeds?: string;
  controlNeeds?: string;
  budgetBand?: string;
  urgency?: string;
  notes?: string;
  recommendedFamilies?: string[];
  recommendedNextTool?: string;
  createdAt?: string;
};

export type WorkflowProject = {
  id: string;
  name: string;
  customer: string;
  roomType: string;
  stage: WorkflowStage;
  health: "Healthy" | "Watch" | "At Risk";
  owner: string;
  sources?: number;
  displays?: number;
  distanceM?: number;
  usb?: boolean;
  control?: boolean;
  audio?: boolean;
  discovery?: WorkflowDiscoveryRecord;
};

const STORAGE_KEY = "wm_workflow_projects_v4";
const ACTIVE_PROJECT_KEY = "wm_active_project_id_v1";
const DISCOVERY_SEED_KEY = "wm_discovery_seed";

const seed: WorkflowProject[] = [
  {
    id: "p1",
    name: "Boardroom Refresh",
    customer: "Sample customer",
    roomType: "Boardroom",
    stage: "discovery",
    health: "Healthy",
    owner: "Wingman",
    sources: 3,
    displays: 2,
    distanceM: 18,
    usb: true,
    control: true,
    audio: true,
  },
  {
    id: "p2",
    name: "Training Suite Upgrade",
    customer: "Sample customer",
    roomType: "Training room",
    stage: "architecture",
    health: "Watch",
    owner: "Wingman",
    sources: 4,
    displays: 3,
    distanceM: 35,
    usb: true,
    control: true,
    audio: true,
  },
  {
    id: "p3",
    name: "Reception Video Wall",
    customer: "Sample customer",
    roomType: "Video wall",
    stage: "products",
    health: "Healthy",
    owner: "Wingman",
    sources: 2,
    displays: 6,
    distanceM: 22,
    usb: false,
    control: true,
    audio: true,
  },
  {
    id: "p4",
    name: "University Lecture Theatre",
    customer: "Sample customer",
    roomType: "Lecture theatre",
    stage: "proposal",
    health: "At Risk",
    owner: "Wingman",
    sources: 6,
    displays: 4,
    distanceM: 48,
    usb: true,
    control: true,
    audio: true,
  },
];

function load(): WorkflowProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as WorkflowProject[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seed;
  } catch {
    return seed;
  }
}

function save(projects: WorkflowProject[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {}
}

function parseNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function truthyNeeds(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  return !["none", "no", "n/a", "na", "not required"].includes(text);
}

export function readDiscoverySeed(): WorkflowDiscoveryRecord | null {
  try {
    const raw = localStorage.getItem(DISCOVERY_SEED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkflowDiscoveryRecord;
  } catch {
    return null;
  }
}

export function getWorkflowProjects(): WorkflowProject[] {
  return load();
}

export function getWorkflowProjectById(id: string | null | undefined): WorkflowProject | undefined {
  if (!id) return undefined;
  return load().find((p) => p.id === id);
}

export function getActiveWorkflowProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function getActiveWorkflowProject(): WorkflowProject | undefined {
  return getWorkflowProjectById(getActiveWorkflowProjectId());
}

export function setActiveWorkflowProject(id: string): string {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {}
  return id;
}

export function createWorkflowProject(partial?: Partial<WorkflowProject>): WorkflowProject {
  const projects = load();

  const next: WorkflowProject = {
    id: Date.now().toString(),
    name: partial?.name ?? "New Project",
    customer: partial?.customer ?? "Sample customer",
    roomType: partial?.roomType ?? "General AV space",
    stage: partial?.stage ?? "discovery",
    health: partial?.health ?? "Healthy",
    owner: partial?.owner ?? "Wingman",
    sources: partial?.sources ?? 2,
    displays: partial?.displays ?? 1,
    distanceM: partial?.distanceM ?? 10,
    usb: partial?.usb ?? false,
    control: partial?.control ?? false,
    audio: partial?.audio ?? true,
    discovery: partial?.discovery,
  };

  projects.unshift(next);
  save(projects);
  setActiveWorkflowProject(next.id);
  return next;
}

export function updateWorkflowProject(id: string, partial: Partial<WorkflowProject>): WorkflowProject[] {
  const projects = load().map((p) => (p.id === id ? { ...p, ...partial } : p));
  save(projects);
  return projects;
}

export function updateActiveWorkflowProject(partial: Partial<WorkflowProject>): WorkflowProject[] {
  const activeId = getActiveWorkflowProjectId();
  if (!activeId) return load();
  return updateWorkflowProject(activeId, partial);
}

export function moveWorkflowProject(id: string, stage: WorkflowStage): WorkflowProject[] {
  const projects = load().map((p) => (p.id === id ? { ...p, stage } : p));
  save(projects);
  return projects;
}

export function advanceActiveWorkflowProject(stage: WorkflowStage): WorkflowProject[] {
  const activeId = getActiveWorkflowProjectId();
  if (!activeId) return load();
  return moveWorkflowProject(activeId, stage);
}

export function syncActiveProjectFromDiscoveryRecord(
  record: WorkflowDiscoveryRecord,
  options?: { advanceToArchitecture?: boolean }
): WorkflowProject[] {
  const active = getActiveWorkflowProject();
  if (!active) return load();

  const partial: Partial<WorkflowProject> = {
    customer: record.customer || active.customer,
    name: record.roomName || active.name,
    roomType: record.applicationType || active.roomType,
    sources: parseNumber(record.sourceCount) ?? active.sources,
    displays: parseNumber(record.displayCount) ?? active.displays,
    distanceM: parseNumber(record.cableDistanceM) ?? active.distanceM,
    usb: truthyNeeds(record.usbNeeds),
    control: truthyNeeds(record.controlNeeds),
    audio: truthyNeeds(record.audioNeeds),
    discovery: record,
  };

  const nextStage: WorkflowStage =
    options?.advanceToArchitecture ? "architecture" : active.stage;

  const projects = load().map((p) =>
    p.id === active.id
      ? {
          ...p,
          ...partial,
          stage: nextStage,
        }
      : p
  );

  save(projects);
  return projects;
}

export function saveActiveProjectFromDiscoverySeed(options?: { advanceToArchitecture?: boolean }): WorkflowProject[] {
  const record = readDiscoverySeed();
  if (!record) return load();
  return syncActiveProjectFromDiscoveryRecord(record, options);
}

export function resetWorkflowProjects(): WorkflowProject[] {
  save(seed);
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, seed[0].id);
  } catch {}
  return seed;
}

export function ensureWorkflowSeed(): WorkflowProject[] {
  const projects = load();
  if (!getActiveWorkflowProjectId() && projects.length > 0) {
    setActiveWorkflowProject(projects[0].id);
  }
  return projects;
}