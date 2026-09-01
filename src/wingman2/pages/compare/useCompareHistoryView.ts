import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { readProjectStore, updateStoredProject } from "../../data/projectStore";
import type { CompareHistoryView } from "../../lib/compareHistory";

const DEFAULT_VIEW: CompareHistoryView = { search: "", filter: "all", sort: "newest" };

export function useCompareHistoryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = readProjectStore();
  const activeProject = store.projects.find((project) => project.id === store.activeProjectId);
  const activeProjectId = activeProject?.id;
  const projectView = activeProject?.compareHistoryView;
  const hasUrlView = Boolean(searchParams.get("historySearch") || searchParams.get("historyFilter") || searchParams.get("historySort"));
  const initial = hasUrlView
    ? { search: searchParams.get("historySearch") || "", filter: searchParams.get("historyFilter") || "all", sort: searchParams.get("historySort") || "newest" }
    : { search: projectView?.search || "", filter: projectView?.filter || "all", sort: projectView?.sort || "newest" };
  const [view, setView] = useState<CompareHistoryView>(initial);

  useEffect(() => {
    if (!activeProjectId) return;
    updateStoredProject(activeProjectId, (project) => ({ ...project, compareHistoryView: view }));
  }, [activeProjectId, view]);

  // Keep the latest searchParams available to the persistence effect without
  // depending on its identity (it changes on every navigation).
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  useEffect(() => {
    const next = new URLSearchParams(searchParamsRef.current);
    if (view.search) next.set("historySearch", view.search); else next.delete("historySearch");
    if (view.filter !== "all") next.set("historyFilter", view.filter); else next.delete("historyFilter");
    if (view.sort !== "newest") next.set("historySort", view.sort); else next.delete("historySort");
    setSearchParams(next, { replace: true });
  }, [view, setSearchParams]);

  return useMemo(() => ({
    view,
    setSearch: (search: string) => setView((current) => ({ ...current, search })),
    setFilter: (filter: string) => setView((current) => ({ ...current, filter })),
    setSort: (sort: string) => setView((current) => ({ ...current, sort })),
    reset: () => setView(DEFAULT_VIEW),
    fromSharedUrl: hasUrlView,
  }), [hasUrlView, view]);
}
