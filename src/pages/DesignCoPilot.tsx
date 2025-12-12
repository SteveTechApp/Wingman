import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';
import ProjectWorkspace from '../components/ProjectWorkspace';
import ProjectEmptyState from '../components/ProjectEmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorDisplay from '../components/ErrorDisplay';
import DesignOptionsModal from '../components/DesignOptionsModal';
import { DesignProposal, RoomData } from '../utils/types';
import toast from 'react-hot-toast';
import { useGenerationContext } from '../context/GenerationContext';

const DesignCoPilot: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { handleDesignRoom } = useGenerationContext();
    const { 
        projectData, 
        handleLoadProject, 
        error, 
        appState,
        activeRoomId,
        isDesignOptionsModalOpen,
        setIsDesignOptionsModalOpen,
        dispatchProjectAction,
    } = useProjectContext();
    
    useEffect(() => {
        if (projectId && projectData?.projectId !== projectId) {
            handleLoadProject(projectId);
        }
    }, [projectId, projectData, handleLoadProject]);

    // This handles the case where the project ID in the URL is invalid and not found.
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => navigate('/'), 3000); // Redirect home after 3 seconds
            return () => clearTimeout(timer); // Cleanup on unmount
        }
    }, [error, navigate]);

    // Auto-design when navigating from a template
    useEffect(() => {
        const autoDesignRoomId = location.state?.autoDesignRoomId;
        // Ensure project is loaded and matches the URL projectId
        if (autoDesignRoomId && projectData?.projectId === projectId) {
            const room = projectData.rooms.find(r => r.id === autoDesignRoomId);
            // Check that we haven't already run/are running the design
            if (room && !room.aiDesignProposals && appState !== 'generating') {
                handleDesignRoom(autoDesignRoomId);
                // Clear the state from location to prevent re-triggering on refresh/re-render
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location, projectId, projectData, appState, handleDesignRoom, navigate]);

    const activeRoom = projectData?.rooms.find(r => r.id === activeRoomId);
    
    const handleApplyDesign = (proposal: DesignProposal) => {
        if (!activeRoom) return;
        
        const updatedRoom: RoomData = {
            ...activeRoom,
            designTier: proposal.tier,
            functionalityStatement: proposal.functionalityStatement,
            manuallyAddedEquipment: proposal.manuallyAddedEquipment,
            systemDiagram: undefined, // Clear diagram as equipment has changed
        };
        
        dispatchProjectAction({ type: 'UPDATE_ROOM', payload: updatedRoom });
        toast.success(`${proposal.tier} design has been applied to the room.`);
        setIsDesignOptionsModalOpen(false);
    };


    if (error) {
        return <ErrorDisplay message={error} onRetry={() => navigate('/')} />;
    }

    if (!projectData || projectData.projectId !== projectId || appState === 'loading') {
        return <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>;
    }

    if (projectData.rooms.length === 0) {
        return <ProjectEmptyState />;
    }

    return (
        <>
            <ProjectWorkspace />
            {activeRoom && (
                <DesignOptionsModal
                    isOpen={isDesignOptionsModalOpen}
                    onClose={() => setIsDesignOptionsModalOpen(false)}
                    proposals={activeRoom.aiDesignProposals || []}
                    onApplyDesign={handleApplyDesign}
                />
            )}
        </>
    );
};

export default DesignCoPilot;