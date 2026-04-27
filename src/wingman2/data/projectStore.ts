import { useCallback, useEffect, useState } from "react";
import { routeCatalogByKey } from "../app/routeCatalog";
import type { StatusVariant } from "../types";

export type ProjectStage =
  | "Discovery"
  | "Competitor Compare"
  | "Proposal Builder"
  | "Finder"
  | "Templates"
  | "Support";

export type StoredProject = {
  id: string;
  name: string;
  owner: string;
  stage: ProjectStage;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
  createdAt: string;
  updatedAt: string;
  discoveryBrief?: StoredDiscoveryBrief;
  productSelections?: StoredProductSelection[];
  ingest?: StoredIngestAnalysis;
  compareRuns?: StoredCompareRun[];
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  feedback?: StoredRecommendationFeedback[];
  workflow?: StoredWorkflowState;
};

export type StoredDiscoveryBrief = {
  savedAt?: string;
  roomModel?: Record<string, unknown>;
  inference?: Record<string, unknown>;
  capturedPercent?: number;
  returnRoute?: string;
};

export type StoredProductSelection = {
  sku: string;
  title?: string;
  family?: string;
  category?: string;
  status?: StatusVariant;
  tags?: string[];
  addedAt?: string;
  source?: string;
  evidence?: string[];
  cautions?: string[];
};

export type StoredIngestAnalysis = {
  requirements: string[];
  unknowns: string[];
  skippedFiles: string[];
  files: string[];
  updatedAt: string;
};

export type StoredCompareRun = {
  id: string;
  createdAt: string;
  competitorBrand?: string;
  competitorSku?: string;
  competitorName?: string;
  wyrestormSku?: string;
  wyrestormTitle?: string;
  mode?: string;
  summary?: string;
  warnings?: string[];
  matchScore?: number;
  confidence?: string;
  matchType?: string;
  wyrestormUrl?: string;
  evidence?: string[];
  source?: string;
};

export type StoredProjectProposal = {
  title: string;
  summary: string;
  sections: string[];
  products: StoredProductSelection[];
  assumptions: string[];
  outputPurpose?: StoredProposalOutputPurpose;
  governedDependencies?: StoredGovernedDependency[];
  bomRows?: StoredProposalBomRow[];
  evidence?: string[];
  repGuidance?: string[];
  governanceWarnings?: string[];
  validationNotes?: string[];
  readinessScore?: number;
  updatedAt: string;
};

export type StoredGovernedDependency = {
  id: string;
  sku: string;
  label: string;
  role: string;
  qty: number;
  type: string;
  status: string;
  confidence: string;
  governanceKind?: string;
  trigger: string;
  evidence: string;
  validationQuestion: string;
  customerSafeNote: string;
  sourceSku?: string;
  ruleId?: string;
  ruleSource?: string;
};

export type StoredRequirementStatus = "confirmed" | "unknown" | "review";

export type StoredRequirementRecord = {
  id: string;
  label: string;
  value: string;
  category: string;
  source: string;
  status: StoredRequirementStatus;
  whyItMatters: string;
  updatedAt: string;
};

export type StoredProposalOutputPurpose = {
  motion: string;
  summary: string;
  customerOutput: string;
  nextAction: string;
};

export type StoredProposalBomRow = {
  item: number;
  sku: string;
  description: string;
  role: string;
  qty: number;
  type?: string;
  status: string;
  evidence?: string;
  notes: string;
};

export type StoredWorkflowState = {
  source: string;
  lastStep: string;
  nextRoute: string;
  updatedAt: string;
};

