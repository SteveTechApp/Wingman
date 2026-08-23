import { describe, expect, it } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import { classifyWingmanProduct, matchedGateReasons, type WingmanFinderNeedLike } from "./productClassification";
import { selectWingmanProducts } from "./productSelectorEngine";

function findRaw(sku: string): Record<string, unknown> {
  const root = index as { products?: unknown[] };
  const products = Array.isArray(root.products) ? root.products : [];
  const found = products.find((p) => (p as { sku?: string }).sku === sku);
  expect(found).toBeTruthy();
  return found as Record<string, unknown>;
}

describe("governed spec evidence behind recommendations", () => {
  it("reads I/O, USB version and reach from the governed profile of a real product", () => {
    const evidence = classifyWingmanProduct(findRaw("SW-640L-TX-W")).specEvidence;

    expect(evidence.source).toBe("governed");
    expect(evidence.io).toBe("4 in / 2 out");
    expect(evidence.usb).toBe("USB 3.x");
    expect(evidence.connectors).toContain("HDMI");
    expect(evidence.connectors).toContain("USB-C");
  });

  it("reads the governed reach for a point-to-point extender", () => {
    const evidence = classifyWingmanProduct(findRaw("EX-35-H2")).specEvidence;

    expect(evidence.source).toBe("governed");
    expect(evidence.reach).toBe("35m");
    // EX-35-H2's SKU digits are its 35m reach, NOT a 3-in/5-out port count.
    expect(evidence.io).toBe("1 in / 1 out");
  });

  it("does not parse cable SKU length digits as I/O", () => {
    const evidence = classifyWingmanProduct(findRaw("CAB-HAOC-15")).specEvidence;

    // "15" is the cable length, not a 1-in/5-out device.
    expect(evidence.io).toBe("1 in / 1 out");
  });

  it("marks products without a governed profile as inferred", () => {
    const evidence = classifyWingmanProduct({ sku: "NHD-500-TX", name: "NetworkHD 500 encoder" }).specEvidence;

    expect(evidence.source).toBe("inferred");
    // SKU-derived I/O still resolves so the evidence line is never empty,
    // but USB/reach stay null rather than guessing.
    expect(evidence.io).toBe("1 in / 1 out");
    expect(evidence.usb).toBeNull();
    expect(evidence.reach).toBeNull();
  });

  it("reports the specific gates a fixed-port product passed", () => {
    const profile = classifyWingmanProduct({
      sku: "SW-TEST-4X2",
      category: "Presentation switcher",
      technicalProfile: {
        io: {
          ports: [
            { count: 4, connector: "HDMI", direction: "input", category: "video" },
            { count: 2, connector: "HDMI", direction: "output", category: "video" },
          ],
        },
        usb: { versions: ["USB 3.x"] },
      },
    });

    const need: WingmanFinderNeedLike = { inputs: "3-4", outputs: "2", usb: "USB 3.x required" };
    const reasons = matchedGateReasons(profile, need);

    expect(reasons.join(" ")).toMatch(/I\/O gate passed: 4 inputs cover the 3-4 source brief/);
    expect(reasons.join(" ")).toMatch(/I\/O gate passed: 2 outputs cover the 2 display brief/);
    expect(reasons.join(" ")).toMatch(/USB gate passed: USB 3\.x is evidenced/);
  });

  it("reports the reach gate only when the governed reach covers the requested run", () => {
    const profile = classifyWingmanProduct({
      sku: "EX-TEST-1",
      category: "Extender",
      technicalProfile: {
        io: {
          ports: [
            { count: 1, connector: "HDMI", direction: "input", category: "video" },
            { count: 1, connector: "HDBaseT", direction: "output", category: "video" },
          ],
        },
        video: { distance: ["35m at 4K", "70m at 1080p"] },
        transports: ["HDBaseT"],
      },
    });

    expect(profile.specEvidence.reach).toBe("35m");
    expect(matchedGateReasons(profile, { distance: "Long 35-70m" })).toEqual([
      "Reach gate passed: 35m reach covers the Long 35-70m run.",
    ]);
    // Beyond the verified reach -> the gate rejects, so no pass claim.
    expect(matchedGateReasons(profile, { distance: "Very long 70-100m" })).toEqual([]);
  });

  it("stays silent for a request with no specified dimensions", () => {
    const profile = classifyWingmanProduct({
      sku: "SW-TEST-4X2",
      category: "Presentation switcher",
      technicalProfile: {
        io: {
          ports: [
            { count: 4, connector: "HDMI", direction: "input", category: "video" },
            { count: 2, connector: "HDMI", direction: "output", category: "video" },
          ],
        },
        usb: { versions: ["USB 3.x"] },
      },
    });

    expect(matchedGateReasons(profile, {})).toEqual([]);
    expect(matchedGateReasons(profile, { inputs: "Unknown", usb: "Any / not known" })).toEqual([]);
  });

  it("surfaces gate-pass evidence on the selector decision and the profile behind it", () => {
    const decisions = selectWingmanProducts([findRaw("SW-640L-TX-W")], {
      mode: "recommendations",
      inputs: "3-4",
      outputs: "2",
      usb: "USB 3.x required",
    });

    expect(decisions[0]?.eligible).toBe(true);
    expect(decisions[0]?.profile.specEvidence.io).toBe("4 in / 2 out");
    expect(decisions[0]?.reasons.join(" ")).toMatch(/I\/O gate passed/);
    expect(decisions[0]?.reasons.join(" ")).toMatch(/USB gate passed/);
  });
});
