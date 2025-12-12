import React from 'react';
import { useProjectContext } from '../context/ProjectContext';

const RoomSelectorDropdown: React.FC = () => {
    const { projectData, activeRoomId, setActiveRoomId } = useProjectContext();

    if (!projectData || projectData.rooms.length <= 1) {
        return null;
    }

    return (
        <select
            value={activeRoomId || ''}
            onChange={(e) => setActiveRoomId(e.target.value)}
            className="p-2 border rounded-md bg-input-bg"
        >
            {projectData.rooms.map(room => (
                <option key={room.id} value={room.id}>
                    {room.roomName}
                </option>
            ))}
        </select>
    );
};

export default RoomSelectorDropdown;