
import React from 'react';
import { BuildingIcon } from '../../Icons';
import { ProjectInfrastructure } from '../../../utils/types';

interface Props {
    details: { projectName: string; clientName: string };
    infrastructure: Partial<ProjectInfrastructure>;
    setDetails: (d: { projectName: string; clientName: string }) => void;
    setInfrastructure: (i: Partial<ProjectInfrastructure>) => void;
    onNext: () => void;
    onSave: () => void;
}

const ProjectContextStep: React.FC<Props> = ({ details, setDetails, infrastructure, setInfrastructure, onNext, onSave }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (details.projectName.trim() && details.clientName.trim()) {
            onNext();
        }
    };

    const handleInfraChange = (key: keyof ProjectInfrastructure, value: any) => {
        setInfrastructure({ ...infrastructure, [key]: value });
    };

    // Using hex code for absolute certainty on visibility
    const ACCENT_COLOR = '#00833D'; 

    const getSelectionStyle = (isSelected: boolean) => {
        return isSelected ? {
            backgroundColor: ACCENT_COLOR,
            color: 'white',
            borderColor: ACCENT_COLOR
        } : {};
    };

    const unselectedClass = "bg-white text-text-primary border-border-color hover:bg-gray-50 hover:border-gray-300";
    const selectedClass = "shadow-md ring-1 ring-[#00833D] border-[#00833D]";

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-grow overflow-y-auto p-4 md:p-6 min-h-0">
                <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
                    <h1 className="text-2xl font-extrabold text-text-primary mb-2 text-center">Project Context</h1>
                    <p className="text-text-secondary mb-6 text-center text-sm">Define the client and the physical environment.</p>
                    
                    <form id="context-form" onSubmit={handleSubmit} className="w-full space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Project Name</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
                                    placeholder="e.g. HQ Boardroom Upgrade"
                                    value={details.projectName}
                                    onChange={e => setDetails({...details, projectName: e.target.value})}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Client Name</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
                                    placeholder="e.g. Acme Corp"
                                    value={details.clientName}
                                    onChange={e => setDetails({...details, clientName: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Infrastructure Context */}
                        <div className="bg-background-secondary p-4 rounded-xl border border-border-color">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <BuildingIcon className="h-4 w-4 text-accent" />
                                Venue Infrastructure
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Building Layout */}
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-text-secondary">Building Layout</label>
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => handleInfraChange('buildingType', 'single_floor')}
                                            style={getSelectionStyle(infrastructure.buildingType === 'single_floor')}
                                            className={`w-full p-3 text-left text-sm border rounded-lg transition-all duration-200 ${infrastructure.buildingType === 'single_floor' ? selectedClass : unselectedClass}`}
                                        >
                                            <div className="font-bold">Single Floor</div>
                                            <div className={`text-xs ${infrastructure.buildingType === 'single_floor' ? 'text-white opacity-90' : 'text-text-secondary'}`}>Everything on one level</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInfraChange('buildingType', 'multi_floor')}
                                            style={getSelectionStyle(infrastructure.buildingType === 'multi_floor')}
                                            className={`w-full p-3 text-left text-sm border rounded-lg transition-all duration-200 ${infrastructure.buildingType === 'multi_floor' ? selectedClass : unselectedClass}`}
                                        >
                                            <div className="font-bold">Multi-Floor / Campus</div>
                                            <div className={`text-xs ${infrastructure.buildingType === 'multi_floor' ? 'text-white opacity-90' : 'text-text-secondary'}`}>Vertical risers required</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Rack Strategy - Hybrid Support */}
                                <div>
                                    <label className="block text-xs font-bold mb-2 text-text-secondary">
                                        Equipment Location
                                        <span className="ml-2 text-accent font-normal">(Select one or both)</span>
                                    </label>
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newHasLocal = !infrastructure.hasLocalRacks;
                                                const newHasCentral = infrastructure.hasCentralizedInfrastructure;

                                                // Determine rack strategy
                                                let newStrategy: ProjectInfrastructure['rackStrategy'];
                                                if (newHasLocal && newHasCentral) {
                                                    newStrategy = 'hybrid';
                                                } else if (newHasLocal) {
                                                    newStrategy = 'in_room';
                                                } else if (newHasCentral) {
                                                    newStrategy = 'central_server_room';
                                                } else {
                                                    newStrategy = 'in_room'; // Default to something
                                                }

                                                setInfrastructure({
                                                    ...infrastructure,
                                                    hasLocalRacks: newHasLocal,
                                                    rackStrategy: newStrategy
                                                });
                                            }}
                                            style={getSelectionStyle(infrastructure.hasLocalRacks === true)}
                                            className={`w-full p-3 text-left text-sm border rounded-lg transition-all duration-200 flex items-start gap-3 ${infrastructure.hasLocalRacks ? selectedClass : unselectedClass}`}
                                        >
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${infrastructure.hasLocalRacks ? 'bg-white border-white' : 'border-gray-400'}`}>
                                                    {infrastructure.hasLocalRacks && (
                                                        <svg className="w-4 h-4" style={{color: ACCENT_COLOR}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold">Local / In-Room Rack</div>
                                                <div className={`text-xs ${infrastructure.hasLocalRacks ? 'text-white opacity-90' : 'text-text-secondary'}`}>Credenza, lectern, or under-desk equipment</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newHasLocal = infrastructure.hasLocalRacks;
                                                const newHasCentral = !infrastructure.hasCentralizedInfrastructure;

                                                // Determine rack strategy
                                                let newStrategy: ProjectInfrastructure['rackStrategy'];
                                                if (newHasLocal && newHasCentral) {
                                                    newStrategy = 'hybrid';
                                                } else if (newHasLocal) {
                                                    newStrategy = 'in_room';
                                                } else if (newHasCentral) {
                                                    newStrategy = 'central_server_room';
                                                } else {
                                                    newStrategy = 'in_room'; // Default to something
                                                }

                                                setInfrastructure({
                                                    ...infrastructure,
                                                    hasCentralizedInfrastructure: newHasCentral,
                                                    rackStrategy: newStrategy
                                                });
                                            }}
                                            style={getSelectionStyle(infrastructure.hasCentralizedInfrastructure === true)}
                                            className={`w-full p-3 text-left text-sm border rounded-lg transition-all duration-200 flex items-start gap-3 ${infrastructure.hasCentralizedInfrastructure ? selectedClass : unselectedClass}`}
                                        >
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${infrastructure.hasCentralizedInfrastructure ? 'bg-white border-white' : 'border-gray-400'}`}>
                                                    {infrastructure.hasCentralizedInfrastructure && (
                                                        <svg className="w-4 h-4" style={{color: ACCENT_COLOR}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold">Centralized Infrastructure</div>
                                                <div className={`text-xs ${infrastructure.hasCentralizedInfrastructure ? 'text-white opacity-90' : 'text-text-secondary'}`}>Server room or equipment closets (AVoIP/Fiber)</div>
                                            </div>
                                        </button>

                                        {/* Show hybrid indicator when both are selected */}
                                        {infrastructure.hasLocalRacks && infrastructure.hasCentralizedInfrastructure && (
                                            <div className="mt-2 p-2 bg-accent-bg-subtle border border-accent rounded-lg">
                                                <p className="text-xs text-accent font-semibold">
                                                    ✓ Hybrid Configuration: Using both local and centralized equipment
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="p-4 border-t border-border-color bg-background-secondary flex justify-between items-center flex-shrink-0">
                <div className="flex-1">
                    {/* Spacer */}
                </div>
                <button onClick={onSave} className="text-xs font-medium text-accent hover:underline mr-4">
                    Save Progress
                </button>
                <button type="submit" form="context-form" className="btn btn-primary px-6 py-2 text-base font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                    Next: Select Room Type &rarr;
                </button>
            </div>
        </div>
    );
};

export default ProjectContextStep;
