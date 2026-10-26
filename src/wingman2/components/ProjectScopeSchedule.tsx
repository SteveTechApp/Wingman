import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { groupProjectScope, projectScopeScheduleSections, type ProjectScopeSectionId } from "../lib/projectScope";
import { isWyreStormManufacturer } from "../lib/equipmentLibrary";


type Props = {
  template: RoomTemplate; rows: TemplateBomRow[]; library: ReactNode;
  /** The section on screen; the page owns it, because the tabs sit with the page's own tabs. */
  sectionId: ProjectScopeSectionId;
  onQuantity: (id: string, quantity: number) => void;
  onToggle: (id: string) => void;
  onEdit: (row: TemplateBomRow) => void;
  onAdd: (section: ProjectScopeSectionId) => void;
};
type ProjectScopeGroup = ReturnType<typeof groupProjectScope>[number];
const included = (row: TemplateBomRow) => row.status !== "excluded" && row.qty > 0;
const ownProduct = (row: TemplateBomRow) => row.manufacturer ? isWyreStormManufacturer(row.manufacturer) : !/^(BY-OTHERS|CUSTOM)/.test(row.sku);

/**
 * The room's design sections are chosen from tabs rather than a dropdown: the
 * whole scope reads in one line, so a rep can see which sections hold work
 * before opening any of them. Each tab carries its included count.
 */
export function ProjectScopeSectionTabs({ sections, sectionId, onSection }: {
  sections: ProjectScopeGroup[];
  sectionId: ProjectScopeSectionId;
  onSection: (section: ProjectScopeSectionId) => void;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % sections.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + sections.length) % sections.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = sections.length - 1;
    else return;
    event.preventDefault();
    onSection(sections[next].id);
    tabRefs.current[next]?.focus();
  }
  return <div className="wm-template-section-tabs" role="tablist" aria-label="Design section">
    {sections.map((section, index) => <button
      key={section.id}
      ref={(node) => { tabRefs.current[index] = node; }}
      type="button"
      role="tab"
      id={`template-section-tab-${section.id}`}
      aria-selected={sectionId === section.id}
      aria-controls="template-scope-section"
      tabIndex={sectionId === section.id ? 0 : -1}
      title={section.description}
      onClick={() => onSection(section.id)}
      onKeyDown={(event) => onKeyDown(event, index)}
    >
      {section.title}<span className="wm-template-section-tab-count" aria-hidden="true">{section.rows.filter(included).length}</span>
    </button>)}
  </div>;
}

export function ProjectScopeSchedule({ template, rows, library, sectionId, onQuantity, onToggle, onEdit, onAdd }: Props) {
  const [view, setView] = useState("all");
  const matchesView = (row: TemplateBomRow) => view === "all" || (view === "wyrestorm" ? ownProduct(row) : view === "others" ? !ownProduct(row) : view === "optional" ? row.type === "Optional" : row.type === "Validate");
  const sections = projectScopeScheduleSections(rows);
  const active = sections.find(section => section.id === sectionId) ?? sections[0];
  const activeRows = active.rows.filter(matchesView);
  const selected = activeRows.filter(included).length;
  const guidance = active.id === "audio" ? template.concept?.audio?.experience : active.id === "engineering" ? "Quantities are scoped allowances until the provider, engineer days, rates and deliverables are agreed." : active.id === "maintenance" ? "Maintenance is excluded by default. Include it only after the term, visits and response commitments are agreed." : undefined;
  return <div className="wm-design-schedule">
    <div className="wm-design-schedule__tools">
      <label>Show <select aria-label="Schedule items" value={view} onChange={event => setView(event.target.value)}><option value="all">ALL items</option><option value="wyrestorm">WyreStorm products</option><option value="others">Supplied by others</option><option value="confirm">Items to confirm</option><option value="optional">Optional items</option></select></label>
    </div>
    <section className="wm-design-schedule__section" id="template-scope-section" role="tabpanel" aria-labelledby={`template-section-tab-${active.id}`}>
      <header className="wm-design-schedule__section-heading"><div><h3>{active.title}</h3><p>{active.description}</p></div><span>{selected} included · {activeRows.length} {activeRows.length === 1 ? "line" : "lines"}</span></header>
      <div className="wm-design-schedule__section-body">
        {guidance ? <p className="wm-design-schedule__guidance">{guidance}</p> : null}
        {activeRows.length ? <div>{activeRows.map(row => {
          const isOwn = ownProduct(row);
          const supplier = row.owner === "customer" ? "Customer supply" : row.owner === "wyrestorm" || isOwn ? "WyreStorm supply" : row.manufacturer || "Integrator / supplier to confirm";
          return <article className={`wm-design-schedule__row${included(row) ? "" : " is-excluded"}`} key={row.id}>
            <input type="checkbox" checked={included(row)} onChange={() => onToggle(row.id)} aria-label={`Include ${row.description}`} />
            <div className="wm-design-schedule__identity"><strong>{row.description}</strong><small>{isOwn ? `${row.model || row.sku} · ` : row.model ? `${row.manufacturer || ""} ${row.model} · ` : ""}{supplier} · {row.status === "excluded" ? "Excluded" : row.type === "Validate" ? "Confirm specification / scope" : row.type}</small></div>
            <label className="wm-design-schedule__quantity"><span>Quantity · {row.unit || "each"}</span><input type="number" step="any" min="0" max="99" value={row.qty} onChange={event => onQuantity(row.id, Number(event.target.value))} aria-label={`Quantity for ${row.sku}`} /></label>
            <button type="button" className="wm-design-schedule__edit" onClick={() => onEdit(row)} aria-label={`Edit ${row.description}`}>Edit</button>
          </article>;
        })}</div> : <p className="wm-design-schedule__empty">{view === "all" ? "No items are scheduled here. Add scope if this project requires it." : "No items match this view in this section."}</p>}
        <button className="wm-design-schedule__add" type="button" onClick={() => onAdd(active.id)}>+ Add {active.id === "engineering" || active.id === "maintenance" ? "service" : "item"} to this section</button>
      </div>
    </section>
    <details className="wm-design-schedule__library"><summary>Add equipment from your saved library</summary>{library}</details>
  </div>;
}
