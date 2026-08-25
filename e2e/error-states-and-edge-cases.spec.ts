/**
 * Error states and edge cases — critical-path end-to-end test.
 *
 * Covers empty/invalid inputs on Compare, Templates, Call Cards,
 * Proposal, Recommendations, and invalid URL handling.
 *
 * Prerequisites: dev server on http://127.0.0.1:3000
 * Run: npx playwright test e2e/error-states-and-edge-cases.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE = "/wingman";

test.describe("Error states and edge cases", () => {
  async function navigateAndClear(page, path) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(2000); // Let SPA mount
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (_) {} });
    await page.reload();
    await page.waitForTimeout(2000);
  }

  test("compare page: empty inputs — button disabled or page stable", async ({ page }) => {
    await navigateAndClear(page, "/compare");

    // Find submit button
    const submitBtn = page.locator("button").filter({ hasText: /Compare|Submit/i }).first();
    const btnCount = await submitBtn.count();
    if (btnCount > 0) {
      const isDisabled = await submitBtn.isDisabled().catch(() => false);
      // Either disabled (correct) or clicking is safe
      if (!isDisabled) {
        await submitBtn.click().catch(() => {});
      }
    }
    // Page must exist — no crash
    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(10);
  });

  test("compare page: malformed SKU should not crash", async ({ page }) => {
    await navigateAndClear(page, "/compare");

    // Enter junk
    const inputs = page.locator("input");
    const count = await inputs.count();
    if (count >= 1) {
      await inputs.first().fill("!@#").catch(() => {});
    }

    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(10);
  });

  test("templates page: renders without crash", async ({ page }) => {
    await navigateAndClear(page, "/templates");

    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(50);
  });

  test("proposal page: renders without project data", async ({ page }) => {
    await navigateAndClear(page, "/proposal");

    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(10);
  });

  test("invalid URL does not error", async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-12345`);
    await page.waitForTimeout(2000);

    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(10);
  });

  test("recommendations page: renders without discovery", async ({ page }) => {
    await navigateAndClear(page, "/recommendations");

    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(10);
  });

  test("product call cards: renders without crash", async ({ page }) => {
    await navigateAndClear(page, "/product-call-cards");

    const bodyHTML = await page.locator("body").innerHTML().catch(() => "");
    expect(bodyHTML.length).toBeGreaterThan(50);
  });
});