/**
 * Dev-pair smoke: sign in to the local development workspace and read the
 * Projects chip.
 *
 * `npm run check:dev-pair` proves the pair is up (API, proxy, compiled CSS).
 * That leaves the thing a rep actually needs unproven: whether signing in to
 * the local workspace put project sync on the server. The chip under the
 * project filter answers it — it reports `synced` only after
 * `projectSyncService` has reached the workspace backend, and it prints the
 * same sentence a rep reads.
 *
 * The run makes that sign-in twice. First with the legacy store cleared, which
 * is what a rep's second machine starts from: the projects have to arrive from
 * the workspace. Then over the starter examples the page seeds when it loads —
 * demo data the browser has only ever held as sample text — which must take the
 * workspace copy instead of being reported as a team member's edit. That second
 * pass fails the moment the chip prints the conflict sentence, because a
 * conflict over demo data is exactly what a rep on a second machine must never
 * see.
 *
 * The run attaches to a pair that is already serving (`npm run dev`) instead of
 * starting one, so it measures the environment the rep is working in. It drives
 * the real Settings → Workspace control (`workspace-local-dev-sign-in`, which
 * the page renders only under `import.meta.env.DEV`) in a throwaway browser
 * context: that context's session and its workspace-scoped project cache go
 * with it, so a check never signs the developer's own browser in.
 *
 * Run: npm run check:dev-pair-sync  (UI 3000 / API 8787 unless overridden by
 * WINGMAN_UI_BASE / WINGMAN_API_BASE).
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { checkDevPairHealth } from "./check-dev-pair-health.mjs";

export const DEFAULT_UI_BASE = "http://127.0.0.1:3000";
export const DEFAULT_API_BASE = "http://127.0.0.1:8787";

/** The tone `projectSyncStatusVariant` gives a `synced` store. */
export const SYNCED_CHIP_CLASS = "wm-status-success";

/**
 * Both sentences `projectSyncService` writes once it has reached the workspace
 * backend — "Project data was loaded from the workspace backend." after a
 * hydrate and "Project changes are synced to the workspace backend." after a
 * push. The local-only messages never say it, so one phrase covers each way a
 * synced store can report itself; "Saving project changes to the workspace
 * backend..." says it too, which is why the tone below has to agree.
 */
export const SYNCED_CHIP_PHRASE = /workspace backend/i;

/**
 * The sentence `syncConflictStatusMessage` writes when the server reports lanes
 * a team member changed — one project or several, both start the same way.
 * Nothing else the chip says begins like that, so one phrase covers it.
 */
export const CONFLICT_CHIP_PHRASE = /A team member changed/i;

/**
 * Whether the chip is reporting a sync conflict, whatever else it says.
 *
 * A conflict means the store chose one copy over another and is asking a rep
 * which to keep. For demo data the browser only ever held as a sample that
 * question has no answer, so the check treats the sentence itself as the
 * failure rather than waiting to see what comes next.
 */
export function conflictedWorkspaceChip(chip) {
  const text = String(chip?.text ?? "").replace(/\s+/g, " ").trim();
  return { conflicted: Boolean(text) && CONFLICT_CHIP_PHRASE.test(text), text };
}

/**
 * Whether the chip a rep is looking at reports a synced workspace.
 *
 * The words carry the claim and the tone has to match it: a success-coloured
 * chip is not enough (the checked-out page still reads the local message), and
 * neither is the phrase on its own (the chip says it while it is still syncing).
 */
export function syncedWorkspaceChip(chip) {
  const className = String(chip?.className ?? "");
  const text = String(chip?.text ?? "").replace(/\s+/g, " ").trim();

  if (!text) {
    return { synced: false, text, reason: "the Projects page has no sync chip" };
  }
  if (!SYNCED_CHIP_PHRASE.test(text)) {
    return { synced: false, text, reason: `the Projects chip reads "${text}"` };
  }
  if (!className.split(/\s+/).includes(SYNCED_CHIP_CLASS)) {
    return { synced: false, text, reason: `the Projects chip reads "${text}" but is not wearing the synced tone` };
  }
  return { synced: true, text };
}

