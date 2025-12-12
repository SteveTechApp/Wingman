import React, { useState } from 'react';
import { RoomWizardAnswers, IOPoint } from '../../../utils/types';
import IOPointEditor from '../IOPointEditor';
import IOPointConfigModal from '../IOPointConfigModal';
import { v4 as uuidv4 } from 'uuid';

interface IOSectionProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

const IOSection: React.FC<IOSectionProps> = ({ answers, updateAnswers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<IOPoint | null>(null);

  const handleAddPoint = (type: 'input' | 'output') => {
    // FIX: Added missing deviceType and control properties to match IOPoint type.
    const newPoint: IOPoint = {
      id: uuidv4(), type, quantity: 1, name: `New ${type}`,
      deviceType: type === 'input' ? 'Laptop' : 'Room Display',
      connectionType: 'HDMI', distributionType: 'Direct',
      distance: 5, terminationType: 'Wall Plate',
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
        <h3 className="text-xl font-bold mb-4">I/O Requirements</h3>
        <IOPointEditor 
            points={answers.ioRequirements}
            onAdd={handleAddPoint}
            onEdit={handleEditPoint}
            onRemove={handleRemovePoint}
        />
        <IOPointConfigModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSavePoint}
            point={editingPoint}
        />
    </div>
  );
};

export default IOSection;