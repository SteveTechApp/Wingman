import React from 'react';
import { RoomWizardAnswers } from '../../utils/types';
import { VIDEO_RESOLUTIONS, CONTROL_SYSTEMS, AVOIP_SYSTEM_TYPES } from '../../data/wizardOptions';

interface StepTechnicalProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

const StepTechnical: React.FC<StepTechnicalProps> = ({ answers, updateAnswers }) => {

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
      <h2 className="text-2xl font-bold mb-4 text-text-primary">Technical Details</h2>
      <p className="text-text-secondary mb-6">Specify the core technical requirements for the system.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="primary-resolution" className="block text-sm font-medium text-text-secondary">Primary Video Resolution</label>
          <select
            id="primary-resolution"
            name="primaryVideoResolution"
            value={answers.technicalDetails.primaryVideoResolution}
            onChange={handleTechDetailChange}
            className="w-full p-2 border rounded-md bg-input-bg mt-1"
          >
            {VIDEO_RESOLUTIONS.map(res => <option key={res} value={res}>{res}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="control-system" className="block text-sm font-medium text-text-secondary">Control System</label>
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
        <div className="md:col-span-2">
          <label htmlFor="avoip-system" className="block text-sm font-medium text-text-secondary">AVoIP System</label>
          <select
            id="avoip-system"
            name="avoipSystem"
            value={answers.technicalDetails.avoipSystem || 'None'}
            onChange={handleTechDetailChange}
            className="w-full p-2 border rounded-md bg-input-bg mt-1"
          >
            {AVOIP_SYSTEM_TYPES.map(sys => <option key={sys} value={sys}>{sys}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default StepTechnical;