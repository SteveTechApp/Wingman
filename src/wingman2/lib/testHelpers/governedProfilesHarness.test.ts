import { describe, expect, it, vi } from "vitest";
import index from "../../../../public/product-intelligence-index.json";
import {
  governedProfilesWithStatus,
  governedProfilesWithoutSkus,
  type GovernedProfilesPayload,
} from "./governedProfilesHarness";

// Strip one real governed profile so the resolver ladder below can be pinned
// against a genuine coverage-loss payload (see harness JSDoc for the path
// depth rule).
vi.mock("../../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<{ sku: string }> } };
  return { default: governedProfilesWithoutSkus(actual.default, ["MX-0402-MST"]) };
});

const payload: GovernedProfilesPayload = {
  version: 5,
  profiles: [
    { sku: "MX-0404-SCL", status: "verified", name: "SCL" },
    { sku: "mx-0404-hdmi", status: "verified", name: "HDMI" },
    { sku: "MX-0402-MST", status: "verified-with-warning", name: "MST" },
    { sku: "APO-DG2", status: "review-required", name: "DG2" },
  ],
};

describe("governedProfilesHarness", () => {
  it("removes exactly the requested SKUs case-insensitively and keeps the rest", () => {
    const next = governedProfilesWithoutSkus(payload, ["MX-0404-SCL", "mx-0402-mst"]);

    expect(next.version).toBe(5);
    expect(next.profiles.map((p) => p.sku)).toEqual(["mx-0404-hdmi", "APO-DG2"]);
    // The original payload is not mutated.
    expect(payload.profiles).toHaveLength(4);
  });

  it("leaves the payload unchanged when no SKU matches", () => {
    const next = governedProfilesWithoutSkus(payload, ["ZZZ-NOPE"]);
    expect(next.profiles).toHaveLength(4);
  });

  it("demotes the requested SKUs to a held status for the held-batch scenario", () => {
    const next = governedProfilesWithStatus(payload, ["mx-0404-hdmi", "MX-0404-SCL"], "review-required");

    expect(next.profiles.find((p) => p.sku === "mx-0404-hdmi")?.status).toBe("review-required");
    expect(next.profiles.find((p) => p.sku === "MX-0404-SCL")?.status).toBe("review-required");
    expect(next.profiles.find((p) => p.sku === "MX-0402-MST")?.status).toBe("verified-with-warning");
    expect(payload.profiles.find((p) => p.sku === "mx-0404-hdmi")?.status).toBe("verified");
  });
});

describe("resolver tier ladder with a governed profile removed", () => {
  it("falls back to official-structured when official-page technical data remains", async () => {
    const { resolveProductTechnicalData } = await import("../governedProductTechnicalData");

    // The real MX-0402-MST entry carries a technicalProfile (official-page
    // data), so with the governed profile gone the resolver must honestly
    // downgrade to official-structured - never claim verified.
    const entry = (index as { products: Array<{ sku: string; technicalProfile?: unknown }> }).products.find(
      (p) => p.sku === "MX-0402-MST",
    );
    expect(entry?.technicalProfile).toBeTruthy();
    const real = resolveProductTechnicalData({
      sku: "MX-0402-MST",
      name: "MX-0402-MST",
      productClass: "Matrix",
      technicalProfile: entry?.technicalProfile,
    } as never);
    expect(real.sourceTier).toBe("official-structured");
    expect(real.compareReady).toBe(false);
    expect(real.statusLabel).toBe("Official data - incomplete");
  });

  it("resolves to text-inferred when only marketing text and catalogue evidence remain", async () => {
    const { resolveProductTechnicalData } = await import("../governedProductTechnicalData");

    // No governed profile (mocked above), no official technicalProfile, but an
    // evidence-bearing record remains: the resolver must land one rung above
    // missing - text-inferred, which the badge renders as "Inferred data -
    // review before use".
    const inferred = resolveProductTechnicalData({
      sku: "MX-0402-MST",
      name: "MX-0402-MST",
      description: "4x2 conference room switcher with MST and USB-C",
      officialUrl: "https://www.wyrestorm.com/product/mx-0402-mst/",
    } as never);
    expect(inferred.sourceTier).toBe("text-inferred");
    expect(inferred.compareReady).toBe(false);
    expect(inferred.statusLabel).toBe("Text-inferred - review only");

    const { governedBadgeMeta } = await import("../../components/GovernedDataBadge");
    expect(governedBadgeMeta(inferred.sourceTier).text).toBe("Inferred data - review before use");
    expect(governedBadgeMeta(inferred.sourceTier).className).toBe("is-warn");
  });

  it("resolves to missing - the literal 'Technical data not resolved' path - when no data at all remains", async () => {
    const { resolveProductTechnicalData } = await import("../governedProductTechnicalData");

    // No governed profile, no technicalProfile, no usable text: the resolver
    // must land on the bottom tier, which the badge renders as the canonical
    // "Technical data not resolved" copy.
    const bare = resolveProductTechnicalData({
      sku: "MX-0402-MST",
      name: "MX-0402-MST",
    } as never);
    expect(bare.sourceTier).toBe("missing");
    expect(bare.statusLabel).toBe("Technical data not resolved");

    // The badge component maps the missing tier to its canonical copy - the
    // literal string this whole honesty contract is about.
    const { governedBadgeMeta } = await import("../../components/GovernedDataBadge");
    expect(governedBadgeMeta(bare.sourceTier).text).toBe("Technical data not resolved");
    expect(governedBadgeMeta(bare.sourceTier).className).toBe("is-warn");
  });
});
