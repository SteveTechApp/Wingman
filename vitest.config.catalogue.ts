import { defineConfig } from "vitest/config";
import base from "./vitest.config";
import { catalogueAcceptanceTests } from "./tools/catalogue-acceptance-tests.mjs";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: catalogueAcceptanceTests,
    exclude: ["node_modules", "dist"],
  },
});
