import type { InstallationUnitPrices } from "./installationSchedule";

/**
 * The rep's saved installation rates: what a back box, a mount or a
 * termination costs per link by default.
 *
 * The card is a baseline, not a draft. A proposal starts from it, but what that
 * proposal priced lives on the proposal, so two jobs can quote the same back box
 * differently without either one rewriting the other's baseline. The workspace
 * store (`data/installationRateCard.ts`) is where the card is read and written;
 * this module is the shape, the arithmetic and the wording.
 */
export type InstallationRateCardCurrency = "GBP" | "USD" | "EUR";

export type InstallationRateCard = {
  /** When the workspace last wrote it; empty when no card has been saved. */
  updatedAt: string;
  /** The currency the rates are written in, which a proposal can differ from. */
  currency: InstallationRateCardCurrency;
  /** Rate per installation line id, as text, so it round-trips as typed. */
  rates: InstallationUnitPrices;
};

export const EMPTY_INSTALLATION_RATE_CARD: InstallationRateCard = {
  updatedAt: "",
  currency: "GBP",
  rates: {},
};

const CURRENCIES: InstallationRateCardCurrency[] = ["GBP", "USD", "EUR"];

/**
 * A rate is a number the document could print. Anything else is dropped rather
 * than carried forward as a value that would silently print as TBC or as zero.
 */
function printableRate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? text : null;
}

/** Check a stored card before it goes back onto a page. */
export function normalizeInstallationRateCard(value: unknown): InstallationRateCard {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_INSTALLATION_RATE_CARD;
  const record = value as Record<string, unknown>;
  const rates: InstallationUnitPrices = {};
  const stored = record.rates;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [id, raw] of Object.entries(stored as Record<string, unknown>)) {
      if (!id.trim()) continue;
      const rate = printableRate(raw);
      if (rate !== null) rates[id] = rate;
    }
  }
  return {
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    currency: CURRENCIES.includes(record.currency as InstallationRateCardCurrency)
      ? (record.currency as InstallationRateCardCurrency)
      : EMPTY_INSTALLATION_RATE_CARD.currency,
    rates,
  };
}

/**
 * Fill the lines this proposal has not reached, and leave every line it has —
 * including an emptied cell, which is the rep's deliberate exception. A cleared
 * line that was refilled here would reprice itself with no hint to explain why.
 */
export function seedInstallationRates(
  card: InstallationRateCard,
  rates: InstallationUnitPrices = {},
): InstallationUnitPrices {
  const seeded: InstallationUnitPrices = { ...rates };
  for (const [id, rate] of Object.entries(card.rates)) {
    if (seeded[id] === undefined) seeded[id] = rate;
  }
  return seeded;
}

