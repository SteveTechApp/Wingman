// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

const { spawnSync } = vi.hoisted(() => ({ spawnSync: vi.fn(() => ({ status: 0 })) }));
vi.mock("node:child_process", () => ({ spawnSync, default: { spawnSync } }));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it.each([["3100", "8788"], ["3200", "8890"]])("uses the same ports for Compose and health probes (%s/%s)", async (ui, api) => {
  vi.resetModules();
  vi.stubEnv("WINGMAN_UI_PORT", ui);
  vi.stubEnv("WINGMAN_API_PORT", api);
  const fetch = vi.fn(async () => new Response("ok", { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  await import("./docker-standup.mjs");
  const up = spawnSync.mock.calls.find(([, args]) => args.includes("up"));
  expect(up[1].slice(0, 2)).toEqual(["compose", "-f"]);
  expect(up[1][2].replaceAll("\\", "/")).toMatch(/\/docker-compose\.yml$/);
  expect(up[2].env).toMatchObject({ WINGMAN_UI_PORT: ui, WINGMAN_API_PORT: api });
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    `http://127.0.0.1:${api}/api/ready`,
    `http://127.0.0.1:${ui}/`,
    `http://127.0.0.1:${ui}/api/ready`,
  ]);
});
