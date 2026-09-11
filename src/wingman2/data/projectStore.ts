import { useCallback, useEffect, useState } from "react";
import { normaliseProjectTopology, type ProjectTopology } from "../lib/projectTopology";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  normalizeMultiSkuCompetitorAnalysis,
  type MultiSkuCompetitorAnalysis,
} from "../lib/documentIngest/multiSkuCompetitorIngest";
import type { StatusVariant } from "../types";
import type { DiscoveryEvidence, ProjectEvidenceFoundation } from "../types/productTruth";
import { STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } from "../lib/strandedBriefQuoteSafety";

export type * from "../features/projects/model/projectTypes";
import type {
  DiscoveryConversationItem,
  LocalProjectStorageMode,
  ProjectAuditEntry,
  ProjectStage,
  ProjectStorageMode,
  RemoteProjectStorageMode,
  ProjectStoreSnapshot,
  ProposalVisualAsset,
  StoredCompareRun,
  StoredDesignProposalRevision,
  StoredDiscoveryBrief,
  StoredGovernedDependency,
  StoredIngestAnalysis,
  StoredIngestVisualAttachment,
  StoredProductFamilyScore,
  StoredProductSelection,
  StoredProject,
  StoredProjectProposal,
  StoredProjectSyncConflict,
  StoredProjectSyncStatus,
  StoredProposalBomRow,
  StoredProposalDraft,
  StoredProposalVisualBlock,
  StoredQuoteSafetyStatus,
  StoredRecommendationEvidence,
  StoredRecommendationFeedback,
  StoredRequirementRecord,
  StoredVideowallSummary,
  StoredWorkflowState,
} from "../features/projects/model/projectTypes";
import { createDefaultProjectStore } from "../features/projects/model/projectDefaults";
import {
  decodeProjectStore,
  decodeStoredProject,
  normalizeProductSelections,
  normalizeRecommendationEvidence,
  normalizeRequirementRecords,
  stringValue,
} from "../features/projects/persistence/projectCodecs";
const PROJECT_STORE_KEY = "wingman-project-store-v1";
const PROJECT_STORE_EVENT = "wingman:project-store-updated";
const PROJECT_SYNC_ENDPOINT = "/api/wingman/projects/sync";
const PROJECTS_ENDPOINT = "/api/wingman/projects";
const BACKEND_SYNC_DEBOUNCE_MS = 600;
const PROJECT_BACKEND_SYNC_ENABLED = String(import.meta.env.VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC ?? "").toLowerCase() === "true";
const PROJECT_SYNC_DISABLED_MESSAGE = "Project backend sync is disabled. Projects are saved in this browser.";
const PROJECT_SYNC_SIGN_IN_MESSAGE = "Project backend sync is enabled, but Wingman is not signed in. Local changes are preserved.";
const PROJECT_SYNC_REJECTED_MESSAGE = "Project backend sync was rejected by the server. Local changes are preserved.";
const LOCAL_PROJECT_MODE_MESSAGE = PROJECT_SYNC_SIGN_IN_MESSAGE;
const PROJECT_SYNC_AUTH_STORAGE_KEYS = [
  "wingman.projectSyncToken",
  "wingman.sessionToken",
  "wingman.authToken",
  "wingman.auth.token",
  "wingman_session",
];
const projectStages: ProjectStage[] = [
  "Discovery",
  "Competitor Compare",
  "Proposal Builder",
  "Recommendations",
  "Templates",
  "Support",
];

let backendSyncTimer: number | null = null;
let backendSyncBaseline: ProjectStoreSnapshot | null = null;
let backendHydrationPromise: Promise<void> | null = null;
let backendSyncRejectedForSession = false;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore(): ProjectStoreSnapshot {
  return createDefaultProjectStore(nowIso);
}
const normalizeStoredProject = decodeStoredProject;
const safeStore = decodeProjectStore;

export function projectBackendSyncEnabled() {
  return PROJECT_BACKEND_SYNC_ENABLED;
}

function localProjectMessage(reason: LocalProjectStorageMode["reason"]) {
  if (reason === "sync-disabled") return PROJECT_SYNC_DISABLED_MESSAGE;
  if (reason === "remote-rejected") return PROJECT_SYNC_REJECTED_MESSAGE;
  return PROJECT_SYNC_SIGN_IN_MESSAGE;
}

function localProjectSyncStatus(
  previous?: StoredProjectSyncStatus | null,
  reason: LocalProjectStorageMode["reason"] = "missing-auth",
): StoredProjectSyncStatus {
  return {
    state: "local",
    message: localProjectMessage(reason),
    updatedAt: previous?.updatedAt ?? nowIso(),
  };
}

