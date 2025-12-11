import React, { useState, useEffect } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import InfoModal from './InfoModal';

interface ProjectNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectNotesModal: React.FC<ProjectNotesModalProps> = ({ isOpen, onClose }) => {
  const { projectData, dispatchProjectAction } = useProjectContext();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && projectData) {
      setNotes(projectData.notes);
    }
  }, [isOpen, projectData]);

  const handleSave = () => {
    dispatchProjectAction({ type: 'UPDATE_NOTES', payload: notes });
    onClose();
  };
  
  const footer = (
    <>
      <button onClick={onClose} className="bg-background hover:bg-border-color text-text-primary font-medium py-2 px-4 rounded-md">Cancel</button>
      <button onClick={handleSave} className="bg-accent hover:bg-accent-hover text-text-on-accent font-bold py-2 px-4 rounded-md">Save Notes</button>
    </>
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-3xl" title="Project Notes" footer={footer}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full h-96 p-2 border rounded-md bg-input-bg resize-none"
        placeholder="Add project-wide notes here..."
      />
    </InfoModal>
  );
};

export default ProjectNotesModal;