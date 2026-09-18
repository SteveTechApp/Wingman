import { describe, expect, it, vi } from "vitest";
import type { StoredProject } from "../model/projectTypes";
import { createMemoryProjectCacheAdapter, createProjectCache, LEGACY_PROJECT_STORE_KEY, PROJECT_CACHE_MIGRATION_KEY } from "./projectCache";

const project = (id: string): StoredProject => ({ id, name: id, owner: "Owner", stage: "Discovery", status: "alternative", updated: "Now", resumeTo: "/", createdAt: "2026-09-17T00:00:00Z", updatedAt: "2026-09-17T00:00:00Z" });

describe("ProjectCache", () => {
  it("isolates projects by workspace and user", async () => {
    const adapter = createMemoryProjectCacheAdapter();
    const first = createProjectCache({ workspaceId: "a", userId: "one" }, adapter);
    const second = createProjectCache({ workspaceId: "b", userId: "one" }, adapter);
    await first.writeProject(project("p1"));
    expect(await first.readProject("p1")).toBeDefined();
    expect(await second.readProject("p1")).toBeUndefined();
  });

  it("migrates the legacy snapshot exactly once", async () => {
    const adapter = createMemoryProjectCacheAdapter();
    const cache = createProjectCache({ workspaceId: "w", userId: "u" }, adapter);
    localStorage.clear();
    localStorage.setItem(LEGACY_PROJECT_STORE_KEY, JSON.stringify({ projects: [project("legacy")], proposalDrafts: [], activeProjectId: "legacy" }));
    expect(await cache.migrateLegacySnapshot()).toBe(true);
    expect(await cache.migrateLegacySnapshot()).toBe(false);
    expect((await cache.readProject("legacy"))?.id).toBe("legacy");
    expect(localStorage.getItem(`${PROJECT_CACHE_MIGRATION_KEY}:workspace:w:user:u`)).toBe("complete");
  });

  it("surfaces quota failures without marking migration complete", async () => {
    const adapter = createMemoryProjectCacheAdapter();
    adapter.set = vi.fn().mockRejectedValue(new DOMException("full", "QuotaExceededError"));
    const cache = createProjectCache({ workspaceId: "w", userId: "u" }, adapter);
    localStorage.clear();
    localStorage.setItem(LEGACY_PROJECT_STORE_KEY, JSON.stringify({ projects: [project("p")], proposalDrafts: [] }));
    await expect(cache.migrateLegacySnapshot()).rejects.toMatchObject({ name: "QuotaExceededError" });
    expect(localStorage.getItem(`${PROJECT_CACHE_MIGRATION_KEY}:workspace:w:user:u`)).toBeNull();
  });

  it("deletes one project without rewriting other project records", async () => {
    const adapter = createMemoryProjectCacheAdapter();
    const cache = createProjectCache({ workspaceId: "w", userId: "u" }, adapter);
    await cache.writeProject(project("one"));
    await cache.writeProject(project("two"));
    adapter.writes.length = 0;
    await cache.deleteProject("one");
    expect(adapter.writes.some((key) => key.endsWith("project:two"))).toBe(false);
    expect((await cache.readIndex()).projectIds).toEqual(["two"]);
  });

  it("notifies subscribers for writes and remote-style deletions", async () => {
    const cache = createProjectCache({ workspaceId: "w", userId: "u" }, createMemoryProjectCacheAdapter());
    const listener = vi.fn();
    cache.subscribe(listener);
    await cache.writeProject(project("p"));
    await cache.deleteProject("p");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
