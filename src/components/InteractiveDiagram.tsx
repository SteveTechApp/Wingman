import React from 'react';
import { StructuredSystemDiagram } from '../utils/types';

interface InteractiveDiagramProps {
  diagram: StructuredSystemDiagram | undefined;
}

const InteractiveDiagram: React.FC<InteractiveDiagramProps> = ({ diagram }) => {
  // This is a placeholder for a more advanced diagramming component,
  // potentially using a library like React Flow.
  // For now, it will just show a message.

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-500 min-h-[400px] flex items-center justify-center">
      <div>
        <h3 className="font-bold text-lg">Interactive System Diagram</h3>
        <p className="text-sm">This is a placeholder for an interactive diagram component.</p>
        {diagram && (
            <pre className="text-xs text-left mt-4 bg-white dark:bg-gray-700 p-2 rounded">
                {JSON.stringify(diagram, null, 2)}
            </pre>
        )}
      </div>
    </div>
  );
};

export default InteractiveDiagram;