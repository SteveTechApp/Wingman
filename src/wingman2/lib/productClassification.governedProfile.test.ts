import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyWingmanProduct, distanceGateReason } from "./productClassification";
import { clearProductIntelligenceIndexCache } from "./productIntelligenceIndexCache";
import { extractRawProducts } from "./productStoryEngine";

// Real catalogue + runtime index: the same data the running app classifies.
const indexJson = readFileSync("public/product-intelligence-index.json", "utf8");
const products = extractRawProducts(JSON.parse(indexJson)) as Array<Record<string, unknown>>;

function product(sku: string) {
  const found = products.find((row) => String(row.sku || row.SKU || row.model || "").toUpperCase() === sku.toUpperCase());
  expect(found, `catalogue contains ${sku}`).toBeTruthy();
  return found!;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/product-intelligence-index.json")) {
      return new Response(indexJson, { status: 200 });
    }
    if (url.includes("/api/product-intelligence")) {
      return new Response(JSON.stringify({ records: [] }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  }));
  clearProductIntelligenceIndexCache();
});

describe("classification reads the governed technicalProfile before marketing tags", () => {
  it("classifies SW-640L-TX-W as a presentation switcher with structured 4x2 I/O and USB 3 evidence", () => {
    // Regression: the old classifier read "-W" as a wireless-only dongle and
    // parsed I/O from SKU digits (null for SW-640L-TX-W), so the flagship
    // 4-in/2-out presentation switcher could never satisfy a presentation-room
    // requirement. The governed profile proves 2x HDMI + 2x USB-C in / 2x HDMI
    // out and USB 3.x.
    const profile = classifyWingmanProduct(product("SW-640L-TX-W"));

    expect(profile.productClass).toBe("presentation-switcher");
    expect(profile.inputCount).toBe(4);
    expect(profile.outputCount).toBe(2);
    expect(profile.features.usb3).toBe(true);
    expect(profile.features.wirelessCasting).toBe(true); // -W flag survives the class change
  });

  it("keeps the wireless presentation switcher family selectable for wireless needs", () => {
    const profile = classifyWingmanProduct(product("SW-620-TX-W"));
    expect(profile.productClass).toBe("presentation-switcher");
    expect(profile.features.wirelessCasting).toBe(true);
  });

  it("reads headline HDBaseT reach into distanceMeters for extenders", () => {
    const ex35 = classifyWingmanProduct(product("EX-35-H2"));
    const ex100 = classifyWingmanProduct(product("EX-100-G2"));

    expect(ex35.features.hdbaset).toBe(true);
    expect(ex35.distanceMeters).toBe(35);
    expect(ex100.distanceMeters).toBe(100);
  });

  it("uses governed USB versions over tag keywords for the USB 3 gate", () => {
    const profile = classifyWingmanProduct(product("SW-640L-TX-W"));
    expect(profile.features.usb3).toBe(true);

    const ex35 = classifyWingmanProduct(product("EX-35-H2"));
    // EX-35-H2 is a USB 3.x-capable HDBaseT extender per its transports.
    expect(ex35.features.hdbaset3).toBe(false);
    expect(distanceGateReason(ex35, "Very long 70-100m")).toMatch(/below the requested/i);
    expect(distanceGateReason(ex35, "Medium 10-35m")).toBe("");
  });
});

describe("the 4-source / 2-display presentation room resolves", () => {
  it("returns eligible presentation candidates including SW-640L-TX-W with USB 3.x required", async () => {
    const { loadWingmanProductSelectorDecisions } = await import("./productSelectorEngine");
    const decisions = await loadWingmanProductSelectorDecisions({
      mode: "recommendations",
      technicalRequirement: "Route sources to multiple displays",
      productPath: "Presentation switcher",
      inputs: "3-4",
      outputs: "2",
      usb: "USB 3.x required",
      includeDependencies: true,
      includeArchitectureAlternatives: true,
    });

    const eligible = decisions.filter((decision) => decision.eligible);
    // Regression: this exact requirement used to resolve to zero products.
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.map((decision) => decision.sku)).toContain("SW-640L-TX-W");
  });

  it("gates point-to-point extenders on verified reach", async () => {
    const { loadWingmanProductSelectorDecisions } = await import("./productSelectorEngine");
    const decisions = await loadWingmanProductSelectorDecisions({
      mode: "recommendations",
      technicalRequirement: "Extend HDMI over distance",
      productPath: "HDBaseT extender",
      distance: "Very long 70-100m",
      includeArchitectureAlternatives: true,
    });

    const eligible = decisions.filter((decision) => decision.eligible).map((decision) => decision.sku);
    expect(eligible).toContain("EX-100-G2");
    expect(eligible).not.toContain("EX-35-H2");
    expect(eligible).not.toContain("EX-40-G3");

    const rejected = decisions
      .filter((decision) => decision.sku === "EX-35-H2")
      .flatMap((decision) => decision.rejectionReasons);
    expect(rejected.some((reason) => /Verified reach \(35m\) is below/.test(reason))).toBe(true);
  });
});
