import { describe, expect, it } from "vitest";
import {
  KNOWN_FULL_REVIEWERS,
  PLACEHOLDER_NAMES,
  REJECTED_BARE_NAMES,
  describeRejection,
  rejectBareReviewerAttributions,
} from "./reviewer-attribution.mjs";

function payloadOf(entries) {
  return {
    profiles: entries.map(([sku, verifiedBy]) => ({ sku, verifiedBy })),
  };
}

describe("reviewer attribution rule", () => {
  it("rejects the historical bare constant in any casing", () => {
    for (const value of ["Steve", "steve", "STEVE"]) {
      const rejections = rejectBareReviewerAttributions(payloadOf([["TEST-SKU", value]]));
      expect(rejections).toHaveLength(1);
      expect(rejections[0].sku).toBe("TEST-SKU");
      expect(rejections[0].reason).toContain("bare constant");
    }
    expect(REJECTED_BARE_NAMES).toContain("steve");
  });

  it("rejects placeholders that mean an unattributed sign-off", () => {
    for (const value of ["admin-bulk", "admin", "SET-ME", "unknown", "Wingman"]) {
      expect(rejectBareReviewerAttributions(payloadOf([["TEST-SKU", value]]))).toHaveLength(1);
    }
    expect(PLACEHOLDER_NAMES).toContain("admin-bulk");
  });

  it("rejects any other single bare word that is not a known full reviewer name", () => {
    const rejections = rejectBareReviewerAttributions(payloadOf([["TEST-SKU", "Sgoodwin"]]));
    expect(rejections).toHaveLength(1);
    expect(rejections[0].reason).toContain("single bare word");
  });

  it("rejects EVERY bare first name, not just the historical constant - the rule is a shape rule, not a blocklist", () => {
    // The 2026-08-16 regression was "Steve", but the class is bigger: any
    // bare first name (this year's contractor, the next reviewer) must fail
    // the same way. Pin the generalisation so nobody narrows the rule back to
    // a literal blocklist of one name.
    for (const first of ["John", "Alice", "Miguel", "Kim", "Steve", "S."]) {
      const rejections = rejectBareReviewerAttributions(payloadOf([["TEST-SKU", first]]));
      expect(rejections, `verifiedBy ${JSON.stringify(first)} must be rejected`).toHaveLength(1);
      expect(["bare constant", "single bare word"].some((cls) => rejections[0].reason.includes(cls))).toBe(true);
    }
  });

  it("accepts the reviewer of record's full name in the exact recorded casing", () => {
    const rejections = rejectBareReviewerAttributions(payloadOf([["TEST-SKU", "Steve Goodwin"]]));
    expect(rejections).toHaveLength(0);
    expect(KNOWN_FULL_REVIEWERS).toContain("Steve Goodwin");
  });

  it("rejects wrong casing of a known full reviewer name", () => {
    for (const value of ["steve goodwin", "STEVE GOODWIN", "steve Goodwin"]) {
      const rejections = rejectBareReviewerAttributions(payloadOf([["TEST-SKU", value]]));
      expect(rejections).toHaveLength(1);
      expect(rejections[0].reason).toContain("wrong casing");
    }
  });

  it("accepts whitespace-padded and unattributed rows without complaint", () => {
    const rejections = rejectBareReviewerAttributions({
      profiles: [
        { sku: "NO-NAME", status: "review-required" },
        { sku: "EMPTY-NAME", verifiedBy: "" },
        { sku: "WS-NAME", verifiedBy: "   Steve Goodwin  " },
      ],
    });
    expect(rejections).toHaveLength(0);
  });

  it("rejects the bare constant wherever it appears, not only on verified rows", () => {
    const rejections = rejectBareReviewerAttributions({
      profiles: [{ sku: "MACHINE-TIER", status: "verified-with-warning", verifiedBy: "Steve" }],
    });
    expect(rejections).toHaveLength(1);
  });

  it("reports every offending profile, not just the first", () => {
    const rejections = rejectBareReviewerAttributions(
      payloadOf([
        ["A", "Steve"],
        ["B", "Steve"],
        ["C", "Steve Goodwin"],
      ]),
    );
    expect(rejections.map((entry) => entry.sku)).toEqual(["A", "B"]);
  });

  it("describes rejections in the gate's message shape", () => {
    const [rejection] = rejectBareReviewerAttributions(payloadOf([["MX-0808-SCL", "Steve"]]));
    expect(describeRejection(rejection)).toContain(
      'wyrestorm-technical-profiles: MX-0808-SCL carries verifiedBy "Steve"',
    );
  });
});
