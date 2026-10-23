import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildInstallationSchedule, installationLineLabel, installationTotals } from "../lib/installationSchedule";
import { defaultWallRequirements } from "../lib/videowallOptions";
import { ProposalInstallationPricing } from "./ProposalInstallationPricing";

const schedule = buildInstallationSchedule({
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

const card = { updatedAt: "2026-10-21T12:00:00.000Z", currency: "GBP" as const, rates: {} };

function renderPanel(rates: Record<string, string> = {}) {
  const onSaveRateCard = vi.fn();
  render(
    <ProposalInstallationPricing
      schedule={schedule}
      pricing={installationTotals(schedule, rates)}
      rates={rates}
      currency="GBP"
      rateCard={card}
      onSaveRateCard={onSaveRateCard}
      onRateChange={vi.fn()}
    />,
  );
  return { onSaveRateCard };
}

describe("ProposalInstallationPricing rate card", () => {
  it("says where the starting rates came from", () => {
    renderPanel({});

    expect(screen.getByTestId("installation-rate-card").textContent).toContain("rate card saved 21 Oct 2026 (GBP)");
    expect(screen.getByTestId("installation-rate-card").textContent).toContain("Change the lines that differ");
  });

  it("saves the typed rates back for the next proposal", () => {
    const { onSaveRateCard } = renderPanel({ "install-enclosure-back-box": "120" });

    const save = screen.getByRole("button", { name: "Save as rate card" });
    expect(save.hasAttribute("disabled")).toBe(false);
    fireEvent.click(save);

    expect(onSaveRateCard).toHaveBeenCalledTimes(1);
  });

  it("cannot save a card with no rates on it", () => {
    renderPanel({});

    expect(screen.getByRole("button", { name: "Save as rate card" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("ProposalInstallationPricing seeded rates", () => {
  const backBox = schedule.lines.find((line) => line.category === "enclosure" && line.detail === "Back box")!;
  const faceplate = schedule.lines.find((line) => line.category === "termination")!;
  const rated = {
    updatedAt: "2026-10-21T12:00:00.000Z",
    currency: "GBP" as const,
    rates: { [backBox.id]: "120", [faceplate.id]: "45" },
  };

  function renderRates(
    rates: Record<string, string>,
    currency: "GBP" | "USD" = "GBP",
    { restore = true }: { restore?: boolean } = {},
  ) {
    const onRateChange = vi.fn();
    const onRestoreRates = vi.fn();
    render(
      <ProposalInstallationPricing
        schedule={schedule}
        pricing={installationTotals(schedule, rates)}
        rates={rates}
        currency={currency}
        rateCard={rated}
        onSaveRateCard={vi.fn()}
        onRateChange={onRateChange}
        onRestoreRates={restore ? onRestoreRates : undefined}
      />,
    );
    return { onRateChange, onRestoreRates };
  }

  it("marks the line the rate card filled and clears it in one tap", () => {
    const { onRateChange } = renderRates({ [backBox.id]: "120", [faceplate.id]: "45" });

    const row = document.querySelector(`[data-installation-line="${backBox.id}"]`);
    expect(row?.getAttribute("data-seeded")).toBe("yes");
    expect(screen.getByTestId(`installation-seeded-${backBox.id}`).textContent).toContain("From rate card");
    // The card and the quote are both in GBP, so there is no mismatch to name.
    expect(screen.queryByTestId(`installation-currency-mismatch-${backBox.id}`)).toBeNull();
    expect(row?.hasAttribute("data-currency-mismatch")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: `Clear seeded rate for ${installationLineLabel(backBox)}` }));

    // Clearing is the deliberate unpriced cell, so the seed will not refill it.
    expect(onRateChange).toHaveBeenCalledWith(backBox.id, "");
  });

  it("does not mark a rate typed for this proposal", () => {
    renderRates({ [backBox.id]: "150" });

    expect(screen.queryByTestId(`installation-seeded-${backBox.id}`)).toBeNull();
    expect(document.querySelector(`[data-installation-line="${backBox.id}"]`)?.getAttribute("data-seeded")).toBe("no");
  });

  it("does not mark a cleared line as seeded", () => {
    renderRates({ [backBox.id]: "" });

    expect(screen.queryByTestId(`installation-seeded-${backBox.id}`)).toBeNull();
  });

  it("hints the card's number on a cleared line and puts it back in one tap", () => {
    const { onRateChange } = renderRates({ [backBox.id]: "" });

    // The cleared cell stays unpriced — the number is a hint, not a price.
    const hint = screen.getByTestId(`installation-card-hint-${backBox.id}`);
    expect(hint.textContent).toContain("Rate card: 120");
    expect(screen.getByLabelText(`Unit rate for ${installationLineLabel(backBox)}`)).toHaveValue(null);
    expect(document.querySelector(`[data-installation-line="${backBox.id}"]`)?.getAttribute("data-card-hint")).toBe("yes");

    fireEvent.click(screen.getByRole("button", { name: `Use rate card rate for ${installationLineLabel(backBox)}` }));

    // Restoring copies the card's number back into this proposal's draft.
    expect(onRateChange).toHaveBeenCalledWith(backBox.id, "120");
  });

  it("names both currencies on the cell it carried into a quote in another", () => {
    // One cell still holds the GBP card's number on a USD quote; the other was
    // priced for this proposal, so only the first is the card's.
    renderRates({ [backBox.id]: "150", [faceplate.id]: "45" }, "USD");

    const chip = screen.getByTestId(`installation-seeded-${faceplate.id}`);
    expect(chip.textContent).toContain("From rate card");
    expect(chip.getAttribute("title")).toContain("priced in USD");
    // The line itself says which two currencies disagree, so the rep sent here
    // by the export gate's warning can find the cell without hovering.
    const mismatch = screen.getByTestId(`installation-currency-mismatch-${faceplate.id}`);
    expect(mismatch.textContent).toBe("Currency mismatch: card rate in GBP, proposal in USD");
    expect(mismatch.getAttribute("title")).toContain("Type this job's rate in USD");
    // It sits in the rate cell, under the number it describes — the same cell the
    // gate's line names.
    expect(mismatch.closest("td")?.querySelector(`[data-installation-line="${faceplate.id}"]`)).toBeNull();
    expect(mismatch.closest("tr")?.getAttribute("data-installation-line")).toBe(faceplate.id);
    expect(mismatch.closest("td")?.querySelector("input")?.getAttribute("aria-label")).toBe(`Unit rate for ${installationLineLabel(faceplate)}`);
    expect(document.querySelector(`[data-installation-line="${faceplate.id}"]`)?.getAttribute("data-currency-mismatch")).toBe("yes");
    // This job's own number is not the card's to flag.
    expect(screen.queryByTestId(`installation-seeded-${backBox.id}`)).toBeNull();
    expect(screen.queryByTestId(`installation-currency-mismatch-${backBox.id}`)).toBeNull();
    expect(document.querySelectorAll('[data-currency-mismatch="yes"]')).toHaveLength(1);
  });

  it("names the card's currency on the hint when the proposal is priced in another", () => {
    const { onRateChange } = renderRates({ [backBox.id]: "" }, "USD");

    // The card is written in GBP and this proposal is priced in USD, so the
    // number cannot come back without saying which currency it is in.
    const hint = screen.getByTestId(`installation-card-hint-${backBox.id}`);
    expect(hint.textContent).toContain("Rate card: 120 GBP");
    expect(screen.getByRole("button", { name: `Use rate card rate for ${installationLineLabel(backBox)}` }).getAttribute("title"))
      .toContain("in GBP");
    // The bulk restore says the same thing about the currency it is about to use.
    expect(screen.getByTestId("installation-restore-card-rates").getAttribute("title")).toContain("in GBP");

    fireEvent.click(screen.getByRole("button", { name: `Use rate card rate for ${installationLineLabel(backBox)}` }));

    // Only the number is restored; the currency label is the panel's, not the cell's.
    expect(onRateChange).toHaveBeenCalledWith(backBox.id, "120");
  });

  it("restores every cleared line the card rates in one change", () => {
    // One line cleared, one typed for this proposal: only the cleared one is the
    // card's to fill.
    const { onRestoreRates } = renderRates({ [backBox.id]: "", [faceplate.id]: "50" });

    const restore = screen.getByRole("button", { name: "Restore 1 card rate" });
    expect(restore.getAttribute("title")).toContain("Lines typed for this proposal are left alone");

    fireEvent.click(restore);

    expect(onRestoreRates).toHaveBeenCalledWith({ [backBox.id]: "120" });
  });

  it("restores nothing when every line is priced", () => {
    renderRates({ [backBox.id]: "120", [faceplate.id]: "45" });

    expect(screen.queryByTestId("installation-restore-card-rates")).toBeNull();
  });

  it("offers no bulk restore where the route takes no restore callback", () => {
    renderRates({ [backBox.id]: "" }, "GBP", { restore: false });

    expect(screen.queryByTestId("installation-restore-card-rates")).toBeNull();
    // The per-line hint and its one-tap Use are still there.
    expect(screen.getByTestId(`installation-card-hint-${backBox.id}`)).not.toBeNull();
  });

  it("offers no hint on a line that is already priced or unknown to the card", () => {
    renderRates({ [backBox.id]: "150" });

    // This proposal's own rate wins over the card, so there is nothing to offer.
    expect(screen.queryByTestId(`installation-card-hint-${backBox.id}`)).toBeNull();
    // A line this draft has no entry for is unpriced too, so the card's rate is
    // still offered rather than leaving the empty cell silent.
    expect(screen.queryByTestId(`installation-card-hint-${faceplate.id}`)).not.toBeNull();
  });
});
