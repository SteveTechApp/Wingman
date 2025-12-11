import { GoogleGenAI } from '@google/genai';
import { ProjectData, RoomData, UserProfile, DesignFeedbackItem, ProjectSetupData } from '../utils/types';
import { REQUIREMENTS_ANALYSIS_SCHEMA, PROJECT_INSIGHTS_SCHEMA, ROOM_REVIEW_SCHEMA } from './schemas';
import { getLocalizationInstructions } from './localizationService';
import { safeParseJson } from '../utils/utils';
import { MODULE_12_SITE_SURVEY } from '../data/training/module12_site_survey';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enhanced function to analyze client requirements with better extraction
 */
export const analyzeRequirements = async (documentText: string, userProfile: UserProfile | null): Promise<Omit<ProjectSetupData, 'rooms'> & { rooms: Partial<RoomData>[] }> => {
    const localization = getLocalizationInstructions(userProfile);
    const prompt = `
        You are an expert AV system consultant analyzing a client's requirements document or brief.
        ${localization}

        Client Document:
        ---
        ${documentText}
        ---

        **Your Task:**
        Thoroughly analyze this document and extract comprehensive project information. Be intelligent about inferring details that may not be explicitly stated.

        **Extract the following:**
        
        1. **Project Information:**
           - projectName: A professional, descriptive name for the project. If not stated, create one from context (e.g., "[Client Name] AV Integration Project")
           - clientName: The client's organization or individual name. Look for signatures, headers, or "Dear [Name]" patterns.

        2. **Rooms Analysis:** 
           For EACH room or space mentioned:
           - roomName: Specific name or number (e.g., "Conference Room A", "Boardroom 3rd Floor")
           - roomType: Classify as one of: 'Conference Room', 'Boardroom', 'Huddle Room', 'Training Room', 'Lecture Hall', 'Auditorium', 'Control Room', 'Classroom', 'Meeting Room', 'Executive Office', 'Multi-Purpose Room', 'Other'
           - designTier: Carefully infer quality level:
              * 'Bronze': Keywords like "budget", "basic", "economical", "standard", "entry-level", "cost-effective"
              * 'Silver': Keywords like "professional", "quality", "reliable", "mid-range", or no specific indicators
              * 'Gold': Keywords like "premium", "high-end", "executive", "flagship", "top-tier", "cutting-edge", "4K60", "AVoIP"
           - dimensions: Extract if mentioned (length, width, height in meters)
           - maxParticipants: Number of people the room should accommodate
           - functionalityStatement: Brief description of the room's purpose and key requirements
           - features: Array of important features mentioned (e.g., "wireless presentation", "video conferencing", "recording capability")

        **Intelligence Guidelines:**
        - If multiple similar rooms are mentioned (e.g., "5 conference rooms"), create separate entries for each
        - Infer design tier from budget constraints, mentioned brands, or use cases
        - Extract specific technology requirements (4K displays, wireless capabilities, etc.)
        - Note any compliance requirements (ADA, security clearance, etc.)
        - Identify any special constraints (ceiling height, acoustics, existing infrastructure)
        - Look for integration requirements with existing systems

        **Output Format:**
        Return a valid JSON object with the structure defined in the schema. Include as much detail as possible from the document.

        Do not include markdown formatting or explanations - only the JSON object.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: REQUIREMENTS_ANALYSIS_SCHEMA,
            },
        });
        const text = response.text;
        if (!text) {
            throw new Error("Empty AI response.");
        }
        return safeParseJson(text);
    } catch (error) {
        console.error("Error analyzing requirements:", error);
        throw new Error("Failed to analyze client brief due to an API or parsing error.");
    }
};

/**
 * Enhanced survey document analysis with better OCR and field extraction
 */
export const analyzeSurveyDocument = async (imageDataB64: string, imageMimeType: string, userProfile: UserProfile | null): Promise<Partial<RoomData>> => {
    const formStructure = MODULE_12_SITE_SURVEY.contentPages[0].content;
    const prompt = `
You are an expert AI assistant specializing in Optical Character Recognition (OCR) and data extraction from AV site survey documents.

The user has provided an image of a completed 'Site Survey Checklist'. Your task is to:
1. Accurately extract ALL handwritten and printed information
2. Interpret checkboxes, tick marks, and selections
3. Convert measurements to standard units
4. Structure the data according to the expected format

**Form Structure Reference:**
---
${formStructure}
---

**ENHANCED EXTRACTION GUIDELINES:**

1. **Text Recognition:**
   - Read both handwritten and printed text carefully
   - Handle various handwriting styles and qualities
   - Interpret common abbreviations (e.g., "conf rm" = "Conference Room", "max" = "maximum")

2. **Checkbox & Selection Handling:**
   - Identify checked boxes, tick marks, circles, or X marks
   - Map selections to appropriate enum values
   - If multiple items are checked, prioritize or note all selections

3. **Unit Conversion (CRITICAL):**
   - Dimensions MUST be in METERS in the output
   - If measurements show feet (ft, ', ") convert: 1 foot = 0.3048 meters
   - If measurements show inches, convert: 1 inch = 0.0254 meters
   - Preserve precision to 2 decimal places

4. **Field Mapping:**
   - roomName: From "Room Name/Number" field
   - roomType: From "Room Type" or infer from context
   - dimensions: Extract length, width, height
   - maxParticipants: From "Seating Capacity" or "Max Occupancy"
   - constructionDetails: Map wall/ceiling/floor types from checkboxes
   - technicalDetails: Extract existing equipment, cable runs, power outlets

5. **Data Validation:**
   - Ensure numeric fields contain valid numbers
   - Provide reasonable defaults if fields are unclear
   - Note any ambiguous or illegible fields in a "notes" property

**Output Requirements:**
- Return ONLY a valid JSON object
- No markdown formatting, no explanations
- Include all extracted data, even if some fields are incomplete
- Use null for truly missing data, not empty strings

**Example field mappings:**
- Wall type checkbox "Drywall" checked → "wallConstruction": "drywall"
- Ceiling type "Drop Ceiling (ACT)" checked → "ceilingType": "drop_ceiling"
- Floor "Carpet" checked → "floorType": "carpet"
`;

    try {
        const imagePart = {
            inlineData: {
                mimeType: imageMimeType,
                data: imageDataB64,
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: 'application/json',
            },
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty AI response for survey analysis.");

        const result = safeParseJson(text);
        
        // Post-process to ensure data quality
        if (result.dimensions) {
            // Ensure dimensions are reasonable (between 2m and 100m)
            if (result.dimensions.length > 100) result.dimensions.length = result.dimensions.length * 0.3048;
            if (result.dimensions.width > 100) result.dimensions.width = result.dimensions.width * 0.3048;
            if (result.dimensions.height > 10) result.dimensions.height = result.dimensions.height * 0.3048;
        }

        return result;

    } catch (error) {
        console.error("Error analyzing survey document:", error);
        throw new Error("Failed to analyze survey due to an API or parsing error.");
    }
};

/**
 * Analyze an entire project and provide strategic insights
 */
export const analyzeProject = async (project: ProjectData, userProfile: UserProfile | null): Promise<DesignFeedbackItem[]> => {
    const localization = getLocalizationInstructions(userProfile);
    
    const projectSummary = {
        name: project.projectName,
        client: project.clientName,
        roomCount: project.rooms.length,
        rooms: project.rooms.map(r => ({
            name: r.roomName,
            type: r.roomType,
            tier: r.designTier,
            equipmentCount: r.manuallyAddedEquipment.length,
            hasAudio: r.audioSystemDetails !== undefined,
            hasVideo: r.displayCount > 0,
            hasControl: r.technicalDetails.controlSystem !== undefined,
        })),
        infrastructure: project.infrastructure,
    };

    const prompt = `
        You are a senior AV consultant conducting a comprehensive project review.
        ${localization}
        
        **Project Overview:**
        ${JSON.stringify(projectSummary, null, 2)}

        **Your Analysis Should Cover:**

        1. **Design Consistency:**
           - Are design tiers appropriate for each room type?
           - Is there consistency across similar room types?
           - Any opportunities for standardization?

        2. **Infrastructure Strategy:**
           - Does the cabling strategy make sense for this project scale?
           - Should they consider centralized vs. distributed architecture?
           - AVoIP opportunities for larger deployments?

        3. **Technology Stack:**
           - Are control systems consistently specified?
           - Opportunities for integrated solutions?
           - Potential compatibility issues across rooms?

        4. **Value Engineering:**
           - Opportunities to reduce costs without sacrificing quality?
           - Areas where investment could yield better ROI?
           - Volume discount opportunities?

        5. **Business Opportunities:**
           - Upsell potential (e.g., project-wide control system, maintenance contracts)?
           - Missing rooms or spaces that could benefit from AV?
           - Future expansion considerations?

        6. **Risk Assessment:**
           - Technical risks or potential integration challenges?
           - Timeline concerns based on equipment count?
           - Training requirements for end users?

        **Feedback Guidelines:**
        - Prioritize actionable insights
        - Be specific with recommendations
        - Balance technical accuracy with business value
        - Consider the client's likely budget sensitivity

        Provide feedback as an array of objects with:
        - "type": 'Warning' (red flag), 'Suggestion' (improvement), 'Opportunity' (upsell/enhancement), 'Insight' (strategic observation)
        - "text": Clear, concise explanation (2-3 sentences max)

        Return only valid JSON matching the schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: PROJECT_INSIGHTS_SCHEMA,
            },
        });
        const text = response.text;
        if (!text) {
            throw new Error("Empty AI response.");
        }
        const result = safeParseJson(text);
        return result.feedback;
    } catch (error) {
        console.error("Error analyzing project:", error);
        throw new Error("Failed to analyze project due to an API error.");
    }
};

/**
 * Review a specific room design with detailed technical analysis
 */
export const reviewRoom = async (room: RoomData, project: ProjectData, userProfile: UserProfile | null): Promise<DesignFeedbackItem[]> => {
    const localization = getLocalizationInstructions(userProfile);
    
    const roomSummary = {
        name: room.roomName,
        type: room.roomType,
        tier: room.designTier,
        dimensions: room.dimensions,
        participants: room.maxParticipants,
        displays: {
            count: room.displayCount,
            type: room.displayType,
        },
        equipment: room.manuallyAddedEquipment.map(e => ({
            name: e.name,
            sku: e.sku,
            quantity: e.quantity,
            category: e.category,
        })),
        features: room.features.map(f => ({ name: f.name, priority: f.priority })),
        io: {
            inputCount: room.ioRequirements.filter(io => io.category === 'input').length,
            outputCount: room.ioRequirements.filter(io => io.category === 'output').length,
        },
        technical: room.technicalDetails,
    };

    const prompt = `
        You are an expert AV system designer reviewing a room configuration.
        ${localization}

        **Room Details:**
        ${JSON.stringify(roomSummary, null, 2)}

        **Functionality Statement:**
        "${room.functionalityStatement}"

        **Review Criteria:**

        1. **Tier Alignment:**
           - Does equipment match the declared design tier (${room.designTier})?
           - Are all "must-have" features adequately addressed?
           - Opportunities to upgrade/downgrade for better value?

        2. **System Completeness:**
           - All necessary components present? (source switching, signal distribution, control, audio, video)
           - Signal path completeness (inputs → processing → outputs)?
           - Control system appropriate for room complexity?

        3. **Technical Validation:**
           - Cable distance limitations respected?
           - Bandwidth requirements met?
           - Power and cooling considerations?
           - Compatibility between selected products?

        4. **User Experience:**
           - Ease of use appropriate for expected users?
           - Sufficient I/O points for requirements?
           - Audio coverage adequate for room size?
           - Display sizing and placement suitable?

        5. **Value Engineering:**
           - Overspecified components that could be optimized?
           - Missing cost-effective enhancements?
           - Alternative products that might better fit needs?

        6. **Future-Proofing:**
           - Scalability for future needs?
           - Technology refresh considerations?
           - Integration with building systems?

        **Provide Specific Feedback:**
        - Reference actual equipment by name/SKU when relevant
        - Quantify issues where possible (e.g., "cable run exceeds 100m limit")
        - Suggest specific products or configurations as alternatives
        - Consider room-specific context (size, use case, user profile)

        Types: 'Warning' (must fix), 'Suggestion' (should consider), 'Opportunity' (could enhance)
        
        Return only valid JSON matching the schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: ROOM_REVIEW_SCHEMA,
            },
        });
        const text = response.text;
        if (!text) {
            throw new Error("Empty AI response.");
        }
        const result = safeParseJson(text);
        return result.feedback;
    } catch (error) {
        console.error("Error reviewing room:", error);
        throw new Error("Failed to review room due to an API error.");
    }
};

/**
 * NEW: Extract budget information from client documents
 */
export const extractBudgetInfo = async (documentText: string): Promise<{
    totalBudget?: number;
    budgetPerRoom?: number;
    budgetConstraints?: string[];
    currency?: string;
}> => {
    const prompt = `
        Analyze this document and extract any budget-related information:

        ${documentText}

        Look for:
        - Total project budget (extract numeric value and currency)
        - Per-room budget allocations
        - Budget constraints or requirements (e.g., "must stay under X")
        - Funding source mentions (capital budget, grant, etc.)
        - Payment terms or schedules

        Return as JSON with fields: totalBudget (number), budgetPerRoom (number), budgetConstraints (array of strings), currency (string)
        
        If no budget info is found, return empty object {}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            },
        });
        
        return safeParseJson(response.text || '{}');
    } catch (error) {
        console.error("Error extracting budget info:", error);
        return {};
    }
};

/**
 * NEW: Identify stakeholders and decision makers from document
 */
export const identifyStakeholders = async (documentText: string): Promise<{
    decisionMakers: string[];
    technicalContacts: string[];
    endUsers: string[];
}> => {
    const prompt = `
        Analyze this document and identify all stakeholders:

        ${documentText}

        Extract:
        - Decision makers (executives, project sponsors, budget approvers)
        - Technical contacts (IT staff, facilities managers, technical leads)
        - End users (teachers, executives, conference room users)

        Look for names, titles, roles, email addresses, and phone numbers.
        
        Return as JSON with arrays: decisionMakers, technicalContacts, endUsers
        Each entry should be a string like "John Smith - IT Director - jsmith@company.com"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            },
        });
        
        return safeParseJson(response.text || '{"decisionMakers":[],"technicalContacts":[],"endUsers":[]}');
    } catch (error) {
        console.error("Error identifying stakeholders:", error);
        return { decisionMakers: [], technicalContacts: [], endUsers: [] };
    }
};
