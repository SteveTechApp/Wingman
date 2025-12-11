import React from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import IoDeviceCard from './IoDeviceCard';

const OutputsPanel: React.FC = () => {
    const { projectData, activeRoomId } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);
    const outputs = room?.ioRequirements.filter(io => io.type === 'output') || [];

    return (
        <div className="p-4 bg-background-secondary rounded-lg border border-border-color">
            <h3 className="font-bold text-lg mb-4">Outputs</h3>
            <div className="space-y-3">
                {outputs.length > 0 ? (
                    outputs.map(output => <IoDeviceCard key={output.id} point={output} />)
                ) : (
                    <p className="text-sm text-text-secondary text-center py-4">No outputs defined for this room.</p>
                )}
            </div>
        </div>
    );
};

export default OutputsPanel;