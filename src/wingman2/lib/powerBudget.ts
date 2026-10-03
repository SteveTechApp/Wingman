import governedTechnicalProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import type { StoredProductSelection } from "../data/projectStore";
import type { DesignAssuranceItem } from "./productAssurance";

type UnknownRecord = Record<string, unknown>;

export type PowerBudgetAssuranceInput = {
  products: StoredProductSelection[];
  /** Free-text requirement evidence for power-related checks. */
  requirementText?: string;
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseSku(value: string): string {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

const technicalBySku = new Map(
  ((record(governedTechnicalProfiles).profiles as UnknownRecord[]) ?? [])
    .map((profile) => [normaliseSku(text(profile.sku)), profile] as const)
    .filter(([sku]) => Boolean(sku)),
);

/**
 * Extracts a maximum-consumption figure in watts from a governed power string.
 * Handles the real shapes seen in the governed data:
 *   "Max 3.5W" / "Max 24W, average 10W" / "Max 105.4W" -> watts
 *   "12V 2A DC" -> volts * amps
 *   "240W mono" -> watts
 * Returns null when no consumption figure can be proven (the string only
 * describes a PSU, mains presence, or PoE class).
 */
export function wattsFromPowerLine(line: string): number | null {
  const value = text(line);
  if (!value) return null;

  // Prefer explicit "Max X W" / "X W maximum" statements.
  const explicitMax = value.match(/max(?:imum)?\s*(\d+(?:\.\d+)?)\s*w/i);
  if (explicitMax) return Number(explicitMax[1]);

  // "240W mono" / "2×120W stereo" style bare watt figures.
  const bareWatts = value.match(/(\d+(?:\.\d+)?)\s*w\b/i);
  if (bareWatts) return Number(bareWatts[1]);

  // "12V 2A" / "18V DC 1A" -> volts * amps (DC PSU rating, treated as the
  // upper bound). Allow a word like DC/AC between the voltage and current.
  const voltAmp = value.match(/(\d+(?:\.\d+)?)\s*v\w*\s*(?:dc\s*)?(\d+(?:\.\d+)?)\s*a\b/i);
  if (voltAmp) return Number(voltAmp[1]) * Number(voltAmp[2]);

  return null;
}

export type PowerBudgetSummary = {
  sku: string;
  watts: number | null;
  quantity: number;
  totalWatts: number | null;
  powerLines: string[];
};

export function powerBudgetSummary(products: StoredProductSelection[]): PowerBudgetSummary[] {
  return products.map((product) => {
    const profile = technicalBySku.get(normaliseSku(product.sku));
    const powerLines = (Array.isArray(profile?.power) ? profile.power : []) as unknown[];
    const watts = powerLines
      .map((line) => wattsFromPowerLine(text(line)))
      .filter((value): value is number => value !== null)
      .reduce((best, value) => Math.max(best, value), 0) || null;
    const quantity = Number.isFinite(Number(product.quantity)) && Number(product.quantity) > 0
      ? Math.floor(Number(product.quantity))
      : 1;

    return {
      sku: text(product.sku).toUpperCase(),
      watts,
      quantity,
      totalWatts: watts === null ? null : watts * quantity,
      powerLines: powerLines.map(text).filter(Boolean),
    };
  });
}

/**
 * Power-budget assurance. Physical power is a constraint that affects every
 * installation, and it is the domain where a governed profile's silence is
 * itself a signal:
 *
 * - A product with no proven consumption figure needs the PSU/power source
 *   confirmed before quote (warning, not blocker - many products are powered
 *   from the host/matrix and simply have no standalone figure).
 * - The summed consumption of the BOM needs a sanity check against a typical
 *   local circuit / PSU strategy.
 * - A requirement that mentions remote power (PoE/PoH) must be proven by the
 *   governed profiles' power language.
 */
export function buildPowerBudgetAssurance(input: PowerBudgetAssuranceInput): DesignAssuranceItem[] {
  const items: DesignAssuranceItem[] = [];
  const summaries = powerBudgetSummary(input.products);

  for (const summary of summaries) {
    if (summary.watts === null) {
      items.push({
        id: `power-unknown-${normaliseSku(summary.sku)}`,
        severity: "warning",
        domain: "power",
        sku: summary.sku,
        message: `${summary.sku} has no proven power-consumption figure in its governed profile. Confirm the PSU, power source, or host-powered behaviour before quoting.`,
      });
      continue;
    }

    const poeOrPoh = summary.powerLines.some((line) => /poe|poh|power over ethernet|power over hdbt|802\.3/.test(line));
    if (poeOrPoh && summary.powerLines.length === 1) {
      // A single PoE-class line with no DC figure is fine - power comes from
      // the switch/injector, so there is nothing more to confirm.
      continue;
    }
  }

  const knownTotals = summaries.filter((summary) => summary.totalWatts !== null) as (PowerBudgetSummary & { totalWatts: number })[];
  const totalWatts = knownTotals.reduce((sum, summary) => sum + summary.totalWatts, 0);

  if (knownTotals.length > 0 && totalWatts > 1500) {
    items.push({
      id: "power-budget-high",
      severity: "warning",
      domain: "power",
      message: `The selected products sum to approximately ${Math.round(totalWatts)}W of stated maximum consumption. Confirm the local power strategy (circuits, rack PSUs, PoE/PoH injector budgets) covers the full BOM before quoting.`,
    });
  }

  const requirementText = (input.requirementText ?? "").toLowerCase();
  const remotePowerRequired = /poh|poe|power over ethernet|power over hdbt|remote power|802\.3/.test(requirementText);
  if (remotePowerRequired) {
    const powerLanguage = summaries
      .flatMap((summary) => summary.powerLines)
      .join(" ")
      .toLowerCase();
    const remotePowerProven = /poh|poe|802\.3|power over/.test(powerLanguage);
    if (!remotePowerProven) {
      items.push({
        id: "power-remote-unproven",
        severity: "blocker",
        domain: "power",
        message: "Remote power (PoE/PoH) is required, but the selected governed profiles do not prove the power standard, direction or budget. Confirm which product powers what, and the injector/switch budget.",
      });
    }
  }

  return items;
}
