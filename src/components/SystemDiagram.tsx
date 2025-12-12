import React from 'react';
import { StructuredSystemDiagram } from '../utils/types';
import MermaidDiagram from './MermaidDiagram';
import { useGenerationContext } from '../context/GenerationContext';
import { useProjectContext } from '../context/ProjectContext';

interface SystemDiagramProps {
  diagram: StructuredSystemDiagram | undefined;
}

const convertToMermaid = (diagram: StructuredSystemDiagram): string => {
    let mermaidString = 'graph TD;\n';
    
    // Add nodes
    diagram.nodes.forEach(node => {
        // Mermaid id cannot contain special characters like hyphens
        const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '');
        const labelText = node.label.replace(/"/g, '#quot;'); // Escape quotes in labels
        mermaidString += `    ${safeId}["${labelText}<br/><i style='font-size: 0.8em'>${node.id}</i>"];\n`;
    });
    
    // Add edges
    diagram.edges.forEach(edge => {
        const safeFrom = edge.from.replace(/[^a-zA-Z0-9_]/g, '');
        const safeTo = edge.to.replace(/[^a-zA-Z0-9_]/g, '');
        const labelText = edge.label.replace(/"/g, '#quot;');
        mermaidString += `    ${safeFrom} -- "${labelText}" --> ${safeTo};\n`;
    });
    
    return mermaidString;
};

const SystemDiagram: React.FC<SystemDiagramProps> = ({ diagram }) => {
    const { handleGenerateDiagram } = useGenerationContext();
    const { activeRoomId, projectData } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);

    const mermaidDefinition = diagram && diagram.nodes.length > 0 ? convertToMermaid(diagram) : '';
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
                {mermaidDefinition ? (
                    <MermaidDiagram definition={mermaidDefinition} />
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-text-secondary p-4">
                        <div>
                            <p className="font-semibold">Diagram not yet generated.</p>
                            <p className="text-xs mt-1">
                                {hasEquipment ? 'Click the "Generate with AI" button to create a diagram.' : 'Add equipment to the room before generating a diagram.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemDiagram;