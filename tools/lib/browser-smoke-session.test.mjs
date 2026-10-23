// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { runBrowserSmokeSession } from "./browser-smoke-session.mjs";

const directories = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) {
    if (path.dirname(directory) !== path.resolve(os.tmpdir())) throw new Error("Unexpected test directory");
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function setup() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wingman-browser-session-"));
  directories.push(dataDir);
  vi.spyOn(console, "error").mockImplementation(() => {});
  const page = {
    screenshot: vi.fn(async () => {}), content: vi.fn(async () => "<html>sign-in</html>"),
    url: () => "http://localhost/wingman/settings",
  };
  const context = {
    newPage: vi.fn(async () => page),
    tracing: { start: vi.fn(async () => {}), stop: vi.fn(async options => {
      if (options?.path) fs.writeFileSync(options.path, "test trace");
    }) },
  };
  const browser = { newContext: vi.fn(async () => context), close: vi.fn(async () => {}) };
  const signIn = vi.fn(async () => {});
  const walkDiscovery = vi.fn(async () => {});
  const runCompare = vi.fn(async () => {});
  return { dataDir, browser, context, page, signIn, walkDiscovery, runCompare };
}

it.each(["context", "page"])("closes the browser when %s creation fails", async stage => {
  const fixture = setup();
  const error = new Error(`${stage} creation failed`);
  (stage === "context" ? fixture.browser.newContext : fixture.context.newPage).mockRejectedValue(error);
  await expect(runBrowserSmokeSession(fixture)).rejects.toBe(error);
  expect(fixture.browser.close).toHaveBeenCalledOnce();
  expect(fixture.signIn).not.toHaveBeenCalled();
  expect(fixture.page.screenshot).not.toHaveBeenCalled();
  expect(fs.readFileSync(path.join(fixture.dataDir, "diagnostics/failure.txt"), "utf8")).toContain(error.message);
});

it("starts tracing before sign-in and retains its trace when authentication fails", async () => {
  const fixture = setup();
  const error = new Error("authentication failed");
  fixture.signIn.mockImplementation(async () => {
    expect(fixture.context.tracing.start).toHaveBeenCalledOnce();
    throw error;
  });
  await expect(runBrowserSmokeSession(fixture)).rejects.toBe(error);
  expect(fixture.context.tracing.stop).toHaveBeenCalledWith({ path: path.join(fixture.dataDir, "diagnostics/trace.zip") });
  expect(fs.existsSync(path.join(fixture.dataDir, "diagnostics/trace.zip"))).toBe(true);
  expect(fixture.walkDiscovery).not.toHaveBeenCalled();
  expect(fixture.browser.close).toHaveBeenCalledOnce();
});

it("preserves the workflow error and trace even when page diagnostics fail", async () => {
  const fixture = setup();
  const error = new Error("sign-in failed");
  fixture.signIn.mockRejectedValue(error);
  fixture.page.screenshot.mockRejectedValue(new Error("page closed"));
  fixture.page.content.mockRejectedValue(new Error("page closed"));
  await expect(runBrowserSmokeSession(fixture)).rejects.toBe(error);
  expect(fs.readFileSync(path.join(fixture.dataDir, "diagnostics/failure.txt"), "utf8")).toContain("page closed");
  expect(fs.existsSync(path.join(fixture.dataDir, "diagnostics/trace.zip"))).toBe(true);
  expect(fixture.browser.close).toHaveBeenCalledOnce();
});

it("runs the browser flows and closes the browser after success", async () => {
  const fixture = setup();
  await runBrowserSmokeSession(fixture);
  expect(fixture.signIn).toHaveBeenCalledWith(fixture.page);
  expect(fixture.walkDiscovery).toHaveBeenCalledWith(fixture.page);
  expect(fixture.runCompare).toHaveBeenCalledWith(fixture.page);
  expect(fixture.context.tracing.stop).toHaveBeenCalledOnce();
  expect(fixture.browser.close).toHaveBeenCalledOnce();
  expect(fs.existsSync(path.join(fixture.dataDir, "diagnostics"))).toBe(false);
});
