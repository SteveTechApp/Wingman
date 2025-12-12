import React from 'react';
import { UserTemplate } from '../utils/types';
import { CloseIcon } from './Icons';

interface TemplateCardProps {
  template: UserTemplate;
  onSelect: (template: UserTemplate) => void;
  onDelete?: (templateId: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onDelete }) => {
  return (
    <div className="relative group">
      <button
        onClick={() => onSelect(template)}
        className="flex flex-col items-center text-center gap-2 p-2 rounded-lg transition-all duration-200 hover:bg-background border-2 border-transparent hover:border-accent hover:shadow-lg hover:-translate-y-1 w-full"
        aria-label={`Select template: ${template.templateName}`}
      >
        <div className="w-full aspect-video rounded-md overflow-hidden bg-background-secondary border border-border-color">
          <img 
              src={template.imageUrl} 
              alt={template.templateName} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        </div>
        <p className="font-semibold text-sm text-text-primary leading-tight px-1 h-10 flex items-center justify-center">
          {template.templateName}
        </p>
      </button>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to delete "${template.templateName}"? This cannot be undone.`)) {
              onDelete(template.templateId);
            }
          }}
          className="absolute top-1 right-1 z-10 p-1 bg-background rounded-full text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive-bg transition-all"
          aria-label={`Delete template ${template.templateName}`}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default TemplateCard;