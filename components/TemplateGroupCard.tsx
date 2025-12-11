import React from 'react';
import { UserTemplate } from '../utils/types';
import { VERTICAL_MARKETS } from '../data/constants';
import TemplateCard from './TemplateCard';

interface TemplateGroupCardProps {
  verticalId: string;
  templates: UserTemplate[];
  onTemplateSelect: (template: UserTemplate) => void;
}

const TemplateGroupCard: React.FC<TemplateGroupCardProps> = ({ verticalId, templates, onTemplateSelect }) => {
  const verticalInfo = VERTICAL_MARKETS.find(v => v.verticalId === verticalId);

  if (!verticalInfo || templates.length === 0) return null;
  
  const Icon = verticalInfo.icon;

  return (
    <div className="bg-background border border-border-color rounded-lg overflow-hidden flex flex-col">
      <div className="relative group">
                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-lg p-8 flex items-center justify-center">
                  <div className="w-16 h-16 text-white/30">●</div>
                </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gradient-from-black-80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-white" />
            <h3 className="font-bold text-lg text-white drop-shadow-md">{verticalInfo.name}</h3>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2 flex-grow">
        {templates.map(template => (
          <TemplateCard 
            key={template.templateId} 
            template={template} 
            onSelect={onTemplateSelect} 
          />
        ))}
      </div>
    </div>
  );
};

export default TemplateGroupCard;