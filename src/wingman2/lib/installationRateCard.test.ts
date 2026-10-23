import { describe, expect, it } from "vitest";
import {
  EMPTY_INSTALLATION_RATE_CARD,
  installationRateCardClearedLines,
  installationRateCardCurrencyMismatchText,
  installationRateCardCurrencyMismatches,
  installationRateCardExceptionText,
  installationRateCardHint,
  installationRateCardHintText,
  installationRateCardNote,
  installationRateCardRestorations,
  installationRateCardRestoreText,
  installationRateIsSeeded,
  normalizeInstallationRateCard,
  seedInstallationRates,
  type InstallationRateCard,
} from "./installationRateCard";

const BACK_BOX = "install-enclosure-back-box";
const OUTLET = "install-termination-cat6a-outlet";

function card(overrides: Partial<InstallationRateCard> = {}): InstallationRateCard {
  return {
    updatedAt: "2026-10-21T12:00:00.000Z",
    currency: "GBP",
    rates: { [BACK_BOX]: "120", [OUTLET]: "35" },
    ...overrides,
  };
}

describe("an installation rate card", () => {
  it("drops a stored rate the document could not print", () => {
    const stored = normalizeInstallationRateCard({
      updatedAt: "2026-10-22T09:00:00.000Z",
      currency: "JPY",
      rates: { [BACK_BOX]: true, [OUTLET]: [35], "install-mount-pole": "-5", "install-mount-shelf": " 80 " },
    });

    // Booleans and arrays are not money, a negative rate is not a price, and a
    // currency the document cannot print falls back rather than printing JPY.
    expect(stored.currency).toBe("GBP");
    expect(stored.rates).toEqual({ "install-mount-shelf": "80" });
    expect(normalizeInstallationRateCard(undefined)).toEqual(EMPTY_INSTALLATION_RATE_CARD);
  });
});

describe("seeding a draft from the card", () => {
  it("fills the lines the draft never reached and leaves the rest alone", () => {
    const seeded = seedInstallationRates(card(), { [BACK_BOX]: "", [OUTLET]: "50" });

    // A cleared cell and a rate typed for this proposal both survive: only an
    // absent key is an untouched line.
    expect(seeded).toEqual({ [BACK_BOX]: "", [OUTLET]: "50" });
  });

  it("marks a cell still holding the card's number, and only that cell", () => {
    expect(installationRateIsSeeded(card(), BACK_BOX, "120")).toBe(true);
    // A rate typed for this proposal is this proposal's own, even at the same
    // kind of number; a cleared cell holds nothing.
    expect(installationRateIsSeeded(card(), BACK_BOX, "150")).toBe(false);
    expect(installationRateIsSeeded(card(), BACK_BOX, "")).toBe(false);
    expect(installationRateIsSeeded(card(), "install-mount-shelf", "40")).toBe(false);
  });
});

describe("the card's number for an unpriced line", () => {
  it("is offered on a cleared or unreached cell only", () => {
    expect(installationRateCardHint(card(), BACK_BOX, "")).toBe("120");
    expect(installationRateCardHint(card(), BACK_BOX, undefined)).toBe("120");
    // A priced line keeps its own number; nothing is offered on top of it.
    expect(installationRateCardHint(card(), BACK_BOX, "150")).toBeNull();
    expect(installationRateCardHint(card(), "install-mount-shelf", "")).toBeNull();
  });

  it("says the card's currency when the proposal is priced in another", () => {
    expect(installationRateCardHintText(card(), "GBP", "120")).toBe("120");
    expect(installationRateCardHintText(card(), "USD", "120")).toBe("120 GBP");
  });
});

describe("deliberate exceptions", () => {
  it("counts a cleared cell, not a line nobody reached", () => {
    const cleared = installationRateCardClearedLines(
      card(),
      [BACK_BOX, OUTLET, "install-mount-shelf"],
      { [BACK_BOX]: "", [OUTLET]: "35" },
    );

    // The draft has no entry for the mount, so nobody has decided anything
    // about it; the back box was emptied on purpose.
    expect(cleared).toEqual([BACK_BOX]);
  });

  it("says so in the checklist's own words, in either number", () => {
    expect(installationRateCardExceptionText(1)).toContain("1 line was deliberately left unpriced");
    expect(installationRateCardExceptionText(2)).toContain("2 lines were deliberately left unpriced");
    expect(installationRateCardExceptionText(2)).toContain("the card rates them, and this proposal does not");
  });
});

describe("restoring from the card", () => {
  it("offers every line the card can still price", () => {
    const restorations = installationRateCardRestorations(card(), [BACK_BOX, OUTLET], { [BACK_BOX]: "" });

    // The cleared line and the untouched one are both the card's to fill; a rate
    // typed for this proposal is not in the map.
    expect(restorations).toEqual({ [BACK_BOX]: "120", [OUTLET]: "35" });
  });

  it("says how much of the shortfall one tap covers, in either number", () => {
    expect(installationRateCardRestoreText(1, "GBP")).toBe("Your GBP rate card fills 1 of these lines in one tap.");
    expect(installationRateCardRestoreText(3, "USD")).toContain("fills 3 of these lines in one tap");
  });

  it("names only the lines still holding the card's numbers in another currency", () => {
    const rates = { [BACK_BOX]: "120", [OUTLET]: "50" };

    expect(installationRateCardCurrencyMismatches(card(), [BACK_BOX, OUTLET], rates, "USD")).toEqual([BACK_BOX]);
    // The card and the quote agree, so there is nothing to flag.
    expect(installationRateCardCurrencyMismatches(card(), [BACK_BOX, OUTLET], rates, "GBP")).toEqual([]);
  });

  it("states both currencies on the priced cell the gate's warning is about", () => {
    // The cell names the card's currency and the proposal's, because the two
    // currencies disagreeing is the fact the export gate raises.
    expect(installationRateCardCurrencyMismatchText(card(), "USD"))
      .toBe("Currency mismatch: card rate in GBP, proposal in USD");
    // A quote priced in the card's own currency has no mismatch to state.
    expect(installationRateCardCurrencyMismatchText(card(), "GBP")).toBe("");
  });
});

describe("the card's provenance line", () => {
  it("names the card and says a cleared line stays unpriced", () => {
    const note = installationRateCardNote(card(), "GBP");

    expect(note).toContain("rate card saved 21 Oct 2026 (GBP)");
    expect(note).toContain("Change the lines that differ");
    expect(note).toContain("a cleared line stays unpriced");
  });

  it("states a currency difference instead of converting", () => {
    const note = installationRateCardNote(card(), "USD");

    expect(note).toContain("written in GBP");
    expect(note).toContain("priced in USD");
  });

  it("asks for a first card when none has been saved", () => {
    expect(installationRateCardNote(EMPTY_INSTALLATION_RATE_CARD, "GBP")).toContain("No rate card saved yet");
  });
});
