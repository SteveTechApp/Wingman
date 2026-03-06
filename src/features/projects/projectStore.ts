// src/features/projects/projectStore.ts
import * as React from "react";
import type { DiscoveryRecord } from "@/features/discovery/DiscoveryWizardPage";

export type ProjectStatus =
  | "Draft"
  | "Discovery Complete"
  | "Proposal Ready";

export type ProjectProposal = {
  selectedTier: "Bronze" | "Silver" | "Gold";
  families: string[];
  updatedAt: string;
};

export type ProjectCatalogSelection = {
  families: string[];
  skus: string[];
  updatedAt: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  customer: string;
  site: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  discovery?: DiscoveryRecord;
  proposal?: ProjectProposal;
  catalog?: ProjectCatalogSelection;
};

const PROJECTS_KEY = "wm_projects_v1";
const ACTIVE_PROJECT_KEY = "wm_active_project_id";

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `prj_${stamp}_${rand}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveProjects(projects: ProjectRecord[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  try {
    localStorage.setItem("wm_projects_tick", String(Date.now()));
  } catch {}
}

export function touchProjects(): void {
  try {
    localStorage.setItem("wm_projects_tick", String(Date.now()));
  } catch {}
}

export function getProjectsTick(): string {
  try {
    return localStorage.getItem("wm_projects_tick") || "";
  } catch {
    return "";
  }
}

export function getProjects(): ProjectRecord[] {
  const rows = safeParse<ProjectRecord[]>(
    localStorage.getItem(PROJECTS_KEY),
    [],
  );

  return Array.isArray(rows) ? rows : [];
}

export function getProjectById(id: string): ProjectRecord | null {
  const found = getProjects().find((p) => p.id === id);
  return found ?? null;
}

export function getActiveProjectId(): string | null {
  const id = localStorage.getItem(ACTIVE_PROJECT_KEY);
  return id || null;
}

export function setActiveProject(id: string): void {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  touchProjects();
}

export function getActiveProject(): ProjectRecord | null {
  const id = getActiveProjectId();
  if (!id) return null;
  return getProjectById(id);
}

export function deriveProjectName(seed?: {
  roomName?: string;
  customer?: string;
  site?: string;
}): string {
  const room = String(seed?.roomName || "").trim();
  const customer = String(seed?.customer || "").trim();
  const site = String(seed?.site || "").trim();

  if (room) return room;
  if (customer && site) return `${customer} - ${site}`;
  if (customer) return customer;
  if (site) return site;
  return "New Project";
}

export function createProject(
  seed?: Partial<Pick<ProjectRecord, "name" | "customer" | "site">>,
): ProjectRecord {
  const ts = nowIso();

  const project: ProjectRecord = {
    id: makeId(),
    name: String(seed?.name || "").trim() || "New Project",
    customer: String(seed?.customer || "").trim(),
    site: String(seed?.site || "").trim(),
    status: "Draft",
    createdAt: ts,
    updatedAt: ts,
  };

  const projects = getProjects();
  projects.unshift(project);
  saveProjects(projects);
  setActiveProject(project.id);

  return project;
}

export function updateProject(
  id: string,
  updater: (current: ProjectRecord) => ProjectRecord,
): ProjectRecord | null {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  const current = projects[idx];
  const next = {
    ...updater(current),
    id: current.id,
    updatedAt: nowIso(),
  };

  projects[idx] = next;
  saveProjects(projects);

  return next;
}

export function ensureActiveProject(seed?: {
  roomName?: string;
  customer?: string;
  site?: string;
}): ProjectRecord {
  const active = getActiveProject();
  if (active) return active;

  return createProject({
    name: deriveProjectName(seed),
    customer: seed?.customer || "",
    site: seed?.site || "",
  });
}

export function updateProjectDiscovery(
  projectId: string,
  discovery: DiscoveryRecord,
): ProjectRecord | null {
  return updateProject(projectId, (current) => ({
    ...current,
    name: deriveProjectName({
      roomName: discovery.roomName,
      customer: discovery.customer,
      site: discovery.site,
    }),
    customer: discovery.customer,
    site: discovery.site,
    status: "Discovery Complete",
    discovery,
  }));
}

export function updateProjectProposal(
  projectId: string,
  selectedTier: "Bronze" | "Silver" | "Gold",
  families: string[],
): ProjectRecord | null {
  return updateProject(projectId, (current) => ({
    ...current,
    status: "Proposal Ready",
    proposal: {
      selectedTier,
      families,
      updatedAt: nowIso(),
    },
  }));
}

export function updateProjectCatalogSelection(
  projectId: string,
  families: string[],
  skus: string[],
): ProjectRecord | null {
  return updateProject(projectId, (current) => ({
    ...current,
    catalog: {
      families,
      skus,
      updatedAt: nowIso(),
    },
  }));
}