export type StoredProposalDraft = {
  id: string;
  name: string;
  customer: string;
  state: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStoreSnapshot = {
  projects: StoredProject[];
  proposalDrafts: StoredProposalDraft[];
  activeProjectId?: string | null;
  syncStatus?: StoredProjectSyncStatus;
};

export type StoredProjectSyncStatus = {
  state: "local" | "syncing" | "synced" | "error" | "conflict";
  message: string;
  updatedAt: string;
};

export type StoredRecommendationFeedback = {
  id: string;
  createdAt: string;
  scope: "recommendation" | "bom" | "proposal" | "compare";
  rating: "accepted" | "needs-review" | "missing-accessory" | "wrong-fit";
  label: string;
  note?: string;
  sku?: string;
};

const PROJECT_STORE_KEY = "wingman-project-store-v1";
const PROJECT_STORE_EVENT = "wingman:project-store-updated";
const PROJECT_SYNC_ENDPOINT = "/api/wingman/projects/sync";
const PROJECTS_ENDPOINT = "/api/wingman/projects";
const BACKEND_SYNC_DEBOUNCE_MS = 600;
const projectStages: ProjectStage[] = [
  "Discovery",
  "Competitor Compare",
  "Proposal Builder",
  "Finder",
  "Templates",
  "Support",
];

let backendSyncTimer: ReturnType<typeof window.setTimeout> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore(): ProjectStoreSnapshot {
  const timestamp = nowIso();

  return {
    projects: [
      {
        id: "northbridge-meeting-room-refresh",
        name: "Northbridge Meeting Room Refresh",
        owner: "Steve",
        stage: "Discovery",
        status: "recommended",
        updated: "2 hours ago",
        resumeTo: routeCatalogByKey.discovery.path,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "harbour-retail-signage-rollout",
        name: "Harbour Retail Signage Rollout",
        owner: "Channel Sales",
        stage: "Competitor Compare",
        status: "alternative",
        updated: "Today",
        resumeTo: routeCatalogByKey.compare.path,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "westbrook-classroom-standard",
        name: "Westbrook Classroom Standard",
        owner: "Pre-sales",
        stage: "Proposal Builder",
        status: "recommended",
        updated: "Yesterday",
        resumeTo: routeCatalogByKey.proposal.path,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    activeProjectId: null,
    syncStatus: {
      state: "local",
      message: "Local sample data is available without a workspace session.",
      updatedAt: timestamp,
    },
    proposalDrafts: [
      {
        id: "boardroom-av-upgrade-proposal",
        name: "Boardroom AV Upgrade Proposal",
        customer: "Apex Group",
        state: "Ready for review",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "meeting-room-standard-bundle",
        name: "Meeting Room Standard Bundle",
        customer: "Northbridge",
        state: "Waiting on assumptions",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "retail-display-distribution-pack",
        name: "Retail Display Distribution Pack",
        customer: "Harbour Retail",
        state: "Ready for export",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown, fallback?: string) {
  const text = String(value ?? "").trim();
  return text || fallback || "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function normalizedStage(value: unknown): ProjectStage {
  const stage = String(value ?? "").trim();
  return projectStages.includes(stage as ProjectStage) ? (stage as ProjectStage) : "Discovery";
}

function normalizeProductSelections(value: unknown): StoredProductSelection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProductSelection | null => {
      const record = objectRecord(item);
      const sku = stringValue(record?.sku);
      if (!record || !sku) return null;

      return {
        sku,
        title: stringValue(record.title, undefined),
        family: stringValue(record.family, undefined),
        category: stringValue(record.category, undefined),
        status: statusVariant(record.status),
        tags: stringArray(record.tags),
        addedAt: stringValue(record.addedAt, nowIso()),
        source: stringValue(record.source, "Product Finder"),
        evidence: stringArray(record.evidence),
        cautions: stringArray(record.cautions),
      } satisfies StoredProductSelection;
    })
    .filter((item): item is StoredProductSelection => Boolean(item));
}

function normalizeDiscoveryBrief(value: unknown): StoredDiscoveryBrief | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  return {
    savedAt: stringValue(record.savedAt, undefined),
    roomModel: objectRecord(record.roomModel) ?? undefined,
    inference: objectRecord(record.inference) ?? undefined,
    capturedPercent: Number.isFinite(Number(record.capturedPercent)) ? Number(record.capturedPercent) : undefined,
    returnRoute: stringValue(record.returnRoute, undefined),
  };
}

function normalizeIngestAnalysis(value: unknown): StoredIngestAnalysis | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  return {
    requirements: stringArray(record.requirements),
    unknowns: stringArray(record.unknowns),
    skippedFiles: stringArray(record.skippedFiles),
    files: stringArray(record.files),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeCompareRuns(value: unknown): StoredCompareRun[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredCompareRun | null => {
      const record = objectRecord(item);
      if (!record) return null;

      return {
        id: stringValue(record.id, createId("compare-run")),
        createdAt: stringValue(record.createdAt, nowIso()),
        competitorBrand: stringValue(record.competitorBrand, undefined),
        competitorSku: stringValue(record.competitorSku, undefined),
        competitorName: stringValue(record.competitorName, undefined),
        wyrestormSku: stringValue(record.wyrestormSku, undefined),
        wyrestormTitle: stringValue(record.wyrestormTitle, undefined),
        mode: stringValue(record.mode, undefined),
        summary: stringValue(record.summary, undefined),
        warnings: stringArray(record.warnings),
        matchScore: Number.isFinite(Number(record.matchScore)) ? Number(record.matchScore) : undefined,
        confidence: stringValue(record.confidence, undefined),
        matchType: stringValue(record.matchType, undefined),
        wyrestormUrl: stringValue(record.wyrestormUrl, undefined),
        evidence: stringArray(record.evidence),
        source: stringValue(record.source, "Competitor Compare"),
      } satisfies StoredCompareRun;
    })
    .filter((item): item is StoredCompareRun => Boolean(item));
}

function normalizeProjectProposal(value: unknown): StoredProjectProposal | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;
  const outputPurpose = objectRecord(record.outputPurpose);

  return {
    title: stringValue(record.title, "Untitled Proposal"),
    summary: stringValue(record.summary),
    sections: stringArray(record.sections),
    products: normalizeProductSelections(record.products),
    assumptions: stringArray(record.assumptions),
    outputPurpose: outputPurpose
      ? {
          motion: stringValue(outputPurpose.motion),
          summary: stringValue(outputPurpose.summary),
          customerOutput: stringValue(outputPurpose.customerOutput),
          nextAction: stringValue(outputPurpose.nextAction),
        }
      : undefined,
    governedDependencies: normalizeGovernedDependencies(record.governedDependencies),
    bomRows: normalizeProposalBomRows(record.bomRows),
    evidence: stringArray(record.evidence),
    repGuidance: stringArray(record.repGuidance),
    governanceWarnings: stringArray(record.governanceWarnings),
    validationNotes: stringArray(record.validationNotes),
    readinessScore: Number.isFinite(Number(record.readinessScore)) ? Number(record.readinessScore) : undefined,
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeGovernedDependencies(value: unknown): StoredGovernedDependency[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredGovernedDependency | null => {
      const record = objectRecord(item);
      if (!record) return null;

      const dependency: StoredGovernedDependency = {
        id: stringValue(record.id, createId("dependency")),
        sku: stringValue(record.sku, "TBC"),
        label: stringValue(record.label, "Dependency"),
        role: stringValue(record.role, "Dependency"),
        qty: Number.isFinite(Number(record.qty)) ? Number(record.qty) : 1,
        type: stringValue(record.type, "Validate"),
        status: stringValue(record.status, "validate"),
        confidence: stringValue(record.confidence, "Low"),
        trigger: stringValue(record.trigger),
        evidence: stringValue(record.evidence),
        validationQuestion: stringValue(record.validationQuestion),
        customerSafeNote: stringValue(record.customerSafeNote),
      };

      const governanceKind = stringValue(record.governanceKind, undefined);
      const sourceSku = stringValue(record.sourceSku, undefined);
      const ruleId = stringValue(record.ruleId, undefined);
      const ruleSource = stringValue(record.ruleSource, undefined);

      if (governanceKind) dependency.governanceKind = governanceKind;
      if (sourceSku) dependency.sourceSku = sourceSku;
      if (ruleId) dependency.ruleId = ruleId;
      if (ruleSource) dependency.ruleSource = ruleSource;

      return dependency;
    })
    .filter((item): item is StoredGovernedDependency => Boolean(item));
}

function normalizeRequirementRecords(value: unknown): StoredRequirementRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredRequirementRecord | null => {
      const record = objectRecord(item);
      if (!record) return null;
      const status = stringValue(record.status);
      const normalizedStatus: StoredRequirementStatus =
        status === "confirmed" || status === "unknown" || status === "review" ? status : "review";

      return {
        id: stringValue(record.id, createId("requirement")),
        label: stringValue(record.label, "Requirement"),
        value: stringValue(record.value, "Not confirmed"),
        category: stringValue(record.category, "General"),
        source: stringValue(record.source, "Wingman"),
        status: normalizedStatus,
        whyItMatters: stringValue(record.whyItMatters),
        updatedAt: stringValue(record.updatedAt, nowIso()),
      };
    })
    .filter((item): item is StoredRequirementRecord => Boolean(item));
}

function normalizeProposalBomRows(value: unknown): StoredProposalBomRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredProposalBomRow | null => {
      const record = objectRecord(item);
      if (!record) return null;

      return {
        item: Number.isFinite(Number(record.item)) ? Number(record.item) : 0,
        sku: stringValue(record.sku, "TBC"),
        description: stringValue(record.description, "Unspecified BOM item"),
        role: stringValue(record.role, "Dependency"),
        qty: Number.isFinite(Number(record.qty)) ? Number(record.qty) : 1,
        type: stringValue(record.type, undefined),
        status: stringValue(record.status, "validate"),
        evidence: stringValue(record.evidence, undefined),
        notes: stringValue(record.notes, "Validate before issue."),
      };
    })
    .filter((item): item is StoredProposalBomRow => Boolean(item));
}

