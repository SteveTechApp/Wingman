import React from 'react';
import { useProjectContext } from '../../../context/ProjectContext';

const FunctionalityStatementPanel: React.FC = () => {
    const { projectData, activeRoomId, dispatchProjectAction } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);

    if (!room) return null;

    const handleStatementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newStatement = e.target.value;
        const updatedRoom = { ...room, functionalityStatement: newStatement };
        dispatchProjectAction({ type: 'UPDATE_ROOM', payload: updatedRoom });
    };

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-xl border border-border-color">
            <h3 className="font-bold text-lg mb-2">Functionality Statement</h3>
            <p className="text-xs text-text-secondary mb-2">
                This statement is used by the AI to understand the room's purpose. Be descriptive.
            </p>
            <textarea
                value={room.functionalityStatement}
                onChange={handleStatementChange}
                className="w-full h-32 p-2 border rounded-md bg-input-bg text-sm"
                placeholder="e.g., A dual-display video conferencing room where users can connect via USB-C or cast wirelessly..."
            />
        </div>
    );
};

export default FunctionalityStatementPanel;