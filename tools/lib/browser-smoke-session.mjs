import fs from "node:fs";
import path from "node:path";

/** Own every operation after browser launch, including partial setup failures. */
export async function runBrowserSmokeSession({ browser, dataDir, signIn, walkDiscovery, runCompare }) {
  let context;
  let page;
  let tracing = false;
  try {
    context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    page = await context.newPage();
    await context.tracing.start({ screenshots: true, snapshots: true });
    tracing = true;
    // Sign-in uses the real settings form and proxy; no session is injected.
    await signIn(page);
    await walkDiscovery(page);
    await runCompare(page);
    await context.tracing.stop();
    tracing = false;
  } catch (error) {
    const diagnostics = path.join(dataDir, "diagnostics");
    try {
      fs.mkdirSync(diagnostics, { recursive: true });
      const capture = fn => Promise.resolve().then(fn);
      const captures = await Promise.allSettled([
        ...(page ? [
          capture(() => page.screenshot({ path: path.join(diagnostics, "failure.png"), fullPage: true, timeout: 10_000 })),
          capture(async () => fs.writeFileSync(path.join(diagnostics, "failure.html"), await page.content())),
        ] : []),
        ...(tracing ? [capture(() => context.tracing.stop({ path: path.join(diagnostics, "trace.zip") }))] : []),
      ]);
      fs.writeFileSync(path.join(diagnostics, "failure.txt"), [
        page ? page.url() : "Browser setup did not create a page.",
        error instanceof Error ? error.stack : String(error),
        ...captures.filter(result => result.status === "rejected").map(result => String(result.reason)),
      ].join("\n"));
      console.error(`[e2e-smoke] Browser diagnostics saved to ${diagnostics}.`);
    } catch (diagnosticError) {
      console.error(`[e2e-smoke] Diagnostic capture failed: ${diagnosticError.message}`);
    }
    throw error;
  } finally {
    await browser.close().catch(() => {});
  }
}