function readBrowserStorageValue(storageKey: "localStorage" | "sessionStorage", key: string) {
  try {
    return window[storageKey].getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

function readVisibleCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const cookies = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex <= 0) continue;
    if (cookie.slice(0, separatorIndex).trim() !== name) continue;

    const rawValue = cookie.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return "";
}

function getProjectSyncAuthToken() {
  if (typeof window === "undefined") return "";

  for (const key of PROJECT_SYNC_AUTH_STORAGE_KEYS) {
    const sessionValue = readBrowserStorageValue("sessionStorage", key);
    if (sessionValue) return sessionValue;

    const localValue = readBrowserStorageValue("localStorage", key);
    if (localValue) return localValue;
  }

  return readVisibleCookieValue("wingman_session");
}

function getProjectStorageMode(): ProjectStorageMode {
  if (typeof window === "undefined") {
    return { kind: "local", reason: "server" };
  }

  if (!projectBackendSyncEnabled()) {
    return { kind: "local", reason: "sync-disabled" };
  }

  if (backendSyncRejectedForSession) {
    return { kind: "local", reason: "remote-rejected" };
  }

  const authToken = getProjectSyncAuthToken();
  return {
    kind: "remote",
    authToken: authToken || undefined,
    authSource: authToken ? "storage-token" : "http-only-cookie",
  };
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

/**
 * The incremental-hydration `since` manifest (ADR-0001 §1.2k): per project,
 * the last syncRevision the local copy is based on. The server skips any row
 * whose revision equals the reported one and returns everything else, so a
 * reload only downloads projects that actually changed. Two exclusions keep
 * the pull safe under the merge policy:
 *
 *  - a project that was never synced (no syncRevision) is omitted - the row
 *    either does not exist (a pending upload, which hydration must keep
 *    local) or is legacy with no revision, which the server always returns;
 *  - a syncConflict-flagged project is sent as revision 0, forcing the row
 *    to be returned: the flag means the sync response advanced our revision
 *    WITHOUT adopting the row's content (content basis < reported revision),
 *    so only a full hydration merge can adopt the member's newer lanes.
 *    Sending our reported revision there would skip the row forever and the
 *    conflict would never reconcile.
 */
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

function scheduleBackendProjectSync(
  snapshot: ProjectStoreSnapshot,
  previousSnapshot: ProjectStoreSnapshot,
  storageMode: ProjectStorageMode = getProjectStorageMode(),
) {
  if (typeof window === "undefined") return;

  if (storageMode.kind === "local") {
    if (backendSyncTimer) {
      window.clearTimeout(backendSyncTimer);
      backendSyncTimer = null;
    }
    return;
  }

  setProjectSyncStatus({
    state: "syncing",
    message: "Saving project changes to the workspace backend...",
    updatedAt: nowIso(),
  });

  if (backendSyncTimer) {
    window.clearTimeout(backendSyncTimer);
  }
  backendSyncBaseline ??= previousSnapshot;

  backendSyncTimer = window.setTimeout(async () => {
    backendSyncTimer = null;
    const [{ analyzeProjectSyncResponse, backendProjectForSync, buildProjectPushPlan, syncConflictStatusMessage }, { buildProjectApiRequest }] = await Promise.all([
      import("./projectSyncConflict"),
      import("./projectHydrationFetch"),
    ]);
    const store = safeStore(snapshot);
    // The exact documents this sync SENT: the conflict check diffs each
    // returned merged project against its sent counterpart, so an edit made
    // locally WHILE the request was in flight cannot look like a conflict.
    const sentProjects = store.projects;
    const baseline = backendSyncBaseline ?? previousSnapshot;
    backendSyncBaseline = null;
    const pushPlan = buildProjectPushPlan(baseline.projects, store.projects);
    const send = (endpoint: string, method: "POST" | "PUT", body: unknown) => fetch(
      endpoint,
      buildProjectApiRequest({
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, storageMode),
    );
    const requests = pushPlan.kind === "snapshot"
      ? [send(
          PROJECT_SYNC_ENDPOINT,
          "POST",
          { activeProjectId: store.activeProjectId ?? null, projects: store.projects.map(backendProjectForSync) },
        )]
      : pushPlan.projects.map((project) => send(
          `${PROJECTS_ENDPOINT}/${encodeURIComponent(project.id)}`,
          "PUT",
          backendProjectForSync(project),
        ));

    Promise.all(requests)
      .then(async (responses) => {
        if (responses.some((response) => response.status === 401)) {
          backendSyncRejectedForSession = true;
          setProjectSyncStatus({
            state: "local",
            message: PROJECT_SYNC_SIGN_IN_MESSAGE,
            updatedAt: nowIso(),
          });
          return;
        }

        const failedResponse = responses.find((response) => !response.ok);
        if (failedResponse) {
          backendSyncBaseline ??= baseline;
          console.error(`[wingman] projectStore: backend sync failed with status ${failedResponse.status}`);
          setProjectSyncStatus({
            state: "error",
            message: `Project sync failed with status ${failedResponse.status}. Local changes were preserved.`,
            updatedAt: nowIso(),
          });
          return;
        }

        // Adopt the server's per-project revision counter so the next sync
        // echoes it back as baseRevision (ADR-0001 Phase 2). Content is never
        // overwritten here - only the revision the local copy is based on, so
        // a concurrent server-side merge still surfaces as a stale base on the
        // next sync instead of silently clobbering the local document.
        //
        // Conflict surfacing: the merged document the server returns is the
        // row's accepted state. When it differs from the document we SENT on a
        // merge-arbitrated lane, another team member's changes reached the row
        // (or our own edit lost a same-item tie) without this copy - the
        // response revision advanced past our base revision in exactly those
        // cases. The project is marked with the existing "conflict" sync state
        // and the changed lane keys, so the UI can tell the rep which fields a
        // team member changed. A later response that MATCHES our copy clears
        // the mark (reconciled by a reload's hydration or the member reverting).
        const payloads = await Promise.all(responses.map((response) => response.json().catch(() => null)));
        const returned = pushPlan.kind === "snapshot"
          ? payloads[0]?.projects
          : payloads.map((payload) => payload?.project).filter(Boolean);
        const { revisionById, changedLanesByProjectId } = analyzeProjectSyncResponse(sentProjects, returned);

        const conflicted: Array<{ name: string; fields: string[] }> = [];
        if (revisionById.size > 0 || changedLanesByProjectId.size > 0) {
          const snapshot = readProjectStore();
          writeProjectStore(
            {
              ...snapshot,
              projects: snapshot.projects.map((project) => {
                let next = project;
                const revision = revisionById.get(project.id);
                if (revision !== undefined) next = { ...next, syncRevision: revision };
                const changedLanes = changedLanesByProjectId.get(project.id);
                if (changedLanes !== undefined) {
                  if (changedLanes.length > 0) {
                    conflicted.push({ name: project.name, fields: changedLanes });
                    next = { ...next, syncConflict: { fields: changedLanes, detectedAt: nowIso() } };
                  } else {
                    // The merged row now matches this copy on every tracked
                    // lane: a previously marked conflict is resolved.
                    next = { ...next };
                    delete next.syncConflict;
                  }
                }
                return next;
              }),
            },
            { syncBackend: false },
          );
        }

        setProjectSyncStatus(
          conflicted.length > 0
            ? {
                state: "conflict",
                message: syncConflictStatusMessage(conflicted),
                updatedAt: nowIso(),
              }
            : {
                state: "synced",
                message: "Project changes are synced to the workspace backend.",
                updatedAt: nowIso(),
              },
        );
      })
      .catch((error) => {
        backendSyncBaseline ??= baseline;
        console.error("[wingman] projectStore: backend sync request failed", error);
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

  const storageMode = getProjectStorageMode();
  const previousStore = readProjectStore();
  const store = safeStore({
    ...snapshot,
    syncStatus: storageMode.kind === "local" ? localProjectSyncStatus(snapshot.syncStatus, storageMode.reason) : snapshot.syncStatus,
  });
  window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(store));
  if (options.syncBackend !== false && storageMode.kind === "remote") {
    scheduleBackendProjectSync(store, previousStore, storageMode);
  }
  window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
}

/**
 * The timestamped sub-documents the client saves whole and that the server
 * merge resolves per embedded timestamp (server/wingman-app-store.mjs
 * SUB_DOCUMENT_TIMESTAMP_KEYS). Kept identical so both sides merge with one
 * policy (ADR-0001 §1.2b/§1.2d, extended to hydration by §1.2f).
 */
async function hydrateProjectStoreFromBackendOnce(storageMode: RemoteProjectStorageMode) {
  const [{ buildHydrationSinceManifest, mergeProjectVersionsForHydration }, { buildProjectApiRequest, fetchProjectHydration }] = await Promise.all([
    import("./projectHydrationMerge"),
    import("./projectHydrationFetch"),
  ]);
  // The manifest is read BEFORE the request so it reflects the revisions the
  // local copies were based on when the pull started (an edit made while the
  // request is in flight is preserved by the merge below and pushed by the
  // next sync, exactly as a full hydration would). The merge base is read
  // again AFTER the request so an in-flight local write is never clobbered by
  // a stale snapshot.
  const sinceManifest = buildHydrationSinceManifest(readProjectStore().projects);
  const result = await fetchProjectHydration(PROJECTS_ENDPOINT, buildProjectApiRequest({
    cache: "no-store",
    headers: { "X-Wingman-Since": JSON.stringify(sinceManifest) },
  }, storageMode));
  if (result.status === 401) {
    backendSyncRejectedForSession = true;
    setProjectSyncStatus({ state: "local", message: PROJECT_SYNC_SIGN_IN_MESSAGE, updatedAt: nowIso() });
    return;
  }
  if (!result.projects) return;
  const backendProjects = result.projects
    .filter((project): project is Record<string, unknown> => Boolean(project) && typeof project === "object")
    .map(storedProjectFromBackend);
  const currentStore = readProjectStore();
  let conflictDetected = false;
  const localById = new Map(currentStore.projects.map((project) => [project.id, project]));
  const backendIds = new Set(backendProjects.map((project) => project.id));
  const projects = backendProjects.map((backendProject) => {
    const localProject = localById.get(backendProject.id);
    if (!localProject) return backendProject;

    // One merge policy on BOTH sides: per-sub-document embedded-timestamp LWW,
    // exactly like the server's merge on every accepted sync. A reload can no
    // longer resolve by whole-project updatedAt alone, which silently dropped
    // a locally-edited (offline) sub-document whenever a DIFFERENT
    // sub-document had advanced on the backend — and, in the other direction,
    // left a two-tab copy blind to the other tab's newer sub-document because
    // the whole-project timestamps tied. The merged copy also adopts the
    // backend's syncRevision (when backend content is adopted) so the next
    // sync echoes the freshest basis the merged content is based on.
    const merged = mergeProjectVersionsForHydration(localProject, backendProject);
    if (merged.conflict) conflictDetected = true;
    return merged.project;
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

export async function hydrateProjectStoreFromBackend() {
  const storageMode = getProjectStorageMode();
  if (storageMode.kind === "local") return;

  if (!backendHydrationPromise) {
    backendHydrationPromise = hydrateProjectStoreFromBackendOnce(storageMode);
  }

  return backendHydrationPromise;
}

export function resetProjectBackendSyncSessionState() {
  backendSyncRejectedForSession = false;
  backendHydrationPromise = null;
}

/**
 * Restores the built-in starter examples to their pristine defaults without
 * touching any real project or proposal draft. Only entries tagged
 * `isDemo: true` are ever replaced - anything a user actually created is
 * preserved untouched, no matter how stale or edited the demo rows have become.
 */
export function resetProjectStore() {
  const snapshot = readProjectStore();
  const defaults = defaultStore();
  const realProjects = snapshot.projects.filter((project) => !project.isDemo);
  const realDrafts = snapshot.proposalDrafts.filter((draft) => !draft.isDemo);

  writeProjectStore({
    ...defaults,
    projects: [...defaults.projects, ...realProjects],
    proposalDrafts: [...defaults.proposalDrafts, ...realDrafts],
    activeProjectId: snapshot.activeProjectId,
  });
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
  const storageMode = getProjectStorageMode();
  if (storageMode.kind === "local") {
    return localProjectSyncStatus(snapshot.syncStatus, storageMode.reason);
  }

  return snapshot.syncStatus ?? {
    state: "local",
    message: LOCAL_PROJECT_MODE_MESSAGE,
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
  compareHistoryView?: { search?: string; filter?: string; sort?: string };
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  recommendationEvidence?: StoredRecommendationEvidence;
  videowall?: StoredVideowallSummary;
  workflow: StoredWorkflowState;
  auditTrail?: ProjectAuditEntry[];
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
    recommendationEvidence: input.recommendationEvidence,
    videowall: input.videowall,
    workflow: input.workflow,
    auditTrail: input.auditTrail,
  } satisfies StoredProject;
}

function projectNameFromDiscoveryBrief(brief: StoredDiscoveryBrief) {
  const roomModel = brief.roomModel ?? {};
  const customer = stringValue(roomModel.customer || roomModel.customerName || roomModel.companyName);
  const roomType = stringValue(roomModel.roomType, "Discovery");
  return customer ? `${customer} ${roomType}` : `${roomType} Project`;
}

function projectNameFromIngest(files: string[], intelligence?: MultiSkuCompetitorAnalysis) {
  if (intelligence?.documentType === "multi_sku_competitor_list") {
    const account = intelligence.accountCustomer !== "Not confirmed"
      ? intelligence.accountCustomer
      : intelligence.manufacturer !== "Not confirmed"
        ? intelligence.manufacturer
        : "Competitor";
    return `${account} Multi-SKU Opportunity`;
  }
  if (files.length === 1) return `${files[0]} Requirements`;
  return files.length > 1 ? `${files[0]} + ${files.length - 1} file(s)` : "Imported Requirements";
}

export function saveDiscoveryBriefToProject(brief: StoredDiscoveryBrief, projectId?: string | null) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = projectId === undefined
    ? getCurrentWorkflowProject(snapshot)
    : projectId
      ? snapshot.projects.find((project) => project.id === projectId) ?? null
      : null;
  const workflow: StoredWorkflowState = {
    source: "Discovery",
    lastStep: "Discovery saved",
    nextRoute: routeCatalogByKey.recommendations.path,
    updatedAt: timestamp,
  };

  const capturedPercent = brief.capturedPercent ?? 0;
  const auditDetail = existing?.discoveryBrief
    ? `Discovery updated — ${capturedPercent}% captured`
    : `Discovery created — ${capturedPercent}% captured`;

  const project = existing
    ? {
        ...existing,
        name: existing.discoveryBrief ? existing.name : projectNameFromDiscoveryBrief(brief),
        stage: "Discovery" as const,
        status: "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.recommendations.path,
        updatedAt: timestamp,
        discoveryBrief: brief,
        auditTrail: [
          { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "discovery-save", detail: auditDetail, scope: "discovery", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
          ...(existing.auditTrail ?? []),
        ].slice(0, 50),
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromDiscoveryBrief(brief),
        stage: "Discovery",
        status: "recommended",
        resumeTo: routeCatalogByKey.recommendations.path,
        discoveryBrief: brief,
        auditTrail: [
          { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "discovery-create", detail: auditDetail, scope: "discovery", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
        ],
        workflow,
      });

  return upsertStoredProject(project);
}

function projectNameFromVideowall(wallType: string) {
  if (wallType === "led") return "LED Video Wall Discovery";
  if (wallType === "lcd") return "LCD Video Wall Discovery";
  return "Video Wall Discovery";
}

const VIDEOWALL_PRODUCT_SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

export function productSelectionsFromVideowallSummary(
  summary: Record<string, unknown>,
  savedAt = nowIso(),
): StoredProductSelection[] {
  const recommendation: Record<string, unknown> =
    summary.recommendation && typeof summary.recommendation === "object" && !Array.isArray(summary.recommendation)
      ? summary.recommendation as Record<string, unknown>
      : {};
  const products = Array.isArray(recommendation.products) ? recommendation.products : [];
  const evidence = [recommendation.title, recommendation.rationale]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());

  return [...new Set(products
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => VIDEOWALL_PRODUCT_SKU_PATTERN.test(value)))]
    .map((sku) => ({
      sku,
      title: sku,
      category: "Video Wall",
      status: "recommended" as const,
      tags: ["videowall"],
      addedAt: savedAt,
      source: "Video Wall Builder",
      evidence,
    }));
}

export function saveVideowallToProject(input: { wallType: string; summary: Record<string, unknown> }) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const recommendedProducts = productSelectionsFromVideowallSummary(input.summary, timestamp);
  const recommendedSkus = new Set(recommendedProducts.map((product) => product.sku));
  const productSelections = [
    ...recommendedProducts,
    ...(existing?.productSelections ?? []).filter((product) => !recommendedSkus.has(product.sku)),
  ].slice(0, 20);
  const videowall: StoredVideowallSummary = {
    savedAt: timestamp,
    wallType: input.wallType,
    summary: input.summary,
  };
  const workflow: StoredWorkflowState = {
    source: "Video Wall Builder",
    lastStep: "Video wall discovery saved",
    nextRoute: routeCatalogByKey.discovery.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        updated: "Just now",
        updatedAt: timestamp,
        videowall,
        productSelections,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromVideowall(input.wallType),
        stage: "Discovery",
        status: "recommended",
        resumeTo: routeCatalogByKey.discovery.path,
        videowall,
        productSelections: productSelections.length ? productSelections : undefined,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProductSelectionToProject(projectId: string, selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing: StoredProject =
    snapshot.projects.find((project) => project.id === projectId) ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Recommendations",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.recommendations.path,
      productSelections: [],
      workflow: {
        source: "Recommendations",
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

  // Record audit event for product selection change
  const existingSkus = (existing.productSelections ?? []).map((p) => p.sku);
  const auditDetail = existingSkus.includes(selected.sku)
    ? `Updated product ${selected.sku} (${selected.title || selected.sku})`
    : `Added product ${selected.sku} (${selected.title || selected.sku}) to project`;

  const result = upsertStoredProject({
    ...existing,
    stage: "Recommendations",
    status: selected.status ?? existing.status,
    updated: "Just now",
    resumeTo: routeCatalogByKey.recommendations.path,
    updatedAt: timestamp,
    productSelections,
    omittedProductSkus: (existing.omittedProductSkus ?? []).filter((sku) => sku.toUpperCase() !== selected.sku.toUpperCase()),
    auditTrail: [
      { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "product-selection", detail: auditDetail, scope: "products", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
      ...(existing.auditTrail ?? []),
    ].slice(0, 50),
    workflow: {
      source: "Recommendations",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.projects.path,
      updatedAt: timestamp,
    },
  });

  return result;
}

export function saveProductSelectionToCurrentProject(selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const project =
    existing ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Recommendations",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.recommendations.path,
      productSelections: [],
      workflow: {
        source: "Recommendations",
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


/** Remove a product line from a project and remember the omission. */
export function removeProductSelectionFromProject(projectId: string, sku: string) {
  const snapshot = readProjectStore();
  const existing = snapshot.projects.find((project) => project.id === projectId);
  const targetSku = sku.trim().toUpperCase();
  if (!existing || !targetSku) return null;

  const current = existing.productSelections ?? [];
  const removed = current.find((item) => item.sku.trim().toUpperCase() === targetSku);
  if (!removed) return existing;

  const timestamp = nowIso();
  const omittedProductSkus = Array.from(new Set([
    ...(existing.omittedProductSkus ?? []),
    removed.sku.trim().toUpperCase(),
  ]));

  return upsertStoredProject({
    ...existing,
    productSelections: current.filter((item) => item.sku.trim().toUpperCase() !== targetSku),
    omittedProductSkus,
    updated: "Just now",
    updatedAt: timestamp,
    auditTrail: [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: "product-selection-remove",
        detail: `Removed product ${removed.sku} (${removed.title || removed.sku}) from project`,
        scope: "products",
        severity: "info" as const,
        actorName: "Wingman user",
        createdAt: timestamp,
      },
      ...(existing.auditTrail ?? []),
    ].slice(0, 50),
  });
}

export function removeProductSelectionFromCurrentProject(sku: string) {
  const existing = getCurrentWorkflowProject();
  return existing ? removeProductSelectionFromProject(existing.id, sku) : null;
}
export function createProjectForProductSelection(name: string, selection: StoredProductSelection) {
  const projectName = name.trim() || `${selection.sku} Product Selection`;
  const normalizedSelection = normalizeProductSelections([selection])[0] ?? selection;
  const project = createWorkflowProject({
    name: projectName,
    stage: "Recommendations",
    status: selection.status ?? "alternative",
    resumeTo: routeCatalogByKey.proposal.path,
    productSelections: [normalizedSelection],
    workflow: {
      source: "Product call cards",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.proposal.path,
      updatedAt: nowIso(),
    },
  });

  return upsertStoredProject(project);
}

export function saveRecommendationEvidenceToProject(
  evidence: StoredRecommendationEvidence,
  selection?: StoredProductSelection,
) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const normalizedSelection = selection ? normalizeProductSelections([selection])[0] ?? selection : null;
  const productSelections = normalizedSelection
    ? [
        normalizedSelection,
        ...((existing?.productSelections ?? []).filter((item) => item.sku !== normalizedSelection.sku)),
      ].slice(0, 20)
    : existing?.productSelections;
  const status: StatusVariant =
    evidence.quoteSafetyStatus === "quote-ready"
      ? "recommended"
      : evidence.quoteSafetyStatus === "do-not-quote-yet"
        ? "caution"
        : "alternative";
  // A stranded discovery brief (a captured answer whose option a later answer
  // hid) already downgraded the brief's quote-safety gate. Carrying a fresh
  // evidence payload over it must not re-derive a safer status from the pitch
  // alone — keep the project at the brief's do-not-quote verdict so the
  // evidence panel colors the same as the brief it overrides.
  const strandedByBrief = existing?.discoveryBrief?.quoteSafetyStatus === "do-not-quote-yet";
  const projectStatus: StatusVariant = strandedByBrief ? "caution" : status;
  const workflow: StoredWorkflowState = {
    source: "Product Pitch",
    lastStep: "Recommendation evidence saved",
    nextRoute: routeCatalogByKey.proposal.path,
    updatedAt: timestamp,
  };
  const normalizedEvidence = normalizeRecommendationEvidence({
    ...evidence,
    updatedAt: timestamp,
    source: evidence.source || "Product Pitch",
  }) ?? evidence;
  const evidenceForProject = strandedByBrief && normalizedEvidence.quoteSafetyStatus !== "do-not-quote-yet"
    ? {
        ...normalizedEvidence,
        quoteSafetyStatus: "do-not-quote-yet" as const,
        quoteSafetyMessage: STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE,
      }
    : normalizedEvidence;

  const project = existing
    ? {
        ...existing,
        stage: "Recommendations" as const,
        status: projectStatus,
        updated: "Just now",
        resumeTo: routeCatalogByKey.productPitch.path,
        updatedAt: timestamp,
        productSelections,
        recommendationEvidence: evidenceForProject,
        workflow,
      }
    : createWorkflowProject({
        name: normalizedSelection
          ? `${normalizedSelection.sku} Product Pitch`
          : evidence.productDirection || "Product Pitch Direction",
        stage: "Recommendations",
        status: projectStatus,
        resumeTo: routeCatalogByKey.productPitch.path,
        productSelections: normalizedSelection ? [normalizedSelection] : undefined,
        recommendationEvidence: evidenceForProject,
        workflow,
      });

  return upsertStoredProject(project);
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
    multiSkuIntelligence: input.multiSkuIntelligence,
    visualContext: input.visualContext,
    updatedAt: timestamp,
  };
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const isMultiSku = input.multiSkuIntelligence?.documentType === "multi_sku_competitor_list";
  const workflow: StoredWorkflowState = {
    source: "Document Ingest",
    lastStep: isMultiSku ? "Multi-SKU competitor intelligence saved" : "Requirements imported",
    nextRoute: isMultiSku ? routeCatalogByKey.compare.path : routeCatalogByKey.discovery.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: isMultiSku ? "Competitor Compare" as const : "Discovery" as const,
        status: input.unknowns.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path,
        updatedAt: timestamp,
        ingest,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromIngest(input.files, input.multiSkuIntelligence),
        owner: input.multiSkuIntelligence?.accountCustomer !== "Not confirmed"
          ? input.multiSkuIntelligence?.accountCustomer
          : undefined,
        stage: isMultiSku ? "Competitor Compare" : "Discovery",
        status: input.unknowns.length ? "alternative" : "recommended",
        resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path,
        ingest,
        workflow,
      });

  return upsertStoredProject(project);
}

export function deleteCompareRunFromProject(runId: string, options: { requireExistingProject?: boolean } = {}) {
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing?.compareRuns?.some((run) => run.id === runId)) return null;

  const updatedProject = {
    ...existing,
    compareRuns: existing.compareRuns.filter((run) => run.id !== runId),
    updated: "Just now",
    updatedAt: nowIso(),
  };

  return upsertStoredProject(updatedProject);
}

export function saveCompareRunToProject(
  run: Omit<StoredCompareRun, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = run.createdAt ?? nowIso();
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const comparisonKey = `${String(run.competitorBrand ?? "").trim().toLowerCase()}::${String(run.competitorSku ?? "").trim().toUpperCase()}`;
  const priorVersions = (existing?.compareRuns ?? []).filter((item) =>
    `${String(item.competitorBrand ?? "").trim().toLowerCase()}::${String(item.competitorSku ?? "").trim().toUpperCase()}` === comparisonKey,
  );
  const compareRun: StoredCompareRun = {
    id: run.id ?? createId("compare-run"),
    createdAt: timestamp,
    version: run.version ?? (priorVersions.reduce((max, item) => Math.max(max, item.version ?? 0), 0) + 1),
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

  // Snapshot the current proposal as a version before overwriting
  let proposalVersions = existing?.proposalVersions ?? [];
  if (existing?.proposal && hasProposalChanged(existing.proposal, proposal)) {
    const versionNumber = proposalVersions.length + 1;
    // Auto-generate a descriptive label from the product diff
    const prevSkuSet = new Set((existing.proposal.products ?? []).map((p) => String(p.sku ?? "").toUpperCase()));
    const nextSkuSet = new Set((proposal.products ?? []).map((p) => String(p.sku ?? "").toUpperCase()));
    const added = [...nextSkuSet].filter((s) => !prevSkuSet.has(s));
    const removed = [...prevSkuSet].filter((s) => !nextSkuSet.has(s));
    const labelParts: string[] = [];
    if (added.length) labelParts.push(`Added ${added.join(", ")}`);
    if (removed.length) labelParts.push(`Removed ${removed.join(", ")}`);
    if (!labelParts.length && existing.proposal.title !== proposal.title) labelParts.push("Title changed");
    if (!labelParts.length && existing.proposal.summary !== proposal.summary) labelParts.push("Summary updated");
    const autoLabel = labelParts.length > 0
      ? `v${versionNumber} — ${labelParts.slice(0, 2).join("; ")}`
      : `v${versionNumber}`;
    proposalVersions = [
      ...proposalVersions,
      {
        id: createId("proposal-version"),
        versionNumber,
        savedAt: timestamp,
        label: autoLabel,
        proposal: existing.proposal,
      },
    ];
  }

  const proposalProductCount = (proposal.products ?? []).length;
  const readinessPct = proposal.readinessScore ?? 0;
  const proposalAuditDetail = existing?.proposal
    ? `Proposal updated — ${proposalProductCount} products, readiness ${readinessPct}%`
    : `Proposal created — ${proposalProductCount} products, readiness ${readinessPct}%`;

  const project = existing
    ? {
        ...existing,
        stage: "Proposal Builder" as const,
        status: proposal.assumptions.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.proposal.path,
        updatedAt: timestamp,
        proposal,
        proposalVersions,
        auditTrail: [
          { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "proposal-save", detail: proposalAuditDetail, scope: "proposal", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
          ...(existing.auditTrail ?? []),
        ].slice(0, 50),
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

/**
 * Detect whether the proposal content has meaningfully changed.
 * Compares title, summary, products, assumptions and sections to avoid
 * creating trivial version snapshots on every keystroke.
 */
function hasProposalChanged(prev: StoredProjectProposal, next: StoredProjectProposal): boolean {
  if (prev.title !== next.title) return true;
  if (prev.summary !== next.summary) return true;
  if (prev.assumptions.join("\n") !== next.assumptions.join("\n")) return true;
  if (prev.sections.join("\n") !== next.sections.join("\n")) return true;
  const prevSkus = prev.products.map((p) => `${p.sku}:${p.quantity ?? 1}`).sort().join(",");
  const nextSkus = next.products.map((p) => `${p.sku}:${p.quantity ?? 1}`).sort().join(",");
  return prevSkus !== nextSkus;
}

/** Restore a proposal from a saved version snapshot. */
export function restoreProposalVersion(versionId: string): boolean {
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  if (!existing?.proposalVersions) return false;
  const version = existing.proposalVersions.find((v) => v.id === versionId);
  if (!version) return false;
  upsertStoredProject({
    ...existing,
    proposal: version.proposal,
    updatedAt: nowIso(),
  });
  return true;
}

export function saveProposalVisualAsset(
  projectId: string,
  input: Omit<ProposalVisualAsset, "id" | "projectId" | "revision" | "createdAt" | "updatedAt"> & { id?: string },
): ProposalVisualAsset | null {
  const timestamp = nowIso();
  let saved: ProposalVisualAsset | null = null;
  const project = updateStoredProject(projectId, (current) => {
    const previous = input.id ? current.visualAssets?.find((asset) => asset.id === input.id) : undefined;
    saved = {
      ...input,
      id: previous?.id ?? input.id ?? createId("proposal-visual"),
      projectId,
      revision: (previous?.revision ?? 0) + 1,
      createdAt: previous?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const visualAssets = [saved, ...(current.visualAssets ?? []).filter((asset) => asset.id !== saved?.id)];
    const visualBlock: StoredProposalVisualBlock = {
      id: `visual-block-${saved.id}`,
      assetId: saved.id,
      kind: saved.kind,
      title: saved.title,
      summary: saved.caption,
      proposalUse: saved.purpose,
      exportLabel: `Revision ${saved.revision}`,
      renderSrc: saved.render.svg || saved.render.pngDataUrl || saved.render.thumbnailDataUrl,
    };
    return {
      ...current,
      visualAssets,
      updated: "Just now",
      updatedAt: timestamp,
      proposal: current.proposal ? {
        ...current.proposal,
        visualBlocks: [visualBlock, ...(current.proposal.visualBlocks ?? []).filter((block) => block.assetId !== saved?.id)],
        updatedAt: timestamp,
      } : current.proposal,
    };
  });
  return project && saved ? (saved as ProposalVisualAsset) : null;
}

export function saveDealOutcome(
  projectId: string,
  outcome: "won" | "lost" | "deferred" | "",
  why?: string,
): void {
  const timestamp = nowIso();
  updateStoredProject(projectId, (project) => ({
    ...project,
    updated: "Just now",
    updatedAt: timestamp,
    dealOutcome: outcome,
    dealOutcomeWhy: why ?? project.dealOutcomeWhy ?? "",
  }));
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

    hydrateProjectStoreFromBackend().catch((error) => {
      // Local store remains valid when no backend session is available - but this
      // catch also covers genuine unexpected failures, so log for diagnosis.
      console.error("[wingman] projectStore: hydrateProjectStoreFromBackend failed", error);
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
