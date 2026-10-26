import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { installationCategoryLabel, installationTableHeaders, installationTotals, type InstallationSchedule } from "./installationSchedule";

type Pricing = NonNullable<StoredProjectProposal["pricing"]>;
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const money = (value: number, pricing: Pricing) => new Intl.NumberFormat("en-GB", { style: "currency", currency: pricing.currency }).format(value);

/** Print pagination uses each row's cumulative footer rather than the final total. */
function table(headers: string[], rows: string[][], total: number, quantity: number, complete: boolean, pricing: Pricing) {
  const totalLabel = `${complete ? "Schedule total" : "Priced subtotal — rates outstanding"}: ${money(total, pricing)} · ${quantity} items · ${pricing.pricesExcludeTax ? "Excl. tax" : "Tax status to confirm"}`;
  let cumulativeQuantity = 0;
  return `<table data-priced-schedule><thead><tr>${headers.map(label => `<th>${escape(label)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => {
    cumulativeQuantity += Number(row[2]);
    const runningLabel = `Running priced total: ${row.at(-1)} · ${cumulativeQuantity} items · ${pricing.pricesExcludeTax ? "Excl. tax" : "Tax status to confirm"}`;
    return `<tr data-running-footer="${escape(runningLabel)}">${row.map(value => `<td>${escape(value)}</td>`).join("")}</tr>`;
  }).join("")}</tbody><tfoot><tr><th scope="row" colspan="${headers.length}">${escape(totalLabel)}</th></tr></tfoot></table>`;
}

export function pricedEquipmentHtml(rows: SalesBomRow[], pricing: Pricing) {
  let total = 0;
  let complete = rows.length > 0;
  const cells = rows.map(row => {
    const raw = pricing.bomUnitPrices[row.sku];
    const rate = raw !== undefined && raw.trim() !== "" ? Number(raw) : NaN;
    const valid = Number.isFinite(rate) && rate >= 0;
    complete &&= valid;
    const line = valid ? rate * row.qty : null;
    total += line ?? 0;
    return [row.sku, `${row.description}${row.notes ? ` — ${row.notes}` : ""}`, String(row.qty), valid ? money(rate, pricing) : "TBC", line === null ? "TBC" : money(line, pricing), money(total, pricing)];
  });
  return table(["SKU", "Equipment", "Qty", "Unit price", "Line total", "Running priced total"], cells, total, rows.reduce((sum, row) => sum + row.qty, 0), complete, pricing);
}

export function pricedInstallationHtml(schedule: InstallationSchedule, pricing: Pricing) {
  const priced = installationTotals(schedule, pricing.installationUnitPrices);
  let running = 0;
  const rows = priced.lines.map(line => {
    running += line.total ?? 0;
    return [installationCategoryLabel(line.category), `${line.detail} — ${line.links.join(", ")}`, String(line.quantity), line.unit === null ? "TBC" : money(line.unit, pricing), line.total === null ? "TBC" : money(line.total, pricing), money(running, pricing)];
  });
  // The links ride in the detail cell here to keep the priced table narrow, so
  // its heading is the two shared labels joined rather than a third wording.
  return table(installationTableHeaders(["service", ["detail", "links"], "quantity", "unitRate", "lineTotal", "runningTotal"] as const), rows, priced.total, priced.lines.reduce((sum, line) => sum + line.quantity, 0), priced.complete, pricing);
}
