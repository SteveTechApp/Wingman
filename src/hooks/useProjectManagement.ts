
import { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { ProjectData, Product } from '../utils/types';
import { useLocalStorage } from './useLocalStorage';
import { projectReducer } from './reducers/projectReducer';
import toast from 'react-hot-toast';

export type AppState = 'idle' | 'loading' | 'generating' | 'error';
export type LoadingContext = 'template' | 'proposal' | 'design' | 'diagram' | 'default';

export type ProjectManagementType = ReturnType<typeof useProjectManagement>;

export const useProjectManagement = () => {
    const [projectData, dispatchProjectAction] = useReducer(projectReducer, null);
    const [savedProjects, setSavedProjects] = useLocalStorage<ProjectData[]>('savedProjects', []);
    const [lastActiveProjectId, setLastActiveProjectId] = useLocalStorage<string | null>('lastActiveProjectId', null);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    
    const [appState, setAppState] = useState<AppState>('idle');
    const [loadingContext, setLoadingContext] = useState<LoadingContext>('default');
    const [error, setError] = useState<string | null>(null);
    
    const [isDesignOptionsModalOpen, setIsDesignOptionsModalOpen] = useState(false);
    const [comparisonList, setComparisonList] = useState<Product[]>([]);
    
    const projectDataRef = useRef(projectData);
    const isRestoringRef = useRef(false);

    useEffect(() => {
        projectDataRef.current = projectData;
    }, [projectData]);

    // 1. SESSION RESTORE: Attempt to load the last active project on mount
    useEffect(() => {
        // Only try to restore if we don't have a project loaded and we have a history
        if (!projectData && lastActiveProjectId && savedProjects.length > 0 && !isRestoringRef.current) {
            const lastProject = savedProjects.find(p => p.projectId === lastActiveProjectId);
            if (lastProject) {
                console.log('Restoring previous session:', lastProject.projectName);
                isRestoringRef.current = true;
                dispatchProjectAction({ type: 'SET_PROJECT', payload: lastProject });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // 2. AUTO-SAVE & TRACKING: Save project and update last active ID
    useEffect(() => {
        // Skip auto-save during initial restoration
        if (projectData && !isRestoringRef.current) {
            // Update the list of saved projects
            const existingIndex = savedProjects.findIndex(p => p.projectId === projectData.projectId);
            const updatedProjects = [...savedProjects];

            // Check if data actually changed to avoid unnecessary writes (simple check)
            if (existingIndex !== -1) {
                 // Only update if lastSaved timestamp is different or deep comparison (optimization)
                 if (updatedProjects[existingIndex].lastSaved !== projectData.lastSaved) {
                     updatedProjects[existingIndex] = projectData;
                     setSavedProjects(updatedProjects);
                 }
            } else {
                updatedProjects.push(projectData);
                setSavedProjects(updatedProjects);
            }

            // Track this as the active project for session restore
            if (lastActiveProjectId !== projectData.projectId) {
                setLastActiveProjectId(projectData.projectId);
            }
        } else if (projectData && isRestoringRef.current) {
            // Restoration complete, enable auto-save for future changes
            isRestoringRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectData]);

    // 3. AUTO-SELECT ROOM: Select first room if none selected
    useEffect(() => {
        if (projectData && projectData.rooms.length > 0) {
            if (!activeRoomId || !projectData.rooms.find(r => r.id === activeRoomId)) {
                setActiveRoomId(projectData.rooms[0].id);
            }
        } else {
            setActiveRoomId(null);
        }
    }, [projectData, activeRoomId]);

    const handleLoadProject = useCallback((projectId: string) => {
        setAppState('loading');
        const projectToLoad = savedProjects.find(p => p.projectId === projectId);
        if (projectToLoad) {
            dispatchProjectAction({ type: 'SET_PROJECT', payload: projectToLoad });
            setLastActiveProjectId(projectId);
            setAppState('idle');
            toast.success(`Project "${projectToLoad.projectName}" loaded.`);
        } else {
            setError(`Project with ID ${projectId} not found.`);
            setAppState('error');
            toast.error("Failed to load project.");
        }
    }, [savedProjects, setLastActiveProjectId]);

    const handleDeleteProject = useCallback((projectId: string) => {
        setSavedProjects(prev => prev.filter(p => p.projectId !== projectId));
        if (projectData?.projectId === projectId) {
            dispatchProjectAction({type: 'SET_PROJECT', payload: null!});
            setLastActiveProjectId(null);
        }
        toast.success("Project deleted.");
    }, [projectData, setSavedProjects, setLastActiveProjectId]);
    
    const getState = useCallback(() => {
        return { projectData: projectDataRef.current };
    }, []);

    const toggleComparison = useCallback((product: Product) => {
        setComparisonList(prev => {
            const isComparing = prev.some(p => p.sku === product.sku);
            if (isComparing) {
                return prev.filter(p => p.sku !== product.sku);
            } else {
                if (prev.length < 4) {
                    return [...prev, product];
                }
                toast.error("You can only compare up to 4 products.");
                return prev;
            }
        });
    }, []);

    const clearComparison = useCallback(() => {
        setComparisonList([]);
    }, []);

    return {
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
        setIsDesignOptionsModalOpen,
    };
};
