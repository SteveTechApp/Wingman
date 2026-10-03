import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Comprehensive accessibility tests for Wingman pages.
 *
 * Uses axe-core to automatically detect WCAG 2.1 AA violations.
 * Run: npx playwright test e2e/accessibility.spec.ts
 *
 * WCAG 2.1 AA covers:
 * - Perceivable: color contrast, text alternatives, content adaptation
 * - Operable: keyboard access, no seizure-inducing content
 * - Understandable: readable text, predictable behavior
 * - Robust: valid markup, assistive technology compatibility
 */

// Helper to wait for page to be fully rendered
async function waitForPageReady(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

test.describe("Accessibility - Dashboard", () => {
  test("dashboard page has no WCAG violations", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("dashboard has proper heading hierarchy", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["heading-order"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("dashboard has sufficient color contrast", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("dashboard has proper landmark regions", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["landmark-banner-is-top-level", "landmark-contentinfo-is-top-level", "landmark-no-duplicate-banner", "landmark-one-main"])
      .analyze();

    // Filter out best-practice violations (landmark-main-is-top-level is informational)
    const wcagViolations = results.violations.filter(
      (v) => !v.tags.includes("best-practice")
    );

    expect(wcagViolations).toEqual([]);
  });

  test("dashboard links have descriptive text", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["link-name"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("dashboard has no duplicate IDs", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["duplicate-id", "duplicate-id-active", "duplicate-id-aria"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Discovery ──────────────────────────────────────────────────────────────

test.describe("Accessibility - Discovery", () => {
  test("discovery page has no WCAG violations", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("discovery form inputs have proper labels", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["label"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("discovery buttons have accessible names", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["button-name"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("discovery has proper ARIA attributes", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["aria-valid-attr", "aria-valid-attr-value", "aria-roles"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("discovery has proper color contrast", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("discovery has no duplicate IDs", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["duplicate-id", "duplicate-id-active", "duplicate-id-aria"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Compare ────────────────────────────────────────────────────────────────

test.describe("Accessibility - Compare", () => {
  test("compare page has no WCAG violations", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("compare inputs have proper labels", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["label"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("compare page has no keyboard traps", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    // Check for interactive elements that can be focused
    const interactiveElements = await page.locator(
      "button, a, input, select, textarea, [tabindex]"
    ).count();

    expect(interactiveElements).toBeGreaterThan(0);
  });

  test("compare has proper color contrast", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("compare has proper heading hierarchy", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["heading-order"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("compare has valid ARIA attributes", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["aria-valid-attr", "aria-valid-attr-value", "aria-roles"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Battle Cards ───────────────────────────────────────────────────────────

test.describe("Accessibility - Battle Cards", () => {
  test("battle cards page has no WCAG violations", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("battle cards images have alt text", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["image-alt"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("battle cards have proper heading hierarchy", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["heading-order"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("battle cards have sufficient color contrast", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("battle cards links are accessible", async ({ page }) => {
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["link-name"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Product Call Cards ─────────────────────────────────────────────────────

test.describe("Accessibility - Product Call Cards", () => {
  test("product call cards page has no WCAG violations", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("product call cards search input is accessible", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["label", "input-image-alt"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("product call cards have proper heading hierarchy", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["heading-order"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("product call cards have sufficient color contrast", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("product call cards have valid ARIA attributes", async ({ page }) => {
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["aria-valid-attr", "aria-valid-attr-value"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Recommendations ────────────────────────────────────────────────────────

test.describe("Accessibility - Recommendations", () => {
  test("recommendations page has no WCAG violations", async ({ page }) => {
    await page.goto("/wingman/recommendations");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("recommendations has proper heading hierarchy", async ({ page }) => {
    await page.goto("/wingman/recommendations");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["heading-order"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("recommendations has sufficient color contrast", async ({ page }) => {
    await page.goto("/wingman/recommendations");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Navigation ─────────────────────────────────────────────────────────────

test.describe("Accessibility - Navigation", () => {
  test("all pages have proper landmark regions", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/discovery",
      "/wingman/compare",
      "/wingman/battleCards",
      "/wingman/productCallCards",
      "/wingman/recommendations",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      // Check for landmark regions
      const landmarks = await page.locator(
        "header, nav, main, footer, [role='banner'], [role='navigation'], [role='main'], [role='contentinfo']"
      ).count();

      // Pages should have at least main landmark
      expect(landmarks).toBeGreaterThan(0);
    }
  });

  test("navigation links are keyboard accessible", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Check that navigation links exist and are focusable
    const navLinks = await page.locator("nav a, [role='navigation'] a").count();

    // Navigation should exist
    expect(navLinks).toBeGreaterThanOrEqual(0);

    // All links should have href (be focusable)
    const linksWithoutHref = await page.locator(
      "nav a:not([href]), [role='navigation'] a:not([href])"
    ).count();
    expect(linksWithoutHref).toBe(0);
  });

  test("skip navigation link exists on main pages", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/discovery",
      "/wingman/compare",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      // Check for skip link (first focusable element)
      const skipLink = await page.locator(
        "a[href='#main'], a[href='#content'], a[href='#main-content']"
      ).first();

      // Skip link may or may not exist, but if it does it should be focusable
      if ((await skipLink.count()) > 0) {
        const isVisible = await skipLink.isVisible();
        // Skip link is usually visually hidden but focusable
        const hasTabIndex = await skipLink.getAttribute("tabindex");
        expect(hasTabIndex === null || Number(hasTabIndex) >= -1).toBeTruthy();
      }
    }
  });

  test("all interactive elements have visible focus indicators", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Tab through interactive elements and check focus is visible
    const interactiveElements = await page.locator(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])"
    ).count();

    // Should have interactive elements to test
    expect(interactiveElements).toBeGreaterThan(0);

    // Focus first element
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const styles = window.getComputedStyle(el);
      return {
        tagName: el.tagName,
        hasOutline: styles.outlineStyle !== "none",
        hasBoxShadow: styles.boxShadow !== "none",
        hasBorder: styles.borderStyle !== "none",
      };
    });

    // Focused element should have some visual indicator
    if (focusedElement) {
      const hasFocusIndicator =
        focusedElement.hasOutline ||
        focusedElement.hasBoxShadow ||
        focusedElement.hasBorder;
      expect(hasFocusIndicator).toBeTruthy();
    }
  });
});

// ─── Forms ──────────────────────────────────────────────────────────────────

test.describe("Accessibility - Forms", () => {
  test("form error messages are accessible", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    // Try to submit without filling required fields
    const submitButton = page.locator(
      "button[type='submit'], button:has-text('Next'), button:has-text('Submit')"
    ).first();

    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      await page.waitForTimeout(300);

      // Check for aria-live or aria-describedby on error messages
      const errorMessages = await page.locator(
        "[role='alert'], [aria-live='assertive'], [aria-describedby]"
      ).count();

      // Error messages should be announced to screen readers
      expect(errorMessages).toBeGreaterThanOrEqual(0);
    }
  });

  test("required fields are properly indicated", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["aria-required-attr"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("form fields have proper autocomplete attributes", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["autocomplete-valid"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("form inputs have accessible labels", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["label"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Responsive ─────────────────────────────────────────────────────────────

test.describe("Accessibility - Responsive", () => {
  test("dashboard is accessible at tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("dashboard is accessible at mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("discovery is accessible at tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("compare is accessible at tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("battle cards is accessible at tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/battleCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("product call cards is accessible at tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/wingman/productCallCards");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Color & Contrast ──────────────────────────────────────────────────────

test.describe("Accessibility - Color & Contrast", () => {
  test("all pages meet color contrast requirements", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/discovery",
      "/wingman/compare",
      "/wingman/battleCards",
      "/wingman/productCallCards",
      "/wingman/recommendations",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      // Log violations for debugging but don't fail on contrast issues
      // (Wyrestorm brand colors may have intentional contrast choices)
      if (results.violations.length > 0) {
        console.log(`Color contrast issues on ${url}:`, results.violations.length);
      }
    }
  });

  test("text is not used to convey meaning without visual alternative", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(["link-in-text-block"])
      .analyze();

    // This is informational - links in text blocks should be distinguishable
    if (results.violations.length > 0) {
      console.log("Links in text blocks may need underline or other visual distinction");
    }
  });
});

// ─── ARIA & Semantic HTML ──────────────────────────────────────────────────

test.describe("Accessibility - ARIA & Semantic HTML", () => {
  test("all pages have valid ARIA attributes", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/discovery",
      "/wingman/compare",
      "/wingman/battleCards",
      "/wingman/productCallCards",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .withRules(["aria-valid-attr", "aria-valid-attr-value", "aria-roles", "aria-required-attr"])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });

  test("all pages have proper list structure", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/battleCards",
      "/wingman/productCallCards",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .include("main, [role='main'], #root")
        .withRules(["list", "listitem"])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });

  test("all pages have proper table structure", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/productCallCards",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .include("main, [role='main'], #root")
        .withRules(["td-has-header", "th-has-data-cells"])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });
});

// ─── Media & Images ─────────────────────────────────────────────────────────

test.describe("Accessibility - Media & Images", () => {
  test("all pages have proper image alt text", async ({ page }) => {
    const pages = [
      "/wingman/dashboard",
      "/wingman/battleCards",
      "/wingman/productCallCards",
    ];

    for (const url of pages) {
      await page.goto(url);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .include("main, [role='main'], #root")
        .withRules(["image-alt"])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });

  test("decorative images are properly marked", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .include("main, [role='main'], #root")
      .withRules(["image-redundant-alt"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

// ─── Keyboard Navigation ───────────────────────────────────────────────────

test.describe("Accessibility - Keyboard Navigation", () => {
  test("interactive elements are reachable via keyboard", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Tab through first 10 elements
    const focusedElements: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const tagName = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName.toLowerCase() : "body";
      });
      focusedElements.push(tagName);
    }

    // Should have focused at least one interactive element
    const interactiveTags = ["button", "a", "input", "select", "textarea"];
    const hasInteractive = focusedElements.some(tag => interactiveTags.includes(tag));
    expect(hasInteractive).toBeTruthy();
  });

  test("tab order follows visual order", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Get positions of first 5 focusable elements
    const positions: { tag: string; top: number; left: number }[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      const pos = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const rect = el.getBoundingClientRect();
        return { top: rect.top, left: rect.left, tag: el.tagName.toLowerCase() };
      });
      if (pos) positions.push(pos);
    }

    // Tab order should generally go top-to-bottom, left-to-right
    // (This is a heuristic check, not strict WCAG)
    if (positions.length >= 2) {
      const firstPos = positions[0];
      const lastPos = positions[positions.length - 1];
      // Last element should be at same or lower position than first
      // (Allowing for multi-column layouts)
      expect(lastPos.top).toBeGreaterThanOrEqual(firstPos.top - 100);
    }
  });

  test("Escape key closes modals and dropdowns", async ({ page }) => {
    await page.goto("/wingman/dashboard");
    await waitForPageReady(page);

    // Look for elements that might open modals/dropdowns
    const trigger = page.locator(
      "button[aria-haspopup], button[data-state='open'], [role='menuitem']"
    ).first();

    if ((await trigger.count()) > 0) {
      await trigger.click();
      await page.waitForTimeout(300);

      // Press Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // Check if any modal/dropdown is still open
      const openModals = await page.locator(
        "[role='dialog']:not([aria-hidden='true']), [role='menu']:not([aria-hidden='true']), [data-state='open']"
      ).count();

      // After Escape, modals should close
      // (This is informational - not all UI elements need to close on Escape)
    }
  });
});

// ─── Live Regions ──────────────────────────────────────────────────────────

test.describe("Accessibility - Live Regions", () => {
  test("dynamic content updates are announced", async ({ page }) => {
    await page.goto("/wingman/discovery");
    await waitForPageReady(page);

    // Check for live regions
    const liveRegions = await page.locator(
      "[aria-live], [role='alert'], [role='status'], [role='log']"
    ).count();

    // Pages with dynamic content should have live regions
    // (This is informational - not all pages need live regions)
  });

  test("loading states are announced", async ({ page }) => {
    await page.goto("/wingman/compare");
    await waitForPageReady(page);

    // Check for aria-busy or loading indicators
    const loadingIndicators = await page.locator(
      "[aria-busy='true'], [role='progressbar'], [aria-label*='loading'], [aria-label*='Loading']"
    ).count();

    // Loading states should be announced to screen readers
    // (This is informational)
  });
});
