import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/productIntelligenceIndexSample.json";
import {
  mapRealCatalogEntryToCompareCandidate,
  type ProductIntelligenceIndexEntry,
} from "../pages/ComparePageNew.advanced";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import { resolveCompetitorSpecProfile } from "./competitorSpecRegistry";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";
import { runCompareRuntimePipeline } from "./compareRuntimePipeline";

const entries = fixture.products as unknown as ProductIntelligenceIndexEntry[];

function realSplitter() {
  const entry = entries.find((item) => item.sku === "SP-0104-H2");
  if (!entry) throw new Error("SP-0104-H2 missing from real-catalog fixture");

  const candidate = mapRealCatalogEntryToCompareCandidate(entry);
  if (!candidate) throw new Error("SP-0104-H2 was rejected by real-catalog mapping");

  return candidate;
}

describe("AT-HDDA-4 against the actual WyreStorm catalogue shape", () => {
  it("builds SP-0104-H2 as a complete 1x4 distribution profile", () => {
    const profile = buildWyrestormCompareProfile(realSplitter() as any);

    expect(profile.domain).toBe("DISTRIBUTION");
    expect(profile.role).toBe("distribution amplifier");
    expect(profile.inputCount).toBe(1);
    expect(profile.outputCount).toBe(4);
    expect(profile.specs?.hdmiInputs).toBe(1);
    expect(profile.specs?.hdmiOutputs).toBe(4);
    expect(profile.specs?.hdmiLoopOutputs).toBeUndefined();
  });

  it("does not classify the real SP-0104-H2 profile as NO MATCH", () => {
    const competitor = resolveCompetitorSpecProfile("AT-HDDA-4", "Atlona");
    const wyrestorm = buildWyrestormCompareProfile(realSplitter() as any);

    const decision = classifyCompetitorCompareDecision({
      competitor,
      wyrestorm,
      score: 90,
      evidence: [
        "Both products are 1x4 HDMI distribution amplifiers.",
        "Both use one-source mirrored-output topology.",
      ],
    } as any);

    if (decision.outcome === "NO MATCH") {
      console.log(
        "AT-HDDA-4 DIRECT CLASSIFIER FAILURE",
        JSON.stringify(
          {
            competitor: {
              domain: competitor.domain,
              role: competitor.role,
              inputCount: competitor.inputCount,
              outputCount: competitor.outputCount,
              transport: competitor.transport,
              specs: competitor.specs,
            },
            wyrestorm: {
              domain: wyrestorm.domain,
              role: wyrestorm.role,
              inputCount: wyrestorm.inputCount,
              outputCount: wyrestorm.outputCount,
              transport: wyrestorm.transport,
              specs: wyrestorm.specs,
            },
            decision,
          },
          null,
          2,
        ),
      );
    }

    expect(decision.outcome).not.toBe("NO MATCH");
  });

  it("keeps SP-0104-H2 in runtime matches using the real catalogue candidate shape", () => {
    const result = runCompareRuntimePipeline(
      "Atlona AT-HDDA-4",
      [realSplitter() as any],
      "Atlona",
      8,
    ) as any;

    const candidate = (result.matches ?? []).find(
      (match: any) => String(match.sku).toUpperCase() === "SP-0104-H2",
    );

    if (!candidate) {
      console.log(
        "AT-HDDA-4 REAL-CATALOG RUNTIME FAILURE",
        JSON.stringify(
          {
            competitor: result.competitor,
            topOutcome: result.topOutcome,
            recommendation: result.recommendation,
            matches: result.matches,
            rejected: result.rejected,
          },
          null,
          2,
        ),
      );
    }

    expect(candidate).toBeTruthy();
    expect(candidate?.decision?.outcome).not.toBe("NO MATCH");
    expect(candidate?.compareEligibility?.eligibility).toBe("direct");
  });
});
