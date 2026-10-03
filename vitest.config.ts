import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    globalSetup: ["./tools/vitest-global-setup.mjs"],
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "server/**/*.{test,spec}.mjs", "tools/**/*.{test,spec}.mjs"],
    // The crash-atomicity suites spawn and hard-kill child processes mid-write
    // (wingman-app-store / competitor-lookup). Running them inside the
    // parallel fast stage crowds the timing-sensitive kill window and the
    // coverage run instruments them uselessly, so they are excluded here and
    // executed sequentially in the CI e2e job via `npm run
    // test:crash-atomicity` (vitest.config.crash-atomicity.ts).
    exclude: ["node_modules", "dist", "src/_ARCHIVE/**", "**/*.crash-atomicity.test.mjs", "server/fixtures/**"],
    // Must exceed the 5000ms asyncUtilTimeout set in src/__tests__/setup.ts,
    // otherwise a slow async query is cut short by the test timeout before it
    // can report a useful failure. Vitest's default is also 5000ms.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      exclude: ["node_modules/**", "dist/**", "tools/**", "**/*.test.*", "**/*.spec.*", "**/__fixtures__/**", "server/fixtures/**"],
      // Floors are set just below the coverage measured on 2026-07-24
      // (lines 68.86, statements 67.12, functions 67.79, branches 60.95) so
      // they ratchet rather than block. Raise them as coverage improves;
      // never lower them to make a red build pass.
      thresholds: {
        lines: 66,
        statements: 64,
        functions: 65,
        branches: 58,
      },
    },
  },
  server: {
    fs: {
      // Worktree dev checkouts symlink node_modules into the main checkout; the
      // realpath of ?url imports (e.g. pdfjs' pdf.worker) then sits OUTSIDE the
      // worktree root and Vite's fs.allow check denies the transform. Allow the
      // repo root and its parent so symlinked installs transform fine (inert in
      // CI, where the install lives inside the checkout).
      allow: [path.resolve(__dirname), path.resolve(__dirname, '../..')],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
