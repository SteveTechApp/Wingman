import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { StoredCompareRun } from "../../features/projects";
import { buildCompareHistoryCsv, buildCompareHistoryText, compareHistoryDiff, filterAndSortCompareHistory, savedHistoryRuns, type CompareHistoryView } from "../../lib/compareHistory";
import { downloadBlob } from "../../lib/downloadBlob";

type Props = {
  projectId: string;
  runs: StoredCompareRun[];
  compareLink: (run: StoredCompareRun) => string;
  onDelete: (runId: string) => void;
};

const defaultView: CompareHistoryView = { search: "", filter: "all", sort: "newest" };

export function ProjectComparisonHistory({ projectId, runs, compareLink, onDelete }: Props) {
  const [view, setView] = useState<CompareHistoryView>(defaultView);
  const [pendingDelete, setPendingDelete] = useState<StoredCompareRun | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const saved = savedHistoryRuns(runs);
  const visible = filterAndSortCompareHistory(runs, view);

  useEffect(() => {
    if (!pendingDelete) return;
    confirmRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDelete(null);
      if (event.key !== "Tab") return;
      event.preventDefault();
      if (document.activeElement === confirmRef.current) cancelRef.current?.focus();
      else confirmRef.current?.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      deleteTriggerRef.current?.focus();
    };
  }, [pendingDelete]);

  function exportCsv() {
    downloadBlob(new Blob([buildCompareHistoryCsv(visible)], { type: "text/csv;charset=utf-8" }), `wingman-${projectId}-comparisons.csv`);
  }

  return <div className="grid gap-4" aria-label="Saved comparison management">
    <p className="text-sm wm-ui-copy">{saved.length} saved snapshot{saved.length === 1 ? "" : "s"}. Search, export, or remove an earlier decision here; a restored snapshot remains unchanged.</p>
    {saved.length ? <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm wm-ui-copy">Search saved comparisons<input aria-label="Search saved comparisons" value={view.search} onChange={(event) => setView((current) => ({ ...current, search: event.target.value }))} placeholder="Brand or SKU" /></label>
        <label className="grid gap-1 text-sm wm-ui-copy">Verdict<select aria-label="Filter saved comparisons" value={view.filter} onChange={(event) => setView((current) => ({ ...current, filter: event.target.value }))}><option value="all">All verdicts</option><option value="GOOD MATCH">Good match</option><option value="PARTIAL MATCH">Partial match</option><option value="VERIFY">Verify</option><option value="NO MATCH">No match</option></select></label>
        <label className="grid gap-1 text-sm wm-ui-copy">Sort<select aria-label="Sort saved comparisons" value={view.sort} onChange={(event) => setView((current) => ({ ...current, sort: event.target.value }))}><option value="newest">Newest</option><option value="score">Highest score</option><option value="confidence">Confidence</option></select></label>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setView(defaultView)}>Clear filters</button>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={exportCsv}>Export CSV</button>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => void navigator.clipboard?.writeText(buildCompareHistoryText(visible, view))}>Copy text</button>
      </div>
      <div className="grid gap-3">{visible.map((run) => <article key={run.id} className="rounded-2xl border p-4 wm-ui-card">
        <p className="text-xs font-black uppercase tracking-[0.14em] wm-ui-kicker">Snapshot v{run.version ?? 1} · {run.createdAt ? new Date(run.createdAt).toLocaleString() : "Saved comparison"}</p>
        <h3 className="mt-1 font-black wm-ui-copy">{run.competitorBrand || "Competitor"} {run.competitorSku || run.competitorName || "model"}</h3>
        <p className="mt-1 text-sm wm-ui-copy">{run.wyrestormSku || "No direction"} · {run.matchType || "Review"} · {run.confidence || "Confidence not recorded"}</p>
        {run.summary ? <p className="mt-3 text-sm wm-ui-copy">{run.summary}</p> : null}
        {run.evidence?.length ? <details className="mt-3"><summary className="cursor-pointer wm-ui-copy">Saved evidence ({run.evidence.length})</summary><ul className="mt-2 list-disc pl-5 text-sm wm-ui-copy">{run.evidence.map((item, index) => <li key={`${run.id}-evidence-${index}`}>{item}</li>)}</ul></details> : null}
        {run.warnings?.length ? <details className="mt-3"><summary className="cursor-pointer wm-ui-copy">Quote checks ({run.warnings.length})</summary><ul className="mt-2 list-disc pl-5 text-sm wm-ui-copy">{run.warnings.map((item, index) => <li key={`${run.id}-warning-${index}`}>{item}</li>)}</ul></details> : null}
        {compareHistoryDiff(run, saved).length ? <details className="mt-3"><summary className="cursor-pointer wm-ui-copy">What changed</summary><ul className="mt-2 list-disc pl-5 text-sm wm-ui-copy">{compareHistoryDiff(run, saved).map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
        <div className="mt-4 flex flex-wrap gap-2"><Link className="wm-ui-button wm-ui-button-secondary" to={compareLink(run)}>Check current fit</Link><Link className="wm-ui-button wm-ui-button-secondary" to={`${compareLink(run)}&snapshotId=${encodeURIComponent(run.id)}`}>Restore snapshot</Link><button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={(event) => { deleteTriggerRef.current = event.currentTarget; setPendingDelete(run); }}>Delete</button></div>
      </article>)}</div>
      {!visible.length ? <p role="status" className="text-sm wm-ui-copy">No saved comparisons match this filter.</p> : null}
    </> : null}
    {pendingDelete ? <div className="wm-data-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="wm-ui-card wm-ui-section" role="dialog" aria-modal="true" aria-labelledby="project-delete-comparison-title"><h2 id="project-delete-comparison-title">Delete saved snapshot?</h2><p>Delete snapshot v{pendingDelete.version ?? 1} for {pendingDelete.competitorBrand || "this competitor"} {pendingDelete.competitorSku || ""}? This cannot be undone.</p><div className="mt-4 flex gap-2"><button ref={cancelRef} type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => setPendingDelete(null)}>Cancel</button><button ref={confirmRef} type="button" className="wm-ui-button wm-ui-button-primary" onClick={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}>Delete snapshot</button></div></section></div> : null}
  </div>;
}
