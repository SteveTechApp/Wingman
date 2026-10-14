import { useEffect, useId, useRef, useState } from "react";
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";

export function ProjectActionMenu({ name, onEdit, onCopy, onDelete }: {
  name: string; onEdit: () => void; onCopy: () => void; onDelete: () => void;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
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
      <button type="button" className="is-danger" onClick={() => confirm ? run(onDelete) : setConfirm(true)}><Trash2 aria-hidden="true" />{confirm ? "Confirm delete" : "Delete project"}</button>
      {confirm && <><p>Delete “{name}” and its saved work? This cannot be undone.</p><button type="button" onClick={() => setConfirm(false)}>Keep project</button></>}
    </div>}
  </div>;
}
