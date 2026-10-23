import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildInstallationSchedule } from "../lib/installationSchedule";
import { templatePricingSummary, type TemplateProposalPricing } from "../lib/templateProposalPricing";
import { defaultWallRequirements } from "../lib/videowallOptions";
import { TemplateProposalUnpriced } from "./TemplateProposalUnpriced";

const installation = buildInstallationSchedule({
  ...defaultWallRequirements,
  application: "lcd-direct",
  layout: "independent",
  columns: 2,
  rows: 1,
  sources: 1,
  linkDetails: {
    "source-1": { enclosure: "Back box" },
    "display-1": { enclosure: "Back box", termination: "HDMI faceplate" },
  },
})!;
const lineIds = installation.lines.map((line) => line.id);
const backBox = installation.lines.find((line) => line.category === "enclosure")!;
const faceplate = installation.lines.find((line) => line.category === "termination")!;

const bomRows = [
  { item: 1, sku: "EXP-SW-0401-8K", description: "Switcher", role: "Switching", qty: 1, type: "Required" as const, status: "included", evidence: "Datasheet", notes: "" },
];

const card = {
  updatedAt: "2026-10-21T12:00:00.000Z",
  currency: "GBP" as const,
  rates: { [backBox.id]: "120", [faceplate.id]: "45" },
};

function summaryFor(pricing: TemplateProposalPricing) {
  return templatePricingSummary(
    bomRows as never,
    installation,
    pricing,
  );
}

function renderBlock(pricing: TemplateProposalPricing, onRestoreRates = vi.fn()) {
  render(
    <TemplateProposalUnpriced
      summary={summaryFor(pricing)}
      rateCard={card}
      lineIds={lineIds}
      rates={pricing.installationUnitPrices}
      currency={pricing.currency}
      onRestoreRates={onRestoreRates}
    />,
  );
  return { onRestoreRates };
}

const empty: TemplateProposalPricing = { currency: "GBP", bomUnitPrices: {}, installationUnitPrices: {} };

describe("TemplateProposalUnpriced", () => {
  it("renders nothing once every printed line is priced", () => {
    const priced: TemplateProposalPricing = {
      currency: "GBP",
      bomUnitPrices: { "EXP-SW-0401-8K": "100" },
      installationUnitPrices: { [backBox.id]: "120", [faceplate.id]: "45" },
    };

    render(
      <TemplateProposalUnpriced
        summary={summaryFor(priced)}
        rateCard={card}
        lineIds={lineIds}
        rates={priced.installationUnitPrices}
        currency={priced.currency}
        onRestoreRates={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("template-readiness-unpriced")).toBeNull();
  });

  it("offers the card's rates on the block, under its own test id", () => {
    const { onRestoreRates } = renderBlock(empty);

    const block = screen.getByTestId("template-readiness-unpriced");
    const restore = screen.getByTestId("template-readiness-restore-card-rates");
    expect(block.contains(restore)).toBe(true);
    // The pricing table's action is on the same page, so this one has to be
    // sayable on its own rather than sharing the table's identity.
    expect(screen.queryByTestId("installation-restore-card-rates")).toBeNull();
    expect(restore.textContent).toBe("Restore 2 rates from the GBP card");

    fireEvent.click(restore);

    // The same map the pricing table writes: only the lines the card rates.
    expect(onRestoreRates).toHaveBeenCalledWith({ [backBox.id]: "120", [faceplate.id]: "45" });
  });

  it("counts only the lines still unpriced, never one this template already prices", () => {
    const { onRestoreRates } = renderBlock({
      currency: "GBP",
      bomUnitPrices: { "EXP-SW-0401-8K": "100" },
      installationUnitPrices: { [backBox.id]: "150" },
    });

    const restore = screen.getByTestId("template-readiness-restore-card-rates");
    expect(restore.textContent).toBe("Restore 1 rate from the GBP card");

    fireEvent.click(restore);

    // The back box was typed for this template, so the tap leaves it alone.
    expect(onRestoreRates).toHaveBeenCalledWith({ [faceplate.id]: "45" });
  });

  it("offers no restore for lines the card cannot rate", () => {
    render(
      <TemplateProposalUnpriced
        summary={summaryFor(empty)}
        rateCard={{ updatedAt: "2026-10-21T12:00:00.000Z", currency: "GBP", rates: {} }}
        lineIds={lineIds}
        rates={{}}
        currency="GBP"
        onRestoreRates={vi.fn()}
      />,
    );

    // The block still names the lines; there is nothing to fill them with.
    expect(screen.getByTestId("template-readiness-unpriced")).not.toBeNull();
    expect(screen.queryByTestId("template-readiness-restore-card-rates")).toBeNull();
  });

  it("says the card's currency when the proposal is priced in another", () => {
    renderBlock({ ...empty, currency: "USD" });

    expect(screen.getByTestId("template-readiness-restore-card-rates").getAttribute("title"))
      .toContain("its GBP numbers");
  });
});
