import type { SalesBomRow } from "../lib/salesReadiness";

export function ProposalEquipmentSchedule({
  bomRows,
  onQuantityChange,
}: {
  bomRows: SalesBomRow[];
  onQuantityChange: (sku: string, quantity: number) => void;
}) {
  return (
    <div>
      <table>
        <thead><tr><th>Item</th><th>SKU</th><th>Description</th><th>Role</th><th>Qty</th><th>Status</th></tr></thead>
        <tbody>{bomRows.map((row) => <tr key={row.sku}>
          <td>{row.item}</td><td>{row.sku}</td><td>{row.description}</td><td>{row.role}</td>
          <td><input aria-label={`Quantity for ${row.sku}`} type="number" min={1} step={1} value={row.qty} onChange={(event) => onQuantityChange(row.sku, Math.max(1, Math.floor(Number(event.target.value) || 1)))} /></td>
          <td>{row.status}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
