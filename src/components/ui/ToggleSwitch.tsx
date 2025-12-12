
import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onColor?: string;
  offColor?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, onColor = 'bg-accent', offColor = 'bg-border-color' }) => {
    // Use explicit inline style for background to ensure visibility regardless of Tailwind config
    const bgStyle = checked ? { backgroundColor: '#00833D' } : { backgroundColor: '#cbd5e1' };
    const ringClass = checked ? 'ring-2 ring-[#00833D] ring-offset-2' : '';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            style={bgStyle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none ${ringClass}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
};

export default ToggleSwitch;
