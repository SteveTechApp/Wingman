import type { SalesBomRow } from "../lib/salesReadiness";

/**
 * The equipment BOM as the rep prices it before the document is issued.
 *
 * Quantities and unit rates are the wizard draft's, not this panel's: the same
 * draft feeds the Word pricing table, so a value typed here is the value the
 * customer document prints. The panel only renders and hands the change back.
 * A caller that owns quantities elsewhere (the template review edits them in
 * the room schedule) omits `onQuantityChange` and the column reads as text.
 */
export function ProposalBomPricing({
  bomRows,
  currency,
  unitPrices,
  onQuantityChange,
  onUnitPriceChange,
}: {
  /** Rows already carrying the draft's quantities. */
  bomRows: SalesBomRow[];
  currency: string;
  unitPrices: Record<string, string>;
  onQuantityChange?: (sku: string, quantity: number) => void;
  onUnitPriceChange: (sku: string, value: string) => void;
}) {
  return (
    <div className="wm-proposal-bom-table">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Description</th>
            <th>Role</th>
            <th>Qty</th>
            <th>Unit price ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {bomRows.length ? (
            bomRows.map((row) => (
              <tr key={`${row.item}-${row.sku}`}>
                <td>{row.sku}</td>
                <td>{row.description}</td>
                <td>{row.role}</td>
                <td>
                  {onQuantityChange ? (
                    <input
                      aria-label={`Quantity for ${row.sku}`}
                      type="number"
                      min={1}
                      value={row.qty ?? 1}
                      onChange={(event) =>
                        onQuantityChange(row.sku, Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                  ) : (
                    row.qty ?? 1
                  )}
                </td>
                <td>
                  <input
                    aria-label={`Unit price for ${row.sku}`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={unitPrices[row.sku] ?? ""}
                    onChange={(event) => onUnitPriceChange(row.sku, event.target.value)}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>
                No final WyreStorm BOM is attached yet. Open Products, or
                explicitly continue with a design proposal without a final
                equipment schedule.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