function normalizeFeedback(value: unknown): StoredRecommendationFeedback[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoredRecommendationFeedback | null => {
      const record = objectRecord(item);
      if (!record) return null;
      const rating = stringValue(record.rating);
      const normalizedRating: StoredRecommendationFeedback["rating"] =
        rating === "accepted" || rating === "needs-review" || rating === "missing-accessory" || rating === "wrong-fit"
          ? rating
          : "needs-review";
      const scope = stringValue(record.scope);
      const normalizedScope: StoredRecommendationFeedback["scope"] =
        scope === "recommendation" || scope === "bom" || scope === "proposal" || scope === "compare"
          ? scope
          : "recommendation";

      return {
        id: stringValue(record.id, createId("feedback")),
        createdAt: stringValue(record.createdAt, nowIso()),
        scope: normalizedScope,
        rating: normalizedRating,
        label: stringValue(record.label, "Recommendation feedback"),
        note: stringValue(record.note, undefined),
        sku: stringValue(record.sku, undefined),
      };
    })
    .filter((item): item is StoredRecommendationFeedback => Boolean(item));
}

function normalizeWorkflowState(value: unknown): StoredWorkflowState | undefined {
  const record = objectRecord(value);
  if (!record) return undefined;

  return {
    source: stringValue(record.source, "Wingman"),
    lastStep: stringValue(record.lastStep, "Updated"),
    nextRoute: stringValue(record.nextRoute, routeCatalogByKey.projects.path),
    updatedAt: stringValue(record.updatedAt, nowIso()),
  };
}

