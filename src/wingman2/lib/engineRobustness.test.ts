import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildSystemDesign,
  parseCount,
  productMatchesSlot,
} from "./discoverySystemDesign";
import {
  resolveRoleFromClassification,
  resolveRoleFromText,
} from "./productRoleResolution";
import {
  buildProductNarrative,
  buildProductFeatureBenefits,
  extractRawProducts,
  normaliseProductRecord,
  resolveProductRoleWithEvidence,
} from "./productStoryEngine";
import { gateCompareCandidate } from "./compareCandidateGate";
import type { StoredDiscoveryBrief } from "../data/projectStore";
import { fullProductIndexRecords } from "./testHelpers/fullProductIndexRecords";

// Robustness suite.
//
// Wingman's job is to be accurate about products. Every engine here is fed
// data that arrives from generated files, localStorage, free-text answers and
// live lookups - none of which is guaranteed to be well formed. These tests
// assert the engines degrade rather than throw, never invent a confident
// answer from missing input, and stay self-consistent across the whole real
// catalogue rather than on one hand-picked SKU.

const rawProducts = extractRawProducts(
  { products: fullProductIndexRecords },
) as Array<Record<string, unknown>>;

const specs = rawProducts
  .map((raw, index) => normaliseProductRecord(raw, index))
  .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec));

// Values that have actually reached these functions in this codebase: missing
// keys, nulls from JSON, empty strings from unanswered questions, and the
// wrong shape entirely.
const HOSTILE_VALUES: unknown[] = [
  undefined,
  null,
  "",
  "   ",
  0,
  -1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  [],
  {},
  { sku: null },
  "not sure",
  "<script>alert(1)</script>",
  "4; DROP TABLE products",
  "\u0000\u0001",
  "a".repeat(10_000),
];

describe("every engine survives hostile input", () => {
  it("parseCount never throws and never returns a nonsense count", () => {
    for (const value of HOSTILE_VALUES) {
      const result = parseCount(value);
      expect(result === null || (Number.isInteger(result) && result > 0), String(value)).toBe(true);
    }
  });

  it("buildSystemDesign never throws, whatever the brief looks like", () => {
    for (const value of HOSTILE_VALUES) {
      expect(() => buildSystemDesign(value as StoredDiscoveryBrief), String(value)).not.toThrow();
      expect(() =>
        buildSystemDesign({ roomModel: value } as unknown as StoredDiscoveryBrief),
      ).not.toThrow();
    }
  });

  it("a system design never emits a slot with a nonsense quantity", () => {
    for (const value of HOSTILE_VALUES) {
      const design = buildSystemDesign({
        roomModel: { sourceCount: value, displayCount: value, application: "distributed" },
      } as unknown as StoredDiscoveryBrief);

      for (const slot of design.slots) {
        expect(Number.isInteger(slot.quantity), `${String(value)} -> ${slot.kind}`).toBe(true);
        expect(slot.quantity, `${String(value)} -> ${slot.kind}`).toBeGreaterThan(0);
      }
    }
  });

  it("role resolution never throws and always returns a known role", () => {
    const known = new Set([
      "camera", "audio", "avoip", "matrix", "multiview",
      "videoWall", "presentation", "extension", "wireless", "general",
    ]);

    for (const value of HOSTILE_VALUES) {
      expect(() => resolveRoleFromText(String(value), String(value))).not.toThrow();
      expect(known.has(resolveRoleFromText(String(value), String(value)))).toBe(true);
      expect(() => resolveRoleFromClassification(value as never)).not.toThrow();
    }
  });

  it("the compare gate never throws on a malformed candidate", () => {
    for (const value of HOSTILE_VALUES) {
      expect(() =>
        gateCompareCandidate(value as never, { competitorClass: "UNKNOWN" }),
      ).not.toThrow();
      expect(() =>
        gateCompareCandidate({ sku: String(value), title: String(value) }, {
          competitorClass: "AVOIP",
        }),
      ).not.toThrow();
    }
  });

  it("slot matching rejects rather than throws on malformed classification", () => {
    const design = buildSystemDesign({
      roomModel: { application: "distributed", sourceCount: "2", displayCount: "4" },
    } as unknown as StoredDiscoveryBrief);

    for (const slot of design.slots) {
      for (const value of HOSTILE_VALUES) {
        expect(() => productMatchesSlot(value as never, slot)).not.toThrow();
      }
      expect(productMatchesSlot({ subClassifications: [] }, slot)).toBe(false);
    }
  });
});

