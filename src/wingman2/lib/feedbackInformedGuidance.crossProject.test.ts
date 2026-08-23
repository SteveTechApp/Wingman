import { describe, expect, it, vi } from "vitest";

vi.mock("../data/projectStore", () => ({
  readProjectStore: vi.fn(() => ({
    projects: [
      {
        id: "proj-1",
        name: "Project Alpha",
        isDemo: false,
        feedback: [
          { id: "f1", createdAt: "2026-01-01", scope: "proposal", rating: "wrong-fit", label: "Wrong fit", sku: "SW-130-TX-UK", note: "Customer needed USB 3.x" },
          { id: "f2", createdAt: "2026-02-01", scope: "proposal", rating: "accepted", label: "Looks right", sku: "NHD-500-TX" },
        ],
      },
      {
        id: "proj-2",
        name: "Project Beta",
        isDemo: false,
        feedback: [
          { id: "f3", createdAt: "2026-03-01", scope: "bom", rating: "wrong-fit", label: "Wrong fit", sku: "SW-130-TX-UK", note: "Matrix was too small" },
          { id: "f4", createdAt: "2026-04-01", scope: "proposal", rating: "missing-accessory", label: "Missing accessory", sku: "SW-130-TX-UK" },
        ],
      },
      {
        id: "proj-demo",
        name: "Demo Project",
        isDemo: true,
        feedback: [
          { id: "f5", createdAt: "2026-05-01", scope: "proposal", rating: "wrong-fit", label: "Wrong fit", sku: "SW-130-TX-UK" },
        ],
      },
    ],
  })),
}));

import { collectCrossProjectFeedback } from "./feedbackInformedGuidance";

describe("collectCrossProjectFeedback", () => {
  it("aggregates feedback across non-demo projects", () => {
    const summaries = collectCrossProjectFeedback();
    const sw130 = summaries.find((s) => s.sku === "SW-130-TX-UK");

    expect(sw130).toBeDefined();
    expect(sw130?.totalEntries).toBe(3);
    expect(sw130?.projectCount).toBe(2); // Alpha + Beta, not Demo
  });

  it("groups by rating with project names", () => {
    const summaries = collectCrossProjectFeedback();
    const sw130 = summaries.find((s) => s.sku === "SW-130-TX-UK");
    const wrongFit = sw130?.ratings.find((r) => r.rating === "wrong-fit");

    expect(wrongFit).toBeDefined();
    expect(wrongFit?.count).toBe(2); // two distinct projects
    expect(wrongFit?.projectNames).toContain("Project Alpha");
    expect(wrongFit?.projectNames).toContain("Project Beta");
    expect(wrongFit?.notes).toContain("Customer needed USB 3.x");
  });

  it("sorts worst-first: negative SKUs before accepted-only SKUs", () => {
    const summaries = collectCrossProjectFeedback();
    const sw130Index = summaries.findIndex((s) => s.sku === "SW-130-TX-UK");
    const nhdIndex = summaries.findIndex((s) => s.sku === "NHD-500-TX");

    expect(sw130Index).toBeLessThan(nhdIndex);
  });

  it("skips demo projects entirely", () => {
    const summaries = collectCrossProjectFeedback();
    // Demo project's SW-130-TX-UK feedback should not appear in projectNames
    const sw130 = summaries.find((s) => s.sku === "SW-130-TX-UK");
    const allNames = sw130?.ratings.flatMap((r) => r.projectNames) ?? [];
    expect(allNames).not.toContain("Demo Project");
  });
});