function normalizeStoredProject(value: unknown): StoredProject | null {
  const record = objectRecord(value);
  if (!record) return null;

  const updatedAt = stringValue(record.updatedAt || record.createdAt, nowIso());
  const project: StoredProject = {
    ...(record as Partial<StoredProject>),
    id: stringValue(record.id, createId("stored-project")),
    name: stringValue(record.name || record.roomName, "Untitled Project"),
    owner: stringValue(record.owner || record.customer, "Wingman user"),
    stage: normalizedStage(record.stage),
    status: statusVariant(record.status),
    updated: stringValue(record.updated, "Synced"),
    resumeTo: stringValue(record.resumeTo, routeCatalogByKey.discovery.path),
    createdAt: stringValue(record.createdAt, updatedAt),
    updatedAt,
  };

  const discoveryBrief = normalizeDiscoveryBrief(record.discoveryBrief);
  if (discoveryBrief) project.discoveryBrief = discoveryBrief;

  const productSelections = normalizeProductSelections(record.productSelections);
  if (productSelections.length) project.productSelections = productSelections;

  const ingest = normalizeIngestAnalysis(record.ingest);
  if (ingest) project.ingest = ingest;

  const compareRuns = normalizeCompareRuns(record.compareRuns);
  if (compareRuns.length) project.compareRuns = compareRuns;

  const proposal = normalizeProjectProposal(record.proposal);
  if (proposal) project.proposal = proposal;

  const requirements = normalizeRequirementRecords(record.requirements);
  if (requirements.length) project.requirements = requirements;

  const feedback = normalizeFeedback(record.feedback);
  if (feedback.length) project.feedback = feedback;

  const workflow = normalizeWorkflowState(record.workflow);
  if (workflow) project.workflow = workflow;

  return project;
}

function normalizeProposalDraft(value: unknown): StoredProposalDraft | null {
  const record = objectRecord(value);
  if (!record) return null;

  const updatedAt = stringValue(record.updatedAt || record.createdAt, nowIso());
  return {
    id: stringValue(record.id, createId("proposal-draft")),
    name: stringValue(record.name, "Untitled Proposal"),
    customer: stringValue(record.customer, "Wingman user"),
    state: stringValue(record.state, "Draft"),
    createdAt: stringValue(record.createdAt, updatedAt),
    updatedAt,
  };
}

function normalizeSyncStatus(value: unknown): StoredProjectSyncStatus {
  const record = objectRecord(value);
  const state = stringValue(record?.state);
  const normalizedState: StoredProjectSyncStatus["state"] =
    state === "syncing" || state === "synced" || state === "error" || state === "conflict" || state === "local"
      ? state
      : "local";

  return {
    state: normalizedState,
    message: stringValue(record?.message, "Project data is stored locally."),
    updatedAt: stringValue(record?.updatedAt, nowIso()),
  };
}

