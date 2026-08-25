/**
 * SuggestedKit — Auto-bundles complementary products based on room model.
 *
 * Goes beyond the basic system bundler by considering:
 * - Room type and application
 * - Source and display counts
 * - UC/conferencing requirements
 * - Audio needs
 * - Control requirements
 * - Cable infrastructure
 *
 * Generates complete "kit" suggestions that reps can add with one click.
 */
import type { StoredProductSelection, StoredDiscoveryBrief } from "../data/projectStore";
import { buildSystemDesign, type SystemSlot, type SystemArchitecture } from "./discoverySystemDesign";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuggestedKitProduct = {
  sku: string;
  name: string;
  role: string;
  quantity: number;
  reason: string;
};

export type SuggestedKit = {
  id: string;
  name: string;
  description: string;
  products: SuggestedKitProduct[];
  totalProducts: number;
  severity: "essential" | "recommended" | "optional";
  category: "signal-path" | "uc-completeness" | "audio" | "control" | "cable" | "complete-system";
  basedOn: string[];
};

export type MissingAccessory = {
  sku: string;
  name: string;
  reason: string;
  severity: "blocker" | "warning";
  pairedWith?: string;
  category: string;
};

// ─── Room Model Helpers ───────────────────────────────────────────────────────

function getRoomType(brief: StoredDiscoveryBrief | null): string {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  return String(room?.application || room?.roomType || "").toLowerCase();
}

