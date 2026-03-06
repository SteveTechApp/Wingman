export type DiscoveryProductFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type ProjectDiscovery = {
  customer: string;
  site: string;
  roomName: string;
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
  recommendedFamilies?: DiscoveryProductFamily[];
  recommendedNextTool?: string;
  createdAt?: string;
};

export type ProjectCatalog = {
  skus?: string[];
  selectedBrand?: string;
  notes?: string;
};

export type ProjectProposal = {
  selectedTier?: string;
  title?: string;
  notes?: string;
};

export type StoredProject = {
  id: string;
  name: string;
  customer: string;
  site: string;
  roomName: string;
  stage: string;
  status: string;
  notes: string;
  updatedAt: string;
  createdAt: string;
  discovery?: ProjectDiscovery;
  catalog?: ProjectCatalog;
  proposal?: ProjectProposal;
};

const STORAGE_KEY = "wm_projects_v1";
const SEEDED_KEY = "wm_projects_seeded_v1";
const ACTIVE_PROJECT_ID_KEY = "wm_active_project_id_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRecommendedFamilies(
  value: unknown
): DiscoveryProductFamily[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const allowed: DiscoveryProductFamily[] = [
    "Apollo",
    "HDBaseT",
    "AVoIP",
    "Matrix",
    "USB Extension",
    "Video Wall",
  ];

  return value.filter((item): item is DiscoveryProductFamily =>
    typeof item === "string" && allowed.includes(item as DiscoveryProductFamily)
  );
}

function normalizeDiscovery(
  discovery?: ProjectDiscovery
): ProjectDiscovery | undefined {
  if (!discovery) return undefined;

  return {
    ...discovery,
    customer: discovery.customer ?? "",
    site: discovery.site ?? "",
    roomName: discovery.roomName ?? "",
    notes: discovery.notes ?? "",
    recommendedFamilies: normalizeRecommendedFamilies(discovery.recommendedFamilies),
  };
}

function defaultSeed(): StoredProject[] {
  const now = nowIso();
  return [
    {
      id: "p1",
      name: "Boardroom Refresh",
      customer: "Sample customer",
      site: "Banbury HQ",
      roomName: "Boardroom",
      stage: "Discovery",
      status: "Draft",
      notes: "Initial discovery captured. Confirm display sizes, source count, and cable paths.",
      updatedAt: now,
      createdAt: now,
      discovery: {
        customer: "Sample customer",
        site: "Banbury HQ",
        roomName: "Boardroom",
        applicationType: "Meeting Space",
        notes: "Initial discovery captured. Confirm display sizes, source count, and cable paths.",
        recommendedFamilies: ["Apollo", "HDBaseT"],
        createdAt: now,
      },
      catalog: {
        skus: [],
        selectedBrand: "WyreStorm",
      },
      proposal: {
        selectedTier: "None",
      },
    },
    {
      id: "p2",
      name: "Training Suite Upgrade",
      customer: "Sample customer",
      site: "Training Centre",
      roomName: "Training Suite",
      stage: "Specify",
      status: "Draft",
      notes: "Shortlisted products and accessories. Proposal structure to follow.",
      updatedAt: now,
      createdAt: now,
      discovery: {
        customer: "Sample customer",
        site: "Training Centre",
        roomName: "Training Suite",
        applicationType: "Training Room",
        notes: "Shortlisted products and accessories. Proposal structure to follow.",
        recommendedFamilies: ["AVoIP"],
        createdAt: now,
      },
      catalog: {
        skus: [],
        selectedBrand: "WyreStorm",
      },
      proposal: {
        selectedTier: "None",
      },
    },
  ];
}

function emit(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

function touchProjectsTick(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("wm_projects_tick", nowIso());
  } catch {}
}

function safeParse(value: string | null): StoredProject[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeProject(project: StoredProject): StoredProject {
  const discovery = normalizeDiscovery(project.discovery);
  return {
    ...project,
    customer: project.customer ?? discovery?.customer ?? "",
    site: project.site ?? discovery?.site ?? "",
    roomName: project.roomName ?? discovery?.roomName ?? "",
    notes: project.notes ?? discovery?.notes ?? "",
    discovery,
    catalog: project.catalog ?? { skus: [] },
    proposal: project.proposal,
  };
}

function setActiveProjectIdInternal(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
    }
  } catch {}
}

export function getProjectsTick(): string {
  if (typeof window === "undefined") return "server";
  try {
    return window.localStorage.getItem("wm_projects_tick") ?? "0";
  } catch {
    return "0";
  }
}