function safeStore(candidate: Partial<ProjectStoreSnapshot> | null | undefined): ProjectStoreSnapshot {
  const projects = Array.isArray(candidate?.projects)
    ? candidate.projects.map(normalizeStoredProject).filter((project): project is StoredProject => Boolean(project))
    : [];
  const proposalDrafts = Array.isArray(candidate?.proposalDrafts)
    ? candidate.proposalDrafts.map(normalizeProposalDraft).filter((draft): draft is StoredProposalDraft => Boolean(draft))
    : [];
  const activeProjectId = projects.some((project) => project.id === candidate?.activeProjectId)
    ? candidate?.activeProjectId ?? null
    : null;

  return {
    projects,
    proposalDrafts,
    activeProjectId,
    syncStatus: normalizeSyncStatus(candidate?.syncStatus),
  };
}

function statusVariant(value: unknown): StatusVariant {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "recommended" || normalized.includes("ready") || normalized.includes("track")) return "recommended";
  if (normalized === "caution" || normalized.includes("risk") || normalized.includes("block")) return "caution";
  return "alternative";
}

function storedProjectFromBackend(value: Record<string, unknown>): StoredProject {
  return normalizeStoredProject(value) ?? {
    id: createId("backend-project"),
    name: "Untitled Project",
    owner: "Wingman user",
    stage: "Discovery",
    status: "alternative",
    updated: "Synced",
    resumeTo: routeCatalogByKey.discovery.path,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function backendProjectFromStored(project: StoredProject) {
  return {
    ...project,
    customer: project.owner,
    site: "",
    roomName: project.name,
    notes: `Resume workflow: ${project.resumeTo}`,
  };
}

async function fetchBackendProjectStore() {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch(PROJECTS_ENDPOINT, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as { projects?: unknown[] };
    if (!Array.isArray(payload.projects)) return null;

    return payload.projects
      .filter((project): project is Record<string, unknown> => Boolean(project) && typeof project === "object")
      .map(storedProjectFromBackend);
  } catch {
    return null;
  }
}

function setProjectSyncStatus(syncStatus: StoredProjectSyncStatus) {
  if (typeof window === "undefined") return;

  const snapshot = readProjectStore();
  writeProjectStore(
    {
      ...snapshot,
      syncStatus,
    },
    { syncBackend: false },
  );
}

function scheduleBackendProjectSync(snapshot: ProjectStoreSnapshot) {
  if (typeof window === "undefined") return;

  setProjectSyncStatus({
    state: "syncing",
    message: "Saving project changes to the workspace backend...",
    updatedAt: nowIso(),
  });

  if (backendSyncTimer) {
    window.clearTimeout(backendSyncTimer);
  }

  backendSyncTimer = window.setTimeout(() => {
    backendSyncTimer = null;
    const store = safeStore(snapshot);

    fetch(PROJECT_SYNC_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activeProjectId: store.activeProjectId ?? null,
        projects: store.projects.map(backendProjectFromStored),
      }),
    })
      .then((response) => {
        if (response.status === 401) {
          setProjectSyncStatus({
            state: "local",
            message: "Project changes are saved locally. Sign in to sync them to a workspace.",
            updatedAt: nowIso(),
          });
          return;
        }

        if (!response.ok) {
          setProjectSyncStatus({
            state: "error",
            message: `Project sync failed with status ${response.status}. Local changes were preserved.`,
            updatedAt: nowIso(),
          });
          return;
        }

        setProjectSyncStatus({
          state: "synced",
          message: "Project changes are synced to the workspace backend.",
          updatedAt: nowIso(),
        });
      })
      .catch(() => {
        setProjectSyncStatus({
          state: "error",
          message: "Project sync failed. Local changes were preserved.",
          updatedAt: nowIso(),
        });
      });
  }, BACKEND_SYNC_DEBOUNCE_MS);
}

export function readProjectStore(): ProjectStoreSnapshot {
  if (typeof window === "undefined") {
    return defaultStore();
  }

  const raw = window.localStorage.getItem(PROJECT_STORE_KEY);

  if (!raw) {
    return defaultStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProjectStoreSnapshot>;
    return safeStore(parsed);
  } catch {
    return defaultStore();
  }
}

export function writeProjectStore(snapshot: ProjectStoreSnapshot, options: { syncBackend?: boolean } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const store = safeStore(snapshot);
  window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(store));
  if (options.syncBackend !== false) {
    scheduleBackendProjectSync(store);
  }
  window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
}

