
import { useCallback } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';
import { useUserContext } from '../context/UserContext';
import { ProjectData, ProjectSetupData, RoomData, UserTemplate, ManuallyAddedEquipment, DesignTier, ValueEngineeringSuggestion, DesignProposal, ProjectInfrastructure } from '../utils/types';
import { analyzeRequirements, analyzeSurveyDocument } from '../services/projectAnalysisService';
import { designRoom, generateDiagram } from '../services/roomDesignerService';
import { generateProposal } from '../services/proposalService';
import { createNewRoom } from '../utils/utils';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { PRODUCT_DATABASE } from '../data/productDatabase';

const DEFAULT_INFRASTRUCTURE: ProjectInfrastructure = {
    useDedicatedNetwork: false,
    enableTouchAppPreview: false,
    cablingByOthers: false,
    buildingType: 'single_floor',
    floorCount: 1,
    rackStrategy: 'in_room',
    hasLocalRacks: true,
    hasCentralizedInfrastructure: false,
    centralizedEquipment: [],
    localEquipmentTypes: ['sources', 'room_controllers']
};

export const useProjectGeneration = () => {
    const { dispatchProjectAction, setAppState, setLoadingContext, getState, setIsDesignOptionsModalOpen } = useProjectContext();
    const { userProfile } = useUserContext();

    const getActiveProductDatabase = useCallback(() => {
        return userProfile.customProductDatabase && userProfile.customProductDatabase.length > 0
            ? userProfile.customProductDatabase
            : PRODUCT_DATABASE;
    }, [userProfile.customProductDatabase]);

    const withLoading = useCallback(async (context: 'template' | 'proposal' | 'design' | 'diagram' | 'default', action: () => Promise<void>) => {
        setAppState('generating');
        setLoadingContext(context);
        try {
            await action();
        } catch (error) {
            console.error(`Error during generation context '${context}':`, error);
            toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.');
            setAppState('error');
        } finally {
            setAppState('idle');
            setLoadingContext('default');
        }
    }, [setAppState, setLoadingContext]);

    const handleAgentSubmit = useCallback(async (documentText: string, navigate: NavigateFunction) => {
        await withLoading('template', async () => {
            const requirements = await analyzeRequirements(documentText, userProfile);
            const newProject: ProjectData = {
                projectId: uuidv4(),
                projectName: requirements.projectName,
                clientName: requirements.clientName,
                lastSaved: new Date().toISOString(),
                rooms: requirements.rooms.map((roomStub, index) => ({
                    ...createNewRoom(),
                    id: uuidv4(),
                    roomName: `Room ${index + 1}`,
                    roomType: 'Other',
                    designTier: 'Silver',
                    ...roomStub
                })),
                proposals: [],
                unitSystem: 'metric',
                notes: `Generated from client brief:\n\n${documentText}`,
                infrastructure: DEFAULT_INFRASTRUCTURE,
                productDatabase: getActiveProductDatabase(),
            };
            dispatchProjectAction({ type: 'SET_PROJECT', payload: newProject });
            toast.success('Project created from client brief!');
            navigate(`/design/${newProject.projectId}`);
        });
    }, [withLoading, userProfile, getActiveProductDatabase, dispatchProjectAction]);
    
    const handleSurveyImport = useCallback(async (imageData: string, imageMimeType: string, navigate: NavigateFunction) => {
        await withLoading('template', async () => {
            const parsedRoomData = await analyzeSurveyDocument(imageData, imageMimeType, userProfile);

            const newRoom: RoomData = {
                ...createNewRoom(),
                ...parsedRoomData,
                id: uuidv4(),
                roomName: parsedRoomData.roomName || 'Imported Room',
                roomType: parsedRoomData.roomType || 'Other',
                designTier: parsedRoomData.designTier || 'Silver',
            };

            const newProject: ProjectData = {
                projectId: uuidv4(),
                projectName: `${newRoom.roomName} Project`,
                clientName: 'New Client',
                lastSaved: new Date().toISOString(),
                rooms: [newRoom],
                proposals: [],
                unitSystem: userProfile.unitSystem,
                notes: `Generated from site survey scan.`,
                infrastructure: DEFAULT_INFRASTRUCTURE,
                productDatabase: getActiveProductDatabase(),
            };
            dispatchProjectAction({ type: 'SET_PROJECT', payload: newProject });
            toast.success('Project created from site survey!');
            navigate(`/design/${newProject.projectId}`);
        });
    }, [withLoading, userProfile, getActiveProductDatabase, dispatchProjectAction]);

    const handleProjectSetupSubmit = useCallback(async (setupData: ProjectSetupData, navigate: NavigateFunction) => {
       await withLoading('template', async () => {
            const newProject: ProjectData = {
                projectId: uuidv4(),
                projectName: setupData.projectName,
                clientName: setupData.clientName,
                lastSaved: new Date().toISOString(),
                rooms: setupData.rooms,
                proposals: [],
                unitSystem: 'metric',
                notes: '',
                infrastructure: DEFAULT_INFRASTRUCTURE,
                productDatabase: getActiveProductDatabase(),
            };
            dispatchProjectAction({ type: 'SET_PROJECT', payload: newProject });
            toast.success('Project created!');
            navigate(`/design/${newProject.projectId}`);
       });
    }, [withLoading, getActiveProductDatabase, dispatchProjectAction]);
    
    const handleStartFromTemplate = useCallback((template: UserTemplate, navigate: NavigateFunction) => {
        const newProject: ProjectData = {
            projectId: uuidv4(),
            projectName: `${template.conceptName || template.templateName} Project`,
            clientName: 'New Client',
            lastSaved: new Date().toISOString(),
            rooms: [{ ...template.roomData, id: uuidv4(), aiDesignProposals: undefined }],
            proposals: [],
            unitSystem: userProfile.unitSystem,
            notes: `Started from template: ${template.templateName}`,
            infrastructure: DEFAULT_INFRASTRUCTURE,
            productDatabase: getActiveProductDatabase(),
        };

        dispatchProjectAction({ type: 'SET_PROJECT', payload: newProject });
        toast.success(`Project started from "${template.templateName}"!`);
        navigate(`/design/${newProject.projectId}`);
    }, [userProfile.unitSystem, getActiveProductDatabase, dispatchProjectAction]);

    const handleDesignRoom = useCallback(async (roomId: string) => {
        const project = getState().projectData;
        if (!project) return;
        const roomToDesign = project.rooms.find(r => r.id === roomId);
        if (!roomToDesign) return;

        await withLoading('design', async () => {
            const tiers: DesignTier[] = ['Bronze', 'Silver', 'Gold'];
            const designPromises = tiers.map(tier => 
                designRoom({ ...roomToDesign, designTier: tier }, project.productDatabase)
                    .then(result => ({ tier, result, status: 'fulfilled' as const }))
                    .catch(error => ({ tier, error, status: 'rejected' as const }))
            );
            
            const results = await Promise.all(designPromises);
            
            const proposals: DesignProposal[] = [];
            results.forEach(item => {
                if (item.status === 'fulfilled') {
                    const { tier, result } = item;
                    const fullEquipment: ManuallyAddedEquipment[] = result.manuallyAddedEquipment.map(equip => {
                        const product = project.productDatabase.find(p => p.sku === equip.sku);
                        if (!product) {
                            console.warn(`Product not found for SKU: ${equip.sku}`);
                            return {
                                sku: equip.sku,
                                name: 'Unknown Product',
                                category: 'Misc' as any,
                                description: 'Product not found in database',
                                tags: [],
                                quantity: equip.quantity
                            };
                        }
                        return { ...product, quantity: equip.quantity };
                    });
                    proposals.push({
                        tier,
                        functionalityStatement: result.functionalityStatement,
                        manuallyAddedEquipment: fullEquipment,
                    });
                } else {
                    console.error(`Failed to generate ${item.tier} design:`, item.error);
                    toast.error(`Could not generate the ${item.tier} design option.`);
                }
            });

            if (proposals.length > 0) {
                dispatchProjectAction({ type: 'SET_AI_DESIGN_PROPOSALS', payload: { roomId, proposals } });
                setIsDesignOptionsModalOpen(true);
            } else {
                toast.error("AI design generation failed for all tiers. Please try again.");
            }
        });
    }, [getState, withLoading, dispatchProjectAction, setIsDesignOptionsModalOpen]);

    const handleValueEngineerRoom = useCallback(async (roomId: string, constraints: string[], suggestions: ValueEngineeringSuggestion[]) => {
        const project = getState().projectData;
        if (!project) return;
        const roomToEngineer = project.rooms.find(r => r.id === roomId);
        if (!roomToEngineer) return;

        const roomWithChanges = { 
            ...roomToEngineer, 
            valueEngineeringConstraints: constraints,
            valueEngineeringSuggestions: suggestions,
        };
        dispatchProjectAction({ type: 'UPDATE_ROOM', payload: roomWithChanges });

        await withLoading('design', async () => {
            const result = await designRoom(roomWithChanges, project.productDatabase);
            const fullEquipment: ManuallyAddedEquipment[] = result.manuallyAddedEquipment.map(item => {
                const product = project.productDatabase.find(p => p.sku === item.sku);
                return { ...product!, quantity: item.quantity };
            });

            const updatedRoom: RoomData = {
                ...roomWithChanges,
                functionalityStatement: result.functionalityStatement,
                manuallyAddedEquipment: fullEquipment,
                systemDiagram: undefined
            };
            dispatchProjectAction({ type: 'UPDATE_ROOM', payload: updatedRoom });
            toast.success(`Room re-designed with new constraints!`);
        });
    }, [getState, dispatchProjectAction, withLoading]);
    
    const handleGenerateDiagram = useCallback(async (roomId: string) => {
        const project = getState().projectData;
        if (!project) return;
        const roomToUpdate = project.rooms.find(r => r.id === roomId);
        if (!roomToUpdate || roomToUpdate.manuallyAddedEquipment.length === 0) {
            toast.error("Please design the room and add equipment before generating a diagram.");
            return;
        }

        await withLoading('diagram', async () => {
            const diagram = await generateDiagram(roomToUpdate);
            const updatedRoom: RoomData = { ...roomToUpdate, systemDiagram: diagram };
            dispatchProjectAction({ type: 'UPDATE_ROOM', payload: updatedRoom });
            toast.success(`System diagram generated for ${roomToUpdate.roomName}`);
        });
    }, [getState, withLoading, dispatchProjectAction]);

    const handleGenerateProposal = useCallback(async (projectData: ProjectData, navigate: NavigateFunction) => {
        if (projectData.rooms.length === 0 || projectData.rooms.every(r => r.manuallyAddedEquipment.length === 0)) {
            toast.error("Please add at least one room with equipment before generating a proposal.");
            return;
        }
        await withLoading('proposal', async () => {
            const generatedData = await generateProposal(projectData, userProfile);
            const newProposal = {
                ...generatedData,
                proposalId: uuidv4(),
                version: (projectData.proposals?.length || 0) + 1,
                createdAt: new Date().toISOString(),
            };
            dispatchProjectAction({ type: 'ADD_PROPOSAL', payload: newProposal });
            toast.success('Proposal generated!');
            navigate(`/proposal/${projectData.projectId}/${newProposal.proposalId}`);
        });
    }, [withLoading, userProfile, dispatchProjectAction]);

    return {
        handleAgentSubmit,
        handleProjectSetupSubmit,
        handleSurveyImport,
        handleStartFromTemplate,
        handleDesignRoom,
        handleGenerateDiagram,
        handleGenerateProposal,
        handleValueEngineerRoom,
    };
};
