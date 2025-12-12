import React from 'react';
import { UserTemplate } from '../../utils/types';
import TierIcon from '../TierIcon';

interface TemplateDetailPanelProps {
  template: UserTemplate | null;
  onStart: (template: UserTemplate) => void;
}

const TemplateDetailPanel: React.FC<TemplateDetailPanelProps> = ({ template, onStart }) => {
  if (!template) {
    return (
      <div className="bg-background-secondary p-8 rounded-lg border border-border-color h-full flex items-center justify-center">
        <p className="text-text-secondary">Select a template on the left to see details.</p>
      </div>
    );
  }

  const { roomData } = template;
  const mustHaveFeatures = roomData.features.filter(f => f.priority === 'must-have');

  return (
    <div className="bg-background-secondary p-6 rounded-lg border border-border-color h-full flex flex-col">
      <h2 className="text-2xl font-bold text-accent mb-2">{template.templateName}</h2>
      <p className="text-text-secondary mb-4">{template.description}</p>
      
      <div className="space-y-3 mb-6 text-sm">
        <div className="flex items-center gap-4">
            <span className="font-bold w-24">Room Type:</span>
            <span>{roomData.roomType}</span>
        </div>
        <div className="flex items-center gap-4">
            <span className="font-bold w-24">Design Tier:</span>
            <div className="flex items-center gap-2">
                <TierIcon tier={roomData.designTier} className="h-5 w-5" />
                <span>{roomData.designTier}</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <span className="font-bold w-24">Capacity:</span>
            <span>{roomData.maxParticipants} people</span>
        </div>
      </div>

      {mustHaveFeatures.length > 0 && (
        <div className="mb-6">
          <h4 className="font-bold mb-2">Must-Have Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
            {mustHaveFeatures.map(f => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-border-color">
          <button onClick={() => onStart(template)} className="w-full btn btn-primary">
              Start Project with this Template
          </button>
      </div>
    </div>
  );
};

export default TemplateDetailPanel;