export async function hydrateProjectStoreFromBackend() {
  const backendProjects = await fetchBackendProjectStore();
  if (!backendProjects) return;
  const currentStore = readProjectStore();
  let conflictDetected = false;
  const localById = new Map(currentStore.projects.map((project) => [project.id, project]));
  const backendIds = new Set(backendProjects.map((project) => project.id));
  const projects = backendProjects.map((backendProject) => {
    const localProject = localById.get(backendProject.id);
    if (!localProject) return backendProject;

    const localTime = Date.parse(localProject.updatedAt || "");
    const backendTime = Date.parse(backendProject.updatedAt || "");
    if (Number.isFinite(localTime) && Number.isFinite(backendTime) && localTime > backendTime) {
      conflictDetected = true;
      return localProject;
    }

    return backendProject;
  });

  currentStore.projects.forEach((project) => {
    if (!backendIds.has(project.id)) {
      projects.push(project);
    }
  });

  writeProjectStore(
    {
      ...currentStore,
      projects,
      activeProjectId: currentStore.activeProjectId,
      syncStatus: conflictDetected
        ? {
            state: "conflict",
            message: "Local project changes were newer than backend data, so Wingman preserved the local version.",
            updatedAt: nowIso(),
          }
        : {
            state: "synced",
            message: "Project data was loaded from the workspace backend.",
            updatedAt: nowIso(),
          },
    },
    { syncBackend: false },
  );
}

export function resetProjectStore() {
  writeProjectStore(defaultStore());
}

export function copyStoredProject(projectId: string) {
  const snapshot = readProjectStore();
  const project = snapshot.projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  const copy: StoredProject = {
    ...project,
    id: createId(project.id),
    name: `${project.name} Copy`,
    updated: "Just now",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.projects.findIndex((item) => item.id === projectId);
  const projects = [...snapshot.projects];
  projects.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: copy.id,
  });
}

export function deleteStoredProject(projectId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    projects: snapshot.projects.filter((project) => project.id !== projectId),
    activeProjectId: snapshot.activeProjectId === projectId ? null : snapshot.activeProjectId,
  });
}

export function copyStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();
  const draft = snapshot.proposalDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return;
  }

  const copy: StoredProposalDraft = {
    ...draft,
    id: createId(draft.id),
    name: `${draft.name} Copy`,
    state: "Copied draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.proposalDrafts.findIndex((item) => item.id === draftId);
  const proposalDrafts = [...snapshot.proposalDrafts];
  proposalDrafts.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    proposalDrafts,
  });
}

export function deleteStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    proposalDrafts: snapshot.proposalDrafts.filter((draft) => draft.id !== draftId),
  });
}

export function getProjectSyncStatus(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return snapshot.syncStatus ?? {
    state: "local",
    message: "Project data is stored locally.",
    updatedAt: nowIso(),
  };
}

export function saveRecommendationFeedback(
  feedback: Omit<StoredRecommendationFeedback, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing) return null;

  const timestamp = feedback.createdAt ?? nowIso();
  const nextFeedback: StoredRecommendationFeedback = {
    id: feedback.id ?? createId("feedback"),
    createdAt: timestamp,
    scope: feedback.scope,
    rating: feedback.rating,
    label: feedback.label,
    note: feedback.note,
    sku: feedback.sku,
  };

  return upsertStoredProject({
    ...existing,
    updated: "Just now",
    updatedAt: timestamp,
    feedback: [nextFeedback, ...(existing.feedback ?? [])].slice(0, 40),
    workflow: {
      source: "Sales Feedback",
      lastStep: `Feedback captured: ${feedback.label}`,
      nextRoute: existing.resumeTo,
      updatedAt: timestamp,
    },
  });
}

export function projectHasWorkflowData(project: StoredProject) {
  return Boolean(
    project.discoveryBrief ||
      project.ingest ||
      project.proposal ||
      project.workflow ||
      project.productSelections?.length ||
      project.compareRuns?.length ||
      project.feedback?.length,
  );
}

export function getActiveProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? null;
}

export function getCurrentWorkflowProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return getActiveProject(snapshot) ?? snapshot.projects.find(projectHasWorkflowData) ?? null;
}

export function setActiveProjectId(projectId: string | null) {
  const snapshot = readProjectStore();
  const activeProjectId = projectId && snapshot.projects.some((project) => project.id === projectId) ? projectId : null;
  writeProjectStore({
    ...snapshot,
    activeProjectId,
  });
}

export function clearActiveProject() {
  setActiveProjectId(null);
}

export function upsertStoredProject(project: StoredProject) {
  const snapshot = readProjectStore();
  const normalized = normalizeStoredProject(project) ?? project;
  const projects = [normalized, ...snapshot.projects.filter((item) => item.id !== normalized.id)];

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: normalized.id,
  });

  return normalized;
}

