import React from 'react';
import { IOPoint } from '../../../utils/types';
import { SOURCE_DEVICE_TYPES, OUTPUT_DEVICE_TYPES, OUTPUT_ROLES } from '../../../data/wizardOptions';

interface BasicInfoInputsProps {
  point: IOPoint;
  onUpdate: (newValues: Partial<IOPoint>) => void;
}

const BasicInfoInputs: React.FC<BasicInfoInputsProps> = ({ point, onUpdate }) => {
  const deviceTypeOptions = point.type === 'input' ? SOURCE_DEVICE_TYPES : OUTPUT_DEVICE_TYPES;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <label htmlFor="io-point-name" className="block text-sm font-medium">Friendly Name</label>
        <input
          type="text"
          id="io-point-name"
          value={point.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full p-2 border rounded-md bg-input-bg mt-1"
          placeholder="e.g., Lectern PC"
        />
      </div>
      <div>
        <label htmlFor="io-device-type" className="block text-sm font-medium">Device Type</label>
        <select
          id="io-device-type"
          value={point.deviceType}
          onChange={(e) => onUpdate({ deviceType: e.target.value })}
          className="w-full p-2 border rounded-md bg-input-bg mt-1"
        >
          {deviceTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
       <div>
        <label htmlFor="io-point-quantity" className="block text-sm font-medium">Quantity</label>
        <input
          type="number"
          id="io-point-quantity"
          min="1"
          value={point.quantity}
          onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
          className="w-full p-2 border rounded-md bg-input-bg mt-1"
        />
      </div>
       {point.type === 'output' && (
        <div className="md:col-span-3">
            <label htmlFor="io-point-role" className="block text-sm font-medium">Role</label>
            <select
                id="io-point-role"
                value={point.role || 'main'}
                onChange={(e) => onUpdate({ role: e.target.value as any })}
                className="w-full p-2 border rounded-md bg-input-bg mt-1"
            >
                {OUTPUT_ROLES.map(role => <option key={role} value={role.toLowerCase()}>{role}</option>)}
            </select>
        </div>
      )}
    </div>
  );
};

export default BasicInfoInputs;