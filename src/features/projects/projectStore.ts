export type DiscoveryProductFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type ProjectTemplateTier = "Bronze" | "Silver" | "Gold";
export type VideoWallTechnology = "LCD" | "LED";
export type CompareConfidence = "High" | "Medium" | "Low";

export type ProjectTemplateContext = {
  market: string;
  application: string;
  tier: ProjectTemplateTier;
  summary?: string;
  recommendedFamilies?: DiscoveryProductFamily[];
  assumptions?: string[];
  createdAt?: string;
};

export type ProjectVideoWall = {
  technology: VideoWallTechnology;
  rows: number;
  cols: number;
  widthM: number;
  heightM: number;
  diagonalIn: number;
  pixelPitchMm?: number;
  panelDiagonalIn?: number;
  bezelMm?: number;
  viewingDistanceM?: number;
  sourceCount?: number;
  outputRows?: number;
  outputCols?: number;
  panelCount?: number;
  cabinetRows?: number;
  cabinetCols?: number;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
  ledTechnologyProfileId?: string;
  ledProcessorProfileId?: string;
  ledProcessorMaxPixels?: number;
  ledProcessorMaxWidthPx?: number;
  ledProcessorMaxHeightPx?: number;
  ledProcessorMaxInputs?: number;
  ledProcessorMaxWindows?: number;
  ledProcessorMode?: "single-source" | "multiview";
  ledScreenClass?: "modular" | "all-in-one-96-120";
  lcdDriveStrategy?: "decoder-per-screen" | "tile-loop-multiview" | "dedicated-processor";
  contentAspectRatio?: string;
  distortionRiskScore?: number;
  distortionRiskLevel?: "Low" | "Medium" | "High";
  hardWarnings?: string[];
  recommendedSku?: string;
  recommendedSkuQty?: number;
  processorRecommendation?: string;
  mountingNotes?: string[];
  warnings?: string[];
  summary?: string;
  createdAt?: string;
};

export type ProjectCompareRecord = {
  brand: string;
  competitorSku: string;
  category: string;
  summary?: string;
  features?: string[];
  wyrestormSku: string;
  wyrestormCategory?: string;
  confidence: CompareConfidence;
  rationale?: string;
  recommendedFamilies?: DiscoveryProductFamily[];
  notes?: string[];
  createdAt?: string;
};

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
  sourceTypes?: string;
  sourcePlacement?: string;
  sourceConnectionPath?: string;
  displayConnectionPath?: string;
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
  template?: ProjectTemplateContext;
  videowall?: ProjectVideoWall;
  compare?: ProjectCompareRecord;
};

const STORAGE_KEY = "wm_projects_v1";
const SEEDED_KEY = "wm_projects_seeded_v1";
const ACTIVE_PROJECT_ID_KEY = "wm_active_project_id_v1";
const PROJECTS_TICK_KEY = "wm_projects_tick";

type Listener = () => void;
const listeners = new Set<Listener>();
let projectsCache: StoredProject[] = [];
let projectsCacheRaw: string | null | undefined;
let projectsCacheSeeded: string | null | undefined;

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

function allowedFamilies(): DiscoveryProductFamily[] {
  return ["Apollo", "HDBaseT", "AVoIP", "Matrix", "USB Extension", "Video Wall"];
}

function normalizeRecommendedFamilies(value: unknown): DiscoveryProductFamily[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = allowedFamilies();
  return value.filter((item): item is DiscoveryProductFamily =>
    typeof item === "string" && allowed.includes(item as DiscoveryProductFamily)
  );
}

function normalizeDiscovery(discovery?: ProjectDiscovery): ProjectDiscovery | undefined {
  if (!discovery) return undefined;
  return {
    ...discovery,
    customer: discovery.customer ?? "",
    site: discovery.site ?? "",
    roomName: discovery.roomName ?? "",
    notes: discovery.notes ?? "",
    sourceTypes: discovery.sourceTypes ?? "",
    sourcePlacement: discovery.sourcePlacement ?? "",
    sourceConnectionPath: discovery.sourceConnectionPath ?? "",
    displayConnectionPath: discovery.displayConnectionPath ?? "",
    recommendedFamilies: normalizeRecommendedFamilies(discovery.recommendedFamilies),
  };
}

function normalizeTemplate(template?: ProjectTemplateContext): ProjectTemplateContext | undefined {
  if (!template) return undefined;
  return {
    ...template,
    market: template.market ?? "",
    application: template.application ?? "",
    tier: template.tier ?? "Bronze",
    recommendedFamilies: normalizeRecommendedFamilies(template.recommendedFamilies),
    assumptions: Array.isArray(template.assumptions) ? template.assumptions.filter((x): x is string => typeof x === "string") : [],
  };
}

