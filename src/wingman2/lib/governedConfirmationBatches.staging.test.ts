import { describe, expect, it } from "vitest";
import lifecycleSource from "../../../data-sources/wyrestorm/lifecycle.csv?raw";
import productsSource from "../../../data-sources/wyrestorm/products.csv?raw";
import governedProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import groupingsFile from "./governedConfirmationBatches.json";
import { confirmationGroupForSku, confirmationGroups, type GroupingKind } from "./governedConfirmationBatches";

/**
 * Pass-4 staging parity: the S1–S7 staging batches in
 * governedConfirmationBatches.json must stay a byte-faithful partition of the
 * store SKUs that have no governed profile. The batch file is generated from
 * the tracked sources (canonical store × lifecycle minus the governed set),
 * so these tests recompute the partition from those same tracked sources and
 * fail if the staging data drifts — the doc/JSON pair cannot silently rot
 * when the catalogue or the governed set changes.
 */

type LifecycleStatus = "active" | "do-not-spec" | "discontinued";

function parseCsv(source: string): Array<Record<string, string>> {
  const text = source.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else current += char;
    }
    values.push(current);
    const row: Record<string, string> = {};
    header.forEach((name, index) => {
      row[name] = (values[index] ?? "").replace(/^"|"$/g, "").trim();
    });
    return row;
  });
}

const lifecycleBySku = new Map(
  parseCsv(lifecycleSource).map((row) => [row.sku.toUpperCase(), row.lifecycle_status as LifecycleStatus]),
);
const storeSkus = parseCsv(productsSource).map((row) => row.sku).filter(Boolean);

// The governed set itself is read through the real profiles JSON so the
// expected partition is computed from exactly the sources the generator used.
const governedSet = new Set(
  ((governedProfiles as { profiles?: Array<{ sku?: string }> }).profiles ?? [])
    .map((profile) => String(profile.sku ?? ""))
    .filter(Boolean),
);

const expectedStaged = storeSkus.filter((sku) => !governedSet.has(sku));

describe("pass-4 staging grouping (store SKUs without governed profiles)", () => {
  it("exposes the staging kind with the seven generated batches", () => {
    const groups = confirmationGroups("staging");
    expect(groups.map((group) => group.id)).toEqual(["S1", "S2", "S3", "S4", "S5", "S6", "S7"]);
    expect(groups.map((group) => group.skus.length)).toEqual([17, 4, 10, 32, 16, 22, 28]);
  });

  it("partitions the staged SKUs exactly: every store SKU without a governed profile, and nothing else", () => {
    const groups = confirmationGroups("staging");
    const staged = groups.flatMap((group) => group.skus);
    expect(new Set(staged).size).toBe(staged.length);
    expect(new Set(staged)).toEqual(new Set(expectedStaged));
    expect(expectedStaged.length).toBe(129);
  });

  it("splits the partition on lifecycle the way the triage doc records it", () => {
    const groups = confirmationGroups("staging");
    const skusOf = (id: string) => new Set(groups.find((group) => group.id === id)?.skus ?? []);

    // S1 is exactly the lifecycle-active staged SKUs.
    const active = storeSkus.filter((sku) => lifecycleBySku.get(sku.toUpperCase()) === "active" && !governedSet.has(sku));
    expect(skusOf("S1")).toEqual(new Set(active));
    expect(active.length).toBe(17);

    // S2-S4 are the do-not-spec SKUs; S5-S7 the discontinued ones - batch
    // counts from the triage table.
    const doNotSpec = storeSkus.filter((sku) => lifecycleBySku.get(sku.toUpperCase()) === "do-not-spec" && !governedSet.has(sku));
    const discontinued = storeSkus.filter((sku) => lifecycleBySku.get(sku.toUpperCase()) === "discontinued" && !governedSet.has(sku));
    expect(doNotSpec.length).toBe(46);
    expect(discontinued.length).toBe(66);
    const dnsCount = (id: string) => groups.find((group) => group.id === id)!.skus.filter((sku) => doNotSpec.includes(sku)).length;
    const discCount = (id: string) => groups.find((group) => group.id === id)!.skus.filter((sku) => discontinued.includes(sku)).length;
    expect(dnsCount("S2") + dnsCount("S3") + dnsCount("S4")).toBe(46);
    expect(discCount("S5") + discCount("S6") + discCount("S7")).toBe(66);
    expect(discCount("S2") + discCount("S3") + discCount("S4")).toBe(0);
    expect(dnsCount("S5") + dnsCount("S6") + dnsCount("S7")).toBe(0);
  });

  it("resolves membership for staged SKUs even though no governed profile exists yet", () => {
    expect(confirmationGroupForSku("CAB-HAOC-FRL-XX", "staging")).toBe("S1");
    expect(confirmationGroupForSku("WYRERING", "staging")).toBe("S4");
    expect(confirmationGroupForSku("USB-HUB4", "staging")).toBe("S1");
    // Unknown to every grouping.
    expect(confirmationGroupForSku("NOT-A-REAL-SKU", "staging")).toBeNull();
    // The pre-existing kinds keep their governed-only behaviour via the same
    // membership rule (their triage lists happen to be fully governed).
    expect(confirmationGroupForSku("CAB-HAOC-10", "batches")).toBe("R1");
    expect(confirmationGroupForSku("FOCUS-200", "families")).toBe("T8");
  });

  it("keeps the batch/family triage groupings unchanged by the staging data", () => {
    for (const kind of ["batches", "families"] as GroupingKind[]) {
      const groups = confirmationGroups(kind);
      const total = groups.flatMap((group) => group.skus);
      expect(new Set(total).size).toBe(90);
    }
  });

  it("documents its generation source", () => {
    const file = groupingsFile as { stagingSource?: string; stagingGroupings?: unknown };
    expect(file.stagingSource).toContain("docs/governed-profile-confirmation-triage-2026-09-30.md");
    expect(file.stagingGroupings).toBeDefined();
  });
});