export function updateStoredProject(projectId: string, updater: (project: StoredProject) => StoredProject) {
  const snapshot = readProjectStore();
  let updatedProject: StoredProject | null = null;
  const projects = snapshot.projects.map((project) => {
    if (project.id !== projectId) return project;
    const nextProject = updater(project);
    updatedProject = normalizeStoredProject(nextProject) ?? nextProject;
    return updatedProject;
  });

  if (!updatedProject) return null;

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: projectId,
  });

  return updatedProject;
}

function createWorkflowProject(input: {
  name: string;
  owner?: string;
  stage: ProjectStage;
  status?: StatusVariant;
  resumeTo: string;
  discoveryBrief?: StoredDiscoveryBrief;
  ingest?: StoredIngestAnalysis;
  productSelections?: StoredProductSelection[];
  compareRuns?: StoredCompareRun[];
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  workflow: StoredWorkflowState;
}) {
  const timestamp = nowIso();

  return {
    id: createId("wingman-project"),
    name: input.name,
    owner: input.owner || "Wingman user",
    stage: input.stage,
    status: input.status ?? "alternative",
    updated: "Just now",
    resumeTo: input.resumeTo,
    createdAt: timestamp,
    updatedAt: timestamp,
    discoveryBrief: input.discoveryBrief,
    ingest: input.ingest,
    productSelections: input.productSelections,
    compareRuns: input.compareRuns,
    proposal: input.proposal,
    requirements: input.requirements,
    workflow: input.workflow,
  } satisfies StoredProject;
}

function projectNameFromDiscoveryBrief(brief: StoredDiscoveryBrief) {
  const roomModel = brief.roomModel ?? {};
  const customer = stringValue(roomModel.customer || roomModel.customerName || roomModel.companyName);
  const roomType = stringValue(roomModel.roomType, "Discovery");
  return customer ? `${customer} ${roomType}` : `${roomType} Project`;
}

function projectNameFromIngest(files: string[]) {
  if (files.length === 1) return `${files[0]} Requirements`;
  return files.length > 1 ? `${files[0]} + ${files.length - 1} file(s)` : "Imported Requirements";
}

export function saveDiscoveryBriefToProject(brief: StoredDiscoveryBrief) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const workflow: StoredWorkflowState = {
    source: "Discovery",
    lastStep: "Discovery saved",
    nextRoute: routeCatalogByKey.finder.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        name: existing.discoveryBrief ? existing.name : projectNameFromDiscoveryBrief(brief),
        stage: "Discovery" as const,
        status: "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.finder.path,
        updatedAt: timestamp,
        discoveryBrief: brief,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromDiscoveryBrief(brief),
        stage: "Discovery",
        status: "recommended",
        resumeTo: routeCatalogByKey.finder.path,
        discoveryBrief: brief,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProductSelectionToProject(projectId: string, selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing =
    snapshot.projects.find((project) => project.id === projectId) ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Finder",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.finder.path,
      productSelections: [],
      workflow: {
        source: "Product Finder",
        lastStep: "Product selected",
        nextRoute: routeCatalogByKey.projects.path,
        updatedAt: nowIso(),
      },
    });

  const timestamp = nowIso();
  const selected = normalizeProductSelections([selection])[0] ?? selection;
  const productSelections = [
    selected,
    ...(existing.productSelections ?? []).filter((item) => item.sku !== selected.sku),
  ].slice(0, 20);

  return upsertStoredProject({
    ...existing,
    stage: "Finder",
    status: selected.status ?? existing.status,
    updated: "Just now",
    resumeTo: routeCatalogByKey.finder.path,
    updatedAt: timestamp,
    productSelections,
    workflow: {
      source: "Product Finder",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.projects.path,
      updatedAt: timestamp,
    },
  });
}

export function saveProductSelectionToCurrentProject(selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const project =
    existing ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Finder",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.finder.path,
      productSelections: [],
      workflow: {
        source: "Product Finder",
        lastStep: "Product selected",
        nextRoute: routeCatalogByKey.projects.path,
        updatedAt: nowIso(),
      },
    });

  if (!existing) {
    upsertStoredProject(project);
  }

  return saveProductSelectionToProject(project.id, selection);
}

