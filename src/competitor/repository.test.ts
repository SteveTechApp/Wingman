import { describe, expect, it } from "vitest";

import { findCompetitorBySku } from "./repository";

describe("competitor repository sanitization", () => {
  it("strips seeded WyreStorm family hints from competitor features", () => {
    const product = findCompetitorBySku("AT-OME-MS42");

    expect(product).toBeDefined();
    expect(product?.features ?? []).not.toContain("Apollo");
  });
});
