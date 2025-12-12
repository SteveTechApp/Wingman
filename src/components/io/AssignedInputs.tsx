import React from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { PlusIcon } from '../Icons';

interface AssignedInputsProps {
  outputId: string;
}

const AssignedInputs: React.FC<AssignedInputsProps> = ({ outputId }) => {
    const { projectData, activeRoomId } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);
    
    // Placeholder logic
    const assignedInputs = room?.ioRequirements.filter(io => io.type === 'input').slice(0, 1);

    return (
        <div>
            <h5 className="text-xs font-bold mb-1">Assigned Inputs</h5>
            <div className="flex flex-wrap gap-1">
                {assignedInputs?.map(input => (
                    <div key={input.id} className="bg-background-secondary text-xs font-medium rounded-full py-0.5 px-2">
                        {input.name}
                    </div>
                ))}
                <button className="flex items-center justify-center w-5 h-5 bg-background-secondary rounded-full hover:bg-border-color">
                    <PlusIcon className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
};

export default AssignedInputs;