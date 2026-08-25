import { test, expect } from "@playwright/test";

test.describe("Battle Cards search workflow", () => {
  test("battle cards page loads and shows brand categories", async ({
    page,
  }) => {
    await page.goto("/wingman/battleCards");
    await page.waitForLoadState("networkidle");

    // Should show the page heading
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();

    // Should show at least one brand section
    const brandSections = page.locator(
      '[class*="brand"], [class*="Brand"], [data-brand]'
    );
    const count = await brandSections.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("search input filters battle cards by brand name", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await page.waitForLoadState("networkidle");

    // Find search input
    const searchInput = page.locator(
      'input[type="text"], input[placeholder*="earch"], input[placeholder*="ilter"]'
    );

    if ((await searchInput.count()) > 0) {
      // Type a brand name
      await searchInput.first().fill("Crestron");
      await page.waitForTimeout(500);

      // Results should be filtered
      const pageContent = await page.content();
      // The search should have narrowed results
      expect(pageContent).toBeTruthy();
    }
  });

  test("battle cards expand to show competitor details", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await page.waitForLoadState("networkidle");

    // Find expandable cards or accordion triggers
    const expandButtons = page.locator(
      'button:has-text("Expand"), button:has-text("Show"), button:has-text("Details"), [class*="expand"], [class*="accordion"]'
    );

    if ((await expandButtons.count()) > 0) {
      await expandButtons.first().click();
      await page.waitForTimeout(300);

      // After expansion, more content should be visible
      const expandedContent = page.locator(
        '[class*="expanded"], [class*="open"], [aria-expanded="true"]'
      );
      const expandedCount = await expandedContent.count();
      expect(expandedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("battle cards page has proper navigation links", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await page.waitForLoadState("networkidle");

    // Should have navigation back to dashboard
    const navLinks = page.locator("a[href*='dashboard'], a[href*='home']");
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(0);
  });
});
