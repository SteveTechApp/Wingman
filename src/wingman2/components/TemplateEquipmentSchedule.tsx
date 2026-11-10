import { installationLineLabel, type InstallationSchedule } from "../lib/installationSchedule";
import type { TemplateBomRow } from "../lib/roomTemplates";

export function TemplateEquipmentSchedule({ rows, installation }: { rows: Array<Pick<TemplateBomRow, "sku" | "description" | "role" | "qty" | "status">>; installation: InstallationSchedule | null }) {
  return <section className="wm-template-equipment-schedule">
    <h3>Equipment schedule</h3>
    {rows.length ? <table><thead><tr><th>SKU</th><th>Description</th><th>Role</th><th>Qty</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.sku}><td>{row.sku}</td><td>{row.description}</td><td>{row.role}</td><td>{row.qty}</td><td>{row.status}</td></tr>)}</tbody></table> : <p>No equipment has been selected.</p>}
    {installation ? <><h3>Installation scope</h3><p>{installation.text}</p><table><thead><tr><th>Scope item</th><th>Detail</th><th>Links or displays</th><th>Qty</th></tr></thead><tbody>{installation.lines.map((line) => <tr key={line.id}><td>{installationLineLabel(line)}</td><td>{line.detail}</td><td>{line.links.join(", ")}</td><td>{line.quantity}</td></tr>)}</tbody></table></> : null}
  </section>;
}
