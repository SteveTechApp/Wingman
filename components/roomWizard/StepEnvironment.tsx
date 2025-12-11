import React, { useState } from 'react';
import { RoomWizardAnswers } from '../../utils/types';
import {
  WALL_CONSTRUCTION_OPTIONS,
  CONTAINMENT_OPTIONS,
  FURNITURE_TYPES,
  CONTROL_SYSTEMS,
} from '../../data/wizardOptions';
import AudioDesignGuideModal from '../AudioDesignGuideModal';

interface StepEnvironmentProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

const StepEnvironment: React.FC<StepEnvironmentProps> = ({ answers, updateAnswers }) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleConstructionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateAnswers({ constructionDetails: { ...answers.constructionDetails, [name]: value } });
  };
  
  const handleTechDetailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateAnswers({
      technicalDetails: {
        ...answers.technicalDetails,
        [name]: value,
      },
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-text-primary">Environment & Control</h2>
      <p className="text-text-secondary mb-6">Provide details about the physical room and how users will control the system.</p>
      
      <div className="space-y-8">
        <div>
          <h3 className="font-bold mb-4">Construction & Furniture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="wall-construction" className="block text-sm font-medium text-text-secondary">Wall Construction</label>
              <select id="wall-construction" name="wallConstruction" value={answers.constructionDetails.wallConstruction} onChange={handleConstructionChange} className="w-full p-2 border rounded-md bg-input-bg mt-1">
                {WALL_CONSTRUCTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cable-containment" className="block text-sm font-medium text-text-secondary">Cable Containment</label>
              <select id="cable-containment" name="cableContainment" value={answers.constructionDetails.cableContainment} onChange={handleConstructionChange} className="w-full p-2 border rounded-md bg-input-bg mt-1">
                {CONTAINMENT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="furniture-type" className="block text-sm font-medium text-text-secondary">Furniture Type</label>
              <select id="furniture-type" name="furnitureType" value={answers.constructionDetails.furnitureType} onChange={handleConstructionChange} className="w-full p-2 border rounded-md bg-input-bg mt-1">
                {FURNITURE_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
           <h3 className="font-bold mb-4">Control System</h3>
           <div>
              <label htmlFor="control-system" className="block text-sm font-medium text-text-secondary">Primary Control Method</label>
              <select
                id="control-system"
                name="controlSystem"
                value={answers.technicalDetails.controlSystem}
                onChange={handleTechDetailChange}
                className="w-full p-2 border rounded-md bg-input-bg mt-1"
              >
                {CONTROL_SYSTEMS.map(sys => <option key={sys} value={sys}>{sys}</option>)}
              </select>
            </div>
        </div>
      </div>
      <AudioDesignGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default StepEnvironment;