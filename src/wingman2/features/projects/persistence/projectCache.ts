import type { ProjectStoreSnapshot, StoredProject } from "../model/projectTypes";
import { decodeProjectStore, decodeStoredProject } from "./projectCodecs";

export const LEGACY_PROJECT_STORE_KEY = "wingman-project-store-v1";
export const PROJECT_CACHE_MIGRATION_KEY = "wingman-project-cache-migration-v1";

export type ProjectCacheScope = { workspaceId: string; userId: string };
export type ProjectCacheIndex = Omit<ProjectStoreSnapshot, "projects"> & { projectIds: string[] };
export type ProjectCacheFailure = "quota-failed";

export interface ProjectCacheAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}

export interface ProjectCache {
  readIndex(): Promise<ProjectCacheIndex>;
  writeIndex(index: ProjectCacheIndex): Promise<void>;
  readProject(projectId: string): Promise<StoredProject | undefined>;
  writeProject(project: StoredProject): Promise<StoredProject>;
  deleteProject(projectId: string): Promise<void>;
  clearWorkspace(): Promise<void>;
  subscribe(listener: () => void): () => void;
  migrateLegacySnapshot(storage?: Storage): Promise<boolean>;
}

const scopeKey = ({ workspaceId, userId }: ProjectCacheScope) =>
  `workspace:${encodeURIComponent(workspaceId)}:user:${encodeURIComponent(userId)}`;

export function createMemoryProjectCacheAdapter(): ProjectCacheAdapter & { writes: string[] } {
  const values = new Map<string, unknown>();
  const writes: string[] = [];
  return {
    writes,
    async get(key) { return values.get(key); },
    async set(key, value) { values.set(key, structuredClone(value)); writes.push(key); },
    async delete(key) { values.delete(key); writes.push(key); },
    async keys(prefix) { return [...values.keys()].filter((key) => key.startsWith(prefix)); },
  };
}

export function createIndexedDbProjectCacheAdapter(databaseName = "wingman-project-cache-v1"): ProjectCacheAdapter {
  const request = () => new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open(databaseName, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore("entries");
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
  const transaction = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
    const db = await request();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction("entries", mode);
      const operation = action(tx.objectStore("entries"));
      operation.onsuccess = () => resolve(operation.result);
      operation.onerror = () => reject(operation.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  };
  return {
    get: (key) => transaction("readonly", (store) => store.get(key)),
    set: (key, value) => transaction("readwrite", (store) => store.put(value, key)).then(() => undefined),
    delete: (key) => transaction("readwrite", (store) => store.delete(key)).then(() => undefined),
    async keys(prefix) {
      const keys = await transaction<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
      return keys.map(String).filter((key) => key.startsWith(prefix));
    },
  };
}

export function createProjectCache(scope: ProjectCacheScope, adapter: ProjectCacheAdapter): ProjectCache {
  const prefix = `${scopeKey(scope)}:`;
  const indexKey = `${prefix}index`;
  const projectKey = (id: string) => `${prefix}project:${encodeURIComponent(id)}`;
  const listeners = new Set<() => void>();
  const emptyIndex = (): ProjectCacheIndex => ({ projectIds: [], proposalDrafts: [], activeProjectId: null });
  const notify = () => listeners.forEach((listener) => listener());
  const readIndex = async () => {
    const value = await adapter.get(indexKey);
    if (!value || typeof value !== "object") return emptyIndex();
    const source = value as Partial<ProjectCacheIndex>;
    return {
      projectIds: Array.isArray(source.projectIds) ? source.projectIds.filter((id): id is string => typeof id === "string") : [],
      proposalDrafts: Array.isArray(source.proposalDrafts) ? source.proposalDrafts : [],
      activeProjectId: typeof source.activeProjectId === "string" ? source.activeProjectId : null,
      syncStatus: source.syncStatus,
    };
  };
  const writeIndex = (index: ProjectCacheIndex) => adapter.set(indexKey, index);
  return {
    readIndex,
    async writeIndex(index) { await writeIndex(index); notify(); },
    async readProject(projectId) {
      const value = await adapter.get(projectKey(projectId));
      return value && typeof value === "object" ? decodeStoredProject(value as Record<string, unknown>) ?? undefined : undefined;
    },
    async writeProject(project) {
      const normalized = decodeStoredProject(project as unknown as Record<string, unknown>);
      if (!normalized) throw new Error("Project cache rejected an invalid project.");
      await adapter.set(projectKey(normalized.id), normalized);
      const index = await readIndex();
      if (!index.projectIds.includes(normalized.id)) await writeIndex({ ...index, projectIds: [...index.projectIds, normalized.id] });
      notify();
      return normalized;
    },
    async deleteProject(projectId) {
      await adapter.delete(projectKey(projectId));
      const index = await readIndex();
      await writeIndex({ ...index, projectIds: index.projectIds.filter((id) => id !== projectId), activeProjectId: index.activeProjectId === projectId ? null : index.activeProjectId });
      notify();
    },
    async clearWorkspace() {
      await Promise.all((await adapter.keys(prefix)).map((key) => adapter.delete(key)));
      notify();
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async migrateLegacySnapshot(storage = window.localStorage) {
      const migrationKey = `${PROJECT_CACHE_MIGRATION_KEY}:${scopeKey(scope)}`;
      if (storage.getItem(migrationKey) === "complete") return false;
      const raw = storage.getItem(LEGACY_PROJECT_STORE_KEY);
      if (!raw) { storage.setItem(migrationKey, "complete"); return false; }
      const snapshot = decodeProjectStore(JSON.parse(raw));
      for (const project of snapshot.projects) await adapter.set(projectKey(project.id), project);
      await writeIndex({ projectIds: snapshot.projects.map(({ id }) => id), proposalDrafts: snapshot.proposalDrafts, activeProjectId: snapshot.activeProjectId, syncStatus: snapshot.syncStatus });
      storage.setItem(migrationKey, "complete");
      notify();
      return true;
    },
  };
}
