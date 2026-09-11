import { routeCatalogByKey } from "../../../app/routeCatalog";
import type {
  LocalProjectStorageMode,
  ProjectStorageMode,
  ProjectStoreSnapshot,
  RemoteProjectStorageMode,
  StoredProject,
  StoredProjectSyncStatus,
} from "../model/projectTypes";
import { decodeProjectStore, decodeStoredProject } from "./projectCodecs";
import { projectRepository, type ProjectRepository } from "./projectRepository";

const PROJECT_SYNC_ENDPOINT = "/api/wingman/projects/sync";
const PROJECTS_ENDPOINT = "/api/wingman/projects";
const BACKEND_SYNC_DEBOUNCE_MS = 600;
const PROJECT_SYNC_AUTH_STORAGE_KEYS = [
  "wingman.projectSyncToken", "wingman.sessionToken", "wingman.authToken", "wingman.auth.token", "wingman_session",
];
const PROJECT_SYNC_DISABLED_MESSAGE = "Project backend sync is disabled. Projects are saved in this browser.";
const PROJECT_SYNC_SIGN_IN_MESSAGE = "Project backend sync is enabled, but Wingman is not signed in. Local changes are preserved.";
const PROJECT_SYNC_REJECTED_MESSAGE = "Project backend sync was rejected by the server. Local changes are preserved.";

export interface ProjectSyncService {
  enabled(): boolean;
  storageMode(): ProjectStorageMode;
  status(snapshot: ProjectStoreSnapshot): StoredProjectSyncStatus;
  normalizeForStorage(snapshot: ProjectStoreSnapshot): ProjectStoreSnapshot;
  schedule(snapshot: ProjectStoreSnapshot, previousSnapshot: ProjectStoreSnapshot): void;
  hydrate(): Promise<void> | undefined;
  resetSession(): void;
}

interface ProjectSyncDependencies {
  repository: ProjectRepository;
  backendEnabled: boolean;
  fetchImpl: typeof fetch;
  now: () => string;
  debounceMs?: number;
}