/**
 * Poll the chip until it reports the backend, so a hydrate that is still in
 * flight is waited for rather than read as a failure. `readChip` returns the
 * chip's `{ className, text }`, or null while the page has not drawn it.
 */
export async function waitForSyncedChip(readChip, {
  timeoutMs = 30_000,
  intervalMs = 250,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const deadline = now() + timeoutMs;
  let last = { synced: false, text: "", reason: "the Projects page has no sync chip" };

  for (;;) {
    const chip = await readChip();
    const conflict = conflictedWorkspaceChip(chip);
    if (conflict.conflicted) {
      throw new Error(
        `[dev-pair-sync] The Projects chip reported a team member's change instead of a synced workspace: "${conflict.text}". ` +
        "A starter example the browser only ever held as sample text was compared as an edit, so either " +
        "`isUntouchedStarterExample` stopped matching the workspace copy or the page-load stamp outranked it.",
      );
    }
    if (chip) last = syncedWorkspaceChip(chip);
    if (last.synced) return last;

    if (now() >= deadline) {
      throw new Error(
        `[dev-pair-sync] The Projects chip never reported a synced workspace: ${last.reason}. ` +
        "Signing in to the local dev workspace is what puts the store on the backend, so this is either a session the API did not keep or project sync left in local mode.",
      );
    }

    await sleep(intervalMs);
  }
}

/** The chip under the project filter, or null before the page has drawn it. */
async function readProjectsChip(page) {
  const chip = page.locator(".wm-projects-store-toolbar .wm-status-chip");
  if ((await chip.count()) === 0) return null;

  try {
    const first = chip.first();
    return {
      className: (await first.getAttribute("class")) ?? "",
      text: await first.innerText(),
    };
  } catch {
    // Re-render swapped the chip between the count and the read; poll again.
    return null;
  }
}

/**
 * The legacy local store the sign-in migrates into the workspace scope. Kept in
 * step with `PROJECT_STORE_KEY` in
 * `src/wingman2/features/projects/persistence/projectRepository.ts`; a rename
 * only makes the clear below a no-op, and the run then reads the chip the
 * samples produced instead of passing quietly.
 */
export const PROJECT_STORE_KEY = "wingman-project-store-v1";

/** Settings → Workspace, the section the local sign-in lives in. */
async function openWorkspaceSection(page, uiBase) {
  await page.goto(`${uiBase}/wingman/profile`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByTestId("workflow-page-workspace").click();
  const section = page.locator('section[aria-labelledby="wingman-settings-workspace"]');
  await section.waitFor({ state: "visible", timeout: 15_000 });
  return section;
}

async function signInToDevelopmentWorkspace(page, uiBase, { clearLegacyStore = true } = {}) {
  const section = await openWorkspaceSection(page, uiBase);

  // A browser with no projects is what the first pass is about: the workspace
  // has to arrive from the server. Loading the app seeds the starter examples
  // into the legacy store the sign-in then migrates into the new workspace
  // scope, so that pass drops the one key here (never in the developer's
  // browser) and starts empty, which is also what a rep's second machine starts
  // from. The seeded pass keeps it, because those samples are its subject.
  if (clearLegacyStore) {
    await page.evaluate((key) => window.localStorage.removeItem(key), PROJECT_STORE_KEY);
  }

  const localSignIn = section.getByTestId("workspace-local-dev-sign-in");
  try {
    await localSignIn.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    throw new Error(
      `[dev-pair-sync] ${uiBase} does not offer "Use the local dev workspace". ` +
      "The control renders only under import.meta.env.DEV, so point this check at the Vite dev server (npm run dev) rather than a preview or production build.",
    );
  }

  await localSignIn.click();

  try {
    await section.getByTestId("workspace-signed-in").waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    throw new Error(
      "[dev-pair-sync] The local dev sign-in did not produce a signed-in workspace. " +
      "The dev-session route only answers a development process with file storage from this machine, so check the API's log and its data/runtime store.",
    );
  }
}

async function assertSessionCookie(context, uiBase) {
  const cookies = await context.cookies(`${uiBase}/`);
  if (!cookies.some((cookie) => cookie.name === "wingman_session")) {
    throw new Error(
      "[dev-pair-sync] The UI reports a signed-in workspace but no wingman_session cookie reached the UI origin, " +
      "so project sync has no session to send. Check that the UI is proxying /api to the API server.",
    );
  }
}

/** How many projects the seeded legacy store holds, or 0 when it holds none. */
async function seededSampleCount(page) {
  return page.evaluate((key) => {
    try {
      const store = JSON.parse(window.localStorage.getItem(key) || "null");
      return Array.isArray(store?.projects) ? store.projects.length : 0;
    } catch {
      return 0;
    }
  }, PROJECT_STORE_KEY);
}

/**
 * One sign-in in its own throwaway context: open the Projects page, sign in,
 * and read the chip it ends on. `overSeededExamples` keeps the starter examples
 * the page seeded and refuses to run when there are none — signing in over an
 * empty store would prove nothing about demo data.
 */
async function signInPass(browser, { uiBase, timeoutMs, overSeededExamples }) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });

  try {
    const page = await context.newPage();
    let samples = 0;

    if (overSeededExamples) {
      await page.goto(`${uiBase}/wingman/projects`, { waitUntil: "networkidle", timeout: 60_000 });
      samples = await seededSampleCount(page);
      if (!samples) {
        throw new Error(
          "[dev-pair-sync] The page seeded no starter examples into the legacy store, so signing in over them would prove nothing. " +
          `Either that key already held projects, or the sample seeding did not run: check ${PROJECT_STORE_KEY} in a fresh browser context.`,
        );
      }
    }

    await signInToDevelopmentWorkspace(page, uiBase, { clearLegacyStore: !overSeededExamples });
    await assertSessionCookie(context, uiBase);

    await page.goto(`${uiBase}/wingman/projects`, { waitUntil: "networkidle", timeout: 60_000 });
    return { chip: await waitForSyncedChip(() => readProjectsChip(page), { timeoutMs }), samples };
  } finally {
    await context.close().catch(() => undefined);
  }
}

