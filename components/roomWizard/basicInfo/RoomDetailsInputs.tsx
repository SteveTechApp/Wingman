import React from 'react';
import { RoomWizardAnswers } from '../../../utils/types';
import { ROOM_TYPES } from '../../../data/constants';

interface RoomDetailsInputsProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
  errors: Record<string, string>;
}

const RoomDetailsInputs: React.FC<RoomDetailsInputsProps> = ({ answers, updateAnswers, errors }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-1">
        <label htmlFor="room-name" className="block text-sm font-medium text-text-secondary">Room Name</label>
        <input
          type="text"
          id="room-name"
          value={answers.roomName}
          onChange={(e) => updateAnswers({ roomName: e.target.value })}
          className={`w-full p-2 border rounded-md bg-input-bg mt-1 ${errors.roomName ? 'border-destructive' : 'border-border-color'}`}
        />
        {errors.roomName && <p className="text-destructive text-sm mt-1">{errors.roomName}</p>}
      </div>
      <div>
        <label htmlFor="room-type" className="block text-sm font-medium text-text-secondary">Room Type</label>
        <select
          id="room-type"
          value={answers.roomType}
          onChange={(e) => updateAnswers({ roomType: e.target.value })}
          className="w-full p-2 border rounded-md bg-input-bg mt-1 border-border-color"
        >
          {ROOM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
    </div>
  );
};

export default RoomDetailsInputs;