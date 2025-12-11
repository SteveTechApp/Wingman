import React from 'react';
import { RoomWizardAnswers } from '../../utils/types';
import { SWITCH_FEATURES } from '../../data/wizardOptions';
import { toggleArrayItem } from '../../utils/utils';
import WizardToggleOption from './common/WizardToggleOption';
import { WarningIcon } from '../Icons';

interface StepAVoIPNetworkProps {
  answers: RoomWizardAnswers;
  updateAnswers: (newAnswers: Partial<RoomWizardAnswers>) => void;
}

const StepAVoIPNetwork: React.FC<StepAVoIPNetworkProps> = ({ answers, updateAnswers }) => {
  const isAvoipSelected = answers.technicalDetails.avoipSystem && answers.technicalDetails.avoipSystem !== 'None';
  const networkDetails = answers.technicalDetails.avoipNetworkDetails || { useDedicatedNetwork: true, poeAvailable: true, switchFeatures: [] };

  const isUnsuitableNetwork = !networkDetails.useDedicatedNetwork && !networkDetails.poeAvailable && !networkDetails.switchFeatures.includes('igmp_snooping');

  const handleToggle = (name: 'useDedicatedNetwork' | 'poeAvailable') => (isChecked: boolean) => {
    updateAnswers({
      technicalDetails: {
        ...answers.technicalDetails,
        avoipNetworkDetails: { ...networkDetails, [name]: isChecked },
      },
    });
  };
  
  const handleFeatureChange = (featureId: string) => {
    const newFeatures = toggleArrayItem(networkDetails.switchFeatures as string[], featureId);
    updateAnswers({
      technicalDetails: {
        ...answers.technicalDetails,
        avoipNetworkDetails: { ...networkDetails, switchFeatures: newFeatures as any },
      },
    });
  };

  if (!isAvoipSelected) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4 text-text-primary">AVoIP Network</h2>
        <p className="text-text-secondary">This step is only required if an AVoIP system is selected in the 'Technical Details' step.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-text-primary">AVoIP Network Details</h2>
      <p className="text-text-secondary mb-6">Specify details about the network that will support the AVoIP system.</p>
      
      {isUnsuitableNetwork && (
        <div className="p-4 mb-6 bg-destructive-bg border-l-4 border-destructive rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <WarningIcon className="h-5 w-5 text-destructive" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-destructive">Configuration Not Recommended</h3>
                    <p className="text-sm mt-1 text-text-secondary">
                        The current network configuration (shared network, no PoE, and no IGMP Snooping) is not suitable for a reliable AVoIP deployment. This will likely result in network instability and system failure. Please enable these features or use a dedicated AV network.
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WizardToggleOption
                label="Use Dedicated AV Network"
                description="The AVoIP system will run on its own physically separate network switches."
                checked={networkDetails.useDedicatedNetwork}
                onChange={handleToggle('useDedicatedNetwork')}
            />
            <WizardToggleOption
                label="PoE+ Available on Switch"
                description="The network switch can provide Power over Ethernet to the endpoints."
                checked={networkDetails.poeAvailable}
                onChange={handleToggle('poeAvailable')}
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Supported Network Switch Features</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SWITCH_FEATURES.map(feat => (
                    <div key={feat.id} className="flex items-center p-3 bg-background rounded-md border">
                        <input
                            type="checkbox"
                            id={`feature-${feat.id}`}
                            checked={networkDetails.switchFeatures.includes(feat.id as any)}
                            onChange={() => handleFeatureChange(feat.id)}
                            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                        />
                        <label htmlFor={`feature-${feat.id}`} className="ml-2 text-sm">{feat.label}</label>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default StepAVoIPNetwork;