function getSourceCount(brief: StoredDiscoveryBrief | null): number {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  const count = room?.sourceCount;
  if (typeof count === "number") return count;
  const match = String(count ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getDisplayCount(brief: StoredDiscoveryBrief | null): number {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  const count = room?.displayCount;
  if (typeof count === "number") return count;
  const match = String(count ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function hasUcRequirement(brief: StoredDiscoveryBrief | null): boolean {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  const ucPurpose = String(room?.ucPurpose || room?.unifiedCommunicationsRequirement || "").toLowerCase();
  return ucPurpose.includes("video-conferencing") || ucPurpose.includes("teams") || ucPurpose.includes("zoom") || ucPurpose.includes("byod");
}

function hasCameraRequirement(brief: StoredDiscoveryBrief | null): boolean {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  const cameraNeeds = room?.cameraNeeds;
  if (Array.isArray(cameraNeeds)) return cameraNeeds.length > 0;
  const summary = String(room?.unifiedCommunicationsSummary || "").toLowerCase();
  return summary.includes("camera") || summary.includes("ptz");
}

function hasAudioRequirement(brief: StoredDiscoveryBrief | null): boolean {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  const audio = String(room?.audioNeeds || room?.audioPath || "").toLowerCase();
  return audio.includes("room-speakers") || audio.includes("amplifier") || audio.includes("distributed");
}

function hasControlRequirement(brief: StoredDiscoveryBrief | null): boolean {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  const control = String(room?.controlNeeds || "").toLowerCase();
  return control.includes("touch-panel") || control.includes("keypad") || control.includes("control");
}

function getScale(brief: StoredDiscoveryBrief | null): string {
  const room = brief?.roomModel as Record<string, unknown> | undefined;
  return String(room?.scale || room?.roomSize || "").toLowerCase();
}

// ─── Kit Generation ───────────────────────────────────────────────────────────

/**
 * Generate suggested kits based on the room model and existing products.
 */
export function generateSuggestedKits(
  products: StoredProductSelection[],
  brief: StoredDiscoveryBrief | null,
): SuggestedKit[] {
  const kits: SuggestedKit[] = [];
  const skus = products.map((p) => String(p.sku || "").toUpperCase());
  const roomType = getRoomType(brief);
  const sourceCount = getSourceCount(brief);
  const displayCount = getDisplayCount(brief);

  // 1. Meeting Room Kit
  if (roomType.includes("meeting-room") || roomType.includes("boardroom")) {
    const meetingKit = buildMeetingRoomKit(skus, brief);
    if (meetingKit) kits.push(meetingKit);
  }

  // 2. Classroom Kit
  if (roomType.includes("classroom") || roomType.includes("teaching")) {
    const classroomKit = buildClassroomKit(skus, brief);
    if (classroomKit) kits.push(classroomKit);
  }

  // 3. UC/Conferencing Kit
  if (hasUcRequirement(brief)) {
    const ucKit = buildUcKit(skus, brief);
    if (ucKit) kits.push(ucKit);
  }

  // 4. AVoIP Distribution Kit
  if (roomType.includes("distributed") || roomType.includes("av-over-ip") || roomType.includes("multi-room")) {
    const avoipKit = buildAvoipKit(skus, brief);
    if (avoipKit) kits.push(avoipKit);
  }

  // 5. Hospitality Kit
  if (roomType.includes("hospitality") || roomType.includes("bar") || roomType.includes("venue")) {
    const hospitalityKit = buildHospitalityKit(skus, brief);
    if (hospitalityKit) kits.push(hospitalityKit);
  }

  // 6. Complete System Kit (always offer if gaps exist)
  const completeKit = buildCompleteSystemKit(skus, brief);
  if (completeKit) kits.push(completeKit);

  return kits;
}

// ─── Specific Kit Builders ────────────────────────────────────────────────────

function buildMeetingRoomKit(skus: string[], brief: StoredDiscoveryBrief | null): SuggestedKit | null {
  const products: SuggestedKitProduct[] = [];
  const basedOn: string[] = ["Meeting room application"];

  // Presentation switcher
  if (!skus.some((s) => /^SW-/.test(s))) {
    products.push({
      sku: "SW-620-TX-W",
      name: "WyreStorm Presentation Switcher",
      role: "Source switching and presentation",
      quantity: 1,
      reason: "Handles USB-C and HDMI laptop inputs for meeting room presentation",
    });
    basedOn.push("No presentation switcher in BOM");
  }

  // Display extender
  if (!skus.some((s) => /^RX-/.test(s) || /^NHD-.*-RX/.test(s))) {
    products.push({
      sku: "RX-100",
      name: "HDBaseT Receiver",
      role: "Display extension",
      quantity: getDisplayCount(brief) || 1,
      reason: "Carries the signal to the display over Cat6",
    });
    basedOn.push("No display receiver in BOM");
  }

  // Control
  if (!skus.some((s) => /^SYN-/.test(s))) {
    products.push({
      sku: "SYN-KEY10",
      name: "Room Control Keypad",
      role: "User control interface",
      quantity: 1,
      reason: "Gives users a simple way to start meetings and select sources",
    });
    basedOn.push("No control interface in BOM");
  }

  if (products.length === 0) return null;

  return {
    id: "meeting-room-kit",
    name: "Meeting Room Essentials",
    description: "Core products for a complete meeting room system",
    products,
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    severity: "recommended",
    category: "complete-system",
    basedOn,
  };
}

function buildClassroomKit(skus: string[], brief: StoredDiscoveryBrief | null): SuggestedKit | null {
  const products: SuggestedKitProduct[] = [];
  const basedOn: string[] = ["Classroom / teaching application"];

  // Presentation switcher
  if (!skus.some((s) => /^SW-/.test(s))) {
    products.push({
      sku: "SW-620-TX-W",
      name: "WyreStorm Presentation Switcher",
      role: "Source switching",
      quantity: 1,
      reason: "Handles teacher laptop and room PC inputs",
    });
    basedOn.push("No presentation switcher in BOM");
  }

  // Display extension
  if (!skus.some((s) => /^RX-/.test(s) || /^NHD-.*-RX/.test(s))) {
    products.push({
      sku: "RX-100",
      name: "HDBaseT Receiver",
      role: "Projector / display extension",
      quantity: 1,
      reason: "Carries signal to projector or display at the front of the room",
    });
    basedOn.push("No display receiver in BOM");
  }

  // Audio
  if (!skus.some((s) => /^AMP-/.test(s) || /SPEAKER|SPK/i.test(s))) {
    products.push({
      sku: "AMP-2120",
      name: "2-Channel Amplifier",
      role: "Room audio amplification",
      quantity: 1,
      reason: "Drives ceiling or wall speakers for lesson audio",
    });
    basedOn.push("No audio amplification in BOM");
  }

  // Control
  if (!skus.some((s) => /^SYN-/.test(s))) {
    products.push({
      sku: "SYN-KEY10",
      name: "Room Control Keypad",
      role: "Teacher control interface",
      quantity: 1,
      reason: "Simple source selection and volume control for teachers",
    });
    basedOn.push("No control interface in BOM");
  }

  if (products.length === 0) return null;

  return {
    id: "classroom-kit",
    name: "Classroom Essentials",
    description: "Core products for a teaching space system",
    products,
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    severity: "recommended",
    category: "complete-system",
    basedOn,
  };
}

function buildUcKit(skus: string[], brief: StoredDiscoveryBrief | null): SuggestedKit | null {
  const products: SuggestedKitProduct[] = [];
  const basedOn: string[] = ["UC / conferencing requirement"];

  // UC soundbar or speakerphone
  if (!skus.some((s) => /^APO-/.test(s) || /^HALO-VX/.test(s))) {
    products.push({
      sku: "HALO-VX10",
      name: "HALO VX10 Video Bar",
      role: "UC all-in-one device",
      quantity: 1,
      reason: "Integrated camera, microphone and speaker for Teams/Zoom meetings",
    });
    basedOn.push("No UC device in BOM");
  }

  // Camera (if needed and not included in UC device)
  const hasUcDevice = skus.some((s) => /^APO-/.test(s) || /^HALO-VX/.test(s));
  const hasCamera = skus.some((s) => /^CAM-/.test(s));
  if (hasUcDevice && !hasCamera && hasCameraRequirement(brief)) {
    const needsExternalCamera = skus.some((s) => /^APO-210/.test(s));
    if (needsExternalCamera) {
      products.push({
        sku: "CAM-210-PTZ",
        name: "WyreStorm PTZ Camera",
        role: "Room camera for video conferencing",
        quantity: 1,
        reason: "The APO-210-UC requires an external camera for video calls",
      });
      basedOn.push("UC device needs external camera");
    }
  }

  // Microphone (if needed)
  const hasMicrophone = skus.some((s) => /^MIC-/.test(s) || /microphone/i.test(s));
  if (!hasMicrophone && hasUcDevice) {
    const ucPurpose = String((brief?.roomModel as Record<string, unknown>)?.ucPurpose || "").toLowerCase();
    if (ucPurpose.includes("microphone") || ucPurpose.includes("ceiling")) {
      products.push({
        sku: "MIC-500",
        name: "Ceiling Microphone Array",
        role: "Room microphone capture",
        quantity: 1,
        reason: "Captures audio from around the room for conferencing",
      });
      basedOn.push("Microphone requirement detected");
    }
  }

  // Control
  if (!skus.some((s) => /^SYN-/.test(s))) {
    products.push({
      sku: "SYN-KEY10",
      name: "Room Control Keypad",
      role: "Call control and volume",
      quantity: 1,
      reason: "Start/end calls and adjust volume without touching the UC app",
    });
    basedOn.push("No call control in BOM");
  }

  if (products.length === 0) return null;

  return {
    id: "uc-kit",
    name: "UC Conferencing Kit",
    description: "Products for a complete video conferencing setup",
    products,
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    severity: "essential",
    category: "uc-completeness",
    basedOn,
  };
}

function buildAvoipKit(skus: string[], brief: StoredDiscoveryBrief | null): SuggestedKit | null {
  const products: SuggestedKitProduct[] = [];
  const basedOn: string[] = ["AVoIP / distributed video requirement"];

  // NetworkHD controller
  if (skus.some((s) => /^NHD-/.test(s)) && !skus.some((s) => /^NHD-CTL/.test(s))) {
    products.push({
      sku: "NHD-CTL",
      name: "NetworkHD Controller",
      role: "AVoIP system management",
      quantity: 1,
      reason: "Required to manage and control NetworkHD endpoints",
    });
    basedOn.push("NetworkHD endpoints without controller");
  }

  // Network switch
  if (!skus.some((s) => /^SW-.*-NET/i.test(s) || /switch/i.test(s))) {
    products.push({
      sku: "SWITCH-AV",
      name: "AV Network Switch",
      role: "Dedicated AV network infrastructure",
      quantity: 1,
      reason: "Provides the network backbone for AVoIP distribution",
    });
    basedOn.push("No network switch detected");
  }

  // Control
  if (!skus.some((s) => /^SYN-/.test(s) || /^NHD-CTL/.test(s))) {
    products.push({
      sku: "SYN-KEY10",
      name: "System Control",
      role: "User interface for source/display selection",
      quantity: 1,
      reason: "Allows users to select sources and displays in an AVoIP system",
    });
    basedOn.push("No control interface in BOM");
  }

  if (products.length === 0) return null;

  return {
    id: "avoip-kit",
    name: "AVoIP Distribution Kit",
    description: "Essential components for NetworkHD distributed video",
    products,
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    severity: "essential",
    category: "signal-path",
    basedOn,
  };
}

function buildHospitalityKit(skus: string[], brief: StoredDiscoveryBrief | null): SuggestedKit | null {
  const products: SuggestedKitProduct[] = [];
  const basedOn: string[] = ["Hospitality / bar / venue application"];

  // Matrix switcher
  if (!skus.some((s) => /^MX-/.test(s)) && !skus.some((s) => /^NHD-/.test(s))) {
    const displayCount = getDisplayCount(brief);
    if (displayCount > 2) {
      products.push({
        sku: "MX-0808-KIT",
        name: "8x8 HDBaseT Matrix Kit",
        role: "Source-to-display routing",
        quantity: 1,
        reason: `Routes ${displayCount} sources to ${displayCount} displays across the venue`,
      });
      basedOn.push("Multiple displays without routing");
    }
  }

  // Audio
  if (!skus.some((s) => /^AMP-/.test(s)) && hasAudioRequirement(brief)) {
    products.push({
      sku: "AMP-2120",
      name: "2-Channel Amplifier",
      role: "Background music and announcement audio",
      quantity: 1,
      reason: "Drives background music speakers across zones",
    });
    basedOn.push("Audio requirement without amplification");
  }

  // Control
  if (!skus.some((s) => /^SYN-/.test(s))) {
    products.push({
      sku: "SYN-KEY10",
      name: "Staff Control Keypad",
      role: "Simple staff control interface",
      quantity: getDisplayCount(brief) || 2,
      reason: "Gives staff simple source and volume control at each TV",
    });
    basedOn.push("No staff control in BOM");
  }

  if (products.length === 0) return null;

  return {
    id: "hospitality-kit",
    name: "Hospitality Venue Kit",
    description: "Core products for hospitality TV distribution",
    products,
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    severity: "recommended",
    category: "complete-system",
    basedOn,
  };
}

function buildCompleteSystemKit(skus: string[], brief: StoredDiscoveryBrief | null): SuggestedKit | null {
  const products: SuggestedKitProduct[] = [];
  const basedOn: string[] = ["System completeness check"];

  // Check for missing cable infrastructure
  const hasCables = skus.some((s) => /CABLE|CAT6|HDMI/i.test(s));
  const needsCables = brief?.missingInformation?.some((item) =>
    item.toLowerCase().includes("cable") || item.toLowerCase().includes("cat6"),
  );
  if (!hasCables && needsCables) {
    products.push({
      sku: "CABLE-INFRA",
      name: "Cable Infrastructure",
      role: "Physical connectivity",
      quantity: 1,
      reason: "Confirm cable types and lengths before quoting",
    });
    basedOn.push("Cable infrastructure needs confirmation");
  }

  // Check for missing network
  const hasNetwork = skus.some((s) => /^NHD-/.test(s) || /NETWORK/i.test(s));
  const needsNetwork = brief?.missingInformation?.some((item) =>
    item.toLowerCase().includes("network"),
  );
  if (!hasNetwork && needsNetwork) {
    products.push({
      sku: "NETWORK-INFRA",
      name: "Network Infrastructure",
      role: "Network connectivity",
      quantity: 1,
      reason: "Confirm network availability and VLAN requirements",
    });
    basedOn.push("Network infrastructure needs confirmation");
  }

  if (products.length === 0) return null;

  return {
    id: "complete-system-kit",
    name: "System Completeness Check",
    description: "Items requiring confirmation before quoting",
    products,
    totalProducts: products.reduce((sum, p) => sum + p.quantity, 0),
    severity: "optional",
    category: "complete-system",
    basedOn,
  };
}

// ─── Missing Accessory Detection ──────────────────────────────────────────────

/**
 * Detect missing accessories that would block a complete quote.
 */
export function detectMissingAccessories(
  products: StoredProductSelection[],
  brief: StoredDiscoveryBrief | null,
): MissingAccessory[] {
  const accessories: MissingAccessory[] = [];
  const skus = products.map((p) => String(p.sku || "").toUpperCase());

  // 1. TX without RX (blocker)
  for (const sku of skus) {
    if (/^NHD-\d+-TX/.test(sku) && !/TRX/.test(sku)) {
      const family = sku.match(/^NHD-(\d+)/)?.[1];
      const hasMatchingRx = skus.some((s) => /^NHD-.*-RX/.test(s) && s.includes(family ?? ""));
      if (!hasMatchingRx) {
        accessories.push({
          sku: family ? `NHD-${family}-RX` : "NHD-120-RX",
          name: "NetworkHD Decoder",
          reason: "Encoder requires matching decoder to complete signal path",
          severity: "blocker",
          pairedWith: sku,
          category: "signal-path",
        });
      }
    }
  }

  // 2. HDBaseT TX without RX (blocker)
  for (const sku of skus) {
    if (/^(?:EX|TX)-\d+/.test(sku) && !/^NHD-/.test(sku) && /-TX$/.test(sku)) {
      const hasMatchingRx = skus.some((s) => s === sku.replace(/-TX$/, "-RX"));
      if (!hasMatchingRx && !sku.includes("-KIT")) {
        accessories.push({
          sku: sku.replace(/-TX$/, "-RX"),
          name: "Matching HDBaseT Receiver",
          reason: "Transmitter requires paired receiver",
          severity: "blocker",
          pairedWith: sku,
          category: "signal-path",
        });
      }
    }
  }

  // 3. Amplifier without speakers (warning)
  if (skus.some((s) => /^AMP-/.test(s)) && !skus.some((s) => /SPEAKER|SPK|LS-/i.test(s))) {
    accessories.push({
      sku: "SPEAKER-REQ",
      name: "Speaker Load",
      reason: "Amplifier selected but no speakers confirmed",
      severity: "warning",
      category: "audio",
    });
  }

  // 4. UC without camera (warning)
  if (hasUcRequirement(brief) && !skus.some((s) => /^CAM-/.test(s))) {
    const needsExternalCamera = skus.some((s) => /^APO-210/.test(s));
    if (needsExternalCamera) {
      accessories.push({
        sku: "CAM-210-PTZ",
        name: "PTZ Camera",
        reason: "UC device requires external camera for video conferencing",
        severity: "blocker",
        category: "uc-completeness",
      });
    }
  }

  // 5. NetworkHD without controller (warning)
  if (skus.some((s) => /^NHD-/.test(s)) && !skus.some((s) => /^NHD-CTL/.test(s))) {
    accessories.push({
      sku: "NHD-CTL",
      name: "NetworkHD Controller",
      reason: "NetworkHD endpoints require controller for management",
      severity: "warning",
      category: "control",
    });
  }

  return accessories;
}
