
import * as React from "react";
import { StructuredSystemDiagram } from '../utils/types';

interface InteractiveDiagramProps {
  diagram: StructuredSystemDiagram | undefined;
}

const InteractiveDiagram: React.FC<InteractiveDiagramProps> = ({ diagram }) => {
  return (
    <div className="p-4\ border\ rounded-lg\ bg-gray-50\ dark:bg-gray-800\ text-center\ text-gray-500\ min-h-\[400px]\ flex\ items-center\ justify-center">
      <div>
        <h3 className="font-bold\ text-lg">System Diagram</h3>
        <p className="text-sm">Review the structured signal path and connected components.</p>
        {diagram && (
            <pre className="text-xs\ text-left\ mt-4\ bg-white\ dark:bg-gray-700\ p-2\ rounded">
                {JSON.stringify(diagram, null, 2)}
            </pre>
        )}
        {!diagram ? <p className="text-sm mt-3">No diagram data is available for this project yet.</p> : null}
      </div>
    </div>
  );
};

export default InteractiveDiagram;



