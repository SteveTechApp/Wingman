import type { InstallationRateCard, InstallationRateCardCurrency } from "../lib/installationRateCard";
import {
  installationRateCardCurrencyMismatchText,
  installationRateCardHint,
  installationRateCardHintText,
  installationRateCardNote,
  installationRateCardRestorations,
  installationRateIsSeeded,
} from "../lib/installationRateCard";
import {
  installationCategoryLabel,
  installationLineLabel,
  INSTALLATION_TABLE_COLUMN_LABELS,
  type InstallationSchedule,
  type InstallationUnitPrices,
  type installationTotals,
} from "../lib/installationSchedule";

/**
 * The survey's install detail as priced line items, beside the equipment BOM.
 *
 * The wall builder records what each link lands in, how the screen is held and
 * the termination at that end; those are the services a customer buys for a
 * wall, so they are priced here rather than typed as free text. The page owns
 * the rates on its draft — this panel only shows the lines, says which cells the
 * workspace rate card filled, and hands back what the rep typed.
 *
 * A cleared cell is a decision, not an empty box: the card's number is offered
 * beside it as a hint, and the line stays unpriced until someone uses it. That is
 * what makes "priced for this job" and "left out on purpose" two different
 * readings rather than one TBC.
 */
export function ProposalInstallationPricing({
  schedule,
  pricing,
  rates,
  currency,
  rateCard,
  rateCardError = "",
  onRateChange,
  onSaveRateCard,
  onRestoreRates,
}: {
  schedule: InstallationSchedule;
  pricing: ReturnType<typeof installationTotals>;
  /** What the rep typed, as typed: a half-written "120." must stay editable. */
  rates: InstallationUnitPrices;
  /** The currency the document prints, not necessarily the card's. */
  currency: InstallationRateCardCurrency;
  /** The rep's saved card, which prices only the lines it holds. */
  rateCard: InstallationRateCard;
  /** Why the card could not be reached; shown in place of its provenance. */
  rateCardError?: string;
  onRateChange: (lineId: string, value: string) => void;
  onSaveRateCard: () => void;
  /** Fills every cleared line the card still rates, in one draft change. */
  onRestoreRates?: (rates: InstallationUnitPrices) => void;
}) {
  const lineIds = schedule.lines.map((line) => line.id);
  const restorations = installationRateCardRestorations(rateCard, lineIds, rates);
  const restoreCount = Object.keys(restorations).length;
  // The card is written in one currency; a number carried into a quote in
  // another is stated on the cell rather than converted behind the rep's back.
  const otherCurrency = rateCard.currency === currency ? "" : ` The card's numbers are in ${rateCard.currency}.`;
  // The same two currencies the export gate will name, so a rep can match the
  // warning's line to the cell that has to change.
  const mismatchText = installationRateCardCurrencyMismatchText(rateCard, currency);
  const priced = Object.values(rates).some((rate) => String(rate).trim() !== "");

  return (
    <>
      <div className="wm-proposal-bom-heading wm-installation-rate-card" data-proposal-installation="true">
        <div>
          <h3>Installation and services</h3>
          <p>{schedule.text}</p>
          <p
            data-testid="installation-rate-card"
            className={rateCardError ? "wm-installation-rate-card-error" : undefined}
          >
            {rateCardError || installationRateCardNote(rateCard, currency)}
          </p>
        </div>
        <div className="wm-installation-rate-card-actions">
          <button
            type="button"
            disabled={!priced}
            title={priced ? "Save these rates as the starting point for the next proposal." : "Type at least one rate to save a card."}
            onClick={onSaveRateCard}
          >
            Save as rate card
          </button>
          {onRestoreRates && restoreCount > 0 ? (
            <button
              type="button"
              data-testid="installation-restore-card-rates"
              title={`Price the cleared installation lines at the rates your card holds.${otherCurrency} Lines typed for this proposal are left alone.`}
              onClick={() => onRestoreRates(restorations)}
            >
              Restore {restoreCount} card rate{restoreCount === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="wm-proposal-bom-table">
        <table>
          <thead>
            <tr>
              <th>{INSTALLATION_TABLE_COLUMN_LABELS.service}</th>
              <th>{INSTALLATION_TABLE_COLUMN_LABELS.detail}</th>
              <th>{INSTALLATION_TABLE_COLUMN_LABELS.links}</th>
              <th>{INSTALLATION_TABLE_COLUMN_LABELS.quantity}</th>
              <th>{INSTALLATION_TABLE_COLUMN_LABELS.unitRate} ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {pricing.lines.map((line) => {
              const label = installationLineLabel(line);
              const seeded = installationRateIsSeeded(rateCard, line.id, rates[line.id]);
              const hint = installationRateCardHint(rateCard, line.id, rates[line.id]);
              const mismatch = seeded && rateCard.currency !== currency;
              return (
                <tr
                  key={line.id}
                  data-installation-line={line.id}
                  data-seeded={seeded ? "yes" : "no"}
                  data-card-hint={hint ? "yes" : undefined}
                  data-currency-mismatch={mismatch ? "yes" : undefined}
                >
                  <td>{installationCategoryLabel(line.category)}</td>
                  <td>{line.detail}</td>
                  <td>{line.links.join(", ")}</td>
                  <td>{line.quantity}</td>
                  <td>
                    <input
                      aria-label={`Unit rate for ${label}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={rates[line.id] ?? ""}
                      onChange={(event) => onRateChange(line.id, event.target.value)}
                    />
                    {seeded ? (
                      <span
                        className="wm-installation-seeded"
                        data-testid={`installation-seeded-${line.id}`}
                        title={mismatch
                          ? `This rate came from your workspace rate card, which is priced in ${rateCard.currency}; this proposal is priced in ${currency}.`
                          : "This rate came from your workspace rate card."}
                      >
                        <span>From rate card</span>
                        <button
                          type="button"
                          aria-label={`Clear seeded rate for ${label}`}
                          onClick={() => onRateChange(line.id, "")}
                        >
                          Clear
                        </button>
                      </span>
                    ) : null}
                    {/* The cell the export gate's currency warning is about says
                        so itself, with both currencies, so the rep fixes the
                        number where the warning sent them. */}
                    {mismatch ? (
                      <span
                        className="wm-installation-currency-mismatch"
                        data-testid={`installation-currency-mismatch-${line.id}`}
                        title={`This line still holds your rate card's ${rateCard.currency} number while the proposal prints ${currency}. Type this job's rate in ${currency}, or clear the card's rate, so the total is priced in the currency it states.`}
                      >
                        {mismatchText}
                      </span>
                    ) : null}
                    {hint ? (
                      <span
                        className="wm-installation-card-hint"
                        data-testid={`installation-card-hint-${line.id}`}
                      >
                        <span>Rate card: {installationRateCardHintText(rateCard, currency, hint)}</span>
                        <button
                          type="button"
                          aria-label={`Use rate card rate for ${label}`}
                          title={mismatch || rateCard.currency !== currency
                            ? `Use the ${hint} your rate card holds in ${rateCard.currency}.`
                            : `Use the ${hint} your rate card holds.`}
                          onClick={() => onRateChange(line.id, hint)}
                        >
                          Use
                        </button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
