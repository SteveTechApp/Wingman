import React, { useState } from 'react';
import { IOPoint, RoomData } from '../../utils/types';
import { v4 as uuidv4 } from 'uuid';
import { useProjectContext } from '../../context/ProjectContext';
import IoColumnPanel from './IoColumnPanel';
import IOPointConfigModal from '../roomWizard/IOPointConfigModal';
import InfoModal from '../InfoModal';

interface IOWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: RoomData;
}

const IOWizardModal: React.FC<IOWizardModalProps> = ({ isOpen, onClose, room }) => {
    const { dispatchProjectAction } = useProjectContext();
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<IOPoint | null>(null);

    if (!isOpen) return null;

    const handleAdd = (type: 'input' | 'output') => {
        const newPoint: IOPoint = {
            id: uuidv4(), type, quantity: 1, name: `New ${type}`,
            deviceType: type === 'input' ? 'Laptop' : 'Room Display',
            connectionType: 'HDMI', distributionType: 'Direct',
            distance: 5, terminationType: 'Wall Plate',
            control: { needed: false, types: [] },
            role: type === 'output' ? 'main' : undefined,
        };
        setEditingPoint(newPoint);
        setIsConfigModalOpen(true);
    };

    const handleEdit = (point: IOPoint) => {
        setEditingPoint(point);
        setIsConfigModalOpen(true);
    };

    const handleSave = (point: IOPoint) => {
        const existing = room.ioRequirements.find(p => p.id === point.id);
        const newIO = existing
            ? room.ioRequirements.map(p => p.id === point.id ? point : p)
            : [...room.ioRequirements, point];
        
        const updatedRoom = { ...room, ioRequirements: newIO };
        dispatchProjectAction({ type: 'UPDATE_ROOM', payload: updatedRoom });

        setIsConfigModalOpen(false);
        setEditingPoint(null);
    };

    const handleRemove = (pointId: string) => {
        const newIO = room.ioRequirements.filter(p => p.id !== pointId);
        const updatedRoom = { ...room, ioRequirements: newIO };
        dispatchProjectAction({ type: 'UPDATE_ROOM', payload: updatedRoom });
    }

    const footer = (
      <button onClick={onClose} className="btn btn-primary">Done</button>
    );

    return (
        <>
            <InfoModal 
                isOpen={isOpen} 
                onClose={onClose} 
                className="max-w-6xl"
                title="Input/Output Configuration"
                footer={footer}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <IoColumnPanel title="Inputs" type="input" onAdd={() => handleAdd('input')} onEdit={handleEdit} onRemove={handleRemove} />
                    <IoColumnPanel title="Outputs" type="output" onAdd={() => handleAdd('output')} onEdit={handleEdit} onRemove={handleRemove} />
                </div>
            </InfoModal>

            <IOPointConfigModal 
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onSave={handleSave}
                point={editingPoint}
            />
        </>
    );
};

export default IOWizardModal;