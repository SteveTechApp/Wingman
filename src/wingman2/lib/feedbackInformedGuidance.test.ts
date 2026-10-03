import { describe, expect, it } from "vitest";
import { aggregateSkuFeedback, buildFeedbackInformedGuidance } from "./feedbackInformedGuidance";

const feedback = [
  { id: "f1", createdAt: "2026-01-01", scope: "proposal" as const, rating: "wrong-fit" as const, label: "Recommendation was the wrong architecture or product fit", sku: "SW-130-TX-UK", note: "Customer needed USB 3.x" },
  { id: "f2", createdAt: "2026-02-01", scope: "bom" as const, rating: "wrong-fit" as const, label: "Recommendation was the wrong architecture or product fit", sku: "SW-130-TX-UK" },
  { id: "f3", createdAt: "2026-03-01", scope: "recommendation" as const, rating: "accepted" as const, label: "Recommendation accepted as proposed", sku: "NHD-500-TX" },
];

describe("feedback-informed guidance", () => {
  it("aggregates feedback lessons by SKU and rating", () => {
    const lessons = aggregateSkuFeedback(feedback);

    const sw130 = lessons.find((lesson) => lesson.sku === "SW-130-TX-UK" && lesson.rating === "wrong-fit");
    expect(sw130).toBeDefined();
    expect(sw130?.count).toBe(2);
    expect(sw130?.notes).toContain("Customer needed USB 3.x");
  });

  it("warns when a selected SKU previously received wrong-fit feedback", () => {
    const items = buildFeedbackInformedGuidance({
      products: [{ sku: "SW-130-TX-UK", quantity: 1 }],
      feedback,
    });

    const warning = items.find((item) => item.id === "feedback-SW-130-TX-UK-wrong-fit");
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("received 2 times");
    expect(warning?.message).toContain("Customer needed USB 3.x");
  });

  it("notes prior acceptance as field evidence", () => {
    const items = buildFeedbackInformedGuidance({
      products: [{ sku: "NHD-500-TX", quantity: 1 }],
      feedback,
    });

    expect(items.some((item) => item.id === "feedback-NHD-500-TX-accepted" && item.severity === "information")).toBe(true);
  });

  it("ignores feedback for SKUs not in the current BOM", () => {
    const items = buildFeedbackInformedGuidance({
      products: [{ sku: "EX-70-H2", quantity: 1 }],
      feedback,
    });

    expect(items).toEqual([]);
  });
});
