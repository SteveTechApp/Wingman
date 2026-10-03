import { expect, test, type Page } from "@playwright/test";

const BASE = "/wingman";

const discoveryAnswers: Record<string, string> = {
  "What type of opportunity is this?": "Meeting room / boardroom",
  "What is the approximate room or system scale?": "Single large room",
  "How many source positions are likely?": "2-4 sources",
  "How many displays or outputs are needed?": "1 display / output",
  "How should the displays behave?": "Same content on all displays",
  "What camera, microphone or capture workflows are required?": "No camera or microphone requirements",
};

async function resetAt(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function completeDiscovery(page: Page) {
  await resetAt(page, "/discovery");
  for (let turn = 0; turn < 12; turn += 1) {
    const finish = page.getByRole("button", { name: "Next: find matching products", exact: true });
    if (await finish.isVisible({ timeout: 700 }).catch(() => false)) {
      await expect(page.getByText("Discovery complete", { exact: false })).toBeVisible();
      await finish.click();
      await page.waitForURL("**/wingman/recommendations");
      return;
    }
    const heading = page.locator("main h2").first();
    await expect(heading).toBeVisible();
    const question = (await heading.innerText()).trim();
    const answer = discoveryAnswers[question];
    expect(answer, `Unexpected discovery question: ${question}`).toBeTruthy();
    await page.locator("button.wm-discovery-option").filter({ hasText: answer }).first().click();
    await page.waitForTimeout(200);
    if ((await heading.innerText()).trim() === question) {
      const next = page.getByRole("button", { name: "Continue", exact: true });
      if (await next.isEnabled()) await next.click();
    }
  }
  throw new Error("Discovery did not reach its completion decision.");
}

test.describe("Windows production-critical workflows", () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(BASE, { waitUntil: "networkidle" });
    expect(errors).toEqual([]);
  });

  test("Dashboard exposes the primary workflow navigation", async ({ page }) => {
    await expect(page.getByRole("main", { name: "Wingman guided home" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/clear signal path/i);
    for (const destination of ["discovery", "compare", "templates"]) {
      await expect(page.locator(`a[href*="/${destination}"]`).first()).toBeVisible();
    }
  });

  test("Discovery turns customer answers into a recommendation handoff", async ({ page }) => {
    await completeDiscovery(page);
    await expect(page.locator('[data-wingman-page-key="recommendations"]')).toBeVisible();
    await expect(page.getByText(/Meeting room \/ boardroom/i).first()).toBeVisible();
  });

  test("Recommendations render a completed system decision", async ({ page }) => {
    await completeDiscovery(page);
    await page.getByRole("button", { name: "Review proposed system" }).click();
    await expect(page.locator(".wm-rec-system")).toBeVisible();
    await expect(page.locator(".wm-rec-system-flow")).toContainText(/Source|Display|Signal/i);
    await expect(page.locator(".wm-rec-system").getByText(/WyreStorm|SW-|EXP-|MX-|NHD-/i).first()).toBeVisible();
  });

  test("Compare resolves a known competitor to a governed WyreStorm match", async ({ page }) => {
    await resetAt(page, "/compare");
    await page.getByRole("combobox", { name: /^Manufacturer$/i }).fill("Crestron");
    await page.getByRole("combobox", { name: /^Competitor SKU$/i }).fill("DM-NVX-350");
    const result = page.getByRole("heading", { name: "Comparison result" });
    if (!(await result.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "Compare", exact: true }).click();
    }
    await expect(result).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[aria-label="Competitor product card"]')).toContainText("DM-NVX-350");
    await expect(page.locator('[aria-label="WyreStorm product card"]')).toContainText(/NHD-|NetworkHD|WyreStorm/i);
    await expect(page.getByText("Product data not loaded")).toHaveCount(0);
  });

  test("Battle Cards filter and expand a populated competitor record", async ({ page }) => {
    await resetAt(page, "/battle-cards");
    await expect(page.getByText(/competitor products across \d+ brands/i)).toBeVisible();
    await page.getByLabel("Search competitors").fill("Crestron");
    const crestron = page.locator(".wm-bc-brand-group").filter({ has: page.locator(".wm-bc-brand-header", { hasText: "Crestron" }) });
    await expect(crestron).toHaveCount(1);
    await crestron.locator(".wm-bc-brand-header").click();
    await crestron.locator(".wm-bc-card-header").first().click();
    await expect(crestron.locator(".wm-bc-card").first()).toContainText(/WyreStorm|equivalent/i);
  });

  test("Templates open a populated design with a quantified equipment schedule", async ({ page }) => {
    await resetAt(page, "/templates");
    await expect(page.locator(".wm-library-tile")).toHaveCount(55);
    await page.locator(".wm-library-tile").first().click();
    await expect(page.locator('[data-wingman-template-detail-page="true"]')).toBeVisible();
    await page.getByRole("tab", { name: "Equipment", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText(/Required|Validate|Optional/i);
    await expect(page.locator('input[aria-label^="Quantity for "]').first()).toHaveValue(/[1-9]/);
  });

  test("Proposal review preserves a populated template BOM and assumptions", async ({ page }) => {
    await resetAt(page, "/templates");
    await page.locator(".wm-library-tile").first().click();
    await page.getByRole("tab", { name: "Proposal", exact: true }).click();
    const proposal = page.getByRole("tabpanel");
    await expect(proposal).toContainText(/proposal/i);
    await expect(proposal).toContainText(/assumption|risk/i);
    await expect(proposal).toContainText(/qty|quantity|equipment|BOM/i);
  });

  test("Product Call Cards load governed product detail after SKU search", async ({ page }) => {
    await resetAt(page, "/product-call-cards");
    await page.getByLabel("Search products").fill("NHD-500-TX");
    const card = page.locator(".wm-pcc-selection-mode button, .wm-pcc-selection-mode a").filter({ hasText: "NHD-500-TX" }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByRole("heading", { level: 1, name: "NHD-500-TX" })).toBeVisible();
    await expect(page.locator("main.wm-pcc-product-mode")).toContainText(/Overview|Key facts|Technical/i);
    await expect(page.locator("main.wm-pcc-product-mode")).toContainText(/HDMI|NetworkHD|4K/i);
  });
});
