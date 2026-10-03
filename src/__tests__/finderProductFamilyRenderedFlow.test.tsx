import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getProductFamilyRankingReason,
  rankProductsByFamilyScores,
} from "../wingman2/lib/productFamilyShortlistRanking";

type FinderRenderedProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  technology: string;
  description: string;
};

type FinderRenderedFamilyScore = {
  family: string;
  score: number;
  reasons: string[];
};

const products: FinderRenderedProduct[] = [
  {
    sku: "MX-0808-KIT",
    title: "Fixed 8x8 matrix kit",
    family: "Matrix switching",
    category: "Matrix",
    technology: "HDBaseT matrix switching",
    description: "Fixed source-to-display routing for local rooms.",
  },
  {
    sku: "SW-640-TX-W",
    title: "Wireless presentation switcher",
    family: "Presentation / UC",
    category: "Presentation switcher",
    technology: "USB-C wireless presentation BYOD",
    description: "Meeting-room presentation, USB-C, wireless sharing, and collaboration workflow.",
  },
  {
    sku: "NHD-500-TX",
    title: "NetworkHD 500 encoder",
    family: "NetworkHD 500",
    category: "AV-over-IP",
    technology: "JPEG XS AV-over-IP encoder",
    description: "Premium 4K60 AV-over-IP source encoding for distributed systems.",
  },
];

function FinderRenderedResults({
  familyScores,
}: {
  familyScores: FinderRenderedFamilyScore[];
}) {
  const rankedProducts = rankProductsByFamilyScores(products, familyScores);
  const topReason = rankedProducts[0]
    ? getProductFamilyRankingReason(rankedProducts[0], familyScores)
    : "";

  return (
    <section aria-label="Finder recommendation results">
      {topReason ? (
        <div data-testid="finder-product-family-ranking-reason">
          Why this is first: {topReason}
        </div>
      ) : null}

      <ol data-testid="finder-ranked-results">
        {rankedProducts.map((product) => (
          <li key={product.sku}>
            <span>{product.sku}</span>
            <span>{product.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

describe("Finder rendered product-family ranking flow", () => {
  it("renders the product-family-ranked order and visible top-product reason", () => {
    render(
      <FinderRenderedResults
        familyScores={[
          {
            family: "Presentation / UC",
            score: 92,
            reasons: ["Meeting-room workflow", "BYOD presentation"],
          },
          {
            family: "Matrix switching",
            score: 45,
            reasons: ["Some fixed routing"],
          },
          {
            family: "NetworkHD 500",
            score: 30,
            reasons: ["Limited distributed AV requirement"],
          },
        ]}
      />,
    );

    const resultItems = within(screen.getByTestId("finder-ranked-results")).getAllByRole("listitem");

    expect(resultItems[0]?.textContent).toContain("SW-640-TX-W");
    expect(resultItems[1]?.textContent).toContain("MX-0808-KIT");
    expect(resultItems[2]?.textContent).toContain("NHD-500-TX");

    const reason = screen.getByTestId("finder-product-family-ranking-reason");

    expect(reason.textContent).toContain("Why this is first:");
    expect(reason.textContent).toContain("Presentation / UC");
    expect(reason.textContent).toContain("Meeting-room workflow");
  });

  it("changes the rendered first product when the family path changes", () => {
    const { rerender } = render(
      <FinderRenderedResults
        familyScores={[
          {
            family: "Presentation / UC",
            score: 92,
            reasons: ["Meeting-room workflow"],
          },
          {
            family: "NetworkHD 500",
            score: 30,
            reasons: ["Limited distributed AV requirement"],
          },
        ]}
      />,
    );

    let resultItems = within(screen.getByTestId("finder-ranked-results")).getAllByRole("listitem");

    expect(resultItems[0]?.textContent).toContain("SW-640-TX-W");

    rerender(
      <FinderRenderedResults
        familyScores={[
          {
            family: "NetworkHD 500",
            score: 94,
            reasons: ["Distributed AV", "premium AV-over-IP"],
          },
          {
            family: "Presentation / UC",
            score: 25,
            reasons: ["No meeting-room workflow"],
          },
        ]}
      />,
    );

    resultItems = within(screen.getByTestId("finder-ranked-results")).getAllByRole("listitem");

    expect(resultItems[0]?.textContent).toContain("NHD-500-TX");
    expect(screen.getByTestId("finder-product-family-ranking-reason").textContent).toContain("NetworkHD 500");
  });
});
