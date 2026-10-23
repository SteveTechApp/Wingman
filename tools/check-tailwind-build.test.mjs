import { expect, it } from "vitest";
import { assertTailwindUtilities } from "./check-tailwind-build.mjs";

it("requires both the spacing token and a generated fractional utility", () => {
  const theme = ":root{--spacing:.25rem}";
  const utility = ".h-3\\.5{height:calc(var(--spacing)*3.5)}";
  expect(() => assertTailwindUtilities(theme + utility)).not.toThrow();
  expect(() => assertTailwindUtilities(utility)).toThrow("--spacing");
  expect(() => assertTailwindUtilities(theme)).toThrow(".h-3.5");
});
