import { useEffect, useId, useRef, useState } from "react";
import { Copy, LayoutTemplate, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { templatesSavedFromProject } from "../lib/templateLineage";
import { OpenTemplateLink } from "./OpenTemplateLink";

export function ProjectActionMenu({ name, projectId, templates = [], onEdit, onCopy, onDelete }: {
  name: string;
  /** The room this menu belongs to, where the surface knows which room it is. */
  projectId?: string;
  /** Every stored template the browser holds; only this room's are offered. */
  templates?: readonly { id: string; name: string; sourceProjectId?: string }[];
  onEdit: () => void; onCopy: () => void; onDelete: () => void;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  // The room's own templates, filtered here so the card passes the list it has
  // already read instead of subscribing to the template store per row.
  const saved = projectId ? templatesSavedFromProject(projectId, templates) : [];
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setConfirm(false); } };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function run(action: () => void) { setOpen(false); setConfirm(false); action(); trigger.current?.focus(); }
  return <div ref={root} className="wm-project-action-menu" onKeyDown={(event) => {
    if (event.key === "Escape") { setOpen(false); setConfirm(false); trigger.current?.focus(); }
  }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setConfirm(false); } }}>
    <button ref={trigger} type="button" aria-label={`Project actions for ${name}`} aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => { setOpen(!open); setConfirm(false); }}><MoreVertical aria-hidden="true" /></button>
    {open && <div className="wm-project-action-menu__panel" id={menuId}>
      <button type="button" onClick={() => run(onEdit)}><Pencil aria-hidden="true" />Edit project</button>
      <button type="button" onClick={() => run(onCopy)}><Copy aria-hidden="true" />Copy project</button>
      {/* The same templates the card's chip names, offered where a rep is
          already acting on the room. A link, not a button: this one navigates,
          and the rep may want it in another tab. */}
      {saved.map((template) => (
        <OpenTemplateLink
          key={template.id}
          template={template}
          icon={<LayoutTemplate aria-hidden="true" />}
          onClick={() => { setOpen(false); setConfirm(false); }}
        />
      ))}
      <button type="button" className="is-danger" onClick={() => confirm ? run(onDelete) : setConfirm(true)}><Trash2 aria-hidden="true" />{confirm ? "Confirm delete" : "Delete project"}</button>
      {confirm && <><p>Delete “{name}” and its saved work? This cannot be undone.</p><button type="button" onClick={() => setConfirm(false)}>Keep project</button></>}
    </div>}
  </div>;
}
