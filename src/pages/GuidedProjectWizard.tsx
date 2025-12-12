
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerationContext } from '../context/GenerationContext';
import { RoomData, DesignTier, IOPoint, ProjectInfrastructure, AudioSystemDetails } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';
import ProjectContextStep from '../components/guidedWizard/steps/ProjectContextStep';
import RoomTypeStep from '../components/guidedWizard/steps/RoomTypeStep';
import NeedsAssessmentStep from '../components/guidedWizard/steps/NeedsAssessmentStep';
import TierSelectionStep from '../components/guidedWizard/steps/TierSelectionStep';
import { generateTieredDesigns } from '../services/roomDesignerService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProjectContext } from '../context/ProjectContext';
import { useUserContext } from '../context/UserContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import LoginModal from '../components/LoginModal';
import toast from 'react-hot-toast';
import { VERTICAL_MARKETS } from '../data/constants';

// Define the shape of the persistent wizard state
interface WizardDraftState {
    currentStep: number;
    projectDetails: { projectName: string; clientName: string };
    infrastructure: Partial<ProjectInfrastructure>;
    roomType: string;
    vertical: string;
    displayGroups: DisplayGroup[];
    inputs: WizardInput[];
    audioDetails: AudioSystemDetails;
    dimensions: { length: number; width: number; height: number };
    capacity: number;
    needs: {
        videoConferencing: boolean;
        wirelessPresentation: boolean;
        interactive: boolean;
        voiceLift: boolean;
        roomPc: boolean;
    };
}

// Dummy interfaces for types that are no longer directly used by UI but kept in state for the AI
interface DisplayGroup { id: string; name: string; type: string; quantity: number; transport: string; videoWallConfig?: any; }
interface WizardInput { id: string; deviceType: string; interfaceType: string; transport: string; location: string; distance: number; quantity: number; }


const DEFAULT_WIZARD_STATE: WizardDraftState = {
    currentStep: 0,
    projectDetails: { projectName: 'New Project', clientName: 'New Client' },
    infrastructure: {
        buildingType: 'single_floor',
        rackStrategy: 'in_room',
        floorCount: 1,
        useDedicatedNetwork: false,
        enableTouchAppPreview: false,
        cablingByOthers: false
    },
    roomType: 'Conference Room',
    vertical: 'corp',
    displayGroups: [
        { id: 'main-display', name: 'Main Display', type: 'flat_panel', quantity: 1, transport: 'Direct / Copper', videoWallConfig: undefined }
    ],
    inputs: [
        { id: 'default-1', deviceType: 'Laptop', interfaceType: 'HDMI', transport: 'HDBaseT Class B (Standard)', location: 'Table Top', distance: 2, quantity: 1 }
    ],
    audioDetails: {
        speakerLayout: 'none',
        systemType: 'low_impedance',
        useCases: [],
        microphoneType: 'none',
        ucCompatibility: false,
        zones: []
    },
    dimensions: { length: 6, width: 4, height: 3 },
    capacity: 6,
    needs: {
        videoConferencing: true,
        wirelessPresentation: false,
        interactive: false,
        voiceLift: false,
        roomPc: false,
    }
};

