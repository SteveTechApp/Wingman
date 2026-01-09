import React from 'react';
import { StructuredSystemDiagram } from '../utils/types';

interface SimpleDiagramProps {
    diagram: StructuredSystemDiagram;
}

const SimpleDiagram: React.FC<SimpleDiagramProps> = ({ diagram }) => {
    const { nodes, edges } = diagram;

    // Group nodes by type for better layout
    const nodesByType = nodes.reduce((acc, node) => {
        if (!acc[node.type]) acc[node.type] = [];
        acc[node.type].push(node);
        return acc;
    }, {} as Record<string, typeof nodes>);

    const typeOrder = ['source', 'input', 'processor', 'switcher', 'output', 'display', 'control', 'other'];
    const sortedTypes = Object.keys(nodesByType).sort((a, b) => {
        const aIndex = typeOrder.indexOf(a.toLowerCase());
        const bIndex = typeOrder.indexOf(b.toLowerCase());
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });

    const getNodeColor = (type: string) => {
        const colors: Record<string, string> = {
            source: 'bg-blue-100 border-blue-400 text-blue-800',
            input: 'bg-green-100 border-green-400 text-green-800',
            processor: 'bg-purple-100 border-purple-400 text-purple-800',
            switcher: 'bg-orange-100 border-orange-400 text-orange-800',
            output: 'bg-red-100 border-red-400 text-red-800',
            display: 'bg-cyan-100 border-cyan-400 text-cyan-800',
            control: 'bg-yellow-100 border-yellow-400 text-yellow-800',
        };
        return colors[type.toLowerCase()] || 'bg-gray-100 border-gray-400 text-gray-800';
    };

    return (
        <div className="p-4 h-full overflow-auto">
            <div className="space-y-6">
                {/* Nodes grouped by type */}
                {sortedTypes.map(type => (
                    <div key={type} className="space-y-2">
                        <h4 className="text-xs font-bold uppercase text-text-secondary tracking-wide">
                            {type}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {nodesByType[type].map(node => (
                                <div
                                    key={node.id}
                                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium ${getNodeColor(node.type)}`}
                                >
                                    {node.label}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Connections */}
                {edges.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border-color">
                        <h4 className="text-xs font-bold uppercase text-text-secondary tracking-wide mb-3">
                            Connections
                        </h4>
                        <div className="space-y-1">
                            {edges.map((edge, index) => {
                                const fromNode = nodes.find(n => n.id === edge.from);
                                const toNode = nodes.find(n => n.id === edge.to);
                                return (
                                    <div key={index} className="text-sm text-text-secondary flex items-center gap-2">
                                        <span className="font-medium text-text-primary">{fromNode?.label || edge.from}</span>
                                        <span className="text-accent">→</span>
                                        <span className="font-medium text-text-primary">{toNode?.label || edge.to}</span>
                                        {edge.label && (
                                            <span className="text-xs text-text-secondary">({edge.label})</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimpleDiagram;
