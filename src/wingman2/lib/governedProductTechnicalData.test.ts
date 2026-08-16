import { describe, expect, it } from "vitest";
import {
  hydrateProductSpecWithTechnicalData,
  resolveProductTechnicalData,
} from "./governedProductTechnicalData";
import type { ProductSpec } from "./productStoryEngine";

function baseProduct(sku: string): ProductSpec {
  return {
    sku,
    name: sku,
    family: "WyreStorm",
    category: "AVoIP",
    productType: "AVoIP",
    description: "Product description not yet available.",
    purpose: "Product description not yet available.",
    summary: "Product description not yet available.",
    keyFeatures: [],
    applications: [],
    ioSummary: ["I/O details are not yet confirmed in the product intelligence record."],
    video: ["Video specification not yet confirmed in the product intelligence record."],
    audio: ["Audio specification not yet confirmed or not applicable."],
    usb: ["USB requirement not yet confirmed or not applicable."],
    network: ["Network requirement not yet confirmed or not applicable."],
    control: ["Control requirement not yet confirmed or not applicable."],
    power: ["Power detail must be confirmed from current datasheet."],
    physical: ["Physical details must be confirmed from current datasheet."],
    checks: ["Confirm source count, display count, signal type, distance, USB, audio, control, network and power requirements."],
    related: [],
  };
}

describe("governed product technical data", () => {
  it("hydrates NHD-120-RX from the exact governed profile", () => {
    const base = baseProduct("NHD-120-RX");
    const resolved = resolveProductTechnicalData({ sku: "NHD-120-RX" }, base);
    const hydrated = hydrateProductSpecWithTechnicalData(base, { sku: "NHD-120-RX" });

    // NHD-120-RX is human-verified (Steve confirmed its spec-critical fields
    // in the 2026-08 structured review pass), so it renders at the
    // verified-profile tier - "verified" requires a human (pinned in
    // governedProductTechnicalData.humanVerified.test.ts).
    expect(resolved.sourceTier).toBe("verified-profile");
    expect(resolved.compareReady).toBe(true);
    expect(resolved.productClass).toBe("AVOIP");
    expect(resolved.role).toBe("decoder");
    expect(resolved.maxResolution).toContain("3840x2160p");
    expect(resolved.compare.specs.hdmiOutputs).toBe(1);
    expect(resolved.compare.specs.networkSpeed).toBe("1GbE");
    expect(resolved.dependencies).toContain("NHD-CTL-PRO-V2");

    expect(hydrated.ioSummary.some((item) => item.includes("RJ-45"))).toBe(true);
    expect(hydrated.video.some((item) => item.includes("3840x2160p"))).toBe(true);
    expect(hydrated.control.some((item) => item.includes("NHD-CTL-PRO-V2"))).toBe(true);
    expect(hydrated.technicalData?.compareReady).toBe(true);
    expect(hydrated.technicalData?.missingFields).toEqual([]);
    expect(hydrated.video.join(" ")).not.toMatch(/not yet confirmed/i);
  });

  it("keeps APO-VX20-UC-V2 in the UC lane when optional wireless casting is mentioned", () => {
    const base = baseProduct("APO-VX20-UC-V2");
    const resolved = resolveProductTechnicalData(
      {
        sku: "APO-VX20-UC-V2",
        name: "All-in-one UC video bar with camera, microphone and speaker",
        description:
          "USB conferencing and BYOM video bar. Pair with APO-DG2 if wireless casting is also needed.",
      },
      base,
    );

    expect(resolved.productClass).toBe("UC");
    expect(resolved.role).toBe("UC room product");
    expect(resolved.productClass).not.toBe("WIRELESS_PRESENTATION");
  });

  it("keeps APO-DG2 in the wireless-presentation lane with its mandatory host dependency", () => {
    const base = baseProduct("APO-DG2");
    const resolved = resolveProductTechnicalData({ sku: "APO-DG2" }, base);
    const hydrated = hydrateProductSpecWithTechnicalData(base, { sku: "APO-DG2" });

    expect(resolved.productClass).toBe("WIRELESS_PRESENTATION");
    expect(resolved.role).toBe("wireless casting dongle");
    // APO-DG2 was machine-transcribed and is now human-verified (2026-08
    // structured review pass), so it renders at the verified-profile tier;
    // it stays not-compare-ready because it can only work paired with a
    // compatible receiver/base device, never standalone.
    expect(resolved.sourceTier).toBe("verified-profile");
    expect(resolved.compareReady).toBe(false);
    expect(resolved.dependencies.join(" ")).toMatch(/compatible.*receiver\/base device/i);
    expect(resolved.warnings.join(" ")).toMatch(/requires a compatible receiver\/base device/i);
    expect(hydrated.related.join(" ")).toContain("APO-VX20-UC-V2");
    expect(hydrated.checks.join(" ")).toMatch(/not recommend APO-DG2 as a standalone/i);
  });

  it("reads nested official technical-profile and source-catalog data", () => {
    const base = baseProduct("TEST-0402");
    const raw = {
      sku: "TEST-0402",
      name: "4x2 HDMI matrix",
      description: "4K60 4:4:4 HDMI matrix with RS-232 and LAN control",
      sourceCatalog: {
        inputs: "4 x HDMI",
        outputs: "2 x HDMI",
        transportType: "HDMI",
        resolutionBandwidth: "4K60 4:4:4",
        control: "RS-232 and LAN",
        dependencies: "External PSU",
        evidenceSource: "https://www.wyrestorm.com/product/test-0402/",
        lastReviewed: "2026-07-11",
        reviewer: "Technical review",
      },
      technicalProfile: {
        sourceQuality: {
          officialProductUrl: "https://www.wyrestorm.com/product/test-0402/",
          livePageUsed: true,
          capturedTechnicalLineCount: 8,
        },
        transports: ["HDMI"],
        io: {
          video: [
            { count: 4, connector: "HDMI", direction: "input", category: "video" },
            { count: 2, connector: "HDMI", direction: "output", category: "video" },
          ],
          control: [
            { count: 1, connector: "RS-232", direction: "bidirectional", category: "control" },
            { count: 1, connector: "LAN", direction: "bidirectional", category: "control" },
          ],
        },
        features: [
          { label: "4K60 4:4:4", group: "Video", evidence: "Official page" },
          { label: "RS-232 and LAN control", group: "Control", evidence: "Official page" },
        ],
      },
    };

    const resolved = resolveProductTechnicalData(raw, base);

    expect(resolved.ioSummary).toContain("4 x HDMI input");
    expect(resolved.ioSummary).toContain("2 x HDMI output");
    expect(resolved.video.join(" ")).toContain("4K60");
    expect(resolved.control.join(" ")).toContain("RS-232");
    expect(resolved.evidence.join(" ")).toContain("wyrestorm.com");
  });

  it("keeps incomplete unverified products review-only", () => {
    const base = baseProduct("UNKNOWN-100");
    const resolved = resolveProductTechnicalData(
      {
        sku: "UNKNOWN-100",
        name: "Unknown product",
      },
      base,
    );

    expect(resolved.compareReady).toBe(false);
    expect(resolved.sourceTier).toBe("missing");
    expect(resolved.missingFields.length).toBeGreaterThan(0);
  });
});
