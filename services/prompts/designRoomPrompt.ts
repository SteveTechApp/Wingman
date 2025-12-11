
import { RoomData, Product, ProjectInfrastructure } from '../../utils/types';
import { TECHNICAL_DATABASE } from '../../data/technicalDatabase';
import { getCorePrinciples } from './designRoom/corePrinciples';
import { getFeatureDrivenDesignLogic } from './designRoom/featureDrivenDesign';
import { getControlSystemLogic } from './designRoom/controlSystemLogic';
import { getVideoWallLogic } from './designRoom/videoWallLogic';
import { getAvoipLogic } from './designRoom/avoipLogic';
import { getSignalExtensionLogic } from './designRoom/signalExtensionLogic';
import { getProductCompatibilityRules } from './designRoom/productCompatibility';
import { getRoomApplicationLogic } from './designRoom/roomApplicationLogic';
import { getUcLogic } from './designRoom/ucLogic';
import { getProductGranularity } from './designRoom/productGranularity';
import { getTieredDesignLogic } from './designRoom/tieredDesignLogic';
import { getInfrastructureLogic } from './designRoom/infrastructureLogic';

export const generateDesignPrompt = (
  room: RoomData,
  productDatabase: Product[],
  infrastructure?: ProjectInfrastructure,
  valueEngineeringInstruction = ''
): string => {
  const productDbString = JSON.stringify(
    productDatabase.map(p => ({ 
      sku: p.sku, name: p.name, category: p.category, 
      description: p.description, tags: p.tags, status: p.status,
      usb: p.usb,
      hdbaset: p.hdbaset
    })), null, 2
  );

  const infraContext = infrastructure ? `
  Infrastructure Context:
  - Building Type: ${infrastructure.buildingType}
  - Floor Count: ${infrastructure.floorCount}
  - Rack Strategy: ${infrastructure.rackStrategy}
  - Cabling by Others: ${infrastructure.cablingByOthers}
  ` : '';

  return `
  You are an expert AV System Designer for WyreStorm. Your task is to select the appropriate equipment for the given room requirements from the provided product database.

  Room Details:
  - Name: ${room.roomName}
  - Type: ${room.roomType}
  - Tier: ${room.designTier}
  - Functionality Statement: ${room.functionalityStatement}
  - Key Features Required: ${room.features.map(f => `${f.name} (${f.priority})`).join(', ') || 'None'}
  - IO Points: ${JSON.stringify(room.ioRequirements, null, 2)}
  - Audio Details: ${JSON.stringify(room.audioSystemDetails, null, 2)}
  - Control System: ${room.technicalDetails.controlSystem}
  ${room.videoWallConfig ? `- Video Wall Config: ${JSON.stringify(room.videoWallConfig)}` : ''}
  - AVoIP System Selected: ${room.technicalDetails.avoipSystem || 'None'}
  ${infraContext}

  Available WyreStorm Products (use ONLY these products):
  ${productDbString}
  
  Technical Reference Material:
  ${TECHNICAL_DATABASE}

  === DESIGN LOGIC MODULES ===
  ${getTieredDesignLogic()}
  ${getInfrastructureLogic()}
  ${getRoomApplicationLogic()}
  ${getFeatureDrivenDesignLogic()}
  ${getUcLogic()}
  ${getProductGranularity()}
  ${getControlSystemLogic()}
  ${getVideoWallLogic()}
  ${getSignalExtensionLogic()}
  ${getAvoipLogic()}
  ${getProductCompatibilityRules()}
  ${getCorePrinciples()}
  
  ${valueEngineeringInstruction}

  Based on all rules and the room details, perform the following tasks:
  1. Write a concise, one-paragraph "functionalityStatement" that explains the design rationale, specifically mentioning how the room purpose is served (e.g., "Using MST technology for dual screens...").
  2. Create a list of equipment in the "manuallyAddedEquipment" array.
     - You MUST select products ONLY from the provided database.
     - Specify the SKU and quantity for each item.

  Return only valid JSON. Do not include markdown formatting or explanations.
  `;
};