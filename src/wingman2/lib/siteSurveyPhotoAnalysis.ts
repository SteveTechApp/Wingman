/**
 * Site Survey Photo Analysis — extracts equipment positions, cable routes,
 * and port counts from uploaded site photos using the vision analysis pipeline.
 *
 * Extends the existing visual attachment analysis with site-survey-specific
 * data extraction for auto-populating the checklist.
 */

import { analyzeVisualAttachment } from "./visionAttachments";
import { runVisionContextAnalysis } from "../api/wingmanApi";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export type ExtractedEquipment = {
  name: string;
  category: string;
  location?: string;
  ports?: string[];
  notes?: string;
  confidence: number;
};

export type ExtractedCable = {
  fromEquipment: string;
  toEquipment: string;
  transport?: string;
  estimatedLengthMetres?: number;
  notes?: string;
  confidence: number;
};

export type ExtractedLocation = {
  name: string;
  type?: string;
  notes?: string;
  confidence: number;
};

export type SiteSurveyPhotoResult = {
  id: string;
  fileName: string;
  summary: string;
  locations: ExtractedLocation[];
  equipment: ExtractedEquipment[];
  cables: ExtractedCable[];
  roomDimensions?: string;
  networkInfrastructure?: string;
  powerAvailability?: string;
  accessNotes?: string;
  rawObservations: string[];
  confidence: number;
  analyzedAt: string;
};

/* ──────────────────────────────────────────────
   Analysis prompt for site survey extraction
   ────────────────────────────────────────────── */

const SITE_SURVEY_HINT = `Analyze this site photo for AV installation planning. Extract:
1. Equipment positions - identify all visible AV equipment (displays, projectors, cameras, speakers, control panels, network switches, racks, etc.) and their approximate locations in the room
2. Cable routes - identify visible cables, conduits, or cable paths between equipment
3. Room layout - describe the room layout, mounting positions, and equipment placement zones
4. Network infrastructure - note any visible network ports, patch panels, or switch locations
5. Power outlets - identify visible power outlets and their proximity to equipment positions
6. Access considerations - note any access challenges (high ceilings, locked cabinets, etc.)

Focus on information that would be useful for a site survey checklist.`;

/* ──────────────────────────────────────────────
   Main analysis function
   ────────────────────────────────────────────── */

