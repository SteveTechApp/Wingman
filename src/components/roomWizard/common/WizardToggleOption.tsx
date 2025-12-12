import React from 'react';
import ToggleSwitch from '../../ui/ToggleSwitch';

interface WizardToggleOptionProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (isChecked: boolean) => void;
    htmlForId?: string;
}

const WizardToggleOption: React.FC<WizardToggleOptionProps> = ({ label, description, checked, onChange, htmlForId }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-background rounded-md border border-border-color">
            <div>
                <label htmlFor={htmlForId} className="text-sm font-medium">{label}</label>
                <p className="text-xs text-text-secondary">{description}</p>
            </div>
            <ToggleSwitch
                checked={checked}
                onChange={onChange}
            />
        </div>
    );
};

export default WizardToggleOption;