const GuidedProjectWizard: React.FC = () => {
    const navigate = useNavigate();
    const { dispatchProjectAction } = useProjectContext();
    const { isAuthenticated } = useUserContext();
    const projectState = useProjectContext().getState().projectData;
    const productDatabase = projectState?.productDatabase || []; 
    
    const [wizardState, setWizardState] = useLocalStorage<WizardDraftState>('wingman_wizard_draft_v2', DEFAULT_WIZARD_STATE);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    
    const [generatedOptions, setGeneratedOptions] = useState<Record<DesignTier, RoomData> | null>(null);

    const updateState = (updates: Partial<WizardDraftState>) => {
        setWizardState(prev => ({ ...prev, ...updates }));
    };

    // LOGIC: Automatically enable Interactive capability if Interactive Display is selected
    // Also sync Audio Use Cases with Needs in a single effect to avoid circular dependencies
    useEffect(() => {
        const updates: Partial<WizardState> = {};

        // Check for interactive display
        const hasInteractiveDisplay = wizardState.displayGroups.some(g => g.type === 'interactive_lfd');
        if (hasInteractiveDisplay && !wizardState.needs.interactive) {
            updates.needs = { ...wizardState.needs, interactive: true };
        }

        // Sync audio use cases with needs
        const newCases = new Set(wizardState.audioDetails.useCases);
        if (wizardState.needs.videoConferencing) newCases.add('video_conferencing');
        else newCases.delete('video_conferencing');

        if (wizardState.needs.voiceLift) newCases.add('speech_reinforcement');
        else newCases.delete('speech_reinforcement');

        if (Array.from(newCases).sort().join() !== [...wizardState.audioDetails.useCases].sort().join()) {
            updates.audioDetails = { ...wizardState.audioDetails, useCases: Array.from(newCases) as any };
        }

        // Only update if there are actual changes
        if (Object.keys(updates).length > 0) {
            updateState(updates);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wizardState.displayGroups, wizardState.needs.videoConferencing, wizardState.needs.voiceLift]);


    const getVerticalName = () => VERTICAL_MARKETS.find(v => v.verticalId === wizardState.vertical)?.name || 'Corporate';

    const checkAuth = (action: () => void) => {
        if (isAuthenticated) {
            action();
        } else {
            setPendingAction(() => action);
            setIsLoginModalOpen(true);
        }
    };

    const handleLoginSuccess = () => {
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    const handleSaveProgress = () => {
        checkAuth(() => {
            toast.success("Progress saved! You can resume this wizard at any time.");
        });
    };

    const handleGenerateOptions = async () => {
        setIsLoading(true);
        try {
            const { displayGroups, inputs, dimensions, capacity, needs, audioDetails, roomType, infrastructure } = wizardState;

            let displayTypeString = 'single';
            let videoWallConfig = undefined;
            let totalDisplayCount = 0;
            let inferredDisplaySize = 75;

            // Analyze Display Groups to determine main display type and count
            if (displayGroups.length > 0) {
                const mainGroup = displayGroups[0];
                totalDisplayCount = displayGroups.reduce((sum, g) => sum + g.quantity, 0);

                if (mainGroup.type === 'projector') {
                    displayTypeString = 'projector';
                    inferredDisplaySize = 120;
                } else if (mainGroup.type === 'lcd_wall') {
                    displayTypeString = 'lcd_video_wall';
                    videoWallConfig = {
                        type: 'lcd',
                        layout: mainGroup.videoWallConfig ? { rows: mainGroup.videoWallConfig.rows, cols: mainGroup.videoWallConfig.cols } : { rows: 2, cols: 2 },
                        technology: 'avoip', 
                        multiviewRequired: false
                    };
                } else if (mainGroup.type === 'led_wall') {
                    displayTypeString = 'led_video_wall';
                    videoWallConfig = {
                        type: 'led',
                        layout: { rows: 1, cols: 1 },
                        technology: 'processor',
                        multiviewRequired: false
                    };
                } else {
                    displayTypeString = totalDisplayCount > 1 ? 'dual_display' : 'single';
                }
            }

            const ioRequirements: IOPoint[] = [];
            
            const baseRoomData: Partial<RoomData> = {
                roomName: roomType,
                roomType: roomType,
                dimensions: dimensions,
                maxParticipants: capacity,
                ioRequirements: ioRequirements, 
                displayType: displayTypeString as any,
                displayCount: totalDisplayCount,
                displaySize: inferredDisplaySize,
                videoWallConfig: videoWallConfig as any,
                audioSystemDetails: audioDetails,
                features: [
                    ...(needs.videoConferencing ? [{ name: 'Video Conferencing', priority: 'must-have' as const }] : []),
                    ...(needs.wirelessPresentation ? [{ name: 'Wireless Presentation', priority: 'must-have' as const }] : []),
                    ...(needs.voiceLift ? [{ name: 'Speech Reinforcement', priority: 'must-have' as const }] : []),
                    ...(needs.interactive ? [{ name: 'Interactive Display', priority: 'must-have' as const }] : []),
                    ...(totalDisplayCount > 1 ? [{ name: 'Multi-Display Support', priority: 'must-have' as const }] : []),
                ],
                technicalDetails: {
                    roomPc: needs.roomPc,
                    primaryVideoResolution: '4K/60Hz 4:4:4',
                    videoSignalTypes: ['HDMI', 'USB-C'],
                    controlSystem: 'Simple Keypad',
                    cameraType: 'none', cameraCount: 0, 
                    avoipSystem: 'None'
                }
            };
            
            if (displayGroups.some(g => g.transport.includes('AVoIP'))) {
                 baseRoomData.functionalityStatement = "Design requires AVoIP for signal distribution to displays.";
            }

            const finalInfra = infrastructure as ProjectInfrastructure;

            // Validate product database is available
            if (!productDatabase || productDatabase.length === 0) {
                toast.error("Product database is not loaded. Please refresh the page and try again.");
                return;
            }

            const designs = await generateTieredDesigns(baseRoomData, productDatabase, finalInfra);
            setGeneratedOptions(designs);
            updateState({ currentStep: wizardState.currentStep + 1 });
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate design options. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalize = (selectedTier: DesignTier) => {
        if (!generatedOptions) return;

        const finalizeProject = () => {
            const selectedRoom = generatedOptions[selectedTier];
            const { projectDetails, infrastructure } = wizardState;
            
            const newProject: any = { 
                projectId: uuidv4(),
                projectName: projectDetails.projectName,
                clientName: projectDetails.clientName,
                lastSaved: new Date().toISOString(),
                rooms: [{ ...selectedRoom, id: uuidv4() }],
                proposals: [],
                unitSystem: 'metric',
                notes: `Created via Guided Wizard. Selected Tier: ${selectedTier}`,
                infrastructure: infrastructure as ProjectInfrastructure,
                productDatabase: productDatabase || [], 
            };

            dispatchProjectAction({ type: 'SET_PROJECT', payload: newProject });
            
            setWizardState(DEFAULT_WIZARD_STATE);

            toast.success("Project created successfully!");
            navigate(`/design/${newProject.projectId}`);
        };

        checkAuth(finalizeProject);
    };

    const WIZARD_STEPS = [
        { label: 'Project Context', short: 'Proj' },
        { label: 'Room Type', short: 'Type' },
        { label: 'Needs Assessment', short: 'Needs' },
        { label: 'Select Design', short: 'Select' }
    ];

    const nextStep = () => updateState({ currentStep: Math.min(wizardState.currentStep + 1, WIZARD_STEPS.length - 1) });
    const prevStep = () => updateState({ currentStep: Math.max(wizardState.currentStep - 1, 0) });
    
    const renderStep = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <LoadingSpinner />
                    <h3 className="text-2xl font-bold mt-6 text-accent">AI Designer Working...</h3>
                    <p className="text-text-secondary mt-2 max-w-md">
                        Analyzing your requirements and selecting compatible products for Bronze, Silver, and Gold budgets.
                    </p>
                </div>
            );
        }

        switch (wizardState.currentStep) {
            case 0: return <ProjectContextStep 
                            details={wizardState.projectDetails} 
                            setDetails={(d) => updateState({ projectDetails: d })}
                            infrastructure={wizardState.infrastructure}
                            setInfrastructure={(i) => updateState({ infrastructure: { ...wizardState.infrastructure, ...i } })}
                            onNext={nextStep} 
                            onSave={handleSaveProgress}
                        />;
            case 1: return <RoomTypeStep 
                            roomType={wizardState.roomType} 
                            setRoomType={(t) => updateState({ roomType: t })} 
                            setVertical={(v) => updateState({ vertical: v })}
                            onNext={nextStep} 
                            onBack={prevStep}
                            onSave={handleSaveProgress}
                        />;
            case 2: return <NeedsAssessmentStep 
                            needs={wizardState.needs} 
                            setNeeds={(n) => updateState({ needs: n })} 
                            dimensions={wizardState.dimensions}
                            setDimensions={(d) => updateState({ dimensions: d })}
                            capacity={wizardState.capacity}
                            setCapacity={(c) => updateState({ capacity: c })}
                            onNext={handleGenerateOptions} 
                            onBack={prevStep}
                            onSave={handleSaveProgress}
                        />;
            case 3: return <TierSelectionStep 
                            options={generatedOptions!} 
                            onSelect={handleFinalize}
                            onBack={prevStep}
                        />;
            default: return null;
        }
    };

    const ACCENT_COLOR = '#00833D';

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
                onLoginSuccess={handleLoginSuccess} 
            />
            <div className="w-full flex-grow flex flex-col h-full min-h-0">
                
                <div className="mb-2 mt-2 px-4 flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        {WIZARD_STEPS.map((step, index) => {
                            const isCompleted = index < wizardState.currentStep;
                            const isCurrent = index === wizardState.currentStep;
                            const isUpcoming = index > wizardState.currentStep;

                            return (
                                <React.Fragment key={index}>
                                    <div className="flex flex-col items-center relative z-10 group">
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
                                            className={`text-[10px] font-medium mt-2 absolute -bottom-6 whitespace-nowrap transition-colors duration-300
                                            ${isCurrent ? 'font-bold' : ''}
                                            ${isUpcoming ? 'text-gray-400' : ''}
                                            `}
                                            style={{ color: isCompleted || isCurrent ? ACCENT_COLOR : undefined }}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                    
                                    {index < WIZARD_STEPS.length - 1 && (
                                        <div 
                                            className={`flex-grow h-1 mx-2 rounded transition-all duration-500
                                            ${isUpcoming ? 'bg-gray-200' : ''}
                                            `}
                                            style={{ backgroundColor: !isUpcoming ? ACCENT_COLOR : undefined }}
                                        ></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-grow bg-background-secondary rounded-xl shadow-xl border border-border-color overflow-hidden relative flex flex-col min-h-0 mt-6">
                     {wizardState.currentStep > 0 && (
                        <div style={{ backgroundColor: ACCENT_COLOR }} className="text-white px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-sm z-10 flex-shrink-0">
                            <span className="opacity-80 uppercase tracking-wider text-xs">Designing:</span>
                            <span className="font-bold">{getVerticalName()}</span>
                            <span className="opacity-50">/</span>
                            <span className="font-bold">{wizardState.roomType}</span>
                        </div>
                     )}
                     
                     {renderStep()}
                </div>
            </div>
        </div>
    );
};

export default GuidedProjectWizard;
