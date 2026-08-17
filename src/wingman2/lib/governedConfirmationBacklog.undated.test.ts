import { describe, expect, it, vi } from "vitest";

// A profile with no evidence timestamp cannot be dated, so its freshness can
// never be verified: the aging metric must treat it as overdue (the same rule
// the CI gate applies). The mock replaces the governed-profiles JSON with two
// undatable unconfirmed profiles so the module is exercised without touching
// the real backlog. The aging thresholds come from the real config file.
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", () => ({
  default: {
    version: 1,
    profiles: [
      {
        sku: "UNDATED-1",
        status: "review-required",
        productClass: "MATRIX",
        role: "primary-hardware",
        evidence: [],
      },
      {
        sku: "UNDATED-2",
        status: "verified-with-warning",
        productClass: "PRESENTATION",
        role: "primary-hardware",
        evidence: [{ sourceUrl: "https://example.com/product" }],
      },
    ],
  },
}));

import { governedConfirmationBacklog } from "./governedConfirmationBacklog";

describe("governed confirmation backlog aging (undatable profiles)", () => {
  it("treats awaiting profiles without an evidence timestamp as overdue", () => {
    const backlog = governedConfirmationBacklog();

    expect(backlog.awaiting.length).toBe(2);
    for (const profile of backlog.awaiting) {
      expect(profile.ageDays).toBeNull();
      expect(profile.aging).toBe("overdue");
    }
    expect(backlog.aging).toBe(0);
    expect(backlog.overdue).toBe(2);
  });
});
