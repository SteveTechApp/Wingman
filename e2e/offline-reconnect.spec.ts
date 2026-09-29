import { expect, test, type Page } from "@playwright/test";

const PROJECT_ID = "offline-reconnect-uat";
const STORAGE_KEY = "wingman-site-survey-edits";

async function injectHarness(page: Page) {
  await page.evaluate(async () => {
    const storage = await import("/src/wingman2/lib/siteSurveyStorage.ts");
    const sync = await import("/src/wingman2/lib/siteSurveySync.ts");
    (window as any).__surveyHarness = { storage, sync };
  });
}

async function openHarness(page: Page) {
  await page.goto("/wingman", { waitUntil: "networkidle" });
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await injectHarness(page);
}

async function authenticate(page: Page, mode: "signup" | "login", email = "offline-uat@example.com") {
  const password = "offline-uat-pass";
  const payload = mode === "signup"
    ? { name: "Offline UAT", company: "Reconnect Lab", email, password }
    : { email, password };
  const response = await page.context().request.post(`/api/wingman/auth/${mode}`, { data: payload });
  expect(response.status(), await response.text()).toBe(200);
  const setCookie = response.headers()["set-cookie"] ?? "";
  const token = /wingman_session=([^;]+)/.exec(setCookie)?.[1];
  expect(token, "authentication must issue a session cookie").toBeTruthy();
}

async function editAndSync(page: Page, length: number) {
  return page.evaluate(async ({ projectId, value }) => {
    const { storage, sync } = (window as any).__surveyHarness;
    storage.setCableLength(projectId, "route-a", value);
    storage.setCableConfirmed(projectId, "route-a", true);
    return sync.pushEditsToBackend(projectId);
  }, { projectId: PROJECT_ID, value: length });
}

/**
 * Seed the UAT project (its topology connection id must be "route-a" so the
 * stored cable edits bind to the rendered checklist row) and open the proposal
 * wizard far enough to render the real SiteSurveyChecklist UI.
 */
async function openChecklistPage(page: Page) {
  await page.evaluate(async () => {
    const projects = await import("/src/wingman2/data/projectStore.ts");
    const timestamp = new Date().toISOString();
    const candidate = {
      id: "offline-reconnect-uat", name: "Offline Reconnect UAT", owner: "UAT", stage: "Proposal Builder", status: "recommended",
      updated: "Just now", resumeTo: "/wingman/proposal", createdAt: timestamp, updatedAt: timestamp,
      discoveryBrief: { savedAt: timestamp, roomModel: { clientName: "Reconnect Lab", siteName: "UAT Site" }, topology: {
        schemaVersion: 1, mode: "advanced",
        locations: [{ id: "loc-1", name: "Table", type: "table" }, { id: "loc-2", name: "Display Wall", type: "display-wall" }],
        devices: [
          { id: "dev-1", name: "Laptop", category: "Source", locationId: "loc-1", quantity: 1, thirdParty: true, status: "confirmed" },
          { id: "dev-2", name: "Display", category: "Display", locationId: "loc-2", quantity: 1, thirdParty: true, status: "confirmed" },
        ],
        connections: [{ id: "route-a", fromDeviceId: "dev-1", toDeviceId: "dev-2", services: ["video"], transport: "hdmi", lengthMode: "estimated", lengthMetres: 12, estimateReason: "Confirm on site", status: "assumed" }],
        generatedFromDiscovery: true, createdAt: timestamp, updatedAt: timestamp,
      } },
    };
    projects.upsertStoredProject(candidate as any);
    projects.setActiveProjectId(candidate.id);
  });
  await page.goto("/wingman/proposal", { waitUntil: "networkidle" });
  // Navigation started a fresh document, so re-inject the storage/sync harness
  // for the post-resolution localStorage assertions below.
  await injectHarness(page);
  const checklist = page.getByRole("heading", { name: "Site Survey Checklist" });
  for (let step = 0; step < 6 && !(await checklist.isVisible().catch(() => false)); step += 1) {
    const next = page.getByRole("button", { name: /Continue|Next/i }).last();
    if (!(await next.isVisible().catch(() => false)) || !(await next.isEnabled())) break;
    await next.click();
  }
  await expect(checklist).toBeVisible();
}

