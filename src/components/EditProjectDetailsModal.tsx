import React, { useState, useEffect } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import InfoModal from './InfoModal';

interface EditProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProjectDetailsModal: React.FC<EditProjectDetailsModalProps> = ({ isOpen, onClose }) => {
  const { projectData, dispatchProjectAction } = useProjectContext();
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (projectData) {
      setProjectName(projectData.projectName);
      setClientName(projectData.clientName);
    }
  }, [projectData, isOpen]);

  if (!projectData) return null;

  const handleSave = () => {
    dispatchProjectAction({ 
      type: 'UPDATE_PROJECT_DETAILS', 
      payload: { projectName, clientName }
    });
    onClose();
  };
  
  const footer = (
    <>
      <button onClick={onClose} className="bg-background hover:bg-border-color text-text-primary font-medium py-2 px-4 rounded-md">Cancel</button>
      <button onClick={handleSave} className="bg-accent hover:bg-accent-hover text-text-on-accent font-bold py-2 px-4 rounded-md">Save Changes</button>
    </>
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-lg" title="Edit Project Details" footer={footer}>
      <div className="space-y-4">
        <div>
          <label htmlFor="edit-project-name" className="block text-sm font-medium text-text-secondary">Project Name</label>
          <input type="text" id="edit-project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full p-2 border rounded-md bg-input-bg mt-1" />
        </div>
        <div>
          <label htmlFor="edit-client-name" className="block text-sm font-medium text-text-secondary">Client Name</label>
          <input type="text" id="edit-client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-2 border rounded-md bg-input-bg mt-1" />
        </div>
      </div>
    </InfoModal>
  );
};

export default EditProjectDetailsModal;