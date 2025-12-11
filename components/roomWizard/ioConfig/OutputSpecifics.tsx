import React from 'react';
import { IOPoint, DisplayType, ProjectorLensType } from '../../../utils/types';
import { DISPLAY_TYPES, PROJECTOR_LENS_TYPES } from '../../../data/wizardOptions';

interface OutputSpecificsProps {
  point: IOPoint;
  onUpdate: (newValues: Partial<IOPoint>) => void;
}

const OutputSpecifics: React.FC<OutputSpecificsProps> = ({ point, onUpdate }) => {
  const handleDisplayTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ displayType: e.target.value as DisplayType });
  };

  const handleLensTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ projectorLensType: e.target.value as ProjectorLensType });
  };

  return (
    <div className="p-4 border-t border-border-color">
      <h3 className="font-bold mb-4">Output Specifics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="display-type" className="block text-sm font-medium">Display Type</label>
          <select
            id="display-type"
            value={point.displayType}
            onChange={handleDisplayTypeChange}
            className="w-full p-2 border rounded-md bg-input-bg mt-1"
          >
            {DISPLAY_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {point.displayType === 'projector' && (
          <div>
            <label htmlFor="projector-lens" className="block text-sm font-medium">Projector Lens</label>
            <select
              id="projector-lens"
              value={point.projectorLensType}
              onChange={handleLensTypeChange}
              className="w-full p-2 border rounded-md bg-input-bg mt-1"
            >
              {PROJECTOR_LENS_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputSpecifics;