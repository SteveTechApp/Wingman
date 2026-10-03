import type { StoredCompareRun } from "../data/projectStore";

export type CompareHistoryView = { search: string; filter: string; sort: string };

export function savedHistoryRuns(runs: StoredCompareRun[] = []): StoredCompareRun[] {
  return runs.filter((run) => run.mode === "saved-history");
}

export function filterAndSortCompareHistory(runs: StoredCompareRun[], view: CompareHistoryView): StoredCompareRun[] {
  const query = view.search.trim().toLowerCase();
  const filtered = savedHistoryRuns(runs).filter((run) => {
    const verdict = run.matchType || "Review";
    const searchable = `${run.competitorBrand || ""} ${run.competitorSku || ""} ${run.wyrestormSku || ""}`.toLowerCase();
    return (view.filter === "all" || verdict === view.filter) && (!query || searchable.includes(query));
  });

  return [...filtered].sort((left, right) => {
    if (view.sort === "score") return (right.matchScore ?? -1) - (left.matchScore ?? -1);
    if (view.sort === "confidence") return String(left.confidence || "").localeCompare(String(right.confidence || ""));
    return Date.parse(right.createdAt || "") - Date.parse(left.createdAt || "");
  });
}

export function compareHistoryDiff(run: StoredCompareRun, runs: StoredCompareRun[]): string[] {
  const prior = savedHistoryRuns(runs)
    .filter((candidate) => candidate.competitorBrand === run.competitorBrand && candidate.competitorSku === run.competitorSku && (candidate.version ?? 1) < (run.version ?? 1))
    .sort((left, right) => (right.version ?? 1) - (left.version ?? 1))[0];
  if (!prior) return [];
  const changes: string[] = [];
  if (prior.wyrestormSku !== run.wyrestormSku) changes.push(`Direction changed from ${prior.wyrestormSku || "unspecified"} to ${run.wyrestormSku || "unspecified"}.`);
  if (prior.matchType !== run.matchType) changes.push(`Verdict changed from ${prior.matchType || "review"} to ${run.matchType || "review"}.`);
  if (prior.confidence !== run.confidence) changes.push(`Confidence changed from ${prior.confidence || "unrecorded"} to ${run.confidence || "unrecorded"}.`);
  if ((prior.evidence?.length ?? 0) !== (run.evidence?.length ?? 0)) changes.push(`Evidence count changed from ${prior.evidence?.length ?? 0} to ${run.evidence?.length ?? 0}.`);
  if ((prior.warnings?.length ?? 0) !== (run.warnings?.length ?? 0)) changes.push(`Quote-check count changed from ${prior.warnings?.length ?? 0} to ${run.warnings?.length ?? 0}.`);
  return changes;
}

export function buildCompareHistoryCsv(runs: StoredCompareRun[]): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [["Version", "Saved at", "Competitor", "Competitor SKU", "WyreStorm SKU", "Verdict", "Confidence", "Score"], ...runs.map((run) => [String(run.version ?? 1), run.createdAt, run.competitorBrand || "", run.competitorSku || "", run.wyrestormSku || "", run.matchType || "", run.confidence || "", String(run.matchScore ?? "")])].map((row) => row.map(quote).join(",")).join("\n");
}

export function buildCompareHistoryText(runs: StoredCompareRun[], view: CompareHistoryView): string {
  return [`Saved comparisons (${runs.length})`, `View: ${view.filter === "all" ? "all verdicts" : view.filter}; ${view.sort === "newest" ? "newest first" : view.sort === "score" ? "highest score first" : "confidence order"}`, "", ...runs.map((run, index) => `${index + 1}. ${run.competitorBrand || "Competitor"} ${run.competitorSku || "model"} → ${run.wyrestormSku || "No direction"} (${run.confidence || "Review"}; score ${run.matchScore ?? "n/a"})`)].join("\n");
}
