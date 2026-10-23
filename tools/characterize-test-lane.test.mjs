import { expect, it } from "vitest";
import { classifyRuns } from "./characterize-test-lane.mjs";

it("distinguishes flakes in either order from failure and missing results", () => {
  expect(classifyRuns(0, 0)).toBe("passed");
  expect(classifyRuns(1, 0)).toBe("flake");
  expect(classifyRuns(0, 1)).toBe("flake");
  expect(classifyRuns(1, 1)).toBe("failed-both");
  expect(classifyRuns(null, 0)).toBe("incomplete");
});
