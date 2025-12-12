import { Type } from '@google/genai';
import { z } from 'zod';

export const ROOM_DESIGN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    functionalityStatement: { type: Type.STRING },
    manuallyAddedEquipment: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sku: { type: Type.STRING },
          quantity: { type: Type.INTEGER },
        },
        required: ['sku', 'quantity'],
      },
    },
  },
  required: ['functionalityStatement', 'manuallyAddedEquipment'],
};

export const SYSTEM_DIAGRAM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          type: { type: Type.STRING },
        },
        required: ['id', 'label', 'type'],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
          type: { type: Type.STRING },
        },
        required: ['from', 'to', 'label', 'type'],
      },
    },
  },
  required: ['nodes', 'edges'],
};

export const PROPOSAL_GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: { type: Type.STRING },
    scopeOfWork: { type: Type.STRING },
    installationPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING },
          tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['phase', 'tasks'],
      },
    },
     suggestedImprovements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
            roomName: { type: Type.STRING },
            improvement: { type: Type.STRING },
        },
        required: ['roomName', 'improvement'],
      },
    },
    upgradeDowngradePaths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          roomName: { type: Type.STRING },
          currentTier: { type: Type.STRING },
          upgrade: {
            type: Type.OBJECT,
            properties: {
              toTier: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['toTier', 'description'],
          },
          downgrade: {
            type: Type.OBJECT,
            properties: {
              toTier: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['toTier', 'description'],
          },
        },
        required: ['roomName', 'currentTier'],
      },
    },
    cableInformation: { type: Type.STRING, description: "A section detailing WyreStorm's cable offerings and their costs." }
  },
  required: ['executiveSummary', 'scopeOfWork', 'installationPlan', 'upgradeDowngradePaths'],
};

export const PROPOSAL_GENERATION_ZOD_SCHEMA = z.object({
  executiveSummary: z.string(),
  scopeOfWork: z.string(),
  installationPlan: z.array(z.object({
    phase: z.string(),
    tasks: z.array(z.string()),
  })),
  suggestedImprovements: z.optional(z.array(z.object({
    roomName: z.string(),
    improvement: z.string(),
  }))),
  upgradeDowngradePaths: z.optional(z.array(z.object({
    roomName: z.string(),
    currentTier: z.string(),
    upgrade: z.optional(z.object({
        toTier: z.string(),
        description: z.string(),
    })),
    downgrade: z.optional(z.object({
        toTier: z.string(),
        description: z.string(),
    })),
  }))),
  cableInformation: z.string().optional(),
});

export const PROJECT_INSIGHTS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        feedback: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['Warning', 'Suggestion', 'Opportunity', 'Insight'] },
                    text: { type: Type.STRING },
                },
                required: ['type', 'text'],
            },
        },
    },
    required: ['feedback'],
};

export const ROOM_REVIEW_SCHEMA = PROJECT_INSIGHTS_SCHEMA;

export const REQUIREMENTS_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING },
    clientName: { type: Type.STRING },
    rooms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          roomName: { type: Type.STRING },
          roomType: { type: Type.STRING },
          designTier: { type: Type.STRING, enum: ['Bronze', 'Silver', 'Gold'] },
          // other fields from RoomData can be added here if needed
        },
        required: ['roomName', 'roomType', 'designTier'],
      },
    },
  },
  required: ['projectName', 'clientName', 'rooms'],
};

export const PRODUCT_FINDER_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        skus: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
        },
    },
    required: ['skus'],
};

export const RELATED_PRODUCTS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        alternatives: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sku: { type: Type.STRING },
                    name: { type: Type.STRING },
                    reason: { type: Type.STRING },
                },
                required: ['sku', 'name', 'reason'],
            },
        },
        accessories: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sku: { type: Type.STRING },
                    name: { type: Type.STRING },
                    reason: { type: Type.STRING },
                },
                required: ['sku', 'name', 'reason'],
            },
        },
    },
    required: ['alternatives', 'accessories'],
};
