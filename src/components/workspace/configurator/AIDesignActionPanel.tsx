import React from 'react';
import { useGenerationContext } from '../../../context/GenerationContext';
import { useProjectContext } from '../../../context/ProjectContext';
import { SparklesIcon } from '../../Icons';

const AIDesignActionPanel: React.FC = () => {
    const { handleDesignRoom } = useGenerationContext();
    const { projectData, activeRoomId, dispatchProjectAction } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);
    const hasEquipment = room && room.manuallyAddedEquipment.length > 0;
    
    const currentTier = room?.designTier || 'Silver';
    const canUpgrade = currentTier === 'Bronze' || currentTier === 'Silver';
    const canDowngrade = currentTier === 'Silver' || currentTier === 'Gold';

    const handleDesign = () => {
        if (activeRoomId) {
            handleDesignRoom(activeRoomId);
        }
    };

    const handleTierChange = async (newTier: 'Bronze' | 'Silver' | 'Gold') => {
        if (!room || !activeRoomId) return;
        
        // Update room tier
        dispatchProjectAction({
            type: 'UPDATE_ROOM',
            payload: { ...room, designTier: newTier }
        });
        
        // Trigger redesign with new tier
        setTimeout(() => handleDesignRoom(activeRoomId), 100);
    };

    return (
        <div className="p-4 bg-accent-bg-subtle rounded-xl border-2 border-dashed border-accent-border-subtle">
            <button
                onClick={handleDesign}
                className="w-full btn btn-primary flex items-center justify-center gap-2 text-base animate-pulse-bright mb-3"
            >
                <SparklesIcon className="h-5 w-5" />
                {hasEquipment ? 'Re-Design Room with AI' : 'Design Room with AI'}
            </button>
            
            {hasEquipment && (
                <div className="border-t border-accent-border-subtle pt-3 mt-3">
                    <p className="text-xs text-text-secondary mb-2 text-center font-semibold">
                        Current Tier: <span className="text-accent">{currentTier}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {canDowngrade && (
                            <button
                                onClick={() => {
                                    const downgradeTo = currentTier === 'Gold' ? 'Silver' : 'Bronze';
                                    handleTierChange(downgradeTo);
                                }}
                                className="btn btn-secondary text-sm py-2"
                            >
                                ? Downgrade to {currentTier === 'Gold' ? 'Silver' : 'Bronze'}
                            </button>
                        )}
                        {canUpgrade && (
                            <button
                                onClick={() => {
                                    const upgradeTo = currentTier === 'Bronze' ? 'Silver' : 'Gold';
                                    handleTierChange(upgradeTo);
                                }}
                                className="btn btn-primary text-sm py-2"
                            >
                                ? Upgrade to {currentTier === 'Bronze' ? 'Silver' : 'Gold'}
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <p className="text-xs text-accent mt-2 text-center">
                {hasEquipment ? 'AI will re-evaluate and select new equipment based on the tier.' : 'AI will analyze requirements and select the best equipment.'}
            </p>
        </div>
    );
};

export default AIDesignActionPanel;
