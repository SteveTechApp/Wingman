import type { InstallationRateCard, InstallationRateCardCurrency } from "../lib/installationRateCard";
import {
  installationRateCardClearedLines,
  installationRateCardExceptionText,
  installationRateCardRestorations,
  installationRateCardRestoreText,
} from "../lib/installationRateCard";
import type { InstallationUnitPrices } from "../lib/installationSchedule";
import { PROPOSAL_PRICING_GAP } from "../lib/proposalWizard";

/**
 * The completion checklist's remaining items, with the fixes the page can offer
 * in place.
 *
 * The workspace rate card can price the installation lines the survey produced,
 * and the checklist is where the rep is told a printed line has none, so the
 * card's one-tap restore sits on that item rather than a step away. It fills the
 * same map the pricing panel restores: a line typed for this proposal is already
 * priced and is never overwritten. Equipment prices stay as entered, so an item
 * that still reports an unpriced SKU keeps its place after the tap.
 *
 * A cleared line is not the same gap as a line nobody has reached. The card rates
 * it and this proposal does not, so the item says that the line was left
 * unpriced on purpose — otherwise a decision the rep made reads as work they
 * forgot, and the next person to open the proposal prices it back in.
 *
 * The shortfall also says how much of itself one tap covers. A rep reading three
 * unpriced lines chooses between the card and their own numbers, and that choice
 * is easier when the count sits beside the gap instead of only on the button.
 */
export function ProposalReadinessList({
  missing,
  rateCard,
  lineIds,
  rates,
  currency,
  onRestoreRates,
}: {
  /** What the readiness check says is still missing, in its own words. */
  missing: readonly string[];
  /** The rep's saved card, which prices only the lines it still rates. */
  rateCard: InstallationRateCard;
  /** The installation lines this document prints, in schedule order. */
  lineIds: readonly string[];
  /** The draft's rates as typed; an empty cell is a deliberate exception. */
  rates: InstallationUnitPrices;
  /** The currency the proposal is priced in, not the card's. */
  currency: InstallationRateCardCurrency;
  /** Writes every cleared line the card still rates in one draft change. */
  onRestoreRates: (rates: InstallationUnitPrices) => void;
}) {
  if (!missing.length) return <p>No completion item remains.</p>;

  const restorations = installationRateCardRestorations(rateCard, lineIds, rates);
  const restoreCount = Object.keys(restorations).length;
  // Present and empty is a decision; absent is a line nobody has reached yet.
  const clearedCount = installationRateCardClearedLines(rateCard, lineIds, rates).length;
  const restoreTitle =
    rateCard.currency !== currency
      ? `Price the cleared installation lines at the rates your card holds in ${rateCard.currency}. Equipment prices stay as entered; check the currency before issuing.`
      : "Price the cleared installation lines at the rates your card holds. Equipment prices stay as entered.";

  return (
    <ul>
      {missing.map((item) => {
        const fixable = item === PROPOSAL_PRICING_GAP && restoreCount > 0;
        return (
          <li key={item} data-readiness-item={fixable ? "pricing" : undefined}>
            <span>{item}</span>
            {fixable ? (
              <p data-readiness-restore-count={restoreCount}>{installationRateCardRestoreText(restoreCount, rateCard.currency)}</p>
            ) : null}
            {fixable && clearedCount > 0 ? (
              <p data-readiness-exception="deliberately-unpriced">
                {installationRateCardExceptionText(clearedCount)}
              </p>
            ) : null}
            {fixable ? (
              <button
                type="button"
                className="wm-proposal-readiness-fix"
                data-testid="proposal-readiness-restore-card-rates"
                title={restoreTitle}
                onClick={() => onRestoreRates(restorations)}
              >
                Restore {restoreCount} rate{restoreCount === 1 ? "" : "s"} from the {rateCard.currency} card
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
