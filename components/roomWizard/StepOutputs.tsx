import React, { useState, useEffect } from 'react';
import { RoomWizardAnswers } from '../../utils/types';
import { MAIN_DISPLAY_OPTIONS } from '../../data/wizardOptions';
import { toggleFeature } from '../../utils/utils';
import DisplayTypeCard from './outputs/DisplayTypeCard';
import DisplayConfig from './outputs/DisplayConfig';
import VideoWallConfigurator from './outputs/VideoWallConfigurator';

interface StepOutputsProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

const getSelectedType = (answers: RoomWizardAnswers): string => {
    if (answers.videoWallConfig) return 'video_wall';
    if (answers.displayType === 'projector') return 'projector';
    if (answers.displayType === 'dual_display') return 'dual_lfd';
    return 'single_lfd';
};

const StepOutputs: React.FC<StepOutputsProps> = ({ answers, updateAnswers }) => {
    const [selectedType, setSelectedType] = useState(() => getSelectedType(answers));

    useEffect(() => { setSelectedType(getSelectedType(answers)); }, [answers]);

    const handleSelectType = (typeId: string) => {
        const newAnswers: Partial<RoomWizardAnswers> = {
            videoWallConfig: typeId === 'video_wall' ? (answers.videoWallConfig || { type: 'lcd', layout: { rows: 2, cols: 2 }, technology: 'avoip', multiviewRequired: false }) : undefined,
            displayType: typeId.includes('projector') ? 'projector' : typeId.includes('dual') ? 'dual_display' : 'single',
            displayCount: typeId.includes('dual') ? 2 : 1,
            features: toggleFeature(answers.features, 'Interactive Display', typeId.includes('interactive')),
        };
        updateAnswers(newAnswers);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Main Display Configuration</h2>
            <p className="text-text-secondary mb-6">Select the primary display type for this room.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {MAIN_DISPLAY_OPTIONS.map(opt => (
                    <DisplayTypeCard key={opt.id} {...opt} onClick={() => handleSelectType(opt.id)} isSelected={selectedType === opt.id} />
                ))}
            </div>

            {selectedType !== 'video_wall' && <DisplayConfig answers={answers} updateAnswers={updateAnswers} isProjector={selectedType.includes('projector')} />}
            
            {selectedType === 'video_wall' && (
                 <div className="mt-6 pt-6 border-t border-border-color">
                    <VideoWallConfigurator answers={answers} updateAnswers={updateAnswers} />
                 </div>
            )}
        </div>
    );
};

export default StepOutputs;