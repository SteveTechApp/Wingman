import { useState } from "react";
import { saveDealOutcome, type StoredProject } from "../../features/projects";

export function DealOutcomeSection({ project }: { project: StoredProject }) {
  const [outcome, setOutcome] = useState<StoredProject["dealOutcome"]>(project.dealOutcome ?? "");
  const [why, setWhy] = useState(project.dealOutcomeWhy ?? "");
  const [saved, setSaved] = useState(false);
  const options: Array<{ value: StoredProject["dealOutcome"]; label: string; color: string }> = [
    { value: "won", label: "Won", color: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" },
    { value: "lost", label: "Lost", color: "border-red-500/40 bg-red-950/30 text-red-300" },
    { value: "deferred", label: "Deferred", color: "border-amber-500/30 bg-amber-950/20 text-amber-300" },
    { value: "", label: "Not set", color: "border-slate-500/30 bg-slate-900/30 text-slate-300" },
  ];
  const handleSave = () => {
    saveDealOutcome(project.id, outcome ?? "", why);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return <section className="wm-deal-outcome wm-ui-card rounded-2xl border p-5">
    <header className="mb-3"><p className="wm-ui-kicker">Deal outcome</p><h2 className="wm-ui-title text-lg font-black">Project result</h2><p className="wm-ui-copy text-sm opacity-70">Record whether this deal was won, lost or deferred. Patterns surface in the feedback consolidation view.</p></header>
    <div className="flex flex-wrap gap-2 mb-3">{options.map((option) => <button key={option.value ?? "none"} type="button" className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${outcome === option.value ? option.color : "border-slate-600/30 bg-transparent text-slate-400 hover:border-slate-400/50"}`} onClick={() => setOutcome(option.value)}>{option.label}</button>)}</div>
    <label className="block"><span className="text-xs font-bold opacity-60">Why?</span><textarea className="wm-ui-input mt-1 w-full" rows={2} placeholder="e.g. Lost to Crestron because customer had existing ecosystem…" value={why} onChange={(event) => setWhy(event.target.value)} /></label>
    <div className="mt-2 flex items-center gap-3"><button type="button" className="wm-ui-button wm-ui-button-primary rounded-lg px-4 py-1.5 text-sm font-bold" onClick={handleSave}>Save outcome</button>{saved && <span className="text-xs text-emerald-400 font-bold">Saved</span>}</div>
    {outcome === "lost" && why.trim() && <div className="wm-deal-loss-summary mt-4 rounded-xl border border-red-500/25 bg-red-950/20 p-4"><div className="flex items-center gap-2 mb-2"><span className="text-xs font-black text-red-300 uppercase tracking-wide">Why we lost</span></div><p className="text-sm text-red-200/80 leading-relaxed">{why}</p><p className="text-xs text-red-300/50 mt-2 italic">This feedback feeds into competitor battle card priorities and the feedback consolidation view. The brand mentioned here is tracked for loss-pattern analysis.</p></div>}
    {outcome === "won" && why.trim() && <div className="wm-deal-win-summary mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-4"><div className="flex items-center gap-2 mb-2"><span className="text-xs font-black text-emerald-300 uppercase tracking-wide">Why we won</span></div><p className="text-sm text-emerald-200/80 leading-relaxed">{why}</p></div>}
  </section>;
}
