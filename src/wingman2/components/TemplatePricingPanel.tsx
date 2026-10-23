import type { InstallationSchedule, InstallationUnitPrices } from "../lib/installationSchedule";
import type { InstallationRateCard } from "../lib/installationRateCard";
import type { TemplateProposalPricing, TemplatePricingSummary } from "../lib/templateProposalPricing";
import { ProposalBomPricing } from "./ProposalBomPricing";
import { ProposalInstallationPricing } from "./ProposalInstallationPricing";

/**
 * The template review page's Pricing tab: equipment rates above, the survey's
 * installation lines below, both printed by the one document this page issues.
 * A template is exported without opening the wizard, so its rates are entered
 * here and the workspace card seeds whatever this template has not priced.
 */
export function TemplatePricingPanel({
  pricing,
  summary,
  bomRows,
  installation,
  rateCard,
  rateCardError,
  onCurrency,
  onUnitPrice,
  onInstallationRate,
  onRestoreInstallationRates,
  onSaveRateCard,
}: {
  pricing: TemplateProposalPricing;
  summary: TemplatePricingSummary;
  bomRows: Parameters<typeof ProposalBomPricing>[0]["bomRows"];
  installation: InstallationSchedule | null;
  rateCard: InstallationRateCard;
  rateCardError: string;
  onCurrency: (currency: TemplateProposalPricing["currency"]) => void;
  onUnitPrice: (sku: string, value: string) => void;
  onInstallationRate: (lineId: string, value: string) => void;
  /**
   * Fills every cleared line the card still rates, in one draft change. Left
   * out by a page whose shortfall block already carries that one tap: the same
   * action twice is two buttons one screen reader reads identically.
   */
  onRestoreInstallationRates?: (rates: InstallationUnitPrices) => void;
  onSaveRateCard: () => void;
}) {
  return (
    <section className="col-span-full" data-testid="template-proposal-pricing">
      <div className="wm-proposal-bom-heading">
        <div>
          <h3>Pricing</h3>
          <p>Enter the unit prices this template's export prints. Equipment and installation are priced together here, so the document can quote a total instead of a page of TBC.</p>
        </div>
      </div>
      <div className="wm-review-step">
        <label>Currency <select aria-label="Pricing currency" value={pricing.currency} onChange={(event) => onCurrency(event.target.value as TemplateProposalPricing["currency"])}><option value="GBP">GBP</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
      </div>
      <p role="status" data-testid="template-pricing-status">{summary.text}</p>
      <ProposalBomPricing bomRows={bomRows} currency={pricing.currency} unitPrices={pricing.bomUnitPrices} onUnitPriceChange={onUnitPrice} />
      {installation && summary.installation ? (
        <ProposalInstallationPricing
          schedule={installation}
          pricing={summary.installation}
          rates={pricing.installationUnitPrices}
          currency={pricing.currency}
          rateCard={rateCard}
          rateCardError={rateCardError}
          onSaveRateCard={onSaveRateCard}
          onRateChange={onInstallationRate}
          onRestoreRates={onRestoreInstallationRates}
        />
      ) : null}
    </section>
  );
}
