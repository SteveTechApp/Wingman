import { describe, expect, it } from "vitest";
import { assessVideowallOptions, defaultWallRequirements } from "./videowallOptions";
import {
  WALL_BASE_VARIANT,
  wallOptionVariants,
  wallOptionWithVariant,
  wallVariantFor,
  wallVariantLabel,
} from "./wallVariants";

const options = assessVideowallOptions(defaultWallRequirements);
const option = (id: string) => options.find((entry) => entry.id === id)!;

describe("wall builds", () => {
  it("offers the Lite pair on both 500-series designs and fibre on the 600", () => {
    expect(wallOptionVariants("nhd500").map((build) => build.id)).toEqual([WALL_BASE_VARIANT, "lite"]);
    expect(wallOptionVariants("nhd500-multiview").map((build) => build.id)).toEqual([WALL_BASE_VARIANT, "lite"]);
    expect(wallOptionVariants("nhd600").map((build) => build.id)).toEqual([WALL_BASE_VARIANT, "fibre"]);
    // A design that ships one way has no build to choose.
    expect(wallOptionVariants("mx-0404-scl")).toEqual([]);
  });

  it("swaps the order lines and adds the check that build brings", () => {
    const base = option("nhd500");
    const lite = wallOptionWithVariant(base, "lite");

    // A build is a swap on the design, never a second design.
    expect(lite.id).toBe(base.id);
    const skus = lite.equipment.map((item) => item.sku);
    expect(skus).toContain("NHD-500-E-TX");
    expect(skus).toContain("NHD-500-E-RX");
    expect(skus).not.toContain("NHD-500-TX");
    expect(lite.checks).toHaveLength(base.checks.length + 1);
    expect(lite.checks[lite.checks.length - 1]).toContain("Lite pair");
    expect(wallVariantLabel(base.id, "lite")).toBe("500-E · Lite pair");
  });

  it("leaves the catalogue build exactly as it was", () => {
    const base = option("nhd500");

    expect(wallOptionWithVariant(base, WALL_BASE_VARIANT)).toBe(base);
    expect(wallOptionWithVariant(base, null)).toBe(base);
    expect(wallVariantFor(base.id, "")).toBeNull();
    expect(wallVariantLabel(base.id, "")).toBeNull();
  });

  it("ignores a build the design does not offer", () => {
    const base = option("mx-0404-scl");

    // A stale draft or a hand-edited record cannot put another build's parts on
    // this wall.
    expect(wallOptionWithVariant(base, "lite")).toBe(base);
    expect(wallVariantFor("nhd500", "copper")).toBeNull();
  });

  it("puts the fibre transceiver on the 600's schedule", () => {
    const fibre = wallOptionWithVariant(option("nhd600"), "fibre");

    expect(fibre.equipment.map((item) => item.sku)).toContain("NHD-600-TRXF");
    expect(fibre.equipment.map((item) => item.sku)).not.toContain("NHD-600-TRX");
  });
});
