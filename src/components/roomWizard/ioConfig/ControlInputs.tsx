import React from 'react';
import { IOControl } from '../../../utils/types';
import { CONTROL_TYPES } from '../../../data/wizardOptions';
import WizardToggleOption from '../common/WizardToggleOption';
import { toggleArrayItem } from '../../../utils/utils';

interface ControlInputsProps {
  control: IOControl;
  onUpdate: (newControl: IOControl) => void;
}

const ControlInputs: React.FC<ControlInputsProps> = ({ control, onUpdate }) => {
  const handleToggleNeeded = (isChecked: boolean) => {
    onUpdate({ ...control, needed: isChecked });
  };

  const handleTypeChange = (type: string) => {
    const newTypes = toggleArrayItem(control.types, type);
    onUpdate({ ...control, types: newTypes as any });
  };

  return (
    <div className="p-4 border-t border-border-color">
      <WizardToggleOption
        label="Control Required"
        description="Does this source device need to be controlled by the system (e.g., for power on/off)?"
        checked={control.needed}
        onChange={handleToggleNeeded}
      />
      {control.needed && (
        <div className="mt-4 pl-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">Control Type</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CONTROL_TYPES.map(type => (
              <div key={type} className="flex items-center p-2 bg-background rounded-md border">
                <input
                  type="checkbox"
                  id={`control-type-${type}`}
                  checked={control.types.includes(type as any)}
                  onChange={() => handleTypeChange(type)}
                  className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                />
                <label htmlFor={`control-type-${type}`} className="ml-2 text-sm">{type}</label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlInputs;