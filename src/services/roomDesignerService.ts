
import { GoogleGenAI } from '@google/genai';
import { RoomData, Product, StructuredSystemDiagram, DesignTier, DisplayType, ProjectInfrastructure } from '../utils/types';
import { ROOM_DESIGN_SCHEMA, SYSTEM_DIAGRAM_SCHEMA } from './schemas';
import { safeParseJson } from '../utils/utils';
import { generateDesignPrompt } from './prompts/designRoomPrompt';

const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  throw new Error('VITE_API_KEY environment variable is not configured. Please set it in your .env file.');
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const designRoom = async (room: RoomData, productDatabase: Product[], infrastructure?: ProjectInfrastructure): Promise<{ functionalityStatement: string; manuallyAddedEquipment: { sku: string; quantity: number }[] }> => {
    const prompt = generateDesignPrompt(room, productDatabase, infrastructure);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: ROOM_DESIGN_SCHEMA,
            },
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response for room design.");
        return safeParseJson(text);
    } catch (error) {
        console.error("Error designing room:", error);
        throw new Error("Failed to design room due to an API or parsing error.");
    }
};

// NEW: Function to generate all 3 tiers in parallel for the Wizard
export const generateTieredDesigns = async (baseRoom: Partial<RoomData>, productDatabase: Product[], infrastructure: ProjectInfrastructure): Promise<Record<DesignTier, RoomData>> => {
    const tiers: DesignTier[] = ['Bronze', 'Silver', 'Gold'];
    
    const promises = tiers.map(async (tier) => {
        // Create a temporary RoomData object for this tier
        const tempRoom: RoomData = {
            ...baseRoom as RoomData,
            designTier: tier,
            // Ensure nested objects exist if partial
            technicalDetails: { ...baseRoom.technicalDetails } as any,
            ioRequirements: baseRoom.ioRequirements || [],
            audioSystemDetails: baseRoom.audioSystemDetails || { 
                speakerLayout: 'none', systemType: 'low_impedance', useCases: [], microphoneType: 'none', ucCompatibility: false 
            },
            manuallyAddedEquipment: []
        };

        // The prompt handles the logic for Bronze/Silver/Gold differentiation
        // Pass infrastructure context
        const designResult = await designRoom(tempRoom, productDatabase, infrastructure);
        
        // Map the SKU results back to full product objects
        const fullEquipment = designResult.manuallyAddedEquipment.map(item => {
            const product = productDatabase.find(p => p.sku === item.sku);
             // If product not found, create a placeholder to avoid crash
            if (!product) return { 
                sku: item.sku, 
                name: 'Unknown Product', 
                category: 'Misc', 
                description: 'Product not found in database', 
                tags: [], 
                quantity: item.quantity 
            };
            return { ...product, quantity: item.quantity };
        });

        const isGoldVc = tier === 'Gold' && tempRoom.features.some(f => f.name === 'Video Conferencing');
        const displayType: DisplayType = isGoldVc ? 'dual_display' : 'single';

        const room: RoomData = {
            ...tempRoom,
            functionalityStatement: designResult.functionalityStatement,
            manuallyAddedEquipment: fullEquipment,
            // Infer display type/count based on tier for the UI
            displayType: displayType,
            displayCount: isGoldVc ? 2 : 1
        };

        return {
            tier,
            room
        };
    });

    const results = await Promise.all(promises);

    // Validate that we have at least some results
    const validResults = results.filter(r => r !== null && r !== undefined);

    if (validResults.length === 0) {
        throw new Error('Failed to generate any design options. Please try again.');
    }

    const bronzeRoom = results.find(r => r?.tier === 'Bronze')?.room;
    const silverRoom = results.find(r => r?.tier === 'Silver')?.room;
    const goldRoom = results.find(r => r?.tier === 'Gold')?.room;

    if (!bronzeRoom || !silverRoom || !goldRoom) {
        throw new Error('Failed to generate all design tiers. Please try again.');
    }

    return {
        Bronze: bronzeRoom,
        Silver: silverRoom,
        Gold: goldRoom
    };
};

const generateDiagramPrompt = (room: RoomData): string => `
    You are an AV system diagramming expert. Based on the room equipment list, generate a structured system diagram.
    Room: ${room.roomName}
    Functionality: ${room.functionalityStatement}
    Equipment: ${room.manuallyAddedEquipment.map(e => `- ${e.quantity}x ${e.name} (${e.sku})`).join('\n')}
    Your task is to create a JSON object for a signal flow diagram with 'nodes' and 'edges'.
    - 'nodes' need an 'id' (SKU, numbered if multiple), a 'label' (product name), and a 'type'.
    - 'edges' need a 'from' (source id), a 'to' (destination id), a 'label' (signal type), and a 'type' ('connection').
    Return ONLY the valid JSON object.
`;

export const generateDiagram = async (room: RoomData): Promise<StructuredSystemDiagram> => {
    const prompt = generateDiagramPrompt(room);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: SYSTEM_DIAGRAM_SCHEMA,
            },
        });
        const text = response.text;
        if (!text) throw new Error("Empty AI response for diagram generation.");
        return safeParseJson(text);
    } catch (error) {
        console.error("Error generating diagram:", error);
        throw new Error("Failed to generate diagram due to an API error.");
    }
};
