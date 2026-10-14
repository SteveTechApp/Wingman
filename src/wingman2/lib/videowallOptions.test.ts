import { describe, expect, it } from "vitest";
import { assessVideowallOptions, defaultWallRequirements, validateWallRequirements, type WallRequirements } from "./videowallOptions";
const assess = (id: string, changes: Partial<WallRequirements> = {}) => assessVideowallOptions({ ...defaultWallRequirements, ...changes }).find(option => option.id === id)!;
describe("videowall design options", () => {
  it("sizes per-panel receivers and excludes undersized matrices", () => {
    const changes = { columns: 3, rows: 3, sources: 6 };
    expect(assess("mx-0404-scl", changes).blockers).toHaveLength(2);
    expect(assess("mx-0812-scl", changes).blockers).toEqual([]);
    expect(assess("nhd500", changes).equipment).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: "NHD-500-TX", quantity: 6 }), expect.objectContaining({ sku: "NHD-500-RX", quantity: 9 }),
    ]));
  });
  it("does not confuse one composed output with independent panel feeds", () => {
    expect(assess("nhd150", { sourceResolution: "1080p" }).blockers.join(" ")).toContain("one-output");
    expect(assess("nhd150", { application: "lcd-loop", sourceResolution: "1080p", windows: 4, layout: "quad" }).blockers).toEqual([]);
    expect(validateWallRequirements({ ...defaultWallRequirements, application: "lcd-loop", layout: "independent" })).toHaveLength(1);
  });
  it("applies NHD-150 stream limits by source resolution", () => {
    const changes = { application: "led", sources: 9, windows: 9, layout: "nine" } as const;
    expect(assess("nhd150", { ...changes, sourceResolution: "1080p" }).blockers).toEqual([]);
    expect(assess("nhd150", { ...changes, sourceResolution: "4k30" }).blockers.join(" ")).toContain("limit");
    expect(assess("nhd150", { ...changes, sourceResolution: "4k60" }).blockers.join(" ")).toContain("4K60");
  });
  it("offers a dedicated 600 receive unit for a 16-window projector", () => {
    const result = assess("nhd600", { application: "projection", sources: 16, windows: 16, layout: "custom", network: "10g" });
    expect(result.blockers).toEqual([]);
    expect(result.equipment[0].quantity).toBe(17);
    expect(result.path.at(-1)).toContain("one projector");
    expect(assess("nhd600", { network: "1g" }).blockers).toHaveLength(1);
  });
  it("requires a real HDMI composition stage for 500-series multiview", () => {
    const changes = { application: "lcd-loop", sources: 8, windows: 4, layout: "quad" } as const;
    expect(assess("nhd500", changes).blockers.join(" ")).toContain("external multiview");
    const hybrid = assess("nhd500-multiview", changes);
    expect(hybrid.blockers).toEqual([]);
    expect(hybrid.equipment).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: "NHD-500-TX", quantity: 8 }),
      expect.objectContaining({ sku: "NHD-500-RX", quantity: 4 }),
      expect.objectContaining({ sku: "NHD-0401-MV", quantity: 1 }),
    ]));
  });
  it("rejects invalid counts, unsupported composition and network requirements", () => {
    for (const sources of [0, -1, 1.5, NaN, Infinity, 65]) expect(assessVideowallOptions({ ...defaultWallRequirements, sources }).every(option => option.blockers.length)).toBe(true);
    expect(assess("hdmi-multiview", { application: "projection", sources: 5 }).blockers.join(" ")).toContain("upstream switching");
    expect(assess("nhd500", { network: "none" }).blockers).toHaveLength(1);
    expect(assess("mx-0812-scl", { layout: "quad", windows: 4 }).blockers.join(" ")).toContain("per-panel cropping");
    expect(assess("mx-0404-scl", { sourceLocation: "distributed" }).blockers.join(" ")).toContain("Remote source transport");
  });
  it("does not recommend retired products and supplies manufacturer evidence", () => {
    const options = assessVideowallOptions(defaultWallRequirements);
    expect(options.flatMap(option => option.equipment).some(e => ["NHD-250-RX", "MX-0808-SCL"].includes(e.sku))).toBe(false);
    expect(options.every(option => option.sources.length > 0 && option.sources.every(s => s.url.startsWith("https://www.wyrestorm.com/")))).toBe(true);
  });
  it("keeps dedicated wall processors within source, panel and layout capacity", () => {
    expect(assess("sw-0204-vw", { sources: 2 }).blockers).toEqual([]);
    expect(assess("sw-0204-vw", { sources: 2, columns: 3 }).blockers.length).toBeGreaterThan(0);
    expect(assess("sw-0206-vw", { sources: 2, columns: 3 }).blockers).toEqual([]);
    expect(assess("sw-0206-vw", { layout: "independent", sources: 2 }).blockers.join(" ")).toContain("one selected source");
  });
});
