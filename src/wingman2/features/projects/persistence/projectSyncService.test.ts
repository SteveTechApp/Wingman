import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectStoreSnapshot, StoredProject } from "../model/projectTypes";
import type { ProjectRepository } from "./projectRepository";
import { createProjectSyncService } from "./projectSyncService";

const NOW = "2026-09-11T12:00:00.000Z";

function project(overrides: Partial<StoredProject> = {}): StoredProject {
  return {
    id: "project-1",
    name: "Project one",
    owner: "Owner",
    stage: "Discovery",
    status: "alternative",
    updated: "Now",
    resumeTo: "/wingman/discovery",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function snapshot(projects: StoredProject[] = []): ProjectStoreSnapshot {
  return { projects, proposalDrafts: [], activeProjectId: projects[0]?.id ?? null };
}

function memoryRepository(initial: ProjectStoreSnapshot): ProjectRepository & { current: ProjectStoreSnapshot } {
  return {
    current: initial,
    read() { return this.current; },
    write(next) { this.current = next; return next; },
    subscribe() { return () => undefined; },
    reset() { this.current = snapshot(); },
  };
}

describe("projectSyncService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps disabled sync local and never schedules a request", async () => {
    const repository = memoryRepository(snapshot());
    const fetchImpl = vi.fn();
    const service = createProjectSyncService({ repository, backendEnabled: false, fetchImpl: fetchImpl as unknown as typeof fetch, now: () => NOW, debounceMs: 10 });
    service.schedule(snapshot([project()]), snapshot());
    await vi.runAllTimersAsync();
    expect(service.storageMode()).toEqual({ kind: "local", reason: "sync-disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("discovers stored authentication and debounces writes without changing the payload", async () => {
    window.sessionStorage.setItem("wingman.projectSyncToken", "token-1");
    const previous = snapshot([project({ syncRevision: 2 })]);
    const repository = memoryRepository(previous);
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ project: { ...project({ name: "Latest", syncRevision: 3 }), customer: "Owner" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const service = createProjectSyncService({ repository, backendEnabled: true, fetchImpl: fetchImpl as unknown as typeof fetch, now: () => NOW, debounceMs: 10 });
    service.schedule(snapshot([project({ name: "First", syncRevision: 2 })]), previous);
    service.schedule(snapshot([project({ name: "Latest", syncRevision: 2 })]), previous);
    await vi.runAllTimersAsync();
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/wingman/projects/project-1");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-1");
    expect(JSON.parse(String(init.body))).toMatchObject({ id: "project-1", name: "Latest", customer: "Owner", baseRevision: 2 });
  });

  it("preserves newer local lanes and reports a hydration conflict", async () => {
    const local = project({
      syncRevision: 1,
      discoveryBrief: { roomModel: { customer: "Local" }, savedAt: "2026-09-11T12:00:00.000Z" },
    });
    const backend = project({
      syncRevision: 2,
      discoveryBrief: { roomModel: { customer: "Backend" }, savedAt: "2026-09-11T11:00:00.000Z" },
    });
    const repository = memoryRepository(snapshot([local]));
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ projects: [backend] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const service = createProjectSyncService({ repository, backendEnabled: true, fetchImpl: fetchImpl as unknown as typeof fetch, now: () => NOW });
    await service.hydrate();
    expect(repository.current.projects[0].discoveryBrief?.roomModel?.customer).toBe("Local");
    expect(repository.current.syncStatus?.state).toBe("conflict");
  });

  it("hydrates once per session and can be reset for a later session", async () => {
    const repository = memoryRepository(snapshot());
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ projects: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const service = createProjectSyncService({ repository, backendEnabled: true, fetchImpl: fetchImpl as unknown as typeof fetch, now: () => NOW });
    await Promise.all([service.hydrate(), service.hydrate()]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    service.resetSession();
    await service.hydrate();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
