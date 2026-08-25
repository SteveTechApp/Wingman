import { defineConfig, devices } from "@playwright/test";

/**
 * Wingman end-to-end test configuration.
 *
 * Tests run against the Vite dev server (default port 3000). Start the dev
 * server before running: npm run dev (or node node_modules/vite/bin/vite.js)
 *
 * Run tests: npx playwright test
 * Run specific: npx playwright test e2e/discovery-happy-path.spec.ts
 * Debug: npx playwright test --debug
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Sequential to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000, // 60s per test — discovery and compare can be slow

  // Visual regression snapshot directory
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    // Visual regression settings
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // Allow 1% pixel difference
      threshold: 0.2, // Color difference threshold
      animations: "disabled", // Disable animations for consistent screenshots
    },
  },

  // Snapshot directories for visual regression
  snapshotDir: "./e2e/__screenshots__",
  updateSnapshots: process.env.UPDATE_SNAPSHOTS ? "missing" : "none",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment for tablet testing (reps use iPads on-site):
    // {
    //   name: "ipad",
    //   use: { ...devices["iPad Pro 11"] },
    // },
  ],
});
