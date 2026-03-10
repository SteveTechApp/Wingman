import * as React from "react";
import {
  loadProjects,
  getActiveProject,
  getActiveProjectId,
  subscribeProjects,
} from "@/features/projects/projectStore";

export type StoreProjectSummary = {
  id: string;
  title: string;
  stage: string;
  customer: string;
  summary: string;
};

export type StoreCatalogueItem = {
  sku: string;
  family: string;
  title: string;
  note: string;
};

let projectsCache: StoreProjectSummary[] = [];
let projectsCacheKey = "";
let activeProjectNameCache = "No active project";

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapProject(project: any): StoreProjectSummary {
  const discovery = project?.discovery ?? {};
  const proposal = project?.proposal ?? {};
  const compareCount = Array.isArray(project?.compareRecords) ? project.compareRecords.length : 0;

  const stage =
    project?.status ||
    (proposal?.customerName
      ? "Proposal"
      : compareCount > 0
        ? "Compare"
        : discovery?.applicationType
          ? "Discovery"
          : "Draft");

  const customer =
    proposal?.customerName ||
    discovery?.customer ||
    project?.customer ||
    "No customer";

  const summary =
    proposal?.scopeSummary ||
    discovery?.notes ||
    project?.description ||
    "Project workspace ready.";

  return {
    id: String(project?.id ?? "unknown"),
    title: String(project?.name ?? project?.title ?? "Untitled Project"),
    stage: String(stage),
    customer: String(customer),
    summary: String(summary),
  };
}

function buildProjectsSnapshot(): StoreProjectSummary[] {
  try {
    return loadProjects().map(mapProject);
  } catch {
    return [];
  }
}

function getProjectsSnapshotKey(items: StoreProjectSummary[]): string {
  try {
    return JSON.stringify(
      items.map((x) => ({
        id: x.id,
        title: x.title,
        stage: x.stage,
        customer: x.customer,
        summary: x.summary,
      })),
    );
  } catch {
    return String(items.length);
  }
}

function refreshProjectsCache(): StoreProjectSummary[] {
  const next = buildProjectsSnapshot();
  const nextKey = getProjectsSnapshotKey(next);

  if (nextKey !== projectsCacheKey) {
    projectsCache = next;
    projectsCacheKey = nextKey;
  }

  return projectsCache;
}

function refreshActiveProjectNameCache(): string {
  try {
    const active = getActiveProject();
    const nextName = active?.name
      ? String(active.name)
      : getActiveProjectId()
        ? "Active project selected"
        : "No active project";

    if (nextName !== activeProjectNameCache) {
      activeProjectNameCache = nextName;
    }

    return activeProjectNameCache;
  } catch {
    activeProjectNameCache = "No active project";
    return activeProjectNameCache;
  }
}

export function getBoundProjects(): StoreProjectSummary[] {
  return refreshProjectsCache();
}

export function getBoundActiveProjectName(): string {
  return refreshActiveProjectNameCache();
}

export function getBoundProjectCount(): number {
  return getBoundProjects().length;
}

export function useBoundProjects(): StoreProjectSummary[] {
  return React.useSyncExternalStore(
    subscribeProjects,
    getBoundProjects,
    getBoundProjects,
  );
}

export function useBoundActiveProjectName(): string {
  return React.useSyncExternalStore(
    subscribeProjects,
    getBoundActiveProjectName,
    getBoundActiveProjectName,
  );
}

export function getBoundCatalogue(): StoreCatalogueItem[] {
  const fromLocal = safeReadJson<StoreCatalogueItem[]>("wm_catalogue_items", []);
  if (fromLocal.length > 0) return fromLocal;

  return [
    { sku: "SW-100-TX", family: "HDBaseT", title: "Transmitter", note: "Fallback catalogue item until live SKU source is bound." },
    { sku: "SW-100-RX", family: "HDBaseT", title: "Receiver", note: "Fallback catalogue item until live SKU source is bound." },
    { sku: "NHD-200-TX", family: "AVoIP", title: "Network Encoder", note: "Fallback catalogue item until live SKU source is bound." },
  ];
}