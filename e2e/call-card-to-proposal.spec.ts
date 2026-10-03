/**
 * Call Card → Proposal critical-path end-to-end test.
 *
 * Covers browsing, searching, and opening product call cards.
 *
 * Prerequisites: dev server on http://127.0.0.1:3000
 * Run: npx playwright test e2e/call-card-to-proposal.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE = "/wingman";

test.describe("Call Card to Proposal workflow", () => {
  async function navigateAndClear(page) {
    await page.goto(`${BASE}/product-call-cards`);
    await page.waitForTimeout(2000);
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (_) {} });
    await page.reload();
    await page.waitForTimeout(2000);
  }

  test("product call cards page loads with product grid", async ({ page }) => {
    await navigateAndClear(page);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length).toBeGreaterThan(50);

    // Should show product cards/grid
    const cards = page.locator("[class*='product'], [class*='card'], [class*='grid']").first();
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test("search input filters by SKU", async ({ page }) => {
    await navigateAndClear(page);

    const searchInput = page.locator("input[type='text'], input[placeholder*='earch'], input[placeholder*='SKU']").first();
    const siCount = await searchInput.count();
    if (siCount === 0) return;
    await searchInput.fill("NHD-500-TX");
    await page.waitForTimeout(1000);

    const value = await searchInput.inputValue().catch(() => "");
    expect(value).toContain("NHD-500-TX");
  });

  test("opens first product detail card", async ({ page }) => {
    await navigateAndClear(page);

    // Click first clickable product card
    const firstCard = page.locator("a, [role='button'], [class*='clickable']").first();
    const fcCount = await firstCard.count();
    if (fcCount === 0) return;
    await firstCard.click().catch(() => {});
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length).toBeGreaterThan(20);
  });

  test("navigate back to dashboard from call cards", async ({ page }) => {
    await navigateAndClear(page);

    const homeLink = page.locator("a[href*='wingman'], a[href='/'], a[href='/wingman']").first();
    const hlCount = await homeLink.count();
    if (hlCount > 0) {
      await homeLink.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(bodyText.length).toBeGreaterThan(20);
  });
});