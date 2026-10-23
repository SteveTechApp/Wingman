import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PROPOSAL_PRICING_GAP } from "../lib/proposalWizard";
import { ProposalReadinessList } from "./ProposalReadinessList";

const card = {
  updatedAt: "2026-10-20T14:12:00.000Z",
  currency: "GBP" as const,
  rates: { "install-enclosure-back-box": "120" },
};

function renderList(overrides: Partial<Parameters<typeof ProposalReadinessList>[0]> = {}) {
  const onRestoreRates = vi.fn();
  render(
    <ProposalReadinessList
      missing={["Add the executive summary.", PROPOSAL_PRICING_GAP]}
      rateCard={card}
      lineIds={["install-enclosure-back-box", "install-mount-tilt-bracket"]}
      rates={{ "install-enclosure-back-box": "" }}
      currency="GBP"
      onRestoreRates={onRestoreRates}
      {...overrides}
    />,
  );
  return { onRestoreRates };
}

describe("ProposalReadinessList", () => {
  it("puts the card's restore on the item that reports the unpriced lines", () => {
    const { onRestoreRates } = renderList();

    const item = document.querySelector('[data-readiness-item="pricing"]');
    expect(item?.textContent).toContain(PROPOSAL_PRICING_GAP);
    // The other items stay plain: only the pricing gap is the card's to fix.
    expect(screen.getByText("Add the executive summary.").closest("li")?.hasAttribute("data-readiness-item")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Restore 1 rate from the GBP card" }));

    // Only the line the card still rates is written; the mount the card does
    // not know stays unpriced and keeps the item in place.
    expect(onRestoreRates).toHaveBeenCalledWith({ "install-enclosure-back-box": "120" });
  });

  it("offers no fix when the card cannot price the reported line", () => {
    renderList({ lineIds: ["install-mount-tilt-bracket"], rates: {} });

    expect(screen.getByText(PROPOSAL_PRICING_GAP)).not.toBeNull();
    expect(screen.queryByTestId("proposal-readiness-restore-card-rates")).toBeNull();
    expect(document.querySelector('[data-readiness-item="pricing"]')).toBeNull();
    // Nothing is one tap away, so no count is promised beside the gap.
    expect(document.querySelector("[data-readiness-restore-count]")).toBeNull();
  });

  it("shows the restore count beside the shortfall, before anything is priced by hand", () => {
    renderList();

    const count = document.querySelector("[data-readiness-restore-count]");
    expect(count?.getAttribute("data-readiness-restore-count")).toBe("1");
    expect(count?.textContent).toContain("fills 1 of these lines in one tap");
    // The count is part of the shortfall, not only a label on the button: it
    // sits under the sentence it explains.
    expect(count?.previousElementSibling?.textContent).toContain(PROPOSAL_PRICING_GAP);
  });

  it("counts every line the card would clear in the one tap", () => {
    renderList({
      rates: { "install-enclosure-back-box": "", "install-mount-tilt-bracket": "" },
      rateCard: {
        ...card,
        rates: { "install-enclosure-back-box": "120", "install-mount-tilt-bracket": "45" },
      },
    });

    expect(document.querySelector("[data-readiness-restore-count]")?.textContent)
      .toContain("fills 2 of these lines in one tap");
    expect(screen.getByRole("button", { name: "Restore 2 rates from the GBP card" })).not.toBeNull();
  });

  it("says a cleared rate was a deliberate exception, not only a missing price", () => {
    renderList({ rates: { "install-enclosure-back-box": "" } });

    const item = document.querySelector('[data-readiness-item="pricing"]');
    // The item still names what the document would print as TBC...
    expect(item?.textContent).toContain(PROPOSAL_PRICING_GAP);
    // ...and says the line was left unpriced on purpose, so a decision the rep
    // made does not read as work they forgot.
    const exception = document.querySelector('[data-readiness-exception="deliberately-unpriced"]');
    expect(exception?.textContent).toContain("1 line was deliberately left unpriced");
    expect(exception?.textContent).toContain("the card rates it, and this proposal does not");
    // A deliberate exception can still be undone in one tap.
    expect(screen.getByRole("button", { name: "Restore 1 rate from the GBP card" })).not.toBeNull();
  });

  it("counts every cleared line the card rates", () => {
    renderList({
      rates: { "install-enclosure-back-box": "", "install-mount-tilt-bracket": "" },
      rateCard: {
        ...card,
        rates: { "install-enclosure-back-box": "120", "install-mount-tilt-bracket": "45" },
      },
    });

    expect(document.querySelector('[data-readiness-exception="deliberately-unpriced"]')?.textContent)
      .toContain("2 lines were deliberately left unpriced");
    // Both are the card's to fill, so the one action still covers them.
    expect(screen.getByRole("button", { name: "Restore 2 rates from the GBP card" })).not.toBeNull();
  });

  it("does not call an unreached line a deliberate exception", () => {
    // The draft holds no entry for the back box: nobody has priced it or cleared
    // it, so it is unpriced rather than an exception. The card still offers its rate.
    renderList({ rates: {} });

    expect(screen.getByText(PROPOSAL_PRICING_GAP)).not.toBeNull();
    expect(document.querySelector('[data-readiness-exception="deliberately-unpriced"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Restore 1 rate from the GBP card" })).not.toBeNull();
  });

  it("says nothing about an exception when the line is priced for this proposal", () => {
    renderList({ rates: { "install-enclosure-back-box": "120" } });

    expect(document.querySelector('[data-readiness-exception="deliberately-unpriced"]')).toBeNull();
    expect(screen.queryByTestId("proposal-readiness-restore-card-rates")).toBeNull();
  });

  it("says so when nothing is outstanding", () => {
    renderList({ missing: [] });

    expect(screen.getByText("No completion item remains.")).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
