import { describe, expect, it, vi } from "vitest";

import { buildRecommendation } from "./buildRecommendation";

describe("buildRecommendation", () => {
  it.each([
    ["wireless", ["SW-640L-TX-W", "APO-DG2"]],
    ["matrix", ["MX-0808-HDBT-H2A", "MX-0404-HDMI"]],
    ["AVoIP", ["NHD-510-TX", "NHD-510-RX"]],
    ["lifecycle-suppressed", []],
  ])("preserves %s candidate order and the complete boundary result", async (scenario, skus) => {
    const expected = {
      decisions: skus.map((sku) => ({ sku })),
      slotPool: [],
      design: { architecture: scenario, slots: [] },
      systemSlots: [],
    };
    const loadDecisionBoundary = vi.fn().mockResolvedValue(expected);
    const input = { brief: null, need: { query: scenario } };

    await expect(buildRecommendation(input, { loadDecisionBoundary })).resolves.toBe(expected);
    expect(loadDecisionBoundary).toHaveBeenCalledWith(input.brief, input.need);
  });
});
