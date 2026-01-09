import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import toast from 'react-hot-toast';

interface DiscoveryData {
    // Step 1: Client Info
    clientName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    // Step 2: Project Scope
    projectType: string;
    numberOfRooms: number;
    timeline: string;
    budget: string;
    // Step 3: Requirements
    primaryUseCase: string;
    mustHaveFeatures: string[];
    niceToHaveFeatures: string[];
    existingEquipment: string;
    // Step 4: Technical
    networkInfrastructure: string;
    itInvolvement: string;
    supportRequirements: string;
}

const DEFAULT_DATA: DiscoveryData = {
    clientName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    projectType: '',
    numberOfRooms: 1,
    timeline: '',
    budget: '',
    primaryUseCase: '',
    mustHaveFeatures: [],
    niceToHaveFeatures: [],
    existingEquipment: '',
    networkInfrastructure: '',
    itInvolvement: '',
    supportRequirements: ''
};

const PROJECT_TYPES = [
    'New Construction',
    'Renovation / Refresh',
    'Technology Upgrade',
    'Expansion',
    'Standards Development'
];

const TIMELINE_OPTIONS = [
    'Immediate (< 1 month)',
    'Short-term (1-3 months)',
    'Medium-term (3-6 months)',
    'Long-term (6+ months)',
    'Planning Phase Only'
];

const BUDGET_RANGES = [
    'Under $10,000',
    '$10,000 - $25,000',
    '$25,000 - $50,000',
    '$50,000 - $100,000',
    '$100,000 - $250,000',
    'Over $250,000',
    'To Be Determined'
];

const USE_CASES = [
    'Video Conferencing / Collaboration',
    'Presentations / Content Sharing',
    'Training / Education',
    'Digital Signage',
    'Control Room / NOC',
    'Broadcast / Production',
    'Hybrid Meeting Spaces'
];

const FEATURE_OPTIONS = [
    'Video Conferencing',
    'Wireless Presentation',
    'USB-C Connectivity',
    'Room Scheduling',
    'Audio Conferencing',
    'Recording / Streaming',
    'Interactive Displays',
    'Digital Whiteboarding',
    'Multi-Display Support',
    'Video Walls',
    'Voice Lift / Audio Enhancement',
    'Room Control System',
    'Occupancy Sensing',
    'Environmental Controls'
];

