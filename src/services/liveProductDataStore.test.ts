import { describe, expect, it } from "vitest";

import { getLiveProductDataStatus } from "@/services/liveProductDataStore";

describe("live product data store", () => {
  it("returns a stable status snapshot between unchanged reads", () => {
    const first = getLiveProductDataStatus();
    const second = getLiveProductDataStatus();

    expect(second).toBe(first);
  });
});
