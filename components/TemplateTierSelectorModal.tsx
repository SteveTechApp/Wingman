import React from 'react';
import { UserTemplate, DesignTier } from '../utils/types';
import InfoModal from './InfoModal';
import TierIcon from './TierIcon';

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptName: string;
  templates: UserTemplate[];
  onStartProject: (template: UserTemplate) => void;
}

const TierColumn: React.FC<{ template: UserTemplate; onSelect: (template: UserTemplate) => void; }> = ({ template, onSelect }) => {
    return (
        <div className="flex flex-col bg-background p-4 rounded-lg border border-border-color h-full">
            <div className="flex items-center gap-2 mb-2">
                <TierIcon tier={template.roomData.designTier} className="h-6 w-6" />
                <h3 className="text-xl font-bold">{template.roomData.designTier}</h3>
            </div>
            <p className="text-xs text-text-secondary italic mb-4 h-24 overflow-y-auto">{template.description}</p>
            
            <div className="flex-grow border-t border-border-color pt-2 overflow-y-auto">
                <h4 className="font-bold text-sm mb-2">Key Equipment</h4>
                <ul className="space-y-1 text-sm text-text-secondary">
                    {template.roomData.manuallyAddedEquipment.length > 0 ? (
                        <>
                            {template.roomData.manuallyAddedEquipment.slice(0, 4).map(item => (
                                <li key={item.sku} className="text-xs truncate" title={item.name}>
                                    {item.quantity}x {item.name}
                                </li>
                            ))}
                            {template.roomData.manuallyAddedEquipment.length > 4 && <li className="text-xs">...and more</li>}
                        </>
                    ) : (
                        <li className="text-xs italic">No specific equipment defined.</li>
                    )}
                </ul>
            </div>
            <div className="mt-auto pt-4">
                <button onClick={() => onSelect(template)} className="w-full btn btn-primary">
                    Start with {template.roomData.designTier}
                </button>
            </div>
        </div>
    );
};

const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({ isOpen, onClose, conceptName, templates, onStartProject }) => {
  if (!isOpen) return null;
  
  const tiers: DesignTier[] = ['Bronze', 'Silver', 'Gold'];
  
  // Create a map to easily find the template for each tier
  const templateMap = new Map<DesignTier, UserTemplate>();
  templates.forEach(t => templateMap.set(t.roomData.designTier, t));

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-6xl" title={`Design Options for "${conceptName}"`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map(tier => {
              const template = templateMap.get(tier);
              return template ? (
                  <TierColumn key={tier} template={template} onSelect={onStartProject} />
              ) : (
                  <div key={tier} className="flex flex-col bg-background p-4 rounded-lg border border-border-color h-full opacity-50">
                      <div className="flex items-center gap-2 mb-2">
                          <TierIcon tier={tier} className="h-6 w-6" />
                          <h3 className="text-xl font-bold">{tier}</h3>
                      </div>
                       <div className="flex-grow flex items-center justify-center">
                          <p className="text-sm text-text-secondary">Not Available</p>
                       </div>
                  </div>
              )
          })}
      </div>
    </InfoModal>
  );
};

export default TemplateDetailModal;