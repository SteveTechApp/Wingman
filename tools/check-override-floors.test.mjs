import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { semverCompare } from "./check-build-deps.mjs";
import {
  checkOverrideFloors,
  collectOverrideFloorProblems,
  evaluateOverrideFloors,
  specFloor,
  unclaimedOverrideKeys,
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
    expectOneProblemMatching(CLEAN_PACKAGE, lock, /records browserslist 4\.28\.7 .*below the 4\.28\.8 advisory floor/);
  });

  // Drill, leg 0 (in memory): the exact scenario the CLI/npm drills below
  // exercise — a regeneration resolving under the range. The surviving-but-
  // lowered override trips the package.json direction while the genuinely
  // resolved lockfile version trips the lock direction, so both detectors
  // must fire for one under-range resolution.
  it("drill leg 0: a surviving-but-lowered override resolving 4.28.7 trips BOTH detectors", () => {
    const regenerated = {
      overrides: { ...CLEAN_PACKAGE.overrides, browserslist: "^4.28.7" },
    };
    const regeneratedLock = {
      packages: { ...CLEAN_LOCK.packages, "node_modules/browserslist": { version: "4.28.7" } },
    };
    const { problems, ok } = evaluateOverrideFloors(regenerated, regeneratedLock);
    expect(ok).toBe(false);
    expect(problems.some((p) => /override for browserslist .*below the required 4\.28\.8/.test(p))).toBe(true);
    expect(problems.some((p) => /records browserslist 4\.28\.7 .*below the 4\.28\.8 advisory floor/.test(p))).toBe(true);
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
    expectOneProblemMatching(CLEAN_PACKAGE, lock, /records fast-uri 3\.1\.5 .*below the 3\.1\.7 advisory floor/);
  });

  it("fails when the lockfile records an in-family postcss-selector-parser below the floor", () => {
    const lock = { packages: { ...CLEAN_LOCK.packages, "node_modules/postcss-selector-parser": { version: "6.1.2" } } };
    expectOneProblemMatching(CLEAN_PACKAGE, lock, /records postcss-selector-parser 6\.1\.2 .*below the 6\.1\.4 advisory floor/);
  });

  // Coverage direction 2: every overrides key must be claimed by a floor row,
  // so a future override cannot be added without also declaring its floor.
  it("reports overrides keys with no floor row as unclaimed", () => {
    expect(unclaimedOverrideKeys(CLEAN_PACKAGE)).toEqual([]);
  });

  it("fails when a NEW override is added without a floor row (unguarded override)", () => {
    const expanded = {
      ...CLEAN_PACKAGE,
      overrides: { ...CLEAN_PACKAGE.overrides, "some-new-pkg": "^2.0.0" },
    };
    expect(unclaimedOverrideKeys(expanded)).toEqual(["some-new-pkg"]);
    expectOneProblemMatching(expanded, CLEAN_LOCK, /"some-new-pkg" has no floor row/);
  });

  it("claims family-scoped override keys by prefix", () => {
    // The exact postcss-selector-parser key must stay claimed through the
    // prefix row even if its range is adjusted within the family.
    const adjusted = {
      ...CLEAN_PACKAGE,
      overrides: { ...CLEAN_PACKAGE.overrides, "postcss-selector-parser@^6.0.11": "^6.1.4" },
    };
    expect(unclaimedOverrideKeys(adjusted)).toEqual([]);
  });

  it("lockfile checks derive from the floor table (every row enforces its floor)", () => {
    // The lockfile loop iterates OVERRIDE_FLOORS, so a row added later covers
    // the lockfile automatically. Pin this by asserting each floor row's
    // package below-floor triggers a problem through the same generic path.
    for (const floor of ["browserslist", "fast-uri"]) {
      const lock = {
        packages: { ...CLEAN_LOCK.packages, [`node_modules/${floor}`]: { version: "0.0.1" } },
      };
      expectOneProblemMatching(CLEAN_PACKAGE, lock, new RegExp(`records ${floor} 0\\.0\\.1.*below the .* advisory floor`));
    }
  });
});

describe("checkOverrideFloors (real files)", () => {
  it("passes the committed package.json overrides and lockfile", () => {
    expect(checkOverrideFloors()).toEqual([]);
  });
});
// ---------------------------------------------------------------------------
// Lockfile-regeneration drill
//
// Proves the guard trips on a FRESH-INSTALL SIMULATION, not just hand-drawn
// fixtures. A sandbox package.json pins browserslist with a range that traps
// resolution under the advisory floor (the regeneration regression the
// package.json direction exists for); the standalone CLI runs against a
// sandbox copy of itself, then npm actually re-resolves the tree
// (--package-lock-only: no node_modules churn) and the guard must trip on the
// version npm genuinely chose - and go green again once the override is
// re-pinned above the floor.
// ---------------------------------------------------------------------------