async function apiSync(page: Page, projectId: string) {
  const edits = await page.evaluate(async (id) => (window as any).__surveyHarness.storage.getProjectEdits(id), projectId);
  const response = await page.context().request.post("/api/wingman/site-survey/sync", { data: {
    projectId, edits, clientTimestamp: new Date().toISOString(), baseServerTimestamp: edits.serverTimestamp,
  } });
  const body = await response.json();
  if (response.ok() && body.outcome === "synced") {
    await page.evaluate(({ localEdits, timestamp }) => {
      (window as any).__surveyHarness.storage.saveSyncedProjectEdits(localEdits, timestamp);
    }, { localEdits: edits, timestamp: body.serverTimestamp });
  }
  return { status: response.status(), ...body };
}

test("desktop and tablet preserve the offline edit when the server is newer", async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true });
  const desktopPage = await desktop.newPage();
  const tabletPage = await tablet.newPage();
  await openHarness(desktopPage);
  await openHarness(tabletPage);
  await authenticate(desktopPage, "signup");

  await desktopPage.evaluate(async (projectId) => {
    const { storage } = (window as any).__surveyHarness;
    storage.setCableLength(projectId, "route-a", 12);
    storage.setCableConfirmed(projectId, "route-a", true);
  }, PROJECT_ID);
  const first = await apiSync(desktopPage, PROJECT_ID);
  expect(first, JSON.stringify(first)).toMatchObject({ outcome: "synced" });
  await authenticate(tabletPage, "login");
  await tabletPage.evaluate(({ key, projectId, revision }) => {
    localStorage.setItem(key, JSON.stringify({ [projectId]: {
      projectId, cableEdits: {}, deviceEdits: {}, locationEdits: {},
      lastModified: "2026-09-10T12:00:00.000Z", synced: true, serverTimestamp: revision,
    } }));
  }, { key: STORAGE_KEY, projectId: PROJECT_ID, revision: first.serverTimestamp! });
  await tablet.setOffline(true);
  await expect(editAndSync(tabletPage, 42)).resolves.toMatchObject({ outcome: "error", error: "offline" });

  await authenticate(desktopPage, "login");
  await desktopPage.evaluate(async (projectId) => (window as any).__surveyHarness.storage.setCableLength(projectId, "route-a", 18), PROJECT_ID);
  expect(await apiSync(desktopPage, PROJECT_ID)).toMatchObject({ outcome: "synced" });
  await tablet.setOffline(false);
  await authenticate(tabletPage, "login");
  const conflict = await apiSync(tabletPage, PROJECT_ID);
  expect(conflict).toMatchObject({ outcome: "conflict" });
  const tabletLocal = await tabletPage.evaluate(async (projectId) => {
    const { storage } = (window as any).__surveyHarness;
    return storage.getProjectEdits(projectId);
  }, PROJECT_ID);
  expect(tabletLocal.cableEdits["route-a"].actualLengthMetres).toBe(42);
  expect(tabletLocal.synced).toBe(false);
  await tabletPage.evaluate(async ({ projectId, serverTimestamp }) => {
    const { storage } = (window as any).__surveyHarness;
    const local = storage.getProjectEdits(projectId);
    local.serverTimestamp = serverTimestamp;
    storage.saveProjectEdits(local);
  }, { projectId: PROJECT_ID, serverTimestamp: conflict.serverTimestamp! });
  const retry = await apiSync(tabletPage, PROJECT_ID);
  expect(retry).toMatchObject({ outcome: "synced" });
  const serverCopy = await (await tablet.request.get(`/api/wingman/site-survey/sync?projectId=${encodeURIComponent(PROJECT_ID)}`)).json();
  expect(serverCopy.edits.cableEdits["route-a"].actualLengthMetres).toBe(42);

  await desktop.close();
  await tablet.close();
});

