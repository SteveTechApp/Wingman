
import React from 'react';
import { Feature } from '../../utils/types';
import { InformationCircleIcon } from '../Icons';
import InfoTooltip from '../InfoTooltip';

interface FeatureCardProps {
  name: string;
  description: string;
  selectedFeature?: Feature;
  onToggle: (featureName: string, priority: 'must-have' | 'nice-to-have') => void;
  infoContent?: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ name, description, selectedFeature, onToggle, infoContent }) => {
  const isNice = selectedFeature?.priority === 'nice-to-have';
  const isMust = selectedFeature?.priority === 'must-have';

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
        return '!bg-accent text-white font-bold border-accent shadow-md ring-1 ring-accent';
    }
    return 'bg-background-secondary hover:bg-border-color border-border-color';
  };

  return (
    <div className="p-4 border rounded-lg bg-background flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold">{name}</h3>
            {infoContent && (
                <InfoTooltip content={infoContent}>
                    <div className="cursor-help">
                        <InformationCircleIcon className="h-4 w-4 text-text-secondary hover:text-accent" />
                    </div>
                </InfoTooltip>
            )}
        </div>
        <p className="text-sm text-text-secondary mb-4 h-14">{description}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onToggle(name, 'nice-to-have')}
          style={{ backgroundColor: isNice ? 'var(--accent)' : undefined }}
          className={`flex-1 p-2 text-sm rounded-md transition-colors border ${getButtonClass(isNice)}`}
        >
          Nice-to-have
        </button>
        <button
          onClick={() => onToggle(name, 'must-have')}
          style={{ backgroundColor: isMust ? 'var(--accent)' : undefined }}
          className={`flex-1 p-2 text-sm rounded-md transition-all duration-200 border ${getButtonClass(isMust)}`}
        >
          Must-have
        </button>
      </div>
    </div>
  );
};

export default FeatureCard;
