import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectEdits, setCableLength } from "./siteSurveyStorage";
import {
  getSurveyConflict,
  getSyncStatus,
  pushEditsToBackend,
  resolveSurveyConflict,
} from "./siteSurveySync";

describe("site survey reconnect", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("preserves offline edits without attempting an upload", async () => {
    setCableLength("project-offline", "cable-1", 18);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(pushEditsToBackend("project-offline")).resolves.toEqual({
      outcome: "error",
      error: "offline",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getProjectEdits("project-offline").cableEdits["cable-1"].actualLengthMetres).toBe(18);
  });

  it("suppresses the echo re-push when an adoption save lands", async () => {
    setCableLength("project-echo", "cable-1", 21);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      outcome: "conflict",
      error: "server revision is newer",
      serverTimestamp: "2026-09-10T13:00:00.000Z",
      edits: {
        projectId: "project-echo",
        cableEdits: { "cable-1": { cableId: "cable-1", actualLengthMetres: 18, confirmed: true } },
        deviceEdits: {},
        locationEdits: {},
      },
    }), { status: 409, headers: { "content-type": "application/json" } })));
    expect((await pushEditsToBackend("project-echo")).outcome).toBe("conflict");

    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      outcome: "synced",
      serverTimestamp: "2026-09-10T13:30:00.000Z",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(resolveSurveyConflict("project-echo", "keep-server")).resolves.toMatchObject({ outcome: "synced" });
    // Adoption is a local re-save of the server's own copy: nothing to push.
    // Waiting past the 1s debounce proves the adoption echo schedules no
    // re-push — previously it minted a phantom revision on the server.
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getProjectEdits("project-echo").cableEdits["cable-1"].actualLengthMetres).toBe(18);
    expect(getProjectEdits("project-echo").synced).toBe(true);
  });

  it("returns error and preserves local data after a failed upload", async () => {
    setCableLength("project-failure", "cable-1", 19);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    expect((await pushEditsToBackend("project-failure")).outcome).toBe("error");
    expect(getProjectEdits("project-failure").cableEdits["cable-1"].actualLengthMetres).toBe(19);
  });

  it("reports a server-newer conflict without replacing local edits", async () => {
    setCableLength("project-conflict", "cable-1", 21);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      outcome: "conflict",
      error: "server revision is newer",
      serverTimestamp: "2026-09-10T13:00:00.000Z",
      edits: {
        projectId: "project-conflict",
        cableEdits: { "cable-1": { cableId: "cable-1", actualLengthMetres: 18, confirmed: true } },
        deviceEdits: {},
        locationEdits: {},
      },
    }), { status: 409, headers: { "content-type": "application/json" } })));

    expect((await pushEditsToBackend("project-conflict")).outcome).toBe("conflict");
    expect(getProjectEdits("project-conflict").cableEdits["cable-1"].actualLengthMetres).toBe(21);
    expect(getSyncStatus().message).toContain("local changes were preserved");
    expect(getSyncStatus().pendingChanges).toBe(1);
  });

  it("captures the server copy on conflict and resolves by keeping it", async () => {
    setCableLength("project-resolve-server", "cable-1", 21);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      outcome: "conflict",
      error: "server revision is newer",
      serverTimestamp: "2026-09-10T13:00:00.000Z",
      edits: {
        projectId: "project-resolve-server",
        cableEdits: { "cable-1": { cableId: "cable-1", actualLengthMetres: 18, confirmed: true } },
        deviceEdits: {},
        locationEdits: {},
      },
    }), { status: 409, headers: { "content-type": "application/json" } })));

    expect((await pushEditsToBackend("project-resolve-server")).outcome).toBe("conflict");
    expect(getSurveyConflict()).toMatchObject({
      projectId: "project-resolve-server",
      serverTimestamp: "2026-09-10T13:00:00.000Z",
    });
    expect(getSurveyConflict()?.serverEdits?.cableEdits["cable-1"].actualLengthMetres).toBe(18);

    const resolveMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      outcome: "synced",
      serverTimestamp: "2026-09-10T13:30:00.000Z",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", resolveMock);

    await expect(resolveSurveyConflict("project-resolve-server", "keep-server")).resolves.toMatchObject({
      outcome: "synced",
    });
    expect(resolveMock).not.toHaveBeenCalled();
    expect(getProjectEdits("project-resolve-server").cableEdits["cable-1"].actualLengthMetres).toBe(18);
    expect(getProjectEdits("project-resolve-server")).toMatchObject({
      synced: true,
      serverTimestamp: "2026-09-10T13:00:00.000Z",
    });
    expect(getSurveyConflict()).toBeNull();
    expect(getSyncStatus().message).toContain("resolved");
  });

  it("resolves by keeping local edits and pushing them after re-basing", async () => {
    setCableLength("project-resolve-local", "cable-1", 21);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      outcome: "conflict",
      error: "server revision is newer",
      serverTimestamp: "2026-09-10T13:00:00.000Z",
    }), { status: 409, headers: { "content-type": "application/json" } })));

    expect((await pushEditsToBackend("project-resolve-local")).outcome).toBe("conflict");
    expect(getProjectEdits("project-resolve-local").serverTimestamp).toBeUndefined();

    const pushMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      outcome: "synced",
      serverTimestamp: "2026-09-10T13:30:00.000Z",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", pushMock);

    await expect(resolveSurveyConflict("project-resolve-local", "keep-local")).resolves.toMatchObject({
      outcome: "synced",
      serverTimestamp: "2026-09-10T13:30:00.000Z",
    });
    expect(pushMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(pushMock.mock.calls[0][1].body));
    expect(body.baseServerTimestamp).toBe("2026-09-10T13:00:00.000Z");
    expect(body.edits.cableEdits["cable-1"].actualLengthMetres).toBe(21);
    expect(getProjectEdits("project-resolve-local")).toMatchObject({
      synced: true,
      serverTimestamp: "2026-09-10T13:30:00.000Z",
    });
    expect(getSurveyConflict()).toBeNull();
  });

  it("reports an error when resolving without a conflict to resolve", async () => {
    await expect(resolveSurveyConflict("project-no-conflict", "keep-local")).resolves.toMatchObject({
      outcome: "error",
      error: "no-conflict",
    });
  });

  it("replays the same acknowledged edit idempotently", async () => {
    setCableLength("project-replay", "cable-1", 24);
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      ok: true,
      outcome: "synced",
      serverTimestamp: "2026-09-10T14:00:00.000Z",
    }), { status: 200, headers: { "content-type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);

    expect((await pushEditsToBackend("project-replay")).outcome).toBe("synced");
    expect((await pushEditsToBackend("project-replay")).outcome).toBe("synced");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getProjectEdits("project-replay")).toMatchObject({
      synced: true,
      serverTimestamp: "2026-09-10T14:00:00.000Z",
    });
  });

  it("does not let a late acknowledgement erase an edit made during upload", async () => {
    setCableLength("project-race", "cable-1", 10);
    let release!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { release = resolve; })));

    const upload = pushEditsToBackend("project-race");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    setCableLength("project-race", "cable-1", 25);
    release(new Response(JSON.stringify({
      ok: true,
      outcome: "synced",
      serverTimestamp: "2026-09-10T15:00:00.000Z",
    }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(upload).resolves.toMatchObject({ outcome: "error", error: "newer-local-edit" });
    expect(getProjectEdits("project-race")).toMatchObject({ synced: false });
    expect(getProjectEdits("project-race").cableEdits["cable-1"].actualLengthMetres).toBe(25);
  });
});
