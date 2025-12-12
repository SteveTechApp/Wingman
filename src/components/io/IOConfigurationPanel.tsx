import React from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { InputIcon, OutputIcon } from '../Icons';

interface IOConfigurationPanelProps {
  onOpenWizard: () => void;
}

const IOConfigurationPanel: React.FC<IOConfigurationPanelProps> = ({ onOpenWizard }) => {
  const { projectData, activeRoomId } = useProjectContext();
  const room = projectData?.rooms.find(r => r.id === activeRoomId);

  const inputsCount = room?.ioRequirements.filter(p => p.type === 'input').length || 0;
  const outputsCount = room?.ioRequirements.filter(p => p.type === 'output').length || 0;

  return (
    <div className="bg-background-secondary p-6 rounded-xl shadow-xl border border-border-color">
      <h3 className="font-bold text-lg mb-4">I/O Configuration</h3>
      <div className="flex items-center justify-between bg-background p-4 rounded-md border border-border-color">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <InputIcon className="h-6 w-6 text-accent" />
            <div>
              <p className="font-bold text-2xl">{inputsCount}</p>
              <p className="text-xs text-text-secondary uppercase">Inputs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OutputIcon className="h-6 w-6 text-accent" />
            <div>
              <p className="font-bold text-2xl">{outputsCount}</p>
              <p className="text-xs text-text-secondary uppercase">Outputs</p>
            </div>
          </div>
        </div>
        <button onClick={onOpenWizard} className="btn btn-secondary">
          Configure I/O Points
        </button>
      </div>
    </div>
  );
};

export default IOConfigurationPanel;