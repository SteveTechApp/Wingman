import { createDefaultProjectStore } from "../model/projectDefaults";
import type { ProjectStoreSnapshot } from "../model/projectTypes";
import { decodeProjectStore } from "./projectCodecs";
import { createIndexedDbProjectCacheAdapter, createProjectCache, type ProjectCache, type ProjectCacheScope } from "./projectCache";

export const PROJECT_STORE_KEY = "wingman-project-store-v1";
export const PROJECT_STORE_EVENT = "wingman:project-store-updated";

export interface ProjectRepository {
  read(): ProjectStoreSnapshot;
  write(snapshot: ProjectStoreSnapshot): ProjectStoreSnapshot | undefined;
  subscribe(listener: () => void): () => void;
  reset(): void;
  initializeScope?(scope: ProjectCacheScope): Promise<void>;
}

function defaultSnapshot() {
  return createDefaultProjectStore();
}

let scopedCache: ProjectCache | null = null;
let scopedSnapshot: ProjectStoreSnapshot | null = null;

async function initializeScope(scope: ProjectCacheScope) {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  const cache = createProjectCache(scope, createIndexedDbProjectCacheAdapter());
  await cache.migrateLegacySnapshot(window.localStorage);
  const index = await cache.readIndex();
  const projects = (await Promise.all(index.projectIds.map((id) => cache.readProject(id))))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));
  scopedCache = cache;
  scopedSnapshot = decodeProjectStore({ ...index, projects });
  window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
}

export const projectRepository: ProjectRepository = {
  read() {
    if (typeof window === "undefined") return defaultSnapshot();
    if (scopedSnapshot) return scopedSnapshot;

    try {
      const raw = window.localStorage.getItem(PROJECT_STORE_KEY);
      return raw ? decodeProjectStore(JSON.parse(raw)) : defaultSnapshot();
    } catch {
      return defaultSnapshot();
    }
  },

  write(snapshot) {
    if (typeof window === "undefined") return undefined;
    const normalized = decodeProjectStore(snapshot);
    if (scopedCache) {
      const previousIds = new Set(scopedSnapshot?.projects.map(({ id }) => id) ?? []);
      scopedSnapshot = normalized;
      void (async () => {
        await Promise.all(normalized.projects.map((project) => { previousIds.delete(project.id); return scopedCache!.writeProject(project); }));
        await Promise.all([...previousIds].map((id) => scopedCache!.deleteProject(id)));
        await scopedCache!.writeIndex({
          projectIds: normalized.projects.map(({ id }) => id),
          proposalDrafts: normalized.proposalDrafts,
          activeProjectId: normalized.activeProjectId,
          syncStatus: normalized.syncStatus,
        });
      })().catch((error) => {
        const quota = error instanceof DOMException && error.name === "QuotaExceededError";
        scopedSnapshot = { ...normalized, syncStatus: { state: "error", message: quota ? "Project cache quota was exceeded. Changes remain available in this session." : "Project cache could not save changes. Changes remain available in this session.", updatedAt: new Date().toISOString() } };
        window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
      });
      window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
      return normalized;
    }
    window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
    return normalized;
  },

  subscribe(listener) {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener(PROJECT_STORE_EVENT, listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener(PROJECT_STORE_EVENT, listener);
      window.removeEventListener("storage", listener);
    };
  },

  reset() {
    if (typeof window === "undefined") return;
    if (scopedCache) {
      scopedSnapshot = defaultSnapshot();
      void scopedCache.clearWorkspace();
      window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
      return;
    }
    window.localStorage.removeItem(PROJECT_STORE_KEY);
    window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
  },
  initializeScope,
};