function normalizeVideoWall(videowall?: ProjectVideoWall): ProjectVideoWall | undefined {
  if (!videowall) return undefined;
  return {
    ...videowall,
    technology: videowall.technology ?? "LCD",
    rows: Number(videowall.rows) || 1,
    cols: Number(videowall.cols) || 1,
    widthM: Number(videowall.widthM) || 0,
    heightM: Number(videowall.heightM) || 0,
    diagonalIn: Number(videowall.diagonalIn) || 0,
    pixelPitchMm: videowall.pixelPitchMm != null ? Number(videowall.pixelPitchMm) : undefined,
    panelDiagonalIn: videowall.panelDiagonalIn != null ? Number(videowall.panelDiagonalIn) : undefined,
    bezelMm: videowall.bezelMm != null ? Number(videowall.bezelMm) : undefined,
    viewingDistanceM: videowall.viewingDistanceM != null ? Number(videowall.viewingDistanceM) : undefined,
    sourceCount: videowall.sourceCount != null ? Number(videowall.sourceCount) : undefined,
    outputRows: videowall.outputRows != null ? Number(videowall.outputRows) : undefined,
    outputCols: videowall.outputCols != null ? Number(videowall.outputCols) : undefined,
    panelCount: videowall.panelCount != null ? Number(videowall.panelCount) : undefined,
    cabinetRows: videowall.cabinetRows != null ? Number(videowall.cabinetRows) : undefined,
    cabinetCols: videowall.cabinetCols != null ? Number(videowall.cabinetCols) : undefined,
    canvasWidthPx: videowall.canvasWidthPx != null ? Number(videowall.canvasWidthPx) : undefined,
    canvasHeightPx: videowall.canvasHeightPx != null ? Number(videowall.canvasHeightPx) : undefined,
    ledTechnologyProfileId: typeof videowall.ledTechnologyProfileId === "string" ? videowall.ledTechnologyProfileId : undefined,
    ledProcessorProfileId: typeof videowall.ledProcessorProfileId === "string" ? videowall.ledProcessorProfileId : undefined,
    ledProcessorMaxPixels: videowall.ledProcessorMaxPixels != null ? Number(videowall.ledProcessorMaxPixels) : undefined,
    ledProcessorMaxWidthPx: videowall.ledProcessorMaxWidthPx != null ? Number(videowall.ledProcessorMaxWidthPx) : undefined,
    ledProcessorMaxHeightPx: videowall.ledProcessorMaxHeightPx != null ? Number(videowall.ledProcessorMaxHeightPx) : undefined,
    ledProcessorMaxInputs: videowall.ledProcessorMaxInputs != null ? Number(videowall.ledProcessorMaxInputs) : undefined,
    ledProcessorMaxWindows: videowall.ledProcessorMaxWindows != null ? Number(videowall.ledProcessorMaxWindows) : undefined,
    ledProcessorMode: videowall.ledProcessorMode,
    ledScreenClass: videowall.ledScreenClass,
    lcdDriveStrategy: videowall.lcdDriveStrategy,
    contentAspectRatio: typeof videowall.contentAspectRatio === "string" ? videowall.contentAspectRatio : undefined,
    distortionRiskScore: videowall.distortionRiskScore != null ? Number(videowall.distortionRiskScore) : undefined,
    distortionRiskLevel: videowall.distortionRiskLevel,
    hardWarnings: Array.isArray(videowall.hardWarnings) ? videowall.hardWarnings.filter((x): x is string => typeof x === "string") : [],
    recommendedSku: typeof videowall.recommendedSku === "string" ? videowall.recommendedSku : undefined,
    recommendedSkuQty: videowall.recommendedSkuQty != null ? Number(videowall.recommendedSkuQty) : undefined,
    mountingNotes: Array.isArray(videowall.mountingNotes) ? videowall.mountingNotes.filter((x): x is string => typeof x === "string") : [],
    warnings: Array.isArray(videowall.warnings) ? videowall.warnings.filter((x): x is string => typeof x === "string") : [],
  };
}

function normalizeCompare(compare?: ProjectCompareRecord): ProjectCompareRecord | undefined {
  if (!compare) return undefined;
  return {
    ...compare,
    brand: compare.brand ?? "",
    competitorSku: compare.competitorSku ?? "",
    category: compare.category ?? "",
    wyrestormSku: compare.wyrestormSku ?? "",
    confidence: compare.confidence ?? "Medium",
    features: Array.isArray(compare.features) ? compare.features.filter((x): x is string => typeof x === "string") : [],
    notes: Array.isArray(compare.notes) ? compare.notes.filter((x): x is string => typeof x === "string") : [],
    recommendedFamilies: normalizeRecommendedFamilies(compare.recommendedFamilies),
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
      catalog: { skus: [], selectedBrand: "WyreStorm" },
      proposal: { selectedTier: "None" },
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
      catalog: { skus: [], selectedBrand: "WyreStorm" },
      proposal: { selectedTier: "None" },
    },
  ];
}

