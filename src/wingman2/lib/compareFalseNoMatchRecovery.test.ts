import { describe, expect, it } from "vitest";
import rawProductIndex from "../../../public/product-intelligence-index.json";
import {
  normaliseCompareProducts,
  runCompareRuntimePipeline,
} from "./compareRuntimePipeline";

type AnyRecord = Record<string, any>;

const products = normaliseCompareProducts(rawProductIndex);

function sku(value: AnyRecord | undefined): string {
  return String(value?.sku ?? value?.wyrestorm?.sku ?? "").toUpperCase();
}

function leadSkus(result: AnyRecord, limit = 8): string[] {
  return (result.matches ?? [])
    .slice(0, limit)
    .map((item: AnyRecord) => sku(item))
    .filter(Boolean);
}

describe("Compare false-no-match recovery matrix", () => {
  it("keeps Atlona AT-OMNI-121 in the decoder/receiver lane", () => {
    const result = runCompareRuntimePipeline(
      "AT-OMNI-121",
      products,
      "Atlona",
      12,
    );
    const leads = leadSkus(result);

    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0]).toMatch(/^NHD-500(?:-E)?-RX$/);
    expect(leads[0]).not.toMatch(/-TX$/);
  });

  it.each([
    ["IP250UHD-TX", "Blustream", /^NHD-500(?:-E)?-TX$/],
    ["IP250UHD-RX", "Blustream", /^NHD-500(?:-E)?-RX$/],
  ])("keeps %s in the correct NetworkHD endpoint direction", (input, brand, expected) => {
    const result = runCompareRuntimePipeline(input, products, brand, 12);
    expect(leadSkus(result)[0]).toMatch(expected);
  });

  it("finds a credible 4x2 WyreStorm matrix for Lightware MMX4x2-HDMI", () => {
    const result = runCompareRuntimePipeline(
      "MMX4x2-HDMI",
      products,
      "Lightware",
      12,
    );
    const leads = leadSkus(result);

    expect(result.topOutcome).not.toBe("NONE");
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.some((item) => /0402|4X2/.test(item))).toBe(true);
  });

  it("finds a credible 4x4 WyreStorm matrix direction for Blustream HMX44", () => {
    const result = runCompareRuntimePipeline(
      "HMX44-18G-KIT",
      products,
      "Blustream",
      12,
    );
    const leads = leadSkus(result);

    expect(result.topOutcome).not.toBe("NONE");
    expect(leads.some((item) => /0404|4X4/.test(item))).toBe(true);
  });

  it("does not return no-match for a recognised Barco ClickShare room hub", () => {
    const result = runCompareRuntimePipeline(
      "CLICKSHARE-CX-30",
      products,
      "Barco",
      12,
    );
    const leads = leadSkus(result);

    expect(result.topOutcome).not.toBe("NONE");
    expect(leads.length).toBeGreaterThan(0);
    expect(
      leads.some(
        (item) =>
          /^SW-(620|640L)-TX-W$/.test(item) ||
          item === "APO-VX20-UC-V2",
      ),
    ).toBe(true);
    expect(leads).not.toContain("APO-DG2");
  });

  it("only introduces APO-DG2 when a casting dongle is explicit and also keeps a compatible room core", () => {
    const result = runCompareRuntimePipeline(
      "wireless casting dongle BYOD presentation ClickShare Button",
      products,
      "Barco",
      12,
    );
    const leads = leadSkus(result);

    expect(leads[0]).toBe("APO-DG2");
    expect(
      leads.some(
        (item) =>
          /^SW-(620|640L)-TX-W$/.test(item) ||
          item === "APO-VX20-UC-V2",
      ),
    ).toBe(true);
  });

  it("keeps PTZ camera comparisons in the camera lane", () => {
    const result = runCompareRuntimePipeline(
      "SRG-X120",
      products,
      "Sony",
      12,
    );
    expect(leadSkus(result)[0]).toMatch(/^CAM-/);
  });

  it("does not invent a direct WyreStorm DSP equivalent for Biamp TesiraFORTE", () => {
    const result = runCompareRuntimePipeline(
      "TesiraFORTE audio DSP",
      products,
      "Biamp",
      12,
    );
    const leads = leadSkus(result);

    expect(
      leads.some((item) => /^CAM-|^MX-|^SW-/.test(item)),
    ).toBe(false);
  });

  it("recovers a credible larger fixed-matrix direction for a non-catalogued 6x2 HDBaseT matrix brief", () => {
    const result = runCompareRuntimePipeline(
      "6x2 HDBaseT routing matrix 4K60",
      products,
      undefined,
      12,
    );
    const leads = leadSkus(result);

    expect(result.topOutcome).not.toBe("NONE");
    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0]).not.toMatch(/0402|0403/);
  });

  it("recognises Crestron AM-TX3-100 AirMedia Connect Adapter as a casting accessory that requires a room core", () => {
    const result = runCompareRuntimePipeline(
      "AM-TX3-100 AirMedia Connect Adapter",
      products,
      "Crestron",
      12,
    );
    const leads = leadSkus(result);

    expect(leads[0]).toBe("APO-DG2");
    expect(
      leads.some(
        (item) =>
          /^SW-(620|640L)-TX-W$/.test(item) ||
          item === "APO-VX20-UC-V2",
      ),
    ).toBe(true);

    const dg2 = (result.matches ?? []).find(
      (item: AnyRecord) => sku(item) === "APO-DG2",
    );

    expect(dg2?.requiredCompanionSkus).toEqual(
      expect.arrayContaining([
        "SW-620-TX-W",
        "SW-640L-TX-W",
        "APO-VX20-UC-V2",
      ]),
    );
    expect(
      String(dg2?.decision?.systemRequirements ?? ""),
    ).toMatch(/compatible WyreStorm room core/i);
  });
});