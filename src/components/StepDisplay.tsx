import React from 'react';
import DisplayOutputsStep, { DisplayGroup } from './DisplayOutputsStep';

interface StepDisplayProps {
    displayGroups: DisplayGroup[];
    setDisplayGroups: (groups: DisplayGroup[]) => void;
    onNext: () => void;
    onBack: () => void;
    onSave: () => void;
}

const StepDisplay: React.FC<StepDisplayProps> = (props) => {
    return <DisplayOutputsStep {...props} />;
};

export default StepDisplay;
