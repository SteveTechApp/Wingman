
import { ProjectData, UserProfile } from '../../utils/types';
import { getLocalizationInstructions } from '../localizationService';
import { INSTALLATION_TASK_DATABASE } from '../../data/installationTaskDatabase';

export const generateProposalPrompt = (project: ProjectData, userProfile: UserProfile | null): string => {
    const localization = getLocalizationInstructions(userProfile);

    return `
        You are an expert AV proposal writer for WyreStorm. Generate a professional proposal based on the provided project data.
        ${localization}

        Project Details:
        - Project Name: ${project.projectName}
        - Rooms:
        ${project.rooms.map(room => `  - ${room.roomName} (${room.designTier} Tier): ${room.functionalityStatement}`).join('\n')}
        - Full Equipment List: ${JSON.stringify(project.productDatabase.map(p=>({sku:p.sku, name:p.name})), null, 2)}

        Available Installation Tasks:
        ${JSON.stringify(INSTALLATION_TASK_DATABASE, null, 2)}

        Your Tasks:
        1.  **executiveSummary**: Write a compelling, client-facing summary.
        2.  **scopeOfWork**: Detail what will be delivered in each room.
        3.  **installationPlan**: Create a logical, phased installation plan using tasks from the database.
        4.  **suggestedImprovements**: Suggest 1-2 valuable upsell opportunities.
        5.  **upgradeDowngradePaths**: CRITICAL. For EACH room, suggest concrete upgrade/downgrade paths based on technology tiers (Bronze: basic HDBT, Silver: 4K60/USB-C/1GbE AVoIP, Gold: 10GbE AVoIP/HDBT 3.0).
        6.  **cableInformation**: Add a section 'A Note on Connectivity', mentioning WyreStorm's cable offerings and including a small markdown table with 3-4 example cable SKUs and names from the 'Cable' category.

        Return only valid JSON that conforms to the schema.
    `;
};