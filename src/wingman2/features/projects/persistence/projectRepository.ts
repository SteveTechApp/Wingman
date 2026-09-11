import { createDefaultProjectStore } from "../model/projectDefaults";
import type { ProjectStoreSnapshot } from "../model/projectTypes";
import { decodeProjectStore } from "./projectCodecs";

export const PROJECT_STORE_KEY = "wingman-project-store-v1";
export const PROJECT_STORE_EVENT = "wingman:project-store-updated";

export interface ProjectRepository {
  read(): ProjectStoreSnapshot;
  write(snapshot: ProjectStoreSnapshot): ProjectStoreSnapshot | undefined;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

function defaultSnapshot() {
  return createDefaultProjectStore();
}

export const projectRepository: ProjectRepository = {
  read() {
    if (typeof window === "undefined") return defaultSnapshot();

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
    window.localStorage.removeItem(PROJECT_STORE_KEY);
    window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
  },
};
