import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';

export const ROOM_DESIGN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    functionalityStatement: { type: SchemaType.STRING },
    manuallyAddedEquipment: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sku: { type: SchemaType.STRING },
          quantity: { type: SchemaType.INTEGER },
        },
        required: ['sku', 'quantity'],
      },
    },
  },
  required: ['functionalityStatement', 'manuallyAddedEquipment'],
};

export const SYSTEM_DIAGRAM_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
        },
        required: ['id', 'label', 'type'],
      },
    },
    edges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          from: { type: SchemaType.STRING },
          to: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
        },
        required: ['from', 'to', 'label', 'type'],
      },
    },
  },
  required: ['nodes', 'edges'],
};

export const PROPOSAL_GENERATION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    executiveSummary: { type: SchemaType.STRING },
    scopeOfWork: { type: SchemaType.STRING },
    installationPlan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          phase: { type: SchemaType.STRING },
          tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['phase', 'tasks'],
      },
    },
     suggestedImprovements: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
            roomName: { type: SchemaType.STRING },
            improvement: { type: SchemaType.STRING },
        },
        required: ['roomName', 'improvement'],
      },
    },
    upgradeDowngradePaths: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          roomName: { type: SchemaType.STRING },
          currentTier: { type: SchemaType.STRING },
          upgrade: {
            type: SchemaType.OBJECT,
            properties: {
              toTier: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
            },
            required: ['toTier', 'description'],
          },
          downgrade: {
            type: SchemaType.OBJECT,
            properties: {
              toTier: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
            },
            required: ['toTier', 'description'],
          },
        },
        required: ['roomName', 'currentTier'],
      },
    },
    cableInformation: { type: SchemaType.STRING, description: "A section detailing WyreStorm's cable offerings and their costs." }
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
    type: SchemaType.OBJECT,
    properties: {
        feedback: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    type: { type: SchemaType.STRING, enum: ['Warning', 'Suggestion', 'Opportunity', 'Insight'] },
                    text: { type: SchemaType.STRING },
                },
                required: ['type', 'text'],
            },
        },
    },
    required: ['feedback'],
};

export const ROOM_REVIEW_SCHEMA = PROJECT_INSIGHTS_SCHEMA;

export const REQUIREMENTS_ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    projectName: { type: SchemaType.STRING },
    clientName: { type: SchemaType.STRING },
    rooms: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          roomName: { type: SchemaType.STRING },
          roomType: { type: SchemaType.STRING },
          designTier: { type: SchemaType.STRING, enum: ['Bronze', 'Silver', 'Gold'] },
          // other fields from RoomData can be added here if needed
        },
        required: ['roomName', 'roomType', 'designTier'],
      },
    },
  },
  required: ['projectName', 'clientName', 'rooms'],
};

export const PRODUCT_FINDER_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        skus: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
        },
    },
    required: ['skus'],
};

export const RELATED_PRODUCTS_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        alternatives: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    sku: { type: SchemaType.STRING },
                    name: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING },
                },
                required: ['sku', 'name', 'reason'],
            },
        },
        accessories: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    sku: { type: SchemaType.STRING },
                    name: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING },
                },
                required: ['sku', 'name', 'reason'],
            },
        },
    },
    required: ['alternatives', 'accessories'],
};