export async function analyzeSiteSurveyPhoto(file: File): Promise<SiteSurveyPhotoResult> {
  // Use the existing visual analysis pipeline with site-survey hint
  const baseAnalysis = await analyzeVisualAttachment(file, SITE_SURVEY_HINT);

  // Run a second pass with more specific extraction prompt
  const extractionResult = await runSiteSurveyExtraction(file);

  return {
    id: `survey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    summary: baseAnalysis.summary,
    locations: extractionResult.locations,
    equipment: extractionResult.equipment,
    cables: extractionResult.cables,
    roomDimensions: extractionResult.roomDimensions,
    networkInfrastructure: extractionResult.networkInfrastructure,
    powerAvailability: extractionResult.powerAvailability,
    accessNotes: extractionResult.accessNotes,
    rawObservations: [
      ...baseAnalysis.roomObservations,
      ...baseAnalysis.visibleEquipment,
      ...baseAnalysis.layoutNotes,
    ],
    confidence: baseAnalysis.confidence,
    analyzedAt: new Date().toISOString(),
  };
}

/* ──────────────────────────────────────────────
   Extraction via vision API
   ────────────────────────────────────────────── */

async function runSiteSurveyExtraction(file: File): Promise<{
  locations: ExtractedLocation[];
  equipment: ExtractedEquipment[];
  cables: ExtractedCable[];
  roomDimensions?: string;
  networkInfrastructure?: string;
  powerAvailability?: string;
  accessNotes?: string;
}> {
  // Import the image processing utilities
  const { downscaleImageToBase64 } = await import("./visionAttachments");
  const { base64Data, mimeType } = await downscaleImageToBase64(file);

  const response = await runVisionContextAnalysis({
    fileName: file.name,
    mimeType,
    base64Data,
    hint: `Extract structured site survey data from this image. Return JSON with:
- locations: array of {name, type (table/display-wall/room-rack/ceiling/etc), notes}
- equipment: array of {name, category (Source/Display/Transmitter/Receiver/Control/Speaker/Camera), location (which location it's at), ports (list of visible ports), notes}
- cables: array of {fromEquipment, toEquipment, transport (hdmi/hdbaset/network/usb/etc), estimatedLengthMetres, notes}
- roomDimensions: string describing room size if visible
- networkInfrastructure: notes about visible network equipment
- powerAvailability: notes about visible power outlets
- accessNotes: notes about access challenges

Be specific about equipment names and positions. Estimate cable lengths based on visible distances.`,
  });

  return parseExtractionResult(response.data);
}

function parseExtractionResult(data: unknown): {
  locations: ExtractedLocation[];
  equipment: ExtractedEquipment[];
  cables: ExtractedCable[];
  roomDimensions?: string;
  networkInfrastructure?: string;
  powerAvailability?: string;
  accessNotes?: string;
} {
  if (!data || typeof data !== "object") {
    return { locations: [], equipment: [], cables: [] };
  }

  const record = data as Record<string, unknown>;

  return {
    locations: parseLocations(record.locations),
    equipment: parseEquipment(record.equipment),
    cables: parseCables(record.cables),
    roomDimensions: typeof record.roomDimensions === "string" ? record.roomDimensions : undefined,
    networkInfrastructure: typeof record.networkInfrastructure === "string" ? record.networkInfrastructure : undefined,
    powerAvailability: typeof record.powerAvailability === "string" ? record.powerAvailability : undefined,
    accessNotes: typeof record.accessNotes === "string" ? record.accessNotes : undefined,
  };
}

function parseLocations(value: unknown): ExtractedLocation[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ExtractedLocation | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!name) return null;

      return {
        name,
        type: typeof record.type === "string" ? record.type : undefined,
        notes: typeof record.notes === "string" ? record.notes : undefined,
        confidence: typeof record.confidence === "number" ? record.confidence : 0.5,
      };
    })
    .filter((item): item is ExtractedLocation => item !== null);
}

function parseEquipment(value: unknown): ExtractedEquipment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ExtractedEquipment | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!name) return null;

      return {
        name,
        category: typeof record.category === "string" ? record.category : "Unknown",
        location: typeof record.location === "string" ? record.location : undefined,
        ports: Array.isArray(record.ports) ? record.ports.filter((p): p is string => typeof p === "string") : undefined,
        notes: typeof record.notes === "string" ? record.notes : undefined,
        confidence: typeof record.confidence === "number" ? record.confidence : 0.5,
      };
    })
    .filter((item): item is ExtractedEquipment => item !== null);
}

function parseCables(value: unknown): ExtractedCable[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): ExtractedCable | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const fromEquipment = typeof record.fromEquipment === "string" ? record.fromEquipment.trim() : "";
      const toEquipment = typeof record.toEquipment === "string" ? record.toEquipment.trim() : "";
      if (!fromEquipment || !toEquipment) return null;

      return {
        fromEquipment,
        toEquipment,
        transport: typeof record.transport === "string" ? record.transport : undefined,
        estimatedLengthMetres: typeof record.estimatedLengthMetres === "number" ? record.estimatedLengthMetres : undefined,
        notes: typeof record.notes === "string" ? record.notes : undefined,
        confidence: typeof record.confidence === "number" ? record.confidence : 0.5,
      };
    })
    .filter((item): item is ExtractedCable => item !== null);
}

/* ──────────────────────────────────────────────
   Apply extracted data to topology
   ────────────────────────────────────────────── */

export type PhotoExtractionMapping = {
  locationsToCreate: ExtractedLocation[];
  equipmentToCreate: ExtractedEquipment[];
  cablesToCreate: ExtractedCable[];
  locationNameToId: Map<string, string>;
  equipmentNameToId: Map<string, string>;
};

export function mapExtractionToTopology(
  extraction: SiteSurveyPhotoResult,
  existingLocationNames: string[],
  existingEquipmentNames: string[],
): PhotoExtractionMapping {
  const locationNameToId = new Map<string, string>();
  const equipmentNameToId = new Map<string, string>();

  // Filter out locations/equipment that already exist
  const existingLocations = new Set(existingLocationNames.map((n) => n.toLowerCase()));
  const existingEquipment = new Set(existingEquipmentNames.map((n) => n.toLowerCase()));

  const locationsToCreate = extraction.locations.filter((loc) => {
    if (existingLocations.has(loc.name.toLowerCase())) {
      return false;
    }
    return true;
  });

  const equipmentToCreate = extraction.equipment.filter((eq) => {
    if (existingEquipment.has(eq.name.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Cables reference equipment names - only include if both endpoints exist or will be created
  const allEquipmentNames = new Set([
    ...existingEquipmentNames.map((n) => n.toLowerCase()),
    ...equipmentToCreate.map((n) => n.name.toLowerCase()),
  ]);

  const cablesToCreate = extraction.cables.filter((cable) => {
    const fromExists = allEquipmentNames.has(cable.fromEquipment.toLowerCase());
    const toExists = allEquipmentNames.has(cable.toEquipment.toLowerCase());
    return fromExists && toExists;
  });

  return {
    locationsToCreate,
    equipmentToCreate,
    cablesToCreate,
    locationNameToId,
    equipmentNameToId,
  };
}
