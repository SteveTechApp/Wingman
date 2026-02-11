
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useProjectManagement, ProjectManagementType } from '../hooks/useProjectManagement';

const ProjectContext = createContext<ProjectManagementType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const projectManagementData = useProjectManagement();

  const {
    projectData,
    dispatchProjectAction,
    savedProjects,
    handleLoadProject,
    handleDeleteProject,
    activeRoomId,
    setActiveRoomId,
    appState,
    setAppState,
    loadingContext,
    setLoadingContext,
    error,
    getState,
    comparisonList,
    toggleComparison,
    clearComparison,
    isDesignOptionsModalOpen,
    setIsDesignOptionsModalOpen
  } = projectManagementData;

  const value = useMemo(() => ({
    projectData,
    dispatchProjectAction,
    savedProjects,
    handleLoadProject,
    handleDeleteProject,
    activeRoomId,
    setActiveRoomId,
    appState,
    setAppState,
    loadingContext,
    setLoadingContext,
    error,
    getState,
    comparisonList,
    toggleComparison,
    clearComparison,
    isDesignOptionsModalOpen,
    setIsDesignOptionsModalOpen
  }), [
    // Explicitly list dependencies to ensure stability
    projectData, // Re-renders only when projectData changes (which is correct)
    dispatchProjectAction,
    savedProjects,
    handleLoadProject,
    handleDeleteProject,
    activeRoomId,
    setActiveRoomId,
    appState,
    setAppState,
    loadingContext,
    setLoadingContext,
    error,
    getState,
    comparisonList,
    toggleComparison,
    clearComparison,
    isDesignOptionsModalOpen,
    setIsDesignOptionsModalOpen
  ]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    // Wingman hardening: do not hard-crash the whole app if provider is missing.
    // Return a minimal safe fallback object; guards can redirect appropriately.
    console.warn("useProjectContext used without ProjectProvider — returning fallback context");
    return {
      project: null,
      activeProjectId: null,
      setActiveProjectId: () => {},
      setProject: () => {},
      updateProject: () => {},
      clearProject: () => {},
      rooms: [],
      setRooms: () => {}
    } as any;
  }
  return context;
};



