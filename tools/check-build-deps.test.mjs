import { describe, expect, it } from "vitest";
import {
  daysUntilExpiry,
  evaluateAdvisoryForPackage,
  evaluateExceptionExpiry,
  lockCacheHash,
  resolveAuditClosure,
  resolveDevClosure,
  selectAuditClosureSeeds,
  semverCompare,
  versionInWindow,
} from "./check-build-deps.mjs";

describe("semverCompare", () => {
  it("compares numeric segments and tolerates metadata", () => {
    expect(semverCompare("1.2.3", "1.2.3")).toBe(0);
    expect(semverCompare("1.2.4", "1.2.3")).toBe(1);
    expect(semverCompare("1.2.3", "1.2.10")).toBe(-1);
    expect(semverCompare("0.14.9", "0.14.0")).toBe(1);
    expect(semverCompare("v4.28.8", "4.28.7")).toBe(1);
    expect(semverCompare("1.2.3-beta.1", "1.2.3")).toBe(0); // prerelease stripped
    expect(semverCompare("not-a-version", "1.0.0")).toBe(null);
  });
});

describe("versionInWindow", () => {
  it("bounds versions by the [introduced, fixed) window", () => {
    expect(versionInWindow("0.13.0", "0", "0.14.0")).toBe(true);
    expect(versionInWindow("0.14.0", "0", "0.14.0")).toBe(false); // fixed is exclusive
    expect(versionInWindow("0.13.9", "0.12.0", "0.14.0")).toBe(true);
    expect(versionInWindow("0.11.0", "0.12.0", "0.14.0")).toBe(false);
    expect(versionInWindow("0.15.0", "0.12.0", "0.14.0")).toBe(false);
  });

  it("treats an open-ended introduced event (no fix released) as still affected", () => {
    expect(versionInWindow("1.9.0", "1.7.0", undefined)).toBe(true);
    expect(versionInWindow("1.6.0", "1.7.0", undefined)).toBe(false);
  });
});

describe("evaluateAdvisoryForPackage", () => {
  const record = (ranges, extra = {}) => ({
    id: "GHSA-fixture-1",
    summary: "fixture",
    affected: [
      {
        package: { name: "fixture-pkg", ecosystem: "npm" },
        ranges,
        ...extra,
      },
    ],
  });

  it("classifies an installed version inside a window as affected", () => {
    const result = evaluateAdvisoryForPackage(
      record([{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "2.0.0" }] }]),
      "fixture-pkg",
      "1.5.0",
    );
    expect(result).toBe("affected");
  });

  it("classifies an installed version past the fix as resolved (advisory history)", () => {
    const result = evaluateAdvisoryForPackage(
      record([{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "2.0.0" }] }]),
      "fixture-pkg",
      "2.0.1",
    );
    expect(result).toBe("resolved");
  });

  it("handles multiple disjoint windows and the versions-list fallback", () => {
    const multi = evaluateAdvisoryForPackage(
      record([
        { type: "SEMVER", events: [{ introduced: "1.0.0" }, { fixed: "1.2.0" }] },
        { type: "SEMVER", events: [{ introduced: "2.0.0" }, { fixed: "2.1.0" }] },
      ]),
      "fixture-pkg",
      "2.0.5",
    );
    expect(multi).toBe("affected");

    const viaVersions = evaluateAdvisoryForPackage(
      record([], { versions: ["1.0.0", "1.0.1"] }),
      "fixture-pkg",
      "1.0.1",
    );
    expect(viaVersions).toBe("affected");
  });

  it("returns null when the record carries no assessable range for the package", () => {
    expect(
      evaluateAdvisoryForPackage(
        record([{ type: "SEMVER", events: [{ introduced: "0" }] }]),
        "other-package",
        "1.0.0",
      ),
    ).toBe(null);
    expect(evaluateAdvisoryForPackage({ id: "x", affected: [] }, "fixture-pkg", "1.0.0")).toBe(null);
  });
});

describe("resolveDevClosure", () => {
  const fixtureLock = () => ({
    packages: {
      "": {
        devDependencies: {
          "vite": "^8.0.0",
          "@scope/tool": "^1.0.0",
        },
      },
      "node_modules/vite": { version: "8.0.16", dependencies: { esbuild: "^0.25.0" } },
      "node_modules/esbuild": { version: "0.25.0", optionalDependencies: { "@esbuild/win32-x64": "^0.25.0" } },
      "node_modules/@esbuild/win32-x64": { version: "0.25.0" },
      "node_modules/@scope/tool": { version: "1.2.0" },
      // A production-only package must NOT be reachable through the dev closure.
      "node_modules/react": { version: "19.0.0" },
    },
  });

  it("walks devDependencies plus transitive and optional dependencies with versions", () => {
    const closure = resolveDevClosure(fixtureLock());
    expect([...closure.keys()].sort()).toEqual(["@esbuild/win32-x64", "@scope/tool", "esbuild", "vite"]);
    expect(closure.get("vite")).toBe("8.0.16");
    expect(closure.get("esbuild")).toBe("0.25.0");
  });
});

