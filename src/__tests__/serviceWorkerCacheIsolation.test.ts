import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const match = vi.fn().mockResolvedValue(new Response("previous workspace"));
  const remove = vi.fn().mockResolvedValue(true);
  const fetch = vi.fn().mockRejectedValue(new Error("offline"));
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL, Response, console, fetch,
    self: {
      location: { origin: "https://wingman.test" },
      addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
      clients: { claim: vi.fn() }, skipWaiting: vi.fn(),
    },
    caches: {
      match, delete: remove,
      keys: vi.fn().mockResolvedValue(["other-app-cache", "wingman-data-old"]),
    },
  });
  return { handlers, match, remove, fetch };
}

describe("service worker account isolation", () => {
  it.each(["/api/wingman/auth/session", "/api/wingman/projects", "/api/product-intelligence"])(
    "never serves an old workspace response for %s", (path) => {
      const runtime = worker();
      const respondWith = vi.fn();
      runtime.handlers.get("fetch")!({ request: new Request(`https://wingman.test${path}`), respondWith });
      expect(respondWith).not.toHaveBeenCalled();
      expect(runtime.match).not.toHaveBeenCalled();
    },
  );

  it("preserves cached public product data offline", async () => {
    const runtime = worker();
    let response!: Promise<Response>;
    runtime.handlers.get("fetch")!({
      request: new Request("https://wingman.test/product-intelligence-summary.json"),
      respondWith: (value: Promise<Response>) => { response = value; },
    });
    expect(await (await response).text()).toBe("previous workspace");
    expect(runtime.fetch).not.toHaveBeenCalled();
  });

  it("does not intercept third-party assets", () => {
    const runtime = worker();
    const respondWith = vi.fn();
    runtime.handlers.get("fetch")!({ request: new Request("https://other.test/private.json"), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it("clears old Wingman caches without deleting another application's cache", async () => {
    const runtime = worker();
    let activation!: Promise<unknown>;
    runtime.handlers.get("activate")!({ waitUntil: (value: Promise<unknown>) => { activation = value; } });
    await activation;
    expect(runtime.remove.mock.calls).toEqual([["wingman-data-old"]]);
  });
});
