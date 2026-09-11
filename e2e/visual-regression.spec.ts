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

async function clearBrowserState(page: import("@playwright/test").Page) {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

async function dismissConnectionNotice(page: import("@playwright/test").Page) {
  await page.addStyleTag({ content: ".wm-offline-banner { display: none !important; }" });
}

async function openCompletedRecommendation(page: import("@playwright/test").Page) {
  const answers: Record<string, string> = {
    "What type of opportunity is this?": "Meeting room / boardroom",
    "What is the approximate room or system scale?": "Single large room",
    "How many source positions are likely?": "2-4 sources",
    "How many displays or outputs are needed?": "1 display / output",
    "How should the displays behave?": "Same content on all displays",
    "What camera, microphone or capture workflows are required?": "No camera or microphone requirements",
  };
  await page.goto("/wingman/discovery");
  await clearBrowserState(page);
  await page.reload({ waitUntil: "networkidle" });
  for (let turn = 0; turn < 12; turn += 1) {
    const finish = page.getByRole("button", { name: "Next: find matching products", exact: true });
    if (await finish.isVisible({ timeout: 700 }).catch(() => false)) {
      await finish.click();
      await page.waitForURL("**/wingman/recommendations");
      await page.getByRole("button", { name: "Review proposed system" }).click();
      return;
    }
    const heading = page.locator("main h2").first();
    const question = (await heading.innerText()).trim();
    await page.locator("button.wm-discovery-option").filter({ hasText: answers[question] }).first().click();
    await page.waitForTimeout(200);
    if ((await heading.innerText()).trim() === question) {
      const next = page.getByRole("button", { name: "Continue", exact: true });
      if (await next.isEnabled()) await next.click();
    }
  }
  throw new Error("Recommendation visual fixture did not complete Discovery.");
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
    await page.goto("/wingman/battle-cards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("battle-cards-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("battle cards first brand section matches baseline", async ({
    page,
  }) => {
    await page.goto("/wingman/battle-cards");
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
    await page.goto("/wingman/product-call-cards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("product-call-cards-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("product call cards product grid matches baseline", async ({ page }) => {
    await page.goto("/wingman/product-call-cards");
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
    await page.goto("/wingman/battle-cards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("battle-cards-tablet.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test("product call cards tablet view matches baseline", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/product-call-cards");
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot("product-call-cards-tablet.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe("Visual regression - Populated decisions", () => {
  test("completed recommendation matches baseline", async ({ page }) => {
    await openCompletedRecommendation(page);
    await expect(page.locator(".wm-rec-system")).toBeVisible();
    await dismissConnectionNotice(page);
    await expect(page).toHaveScreenshot("recommendation-completed.png", { fullPage: true });
  });

  test("known competitor comparison matches baseline", async ({ page }) => {
    await page.goto("/wingman/compare");
    await clearBrowserState(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("combobox", { name: /^Manufacturer$/i }).fill("Crestron");
    await page.getByRole("combobox", { name: /^Competitor SKU$/i }).fill("DM-NVX-350");
    const heading = page.getByRole("heading", { name: "Comparison result" });
    if (!(await heading.isVisible().catch(() => false))) await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(heading).toBeVisible({ timeout: 20_000 });
    await dismissConnectionNotice(page);
    await expect(page).toHaveScreenshot("compare-populated.png", { fullPage: true });
  });

  test("expanded battle card matches baseline", async ({ page }) => {
    await page.goto("/wingman/battle-cards", { waitUntil: "networkidle" });
    await page.getByLabel("Search competitors").fill("Crestron");
    const crestron = page.locator(".wm-bc-brand-group").filter({ has: page.locator(".wm-bc-brand-header", { hasText: "Crestron" }) });
    await crestron.locator(".wm-bc-brand-header").click();
    await crestron.locator(".wm-bc-card-header").first().click();
    await expect(crestron.locator(".wm-bc-card").first()).toContainText(/WyreStorm|equivalent/i);
    await dismissConnectionNotice(page);
    await expect(page).toHaveScreenshot("battle-card-populated.png", { fullPage: true });
  });

  test("populated product call card matches baseline", async ({ page }) => {
    await page.goto("/wingman/product-call-cards", { waitUntil: "networkidle" });
    await page.getByLabel("Search products").fill("NHD-500-TX");
    await page.locator(".wm-pcc-selection-mode button, .wm-pcc-selection-mode a").filter({ hasText: "NHD-500-TX" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "NHD-500-TX" })).toBeVisible();
    await dismissConnectionNotice(page);
    await expect(page).toHaveScreenshot("product-call-card-populated.png", { fullPage: true });
  });

  test("template proposal review matches baseline", async ({ page }) => {
    await page.goto("/wingman/templates", { waitUntil: "networkidle" });
    await page.locator(".wm-library-tile").first().click();
    await page.getByRole("tab", { name: "Proposal", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText(/assumption|risk/i);
    await dismissConnectionNotice(page);
    await expect(page).toHaveScreenshot("proposal-review-populated.png", {
      fullPage: true,
      mask: [page.getByText("Start from room, vertical and application templates.", { exact: true })],
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