/** Whether a cell is blank as far as the document is concerned. */
function unpriced(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/**
 * Whether this cell still holds the card's number.
 *
 * Derived rather than stored: seeding copies the card's text, so a typed-over
 * rate stops matching and a cleared cell matches nothing. That is what lets the
 * mark survive a reload without a provenance field on the draft.
 */
export function installationRateIsSeeded(
  card: InstallationRateCard,
  lineId: string,
  rate: string | undefined,
): boolean {
  const cardRate = card.rates[lineId];
  return cardRate !== undefined && !unpriced(rate) && rate === cardRate;
}

/**
 * The card's number for an unpriced line, or null when there is nothing to
 * offer. The hint is not a price: nothing prints and nothing counts as priced
 * until the rep uses it, which is why the line still reads as needing a rate.
 */
export function installationRateCardHint(
  card: InstallationRateCard,
  lineId: string,
  rate: string | undefined,
): string | null {
  if (!unpriced(rate)) return null;
  return card.rates[lineId] ?? null;
}

/**
 * The hint in the cell's words. A card written in another currency has to say
 * so, because using the hint is what puts that number on the quote.
 */
export function installationRateCardHintText(
  card: InstallationRateCard,
  currency: InstallationRateCardCurrency,
  hint: string,
): string {
  return card.currency === currency ? hint : `${hint} ${card.currency}`;
}

/**
 * The lines this proposal deliberately left unpriced: the cell is present and
 * empty while the card rates it. A line the draft has no entry for is untouched
 * rather than cleared, so it is not an exception — nobody decided anything
 * about it yet.
 */
export function installationRateCardClearedLines(
  card: InstallationRateCard,
  lineIds: readonly string[],
  rates: InstallationUnitPrices,
): string[] {
  return lineIds.filter((id) => {
    const rate = rates[id];
    return rate !== undefined && rate.trim() === "" && card.rates[id] !== undefined;
  });
}

/**
 * Every line the card can still price: the cleared cells and the ones the rep
 * has not reached. Restoring is offered over all of them, because one tap that
 * fills the survey from the card is the point of holding one.
 */
export function installationRateCardRestorations(
  card: InstallationRateCard,
  lineIds: readonly string[],
  rates: InstallationUnitPrices,
): InstallationUnitPrices {
  const restorations: InstallationUnitPrices = {};
  for (const id of lineIds) {
    const hint = installationRateCardHint(card, id, rates[id]);
    if (hint !== null) restorations[id] = hint;
  }
  return restorations;
}

/**
 * The lines still holding the card's numbers on a quote priced in another
 * currency. Only a cell still matching the card is named: a rate typed for this
 * proposal is this proposal's own, whatever currency the card is in.
 */
export function installationRateCardCurrencyMismatches(
  card: InstallationRateCard,
  lineIds: readonly string[],
  rates: InstallationUnitPrices | undefined,
  currency: InstallationRateCardCurrency,
): string[] {
  if (card.currency === currency) return [];
  return lineIds.filter((id) => installationRateIsSeeded(card, id, rates?.[id]));
}

/**
 * The priced cell's own words for a rate the card wrote in another currency.
 *
 * The export gate names these lines ("still hold your GBP rate card's numbers on
 * a USD proposal"), and a rep has to find the same cells in the table to fix
 * them — so the cell names both currencies itself instead of leaving the fact to
 * a title only a mouse can read. Empty when the card and the quote agree.
 */
export function installationRateCardCurrencyMismatchText(
  card: InstallationRateCard,
  currency: InstallationRateCardCurrency,
): string {
  if (card.currency === currency) return "";
  return `Currency mismatch: card rate in ${card.currency}, proposal in ${currency}`;
}

const CARD_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Which card these rates came from, and what to do about the lines that differ.
 * A currency mismatch is stated rather than converted: nothing here invents an
 * exchange rate on a customer's quote.
 */
export function installationRateCardNote(
  card: InstallationRateCard,
  currency: InstallationRateCardCurrency,
): string {
  if (!card.updatedAt) {
    return "No rate card saved yet. Type the rates once, then save them here so the next proposal starts from them.";
  }
  const saved = `${CARD_DATE.format(new Date(card.updatedAt))} (${card.currency})`;
  const opened = `Your rate card saved ${saved} started these lines. Change the lines that differ; a cleared line stays unpriced on this proposal.`;
  return card.currency === currency
    ? opened
    : `${opened} The card is written in ${card.currency} and this proposal is priced in ${currency}, so check each rate you kept.`;
}

/**
 * How much of the shortfall one tap handles. The action carries the number too,
 * but a rep is choosing between the tap and typing the rates themselves, so the
 * count belongs beside the gap rather than only on the control they are about to
 * press.
 */
export function installationRateCardRestoreText(count: number, currency: InstallationRateCardCurrency): string {
  return count === 1
    ? `Your ${currency} rate card fills 1 of these lines in one tap.`
    : `Your ${currency} rate card fills ${count} of these lines in one tap.`;
}

/**
 * The deliberate exceptions, said as such: the card rates these lines and this
 * proposal still does not price them, because the rep cleared them.
 */
export function installationRateCardExceptionText(count: number): string {
  return count === 1
    ? "1 line was deliberately left unpriced: the card rates it, and this proposal does not."
    : `${count} lines were deliberately left unpriced: the card rates them, and this proposal does not.`;
}
