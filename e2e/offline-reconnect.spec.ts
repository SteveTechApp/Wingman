import { expect, test, type Page } from "@playwright/test";

const PROJECT_ID = "offline-reconnect-uat";
const STORAGE_KEY = "wingman-site-survey-edits";

async function openHarness(page: Page) {
  await page.goto("/wingman", { waitUntil: "networkidle" });
  await page.evaluate(async (key) => {
    localStorage.removeItem(key);
    const storage = await import("/src/wingman2/lib/siteSurveyStorage.ts");
    const sync = await import("/src/wingman2/lib/siteSurveySync.ts");
    (window as any).__surveyHarness = { storage, sync };
  }, STORAGE_KEY);
}

async function authenticate(page: Page, mode: "signup" | "login") {
  const payload = mode === "signup"
    ? { name: "Offline UAT", company: "Reconnect Lab", email: "offline-uat@example.com", password: "offline-uat-pass" }
    : { email: "offline-uat@example.com", password: "offline-uat-pass" };
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
