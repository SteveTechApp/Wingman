import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "server/**/*.{test,spec}.mjs", "tools/**/*.{test,spec}.mjs"],
    exclude: ["node_modules", "dist", "src/_ARCHIVE/**"],
    // Must exceed the 5000ms asyncUtilTimeout set in src/__tests__/setup.ts,
    // otherwise a slow async query is cut short by the test timeout before it
    // can report a useful failure. Vitest's default is also 5000ms.
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      exclude: ["node_modules/**", "dist/**", "tools/**", "**/*.test.*", "**/*.spec.*", "**/__fixtures__/**"],
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
