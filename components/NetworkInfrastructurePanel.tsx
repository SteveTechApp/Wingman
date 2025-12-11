import React from 'react';
import { useProjectContext } from '../context/ProjectContext';
import InfoTooltip from './InfoTooltip';
import { ProjectInfrastructure } from '../utils/types';
import ToggleSwitch from './ui/ToggleSwitch';

const NetworkInfrastructurePanel: React.FC = () => {
    const { projectData, dispatchProjectAction } = useProjectContext();
    
    // FIX: The default infrastructure object was missing properties. Added defaults to match the ProjectInfrastructure type.
    const infrastructure = projectData?.infrastructure || {
        useDedicatedNetwork: false,
        enableTouchAppPreview: false,
        cablingByOthers: false,
        buildingType: 'single_floor',
        floorCount: 1,
        rackStrategy: 'in_room',
    };

    const handleChange = (name: keyof ProjectInfrastructure, checked: boolean) => {
        const newInfra: ProjectInfrastructure = { ...infrastructure, [name]: checked };
        dispatchProjectAction({ type: 'UPDATE_INFRASTRUCTURE', payload: newInfra });
    };
    
    const InfoIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-secondary cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <label htmlFor="useDedicatedNetwork" className="text-sm font-medium text-text-secondary">Use Dedicated AV Network</label>
                    <InfoTooltip text="Specifies if the AV system will be on its own isolated network switch, or on the client's main network."><InfoIcon /></InfoTooltip>
                </div>
                <ToggleSwitch
                    checked={infrastructure.useDedicatedNetwork}
                    onChange={(isChecked) => handleChange('useDedicatedNetwork', isChecked)}
                />
            </div>
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <label htmlFor="enableTouchAppPreview" className="text-sm font-medium text-text-secondary">Enable Touch App Preview</label>
                    <InfoTooltip text="Enables the WyreStorm Touch App preview feature for controlling NetworkHD systems from a tablet."><InfoIcon /></InfoTooltip>
                </div>
                <ToggleSwitch
                    checked={infrastructure.enableTouchAppPreview}
                    onChange={(isChecked) => handleChange('enableTouchAppPreview', isChecked)}
                />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <label htmlFor="cablingByOthers" className="text-sm font-medium text-text-secondary">Cabling by Others</label>
                     <InfoTooltip text="Indicates that the low-voltage cabling (e.g., Cat6) will be installed by a different contractor."><InfoIcon /></InfoTooltip>
                </div>
                <ToggleSwitch
                    checked={infrastructure.cablingByOthers}
                    onChange={(isChecked) => handleChange('cablingByOthers', isChecked)}
                />
            </div>
        </div>
    );
};

export default NetworkInfrastructurePanel;