// Drill C's in-app resolution: a dirty-local conflict must surface the
// checklist's Sync conflict banner, and resolving through it (no DevTools,
// no localStorage surgery) must leave the project in a clean, re-syncable
// state. This is the release affordance that replaced the localStorage
// expedite step the UAT protocol used to require.
test("sync conflict surfaces the in-app banner and Keep server copy resolves it", async ({ browser }) => {
  // Distinct email per test: signup is one-shot per server boot, and the
  // earlier conflict test already claims offline-uat@example.com. One account
  // is shared across both seats (re-login per seat switch) because the survey
  // store is workspace-scoped — separate accounts would never conflict.
  const email = "offline-uat-banner@example.com";
  const seatA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const seatB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageA = await seatA.newPage();
  const pageB = await seatB.newPage();
  await openHarness(pageA);
  await openHarness(pageB);

  // Seat A owns the project revision history (server revision 1 at length 12).
  await authenticate(pageA, "signup", email);
  await pageA.evaluate(async (projectId) => {
    const { storage } = (window as any).__surveyHarness;
    storage.setCableLength(projectId, "route-a", 12);
    storage.setCableConfirmed(projectId, "route-a", true);
  }, PROJECT_ID);
  expect(await apiSync(pageA, PROJECT_ID)).toMatchObject({ outcome: "synced" });

  // Seat B (same account, its own browser context — auth keeps one active
  // session per account, so seat A is logged out when seat B signs in) adopts
  // the server revision the way a clean adoption would, so its dirty 42 edit
  // is based on revision 1 and the later 409 is a genuine conflict.
  const revision1 = await (await pageA.request.get(`/api/wingman/site-survey/sync?projectId=${encodeURIComponent(PROJECT_ID)}`)).json();
  await authenticate(pageB, "login", email);
  await pageB.evaluate(({ key, projectId, revision }) => {
    localStorage.setItem(key, JSON.stringify({ [projectId]: {
      projectId, cableEdits: {}, deviceEdits: {}, locationEdits: {},
      lastModified: "2026-09-10T12:00:00.000Z", synced: true, serverTimestamp: revision,
    } }));
  }, { key: STORAGE_KEY, projectId: PROJECT_ID, revision: revision1.serverTimestamp });

  // Seat B's dirty edit (42) is held back while offline; seat A lands 18 as
  // server revision 2 behind its back (re-login kills seat B's session, which
  // is fine — seat B is offline and its session is restored below).
  await seatB.setOffline(true);
  await expect(editAndSync(pageB, 42)).resolves.toMatchObject({ outcome: "error", error: "offline" });
  await authenticate(pageA, "login", email);
  await pageA.evaluate(async (projectId) => (window as any).__surveyHarness.storage.setCableLength(projectId, "route-a", 18), PROJECT_ID);
  expect(await apiSync(pageA, PROJECT_ID)).toMatchObject({ outcome: "synced" });

  // Back online, seat B opens the REAL checklist UI: the dirty 42 is still
  // local, the server holds 18, and the conflict must surface in-app.
  await seatB.setOffline(false);
  await authenticate(pageB, "login", email);
  await openChecklistPage(pageB);

  const banner = pageB.getByTestId("survey-conflict-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Sync conflict");
  await expect(banner).toContainText("Keep server copy");
  await expect(banner).toContainText("Keep my edits");
  const lengthInput = pageB.getByLabel(/Actual:/).first();
  await expect(lengthInput).toHaveValue("42");
  // The dirty local value survived: resolution must never overwrite it
  // silently — the banner exists precisely to offer the choice.

  // Resolve through the UI: Keep server copy adopts 18 as a synced record.
  await banner.getByRole("button", { name: "Keep server copy" }).click();
  await expect(banner).toBeHidden();
  await expect(lengthInput).toHaveValue("18");
  const adopted = await pageB.evaluate(async (projectId) => {
    const { storage } = (window as any).__surveyHarness;
    return storage.getProjectEdits(projectId);
  }, PROJECT_ID);
  expect(adopted.cableEdits["route-a"].actualLengthMetres).toBe(18);
  expect(adopted.synced).toBe(true);
  // Compare against the server via seat B: seat A's session was consumed by
  // the one-active-session policy when seat B re-logged-in above.
  expect(adopted.serverTimestamp).toBe((await (await pageB.request.get(`/api/wingman/site-survey/sync?projectId=${encodeURIComponent(PROJECT_ID)}`)).json()).serverTimestamp);

  // The re-made field edit (42) now pushes cleanly — no 409, no expedite.
  await expect(editAndSync(pageB, 42)).resolves.toMatchObject({ outcome: "synced" });
  const serverCopy = await (await pageB.request.get(`/api/wingman/site-survey/sync?projectId=${encodeURIComponent(PROJECT_ID)}`)).json();
  expect(serverCopy.edits.cableEdits["route-a"].actualLengthMetres).toBe(42);

  await seatA.close();
  await seatB.close();
});

