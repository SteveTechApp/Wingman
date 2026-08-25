import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for Wingman pages.
 *
 * These tests capture screenshots and compare them against baselines.
 * To update baselines after intentional styling changes:
 *   npx playwright test --update-snapshots
 *
 * To run visual tests only:
 *   npx playwright test e2e/visual-regression.spec.ts
 */

// Helper to wait for page to be fully rendered
async function waitForPageReady(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  // Wait for any animations/transitions to settle
  await page.waitForTimeout(500);
}

test.describe("Visual regression - Dashboard", () => {
  test("dashboard page matches baseline", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Full page screenshot
    await expect(page).toHaveScreenshot("dashboard-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("dashboard hero section matches baseline", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Screenshot just the hero/header area
    const hero = page.locator('[class*="hero"], [class*="Hero"], main').first();
    if ((await hero.count()) > 0) {
      await expect(hero).toHaveScreenshot("dashboard-hero.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });
});

test.describe("Visual regression - Discovery", () => {
  test("discovery page initial state matches baseline", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("discovery-initial.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("discovery page with progressive disclosure matches baseline", async ({
    page,
  }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    // Check if progressive disclosure is visible
    const progressiveDisclosure = page.locator(
      '[class*="progressive"], [class*="Progressive"], [class*="mode-toggle"]'
    );

    if ((await progressiveDisclosure.count()) > 0) {
      await expect(progressiveDisclosure.first()).toHaveScreenshot(
        "discovery-progressive-disclosure.png",
        {
          maxDiffPixelRatio: 0.01,
        }
      );
    }
  });
});

test.describe("Visual regression - Compare", () => {
  test("compare page empty state matches baseline", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("compare-empty.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("compare page with brand selector matches baseline", async ({
    page,
  }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    // Focus on the brand selector area
    const brandSelector = page.locator(
      '[class*="brand"], [class*="Brand"], [role="combobox"]'
    ).first();

    if ((await brandSelector.count()) > 0) {
      await expect(brandSelector).toHaveScreenshot(
        "compare-brand-selector.png",
        {
          maxDiffPixelRatio: 0.01,
        }
      );
    }
  });
});

test.describe("Visual regression - Battle Cards", () => {
  test("battle cards page matches baseline", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("battle-cards-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("battle cards first brand section matches baseline", async ({
    page,
  }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    // Find the first brand card/section
    const firstBrand = page.locator(
      '[class*="brand"], [class*="Brand"], [data-brand]'
    ).first();

    if ((await firstBrand.count()) > 0) {
      await expect(firstBrand).toHaveScreenshot(
        "battle-cards-brand-section.png",
        {
          maxDiffPixelRatio: 0.01,
        }
      );
    }
  });
});

test.describe("Visual regression - Product Call Cards", () => {
  test("product call cards page matches baseline", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("product-call-cards-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("product call cards product grid matches baseline", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    // Focus on the product grid area
    const productGrid = page.locator(
      '[class*="product-grid"], [class*="ProductGrid"], [class*="product-list"]'
    ).first();

    if ((await productGrid.count()) > 0) {
      await expect(productGrid).toHaveScreenshot(
        "product-call-cards-grid.png",
        {
          maxDiffPixelRatio: 0.01,
        }
      );
    }
  });
});

test.describe("Visual regression - Recommendations", () => {
  test("recommendations page empty state matches baseline", async ({
    page,
  }) => {
    await page.goto("/wingman/recommendations");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("recommendations-empty.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual regression - Responsive", () => {
  test("dashboard tablet view matches baseline", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("dashboard-tablet.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("dashboard mobile view matches baseline", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("dashboard-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("battle cards tablet view matches baseline", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("battle-cards-tablet.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("product call cards tablet view matches baseline", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("product-call-cards-tablet.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual regression - Color scheme", () => {
  test("primary button styles match baseline", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const primaryButton = page.locator(
      'button[class*="primary"], button[class*="Primary"], button:has-text("Start")'
    ).first();

    if ((await primaryButton.count()) > 0) {
      await expect(primaryButton).toHaveScreenshot("button-primary.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });

  test("card component styles match baseline", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const card = page.locator(
      '[class*="card"], [class*="Card"], [class*="section-card"]'
    ).first();

    if ((await card.count()) > 0) {
      await expect(card).toHaveScreenshot("card-component.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });
});