export function saveIngestAnalysisToProject(
  input: Omit<StoredIngestAnalysis, "updatedAt"> & { updatedAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = input.updatedAt ?? nowIso();
  const ingest: StoredIngestAnalysis = {
    requirements: input.requirements,
    unknowns: input.unknowns,
    skippedFiles: input.skippedFiles,
    files: input.files,
    updatedAt: timestamp,
  };
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const workflow: StoredWorkflowState = {
    source: "Document Ingest",
    lastStep: "Requirements imported",
    nextRoute: routeCatalogByKey.discovery.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: "Discovery" as const,
        status: input.unknowns.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.discovery.path,
        updatedAt: timestamp,
        ingest,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromIngest(input.files),
        stage: "Discovery",
        status: input.unknowns.length ? "alternative" : "recommended",
        resumeTo: routeCatalogByKey.discovery.path,
        ingest,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveCompareRunToProject(
  run: Omit<StoredCompareRun, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = run.createdAt ?? nowIso();
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const compareRun: StoredCompareRun = {
    id: run.id ?? createId("compare-run"),
    createdAt: timestamp,
    competitorBrand: run.competitorBrand,
    competitorSku: run.competitorSku,
    competitorName: run.competitorName,
    wyrestormSku: run.wyrestormSku,
    wyrestormTitle: run.wyrestormTitle,
    mode: run.mode,
    summary: run.summary,
    warnings: run.warnings ?? [],
    matchScore: run.matchScore,
    confidence: run.confidence,
    matchType: run.matchType,
    wyrestormUrl: run.wyrestormUrl,
    evidence: run.evidence ?? [],
    source: run.source ?? "Competitor Compare",
  };
  const workflow: StoredWorkflowState = {
    source: "Competitor Compare",
    lastStep: "Competitor lookup saved",
    nextRoute: routeCatalogByKey.projects.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: "Competitor Compare" as const,
        status: "alternative" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.compare.path,
        updatedAt: timestamp,
        compareRuns: [compareRun, ...(existing.compareRuns ?? [])].slice(0, 10),
        workflow,
      }
    : createWorkflowProject({
        name: `${compareRun.competitorSku || "Competitor"} Comparison`,
        stage: "Competitor Compare",
        status: "alternative",
        resumeTo: routeCatalogByKey.compare.path,
        compareRuns: [compareRun],
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProjectProposalToProject(proposal: StoredProjectProposal) {
  const timestamp = proposal.updatedAt || nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const workflow: StoredWorkflowState = {
    source: "Proposal Builder",
    lastStep: "Proposal preview generated",
    nextRoute: routeCatalogByKey.support.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: "Proposal Builder" as const,
        status: proposal.assumptions.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.proposal.path,
        updatedAt: timestamp,
        proposal,
        workflow,
      }
    : createWorkflowProject({
        name: proposal.title,
        stage: "Proposal Builder",
        status: proposal.assumptions.length ? "alternative" : "recommended",
        resumeTo: routeCatalogByKey.proposal.path,
        proposal,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProjectRequirementsToProject(projectId: string, requirements: StoredRequirementRecord[]) {
  const timestamp = nowIso();

  return updateStoredProject(projectId, (project) => ({
    ...project,
    updated: "Just now",
    updatedAt: timestamp,
    requirements: normalizeRequirementRecords(
      requirements.map((requirement) => ({
        ...requirement,
        updatedAt: timestamp,
      })),
    ),
    workflow: {
      source: "Project Requirements",
      lastStep: "Requirements reviewed",
      nextRoute: project.resumeTo,
      updatedAt: timestamp,
    },
  }));
}

export function useProjectStore() {
  const [snapshot, setSnapshot] = useState<ProjectStoreSnapshot>(() => readProjectStore());

  useEffect(() => {
    function refresh() {
      setSnapshot(readProjectStore());
    }

    hydrateProjectStoreFromBackend().catch(() => {
      // Local store remains valid when no backend session is available.
    });

    window.addEventListener(PROJECT_STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(PROJECT_STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const copyProject = useCallback((projectId: string) => {
    copyStoredProject(projectId);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    deleteStoredProject(projectId);
  }, []);

  const copyProposalDraft = useCallback((draftId: string) => {
    copyStoredProposalDraft(draftId);
  }, []);

  const deleteProposalDraft = useCallback((draftId: string) => {
    deleteStoredProposalDraft(draftId);
  }, []);

  const resetStore = useCallback(() => {
    resetProjectStore();
  }, []);

  return {
    projects: snapshot.projects,
    proposalDrafts: snapshot.proposalDrafts,
    activeProjectId: snapshot.activeProjectId ?? null,
    activeProject: getActiveProject(snapshot),
    syncStatus: getProjectSyncStatus(snapshot),
    copyProject,
    deleteProject,
    copyProposalDraft,
    deleteProposalDraft,
    resetStore,
  };
}
