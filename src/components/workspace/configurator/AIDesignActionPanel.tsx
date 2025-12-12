import React from 'react';
import { useGenerationContext } from '../../../context/GenerationContext';
import { useProjectContext } from '../../../context/ProjectContext';
import { SparklesIcon } from '../../Icons';

const AIDesignActionPanel: React.FC = () => {
    const { handleDesignRoom } = useGenerationContext();
    const { projectData, activeRoomId } = useProjectContext();

    const room = projectData?.rooms.find(r => r.id === activeRoomId);
    const hasEquipment = room && room.manuallyAddedEquipment.length > 0;

    const handleDesign = () => {
        if (activeRoomId) {
            handleDesignRoom(activeRoomId);
        }
    };

    return (
        <div className="p-4 bg-accent-bg-subtle rounded-xl border-2 border-dashed border-accent-border-subtle text-center">
            <button
                onClick={handleDesign}
                className="w-full btn btn-primary flex items-center justify-center gap-2 text-base animate-pulse-bright"
            >
                <SparklesIcon className="h-5 w-5" />
                {hasEquipment ? 'Re-Design Room with AI' : 'Design Room with AI'}
            </button>
            <p className="text-xs text-accent mt-2">
                {hasEquipment ? 'Let the AI re-evaluate the room and select new equipment based on the current configuration.' : 'Let the AI analyze the room requirements and select the best equipment for the job.'}
            </p>
        </div>
    );
};

export default AIDesignActionPanel;