import { describe, expect, it, vi } from "vitest";

import { runGovernedCompare, runGovernedCompareSync } from "./runGovernedCompare";

describe("runGovernedCompare", () => {
  it.each([
    ["no-match", "NONE", []],
    ["evidence-pending", "VERIFY", ["verify-only"]],
    ["wireless", "MATCH", ["SW-640L-TX-W", "APO-DG2"]],
    ["matrix", "MATCH", ["MX-0808-HDBT-H2A"]],
    ["AVoIP", "MATCH", ["NHD-510-TX"]],
    ["lifecycle-suppressed", "NONE", []],
  ])("preserves the %s outcome and candidate order", async (_scenario, topOutcome, skus) => {
    const expected = {
      topOutcome,
      matches: skus.map((sku) => ({ sku })),
      recommendation: "Current governed wording",
    };
    const runPipeline = vi.fn(() => expected) as never;
    const input = { inputText: String(_scenario), products: [{ sku: "catalogue" }], brand: "Test", limit: 8 };

    expect(runGovernedCompareSync(input, { runPipeline })).toBe(expected);
    expect(await runGovernedCompare(input, { runPipeline })).toBe(expected);
    expect(runPipeline).toHaveBeenLastCalledWith(input.inputText, input.products, input.brand, 8, "");
  });
});
