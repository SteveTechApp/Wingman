import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROJECT_STORE_EVENT, PROJECT_STORE_KEY, projectRepository } from "./projectRepository";

describe("projectRepository", () => {
  beforeEach(() => window.localStorage.clear());

  it("recovers from corrupt JSON with the default snapshot", () => {
    window.localStorage.setItem(PROJECT_STORE_KEY, "{broken");
    expect(projectRepository.read().projects.map((project) => project.id)).toContain("northbridge-meeting-room-refresh");
  });

  it("normalizes writes and preserves the storage key", () => {
    const result = projectRepository.write({
      projects: [],
      proposalDrafts: [],
      activeProjectId: "missing",
    });
    expect(result?.activeProjectId).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(PROJECT_STORE_KEY) ?? "{}").activeProjectId).toBeNull();
  });

  it("subscribes to same-tab and cross-tab updates and cleans up", () => {
    const listener = vi.fn();
    const unsubscribe = projectRepository.subscribe(listener);
    window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
    window.dispatchEvent(new StorageEvent("storage", { key: PROJECT_STORE_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    window.dispatchEvent(new CustomEvent(PROJECT_STORE_EVENT));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("resets the persisted snapshot and notifies subscribers", () => {
    window.localStorage.setItem(PROJECT_STORE_KEY, "{}");
    const listener = vi.fn();
    const unsubscribe = projectRepository.subscribe(listener);
    projectRepository.reset();
    expect(window.localStorage.getItem(PROJECT_STORE_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
