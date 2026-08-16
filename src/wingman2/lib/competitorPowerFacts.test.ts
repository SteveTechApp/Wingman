import { describe, expect, it } from "vitest";
import {
  resolveCompetitorSpecProfile,
  validateCuratedFingerprints,
} from "./competitorSpecRegistry";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import index from "../../../public/product-intelligence-index.json";

// Competitor power program (2026-08): curated competitor rows carry power
// facts as a nested free-form object ({"poe": "..."}, {"dc": "12V"},
// {"input": "External universal 100-240 VAC supply"}). The compare decision
// engine reads FLAT CompareSpecFacts keys (poe/poc/poh/internalPsu/
// externalPsu/powerSupply), so the nested facts previously never reached the
// "power method verified" gate and every approved competitor row failed it.
// flattenCompetitorPowerFacts() now converts the curated facts into the
// decision-readable keys, and the Barco wireless leads gained evidence-sourced
// power facts (external 12V DC 2A adapter per Barco spare part B563182K,
// 19V 4.74A for CX-50 Gen2, USB-C PD on Gen2s) plus a transport accuracy fix
// (Local -> Wireless, matching every sibling row and official product page).

function indexProduct(sku: string): Record<string, unknown> | undefined {
  const entries = (index as { products?: Array<Record<string, unknown>> }).products ?? [];
  return entries.find((product) => String(product.sku ?? "").toUpperCase() === sku);
}

describe("competitor power facts", () => {
  it("flattens nested curated power facts into decision-readable keys", () => {
    // Barco CX-30: external adapter facts added by the program.
    const cx30 = resolveCompetitorSpecProfile("CLICKSHARE-CX-30", "Barco");
    expect(cx30.specTier).toBe("verified-profile");
    expect(cx30.specs?.externalPsu).toBe(true);
    expect(cx30.specs?.powerSupply).toContain("12V DC 2A external adapter");
    // The transport accuracy fix: wireless conferencing hub, not "Local".
    expect(cx30.transport).toBe("Wireless");

    // Airtame Hub: nested {poe: "46-57V, 30W max"} -> flat poe.
    const hub = resolveCompetitorSpecProfile("Airtame Hub", "Airtame");
    expect(hub.specs?.poe).toBe(true);
    expect(hub.specs?.powerSupply).toBe("PoE");

    // AMX NX-1200: {dc: "12V", currentMa: 200} -> external PSU, not invented.
    const nx1200 = resolveCompetitorSpecProfile("NX-1200", "AMX");
    expect(nx1200.specs?.externalPsu).toBe(true);
    expect(nx1200.specs?.powerSupply).toBe("12V DC external PSU");

    // Crestron DM-MD8X8-CPU3: {input: "Chassis AC mains..."} -> internal PSU.
    const dm = resolveCompetitorSpecProfile("DM-MD8X8-CPU3", "Crestron");
    expect(dm.specs?.internalPsu).toBe(true);
    expect(dm.specs?.powerSupply).toContain("Chassis AC mains");
  });

  it("never infers a power method from consumption-only facts", () => {
    // Lightware DA4-HDMI20-C carries only {maxWatts: 2.5} with no power
    // method anywhere in its summary - consumption is not a method, so no
    // flat power key may be set and the power gate stays honestly open.
    const da4 = resolveCompetitorSpecProfile("DA4-HDMI20-C", "Lightware");
    expect(da4.specs?.externalPsu).toBeUndefined();
    // The blob parser emits an explicit false default; the power gate reads
    // falsy as absent, so what matters is that no method is claimed.
    expect(da4.specs?.poe).toBeFalsy();
    expect(da4.specs?.poc).toBeFalsy();
    expect(da4.specs?.poh).toBeFalsy();
    expect(da4.specs?.powerSupply).toBeUndefined();
  });

  it("keeps the curated fingerprint integrity gate green", () => {
    expect(validateCuratedFingerprints()).toEqual([]);
  });

  it("reaches PARTIAL MATCH for the headline CLICKSHARE-CX-30 vs SW-620-TX-W compare", () => {
    const competitor = resolveCompetitorSpecProfile("CLICKSHARE-CX-30", "Barco");
    const sw620 = indexProduct("SW-620-TX-W");
    expect(sw620).toBeTruthy();
    const wyrestorm = buildWyrestormCompareProfile(sw620 as never);

    const result = classifyCompetitorCompareDecision({
      // scoreToBaseConfidence() upper band: 55 + 80*0.4 = 87; a strong match
      // scores at the top of that band.
      score: 88,
      competitor: {
        sku: competitor.sku,
        domain: competitor.domain,
        role: competitor.role,
        transport: competitor.transport,
        inputCount: competitor.inputCount,
        outputCount: competitor.outputCount,
        maxResolution: competitor.maxResolution,
        chroma: competitor.chroma,
        features: competitor.features,
        specs: competitor.specs,
        specTier: competitor.specTier,
      },
      wyrestorm,
      warnings: [
        "Confirm the current specification and required accessories against the datasheet before quoting.",
        "Confirm mandatory features against current datasheets before quoting.",
      ],
    });

    expect(result.outcome).toBe("PARTIAL MATCH");
    expect(result.gaps).toHaveLength(0);
    const power = result.requirements.find((item) => item.key === "power");
    expect(power?.status).toBe("meets");
    expect(power?.competitorValue).toContain("12V DC 2A external adapter");
    expect(power?.wyrestormValue).toContain("20V 10A DC");
    expect(result.verify.join(" ")).not.toMatch(/competitor power method is not verified/i);
    expect(result.verify.join(" ")).not.toMatch(/wyrestorm power method is not verified/i);
  });
});
