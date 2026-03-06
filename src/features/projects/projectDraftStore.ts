import * as React from "react";

export type ProjectStatus = "draft" | "active" | "archived";

export type TierId = "bronze" | "silver" | "gold";

export type TemplateSeed = {
  source: "template-workbench";
  verticalMarket: {
    id: string;
    name: string;
    summary: string;
  };
  roomType: {
    id: string;
    name: string;
    summary: string;
    useCases: string[];
  };
  tier: {
    id: TierId;
    label: string;
    summary: string;
    positioning: string;
    performance: string;
    commercialNote: string;
  };
  includedSystems: string[];
  uplift: string[];
  projectName: string;
  createdAt: string;
};

export type ProjectBrief = {
  roomRequirements: {
    displayCount: string;
    transport: string;
    usbNeeds: string;
    controlLevel: string;
    notes: string;
  };
  proposal: {
    executiveSummary: string;
    solutionOverview: string;
    assumptions: string;
    exclusions: string;
    commercialNotes: string;
  };
};

export type ProjectRecord = {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  template: TemplateSeed;
  brief: ProjectBrief;
};

type ProjectStoreShape = {
  version: 1;
  activeProjectId: string | null;
  items: ProjectRecord[];
};

const STORE_KEY = "wm_projects_store_v1";
const TEMPLATE_SEED_KEY = "wm_template_seed";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isTierId(value: unknown): value is TierId {
  return value === "bronze" || value === "silver" || value === "gold";
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return value === "draft" || value === "active" || value === "archived";
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeStorageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {}
}

function safeStorageRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {}
}

function defaultBrief(seed: TemplateSeed): ProjectBrief {
  return {
    roomRequirements: {
      displayCount: "",
      transport: "",
      usbNeeds: "",
      controlLevel: "",
      notes:
        "Seeded from template: " +
        seed.verticalMarket.name +
        " / " +
        seed.roomType.name +
        " / " +
        seed.tier.label,
    },
    proposal: {
      executiveSummary: seed.tier.summary,
      solutionOverview: seed.tier.positioning,
      assumptions: "",
      exclusions: "",
      commercialNotes: seed.tier.commercialNote,
    },
  };
}

function makeId(): string {
  return "prj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function validateTemplateSeed(value: unknown): TemplateSeed | null {
  if (!isObject(value)) return null;
  if (value.source !== "template-workbench") return null;

  const verticalMarket = value.verticalMarket;
  const roomType = value.roomType;
  const tier = value.tier;

  if (!isObject(verticalMarket)) return null;
  if (!isObject(roomType)) return null;
  if (!isObject(tier)) return null;

  if (
    !isString(verticalMarket.id) ||
    !isString(verticalMarket.name) ||
    !isString(verticalMarket.summary)
  ) {
    return null;
  }

  if (
    !isString(roomType.id) ||
    !isString(roomType.name) ||
    !isString(roomType.summary) ||
    !isStringArray(roomType.useCases)
  ) {
    return null;
  }

  if (
    !isTierId(tier.id) ||
    !isString(tier.label) ||
    !isString(tier.summary) ||
    !isString(tier.positioning) ||
    !isString(tier.performance) ||
    !isString(tier.commercialNote)
  ) {
    return null;
  }

  if (
    !isStringArray(value.includedSystems) ||
    !isStringArray(value.uplift) ||
    !isString(value.projectName) ||
    !isString(value.createdAt)
  ) {
    return null;
  }

  return {
    source: "template-workbench",
    verticalMarket: {
      id: verticalMarket.id,
      name: verticalMarket.name,
      summary: verticalMarket.summary,
    },
    roomType: {
      id: roomType.id,
      name: roomType.name,
      summary: roomType.summary,
      useCases: [...roomType.useCases],
    },
    tier: {
      id: tier.id,
      label: tier.label,
      summary: tier.summary,
      positioning: tier.positioning,
      performance: tier.performance,
      commercialNote: tier.commercialNote,
    },
    includedSystems: [...value.includedSystems],
    uplift: [...value.uplift],
    projectName: value.projectName,
    createdAt: value.createdAt,
  };
}

function validateProjectBrief(value: unknown): ProjectBrief | null {
  if (!isObject(value)) return null;

  const roomRequirements = value.roomRequirements;
  const proposal = value.proposal;

  if (!isObject(roomRequirements) || !isObject(proposal)) return null;

  if (
    !isString(roomRequirements.displayCount) ||
    !isString(roomRequirements.transport) ||
    !isString(roomRequirements.usbNeeds) ||
    !isString(roomRequirements.controlLevel) ||
    !isString(roomRequirements.notes)
  ) {
    return null;
  }

  if (
    !isString(proposal.executiveSummary) ||
    !isString(proposal.solutionOverview) ||
    !isString(proposal.assumptions) ||
    !isString(proposal.exclusions) ||
    !isString(proposal.commercialNotes)
  ) {
    return null;
  }

  return {
    roomRequirements: {
      displayCount: roomRequirements.displayCount,
      transport: roomRequirements.transport,
      usbNeeds: roomRequirements.usbNeeds,
      controlLevel: roomRequirements.controlLevel,
      notes: roomRequirements.notes,
    },
    proposal: {
      executiveSummary: proposal.executiveSummary,
      solutionOverview: proposal.solutionOverview,
      assumptions: proposal.assumptions,
      exclusions: proposal.exclusions,
      commercialNotes: proposal.commercialNotes,
    },
  };
}

