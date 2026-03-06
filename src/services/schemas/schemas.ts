
import * as React from "react";
import { SchemaType } from '@google/generative-ai';

// EXPANDED REQUIREMENTS_ANALYSIS_SCHEMA
// This replaces the minimal schema in src/services/schemas.ts

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
          // Basic room info
          roomName: { type: SchemaType.STRING },
          roomType: { type: SchemaType.STRING },
          designTier: { type: SchemaType.STRING, enum: ['Bronze', 'Silver', 'Gold'] },
          
          // Room dimensions
          dimensions: {
            type: SchemaType.OBJECT,
            properties: {
              length: { type: SchemaType.NUMBER },
              width: { type: SchemaType.NUMBER },
              height: { type: SchemaType.NUMBER },
            },
          },
          
          // Capacity
          maxParticipants: { type: SchemaType.NUMBER },
          
          // Display configuration
          displayType: { 
            type: SchemaType.STRING, 
            enum: ['single', 'dual', 'triple', 'quad', 'video-wall']
          },
          displayCount: { type: SchemaType.NUMBER },
          displaySize: { type: SchemaType.NUMBER },
          
          // I/O Requirements
          ioRequirements: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          
          // Audio system
          audioSystemDetails: {
            type: SchemaType.OBJECT,
            properties: {
              speakerLayout: { 
                type: SchemaType.STRING,
                enum: ['none', 'stereo', '2.1', '5.1', 'ceiling', 'line_array']
              },
              systemType: {
                type: SchemaType.STRING,
                enum: ['low_impedance', 'high_impedance', 'dante', 'aoip']
              },
              microphoneType: {
                type: SchemaType.STRING,
                enum: ['none', 'handheld', 'lapel', 'gooseneck', 'boundary', 'ceiling', 'beamforming']
              },
              ucCompatibility: { type: SchemaType.BOOLEAN },
            },
          },
          
          // Technical details
          technicalDetails: {
            type: SchemaType.OBJECT,
            properties: {
              primaryVideoResolution: {
                type: SchemaType.STRING,
                enum: ['1080p', '4K', '8K']
              },
              videoSignalTypes: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              controlSystem: {
                type: SchemaType.STRING,
                enum: ['None (Auto-switching)', 'Touch panel', 'Wall-mounted', 'Wireless', 'Custom']
              },
              cameraType: {
                type: SchemaType.STRING,
                enum: ['none', 'ptz', 'fixed', 'tracking', 'multi-camera']
              },
              cameraCount: { type: SchemaType.NUMBER },
              roomPc: { type: SchemaType.BOOLEAN },
            },
          },
          
          // Functionality
          functionalityStatement: { type: SchemaType.STRING },
        },
        required: ['roomName', 'roomType', 'designTier'],
      },
    },
  },
  required: ['projectName', 'clientName', 'rooms'],
};

export const PROJECT_INSIGHTS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    keyInsights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    recommendations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    redFlags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    opportunities: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ['keyInsights', 'recommendations', 'redFlags', 'opportunities'],
};

export const ROOM_REVIEW_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    feedback: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: { 
            type: SchemaType.STRING,
            enum: ['design', 'technical', 'cost', 'compliance', 'usability']
          },
          severity: { 
            type: SchemaType.STRING,
            enum: ['low', 'medium', 'high', 'critical']
          },
          message: { type: SchemaType.STRING },
          suggestion: { type: SchemaType.STRING },
        },
        required: ['category', 'severity', 'message'],
      },
    },
    overallScore: { type: SchemaType.NUMBER },
    summary: { type: SchemaType.STRING },
  },
  required: ['feedback', 'overallScore', 'summary'],
};

export const ROOM_DESIGN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    equipment: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sku: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unitPrice: { type: SchemaType.NUMBER },
          totalPrice: { type: SchemaType.NUMBER },
          notes: { type: SchemaType.STRING },
        },
        required: ['sku', 'name', 'category', 'quantity'],
      },
    },
    designNotes: { type: SchemaType.STRING },
    estimatedCost: { type: SchemaType.NUMBER },
  },
  required: ['equipment'],
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
          x: { type: SchemaType.NUMBER },
          y: { type: SchemaType.NUMBER },
        },
        required: ['id', 'label', 'type'],
      },
    },
    connections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          from: { type: SchemaType.STRING },
          to: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
          cableType: { type: SchemaType.STRING },
        },
        required: ['from', 'to'],
      },
    },
  },
  required: ['nodes', 'connections'],
};

export const PROPOSAL_GENERATION_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    coverLetter: { type: SchemaType.STRING },
    executiveSummary: { type: SchemaType.STRING },
    scope: { type: SchemaType.STRING },
    assumptions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    exclusions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    timeline: { type: SchemaType.STRING },
    paymentTerms: { type: SchemaType.STRING },
  },
  required: ['executiveSummary', 'scope'],
};

export const PROPOSAL_GENERATION_ZOD_SCHEMA = {
  parse: (data: any) => data
};

export const PRODUCT_FINDER_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    products: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sku: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          relevanceScore: { type: SchemaType.NUMBER },
          rationale: { type: SchemaType.STRING },
        },
        required: ['sku', 'name', 'category'],
      },
    },
  },
  required: ['products'],
};

export const RELATED_PRODUCTS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    relatedProducts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          sku: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          relationship: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING },
        },
        required: ['sku', 'name', 'category', 'relationship'],
      },
    },
  },
  required: ['relatedProducts'],
};



