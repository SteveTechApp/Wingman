import React from 'react';
import { ChevronDownIcon } from '../Icons';

interface DeviceAttributeSelectorProps {
  label: string;
  value: string;
  options?: string[];
  onChange?: (newValue: string) => void;
}

const DeviceAttributeSelector: React.FC<DeviceAttributeSelectorProps> = ({ label, value, options, onChange }) => {
  return (
    <div className="relative">
      <select 
        className="appearance-none bg-background-secondary text-xs font-medium rounded-full py-1 pl-3 pr-8 border border-transparent hover:border-border-color"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={!onChange}
      >
        <option value={value}>{value}</option>
        {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDownIcon className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
    </div>
  );
};

export default DeviceAttributeSelector;