const TOOL_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "check-override-floors.mjs");
const BUILD_DEPS_PATH = path.resolve(path.dirname(TOOL_PATH), "check-build-deps.mjs");
// npm does not ship in a fixed location relative to the node binary: Windows
// installs put it in <node dir>/node_modules/npm, hosted Linux runners under
// <node dir>/lib/node_modules/npm, and nvm layouts differ again. Resolve the
// first layout that exists and fall back to spawning npm's own shim via PATH
// (which works everywhere npm is actually installed) if none match.
function resolveNpmCli() {
  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(path.dirname(process.execPath), "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  for (const candidate of candidates) if (existsSync(candidate)) return candidate;
  return null;
}
const NPM_CLI = resolveNpmCli();

function runGuardCli(root) {
  // Spawn the SANDBOX copy of the guard: the repo copy hard-codes the repo as
  // its project root, while the sandbox copy resolves the fixture as the repo.
  const sandboxCli = path.join(root, "tools", "check-override-floors.mjs");
  const result = spawnSync(process.execPath, [sandboxCli], { cwd: root, encoding: "utf8" });
  return { status: result.status, stderr: result.stderr ?? "", stdout: result.stdout ?? "" };
}

function writeSandboxFiles(root, packageJson, lock) {
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");
  writeFileSync(path.join(root, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n");
}

// Copy the guard and its one local import into the sandbox so the CLI resolves
// its own project root from the fixture, exactly as it would in a repo.
function materialiseSandboxCli(root) {
  mkdirSync(path.join(root, "tools"), { recursive: true });
  writeFileSync(path.join(root, "tools", "check-override-floors.mjs"), readFileSync(TOOL_PATH));
  writeFileSync(path.join(root, "tools", "check-build-deps.mjs"), readFileSync(BUILD_DEPS_PATH));
}

// Realistic npm lockfile-v3 shape for the regen scenario: autoprefixer pulls
// browserslist transitively; the resolved 4.28.7 sits one patch under the
// 4.28.8 advisory floor, with the metadata entries npm writes.
const REGEN_LOCK = {
  name: "override-floor-drill-fixture",
  lockfileVersion: 3,
  requires: true,
  packages: {
    "": { name: "override-floor-drill-fixture", dependencies: { autoprefixer: "^10.4.20" } },
    "node_modules/autoprefixer": {
      version: "10.4.20",
      resolved: "https://registry.npmjs.org/autoprefixer/-/autoprefixer-10.4.20.tgz",
      license: "MIT",
      dependencies: {
        browserslist: "^4.23.3",
        "caniuse-lite": "^1.0.30001715",
        "normalize-range": "^0.1.2",
        picocolors: "^1.0.1",
        "postcss-value-parser": "^4.2.0",
      },
    },
    "node_modules/browserslist": {
      version: "4.28.7",
      resolved: "https://registry.npmjs.org/browserslist/-/browserslist-4.28.7.tgz",
      license: "MIT",
      dependencies: { "caniuse-lite": "^1.0.30001715", "electron-to-chromium": "^1.5.160" },
      engines: { node: "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=14.0.0" },
    },
  },
};

function sandboxPackageJson(overrides) {
  return {
    name: "override-floor-drill-fixture",
    private: true,
    overrides,
    dependencies: { autoprefixer: "^10.4.20" },
  };
}

describe("lockfile-regeneration drill", () => {
  it("drill leg 1: the CLI trips on a sandbox regen that resolved browserslist under the floor", () => {
    const root = mkdtempSync(path.join(tmpdir(), "override-floor-drill-"));
    try {
      const packageJson = sandboxPackageJson({
        browserslist: ">=4.28.7 <5",
        "fast-uri": "^3.1.7",
        "postcss-selector-parser@^6.0.10": "^6.1.4",
      });
      const lock = {
        ...REGEN_LOCK,
        packages: {
          ...REGEN_LOCK.packages,
          "": { ...REGEN_LOCK.packages[""], devDependencies: { browserslist: ">=4.28.7 <5" } },
        },
      };
      writeSandboxFiles(root, packageJson, lock);
      materialiseSandboxCli(root);
      const run = runGuardCli(root);
      expect(run.status).toBe(1);
      // Both directions must fire: the under-range resolution in the lock AND
      // the lower-bound override that permitted it.
      expect(run.stderr).toMatch(/records browserslist 4\.28\.7 .*below the 4\.28\.8 advisory floor/);
      expect(run.stderr).toMatch(/override for browserslist is ">=4\.28\.7 <5" - floor 4\.28\.7 is below the required 4\.28\.8/);
      // The healthy rows must stay unflagged (fail loud and specific).
      expect(run.stderr).not.toMatch(/fast-uri|postcss-selector-parser/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("drill leg 1b: the same sandbox passes once the override and lock sit at the floor", () => {
    const root = mkdtempSync(path.join(tmpdir(), "override-floor-drill-"));
    try {
      const packageJson = sandboxPackageJson({
        browserslist: "^4.28.8",
        "fast-uri": "^3.1.7",
        "postcss-selector-parser@^6.0.10": "^6.1.4",
      });
      const lock = {
        ...REGEN_LOCK,
        packages: {
          ...REGEN_LOCK.packages,
          "node_modules/browserslist": { ...REGEN_LOCK.packages["node_modules/browserslist"], version: "4.28.8" },
        },
      };
      writeSandboxFiles(root, packageJson, lock);
      materialiseSandboxCli(root);
      const run = runGuardCli(root);
      expect(run.status).toBe(0);
      expect(run.stdout).toMatch(/\[override-floors\] OK - all \d+ override floors/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it(
    "drill leg 2: a fresh-install simulation resolves under the floor, trips the guard, and goes green after re-pinning",
    () => {
      const root = mkdtempSync(path.join(tmpdir(), "override-floor-drill-npm-"));
      try {
        materialiseSandboxCli(root);
        const runNpm = () => {
          const result = NPM_CLI
            ? spawnSync(
                process.execPath,
                [NPM_CLI, "install", "--package-lock-only", "--no-audit", "--no-fund", "--loglevel", "error"],
                { cwd: root, encoding: "utf8", timeout: 180_000 },
              )
            : spawnSync(
                "npm",
                ["install", "--package-lock-only", "--no-audit", "--no-fund", "--loglevel", "error"],
                { cwd: root, encoding: "utf8", timeout: 180_000 },
              );
          expect(result.error ?? null, `npm spawn failed: ${result.error?.message ?? ""}`).toBeNull();
          expect(result.status, `npm install failed: ${result.stderr}`).toBe(0);
        };

        // Start from an empty v1-format lock so the run is a genuine from-
        // scratch resolution, not an upgrade of pre-pinned entries. The
        // override's ceiling traps npm's newest-in-range choice under the
        // floor, modelling a range written before the advisory floor existed.
        writeSandboxFiles(
          root,
          sandboxPackageJson({
            browserslist: ">=4.28.7 <4.28.8",
            "fast-uri": "^3.1.7",
            "postcss-selector-parser@^6.0.10": "^6.1.4",
          }),
          { name: "override-floor-drill-fixture", lockfileVersion: 1, requires: true, packages: {} },
        );
        runNpm();

        const regenerated = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
        const entry = regenerated.packages?.["node_modules/browserslist"];
        expect(entry, "npm wrote no browserslist entry into the regenerated lock").toBeTruthy();
        const resolved = String(entry.version);
        // The drill's premise: the override's range traps resolution under
        // the advisory floor, so a from-scratch resolution genuinely lands on
        // 4.28.7.
        expect(
          semverCompare(resolved, "4.28.8"),
          `npm resolved browserslist ${resolved}; expected the simulation to land under 4.28.8`,
        ).toBeLessThan(0);

        const library = checkOverrideFloors(root);
        const belowFloorPattern = new RegExp(
          "records browserslist " + resolved.split(".").join("\\.") + " .*below the 4\\.28\\.8 advisory floor",
        );
        expect(library.some((p) => belowFloorPattern.test(p))).toBe(true);
        const run = runGuardCli(root);
        expect(run.status).toBe(1);
        expect(run.stderr).toMatch(belowFloorPattern);

        // Re-pin the override above the floor and re-resolve: the guard must
        // go green again, proving the failure is the floor breach itself and
        // not an artifact of the fixture.
        writeSandboxFiles(
          root,
          sandboxPackageJson({
            browserslist: "^4.28.8",
            "fast-uri": "^3.1.7",
            "postcss-selector-parser@^6.0.10": "^6.1.4",
          }),
          regenerated,
        );
        runNpm();
        const repinned = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
        const repinnedVersion = String(repinned.packages["node_modules/browserslist"].version);
        expect(semverCompare(repinnedVersion, "4.28.8")).toBeGreaterThanOrEqual(0);
        expect(checkOverrideFloors(root)).toEqual([]);
        expect(runGuardCli(root).status).toBe(0);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    360_000,
  );
});