function validateProjectRecord(value: unknown): ProjectRecord | null {
  if (!isObject(value)) return null;

  const template = validateTemplateSeed(value.template);
  const brief = validateProjectBrief(value.brief);

  if (!template || !brief) return null;

  if (
    !isString(value.id) ||
    !isString(value.name) ||
    !isProjectStatus(value.status) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    template,
    brief,
  };
}

function validateStoreShape(value: unknown): ProjectStoreShape {
  if (!isObject(value)) {
    return { version: 1, activeProjectId: null, items: [] };
  }

  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw
    .map((item) => validateProjectRecord(item))
    .filter((item): item is ProjectRecord => !!item);

  const activeProjectId =
    value.activeProjectId === null || isString(value.activeProjectId)
      ? value.activeProjectId
      : null;

  return {
    version: 1,
    activeProjectId,
    items,
  };
}

function readStore(): ProjectStoreShape {
  if (typeof window === "undefined") {
    return { version: 1, activeProjectId: null, items: [] };
  }

  const raw = safeStorageGet(window.localStorage, STORE_KEY);
  const parsed = parseJson(raw);
  const store = validateStoreShape(parsed);

  if (
    store.activeProjectId &&
    !store.items.some((item) => item.id === store.activeProjectId)
  ) {
    store.activeProjectId = store.items[0]?.id ?? null;
  }

  return store;
}

function writeStore(store: ProjectStoreShape): void {
  if (typeof window === "undefined") return;
  safeStorageSet(window.localStorage, STORE_KEY, JSON.stringify(store, null, 2));
}

export function getProjects(): ProjectRecord[] {
  return readStore().items;
}

export function getActiveProjectId(): string | null {
  return readStore().activeProjectId;
}

export function getActiveProject(): ProjectRecord | null {
  const store = readStore();
  return store.items.find((item) => item.id === store.activeProjectId) ?? null;
}

export function setActiveProject(projectId: string): void {
  const store = readStore();
  if (!store.items.some((item) => item.id === projectId)) return;

  store.activeProjectId = projectId;
  writeStore(store);
}

export function deleteProject(projectId: string): void {
  const store = readStore();
  const nextItems = store.items.filter((item) => item.id !== projectId);

  store.items = nextItems;
  if (store.activeProjectId === projectId) {
    store.activeProjectId = nextItems[0]?.id ?? null;
  }

  writeStore(store);
}

export function upsertProject(project: ProjectRecord): void {
  const store = readStore();
  const ix = store.items.findIndex((item) => item.id === project.id);

  if (ix >= 0) {
    store.items[ix] = project;
  } else {
    store.items.unshift(project);
  }

  if (!store.activeProjectId) {
    store.activeProjectId = project.id;
  }

  writeStore(store);
}

export function updateProjectBrief(
  projectId: string,
  updates: Partial<ProjectBrief>,
): ProjectRecord | null {
  const store = readStore();
  const existing = store.items.find((item) => item.id === projectId);
  if (!existing) return null;

  const next: ProjectRecord = {
    ...existing,
    updatedAt: new Date().toISOString(),
    brief: {
      roomRequirements: {
        ...existing.brief.roomRequirements,
        ...(updates.roomRequirements ?? {}),
      },
      proposal: {
        ...existing.brief.proposal,
        ...(updates.proposal ?? {}),
      },
    },
  };

  upsertProject(next);
  return next;
}

export function createProjectFromTemplateSeed(): ProjectRecord | null {
  if (typeof window === "undefined") return null;

  const raw = safeStorageGet(window.sessionStorage, TEMPLATE_SEED_KEY);
  const parsed = parseJson(raw);
  const seed = validateTemplateSeed(parsed);

  if (!seed) {
    if (raw) {
      safeStorageRemove(window.sessionStorage, TEMPLATE_SEED_KEY);
    }
    return null;
  }

  const store = readStore();

  const duplicate = store.items.find(
    (item) =>
      item.template.createdAt === seed.createdAt &&
      item.template.projectName === seed.projectName,
  );

  if (duplicate) {
    store.activeProjectId = duplicate.id;
    writeStore(store);
    safeStorageRemove(window.sessionStorage, TEMPLATE_SEED_KEY);
    return duplicate;
  }

  const now = new Date().toISOString();

  const project: ProjectRecord = {
    id: makeId(),
    name: seed.projectName,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    template: seed,
    brief: defaultBrief(seed),
  };

  store.items.unshift(project);
  store.activeProjectId = project.id;

  writeStore(store);
  safeStorageRemove(window.sessionStorage, TEMPLATE_SEED_KEY);

  return project;
}

