
import React from 'react';
import { RoomWizardAnswers, Feature } from '../../utils/types';
import { COMMON_FEATURES } from '../../data/wizardOptions';
import FeatureCard from './FeatureCard';

interface StepFeaturesProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
  errors: Record<string, string>;
}

const StepFeatures: React.FC<StepFeaturesProps> = ({ answers, updateAnswers }) => {

  const handleFeatureToggle = (featureName: string, priority: 'must-have' | 'nice-to-have') => {
    const { features } = answers;
    const existing = features.find(f => f.name === featureName);
    let newFeatures: Feature[];

    if (existing && existing.priority === priority) {
        newFeatures = features.filter(f => f.name !== featureName);
    } else {
        const otherFeatures = features.filter(f => f.name !== featureName);
        newFeatures = [...otherFeatures, { name: featureName, priority }];
    }
    updateAnswers({ features: newFeatures });
  };
  
  const getInfoContent = (featureName: string) => {
      if (featureName === 'Wireless Presentation') {
          return (
              <div className="text-xs space-y-2 min-w-[280px]">
                  <p className="font-bold border-b border-border-color pb-1 mb-1">WyreStorm Dongle Guide:</p>
                  <ul className="list-disc pl-4 space-y-2">
                      <li>
                          <strong>APO-DG1:</strong> Video/Audio Casting ONLY. 
                          <br/><span className="text-[10px] text-text-secondary opacity-90">Compatible with SW-220-TX-W, APO-210-UC. Does not support USB peripherals.</span>
                      </li>
                      <li>
                          <strong>APO-DG2:</strong> Full BYOM (Video + USB Peripherals). 
                          <br/><span className="text-[10px] text-text-secondary opacity-90">REQUIRED for wireless conferencing (using room cam/mic). ONLY compatible with -W SKUs (e.g., SW-640L-TX-W).</span>
                      </li>
                  </ul>
              </div>
          );
      }
      return undefined;
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Select Key Features</h2>
      <p className="text-text-secondary mb-6">Specify if a feature is essential or just nice to have.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMMON_FEATURES.map(feature => (
          <FeatureCard
            key={feature.name}
            name={feature.name}
            description={feature.description}
            selectedFeature={answers.features.find(f => f.name === feature.name)}
            onToggle={handleFeatureToggle}
            infoContent={getInfoContent(feature.name)}
          />
        ))}
      </div>
    </div>
  );
};

export default StepFeatures;
