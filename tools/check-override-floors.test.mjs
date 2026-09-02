import { describe, expect, it } from "vitest";
import {
  checkOverrideFloors,
  collectOverrideFloorProblems,
  specFloor,
} from "./check-override-floors.mjs";

describe("specFloor", () => {
  it("extracts the numeric floor from caret/tilde/gt/plain specs", () => {
    expect(specFloor("^4.28.8")).toBe("4.28.8");
    expect(specFloor("~4.28.8")).toBe("4.28.8");
    expect(specFloor(">=4.28.8")).toBe("4.28.8");
    expect(specFloor("4.28.8")).toBe("4.28.8");
    expect(specFloor("^6.1.4")).toBe("6.1.4");
  });

  it("treats wildcards and empty specs as floorless", () => {
    expect(specFloor("*")).toBe(null);
    expect(specFloor("latest")).toBe(null);
    expect(specFloor("x")).toBe(null);
    expect(specFloor("")).toBe(null);
    expect(specFloor(undefined)).toBe(null);
    expect(specFloor(null)).toBe(null);
  });

  it("uses the first comparator of a compound spec", () => {
    expect(specFloor(">=4.28.8 <5.0.0")).toBe("4.28.8");
  });
});

// ---------------------------------------------------------------------------
// Fixtures mirroring the real package.json override block
// ---------------------------------------------------------------------------

const CLEAN_PACKAGE = {
  overrides: {
    browserslist: "^4.28.8",
    "postcss-selector-parser@^6.0.10": "^6.1.4",
    "fast-uri": "^3.1.7",
  },
};

const CLEAN_LOCK = {
  packages: {
    "node_modules/browserslist": { version: "4.28.8" },
    "node_modules/postcss-selector-parser": { version: "6.1.4" },
    "node_modules/fast-uri": { version: "3.1.7" },
  },
};

function expectOneProblemMatching(packageJson, lock, pattern) {
  const problems = collectOverrideFloorProblems(packageJson, lock);
  expect(problems.length).toBeGreaterThan(0);
  expect(problems.some((problem) => pattern.test(problem))).toBe(true);
}

describe("collectOverrideFloorProblems", () => {
  it("passes clean overrides with the lockfile at or above the floors", () => {
    expect(collectOverrideFloorProblems(CLEAN_PACKAGE, CLEAN_LOCK)).toEqual([]);
  });

  it("passes a lockfile with an out-of-family postcss-selector-parser (7.x)", () => {
    const lock = {
      packages: {
        ...CLEAN_LOCK.packages,
        "node_modules/shadcn/node_modules/postcss-selector-parser": { version: "7.1.4" },
      },
    };
    expect(collectOverrideFloorProblems(CLEAN_PACKAGE, lock)).toEqual([]);
  });

  it("fails when the browserslist override is removed entirely", () => {
    const { overrides, ...rest } = CLEAN_PACKAGE;
    expectOneProblemMatching({ ...rest, overrides: { "postcss-selector-parser@^6.0.10": "^6.1.4" } }, CLEAN_LOCK, /browserslist/);
  });

  it("fails when the postcss-selector-parser override is removed entirely", () => {
    expectOneProblemMatching({ ...CLEAN_PACKAGE, overrides: { browserslist: "^4.28.8" } }, CLEAN_LOCK, /postcss-selector-parser/);
  });

  it("fails when a floor is lowered below its advisory minimum", () => {
    expectOneProblemMatching(
      { ...CLEAN_PACKAGE, overrides: { browserslist: "^4.28.0", "postcss-selector-parser@^6.0.10": "^6.1.4" } },
      CLEAN_LOCK,
      /below the required 4\.28\.8/,
    );
    expectOneProblemMatching(
      { ...CLEAN_PACKAGE, overrides: { browserslist: "^4.28.8", "postcss-selector-parser@^6.0.10": "^6.1.2" } },
      CLEAN_LOCK,
      /below the required 6\.1\.4/,
    );
  });

  it("fails when the override is a wildcard with no floor at all", () => {
    expectOneProblemMatching(
      { ...CLEAN_PACKAGE, overrides: { browserslist: "*", "postcss-selector-parser@^6.0.10": "^6.1.4" } },
      CLEAN_LOCK,
      /below the required 4\.28\.8/,
    );
  });

  it("fails when the lockfile records browserslist below the floor (regeneration dropped the pin)", () => {
    const lock = { packages: { ...CLEAN_LOCK.packages, "node_modules/browserslist": { version: "4.28.7" } } };
    expectOneProblemMatching(CLEAN_PACKAGE, lock, /records browserslist 4\.28\.7, below the 4\.28\.8 advisory floor/);
  });

  it("fails when the fast-uri override is removed entirely", () => {
    expectOneProblemMatching(
      { overrides: { browserslist: "^4.28.8", "postcss-selector-parser@^6.0.10": "^6.1.4" } },
      CLEAN_LOCK,
      /fast-uri/,
    );
  });

  it("fails when the fast-uri floor is lowered below its advisory minimum", () => {
    expectOneProblemMatching(
      { ...CLEAN_PACKAGE, overrides: { ...CLEAN_PACKAGE.overrides, "fast-uri": "^3.1.5" } },
      CLEAN_LOCK,
      /fast-uri/,
    );
  });

  it("fails when the lockfile records fast-uri below the floor (regeneration dropped the pin)", () => {
    const lock = { packages: { ...CLEAN_LOCK.packages, "node_modules/fast-uri": { version: "3.1.5" } } };
    expectOneProblemMatching(CLEAN_PACKAGE, lock, /records fast-uri 3\.1\.5, below the 3\.1\.7 advisory floor/);
  });

  it("fails when the lockfile records an in-family postcss-selector-parser below the floor", () => {
    const lock = { packages: { ...CLEAN_LOCK.packages, "node_modules/postcss-selector-parser": { version: "6.1.2" } } };
    expectOneProblemMatching(CLEAN_PACKAGE, lock, /inside the 6\.1\.0-6\.1\.3 affected range/);
  });
});

describe("checkOverrideFloors (real files)", () => {
  it("passes the committed package.json overrides and lockfile", () => {
    expect(checkOverrideFloors()).toEqual([]);
  });
});