function emit(): void {
  listeners.forEach((listener) => {
    try { listener(); } catch {}
  });
}

function touchProjectsTick(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECTS_TICK_KEY, nowIso());
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
  const template = normalizeTemplate(project.template);
  const videowall = normalizeVideoWall(project.videowall);
  const compare = normalizeCompare(project.compare);
  return {
    ...project,
    customer: project.customer ?? discovery?.customer ?? "",
    site: project.site ?? discovery?.site ?? "",
    roomName: project.roomName ?? discovery?.roomName ?? "",
    notes: project.notes ?? discovery?.notes ?? "",
    discovery,
    template,
    videowall,
    compare,
    catalog: project.catalog ?? { skus: [] },
    proposal: project.proposal,
  };
}

function setActiveProjectIdInternal(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
    else window.localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
  } catch {}
}

export function getProjectsTick(): string {
  if (typeof window === "undefined") return "server";
  try {
    return window.localStorage.getItem(PROJECTS_TICK_KEY) ?? "0";
  } catch {
    return "0";
  }
}

export function loadProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const seeded = window.localStorage.getItem(SEEDED_KEY);

  if (raw === projectsCacheRaw && seeded === projectsCacheSeeded) {
    return projectsCache;
  }

  const existing = safeParse(raw).map(normalizeProject);

  if (existing.length > 0) {
    const sorted = [...existing].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const activeId = getActiveProjectId();
    if (!activeId && sorted[0]) setActiveProjectIdInternal(sorted[0].id);
    projectsCache = sorted;
    projectsCacheRaw = raw;
    projectsCacheSeeded = seeded;
    return sorted;
  }

  if (seeded !== "1") {
    const seed = defaultSeed();
    const rawSeed = JSON.stringify(seed);
    window.localStorage.setItem(STORAGE_KEY, rawSeed);
    window.localStorage.setItem(SEEDED_KEY, "1");
    if (seed[0]) setActiveProjectIdInternal(seed[0].id);
    touchProjectsTick();
    projectsCache = [...seed].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    projectsCacheRaw = rawSeed;
    projectsCacheSeeded = "1";
    return projectsCache;
  }

  projectsCache = [];
  projectsCacheRaw = raw;
  projectsCacheSeeded = seeded;
  return [];
}

export function saveProjects(projects: StoredProject[]): void {
  if (typeof window === "undefined") return;

  const normalized = [...projects]
    .map(normalizeProject)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(STORAGE_KEY, raw);
  projectsCache = normalized;
  projectsCacheRaw = raw;
  projectsCacheSeeded = window.localStorage.getItem(SEEDED_KEY);

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
    if (
      event.key === STORAGE_KEY ||
      event.key === ACTIVE_PROJECT_ID_KEY ||
      event.key === PROJECTS_TICK_KEY
    ) {
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
  const template = normalizeTemplate(partial?.template);
  const videowall = normalizeVideoWall(partial?.videowall);
  const compare = normalizeCompare(partial?.compare);

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
    template,
    videowall,
    compare,
    catalog: partial?.catalog ?? { skus: [] },
    proposal: partial?.proposal,
  });

  const projects = loadProjects();
  saveProjects([project, ...projects.filter((item) => item.id !== project.id)]);
  setActiveProjectIdInternal(project.id);
  touchProjectsTick();
  emit();
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
      template: patch.template ? normalizeTemplate(patch.template) : project.template,
      videowall: patch.videowall ? normalizeVideoWall(patch.videowall) : project.videowall,
      compare: patch.compare ? normalizeCompare(patch.compare) : project.compare,
      catalog: patch.catalog ?? project.catalog,
      proposal: patch.proposal ?? project.proposal,
    });
    return updated;
  });

  saveProjects(next);
  return updated;
}

export function applyCompareToProject(
  id: string,
  compare: ProjectCompareRecord
): StoredProject | undefined {
  const normalized = normalizeCompare(compare);
  if (!normalized) return undefined;

  const project = getProjectById(id);
  if (!project) return undefined;

  const notesParts = [
    project.notes?.trim(),
    normalized.summary?.trim(),
    normalized.rationale ? `Rationale: ${normalized.rationale}` : "",
    normalized.notes?.length ? `Compare notes: ${normalized.notes.join("; ")}` : "",
    `Competitor SKU: ${normalized.brand} ${normalized.competitorSku}`,
    `WyreStorm direction: ${normalized.wyrestormSku}`,
  ].filter(Boolean);

  const mergedNotes = notesParts.join("\n\n");

  const nextDiscovery: ProjectDiscovery = {
    customer: project.customer || "Sample customer",
    site: project.site || "",
    roomName: project.roomName || "Replacement Opportunity",
    applicationType: normalized.category,
    notes: mergedNotes,
    recommendedFamilies: normalized.recommendedFamilies,
    createdAt: project.discovery?.createdAt ?? project.createdAt,
  };

  return updateProject(id, {
    stage: "Specify",
    notes: mergedNotes,
    compare: normalized,
    discovery: nextDiscovery,
  });
}

