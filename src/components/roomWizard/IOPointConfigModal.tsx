import React, { useState, useEffect } from 'react';
import { IOPoint } from '../../utils/types';
import BasicInfoInputs from './ioConfig/BasicInfoInputs';
import ConnectivityInputs from './ioConfig/ConnectivityInputs';
import OutputSpecifics from './ioConfig/OutputSpecifics';
import ControlInputs from './ioConfig/ControlInputs';
import InfoModal from '../InfoModal';
import toast from 'react-hot-toast';

interface IOPointConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (point: IOPoint) => void;
  point: IOPoint | null;
}

const IOPointConfigModal: React.FC<IOPointConfigModalProps> = ({ isOpen, onClose, onSave, point }) => {
  const [currentPoint, setCurrentPoint] = useState<IOPoint | null>(point);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentPoint(point);
    setErrors({}); // Reset errors when modal is opened or point changes
  }, [point, isOpen]);

  if (!isOpen || !currentPoint) return null;

  const handleUpdate = (newValues: Partial<IOPoint>) => {
    setCurrentPoint(prev => prev ? { ...prev, ...newValues } : null);
    // Clear errors for the field being updated
    const fieldName = Object.keys(newValues)[0];
    if (errors[fieldName]) {
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[fieldName];
            return newErrors;
        });
    }
  };

  const handleSave = () => {
    if (!currentPoint) return;

    const newErrors: Record<string, string> = {};
    
    // HDBaseT Distance Validation
    if (currentPoint.distributionType === 'HDBaseT') {
        const distance = Number(currentPoint.distance);
        if (isNaN(distance) || distance < 1 || distance > 100) {
            newErrors.distance = 'HDBaseT distance must be between 1 and 100 meters.';
        }
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.error(Object.values(newErrors)[0]);
        return;
    }
    
    onSave(currentPoint);
  };

  const footer = (
    <>
      <button onClick={onClose} className="bg-background hover:bg-border-color text-text-primary font-medium py-2 px-4 rounded-md">Cancel</button>
      <button onClick={handleSave} className="bg-accent hover:bg-accent-hover text-text-on-accent font-bold py-2 px-4 rounded-md">Save Point</button>
    </>
  );

  return (
    <InfoModal 
        isOpen={isOpen} 
        onClose={onClose} 
        className="max-w-3xl"
        title={`Configure ${currentPoint.type === 'input' ? 'Input' : 'Output'} Point`}
        footer={footer}
    >
      <div className="space-y-6">
        <BasicInfoInputs point={currentPoint} onUpdate={handleUpdate} />
        <ConnectivityInputs point={currentPoint} onUpdate={handleUpdate} errors={errors} />
        {currentPoint.type === 'input' && (
          <ControlInputs 
            control={currentPoint.control}
            onUpdate={(newControl) => handleUpdate({ control: newControl })}
          />
        )}
        {currentPoint.type === 'output' && (
          <OutputSpecifics point={currentPoint} onUpdate={handleUpdate} />
        )}
      </div>
    </InfoModal>
  );
};

export default IOPointConfigModal;