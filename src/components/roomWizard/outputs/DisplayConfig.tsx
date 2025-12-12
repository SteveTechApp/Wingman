import React, { useState, useEffect } from 'react';
import { RoomWizardAnswers } from '../../../utils/types';
import WizardToggleOption from '../common/WizardToggleOption';
import { toggleFeature } from '../../../utils/utils';
import { PROJECTOR_LENS_TYPES } from '../../../data/wizardOptions';

interface DisplayConfigProps {
    answers: RoomWizardAnswers;
    updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
    isProjector: boolean;
}

const DisplayConfig: React.FC<DisplayConfigProps> = ({ answers, updateAnswers, isProjector }) => {
    
    const [localSize, setLocalSize] = useState(answers.displaySize || 75);
    
    useEffect(() => {
        setLocalSize(answers.displaySize || 75);
    }, [answers.displaySize]);


    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSize(Number(e.target.value));
    };

    const handleSizeBlur = () => {
        updateAnswers({ displaySize: localSize });
    };

    const handleInteractivityToggle = (checked: boolean) => {
        const newFeatures = toggleFeature(answers.features, 'Interactive Display', checked);
        updateAnswers({ features: newFeatures });
    };
    
    // In a simplified model, this top-level setting can guide the AI
    // without needing to manage complex IOPoint states in the UI.
    const handleLensTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const projectorOutputs = answers.ioRequirements.filter(p => p.type === 'output' && p.deviceType === 'Projector');
        if (projectorOutputs.length > 0) {
            const updatedIO = answers.ioRequirements.map(p => {
                if (p.deviceType === 'Projector') {
                    return { ...p, projectorLensType: e.target.value as any };
                }
                return p;
            });
            updateAnswers({ ioRequirements: updatedIO });
        } else {
             updateAnswers({ technicalDetails: {...answers.technicalDetails, projectorLensType: e.target.value as any }})
        }
    };
    
    // Try to get from IO requirements first, then fallback to a potential temp property on technicalDetails
    const projectorLensType = (answers.ioRequirements.find(p => p.type === 'output' && p.deviceType === 'Projector')?.projectorLensType || (answers.technicalDetails as any).projectorLensType) || 'standard';

    const sizeLabel = isProjector ? 'Screen Diagonal (in)' : 'Display Size (in)';

    return (
        <div className="space-y-6 mt-6 p-4 border-t border-border-color">
             <h3 className="text-xl font-bold">Display Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="display-size" className="block text-sm font-medium text-text-secondary">{sizeLabel}</label>
                    <input
                        type="number"
                        id="display-size"
                        value={localSize}
                        onChange={handleSizeChange}
                        onBlur={handleSizeBlur}
                        className="w-full p-2 border rounded-md bg-input-bg mt-1"
                    />
                </div>
                {isProjector && (
                    <div>
                        <label htmlFor="projector-lens" className="block text-sm font-medium text-text-secondary">Projector Lens Type</label>
                        <select
                          id="projector-lens"
                          value={projectorLensType}
                          onChange={handleLensTypeChange}
                          className="w-full p-2 border rounded-md bg-input-bg mt-1"
                        >
                          {PROJECTOR_LENS_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                )}
            </div>
            {!isProjector && answers.features.some(f => f.name === 'Interactive Display') &&
                <WizardToggleOption
                    label="Enable Touch Interactivity"
                    description="The display will support touch input, for whiteboarding or interactive presentations."
                    checked={answers.features.some(f => f.name === 'Interactive Display')}
                    onChange={handleInteractivityToggle}
                />
            }
        </div>
    );
};

export default DisplayConfig;