// ---------------------------------------------------------------------------
// Prefix-mode runtime-closure fixtures
//
// The widened survey (one entry per installed COPY, nested duplicates
// included) must not silently regress. Each fixture is a hand-built lock
// exercising one npm layout hazard the closure walker has to survive.
// ---------------------------------------------------------------------------

describe("prefix-mode runtime-closure fixtures", () => {
  // A hoisted shared@2 plus a nested copy under right/ that resolves there.
  const nestedCopyLock = () => ({
    packages: {
      "": { dependencies: { left: "^1", right: "^1" } },
      "node_modules/left": { version: "1.0.0", dependencies: { shared: "^2.0.0" } },
      "node_modules/shared": { version: "2.0.0" },
      "node_modules/right": { version: "1.0.0", dependencies: { shared: "^1.5.0" } },
      "node_modules/right/node_modules/shared": { version: "1.5.0" },
    },
  });

  it("surveys every installed copy, nested duplicates included", () => {
    const closure = resolveAuditClosure(nestedCopyLock());
    expect(closure.get("shared")).toMatchObject({ name: "shared", version: "2.0.0" });
    expect(closure.get("right/node_modules/shared")).toMatchObject({ name: "shared", version: "1.5.0" });
    expect(closure.size).toBe(4); // left, right, shared, right's nested shared
  });

  it("does not confuse the nested copy's key with the hoisted package", () => {
    const closure = resolveAuditClosure(nestedCopyLock());
    // Keys are lock keys minus the leading node_modules/ - the copy is at
    // "right/node_modules/shared", NOT a bare collision on "shared".
    expect(closure.has("right/shared")).toBe(false);
    expect([...closure.keys()].filter((key) => key === "shared")).toHaveLength(1);
  });

  it("resolves a dependency through the ancestor chain, not always the top level", () => {
    // deep requires middle@2; the top level has middle@1, the nested copy is
    // under deep/. Node resolution finds the nested one.
    const lock = {
      packages: {
        "": { dependencies: { deep: "^1", middle: "^1" } },
        "node_modules/middle": { version: "1.0.0" },
        "node_modules/deep": { version: "1.0.0", dependencies: { middle: "^2.0.0" } },
        "node_modules/deep/node_modules/middle": { version: "2.0.0" },
      },
    };
    const closure = resolveAuditClosure(lock);
    expect(closure.get("deep/node_modules/middle")).toMatchObject({ name: "middle", version: "2.0.0" });
    expect(closure.get("middle")).toMatchObject({ name: "middle", version: "1.0.0" });
  });

  it("carries root optionalDependencies (platform packages) into the runtime closure", () => {
    const lock = {
      packages: {
        "": {
          dependencies: { app: "^1.0.0" },
          optionalDependencies: { "@esbuild/win32-x64": "^0.25.0" },
        },
        "node_modules/app": { version: "1.0.0" },
        "node_modules/@esbuild/win32-x64": { version: "0.25.0" },
      },
    };
    const closure = resolveAuditClosure(lock);
    expect(closure.get("@esbuild/win32-x64")).toMatchObject({ name: "@esbuild/win32-x64", version: "0.25.0" });
  });

  it("carries transitive optional platform packages (e.g. esbuild's binary) into the closure", () => {
    const lock = {
      packages: {
        "": { dependencies: { esbuild: "^0.25.0" } },
        "node_modules/esbuild": { version: "0.25.0", optionalDependencies: { "@esbuild/linux-x64": "^0.25.0" } },
        "node_modules/@esbuild/linux-x64": { version: "0.25.0" },
      },
    };
    const closure = resolveAuditClosure(lock);
    expect(closure.get("@esbuild/linux-x64")).toMatchObject({ name: "@esbuild/linux-x64", version: "0.25.0" });
  });

  it("keeps a prod-only package out of a devDependency-seeded closure", () => {
    // The manifest declares both; the audit seeds from devDependencies, so the
    // runtime-only package must NOT leak into the build-toolchain survey.
    const lock = {
      packages: {
        "": { dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^8.0.0" } },
        "node_modules/react": { version: "19.0.0", dependencies: { scheduler: "^0.26.0" } },
        "node_modules/scheduler": { version: "0.26.0" },
        "node_modules/vite": { version: "8.0.16" },
      },
    };
    const closure = resolveAuditClosure(lock);
    expect([...closure.keys()].sort()).toEqual(["vite"]);
    expect(closure.has("react")).toBe(false);
    expect(closure.has("scheduler")).toBe(false);
  });

  it("reaches a prod-only package nested under a dev tool without surveying unrelated prod roots", () => {
    // A nested prod-only package is reachable THROUGH the dev closure even
    // though the root also declares an unrelated prod dependency.
    const lock = {
      packages: {
        "": { dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^8.0.0" } },
        "node_modules/react": { version: "19.0.0" },
        "node_modules/vite": { version: "8.0.16", dependencies: { picomatch: "^4.0.0" } },
        "node_modules/vite/node_modules/picomatch": { version: "4.0.2" },
        "node_modules/picomatch": { version: "3.0.0" },
      },
    };
    const closure = resolveAuditClosure(lock);
    expect(closure.get("vite/node_modules/picomatch")).toMatchObject({ name: "picomatch", version: "4.0.2" });
    expect(closure.has("react")).toBe(false);
    // The top-level picomatch@3 is NOT a dev-closure member on its own.
    expect(closure.has("picomatch")).toBe(false);
  });

  it("seeds the runtime closure from dependencies AND optionalDependencies when no devDependencies exist", () => {
    const seeds = selectAuditClosureSeeds({
      dependencies: { express: "^5.1.0" },
      optionalDependencies: { "@esbuild/win32-x64": "^0.25.0" },
    });
    expect(seeds.sort()).toEqual(["@esbuild/win32-x64", "express"]);
  });

  it("deduplicates OSV batch queries across copies of the same package name", () => {
    const closure = resolveAuditClosure(nestedCopyLock());
    const names = [...new Set([...closure.values()].map((entry) => entry.name))];
    // Two installed copies of `shared`, one unique name for the batch query.
    expect(names.sort()).toEqual(["left", "right", "shared"]);
    expect([...closure.values()].filter((entry) => entry.name === "shared")).toHaveLength(2);
  });
});

describe("audit closure selection and cache keying", () => {
  // Mirrors a runtime package's lock (the API server): no devDependencies,
  // a few runtime deps, and a deep transitive + optional tree.
  const runtimeLock = () => ({
    packages: {
      "": {
        dependencies: {
          "@supabase/supabase-js": "^2.45.0",
          express: "^5.1.0",
        },
      },
      "node_modules/@supabase/supabase-js": { version: "2.49.4", dependencies: { "@supabase/auth-js": "^2.64.2" } },
      "node_modules/@supabase/auth-js": { version: "2.65.4" },
      "node_modules/express": { version: "5.1.0", dependencies: { bodyParser: "1.20.3" } },
      "node_modules/bodyParser": { version: "1.20.3", optionalDependencies: { iconv: "^0.2.0" } },
      "node_modules/iconv": { version: "0.2.0" },
      // A dev-only tool that must NOT be reachable through the runtime closure.
      "node_modules/vitest": { version: "4.1.8" },
    },
  });

  it("selectAuditClosureSeeds prefers devDependencies when the manifest declares them", () => {
    expect(selectAuditClosureSeeds({ devDependencies: { vite: "^8.0.0" }, dependencies: { react: "^19" } })).toEqual(["vite"]);
  });

  it("selectAuditClosureSeeds falls back to runtime dependencies for a runtime package", () => {
    expect(selectAuditClosureSeeds({ dependencies: { express: "^5.1.0" } })).toEqual(["express"]);
    expect(selectAuditClosureSeeds({})).toEqual([]);
  });

  it("resolveAuditClosure walks the FULL runtime dependency closure when no devDependencies exist", () => {
    const closure = resolveAuditClosure(runtimeLock());
    // Every runtime-transitive and optional package is in; the dev tool is not.
    expect([...closure.keys()].sort()).toEqual(["@supabase/auth-js", "@supabase/supabase-js", "bodyParser", "express", "iconv"]);
    expect(closure.has("vitest")).toBe(false);
  });

  it("resolveAuditClosure still audits only the dev toolchain when devDependencies exist", () => {
    const lock = {
      packages: {
        "": { dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^8.0.0" } },
        "node_modules/react": { version: "19.0.0" },
        "node_modules/vite": { version: "8.0.16", dependencies: { esbuild: "^0.25.0" } },
        "node_modules/esbuild": { version: "0.25.0" },
      },
    };
    const closure = resolveAuditClosure(lock);
    expect([...closure.keys()].sort()).toEqual(["esbuild", "vite"]);
  });

  it("lockCacheHash separates closures with identical lock bytes", () => {
    const bytes = "{}";
    expect(lockCacheHash(bytes, "root")).not.toBe(lockCacheHash(bytes, "prefix:server/package-lock.json"));
  });

  it("lockCacheHash is stable for the same lock bytes and label", () => {
    expect(lockCacheHash("abc", "root")).toBe(lockCacheHash("abc", "root"));
    expect(lockCacheHash("abc", "prefix:server/package-lock.json")).toBe(lockCacheHash("abc", "prefix:server/package-lock.json"));
  });
});

describe("exception expiry helpers", () => {
  it("evaluates ok / due-for-renewal / expired states", () => {
    const exception = { advisory: "GHSA-x", expiresOn: "2026-09-20" };
    expect(evaluateExceptionExpiry(exception, "2026-08-01")).toBe("ok");
    expect(evaluateExceptionExpiry(exception, "2026-09-10")).toBe("due-for-renewal"); // inside 14d
    expect(evaluateExceptionExpiry(exception, "2026-09-21")).toBe("expired");
    expect(evaluateExceptionExpiry({ advisory: "GHSA-x" }, "2026-01-01")).toBe("expired");
  });

  it("computes whole-day distances", () => {
    expect(daysUntilExpiry("2026-09-20", "2026-09-01")).toBe(19);
    expect(daysUntilExpiry("2026-09-20", "2026-09-20")).toBe(0);
    expect(daysUntilExpiry("2026-09-19", "2026-09-20")).toBe(-1);
  });
});
