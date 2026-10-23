import type { InstallationRateCard, InstallationRateCardCurrency } from "../lib/installationRateCard";
import { installationRateCardRestorations } from "../lib/installationRateCard";
import type { InstallationUnitPrices } from "../lib/installationSchedule";
import type { TemplatePricingSummary } from "../lib/templateProposalPricing";

/**
 * The commercial hold the readiness check shows before issue: which equipment
 * and installation lines the document would still print as TBC.
 *
 * A few of each kind are named, so a long equipment schedule cannot push the
 * installation lines out of sight; Pricing below carries the rest. Nothing here
 * blocks the export — the document issues and holds the total instead.
 *
 * The block is also where the rate card's one tap belongs. A rep reading "still
 * to price" is one action away from filling the survey lines the card already
 * rates, and going down to the table to find the same restore is the detour this
 * list exists to remove. It writes the same map the pricing table's action does
 * (a line priced for this template is never overwritten), and carries its own
 * test id: both buttons sit on one page, so "the restore" has to be sayable
 * without meaning the other one.
 */
export function TemplateProposalUnpriced({
  summary,
  rateCard,
  lineIds,
  rates,
  currency,
  onRestoreRates,
}: {
  summary: TemplatePricingSummary;
  /** The rep's saved card, which prices only the lines it still rates. */
  rateCard: InstallationRateCard;
  /** The installation lines this document prints, in schedule order. */
  lineIds: readonly string[];
  /** The draft's rates as typed; an empty cell is a deliberate exception. */
  rates: InstallationUnitPrices;
  /** The currency the proposal is priced in, not the card's. */
  currency: InstallationRateCardCurrency;
  /** Writes every line the card still rates in one draft change. */
  onRestoreRates: (rates: InstallationUnitPrices) => void;
}) {
  if (!summary.unpricedLines.length) return null;
  const equipment = summary.unpricedLines.filter((line) => line.kind === "equipment");
  const installation = summary.unpricedLines.filter((line) => line.kind === "installation");
  const shown = [...equipment.slice(0, 4), ...installation.slice(0, 4)];
  const hidden = summary.unpricedLines.length - shown.length;
  const restorations = installationRateCardRestorations(rateCard, lineIds, rates);
  const restoreCount = Object.keys(restorations).length;
  const restoreTitle =
    rateCard.currency !== currency
      ? `Price the installation lines your card still rates at its ${rateCard.currency} numbers. Lines priced for this template are left alone; check the currency before issuing.`
      : "Price the installation lines your card still rates. Lines priced for this template are left alone.";
  return (
    <div data-testid="template-readiness-unpriced">
      <h3>Still to price ({summary.unpricedLines.length})</h3>
      <ul aria-label="Lines the document would print as TBC">
        {shown.map((line) => (
          <li key={`${line.kind}:${line.id}`}>
            <span>{line.kind === "equipment" ? "Equipment" : "Install"}</span>
            {line.label}
          </li>
        ))}
        {hidden > 0 ? (
          <li>
            <span>More</span>
            {hidden} more lines in Pricing below
          </li>
        ) : null}
      </ul>
      <p>The document still issues, but prints these as TBC and holds the total.</p>
      {restoreCount > 0 ? (
        <p data-template-card-restore-copy>
          Restore {restoreCount} installation rate{restoreCount === 1 ? "" : "s"} from the {rateCard.currency} card.
        </p>
      ) : null}
      {restoreCount > 0 ? (
        <button
          type="button"
          className="wm-button wm-button-secondary"
          data-testid="template-readiness-restore-card-rates"
          title={restoreTitle}
          onClick={() => onRestoreRates(restorations)}
        >
          Restore {restoreCount} rate{restoreCount === 1 ? "" : "s"} from the {rateCard.currency} card
        </button>
      ) : null}
    </div>
  );
}
