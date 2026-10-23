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

it("persists migrated wall ownership on read and does not restore explicitly cleared owners", () => {
  localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify({ projects: [{ id: "owner", name: "Room", videowall: { wallType: "lcd", summary: {}, savedAt: "2026-10-20" } }], proposalDrafts: [] }));
  const first = projectRepository.read();
  const timestamp = first.projects[0].videowall?.ownershipMigratedAt;
  expect(timestamp).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(PROJECT_STORE_KEY)!).projects[0].videowall.ownershipMigratedAt).toBe(timestamp);
  expect(projectRepository.read().projects[0].videowall?.ownershipMigratedAt).toBe(timestamp);
  first.projects[0].videowall = { ...first.projects[0].videowall!, projectId: undefined, ownershipCleared: true };
  projectRepository.write(first);
  expect(projectRepository.read().projects[0].videowall?.projectId).toBeUndefined();
});
