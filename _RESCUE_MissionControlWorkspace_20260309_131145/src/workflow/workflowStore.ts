import type { WorkflowStage } from "./workflowStages";

export type WorkflowProject = {
  id: string;
  name: string;
  customer: string;
  roomType: string;
  stage: WorkflowStage;
  health: "Healthy" | "Watch" | "At Risk";
  owner: string;
};

const STORAGE_KEY = "wm_workflow_projects_v2";
const ACTIVE_PROJECT_KEY = "wm_active_project_id_v1";

const seed: WorkflowProject[] = [
  {
    id: "p1",
    name: "Boardroom Refresh",
    customer: "Sample customer",
    roomType: "Boardroom",
    stage: "discovery",
    health: "Healthy",
    owner: "Wingman",
  },
  {
    id: "p2",
    name: "Training Suite Upgrade",
    customer: "Sample customer",
    roomType: "Training room",
    stage: "discovery",
    health: "Watch",
    owner: "Wingman",
  },
  {
    id: "p3",
    name: "NHS Collaboration Space",
    customer: "Sample customer",
    roomType: "Meeting room",
    stage: "architecture",
    health: "Healthy",
    owner: "Wingman",
  },
  {
    id: "p4",
    name: "Reception Video Wall",
    customer: "Sample customer",
    roomType: "Video wall",
    stage: "products",
    health: "Healthy",
    owner: "Wingman",
  },
  {
    id: "p5",
    name: "University Lecture Theatre",
    customer: "Sample customer",
    roomType: "Lecture theatre",
    stage: "proposal",
    health: "At Risk",
    owner: "Wingman",
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
  const id = getActiveWorkflowProjectId();
  return getWorkflowProjectById(id);
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
  };

  projects.unshift(next);
  save(projects);
  setActiveWorkflowProject(next.id);
  return next;
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