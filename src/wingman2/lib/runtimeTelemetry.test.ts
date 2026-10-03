import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportRuntimeEvent, resetRuntimeTelemetryForTests } from "./runtimeTelemetry";

describe("runtime telemetry reporting", () => {
  beforeEach(() => {
    resetRuntimeTelemetryForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts a runtime error to the telemetry endpoint", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    reportRuntimeEvent({ kind: "error", message: "Boom", stack: "at thing" });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/wingman/telemetry");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");

    const body = JSON.parse(init.body);
    expect(body.kind).toBe("error");
    expect(body.message).toBe("Boom");
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it("never throws when the network call rejects", () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    // A telemetry failure must not surface into the caller - the caller is
    // usually an error handler that is already recovering from a crash.
    expect(() => reportRuntimeEvent({ kind: "error", message: "Boom" })).not.toThrow();
  });

  it("never throws when fetch itself is unavailable", () => {
    vi.stubGlobal("fetch", undefined);

    expect(() => reportRuntimeEvent({ kind: "error", message: "Boom" })).not.toThrow();
  });

  it("suppresses duplicate events so a crash loop cannot flood the backend", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    for (let index = 0; index < 10; index += 1) {
      reportRuntimeEvent({ kind: "error", message: "Same failure", line: 12, column: 5 });
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps the number of events sent per session", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    for (let index = 0; index < 60; index += 1) {
      reportRuntimeEvent({ kind: "error", message: `Distinct failure ${index}` });
    }

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(25);
  });

  it("defaults the route to the current pathname", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    reportRuntimeEvent({ kind: "info", message: "Something happened" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.route).toBe(window.location.pathname);
  });
});
