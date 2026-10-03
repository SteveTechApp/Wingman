import { beforeEach, describe, expect, it } from "vitest";
import { isCompetitorSkuHeldLocally } from "./ComparePageNew.advanced";
import { saveCompetitorSpec } from "../lib/savedCompetitorSpecs";

describe("Compare live lookup eligibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("distinguishes a governed catalogue SKU from an unknown typed SKU", () => {
    expect(isCompetitorSkuHeldLocally("CYP", "OR-88U-4K22")).toBe(true);
    expect(isCompetitorSkuHeldLocally("CYP", "NOT-IN-THE-CATALOGUE-99")).toBe(false);
  });

  it("treats a user-reviewed saved live lookup as locally held evidence", () => {
    saveCompetitorSpec({
      manufacturer: "CYP",
      sku: "NEW-LIVE-SKU-1",
      title: "Reviewed live lookup product",
      domain: "MATRIX",
      role: "Matrix",
      transport: "HDMI",
      maxResolution: "4K60",
      chroma: "4:4:4",
      notes: "Reviewed against the manufacturer page.",
      savedFrom: "live-lookup",
    });

    expect(isCompetitorSkuHeldLocally("CYP", "NEW-LIVE-SKU-1")).toBe(true);
  });
});
