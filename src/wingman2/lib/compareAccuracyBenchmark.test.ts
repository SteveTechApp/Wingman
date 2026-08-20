import { describe, expect, it } from "vitest";
import rawProductIndex from "../../../public/product-intelligence-index.json";
import goldenSet from "../data/compareAccuracyGoldenSet.json";
import {
  normaliseCompareProducts,
  runCompareRuntimePipeline,
} from "./compareRuntimePipeline";
import { isBannedNetworkHdSku } from "./networkHdAvoipEquivalence";

type AnyRecord = Record<string, any>;

type GoldenScenario = {
  id: string;
  lane: string;
  input: string;
  brand?: string;
  outcomeNotNone?: boolean;
  matchesEmpty?: boolean;
  leadPattern?: string;
  requiredAnyPatterns?: string[];
  forbiddenPatterns?: string[];
  forbiddenTopNPatterns?: Array<{ pattern: string; topN: number }>;
  forbiddenLeadPatterns?: string[];
  forbiddenOutcomes?: string[];
  companionRequired?: boolean;
};

const products: AnyRecord[] = normaliseCompareProducts(rawProductIndex);
const scenarios = goldenSet as GoldenScenario[];

function sku(value: AnyRecord | undefined): string {
  return String(value?.sku ?? value?.wyrestorm?.sku ?? "").toUpperCase();
}

function skus(items: AnyRecord[] | undefined): string[] {
  return (items ?? []).map((item) => sku(item)).filter(Boolean);
}

function matchesPattern(value: string, pattern: string): boolean {
  return new RegExp(pattern, "i").test(value);
}

describe("Compare accuracy golden benchmark", () => {
  it("covers the required architecture lanes", () => {
    const lanes = new Set(scenarios.map((scenario) => scenario.lane));

    for (const required of [
      "AVoIP",
      "Matrix",
      "Extender",
      "Presentation",
      "Wireless",
      "Camera",
      "Video wall",
      "Multiview",
      "Control",
      "Audio",
    ]) {
      expect(lanes.has(required), `missing benchmark lane: ${required}`).toBe(true);
    }

    expect(scenarios.length).toBeGreaterThanOrEqual(20);
  });

  for (const scenario of scenarios) {
    it(`${scenario.lane}: ${scenario.id}`, () => {
      const result = runCompareRuntimePipeline(
        scenario.input,
        products,
        scenario.brand,
        12,
      ) as AnyRecord;

      const matchSkus = skus(result.matches);
      const lead = matchSkus[0] ?? "";

      for (const candidate of matchSkus) {
        if (candidate.startsWith("NHD-")) {
          expect(
            isBannedNetworkHdSku(candidate),
            `${scenario.id}: banned NetworkHD candidate ${candidate}`,
          ).toBe(false);
        }
      }

      if (scenario.matchesEmpty) {
        expect(
          matchSkus,
          `${scenario.id}: expected a fail-closed empty match set`,
        ).toEqual([]);
        return;
      }

      if (scenario.outcomeNotNone) {
        expect(
          result.topOutcome,
          `${scenario.id}: false No Match / NONE outcome`,
        ).not.toBe("NONE");
        expect(
          matchSkus.length,
          `${scenario.id}: expected at least one viable candidate`,
        ).toBeGreaterThan(0);
      }

      if (scenario.leadPattern) {
        expect(
          matchesPattern(lead, scenario.leadPattern),
          `${scenario.id}: lead ${lead || "<none>"} did not match ${scenario.leadPattern}`,
        ).toBe(true);
      }

      if ((scenario.requiredAnyPatterns ?? []).length > 0) {
        const patterns = scenario.requiredAnyPatterns ?? [];
        expect(
          matchSkus.slice(0, 8).some((candidate) =>
            patterns.some((pattern) => matchesPattern(candidate, pattern)),
          ),
          `${scenario.id}: expected one top-eight candidate matching any of ${patterns.join(", ")}; got ${matchSkus.slice(0, 8).join(", ")}`,
        ).toBe(true);
      }

      for (const pattern of scenario.forbiddenPatterns ?? []) {
        expect(
          matchSkus.slice(0, 8).some((candidate) =>
            matchesPattern(candidate, pattern),
          ),
          `${scenario.id}: forbidden candidate pattern ${pattern} surfaced in ${matchSkus.slice(0, 8).join(", ")}`,
        ).toBe(false);
      }

      for (const rule of scenario.forbiddenTopNPatterns ?? []) {
        expect(
          matchSkus.slice(0, rule.topN).some((candidate) =>
            matchesPattern(candidate, rule.pattern),
          ),
          `${scenario.id}: forbidden pattern ${rule.pattern} surfaced inside top ${rule.topN}: ${matchSkus.slice(0, rule.topN).join(", ")}`,
        ).toBe(false);
      }
      for (const pattern of scenario.forbiddenLeadPatterns ?? []) {
        expect(
          matchesPattern(lead, pattern),
          `${scenario.id}: forbidden lead pattern ${pattern} matched ${lead || "<none>"}`,
        ).toBe(false);
      }

      for (const outcome of scenario.forbiddenOutcomes ?? []) {
        expect(
          String(result.topOutcome ?? ""),
          `${scenario.id}: unsafe outcome ${outcome}`,
        ).not.toBe(outcome);
      }

      if (scenario.companionRequired) {
        const leadMatch = (result.matches as AnyRecord[] | undefined)?.find(
          (match) => sku(match) === lead,
        );
        const companionSkus = Array.isArray(leadMatch?.requiredCompanionSkus)
          ? leadMatch.requiredCompanionSkus.map((value: unknown) =>
              String(value).toUpperCase(),
            )
          : [];

        expect(
          companionSkus.some((candidate: string) =>
            [
              "SW-620-TX-W",
              "SW-640L-TX-W",
              "APO-VX20-UC-V2",
            ].includes(candidate),
          ),
          `${scenario.id}: DG2 lead is missing its required compatible room-core dependency`,
        ).toBe(true);
      }
    }, 15000);
  }
});