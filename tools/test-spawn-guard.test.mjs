import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("node:child_process", () => { const mock = { execFileSync: vi.fn(), spawnSync: vi.fn() }; return { ...mock, default: mock }; });
import { execFileSync, spawnSync } from "node:child_process";
import { runTool, runToolBare, runToolEvented } from "./test-spawn-guard.mjs";

afterEach(() => vi.resetAllMocks());
describe("single transient-spawn retry", () => {
  it("retries once, including under concurrent calls", async () => {
    await Promise.all(Array.from({ length: 8 }, async () => {
      let calls = 0;
      const result = await runToolEvented(settle => {
        const child = new EventEmitter();
        const attempt = ++calls;
        queueMicrotask(() => {
          if (attempt === 1) child.emit("error", { code: "EAGAIN" });
          settle({ code: attempt === 1 ? -1 : 0 });
          child.emit("close", attempt === 1 ? -1 : 0);
        });
        return child;
      }, "rehearsal");
      expect(result.code).toBe(0);
      expect(calls).toBe(2);
    }));
  });
  it("stops after the second spawn failure", async () => {
    let calls = 0;
    await expect(runToolEvented(() => {
      calls++;
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("error", Object.assign(new Error("pressure"), { code: "EAGAIN" })));
      return child;
    }, "rehearsal")).rejects.toThrow("pressure");
    expect(calls).toBe(2);
  });
  it("retries sync registration failure exactly once", () => {
    execFileSync.mockImplementationOnce(() => { throw Object.assign(new Error(), { code: "EMFILE" }); }).mockReturnValueOnce("ok");
    expect(runTool("node", [], "test", {})).toBe("ok");
    expect(execFileSync).toHaveBeenCalledTimes(2);
    spawnSync.mockReturnValueOnce({ error: { code: "ENOMEM" }, status: null }).mockReturnValueOnce({ status: 0 });
    expect(runToolBare("node", [], "test", {}).status).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(2);
  });
  it("does not retry a child exit or signal", () => {
    for (const extra of [{ status: 1 }, { signal: "SIGTERM" }]) {
      execFileSync.mockClear();
      execFileSync.mockImplementation(() => { throw Object.assign(new Error("child failed"), { code: "EIO", ...extra }); });
      expect(() => runTool("node", [], "test", {})).toThrow("child failed");
      expect(execFileSync).toHaveBeenCalledTimes(1);
    }
  });
});
