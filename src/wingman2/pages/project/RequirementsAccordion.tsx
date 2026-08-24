import { useState } from "react";
import type { StoredRequirementRecord, StoredRequirementStatus } from "../../data/projectStore";

const categoryOrder = ["ARCHITECTURE", "APPLICATION", "DISPLAYS", "DISPLAY BEHAVIOUR", "SOURCES", "SIGNAL TYPE", "USB", "AUDIO", "INFRASTRUCTURE", "CONTROL", "NETWORK", "BUDGET", "TIMELINE"];
const statuses: StoredRequirementStatus[] = ["confirmed", "review", "unknown"];
const statusLabel = (status: StoredRequirementStatus) => status === "confirmed" ? "Confirmed" : status === "unknown" ? "Unknown" : "Needs review";

export function RequirementsAccordion({ requirements, onUpdate }: {
  requirements: StoredRequirementRecord[];
  onUpdate: (id: string, patch: Partial<StoredRequirementRecord>) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = new Set(requirements.filter((item) => item.status !== "confirmed").map((item) => item.category || "Other"));
    if (!initial.size && requirements[0]) initial.add(requirements[0].category || "Other");
    return initial;
  });
  const groups = Array.from(requirements.reduce((map, item) => {
    const category = item.category || "Other";
    map.set(category, [...(map.get(category) ?? []), item]);
    return map;
  }, new Map<string, StoredRequirementRecord[]>())).sort(([a], [b]) => {
    const rank = (category: string) => {
      const index = categoryOrder.indexOf(category.toUpperCase());
      return index < 0 ? categoryOrder.length : index;
    };
    return rank(a) - rank(b);
  });

  if (!groups.length) return <div className="rounded-2xl border p-6 text-sm wm-ui-card wm-ui-copy">No requirements captured yet. Run Discovery to populate the requirement record.</div>;

  return <div className="grid gap-2">{groups.map(([category, items]) => {
    const expanded = open.has(category);
    const toggle = () => setOpen((previous) => {
      const next = new Set(previous);
      if (expanded) next.delete(category); else next.add(category);
      return next;
    });
    return <div key={category} className="rounded-2xl border overflow-hidden wm-ui-card">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]">
        <div className="flex items-center gap-3"><span className="text-xs font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">{category}</span><span className="text-xs text-[#8fb8d0] wm-ui-copy">{items.length} {items.length === 1 ? "item" : "items"}</span></div>
        <div className="flex items-center gap-2">
          {(["confirmed", "review", "unknown"] as const).map((status) => {
            const count = items.filter((item) => item.status === status).length;
            const tone = status === "confirmed" ? "bg-emerald-900/60 text-emerald-300" : status === "review" ? "bg-amber-900/60 text-amber-300" : "bg-rose-900/60 text-rose-300";
            return count ? <span key={status} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{count} {status}</span> : null;
          })}
          <span className={`ml-2 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
        </div>
      </button>
      {expanded ? <div className="border-t border-white/[0.06] px-5 pb-4 pt-3 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
          <div><div className="flex items-center gap-3"><p className="text-sm font-black text-[#edf6ff] wm-ui-copy">{item.label}</p><span className="text-[10px] text-[#6a97b0] wm-ui-copy">{item.source}</span></div>
            <label className="mt-2 block"><textarea className="min-h-14 w-full rounded-xl border border-[#29465e] bg-[#0d2133] px-3 py-2 text-sm leading-5 text-[#edf6ff] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" value={item.value} onChange={(event) => onUpdate(item.id, { value: event.target.value })} />{item.whyItMatters ? <span className="mt-1 block text-[11px] leading-4 text-[#6a97b0] wm-ui-copy">{item.whyItMatters}</span> : null}</label>
          </div>
          <label className="grid content-start gap-1"><span className="text-[10px] font-black uppercase tracking-[0.14em] wm-ui-copy wm-ui-kicker">Status</span><select className="rounded-xl border border-[#29465e] bg-[#0d2133] px-2 py-1.5 text-xs font-semibold text-[#edf6ff] outline-none focus:border-cyan-400" value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value as StoredRequirementStatus })}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        </div>
      </div>)}</div> : null}
    </div>;
  })}</div>;
}
