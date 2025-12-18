import React from 'react';
import { StructuredSystemDiagram } from '../utils/types';
import SimpleDiagram from './SimpleDiagram';
import { useGenerationContext } from '../context/GenerationContext';
import { useProjectContext } from '../context/ProjectContext';

interface SystemDiagramProps {
  diagram: StructuredSystemDiagram | undefined;
}

const SystemDiagram: React.FC<SystemDiagramProps> = ({ diagram }) => {
  const { handleGenerateDiagram } = useGenerationContext();
  const { activeRoomId, projectData } = useProjectContext();
  const room = projectData?.rooms.find(r => r.id === activeRoomId);

  const hasEquipment = room && room.manuallyAddedEquipment.length > 0;

  return (
    <div className="bg-background-secondary p-4 rounded-xl shadow-xl border border-border-color h-full flex flex-col min-h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">System Diagram</h3>
        <button
          onClick={() => activeRoomId && handleGenerateDiagram(activeRoomId)}
          disabled={!hasEquipment}
          className="btn btn-secondary text-sm"
        >
          {diagram ? 'Refresh Diagram' : 'Generate with AI'}
        </button>
      </div>
      <div className="flex-grow bg-background rounded-md border border-border-color">
        {diagram ? (
          <SimpleDiagram diagram={diagram} />
        ) : (
          <div className="flex items-center justify-center h-full text-center text-text-secondary p-4">
            <div>
              <p className="font-semibold">Diagram not yet generated.</p>
              <p className="text-xs mt-1">
                {hasEquipment
                  ? 'Click the "Generate with AI" button to create a diagram.'
                  : 'Add equipment to the room before generating a diagram.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemDiagram;