export function importProjects(rawJson: string): {
  ok: boolean;
  imported: number;
  rejected: number;
} {
  const parsed = parseJson(rawJson);

  if (!Array.isArray(parsed)) {
    return { ok: false, imported: 0, rejected: 0 };
  }

  const validItems = parsed
    .map((item) => validateProjectRecord(item))
    .filter((item): item is ProjectRecord => !!item);

  const rejected = parsed.length - validItems.length;

  if (validItems.length === 0) {
    return { ok: false, imported: 0, rejected };
  }

  const store = readStore();
  const map = new Map<string, ProjectRecord>();

  for (const item of store.items) map.set(item.id, item);
  for (const item of validItems) map.set(item.id, item);

  store.items = Array.from(map.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  if (!store.activeProjectId || !store.items.some((x) => x.id === store.activeProjectId)) {
    store.activeProjectId = store.items[0]?.id ?? null;
  }

  writeStore(store);

  return { ok: true, imported: validItems.length, rejected };
}

type LegacyProjectContext = ProjectRecord & {
  projectId: string;
  projectName: string;
  verticalMarket: {
    id: string;
    name: string;
    summary?: string;
  };
  roomType: {
    id: string;
    name: string;
    summary?: string;
    useCases?: string[];
  };
  tier: {
    id: string;
    label: string;
    summary: string;
    positioning?: string;
    performance?: string;
    commercialNote?: string;
  };
};

function toLegacyProjectContext(project: ProjectRecord | null): LegacyProjectContext | null {
  if (!project) return null;

  const brief = (project.brief ?? {}) as Record<string, any>;
  const seed = (brief.seed ?? brief.template ?? brief.templateContext ?? {}) as Record<string, any>;

  const verticalMarketSeed = (seed.verticalMarket ?? {}) as Record<string, any>;
  const roomTypeSeed = (seed.roomType ?? {}) as Record<string, any>;
  const tierSeed = (seed.tier ?? {}) as Record<string, any>;

  return {
    ...project,
    projectId: project.id,
    projectName:
      project.name ||
      seed.projectName ||
      "Untitled Project",
    verticalMarket: {
      id: String(verticalMarketSeed.id ?? "general"),
      name: String(verticalMarketSeed.name ?? "General"),
      summary:
        typeof verticalMarketSeed.summary === "string"
          ? verticalMarketSeed.summary
          : undefined,
    },
    roomType: {
      id: String(roomTypeSeed.id ?? "room"),
      name: String(roomTypeSeed.name ?? "Room"),
      summary:
        typeof roomTypeSeed.summary === "string"
          ? roomTypeSeed.summary
          : undefined,
      useCases: Array.isArray(roomTypeSeed.useCases)
        ? roomTypeSeed.useCases.map(String)
        : [],
    },
    tier: {
      id: String(tierSeed.id ?? "bronze"),
      label: String(tierSeed.label ?? "Bronze"),
      summary: String(
        tierSeed.summary ??
          "a functional baseline solution"
      ),
      positioning:
        typeof tierSeed.positioning === "string"
          ? tierSeed.positioning
          : undefined,
      performance:
        typeof tierSeed.performance === "string"
          ? tierSeed.performance
          : undefined,
      commercialNote:
        typeof tierSeed.commercialNote === "string"
          ? tierSeed.commercialNote
          : undefined,
    },
  };
}

export function getActiveProjectContext(): LegacyProjectContext | null {
  return toLegacyProjectContext(getActiveProject());
}

export function updateActiveProjectBrief(
  updates: Partial<ProjectBrief>,
): ProjectRecord | null {
  const active = getActiveProject();
  if (!active) return null;
  return updateProjectBrief(active.id, updates);
}

export function updateProjectStatus(
  projectId: string,
  status: ProjectStatus | "In Progress",
): ProjectRecord | null {
  const normalized: ProjectStatus =
    status === "In Progress" ? "active" : status;

  const store = readStore();
  const existing = store.items.find((item) => item.id === projectId);
  if (!existing) return null;

  const next: ProjectRecord = {
    ...existing,
    status: normalized,
    updatedAt: new Date().toISOString(),
  };

  upsertProject(next);
  return next;
}

export function updateActiveProjectStatus(
  status: ProjectStatus | "In Progress",
): ProjectRecord | null {
  const active = getActiveProject();
  if (!active) return null;
  return updateProjectStatus(active.id, status);
}