describe("the whole catalogue stays self-consistent", () => {
  it("builds a narrative for every single product without throwing", () => {
    const failures: string[] = [];

    for (const spec of specs) {
      try {
        const narrative = buildProductNarrative(spec);
        if (!narrative.whyItHelps?.trim()) failures.push(`${spec.sku}: empty whyItHelps`);
      } catch (error) {
        failures.push(`${spec.sku}: threw ${(error as Error).message}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("never emits a feature benefit that is not grounded in the product spec", () => {
    const offenders: string[] = [];

    for (const spec of specs) {
      const benefits = buildProductFeatureBenefits(spec);
      const grounded = [...spec.video, ...spec.audio, spec.description].join(" ").toLowerCase();

      for (const benefit of benefits) {
        const token = benefit.split(" - ")[0]?.trim().toLowerCase();
        if (!token) continue;
        // The claimed capability must appear in the product's own resolved
        // spec, not in a family-level tag pool.
        if (!grounded.includes(token)) offenders.push(`${spec.sku}: "${token}" not in spec`);
      }
    }

    expect(offenders.slice(0, 20)).toEqual([]);
  });

  it("resolves every product to exactly one role, from the taxonomy", () => {
    const guessed: string[] = [];

    for (const spec of specs) {
      const resolution = resolveProductRoleWithEvidence(spec);
      if (resolution.needsReview) guessed.push(spec.sku);
      expect(resolution.evidence.trim().length, spec.sku).toBeGreaterThan(0);
    }

    expect(guessed).toEqual([]);
  });

  it("resolves the same role every time it is asked", () => {
    // Guards against any hidden dependence on call order or shared state.
    for (const spec of specs.slice(0, 60)) {
      const first = resolveProductRoleWithEvidence(spec).role;
      const second = resolveProductRoleWithEvidence(spec).role;
      const third = resolveProductRoleWithEvidence({ ...spec }).role;
      expect(`${first}/${second}/${third}`, spec.sku).toBe(`${first}/${first}/${first}`);
    }
  });

  it("gives no product two contradictory compare classes", () => {
    const contradictions: string[] = [];

    for (const raw of rawProducts) {
      const classification = (raw as { productClassification?: { subClassifications?: string[] } })
        .productClassification;
      const candidate = {
        sku: String(raw.sku ?? ""),
        title: String(raw.name ?? ""),
        classification,
      };

      const withTaxonomy = gateCompareCandidate(candidate, { competitorClass: "UNKNOWN" }).candidateClass;
      const repeated = gateCompareCandidate(candidate, { competitorClass: "UNKNOWN" }).candidateClass;

      if (withTaxonomy !== repeated) contradictions.push(`${raw.sku}: ${withTaxonomy} then ${repeated}`);
    }

    expect(contradictions).toEqual([]);
  });
});

describe("a room design never quietly loses a required part", () => {
  const scenarios: Array<{ name: string; roomModel: Record<string, unknown>; mustInclude: string[] }> = [
    {
      name: "distributed campus",
      roomModel: { application: "distributed AV", sourceCount: "6", displayCount: "20" },
      mustInclude: ["avoip-encoder", "avoip-decoder", "avoip-control"],
    },
    {
      name: "matrix room with a long run",
      roomModel: { sourceCount: "4", displayCount: "4", cableRun: "80m" },
      mustInclude: ["matrix", "extension"],
    },
    {
      name: "UC meeting room",
      roomModel: { sourceCount: "2", displayCount: "1", unifiedCommunicationsRequirement: "Yes - Teams" },
      mustInclude: ["camera", "microphone"],
    },
    {
      name: "video wall",
      roomModel: { application: "LED video wall in reception", sourceCount: "2", displayCount: "9" },
      mustInclude: ["wall-processor"],
    },
  ];

  for (const scenario of scenarios) {
    it(`keeps every required slot for: ${scenario.name}`, () => {
      const design = buildSystemDesign({ roomModel: scenario.roomModel } as unknown as StoredDiscoveryBrief);
      const kinds = design.slots.map((slot) => slot.kind);

      for (const required of scenario.mustInclude) {
        expect(kinds, `${scenario.name} lost ${required}`).toContain(required);
      }
    });

    it(`fills every slot it declares for: ${scenario.name}`, () => {
      const design = buildSystemDesign({ roomModel: scenario.roomModel } as unknown as StoredDiscoveryBrief);
      const unfilled = design.slots.filter(
        (slot) =>
          !rawProducts.some((raw) =>
            productMatchesSlot(
              (raw as { productClassification?: never }).productClassification,
              slot,
            ),
          ),
      );

      expect(unfilled.map((slot) => slot.kind), scenario.name).toEqual([]);
    });
  }
});
