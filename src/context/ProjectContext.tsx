import * as React from "react";
import { createStrictContext } from "./createStrictContext";
import { useWingman, wingmanActions } from "@/state/useWingman";
import type { LoadingContext, WingmanProjectSummary } from "@/state/defaults";

export type ProjectManagementType = {
  savedProjects: any[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  projectData: any;
  dispatchProjectAction: (...args: any[]) => void;

  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;

  loadingContext: LoadingContext | null;

  comparisonList: any[];
  toggleComparison: (item: any) => void;
  clearComparison: () => void;

  handleDeleteProject: (id: string) => void;
};

const [ProjectContext, useProjectContext] =
  createStrictContext<ProjectManagementType>("Project");

export { useProjectContext };

export function ProjectProvider(props: { children: React.ReactNode }) {
  const savedProjects = useWingman((s) => s.projects.list);
  const activeProjectId = useWingman((s) => s.projects.activeId);
  const loadingContext = useWingman((s) => s.ui.loadingContext);
  const comparisonList = useWingman((s) => s.comparison.comparisonList);

  const [activeRoomId, setActiveRoomIdLocal] = React.useState<string | null>(null);

  const setActiveProjectId = React.useCallback((id: string | null) => {
    wingmanActions.setActiveProjectId(id);
  }, []);

  const dispatchProjectAction = React.useCallback((..._args: any[]) => {
    // placeholder for legacy reducers
  }, []);

  const setActiveRoomId = React.useCallback((id: string | null) => {
    setActiveRoomIdLocal(id);
  }, []);

  const toggleComparison = React.useCallback((item: any) => {
    wingmanActions.toggleComparison(item);
  }, []);

  const clearComparison = React.useCallback(() => {
    wingmanActions.clearComparison();
  }, []);

  const handleDeleteProject = React.useCallback((id: string) => {
    wingmanActions.setProjects(savedProjects.filter((p) => p.id !== id));
    if (activeProjectId === id) wingmanActions.setActiveProjectId(null);
  }, [savedProjects, activeProjectId]);

  const projectData = React.useMemo(() => {
    const active = savedProjects.find((p) => p.id === activeProjectId) ?? null;
    return {
      activeProject: active,
      projects: savedProjects,
      activeId: activeProjectId,
    };
  }, [savedProjects, activeProjectId]);

  const value = React.useMemo<ProjectManagementType>(() => ({
    savedProjects,
    activeProjectId,
    setActiveProjectId,
    projectData,
    dispatchProjectAction,
    activeRoomId,
    setActiveRoomId,
    loadingContext,
    comparisonList,
    toggleComparison,
    clearComparison,
    handleDeleteProject,
  }), [
    savedProjects,
    activeProjectId,
    setActiveProjectId,
    projectData,
    dispatchProjectAction,
    activeRoomId,
    setActiveRoomId,
    loadingContext,
    comparisonList,
    toggleComparison,
    clearComparison,
    handleDeleteProject,
  ]);

  return <ProjectContext.Provider value={value}>{props.children}</ProjectContext.Provider>;
}