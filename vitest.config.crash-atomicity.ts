import { defineConfig } from "vitest/config";

// Dedicated lane for the process-spawn crash-atomicity suites
// (server/**/*.crash-atomicity.test.mjs). These tests spawn a child process,
// wait until it is visibly mid-write, and hard-kill it - the kill window is
// timing-sensitive, so they must NOT run inside the parallel fast stage
// (vitest.config.ts excludes the pattern from `npm test` / `test:coverage`).
// CI runs them sequentially in the e2e smoke job via
// `npm run test:crash-atomicity`; run them locally the same way.
//
// The suites import only node builtins + sibling server modules, so no react
// plugin, jsdom setup, or canonical-store globalSetup is needed here. The
// per-test timeouts (240s) cover the kill-and-verify window.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server/**/*.crash-atomicity.test.mjs"],
    testTimeout: 240_000,
    hookTimeout: 90_000,
  },
});