const responsiveCases = [
  { name: "mobile", width: 390, height: 844, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
];
const workflows = ["", "/discovery", "/compare", "/templates", "/proposal"];

for (const device of responsiveCases) {
  test(`responsive UAT ${device.name}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height }, hasTouch: device.touch, isMobile: device.name === "mobile" });
    const page = await context.newPage();
    await page.goto("/wingman", { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      const projects = await import("/src/wingman2/data/projectStore.ts");
      const timestamp = new Date().toISOString();
      const candidate = {
        id: "responsive-site-survey", name: "Responsive Site Survey", owner: "UAT", stage: "Proposal Builder", status: "alternative",
        updated: "Just now", resumeTo: "/wingman/proposal", createdAt: timestamp, updatedAt: timestamp,
        discoveryBrief: { savedAt: timestamp, roomModel: { clientName: "Acme Corp", siteName: "London HQ" }, topology: {
          schemaVersion: 1, mode: "advanced",
          locations: [{ id: "loc-1", name: "Table", type: "table" }, { id: "loc-2", name: "Display Wall", type: "display-wall" }],
          devices: [
            { id: "dev-1", name: "Laptop", category: "Source", locationId: "loc-1", quantity: 1, thirdParty: true, status: "confirmed" },
            { id: "dev-2", name: "Display", category: "Display", locationId: "loc-2", quantity: 1, thirdParty: true, status: "confirmed" },
          ],
          connections: [{ id: "conn-1", fromDeviceId: "dev-1", toDeviceId: "dev-2", services: ["video"], transport: "hdmi", lengthMode: "estimated", lengthMetres: 12, estimateReason: "Confirm on site", status: "assumed" }],
          generatedFromDiscovery: true, createdAt: timestamp, updatedAt: timestamp,
        } },
      };
      projects.upsertStoredProject(candidate as any);
      projects.setActiveProjectId(candidate.id);
    });
    for (const workflow of workflows) {
      await page.goto(`/wingman${workflow}`, { waitUntil: "networkidle" });
      await expect(page.locator("body")).toBeVisible();
      if (workflow === "/proposal") {
        for (let step = 0; step < 5 && !(await page.getByRole("heading", { name: "Site Survey Checklist" }).isVisible().catch(() => false)); step += 1) {
          const next = page.getByRole("button", { name: /Continue|Next/i }).last();
          if (!(await next.isVisible().catch(() => false)) || !(await next.isEnabled())) break;
          await next.click();
        }
        await expect(page.getByRole("heading", { name: "Site Survey Checklist" })).toBeVisible();
        await expect(page.getByText("No topology data available", { exact: false })).toHaveCount(0);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${workflow || "/dashboard"} must not overflow horizontally`).toBeLessThanOrEqual(1);
      const label = workflow.slice(1) || "dashboard";
      await page.screenshot({ path: testInfo.outputPath(`${device.name}-${label}.png`), fullPage: true });
    }
    await context.close();
  });
}
