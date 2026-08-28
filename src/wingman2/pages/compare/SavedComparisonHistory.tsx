import { useEffect, useRef, useState } from "react";
import type { StoredCompareRun } from "../../data/projectStore";
import { buildCompareHistoryCsv, buildCompareHistoryText, compareHistoryDiff, filterAndSortCompareHistory, type CompareHistoryView } from "../../lib/compareHistory";

type Props = {
  runs: StoredCompareRun[];
  view: CompareHistoryView;
  onSearch: (value: string) => void;
  onFilter: (value: string) => void;
  onSort: (value: string) => void;
  onReopen: (run: StoredCompareRun) => void;
  onRestore: (run: StoredCompareRun) => void;
  onDelete: (run: StoredCompareRun) => void;
  fromSharedUrl?: boolean;
};

export function SavedComparisonHistory({ runs, view, onSearch, onFilter, onSort, onReopen, onRestore, onDelete, fromSharedUrl = false }: Props) {
  const visible = filterAndSortCompareHistory(runs, view);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StoredCompareRun | null>(null);
  const deleteRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;
    deleteRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDelete(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pendingDelete]);

  function exportCsv() {
    const blob = new Blob([buildCompareHistoryCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wingman-saved-comparisons.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    await navigator.clipboard?.writeText(buildCompareHistoryText(visible, view));
  }

  return <section className="compare-native-summary wm-ui-card wm-ui-copy" aria-label="Saved comparison history">
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Saved comparison history</summary>
      {fromSharedUrl ? <p role="status">Shared saved-history view loaded from the URL.</p> : null}
      <div className="compare-native-action-row mt-4">
        <label>Search saved comparisons <input aria-label="Search saved comparisons" value={view.search} onChange={(event) => onSearch(event.target.value)} placeholder="Brand or SKU" /></label>
        <label>Filter <select aria-label="Filter" value={view.filter} onChange={(event) => onFilter(event.target.value)}><option value="all">All verdicts</option><option value="GOOD MATCH">Good match</option><option value="PARTIAL MATCH">Partial match</option><option value="VERIFY">Verify</option><option value="NO MATCH">No match</option></select></label>
        <label>Sort <select aria-label="Sort" value={view.sort} onChange={(event) => onSort(event.target.value)}><option value="newest">Newest</option><option value="score">Highest score</option><option value="confidence">Confidence</option></select></label>
        <button type="button" onClick={() => { onSearch(""); onFilter("all"); onSort("newest"); }}>Clear filters</button>
        <button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={() => void copyText()}>Copy text</button>
      </div>
      <div className="compare-native-option-grid mt-4">{visible.map((run) => <article key={run.id} className="compare-native-option-card wm-ui-card"><strong>{run.competitorBrand || "Competitor"} {run.competitorSku || "model"}</strong><span>{run.wyrestormSku || "No direction"} · {run.confidence || "Review"} · Snapshot v{run.version ?? 1}</span><small>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "Saved comparison"}</small>{compareHistoryDiff(run, runs).length ? <details><summary>What changed</summary><ul>{compareHistoryDiff(run, runs).map((change) => <li key={change}>{change}</li>)}</ul></details> : null}<div className="compare-native-action-row"><button type="button" onClick={() => onReopen(run)}>Reopen</button><button type="button" onClick={() => onRestore(run)}>Restore snapshot</button><button type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setPendingDelete(run); }}>Delete</button></div></article>)}</div>{visible.length === 0 ? <p role="status">No saved comparisons match this filter.</p> : null}
    </details>
    {pendingDelete ? <div className="wm-data-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="wm-ui-card wm-ui-section" role="dialog" aria-modal="true" aria-labelledby="compare-delete-snapshot-title"><button type="button" aria-label="Close delete dialog" onClick={() => setPendingDelete(null)}>Close</button><h2 id="compare-delete-snapshot-title">Delete saved snapshot?</h2><p>Delete snapshot v{pendingDelete.version ?? 1}? This cannot be undone.</p><button type="button" onClick={() => setPendingDelete(null)}>Cancel</button><button ref={deleteRef} type="button" onClick={() => { onDelete(pendingDelete); setPendingDelete(null); window.setTimeout(() => triggerRef.current?.focus(), 0); }}>Delete snapshot</button></section></div> : null}
  </section>;
}
