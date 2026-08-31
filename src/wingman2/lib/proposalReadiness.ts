import type { DiscoveryConversationItem, StoredProductSelection } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import {
  validateProposalExport,
  type ExportValidationResult,
} from "./proposalExportValidation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ProposalReadinessInput = {
  /** Products selected for the proposal. */
  products: StoredProductSelection[];
  /** BOM rows generated from the selection. */
  bomRows: SalesBomRow[];
  /** Unresolved assumptions (excl. "validate final product specifications"). */
  assumptions: string[];
  /** Template validation items (unverified points). Empty for discovery path. */
  validationItems?: string[];
  /** Pre-computed export validation (optional — computed internally if omitted). */
  exportValidation?: ExportValidationResult;
  /** Topology connections for reach validation (optional). */
  topology?: { connections: Array<{ lengthMetres?: number; services?: string[] }> };
  /** Discovery conversation items (optional). */
  discoveryConversation?: DiscoveryConversationItem[];
};

export type ProposalReadiness = {
  /** 0–100 readiness score. */
  score: number;
  /** Whether the proposal requires human review before customer issue. */
  reviewRequired: boolean;
  /** The export validation result (blockers + warnings). */
  exportValidation: ExportValidationResult;
  /** Human-readable summary of readiness state. */
  summary: string;
  /** Deduction breakdown for debugging/display. */
  breakdown: {
    base: number;
    blockerDeduction: number;
    warningDeduction: number;
    validationItemDeduction: number;
    assumptionDeduction: number;
    productBonus: number;
  };
};

/* ------------------------------------------------------------------ */
/*  Scoring formula                                                    */
/* ------------------------------------------------------------------ */

/**
 * Unified proposal readiness scoring.
 *
 * Used by both the template review page and the discovery proposal wizard
 * so that readiness is always calculated the same way, regardless of which
 * path created the proposal.
 *
 * Formula:
 *   base = 100
 *   - 15 per export-validation blocker
 *   -  5 per export-validation warning
 *   -  3 per template validation item (unverified point)
 *   -  4 per open assumption (excl. "validate final product specifications")
 *   +  4 per selected product (capped at +20)
 *   Clamped to [0, 100]
 *
 * The score gates export: only score >= 100 allows customer-facing export.
 * `reviewRequired` is true when score < 74 or any blocker exists.
 */
export function proposalReadiness(
  input: ProposalReadinessInput,
): ProposalReadiness {
  // ── Export validation ──────────────────────────────────────────────
  const exportValidation =
    input.exportValidation ??
    validateProposalExport({
      products: input.products,
      bomRows: input.bomRows,
      topology: input.topology,
      discoveryConversation: input.discoveryConversation,
    });

  // ── Counts ────────────────────────────────────────────────────────
  const openAssumptionCount = input.assumptions.filter(
    (item) => !/validate final product specifications/i.test(item),
  ).length;
  const validationItemCount = (input.validationItems ?? []).length;
  const productCount = input.products.length;

  // ── Deductions ────────────────────────────────────────────────────
  const base = 100;
  const blockerDeduction = exportValidation.blockers.length * 15;
  const warningDeduction = exportValidation.warnings.length * 5;
  const validationItemDeduction = validationItemCount * 3;
  const assumptionDeduction = openAssumptionCount * 4;
  const productBonus = Math.min(20, productCount * 4);

  const raw =
    base -
    blockerDeduction -
    warningDeduction -
    validationItemDeduction -
    assumptionDeduction +
    productBonus;

  const score = Math.max(0, Math.min(100, Math.round(raw)));

  // ── Review required ───────────────────────────────────────────────
  const reviewRequired =
    exportValidation.blockers.length > 0 ||
    score < 74 ||
    validationItemCount > 2 ||
    openAssumptionCount > 2;

  // ── Summary ───────────────────────────────────────────────────────
  const parts: string[] = [];
  if (exportValidation.blockers.length)
    parts.push(`${exportValidation.blockers.length} blocker(s)`);
  if (exportValidation.warnings.length)
    parts.push(`${exportValidation.warnings.length} warning(s)`);
  if (validationItemCount)
    parts.push(`${validationItemCount} unverified item(s)`);
  if (openAssumptionCount)
    parts.push(`${openAssumptionCount} open assumption(s)`);
  if (productCount === 0) parts.push("no products selected");
  const summary = parts.length
    ? `${score}% ready — ${parts.join(", ")}`
    : `${score}% ready`;

  return {
    score,
    reviewRequired,
    exportValidation,
    summary,
    breakdown: {
      base,
      blockerDeduction,
      warningDeduction,
      validationItemDeduction,
      assumptionDeduction,
      productBonus,
    },
  };
}

/**
 * Quick score-only accessor for dashboards and badges.
 */
export function proposalReadinessScore(
  input: ProposalReadinessInput,
): number {
  return proposalReadiness(input).score;
}
