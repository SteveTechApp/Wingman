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
  const [sharedNoticeVisible, setSharedNoticeVisible] = useState(fromSharedUrl);
  const [exportOpen, setExportOpen] = useState(false);
  const deleteRef = useRef<HTMLButtonElement | null>(null);
  const closeDeleteRef = useRef<HTMLButtonElement | null>(null);
  const exportItemsRef = useRef<HTMLButtonElement[]>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;
    deleteRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDelete(null);
      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) deleteRef.current?.focus();
        else closeDeleteRef.current?.focus();
      }
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

  function handleExportKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = exportItemsRef.current.filter(Boolean);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") { setExportOpen(false); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return <section className="compare-native-summary wm-ui-card wm-ui-copy" aria-label="Saved comparison history">
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Saved comparison history</summary>
      {sharedNoticeVisible ? <div role="status"><span>Shared saved-history view</span><button type="button" onClick={() => setSharedNoticeVisible(false)}>Dismiss</button></div> : null}
      <p aria-label="Saved comparison summary">{runs.length} snapshots saved.</p>
      {fromSharedUrl ? <p>Shared view: URL filters are active.</p> : null}
      <div aria-label="Quick history filters"><button type="button" onClick={() => onFilter("VERIFY")}>Verify</button><button type="button" onClick={() => onFilter("GOOD MATCH")}>Good match</button></div>
      <div className="compare-native-action-row mt-4">
        <label>Search saved comparisons <input aria-label="Search saved comparisons" value={view.search} onChange={(event) => onSearch(event.target.value)} placeholder="Brand or SKU" /></label>
        <label>Filter <select aria-label="Filter" value={view.filter} onChange={(event) => onFilter(event.target.value)}><option value="all">All verdicts</option><option value="GOOD MATCH">Good match</option><option value="PARTIAL MATCH">Partial match</option><option value="VERIFY">Verify</option><option value="NO MATCH">No match</option></select></label>
        <label>Sort <select aria-label="Sort" value={view.sort} onChange={(event) => onSort(event.target.value)}><option value="newest">Newest</option><option value="score">Highest score</option><option value="confidence">Confidence</option></select></label>
        <button type="button" onClick={() => { onSearch(""); onFilter("all"); onSort("newest"); }}>Clear filters</button>
        <div><button type="button" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen((value) => !value)}>Export</button>{exportOpen ? <div role="menu" tabIndex={-1} onKeyDown={handleExportKeys}>{[
          ["Export CSV", exportCsv],
          ["Copy text", () => void copyText()],
          ["Copy view link", () => void navigator.clipboard?.writeText(window.location.href)],
        ].map(([label, action], index) => <button key={String(label)} ref={(node) => { if (node) exportItemsRef.current[index] = node; }} role="menuitem" type="button" onClick={action as () => void}>{String(label)}</button>)}</div> : null}</div>
      </div>
      <div className="compare-native-option-grid mt-4">{visible.map((run) => <article key={run.id} className="compare-native-option-card wm-ui-card"><strong>{run.competitorBrand || "Competitor"} {run.competitorSku || "model"}</strong><span>{run.wyrestormSku || "No direction"} · {run.confidence || "Review"} · Snapshot v{run.version ?? 1}</span><small>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "Saved comparison"}</small>{compareHistoryDiff(run, runs).length ? <details><summary>What changed</summary><ul>{compareHistoryDiff(run, runs).map((change) => <li key={change}>{change}</li>)}</ul></details> : null}<div className="compare-native-action-row"><button type="button" onClick={() => onReopen(run)}>Reopen</button><button type="button" onClick={() => onRestore(run)}>Restore snapshot</button><button type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setPendingDelete(run); }}>Delete</button></div></article>)}</div>{visible.length === 0 ? <p role="status">No saved comparisons match this filter.</p> : null}
    </details>
    {pendingDelete ? <div className="wm-data-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="wm-ui-card wm-ui-section" role="dialog" aria-modal="true" aria-labelledby="compare-delete-snapshot-title"><button ref={closeDeleteRef} type="button" aria-label="Close delete dialog" onClick={() => setPendingDelete(null)}>Close</button><h2 id="compare-delete-snapshot-title">Delete saved snapshot?</h2><p>Delete snapshot v{pendingDelete.version ?? 1}? This cannot be undone.</p><button type="button" onClick={() => setPendingDelete(null)}>Cancel</button><button ref={deleteRef} type="button" onClick={() => { onDelete(pendingDelete); setPendingDelete(null); window.setTimeout(() => triggerRef.current?.focus(), 0); }}>Delete snapshot</button></section></div> : null}
  </section>;
}
