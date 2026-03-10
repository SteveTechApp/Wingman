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
    (proposal?.customerName ? "Proposal" :
    compareCount > 0 ? "Compare" :
    discovery?.applicationType ? "Discovery" :
    "Draft");

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
    id: String(project?.id ?? crypto.randomUUID()),
    title: String(project?.name ?? project?.title ?? "Untitled Project"),
    stage: String(stage),
    customer: String(customer),
    summary: String(summary),
  };
}

export function getBoundProjects(): StoreProjectSummary[] {
  try {
    return loadProjects().map(mapProject);
  } catch {
    return [];
  }
}

export function getBoundActiveProjectName(): string {
  try {
    const active = getActiveProject();
    if (active?.name) return String(active.name);
    const activeId = getActiveProjectId();
    if (activeId) return "Active project selected";
    return "No active project";
  } catch {
    return "No active project";
  }
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