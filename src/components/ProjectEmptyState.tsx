import React, { useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import AddRoomModal from './AddRoomModal';
import { RoomData } from '../utils/types';

const ProjectEmptyState: React.FC = () => {
  const { dispatchProjectAction } = useProjectContext();
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

  const handleAddRoom = (newRoom: RoomData) => {
    dispatchProjectAction({ type: 'ADD_ROOM', payload: newRoom });
  };

  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold">Project is Empty</h2>
      <p className="mt-2 text-text-secondary">Get started by adding your first room to the project.</p>
      <button
        onClick={() => setIsAddRoomModalOpen(true)}
        className="mt-6 bg-accent hover:bg-accent-hover text-white font-bold py-2 px-6 rounded-lg"
      >
        Add Room
      </button>
      <AddRoomModal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        onAddRoom={handleAddRoom}
      />
    </div>
  );
};

export default ProjectEmptyState;