/**
 * Sign in to the local dev workspace on a running pair, once with no local
 * projects and once over the seeded starter examples, and return the chip each
 * pass ends on. `launch` is injectable so a caller can hand in a different
 * browser.
 */
export async function checkDevPairSync({
  uiBase = DEFAULT_UI_BASE,
  apiBase = DEFAULT_API_BASE,
  browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
  launch = (options) => chromium.launch(options),
  timeoutMs = 30_000,
} = {}) {
  try {
    await checkDevPairHealth(uiBase, apiBase);
  } catch (error) {
    throw new Error(
      `[dev-pair-sync] The dev pair is not answering (${uiBase} and ${apiBase}): ${error.message}. ` +
      "Start it with npm run dev, which serves both on those ports.",
    );
  }

  const browser = await launch({ headless: true, channel: browserChannel });

  try {
    const emptyScope = await signInPass(browser, { uiBase, timeoutMs, overSeededExamples: false });
    const seededScope = await signInPass(browser, { uiBase, timeoutMs, overSeededExamples: true });
    return { emptyScope, seededScope };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  checkDevPairSync({
    uiBase: process.env.WINGMAN_UI_BASE || DEFAULT_UI_BASE,
    apiBase: process.env.WINGMAN_API_BASE || DEFAULT_API_BASE,
  })
    .then(({ emptyScope, seededScope }) => {
      console.log(`[dev-pair-sync] Signed in with no local projects; the Projects chip reads "${emptyScope.chip.text}".`);
      console.log(
        `[dev-pair-sync] Signed in over ${seededScope.samples} seeded starter examples; the Projects chip reads ` +
        `"${seededScope.chip.text}" and never reported a conflict.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
