import { installationLineLabel, installationTotals, type InstallationSchedule } from "./installationSchedule";
import { bomPricingTotals, unitPriceValue, type UnitPriceMap } from "./proposalPricing";
import type { ProposalWizardDraft } from "./proposalWizard";
import type { SalesBomRow } from "./salesReadiness";

/**
 * Prices for a template-driven proposal, kept beside the template.
 *
 * A template review exports a proposal without opening the wizard, so the rates
 * the document prints have to be entered there. They are the same two maps the
 * wizard draft carries — equipment by SKU, installation by line id — so the
 * document builder reads one shape whichever route assembled it. Nothing is
 * invented here: an unpriced line stays unpriced and the document says so.
 */
export type TemplateProposalPricing = {
  currency: ProposalWizardDraft["currency"];
  /** Unit price per equipment SKU, as typed. */
  bomUnitPrices: UnitPriceMap;
  /** Unit rate per installation line id, as typed. */
  installationUnitPrices: UnitPriceMap;
};

export const EMPTY_TEMPLATE_PRICING: TemplateProposalPricing = {
  currency: "GBP",
  bomUnitPrices: {},
  installationUnitPrices: {},
};

const CURRENCIES: ProposalWizardDraft["currency"][] = ["GBP", "USD", "EUR"];
const STORAGE_PREFIX = "wingman-template-pricing-v1";

/** Prices belong to the template a rep is working on, not to a project id. */
export function templatePricingStorageKey(templateId: string) {
  return `${STORAGE_PREFIX}:${templateId || "template"}`;
}

/**
 * A stored price is text: a number written by an older draft is the same price,
 * and anything the document could not print is dropped rather than carried
 * forward as a value that would silently print as TBC or as zero.
 *
 * An emptied cell is kept as an empty string. That is how the rep records "not
 * priced on this proposal": dropping the key would make the line look untouched,
 * and the rate card seeds untouched lines — so a rate deliberately cleared here
 * would come back by itself on the next visit, with no hint to say why.
 */
function priceMap(value: unknown): UnitPriceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const prices: UnitPriceMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key.trim()) continue;
    if (typeof raw !== "string" && typeof raw !== "number") continue;
    const text = String(raw);
    if (text.trim() === "") {
      prices[key] = "";
      continue;
    }
    // The same rule the document applies, so a stored value cannot be one the
    // panel counts as priced but the export refuses to print.
    if (unitPriceValue(text) === null) continue;
    prices[key] = text;
  }
  return prices;
}

/** Check a stored pricing record before it goes back onto the page. */
export function normalizeTemplateProposalPricing(value: unknown): TemplateProposalPricing {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_TEMPLATE_PRICING;
  const record = value as Record<string, unknown>;
  const currency = CURRENCIES.includes(record.currency as ProposalWizardDraft["currency"])
    ? (record.currency as ProposalWizardDraft["currency"])
    : EMPTY_TEMPLATE_PRICING.currency;
  return {
    currency,
    bomUnitPrices: priceMap(record.bomUnitPrices),
    installationUnitPrices: priceMap(record.installationUnitPrices),
  };
}

/** The prices saved for this template, or an empty set on a first visit. */
export function loadTemplateProposalPricing(templateId: string): TemplateProposalPricing {
  if (typeof window === "undefined") return EMPTY_TEMPLATE_PRICING;
  try {
    const raw = window.localStorage.getItem(templatePricingStorageKey(templateId));
    if (!raw) return EMPTY_TEMPLATE_PRICING;
    return normalizeTemplateProposalPricing(JSON.parse(raw));
  } catch {
    return EMPTY_TEMPLATE_PRICING;
  }
}

/**
 * Keep the prices with the template. Saved as typed, so a value being edited is
 * not rewritten between keystrokes; the load path is what checks them.
 */
export function saveTemplateProposalPricing(templateId: string, pricing: TemplateProposalPricing) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(templatePricingStorageKey(templateId), JSON.stringify(pricing));
  } catch {
    // Storage may be disabled; the prices still drive the export this visit.
  }
}

/**
 * The wizard draft the document builder reads, with the template's prices on it.
 * Everything else — reference, date, narrative — stays as the template defaults
 * produced it, so a price cannot bring wizard-only copy along.
 */
export function templatePricingDraft(
  defaults: ProposalWizardDraft,
  pricing: TemplateProposalPricing,
): ProposalWizardDraft {
  return {
    ...defaults,
    currency: pricing.currency,
    bomUnitPrices: { ...pricing.bomUnitPrices },
    installationUnitPrices: { ...pricing.installationUnitPrices },
  };
}

