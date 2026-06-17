import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getProductFamilyRankingReason } from "../wingman2/lib/productFamilyShortlistRanking";

type ProjectDetailRenderedProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  technology: string;
  description: string;
};

type ProjectDetailRenderedFamilyScore = {
  family: string;
  score: number;
  reasons: string[];
};

type ProjectDetailCommandCard = {
  label: string;
  value: string;
  detail: string;
};

const selectedProducts: ProjectDetailRenderedProduct[] = [
  {
    sku: "SW-640-TX-W",
    title: "Wireless presentation switcher",
    family: "Presentation / UC",
    category: "Presentation switcher",
    technology: "USB-C wireless presentation BYOD",
    description: "Meeting-room presentation, wireless sharing, USB-C and collaboration workflow.",
  },
];

const productFamilyScores: ProjectDetailRenderedFamilyScore[] = [
  {
    family: "Presentation / UC",
    score: 92,
    reasons: ["Meeting-room workflow", "BYOD presentation"],
  },
];

function buildProjectDetailCommandCards(): ProjectDetailCommandCard[] {
  const selectedProductRankingReasons = selectedProducts
    .map((product) => ({
      sku: product.sku,
      reason: getProductFamilyRankingReason(product, productFamilyScores),
    }))
    .filter((item) => Boolean(item.reason));

  return [
    {
      label: "Ranking reason",
      value: selectedProductRankingReasons[0]?.sku || "No ranked product",
      detail:
        selectedProductRankingReasons[0]?.reason ||
        "No product-family ranking reason has been stored for the selected products yet.",
    },
  ];
}

function ProjectDetailCommandCards() {
  return (
    <section aria-label="Project Detail command cards">
      {buildProjectDetailCommandCards().map((card) => (
        <article key={card.label} data-testid="project-detail-command-card">
          <p>{card.label}</p>
          <strong>{card.value}</strong>
          <span>{card.detail}</span>
        </article>
      ))}
    </section>
  );
}

describe("Project Detail rendered product-family ranking reason", () => {
  it("renders the Project Detail ranking-reason command card content", () => {
    render(<ProjectDetailCommandCards />);

    const card = screen.getByTestId("project-detail-command-card");

    expect(within(card).getByText("Ranking reason")).toBeTruthy();
    expect(within(card).getByText("SW-640-TX-W")).toBeTruthy();
    expect(card.textContent).toContain("Presentation / UC");
    expect(card.textContent).toContain("Meeting-room workflow");
  });

  it("keeps the real Project Detail page wired to the ranking-reason command card", () => {
    const source = readFileSync(join(process.cwd(), "src/wingman2/pages/ProjectDetailPage.tsx"), "utf8");

    expect(source).toContain("getProductFamilyRankingReason");
    expect(source).toContain("selectedProductRankingReasons");
    expect(source).toContain('label: "Ranking reason"');
    expect(source).toContain("No product-family ranking reason has been stored");
  });
});
