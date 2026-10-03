import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PRODUCT_STORIES } from "../wingman2/data/productStories";
import canonicalStore from "../../data/wingman-canonical-product-store.json";

// Coverage ratchet. Governed product stories are the "high confidence" sales copy
// (everything else falls back to auto-generated positioning flagged for review in
// the UI). These baselines can only be RAISED: the point is that coverage never
// silently regresses and the gap stays visible and managed.
const MIN_TOTAL_STORIES = 130;
// Every ACTIVE catalogue SKU now has a governed story (catalogue-grounded copy was
// authored for the whole active range, alias-deduped; cables, discontinued and
// do-not-spec SKUs are deliberately excluded per productStoriesLifecycle). 96 is
// the raw-match count against this static 2026 snapshot (aliases such as
// NHD-610-TX -> NHD-610-TX-V2 resolve at runtime but not in this direct count).
const MIN_CATALOG_SKUS_COVERED = 104;

const repoRoot = process.cwd();
const auditPath = path.join(repoRoot, "tools", "audit-product-story-coverage.mjs");
const backlogPath = path.join(repoRoot, "docs", "product-story-coverage-backlog.md");
const policyPath = path.join(repoRoot, "data", "product-story-coverage-policy.json");

// Ratchet: the active lead-story backlog is now empty - governed stories were
// authored for the last five uncovered active SKUs (APO-210-UC, EX-100-G2,
// EX-100-H2-EARC, EX-100-IW-USBC, SW-620-TX-W), taking active coverage to 100%.
// This must only ever move toward empty; a new entry here means an active SKU
// lost or never gained a governed story.
const EXPECTED_ACTIVE_BACKLOG: string[] = [];

const EXPECTED_DEPENDENCY_CLASSIFICATIONS = new Map([
  ["CAB-HAOC-FRL-XX", "cable"],
  ["CAB-HAOC-XX", "cable"],
  ["CAB-HAOC-XX-C", "cable"],
  ["CAB-HAOC-XX-P", "cable"],
  ["NHD-124-RACK-1U", "rack"],
]);

type DependencyPolicyEntry = {
  sku: string;
  classification: string;
  reason: string;
};

type CoveragePolicy = {
  schemaVersion: number;
  dependencyOnly: DependencyPolicyEntry[];
};

function catalogSkus(): string[] {
  return (canonicalStore.products as Array<{ sku?: string; doNotSpec?: boolean }>)
    .filter((entry) => entry.doNotSpec !== true)
    .map((entry) => String(entry.sku ?? "").toUpperCase())
    .filter(Boolean);
}

function readCoveragePolicy(): CoveragePolicy {
  return JSON.parse(fs.readFileSync(policyPath, "utf8")) as CoveragePolicy;
}

function runCoverageAudit(): string {
  return execFileSync(process.execPath, [auditPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function readActiveBacklog(document: string): string[] {
  const afterHeading = document.split("## Active SKUs still needing a governed story")[1] ?? "";
  const section = afterHeading.split("## Dependency-only exclusions")[0] ?? "";
  return [...section.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1].trim());
}

describe("product story coverage ratchet", () => {
  it("never drops below the governed-story baseline", () => {
    expect(PRODUCT_STORIES.length).toBeGreaterThanOrEqual(MIN_TOTAL_STORIES);
  });

  it("has no duplicate story SKUs", () => {
    const skus = PRODUCT_STORIES.map((story) => story.sku.toUpperCase());
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("keeps at least the baseline number of live-catalogue SKUs governed", () => {
    const stories = new Set(PRODUCT_STORIES.map((story) => story.sku.toUpperCase()));
    const covered = catalogSkus().filter((sku) => stories.has(sku));
    expect(covered.length).toBeGreaterThanOrEqual(MIN_CATALOG_SKUS_COVERED);
  });
});

describe("product story backlog hygiene", () => {
  it("uses governed classifications for cable and rack dependencies", () => {
    const policy = readCoveragePolicy();
    expect(policy.schemaVersion).toBe(1);

    const bySku = new Map(
      policy.dependencyOnly.map((entry) => [entry.sku.toUpperCase(), entry]),
    );

    for (const [sku, classification] of EXPECTED_DEPENDENCY_CLASSIFICATIONS) {
      expect(bySku.get(sku)?.classification).toBe(classification);
      expect(bySku.get(sku)?.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps dependency-only products in the canonical catalogue", () => {
    const catalogue = new Set(catalogSkus());
    for (const sku of EXPECTED_DEPENDENCY_CLASSIFICATIONS.keys()) {
      expect(catalogue.has(sku)).toBe(true);
    }
  });

  it("reports only genuine uncovered lead products with deterministic counts", () => {
    // The audit script writes docs/product-story-coverage-backlog.md for real
    // (it's the same tool `npm run audit:story-coverage` runs), and it fully
    // overwrites that file rather than preserving the separate
    // "<!-- lifecycle-manual-decisions -->" section that
    // `npm run lifecycle:manual-decisions` appends afterwards. Running this
    // test standalone would otherwise leave the tracked doc missing that
    // section. Snapshot and restore it so this test's real side effect never
    // leaks into the working tree, regardless of what order/isolation it runs
    // under.
    const originalDocument = fs.readFileSync(backlogPath, "utf8");
    try {
      const firstOutput = runCoverageAudit();
      const firstDocument = fs.readFileSync(backlogPath, "utf8");
      const secondOutput = runCoverageAudit();
      const secondDocument = fs.readFileSync(backlogPath, "utf8");

      expect(secondOutput).toBe(firstOutput);
      expect(secondDocument).toBe(firstDocument);
      expect(readActiveBacklog(firstDocument)).toEqual(EXPECTED_ACTIVE_BACKLOG);

      for (const sku of EXPECTED_DEPENDENCY_CLASSIFICATIONS.keys()) {
        expect(readActiveBacklog(firstDocument)).not.toContain(sku);
      }

      expect(firstDocument).toContain("Active catalogue SKUs (alias-deduped): **137**");
      expect(firstDocument).toContain("Active covered: **137 (100%)** · Active uncovered: **0**");
      expect(firstDocument).toContain("cable **34**, dependency-only **1**");
      expect(firstDocument).toContain("NHD-124-RACK-1U — rack:");
    } finally {
      fs.writeFileSync(backlogPath, originalDocument);
    }
  });
});
