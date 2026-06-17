import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareCandidateShortlist } from "../wingman2/components/compare/CompareCandidateShortlist";

const candidates = [
  {
    sku: "SW-640-TX-W",
    name: "Wireless presentation switcher",
    family: "Presentation / UC",
    category: "Presentation switcher",
    technology: "USB-C wireless presentation BYOD",
    inputs: 6,
    outputs: 2,
  },
];

describe("Compare candidate product-family ranking reason", () => {
  it("renders the reason only when product-family score context exists", () => {
    const { rerender } = render(<CompareCandidateShortlist candidates={candidates} />);

    expect(screen.queryByTestId("compare-product-family-ranking-reason")).toBeNull();

    rerender(
      <CompareCandidateShortlist
        candidates={candidates}
        productFamilyScores={[
          {
            family: "Presentation / UC",
            score: 92,
            reasons: ["Meeting-room workflow", "BYOD presentation"],
          },
        ]}
      />,
    );

    const reason = screen.getByTestId("compare-product-family-ranking-reason");

    expect(reason.textContent).toContain("Why this compare option is prioritised:");
    expect(reason.textContent).toContain("Presentation / UC");
    expect(reason.textContent).toContain("Meeting-room workflow");
  });
});

describe("Compare candidate product-family ranking reason guard", () => {
  it("keeps the ranking reason hidden when score context is empty or does not match", () => {
    const { rerender } = render(
      <CompareCandidateShortlist candidates={candidates} productFamilyScores={[]} />,
    );

    expect(screen.queryByTestId("compare-product-family-ranking-reason")).toBeNull();

    rerender(
      <CompareCandidateShortlist
        candidates={candidates}
        productFamilyScores={[
          {
            family: "NetworkHD 500",
            score: 94,
            reasons: ["Distributed AV-over-IP path"],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("compare-product-family-ranking-reason")).toBeNull();
  });
});

