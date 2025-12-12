
import React, { useState } from 'react';
import { RoomWizardAnswers, IOPoint } from '../../utils/types';
import IOPointConfigModal from './IOPointConfigModal';
import { v4 as uuidv4 } from 'uuid';
import { CONNECTION_TYPE_ICONS } from '../../data/constants';
import { PlusIcon } from '../Icons';

interface StepInputsProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

const StepInputs: React.FC<StepInputsProps> = ({ answers, updateAnswers }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<IOPoint | null>(null);

    const inputs = answers.ioRequirements.filter(p => p.type === 'input');

    const handleAddPoint = () => {
        const newPoint: IOPoint = {
            id: uuidv4(),
            type: 'input',
            name: 'New Source',
            deviceType: 'Laptop',
            quantity: 1,
            connectionType: 'USB-C',
            distributionType: 'Direct',
            distance: 2,
            terminationType: 'Table Box',
            control: { needed: false, types: [] },
        };
        setEditingPoint(newPoint);
        setIsModalOpen(true);
    };

    const handleEditPoint = (point: IOPoint) => {
        setEditingPoint(point);
        setIsModalOpen(true);
    };

    const handleRemovePoint = (id: string) => {
        updateAnswers({ ioRequirements: answers.ioRequirements.filter(p => p.id !== id) });
    };

    const handleSavePoint = (point: IOPoint) => {
        const existing = answers.ioRequirements.find(p => p.id === point.id);
        if (existing) {
            updateAnswers({ ioRequirements: answers.ioRequirements.map(p => p.id === point.id ? point : p) });
        } else {
            updateAnswers({ ioRequirements: [...answers.ioRequirements, point] });
        }
        setIsModalOpen(false);
        setEditingPoint(null);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">Source Designer</h2>
            <p className="text-text-secondary mb-6">Define all source devices, their connection type, and physical location.</p>
            
            <div className="space-y-3">
                {inputs.map(point => {
                    const Icon = CONNECTION_TYPE_ICONS[point.connectionType] || CONNECTION_TYPE_ICONS.default;
                    return (
                        <div key={point.id} className="p-3 bg-background rounded-md border border-border-color flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Icon className="h-6 w-6 text-accent" />
                                <div>
                                    <p className="font-bold">{point.name} (x{point.quantity})</p>
                                    <p className="text-xs text-text-secondary">{point.deviceType} @ {point.terminationType} via {point.connectionType}</p>
                                </div>
                            </div>
                             <div className="flex gap-3">
                                <button onClick={() => handleEditPoint(point)} className="text-sm font-semibold text-accent hover:underline">Edit</button>
                                <button onClick={() => handleRemovePoint(point.id)} className="text-sm text-destructive hover:underline">Remove</button>
                            </div>
                        </div>
                    );
                })}

                {inputs.length === 0 && (
                     <div className="text-center py-8 border-2 border-dashed border-border-color rounded-lg">
                        <p className="text-text-secondary">No sources defined yet.</p>
                    </div>
                )}

                <button 
                    onClick={handleAddPoint}
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all"
                    style={{ backgroundColor: '#00833D' }}
                >
                    <PlusIcon className="h-4 w-4" /> Add Source
                </button>
            </div>

            <IOPointConfigModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePoint}
                point={editingPoint}
            />
        </div>
    );
};

export default StepInputs;
