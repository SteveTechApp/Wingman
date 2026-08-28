import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { readProjectStore, updateStoredProject } from "../../data/projectStore";
import type { CompareHistoryView } from "../../lib/compareHistory";

const DEFAULT_VIEW: CompareHistoryView = { search: "", filter: "all", sort: "newest" };

export function useCompareHistoryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProject = readProjectStore().projects.find((project) => project.id === readProjectStore().activeProjectId);
  const projectView = activeProject?.compareHistoryView;
  const hasUrlView = Boolean(searchParams.get("historySearch") || searchParams.get("historyFilter") || searchParams.get("historySort"));
  const initial = hasUrlView
    ? { search: searchParams.get("historySearch") || "", filter: searchParams.get("historyFilter") || "all", sort: searchParams.get("historySort") || "newest" }
    : { search: projectView?.search || "", filter: projectView?.filter || "all", sort: projectView?.sort || "newest" };
  const [view, setView] = useState<CompareHistoryView>(initial);

  useEffect(() => {
    if (!activeProject) return;
    updateStoredProject(activeProject.id, (project) => ({ ...project, compareHistoryView: view }));
  }, [activeProject?.id, view]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
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