export function deleteProject(id: string): void {
  const projects = loadProjects();
  const next = projects.filter((project) => project.id !== id);
  saveProjects(next);
}

export function getProjectById(id: string): StoredProject | undefined {
  return loadProjects().find((project) => project.id === id);
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (saved) return saved;

    const projects = safeParse(window.localStorage.getItem(STORAGE_KEY));
    const fallback = projects[0]?.id ?? null;
    if (fallback) window.localStorage.setItem(ACTIVE_PROJECT_ID_KEY, fallback);
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
      return updateProject(existing.id, partial) ?? existing;
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
    discovery: partial?.discovery,
    template: partial?.template,
    videowall: partial?.videowall,
    compare: partial?.compare,
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

export function updateProjectFields(
  id: string,
  fields: Pick<StoredProject, "name" | "customer" | "site" | "roomName" | "stage" | "status" | "notes">
): StoredProject | undefined {
  const project = getProjectById(id);
  if (!project) return undefined;

  const nextDiscovery = project.discovery
    ? {
        ...project.discovery,
        customer: fields.customer,
        site: fields.site,
        roomName: fields.roomName,
        notes: fields.notes,
      }
    : undefined;

  return updateProject(id, {
    name: fields.name,
    customer: fields.customer,
    site: fields.site,
    roomName: fields.roomName,
    stage: fields.stage,
    status: fields.status,
    notes: fields.notes,
    discovery: nextDiscovery,
  });
}

export function applyProjectTemplate(
  id: string,
  template: {
    market: string;
    application: string;
    tier: "Bronze" | "Silver" | "Gold";
    summary?: string;
    recommendedFamilies?: DiscoveryProductFamily[];
    assumptions?: string[];
    createdAt?: string;
  }
): StoredProject | undefined {
  const project = getProjectById(id);
  if (!project) return undefined;

  const mergedNotes = [
    project.notes?.trim(),
    template.summary?.trim(),
    Array.isArray(template.assumptions) && template.assumptions.length
      ? `Assumptions: ${template.assumptions.join("; ")}`
      : "",
  ].filter(Boolean).join("\n\n");

  const nextDiscovery = {
    customer: project.customer || "Sample customer",
    site: project.site || "",
    roomName: project.roomName || template.application || "",
    applicationType: template.application,
    notes: mergedNotes,
    recommendedFamilies: template.recommendedFamilies,
    createdAt: project.discovery?.createdAt ?? project.createdAt,
  };

  return updateProject(id, {
    roomName: project.roomName || template.application || project.roomName,
    stage: "Discovery",
    notes: mergedNotes,
    template: {
      market: template.market,
      application: template.application,
      tier: template.tier,
      summary: template.summary,
      recommendedFamilies: template.recommendedFamilies,
      assumptions: template.assumptions,
      createdAt: template.createdAt ?? new Date().toISOString(),
    } as any,
    discovery: nextDiscovery,
    proposal: {
      ...(project.proposal ?? {}),
      selectedTier: template.tier,
    },
  });
}

export function applyVideoWallToProject(
  id: string,
  videowall: ProjectVideoWall
): StoredProject | undefined {
  const project = getProjectById(id);
  if (!project) return undefined;

  const notesParts = [
    project.notes?.trim(),
    videowall.summary?.trim(),
    Array.isArray(videowall.mountingNotes) && videowall.mountingNotes.length
      ? `Mounting notes: ${videowall.mountingNotes.join("; ")}`
      : "",
    videowall.processorRecommendation
      ? `Processor: ${videowall.processorRecommendation}`
      : "",
  ].filter(Boolean);

  const mergedNotes = notesParts.join("\n\n");

  const nextDiscovery = {
    customer: project.customer || "Sample customer",
    site: project.site || "",
    roomName: project.roomName || "Video Wall",
    applicationType: videowall.technology === "LED" ? "LED Video Wall" : "LCD Video Wall",
    notes: mergedNotes,
    recommendedFamilies: ["Video Wall"] as DiscoveryProductFamily[],
    createdAt: project.discovery?.createdAt ?? project.createdAt,
  };

  return updateProject(id, {
    stage: "Design",
    notes: mergedNotes,
    videowall: {
      ...videowall,
      createdAt: videowall.createdAt ?? new Date().toISOString(),
    } as any,
    discovery: nextDiscovery,
  });
}