/**
 * One line the document would still print as TBC: an equipment row with no unit
 * price, or an installation line with no rate.
 *
 * The readiness check and the export summary read this same list, so the page
 * cannot name a line in one place that the other calls priced.
 */
export type TemplateUnpricedLine = {
  /** Which printed schedule the line belongs to. */
  kind: "equipment" | "installation";
  /** The key a rate is filed under: a SKU, or an installation line id. */
  id: string;
  /** How the row reads in the panel: the SKU, or "Display housing — Back box". */
  label: string;
};

export type TemplatePricingSummary = {
  equipment: ReturnType<typeof bomPricingTotals>;
  installation: ReturnType<typeof installationTotals> | null;
  /** Equipment rows the rep has not priced yet. */
  unpricedEquipment: number;
  /** Installation lines the rep has not priced yet. */
  unpricedInstallation: number;
  /** The lines behind those counts, named for the panel. */
  unpricedLines: TemplateUnpricedLine[];
  /** The same shortfall in words, naming the lines; empty when everything is priced. */
  unpricedText: string;
  /** True only when every printed equipment row and installation line is priced. */
  complete: boolean;
  /** One line for the panel: what the document would print right now. */
  text: string;
};

function money(value: number, currency: ProposalWizardDraft["currency"]) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

/** Name a few lines and count the rest, so a long schedule stays one sentence. */
function nameList(labels: string[]) {
  const shown = labels.slice(0, 3);
  const rest = labels.length - shown.length;
  return rest ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
}

/**
 * What the export would print from the prices entered so far.
 *
 * The equipment rule is shared with the document table (`bomPricingTotals`), so
 * the panel cannot call a line priced that the export would still print as TBC.
 */
export function templatePricingSummary(
  bomRows: SalesBomRow[],
  installation: InstallationSchedule | null | undefined,
  pricing: TemplateProposalPricing,
): TemplatePricingSummary {
  const equipment = bomPricingTotals(bomRows, pricing.bomUnitPrices);
  const installationPricing = installation
    ? installationTotals(installation, pricing.installationUnitPrices)
    : null;
  const unpricedEquipment = equipment.lines.length - equipment.priced;
  const unpricedInstallation = installationPricing ? installationPricing.lines.length - installationPricing.priced : 0;
  // One entry per rate key, not per row: two rows with the same SKU share the
  // one price cell, so naming that SKU twice would overstate what is missing.
  const unpricedLines: TemplateUnpricedLine[] = [];
  const seen = new Set<string>();
  for (const line of equipment.lines) {
    if (line.unit !== null) continue;
    const id = `equipment:${line.sku}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unpricedLines.push({ kind: "equipment", id: line.sku, label: line.sku });
  }
  for (const line of installationPricing?.lines ?? []) {
    if (line.unit !== null) continue;
    const id = `installation:${line.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unpricedLines.push({ kind: "installation", id: line.id, label: installationLineLabel(line) });
  }
  const unpricedEquipmentLabels = unpricedLines.filter((line) => line.kind === "equipment").map((line) => line.label);
  const unpricedInstallationLabels = unpricedLines.filter((line) => line.kind === "installation").map((line) => line.label);
  const named = [
    ...(unpricedEquipmentLabels.length ? [`equipment ${nameList(unpricedEquipmentLabels)}`] : []),
    ...(unpricedInstallationLabels.length ? [`installation ${nameList(unpricedInstallationLabels)}`] : []),
  ];
  const unpricedText = named.length ? `Still to price: ${named.join("; ")}.` : "";
  const lineCount = equipment.lines.length + (installationPricing?.lines.length ?? 0);
  const parts = equipment.lines.length ? [`Equipment ${money(equipment.total, pricing.currency)}`] : [];
  if (installationPricing) parts.push(`installation ${money(installationPricing.total, pricing.currency)}`);
  const unpriced = unpricedEquipment + unpricedInstallation;
  // Nothing to price is said plainly: "every line is priced" would read as a
  // finished commercial section when the document carries no schedule at all.
  const shortfall = lineCount === 0
    ? "There are no equipment or installation lines to price."
    : unpriced
      ? `${unpriced} line${unpriced === 1 ? " needs a price" : "s need a price"} before the export prints a total.`
      : "Every line is priced.";
  return {
    equipment,
    installation: installationPricing,
    unpricedEquipment,
    unpricedInstallation,
    unpricedLines,
    unpricedText,
    complete: equipment.complete && (installationPricing?.complete ?? true),
    // The shortfall count stays its own sentence; naming the lines follows it so
    // a rep knows which SKU or survey line to price without leaving the page.
    text: `${parts.length ? `${parts.join(" · ")}; ${shortfall}` : shortfall}${unpricedText ? ` ${unpricedText}` : ""}`,
  };
}