const CustomerDiscoveryWizard: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useLocalStorage<DiscoveryData>('wingman_discovery_draft', DEFAULT_DATA);

    const updateData = (updates: Partial<DiscoveryData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const toggleFeature = (feature: string, type: 'mustHave' | 'niceToHave') => {
        const key = type === 'mustHave' ? 'mustHaveFeatures' : 'niceToHaveFeatures';
        const current = data[key];
        if (current.includes(feature)) {
            updateData({ [key]: current.filter(f => f !== feature) });
        } else {
            updateData({ [key]: [...current, feature] });
        }
    };

    const STEPS = [
        { label: 'Client Info', short: 'Client' },
        { label: 'Project Scope', short: 'Scope' },
        { label: 'Requirements', short: 'Needs' },
        { label: 'Technical', short: 'Tech' }
    ];

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const handleComplete = () => {
        toast.success('Discovery questionnaire completed! You can now create a project based on this data.');
        navigate('/setup');
    };

    const ACCENT_COLOR = '#00833D';

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="space-y-6">
                        {/* Client Information */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="client-name" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Client / Company Name
                            </label>
                            <input
                                id="client-name"
                                type="text"
                                value={data.clientName}
                                onChange={(e) => updateData({ clientName: e.target.value })}
                                placeholder="e.g. Acme Corporation"
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>

                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="contact-name" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Primary Contact Name
                            </label>
                            <input
                                id="contact-name"
                                type="text"
                                value={data.contactName}
                                onChange={(e) => updateData({ contactName: e.target.value })}
                                placeholder="e.g. John Smith"
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-border-color rounded-lg p-4 bg-background">
                                <label htmlFor="contact-email" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                    Email Address
                                </label>
                                <input
                                    id="contact-email"
                                    type="email"
                                    value={data.contactEmail}
                                    onChange={(e) => updateData({ contactEmail: e.target.value })}
                                    placeholder="email@company.com"
                                    className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="border border-border-color rounded-lg p-4 bg-background">
                                <label htmlFor="contact-phone" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                    Phone Number
                                </label>
                                <input
                                    id="contact-phone"
                                    type="tel"
                                    value={data.contactPhone}
                                    onChange={(e) => updateData({ contactPhone: e.target.value })}
                                    placeholder="+1 (555) 123-4567"
                                    className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="space-y-6">
                        {/* Project Type */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="project-type" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Project Type
                            </label>
                            <select
                                id="project-type"
                                value={data.projectType}
                                onChange={(e) => updateData({ projectType: e.target.value })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="">Select project type...</option>
                                {PROJECT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Number of Rooms */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="num-rooms" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Number of Rooms / Spaces
                            </label>
                            <input
                                id="num-rooms"
                                type="number"
                                min="1"
                                value={data.numberOfRooms}
                                onChange={(e) => updateData({ numberOfRooms: parseInt(e.target.value) || 1 })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Timeline */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="timeline" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Project Timeline
                            </label>
                            <select
                                id="timeline"
                                value={data.timeline}
                                onChange={(e) => updateData({ timeline: e.target.value })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="">Select timeline...</option>
                                {TIMELINE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        {/* Budget */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="budget" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Budget Range
                            </label>
                            <select
                                id="budget"
                                value={data.budget}
                                onChange={(e) => updateData({ budget: e.target.value })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="">Select budget range...</option>
                                {BUDGET_RANGES.map(range => (
                                    <option key={range} value={range}>{range}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        {/* Primary Use Case */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="use-case" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Primary Use Case
                            </label>
                            <select
                                id="use-case"
                                value={data.primaryUseCase}
                                onChange={(e) => updateData({ primaryUseCase: e.target.value })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="">Select primary use case...</option>
                                {USE_CASES.map(uc => (
                                    <option key={uc} value={uc}>{uc}</option>
                                ))}
                            </select>
                        </div>

                        {/* Must-Have Features */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label className="block text-xs font-bold mb-3 text-text-secondary uppercase tracking-wide">
                                Must-Have Features
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {FEATURE_OPTIONS.map(feature => (
                                    <button
                                        key={feature}
                                        type="button"
                                        onClick={() => toggleFeature(feature, 'mustHave')}
                                        className={`p-2 text-left text-sm rounded-lg border transition-all ${
                                            data.mustHaveFeatures.includes(feature)
                                                ? 'bg-accent text-white border-accent'
                                                : 'bg-white border-border-color hover:border-accent'
                                        }`}
                                    >
                                        {feature}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Nice-to-Have Features */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label className="block text-xs font-bold mb-3 text-text-secondary uppercase tracking-wide">
                                Nice-to-Have Features
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {FEATURE_OPTIONS.filter(f => !data.mustHaveFeatures.includes(f)).map(feature => (
                                    <button
                                        key={feature}
                                        type="button"
                                        onClick={() => toggleFeature(feature, 'niceToHave')}
                                        className={`p-2 text-left text-sm rounded-lg border transition-all ${
                                            data.niceToHaveFeatures.includes(feature)
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-white border-border-color hover:border-blue-400'
                                        }`}
                                    >
                                        {feature}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Existing Equipment */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="existing-equipment" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Existing Equipment / Infrastructure
                            </label>
                            <textarea
                                id="existing-equipment"
                                value={data.existingEquipment}
                                onChange={(e) => updateData({ existingEquipment: e.target.value })}
                                placeholder="Describe any existing AV equipment, displays, control systems, etc."
                                rows={3}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-none"
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        {/* Network Infrastructure */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="network-infra" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Network Infrastructure
                            </label>
                            <select
                                id="network-infra"
                                value={data.networkInfrastructure}
                                onChange={(e) => updateData({ networkInfrastructure: e.target.value })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="">Select network type...</option>
                                <option value="Dedicated AV VLAN">Dedicated AV VLAN</option>
                                <option value="Shared Corporate Network">Shared Corporate Network</option>
                                <option value="Isolated AV Network">Isolated AV Network</option>
                                <option value="To Be Determined">To Be Determined</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </div>

                        {/* IT Involvement */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="it-involvement" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                IT Department Involvement
                            </label>
                            <select
                                id="it-involvement"
                                value={data.itInvolvement}
                                onChange={(e) => updateData({ itInvolvement: e.target.value })}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                                <option value="">Select IT involvement...</option>
                                <option value="Heavy - IT leads all decisions">Heavy - IT leads all decisions</option>
                                <option value="Moderate - IT approval required">Moderate - IT approval required</option>
                                <option value="Light - IT consulted as needed">Light - IT consulted as needed</option>
                                <option value="None - Facilities manages AV">None - Facilities manages AV</option>
                            </select>
                        </div>

                        {/* Support Requirements */}
                        <div className="border border-border-color rounded-lg p-4 bg-background">
                            <label htmlFor="support-reqs" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Support Requirements
                            </label>
                            <textarea
                                id="support-reqs"
                                value={data.supportRequirements}
                                onChange={(e) => updateData({ supportRequirements: e.target.value })}
                                placeholder="Describe any specific support, training, or maintenance requirements..."
                                rows={3}
                                className="w-full p-3 border border-border-color rounded-lg bg-input-bg focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-none"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full animate-fade-in-fast">
                {/* Page Header */}
                <div className="text-center mb-6 flex-shrink-0">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">
                        Customer Discovery
                    </h1>
                    <p className="text-lg text-text-secondary">
                        Gather client requirements to build the perfect solution.
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="mb-6 px-4 flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        {STEPS.map((step, index) => {
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;
                            const isUpcoming = index > currentStep;

                            return (
                                <React.Fragment key={index}>
                                    <div className="flex flex-col items-center relative z-10">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                                            ${isCompleted ? 'text-white' : isCurrent ? 'text-white' : 'bg-white border-gray-300 text-gray-400'}
                                            ${isCurrent ? 'scale-110 ring-2 ring-offset-2 ring-[#00833D]' : ''}
                                            `}
                                            style={{
                                                backgroundColor: isCompleted || isCurrent ? ACCENT_COLOR : undefined,
                                                borderColor: isCompleted || isCurrent ? ACCENT_COLOR : undefined
                                            }}
                                        >
                                            {isCompleted ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <span>{index + 1}</span>
                                            )}
                                        </div>
                                        <span
                                            className={`text-[10px] font-medium mt-2 whitespace-nowrap transition-colors duration-300
                                            ${isCurrent ? 'font-bold' : ''}
                                            ${isUpcoming ? 'text-gray-400' : ''}
                                            `}
                                            style={{ color: isCompleted || isCurrent ? ACCENT_COLOR : undefined }}
                                        >
                                            {step.label}
                                        </span>
                                    </div>

                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`flex-grow h-1 mx-2 rounded transition-all duration-500
                                            ${isUpcoming ? 'bg-gray-200' : ''}`}
                                            style={{ backgroundColor: !isUpcoming ? ACCENT_COLOR : undefined }}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Main Form Container */}
                <div className="flex-grow bg-background-secondary border-2 border-border-color rounded-xl shadow-xl overflow-hidden flex flex-col min-h-0">
                    {/* Current Process Header */}
                    <div className="bg-accent text-white px-4 py-3 flex-shrink-0">
                        <h2 className="text-lg font-bold uppercase tracking-wide">
                            Current Process: {STEPS[currentStep].label}
                        </h2>
                    </div>

                    {/* Step Content */}
                    <div className="flex-grow overflow-y-auto p-6">
                        {renderStep()}
                    </div>

                    {/* Navigation Footer */}
                    <div className="px-4 py-3 border-t border-border-color bg-background-secondary flex justify-between items-center flex-shrink-0">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="btn btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            &larr; Back
                        </button>
                        {currentStep < STEPS.length - 1 ? (
                            <button
                                onClick={nextStep}
                                className="btn btn-primary px-6 py-2 font-bold shadow-lg hover:shadow-xl"
                            >
                                Next &rarr;
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                className="btn btn-primary px-6 py-2 font-bold shadow-lg hover:shadow-xl"
                            >
                                Complete Discovery
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDiscoveryWizard;
