import { useState, type ReactNode } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { groupProjectScope, type ProjectScopeSectionId } from "../lib/projectScope";
import { isWyreStormManufacturer } from "../lib/equipmentLibrary";


type Props = {
  template: RoomTemplate; rows: TemplateBomRow[]; library: ReactNode;
  onQuantity: (id: string, quantity: number) => void;
  onToggle: (id: string) => void;
  onEdit: (row: TemplateBomRow) => void;
  onAdd: (section: ProjectScopeSectionId) => void;
};
const included = (row: TemplateBomRow) => row.status !== "excluded" && row.qty > 0;
const ownProduct = (row: TemplateBomRow) => row.manufacturer ? isWyreStormManufacturer(row.manufacturer) : !/^(BY-OTHERS|CUSTOM)/.test(row.sku);

export function ProjectScopeSchedule({ template, rows, library, onQuantity, onToggle, onEdit, onAdd }: Props) {
  const [view, setView] = useState("all");
  const [sectionId, setSectionId] = useState<ProjectScopeSectionId>("inputs");
  const visible = rows.filter(row => view === "all" || (view === "wyrestorm" ? ownProduct(row) : view === "others" ? !ownProduct(row) : view === "optional" ? row.type === "Optional" : row.type === "Validate"));
  const groups = groupProjectScope(visible).filter(group => group.id !== "additional" || group.rows.length);
  const activeGroup = groups.find(group => group.id === sectionId) || groups[0];
  return <div className="wm-design-schedule">
    <div className="wm-design-schedule__tools">
      <label>Design section <select aria-label="Schedule section" value={activeGroup.id} onChange={event => setSectionId(event.target.value as ProjectScopeSectionId)}>{groups.map(group => <option key={group.id} value={group.id}>{group.title} ({group.rows.filter(included).length} included)</option>)}</select></label>
      <label>Show <select aria-label="Schedule items" value={view} onChange={event => setView(event.target.value)}><option value="all">ALL items</option><option value="wyrestorm">WyreStorm products</option><option value="others">Supplied by others</option><option value="confirm">Items to confirm</option><option value="optional">Optional items</option></select></label>
    </div>
    {[activeGroup].map(group => {
      const selected = group.rows.filter(included).length;
      const guidance = group.id === "audio" ? template.concept?.audio?.experience : group.id === "engineering" ? "Quantities are scoped allowances until the provider, engineer days, rates and deliverables are agreed." : group.id === "maintenance" ? "Maintenance is excluded by default. Include it only after the term, visits and response commitments are agreed." : undefined;
      return <section className="wm-design-schedule__section" key={group.id}>
        <header className="wm-design-schedule__section-heading"><div><h3>{group.title}</h3><p>{group.description}</p></div><span>{selected} included · {group.rows.length} {group.rows.length === 1 ? "line" : "lines"}</span></header>
        <div className="wm-design-schedule__section-body">
          {guidance ? <p className="wm-design-schedule__guidance">{guidance}</p> : null}
          {group.rows.length ? <div className="wm-design-schedule__rows">{group.rows.map(row => {
            const isOwn = ownProduct(row);
            const supplier = row.owner === "customer" ? "Customer supply" : row.owner === "wyrestorm" || isOwn ? "WyreStorm supply" : row.manufacturer || "Integrator / supplier to confirm";
            return <article className={`wm-design-schedule__row${included(row) ? "" : " is-excluded"}`} key={row.id}>
              <input type="checkbox" checked={included(row)} onChange={() => onToggle(row.id)} aria-label={`Include ${row.description}`} />
              <div className="wm-design-schedule__identity"><strong>{row.description}</strong><small>{isOwn ? `${row.model || row.sku} · ` : row.model ? `${row.manufacturer || ""} ${row.model} · ` : ""}{supplier} · {row.status === "excluded" ? "Excluded" : row.type === "Validate" ? "Confirm specification / scope" : row.type}</small></div>
              <label className="wm-design-schedule__quantity"><span>Quantity · {row.unit || "each"}</span><input type="number" step="any" min="0" max="99" value={row.qty} onChange={event => onQuantity(row.id, Number(event.target.value))} aria-label={`Quantity for ${row.sku}`} /></label>
              <button type="button" className="wm-design-schedule__edit" onClick={() => onEdit(row)} aria-label={`Edit ${row.description}`}>Edit</button>
            </article>;
          })}</div> : <p className="wm-design-schedule__empty">{view === "all" ? "No items are scheduled here. Add scope if this project requires it." : "No items match this view in this section."}</p>}
          <button className="wm-design-schedule__add" type="button" onClick={() => onAdd(group.id)}>+ Add {group.id === "engineering" || group.id === "maintenance" ? "service" : "item"} to this section</button>
        </div>
      </section>;
    })}
    <details className="wm-design-schedule__library"><summary>Add equipment from your saved library</summary>{library}</details>
  </div>;
}
