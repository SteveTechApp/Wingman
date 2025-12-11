import React from 'react';
import { IOPoint } from '../../utils/types';

interface IOPointEditorProps {
    points: IOPoint[];
    onAdd: (type: 'input' | 'output') => void;
    onEdit: (point: IOPoint) => void;
    onRemove: (id: string) => void;
}

const IOPointEditor: React.FC<IOPointEditorProps> = ({ points, onAdd, onEdit, onRemove }) => {
    const inputs = points.filter(p => p.type === 'input');
    const outputs = points.filter(p => p.type === 'output');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Inputs</h3>
                    <button onClick={() => onAdd('input')} className="text-sm font-semibold text-accent">+ Add Input</button>
                </div>
                <div className="space-y-2 p-2 bg-background rounded-md border">
                    {inputs.length > 0 ? inputs.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-2 bg-background-secondary rounded">
                            <span>{p.quantity}x {p.name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => onEdit(p)} className="text-xs">Edit</button>
                                <button onClick={() => onRemove(p.id)} className="text-xs text-destructive">Del</button>
                            </div>
                        </div>
                    )) : <p className="text-xs text-text-secondary text-center p-2">No inputs defined.</p>}
                </div>
            </div>
             <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Outputs</h3>
                    <button onClick={() => onAdd('output')} className="text-sm font-semibold text-accent">+ Add Output</button>
                </div>
                <div className="space-y-2 p-2 bg-background rounded-md border">
                     {outputs.length > 0 ? outputs.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-2 bg-background-secondary rounded">
                            <span>{p.quantity}x {p.name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => onEdit(p)} className="text-xs">Edit</button>
                                <button onClick={() => onRemove(p.id)} className="text-xs text-destructive">Del</button>
                            </div>
                        </div>
                    )) : <p className="text-xs text-text-secondary text-center p-2">No outputs defined.</p>}
                </div>
            </div>
        </div>
    );
};

export default IOPointEditor;