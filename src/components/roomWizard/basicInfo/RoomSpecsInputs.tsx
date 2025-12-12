import React, { useState, useEffect } from 'react';
import { useUserContext } from '../../../context/UserContext';
import { RoomWizardAnswers } from '../../../utils/types';

interface RoomSpecsInputsProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
  errors: Record<string, string>;
}

const METER_TO_FEET = 3.28084;

const RoomSpecsInputs: React.FC<RoomSpecsInputsProps> = ({ answers, updateAnswers, errors }) => {
  const { userProfile } = useUserContext();
  const isImperial = userProfile.unitSystem === 'imperial';

  const toDisplay = (meters: number) => (isImperial ? (meters * METER_TO_FEET).toFixed(1) : String(meters));
  const fromDisplay = (value: string) => {
    const num = parseFloat(value) || 0;
    return isImperial ? num / METER_TO_FEET : num;
  };

  const [localLength, setLocalLength] = useState(() => toDisplay(answers.dimensions.length));
  const [localWidth, setLocalWidth] = useState(() => toDisplay(answers.dimensions.width));
  const [localHeight, setLocalHeight] = useState(() => toDisplay(answers.dimensions.height));

  useEffect(() => {
    setLocalLength(toDisplay(answers.dimensions.length));
    setLocalWidth(toDisplay(answers.dimensions.width));
    setLocalHeight(toDisplay(answers.dimensions.height));
  }, [answers.dimensions, isImperial]);

  const handleBlur = (field: 'length' | 'width' | 'height', value: string) => {
    updateAnswers({ dimensions: { ...answers.dimensions, [field]: fromDisplay(value) } });
  };
  
  const unitLabel = isImperial ? 'ft' : 'm';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div>
        <label htmlFor="room-length" className="block text-sm font-medium text-text-secondary">Length ({unitLabel})</label>
        <input
          type="number"
          step="0.1"
          id="room-length"
          value={localLength}
          onChange={(e) => setLocalLength(e.target.value)}
          onBlur={(e) => handleBlur('length', e.target.value)}
          className={`w-full p-2 border rounded-md bg-input-bg mt-1 ${errors.length ? 'border-destructive' : 'border-border-color'}`}
        />
        {errors.length && <p className="text-destructive text-sm mt-1">{errors.length}</p>}
      </div>
      <div>
        <label htmlFor="room-width" className="block text-sm font-medium text-text-secondary">Width ({unitLabel})</label>
        <input
          type="number"
          step="0.1"
          id="room-width"
          value={localWidth}
          onChange={(e) => setLocalWidth(e.target.value)}
          onBlur={(e) => handleBlur('width', e.target.value)}
          className={`w-full p-2 border rounded-md bg-input-bg mt-1 ${errors.width ? 'border-destructive' : 'border-border-color'}`}
        />
        {errors.width && <p className="text-destructive text-sm mt-1">{errors.width}</p>}
      </div>
      <div>
        <label htmlFor="room-height" className="block text-sm font-medium text-text-secondary">Height ({unitLabel})</label>
        <input
          type="number"
          step="0.1"
          id="room-height"
          value={localHeight}
          onChange={(e) => setLocalHeight(e.target.value)}
          onBlur={(e) => handleBlur('height', e.target.value)}
          className={`w-full p-2 border rounded-md bg-input-bg mt-1 ${errors.height ? 'border-destructive' : 'border-border-color'}`}
        />
        {errors.height && <p className="text-destructive text-sm mt-1">{errors.height}</p>}
      </div>
      <div>
        <label htmlFor="room-participants" className="block text-sm font-medium text-text-secondary">Max Participants</label>
        <input
          type="number"
          id="room-participants"
          value={answers.maxParticipants}
          onChange={(e) => updateAnswers({ maxParticipants: Number(e.target.value) })}
          className={`w-full p-2 border rounded-md bg-input-bg mt-1 ${errors.maxParticipants ? 'border-destructive' : 'border-border-color'}`}
        />
        {errors.maxParticipants && <p className="text-destructive text-sm mt-1">{errors.maxParticipants}</p>}
      </div>
    </div>
  );
};

export default RoomSpecsInputs;