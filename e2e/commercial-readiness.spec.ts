import { expect, test } from "playwright/test";

const projectName = "E2E Boardroom Upgrade";
const customerName = "Acme Ltd";
const siteName = "London HQ";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("covers project intake through proposal completion", async ({ page }) => {
  await page.goto("/app/projects/new");

  await page.getByRole("textbox", { name: /^Project name$/ }).fill(projectName);
  await page.getByRole("textbox", { name: /^Customer$/ }).fill(customerName);
  await page.getByRole("textbox", { name: /^Site$/ }).fill(siteName);
  await page.getByRole("button", { name: "Start with Guided Project" }).click();

  await expect(page).toHaveURL(/\/app\/tools\/discovery$/);
  await expect(page.getByRole("heading", { name: "Guided Project" })).toBeVisible();

  await page.goto("/app/tools/import-intake");

  await expect(page.getByRole("heading", { name: "Import Intake" })).toBeVisible();
  await page.getByRole("textbox", { name: /^Project name$/ }).fill(projectName);
  await page.getByRole("textbox", { name: /^Customer$/ }).fill(customerName);
  await page.getByRole("textbox", { name: /^Site$/ }).fill(siteName);
  await page.getByRole("textbox", { name: /^Notes$/ }).fill(
    "Boardroom refresh project for a meeting room with 2 displays, multiple sources, matrix switching, 4K60, and a 40 m cable run. The customer wants a customer-ready quote pack this month."
  );

  for (const label of [
    "What business outcome does the customer want?",
    "Which room/application are we designing for?",
    "What timeline is expected?",
  ]) {
    await page.locator("label", { hasText: label }).locator("input[type='checkbox']").check();
  }

  await expect(
    page.getByRole("button", { name: /Apply Analysis and Save to Projects/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Apply Analysis and Save to Projects/i }).click();

  await expect(page).toHaveURL(/\/app\/projects$/);

  const projectCard = page.locator(".wm-work-card", { hasText: projectName }).first();
  await expect(projectCard).toBeVisible();
  await projectCard.getByRole("button", { name: "Open Proposal Builder" }).click();

  await expect(page).toHaveURL(/\/app\/tools\/proposal$/);
  await expect(page.getByRole("button", { name: "Save Proposal Draft" })).toBeVisible();

  await page.getByRole("textbox", { name: /^Executive summary$/ }).fill(
    "WyreStorm will modernise the boardroom with a switching-led 4K collaboration workflow."
  );
  await page.getByRole("textbox", { name: /^Customer requirements$/ }).fill(
    "Support two displays, multiple sources, and a simple customer-safe handoff pack."
  );
  await page.getByRole("textbox", { name: /^System overview$/ }).fill(
    "The solution combines central switching, display transport, and a clear commercial path to quote."
  );
  await page.getByRole("textbox", { name: /^Bill of materials notes$/ }).fill(
    "Seed the quote from the intake-ranked SKUs and confirm final accessories during pricing review."
  );
  await page.getByRole("textbox", { name: /^Commercial notes$/ }).fill(
    "Position the design as a reliable boardroom refresh with a clean upgrade path."
  );
  await page.getByRole("textbox", { name: /^Assumptions$/ }).fill(
    "Existing infrastructure can support the proposed transport and rack power is available."
  );
  await page.getByRole("textbox", { name: /^Exclusions$/ }).fill(
    "Builder's works, third-party control programming, and network remediation are excluded."
  );

  await page.getByRole("button", { name: "Save Proposal Draft" }).click();
  await expect(page.getByText(/Saved at/i)).toBeVisible();

  await page.getByRole("button", { name: "Open Completion Workflow" }).click();

  await expect(page).toHaveURL(/\/app\/projects\/.+\/completion$/);
  await expect(page.getByRole("heading", { name: "Completion Workflow" })).toBeVisible();
  await expect(page.getByText("6 of 6 checks complete")).toBeVisible();

  await page.getByRole("button", { name: "Mark project ready" }).click();

  await expect(page).toHaveURL(/\/app\/projects\/.+$/);
  await expect(page.locator("main").getByText(projectName).last()).toBeVisible();
  await expect(page.locator("main").getByText("Commercial Ready").first()).toBeVisible();
});