export function loadProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];
  const existing = safeParse(window.localStorage.getItem(STORAGE_KEY)).map(normalizeProject);

  if (existing.length > 0) {
    return existing.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const seeded = window.localStorage.getItem(SEEDED_KEY) === "1";
  if (!seeded) {
    const seed = defaultSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    window.localStorage.setItem(SEEDED_KEY, "1");
    if (!window.localStorage.getItem(ACTIVE_PROJECT_ID_KEY) && seed[0]) {
      window.localStorage.setItem(ACTIVE_PROJECT_ID_KEY, seed[0].id);
    }
    touchProjectsTick();
    return seed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  return [];
}

export function saveProjects(projects: StoredProject[]): void {
  if (typeof window === "undefined") return;
  const normalized = [...projects].map(normalizeProject).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

  const activeId = getActiveProjectId();
  if (activeId && !normalized.some((p) => p.id === activeId)) {
    setActiveProjectIdInternal(normalized[0]?.id ?? null);
  } else if (!activeId && normalized[0]) {
    setActiveProjectIdInternal(normalized[0].id);
  }

  touchProjectsTick();
  emit();
}

export function subscribeProjects(listener: Listener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === ACTIVE_PROJECT_ID_KEY || event.key === "wm_projects_tick") {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function createProject(partial?: Partial<StoredProject>): StoredProject {
  const timestamp = nowIso();
  const discovery = normalizeDiscovery(partial?.discovery);

  const project: StoredProject = normalizeProject({
    id: partial?.id ?? makeId(),
    name: partial?.name ?? "New Project",
    customer: partial?.customer ?? discovery?.customer ?? "Sample customer",
    site: partial?.site ?? discovery?.site ?? "",
    roomName: partial?.roomName ?? discovery?.roomName ?? "",
    stage: partial?.stage ?? "Discovery",
    status: partial?.status ?? "Draft",
    notes: partial?.notes ?? discovery?.notes ?? "",
    updatedAt: timestamp,
    createdAt: partial?.createdAt ?? timestamp,
    discovery,
    catalog: partial?.catalog ?? { skus: [] },
    proposal: partial?.proposal,
  });

  const projects = loadProjects();
  saveProjects([project, ...projects.filter((item) => item.id !== project.id)]);
  setActiveProjectIdInternal(project.id);
  return project;
}

export function updateProject(id: string, patch: Partial<StoredProject>): StoredProject | undefined {
  const projects = loadProjects();
  let updated: StoredProject | undefined;

  const next = projects.map((project) => {
    if (project.id !== id) return project;
    updated = normalizeProject({
      ...project,
      ...patch,
      id: project.id,
      createdAt: project.createdAt,
      updatedAt: nowIso(),
      discovery: patch.discovery ? normalizeDiscovery(patch.discovery) : project.discovery,
      catalog: patch.catalog ?? project.catalog,
      proposal: patch.proposal ?? project.proposal,
    });
    return updated;
  });

  saveProjects(next);
  return updated;
}

export function deleteProject(id: string): void {
  const projects = loadProjects();
  saveProjects(projects.filter((project) => project.id !== id));
}

export function getProjectById(id: string): StoredProject | undefined {
  return loadProjects().find((project) => project.id === id);
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (saved) return saved;

    const projects = loadProjects();
    const fallback = projects[0]?.id ?? null;
    if (fallback) {
      window.localStorage.setItem(ACTIVE_PROJECT_ID_KEY, fallback);
    }
    return fallback;
  } catch {
    return null;
  }
}

export function setActiveProjectId(id: string): void {
  setActiveProjectIdInternal(id);
  touchProjectsTick();
  emit();
}

export function getActiveProject(): StoredProject | undefined {
  const id = getActiveProjectId();
  if (!id) return undefined;
  return getProjectById(id);
}

export function ensureActiveProject(partial?: Partial<StoredProject>): StoredProject {
  const existing = getActiveProject();
  if (existing) {
    if (partial && Object.keys(partial).length > 0) {
      return (
        updateProject(existing.id, partial) ??
        existing
      );
    }
    return existing;
  }

  const projects = loadProjects();
  if (projects[0]) {
    setActiveProjectIdInternal(projects[0].id);
    if (partial && Object.keys(partial).length > 0) {
      return updateProject(projects[0].id, partial) ?? projects[0];
    }
    return projects[0];
  }

  const created = createProject({
    name: partial?.name ?? "New Project",
    customer: partial?.customer ?? "Sample customer",
    site: partial?.site ?? "",
    roomName: partial?.roomName ?? "",
    stage: partial?.stage ?? "Discovery",
    status: partial?.status ?? "Draft",
    notes: partial?.notes ?? "",
    discovery: partial?.discovery ?? {
      customer: partial?.customer ?? "Sample customer",
      site: partial?.site ?? "",
      roomName: partial?.roomName ?? "",
      notes: partial?.notes ?? "",
      createdAt: nowIso(),
    },
    catalog: partial?.catalog ?? { skus: [] },
    proposal: partial?.proposal,
  });

  setActiveProjectIdInternal(created.id);
  return created;
}

export function updateProjectDiscovery(
  projectId: string,
  discoveryPatch: Partial<ProjectDiscovery>
): StoredProject | undefined {
  const project = getProjectById(projectId);
  if (!project) return undefined;

  const existingDiscovery: ProjectDiscovery = normalizeDiscovery(project.discovery) ?? {
    customer: project.customer ?? "",
    site: project.site ?? "",
    roomName: project.roomName ?? "",
    notes: project.notes ?? "",
    createdAt: project.createdAt,
  };

  const nextDiscovery = normalizeDiscovery({
    ...existingDiscovery,
    ...discoveryPatch,
  })!;

  return updateProject(projectId, {
    customer: nextDiscovery.customer ?? project.customer,
    site: nextDiscovery.site ?? project.site,
    roomName: nextDiscovery.roomName ?? project.roomName,
    notes: nextDiscovery.notes ?? project.notes,
    stage: "Discovery",
    discovery: nextDiscovery,
  });
}