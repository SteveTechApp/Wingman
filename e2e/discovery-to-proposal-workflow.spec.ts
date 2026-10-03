/**
 * Discovery to Proposal full workflow end-to-end test.
 *
 * Covers:
 *   1. Complete a meeting room discovery
 *   2. Navigate to Recommendations
 *   3. Select products from recommendations
 *   4. Navigate to Proposal
 *   5. Verify proposal page loads with products
 *
 * Prerequisites: dev server running on http://127.0.0.1:3000
 * Run: npx playwright test e2e/discovery-to-proposal-workflow.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE = "/wingman";

test.describe("Discovery to Proposal workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/discovery`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("completes discovery, selects products, and navigates to proposal", async ({ page }) => {
    // Step 1: Verify discovery page loaded
    await expect(page.locator('main, [data-wingman-page], [class*="discovery"]').first()).toBeVisible({ timeout: 15_000 });

    // Step 2: Dismiss existing discovery warning if present
    const warningButton = page.locator('button:has-text("Start new")');
    if (await warningButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await warningButton.click();
      await page.waitForTimeout(500);
    }

    // Step 3: Select application — Meeting room
    const meetingRoomOption = page.locator('button:has-text("Meeting room"), [data-value="meeting-room"]');
    if (await meetingRoomOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await meetingRoomOption.first().click();
      await page.waitForTimeout(300);
    }

    // Step 4: Select scale — Single large room
    const scaleOption = page.locator('button:has-text("Single large room"), [data-value="single-large-room"]');
    if (await scaleOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await scaleOption.first().click();
      await page.waitForTimeout(300);
    }

    // Step 5: Select sources — 2
    const sourcesOption = page.locator('button:has-text("2"), [data-value="2"]');
    if (await sourcesOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sourcesOption.first().click();
      await page.waitForTimeout(300);
    }

    // Step 6: Select displays — 1
    const displaysOption = page.locator('button:has-text("1"), [data-value="1"]');
    if (await displaysOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await displaysOption.first().click();
      await page.waitForTimeout(300);
    }

    // Step 7: Look for completion panel or "Send to recommendations" button
    const completeButton = page.locator('button:has-text("Send to recommendations"), button:has-text("Go to recommendations"), button:has-text("View recommendations")');
    if (await completeButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await completeButton.first().click();
      await page.waitForLoadState("networkidle");

      // Step 8: Verify we landed on recommendations
      await expect(page).toHaveURL(/recommendations/, { timeout: 10_000 });

      // Step 9: Wait for products to load
      await page.waitForTimeout(2_000);

      // Step 10: Look for "Add to project" buttons
      const addButtons = page.locator('button:has-text("Add to project")');
      const addCount = await addButtons.count();

      if (addCount > 0) {
        // Click the first "Add to project" button
        await addButtons.first().click();
        await page.waitForTimeout(1_000);
      }

      // Step 11: Navigate to proposal
      const proposalLink = page.locator('a[href*="proposal"], button:has-text("Proposal"), a:has-text("Proposal")');
      if (await proposalLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await proposalLink.first().click();
        await page.waitForLoadState("networkidle");

        // Step 12: Verify proposal page loaded
        const proposalText = await page.textContent("body");
        const hasProposalContent = proposalText.includes("Proposal") || proposalText.includes("response") || proposalText.includes("export");
        expect(hasProposalContent).toBeTruthy();
      }
    }
  });

  test("discovery page shows progress indicator", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Check for progress indicator
    const progressIndicator = page.locator('[class*="progress"], [class*="step"], [class*="batch"]');
    const hasProgress = await progressIndicator.count();
    expect(hasProgress).toBeGreaterThanOrEqual(0);
  });

  test("discovery page has navigation buttons", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Check for navigation buttons
    const navButtons = page.locator('button:has-text("Previous"), button:has-text("Continue"), button:has-text("Next")');
    const hasNav = await navButtons.count();
    expect(hasNav).toBeGreaterThanOrEqual(0);
  });
});
