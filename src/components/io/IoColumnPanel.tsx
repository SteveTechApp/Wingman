import React from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { IOPoint } from '../../utils/types';
import IoDeviceCard from './IoDeviceCard';
import { PlusIcon } from '../Icons';

interface IoColumnPanelProps {
    title: string;
    type: 'input' | 'output';
    onAdd: () => void;
    onEdit: (point: IOPoint) => void;
    onRemove: (pointId: string) => void;
}

const IoColumnPanel: React.FC<IoColumnPanelProps> = ({ title, type, onAdd, onEdit, onRemove }) => {
    const { projectData, activeRoomId } = useProjectContext();
    const room = projectData?.rooms.find(r => r.id === activeRoomId);
    const points = room?.ioRequirements.filter(io => io.type === type) || [];

    return (
        <div className="p-6 bg-background-secondary rounded-xl shadow-xl border border-border-color">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{title} ({points.length})</h3>
                <button onClick={onAdd} className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
                    <PlusIcon className="h-4 w-4" />
                    Add {title.slice(0, -1)}
                </button>
            </div>
            <div className="space-y-3">
                {points.length > 0 ? (
                    points.map(point => <IoDeviceCard key={point.id} point={point} onEdit={onEdit} onRemove={onRemove} />)
                ) : (
                    <div className="text-center py-4 border-2 border-dashed border-border-color rounded-lg">
                        <p className="text-sm text-text-secondary">No {type}s defined.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IoColumnPanel;