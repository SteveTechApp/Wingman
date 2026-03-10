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

export type StoreBindingSnapshot = {
  projects: StoreProjectSummary[];
  catalogue: StoreCatalogueItem[];
  activeProjectName?: string;
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

export function getStoreBindingSnapshot(): StoreBindingSnapshot {
  const projects = safeReadJson<StoreProjectSummary[]>("wm_projects", []);
  const catalogue = safeReadJson<StoreCatalogueItem[]>("wm_catalogue_items", []);
  const activeProjectName = safeReadJson<string | undefined>("wm_active_project_name", undefined);

  return {
    projects,
    catalogue,
    activeProjectName,
  };
}

export function getBoundProjects(): StoreProjectSummary[] {
  return getStoreBindingSnapshot().projects;
}

export function getBoundCatalogue(): StoreCatalogueItem[] {
  return getStoreBindingSnapshot().catalogue;
}

export function getBoundActiveProjectName(): string {
  return getStoreBindingSnapshot().activeProjectName || "No active project";
}