export function createProjectSyncService({
  repository,
  backendEnabled,
  fetchImpl,
  now,
  debounceMs = BACKEND_SYNC_DEBOUNCE_MS,
}: ProjectSyncDependencies): ProjectSyncService {
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  let syncBaseline: ProjectStoreSnapshot | null = null;
  let hydrationPromise: Promise<void> | null = null;
  let rejectedForSession = false;

  const localMessage = (reason: LocalProjectStorageMode["reason"]) => {
    if (reason === "sync-disabled") return PROJECT_SYNC_DISABLED_MESSAGE;
    if (reason === "remote-rejected") return PROJECT_SYNC_REJECTED_MESSAGE;
    return PROJECT_SYNC_SIGN_IN_MESSAGE;
  };

  const localStatus = (previous?: StoredProjectSyncStatus | null, reason: LocalProjectStorageMode["reason"] = "missing-auth"): StoredProjectSyncStatus => ({
    state: "local",
    message: localMessage(reason),
    updatedAt: previous?.updatedAt ?? now(),
  });

  const readStorageValue = (storage: Storage, key: string) => {
    try { return storage.getItem(key)?.trim() ?? ""; } catch { return ""; }
  };

  const visibleCookie = (name: string) => {
    if (typeof document === "undefined") return "";
    for (const cookie of document.cookie.split(";").map((part) => part.trim()).filter(Boolean)) {
      const separator = cookie.indexOf("=");
      if (separator <= 0 || cookie.slice(0, separator).trim() !== name) continue;
      const raw = cookie.slice(separator + 1).trim();
      try { return decodeURIComponent(raw); } catch { return raw; }
    }
    return "";
  };

  const authToken = () => {
    if (typeof window === "undefined") return "";
    for (const key of PROJECT_SYNC_AUTH_STORAGE_KEYS) {
      const sessionValue = readStorageValue(window.sessionStorage, key);
      if (sessionValue) return sessionValue;
      const localValue = readStorageValue(window.localStorage, key);
      if (localValue) return localValue;
    }
    return visibleCookie("wingman_session");
  };

  const storageMode = (): ProjectStorageMode => {
    if (typeof window === "undefined") return { kind: "local", reason: "server" };
    if (!backendEnabled) return { kind: "local", reason: "sync-disabled" };
    if (rejectedForSession) return { kind: "local", reason: "remote-rejected" };
    const token = authToken();
    return { kind: "remote", authToken: token || undefined, authSource: token ? "storage-token" : "http-only-cookie" };
  };

  const setStatus = (syncStatus: StoredProjectSyncStatus) => {
    if (typeof window === "undefined") return;
    repository.write({ ...repository.read(), syncStatus });
  };

  const fromBackend = (value: Record<string, unknown>): StoredProject => decodeStoredProject(value) ?? {
    id: `backend-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "Untitled Project",
    owner: "Wingman user",
    stage: "Discovery",
    status: "alternative",
    updated: "Synced",
    resumeTo: routeCatalogByKey.discovery.path,
    createdAt: now(),
    updatedAt: now(),
  };

  const runSync = async (snapshot: ProjectStoreSnapshot, previousSnapshot: ProjectStoreSnapshot, mode: RemoteProjectStorageMode) => {
    const [hydrationFetch, syncConflict] = await Promise.all([
      import("../../../data/projectHydrationFetch"),
      import("../../../data/projectSyncConflict"),
    ]);
    const { buildProjectApiRequest } = hydrationFetch;
    const {
      analyzeProjectSyncResponse,
      backendProjectForSync,
      buildProjectPushPlan,
      syncConflictStatusMessage,
    } = syncConflict;
    const store = decodeProjectStore(snapshot);
    const sentProjects = store.projects;
    const baseline = syncBaseline ?? previousSnapshot;
    syncBaseline = null;
    const pushPlan = buildProjectPushPlan(baseline.projects, store.projects);
    const send = (endpoint: string, method: "POST" | "PUT", body: unknown) => fetchImpl(endpoint, buildProjectApiRequest({
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, mode));
    const responses = await Promise.all(pushPlan.kind === "snapshot"
      ? [send(PROJECT_SYNC_ENDPOINT, "POST", { activeProjectId: store.activeProjectId ?? null, projects: store.projects.map(backendProjectForSync) })]
      : pushPlan.projects.map((project) => send(`${PROJECTS_ENDPOINT}/${encodeURIComponent(project.id)}`, "PUT", backendProjectForSync(project))));

    if (responses.some((response) => response.status === 401)) {
      rejectedForSession = true;
      setStatus({ state: "local", message: PROJECT_SYNC_SIGN_IN_MESSAGE, updatedAt: now() });
      return;
    }
    const failed = responses.find((response) => !response.ok);
    if (failed) {
      syncBaseline ??= baseline;
      console.error(`[wingman] projectStore: backend sync failed with status ${failed.status}`);
      setStatus({ state: "error", message: `Project sync failed with status ${failed.status}. Local changes were preserved.`, updatedAt: now() });
      return;
    }

    const payloads = await Promise.all(responses.map((response) => response.json().catch(() => null)));
    const returned = pushPlan.kind === "snapshot" ? payloads[0]?.projects : payloads.map((payload) => payload?.project).filter(Boolean);
    const { revisionById, changedLanesByProjectId } = analyzeProjectSyncResponse(sentProjects, returned);
    const conflicted: Array<{ name: string; fields: string[] }> = [];
    if (revisionById.size || changedLanesByProjectId.size) {
      const current = repository.read();
      repository.write({
        ...current,
        projects: current.projects.map((project) => {
          let next = project;
          const revision = revisionById.get(project.id);
          if (revision !== undefined) next = { ...next, syncRevision: revision };
          const lanes = changedLanesByProjectId.get(project.id);
          if (lanes?.length) {
            conflicted.push({ name: project.name, fields: lanes });
            next = { ...next, syncConflict: { fields: lanes, detectedAt: now() } };
          } else if (lanes) {
            next = { ...next };
            delete next.syncConflict;
          }
          return next;
        }),
      });
    }
    setStatus(conflicted.length
      ? { state: "conflict", message: syncConflictStatusMessage(conflicted), updatedAt: now() }
      : { state: "synced", message: "Project changes are synced to the workspace backend.", updatedAt: now() });
  };

  const hydrateOnce = async (mode: RemoteProjectStorageMode) => {
    const [hydrationFetch, hydrationMerge] = await Promise.all([
      import("../../../data/projectHydrationFetch"),
      import("../../../data/projectHydrationMerge"),
    ]);
    const { buildProjectApiRequest, fetchProjectHydration } = hydrationFetch;
    const { buildHydrationSinceManifest, mergeProjectVersionsForHydration } = hydrationMerge;
    const since = buildHydrationSinceManifest(repository.read().projects);
    const result = await fetchProjectHydration(PROJECTS_ENDPOINT, buildProjectApiRequest({
      cache: "no-store",
      headers: { "X-Wingman-Since": JSON.stringify(since) },
    }, mode), fetchImpl);
    if (result.status === 401) {
      rejectedForSession = true;
      setStatus({ state: "local", message: PROJECT_SYNC_SIGN_IN_MESSAGE, updatedAt: now() });
      return;
    }
    if (!result.projects) return;
    const backendProjects = result.projects
      .filter((project): project is Record<string, unknown> => Boolean(project) && typeof project === "object")
      .map(fromBackend);
    const current = repository.read();
    let conflictDetected = false;
    const localById = new Map(current.projects.map((project) => [project.id, project]));
    const backendIds = new Set(backendProjects.map((project) => project.id));
    const projects = backendProjects.map((backendProject) => {
      const local = localById.get(backendProject.id);
      if (!local) return backendProject;
      const merged = mergeProjectVersionsForHydration(local, backendProject);
      if (merged.conflict) conflictDetected = true;
      return merged.project;
    });
    current.projects.forEach((project) => { if (!backendIds.has(project.id)) projects.push(project); });
    repository.write({
      ...current,
      projects,
      activeProjectId: current.activeProjectId,
      syncStatus: conflictDetected
        ? { state: "conflict", message: "Local project changes were newer than backend data, so Wingman preserved the local version.", updatedAt: now() }
        : { state: "synced", message: "Project data was loaded from the workspace backend.", updatedAt: now() },
    });
  };

  return {
    enabled: () => backendEnabled,
    storageMode,
    status(snapshot) {
      const mode = storageMode();
      return mode.kind === "local"
        ? localStatus(snapshot.syncStatus, mode.reason)
        : snapshot.syncStatus ?? { state: "local", message: PROJECT_SYNC_SIGN_IN_MESSAGE, updatedAt: now() };
    },
    normalizeForStorage(snapshot) {
      const mode = storageMode();
      return decodeProjectStore({
        ...snapshot,
        syncStatus: mode.kind === "local" ? localStatus(snapshot.syncStatus, mode.reason) : snapshot.syncStatus,
      });
    },
    schedule(snapshot, previousSnapshot) {
      if (typeof window === "undefined") return;
      const mode = storageMode();
      if (mode.kind === "local") {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = null;
        return;
      }
      setStatus({ state: "syncing", message: "Saving project changes to the workspace backend...", updatedAt: now() });
      if (syncTimer) clearTimeout(syncTimer);
      syncBaseline ??= previousSnapshot;
      syncTimer = setTimeout(() => {
        syncTimer = null;
        void runSync(snapshot, previousSnapshot, mode).catch((error) => {
          syncBaseline ??= previousSnapshot;
          console.error("[wingman] projectStore: backend sync request failed", error);
          setStatus({ state: "error", message: "Project sync failed. Local changes were preserved.", updatedAt: now() });
        });
      }, debounceMs);
    },
    hydrate() {
      const mode = storageMode();
      if (mode.kind === "local") return undefined;
      hydrationPromise ??= hydrateOnce(mode);
      return hydrationPromise;
    },
    resetSession() {
      rejectedForSession = false;
      hydrationPromise = null;
      syncBaseline = null;
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = null;
    },
  };
}

export const projectSyncService = createProjectSyncService({
  repository: projectRepository,
  backendEnabled: String(import.meta.env.VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC ?? "").toLowerCase() === "true",
  fetchImpl: (input, init) => fetch(input, init),
  now: () => new Date().toISOString(),
});
