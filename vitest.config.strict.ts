import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    exclude: ["node_modules", "dist", "src/_ARCHIVE/**", "**/*.crash-atomicity.test.mjs", "server/fixtures/**"],
  },
});
