import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedbackConsolidationPanel } from "./FeedbackConsolidationPanel";

vi.mock("../lib/feedbackInformedGuidance", () => ({
  collectCrossProjectFeedback: vi.fn(),
  collectDealOutcomes: vi.fn().mockReturnValue([]),
  collectDealOutcomePatterns: vi.fn().mockReturnValue([]),
}));

import { collectCrossProjectFeedback } from "../lib/feedbackInformedGuidance";
const mockCollect = vi.mocked(collectCrossProjectFeedback);

describe("FeedbackConsolidationPanel", () => {
  it("renders nothing when there is no feedback", () => {
    mockCollect.mockReturnValue([]);
    const { container } = render(<FeedbackConsolidationPanel />);
    expect(container.textContent).toBe("");
  });

  it("renders a summary table with negative feedback SKUs sorted first", () => {
    mockCollect.mockReturnValue([
      {
        sku: "NHD-500-TX",
        ratings: [
          { rating: "accepted", count: 1, label: "Looks right", notes: [], projectNames: ["Project Alpha"] },
        ],
        totalEntries: 1,
        projectCount: 1,
      },
      {
        sku: "SW-130-TX-UK",
        ratings: [
          { rating: "wrong-fit", count: 2, label: "Wrong fit", notes: ["Needed USB 3.x"], projectNames: ["Project Beta", "Project Gamma"] },
        ],
        totalEntries: 2,
        projectCount: 2,
      },
    ]);

    render(<FeedbackConsolidationPanel />);

    expect(screen.getByText("What the field said about these products")).toBeTruthy();
    expect(screen.getByText("SW-130-TX-UK")).toBeTruthy();
    expect(screen.getByText(/Wrong fit/)).toBeTruthy();
    expect(screen.getByText(/Needed USB 3.x/)).toBeTruthy();
    expect(screen.getByText("Project Beta, Project Gamma")).toBeTruthy();
    expect(screen.getByText("NHD-500-TX")).toBeTruthy();
    expect(screen.getByText(/Accepted/)).toBeTruthy();

    // Both SKUs appear in the table; the sort order is tested in the aggregation unit test.
    const bodyRows = screen.getAllByRole("row").slice(1); // skip header
    const skuCells = bodyRows.map((row) => row.querySelector("td")?.textContent).filter(Boolean);
    expect(skuCells).toContain("SW-130-TX-UK");
    expect(skuCells).toContain("NHD-500-TX");
  });

  it("shows the negative feedback count badge", () => {
    mockCollect.mockReturnValue([
      {
        sku: "MX-0808-SCL",
        ratings: [
          { rating: "missing-accessory", count: 1, label: "Missing accessory", notes: [], projectNames: ["Project X"] },
        ],
        totalEntries: 1,
        projectCount: 1,
      },
    ]);

    render(<FeedbackConsolidationPanel />);
    expect(screen.getByText(/1 SKU with negative feedback/)).toBeTruthy();
  });
});
