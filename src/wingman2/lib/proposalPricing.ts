import type { SalesBomRow } from "./salesReadiness";

/**
 * What the rep enters against an equipment SKU or an installation line id.
 *
 * Prices stay as text while they are being typed, exactly like the wizard
 * draft's maps, so a half-written "125." does not snap to a different number
 * under the cursor.
 */
export type UnitPriceMap = Record<string, string>;

/**
 * A price the document can print, or null when the cell is unanswered.
 *
 * The rep types into a text box, so "" and "   " are cells nobody has filled in
 * yet — not a zero price. A negative or non-numeric value is not a price either.
 * Both the printed table and the review panel read this, so a line the panel
 * says is priced cannot still print TBC.
 */
export function unitPriceValue(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export type BomPricedLine = SalesBomRow & {
  /** Rate the row prints at, or null while it is unpriced. */
  unit: number | null;
  /** Unit rate × quantity, or null while it is unpriced. */
  total: number | null;
};

/**
 * The equipment schedule with the rate each row will print at.
 *
 * An unpriced row is a hole in the total rather than a zero: `complete` is what
 * decides between printing a total and printing the commercial hold, so it must
 * mean every printed row carries a rate.
 */
export function bomPricingTotals(rows: SalesBomRow[], unitPrices: UnitPriceMap | undefined) {
  const lines: BomPricedLine[] = rows.map((row) => {
    const unit = unitPriceValue(unitPrices?.[row.sku]);
    return { ...row, unit, total: unit === null ? null : unit * (row.qty ?? 1) };
  });
  const priced = lines.filter((line) => line.unit !== null).length;
  return {
    lines,
    priced,
    complete: lines.length > 0 && priced === lines.length,
    total: lines.reduce((sum, line) => sum + (line.total ?? 0), 0),
  };
}
