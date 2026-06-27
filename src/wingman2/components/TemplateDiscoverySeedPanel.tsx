import { useEffect, useMemo, useState } from "react";
import type { TemplateDiscoverySeed } from "../lib/templateDiscoverySeeds";

const TEMPLATE_SEED_KEY = "wingman:template-discovery-seed";
const TEMPLATE_UPDATED_SEED_KEY = "wingman:template-discovery-seed-updated";
const TEMPLATE_PACK_KEY = "wingman:template-solution-pack";
const PROPOSAL_SEED_KEY = "wingman:proposal-seed-from-template";

type Assumptions = TemplateDiscoverySeed["editableAssumptions"];

type BomLine = {
  qty: string;
  item: string;
  role: string;
  notes: string;
};

type ProposalPack = {
  source: "Template Solution Builder";
  templateId: string;
  application: string;
  vertical: string;
  roomType: string;
  assumptions: Assumptions;
  executiveSummary: string;
  technicalSummary: string;
  equipmentOverview: string;
  schematicText: string;
  wyrestormBom: BomLine[];
  projectScopeItems: BomLine[];
};

type CompleteProfile = {
  application?: string;
  roomType?: string;
  physicalScale?: string;
  assumptions: Required<Assumptions>;
  likelySources: string[];
  likelyDisplays: string[];
  wyrestormDirection: string;
  productDirection: string[];
  dependencies: string[];
};

const completeProfiles: Record<string, CompleteProfile> = {
  "corp-boardroom-nhd500": {
    application: "Executive boardroom AV system",
    roomType: "Boardroom / divisible meeting room",
    physicalScale: "Medium to large corporate meeting space",
    assumptions: {
      displayCount: 3,
      sourceCount: 6,
      zoneCount: 2,
      sourceLocation: "Boardroom table inputs and local AV rack",
      displayLocation: "Main presentation display, confidence display and secondary room display",
      videoResolution: "4K60 presentation and conferencing video",
      transport: "NetworkHD 500 AV-over-IP",
      productFamily: "NetworkHD 500",
      usbRequired: true,
      usbNotes: "USB routing supports room cameras, conferencing peripherals and user device workflows.",
      audioNeed: "Room audio to be integrated with the conferencing or DSP system.",
      controlNeed: "Simple room presets for presentation, video call and divisible-room operation.",
      networkNeed: "Managed 1GbE AV network sized for NetworkHD 500 traffic.",
      budgetLevel: "Premium corporate meeting room"
    },
    likelySources: ["USB-C laptop input", "HDMI laptop input", "Room PC", "Wireless presentation source", "Video conferencing appliance", "Media player"],
    likelyDisplays: ["Main room display", "Confidence monitor", "Secondary display"],
    wyrestormDirection: "NetworkHD 500 provides flexible 4K routing, strong USB workflow support and expansion capacity for a premium boardroom environment.",
    productDirection: ["NHD-500-TX source endpoints", "NHD-500-RX display endpoints", "NHD-CTL-PRO v2"],
    dependencies: ["Managed AV network", "Room displays", "USB camera/audio peripherals", "Control interface", "Audio DSP"]
  },

  "corp-huddle-byod": {
    application: "Small BYOD meeting room",
    roomType: "Small meeting room / huddle space",
    physicalScale: "Small meeting room for 4-6 users",
    assumptions: {
      displayCount: 1,
      sourceCount: 2,
      zoneCount: 1,
      sourceLocation: "Meeting table user position",
      displayLocation: "Front-of-room display",
      videoResolution: "4K presentation video",
      transport: "Local presentation and USB-C connectivity",
      productFamily: "Apollo / UC presentation",
      usbRequired: true,
      usbNotes: "USB supports camera and speakerphone connection for BYOD meetings.",
      audioNeed: "USB speakerphone or compact room audio device.",
      controlNeed: "Simple user-led laptop connection with minimal room control.",
      networkNeed: "Standard network access for collaboration devices where required.",
      budgetLevel: "Cost-effective small meeting room"
    },
    likelySources: ["User laptop via USB-C", "User laptop via HDMI", "Wireless presentation source"],
    likelyDisplays: ["Front-of-room display"],
    wyrestormDirection: "A compact WyreStorm UC/presentation solution suits a small BYOD room without adding unnecessary AV-over-IP infrastructure.",
    productDirection: ["Apollo / UC presentation solution", "USB peripheral connection path", "Display connection path"],
    dependencies: ["Display", "USB camera/speakerphone", "Table connectivity", "Network access if required"]
  },

  "hospitality-sportsbar-nhd100": {
    application: "Sports bar AV distribution",
    roomType: "Sports bar / multi-zone venue",
    physicalScale: "Medium to large venue with multiple viewing areas",
    assumptions: {
      displayCount: 12,
      sourceCount: 4,
      zoneCount: 4,
      sourceLocation: "Central AV rack or manager's office",
      displayLocation: "Bar area, seating areas and event areas",
      videoResolution: "4K HDMI source distribution",
      transport: "AV-over-IP",
      productFamily: "NetworkHD 100",
      usbRequired: false,
      usbNotes: "USB is not required for standard TV distribution.",
      audioNeed: "Zoned venue audio with local or central audio handoff.",
      controlNeed: "Staff-friendly presets for source selection by zone.",
      networkNeed: "Managed 1GbE network with multicast and IGMP support.",
      budgetLevel: "Commercial venue value-led system"
    },
    likelySources: ["Satellite / set-top boxes", "IPTV receivers", "Digital signage player", "Media player"],
    likelyDisplays: ["Bar area TVs", "Dining or seating area TVs", "Feature display", "Optional multiview display"],
    wyrestormDirection: "NetworkHD 100 provides cost-effective flexible routing for multiple venue sources across multiple display zones.",
    productDirection: ["NetworkHD 100 encoder endpoints", "NetworkHD 100 receiver endpoints", "NHD-CTL-PRO v2", "Optional NHD-150-RX for multiview"],
    dependencies: ["Managed network switch", "Displays and mounting", "Source devices", "Venue audio system", "Staff control interface"]
  },

  "control-room-nhd600-command-led": {
    application: "Command and control room",
    roomType: "Large command and control room",
    physicalScale: "Large operations room with command positions and LED wall",
    assumptions: {
      displayCount: 8,
      sourceCount: 12,
      zoneCount: 3,
      sourceLocation: "Central equipment rack and operator source positions",
      displayLocation: "Large LED wall, gold command position and silver command position",
      videoResolution: "High-performance 4K source routing",
      transport: "10G AV-over-IP",
      productFamily: "NetworkHD 600",
      usbRequired: true,
      usbNotes: "USB host control is provided for selected operational data sources and command positions.",
      audioNeed: "Operational audio handoff to the room audio or monitoring system.",
      controlNeed: "Priority control profiles for gold and silver command positions.",
      networkNeed: "Dedicated 10G managed AV network for NetworkHD 600 traffic.",
      budgetLevel: "Premium mission-critical environment"
    },
    likelySources: ["Command PCs", "Data visualisation PCs", "Security feeds", "Operator workstations", "External HDMI feeds"],
    likelyDisplays: ["Large LED wall via NovaStar processor", "Gold command position displays", "Silver command position displays"],
    wyrestormDirection: "NetworkHD 600 is used as the high-performance 10G routing layer for critical source routing and LED wall feed management.",
    productDirection: ["NetworkHD 600 endpoints", "NHD-CTL-PRO v2", "10G AV network design"],
    dependencies: ["NovaStar LED processor", "LED wall system", "10G managed switching", "Command PCs", "Operator control interface"]
  },

  "security-office-nhd100-monitoring": {
    application: "Security office monitoring",
    roomType: "Security monitoring room",
    physicalScale: "Small to medium monitoring room",
    assumptions: {
      displayCount: 2,
      sourceCount: 4,
      zoneCount: 1,
      sourceLocation: "Security rack or local source area",
      displayLocation: "Security office monitoring displays",
      videoResolution: "4K HDMI source monitoring",
      transport: "1GbE AV-over-IP",
      productFamily: "NetworkHD 100",
      usbRequired: false,
      usbNotes: "The monitoring system is view-only by default.",
      audioNeed: "Audio monitoring is provided where required by the security workflow.",
      controlNeed: "Security staff source and layout selection.",
      networkNeed: "Managed 1GbE network with multicast and IGMP support.",
      budgetLevel: "Cost-effective monitoring system"
    },
    likelySources: ["CCTV overview feed", "Security PC", "Access control PC", "Main control room handoff feed"],
    likelyDisplays: ["Security office multiview display", "Secondary monitoring display"],
    wyrestormDirection: "NHD-124-TX and NHD-150-RX provide a dedicated NetworkHD 100 monitoring subsystem for the security office.",
    productDirection: ["NHD-124-TX", "NHD-150-RX", "NHD-CTL-PRO v2"],
    dependencies: ["Managed 1GbE switch", "Security monitoring displays", "Security system video feeds", "Control interface"]
  },

  "ops-centre-50pc-nhd500-kvm": {
    application: "Operations centre USB-KVM",
    roomType: "Control desk operations centre",
    physicalScale: "Large centralised PC and operator monitoring system",
    assumptions: {
      displayCount: 12,
      sourceCount: 50,
      zoneCount: 2,
      sourceLocation: "Central PC rack",
      displayLocation: "Control desk monitors",
      videoResolution: "4K60 operator display routing",
      transport: "1GbE AV-over-IP",
      productFamily: "NetworkHD 500",
      usbRequired: true,
      usbNotes: "Four operator positions provide USB-KVM control over selected centralised PCs.",
      audioNeed: "Audio is available where required for operator or monitoring workflows.",
      controlNeed: "Operator source selection and USB-KVM routing via controlled presets or user interface.",
      networkNeed: "Managed 1GbE network sized for 50 encoders and 12 receiver endpoints.",
      budgetLevel: "Professional control room"
    },
    likelySources: ["50 centralised PCs with USB host", "Supervisor PC", "Data visualisation source"],
    likelyDisplays: ["4 USB-KVM operator monitors", "8 view-only monitoring displays"],
    wyrestormDirection: "NetworkHD 500 provides centralised PC routing with USB-KVM to operator positions and view-only display endpoints for monitoring.",
    productDirection: ["NHD-500-TX x50", "NHD-500-E-RX x8", "NHD-500-RX x4", "NHD-CTL-PRO v2"],
    dependencies: ["Managed 1GbE switching", "Centralised PCs", "Operator monitors", "USB peripherals", "Rack power and cooling"]
  }
};

function genericProfile(seed: TemplateDiscoverySeed): CompleteProfile {
  const text = `${seed.templateId} ${seed.application} ${seed.roomType} ${seed.wyrestormDirection}`.toLowerCase();
  const isAvoip = text.includes("networkhd") || text.includes("av-over-ip");
  const isUsb = text.includes("usb") || text.includes("byod") || text.includes("uc") || text.includes("kvm");
  const isWall = text.includes("wall");
  const isVenue = text.includes("bar") || text.includes("venue") || text.includes("hospitality") || text.includes("retail");

  return {
    application: seed.application || "AV system",
    roomType: seed.roomType || "Commercial AV space",
    physicalScale: seed.physicalScale || "Standard commercial installation",
    assumptions: {
      displayCount: isWall ? 4 : isVenue ? 8 : 2,
      sourceCount: isVenue ? 4 : 3,
      zoneCount: isVenue ? 3 : 1,
      sourceLocation: isAvoip ? "Central equipment rack" : "Local room input position",
      displayLocation: isWall ? "Video wall display area" : "Room display location",
      videoResolution: "4K HDMI video",
      transport: isAvoip ? "AV-over-IP" : seed.editableAssumptions.transport || seed.editableAssumptions.productFamily || "Local switching / extension",
      productFamily: seed.editableAssumptions.productFamily || seed.editableAssumptions.transport || "WyreStorm AV solution",
      usbRequired: isUsb,
      usbNotes: isUsb ? "USB is included for conferencing, control or KVM workflow support." : "USB is not required for the base AV distribution workflow.",
      audioNeed: "Audio handoff is included for integration with the room or venue audio system.",
      controlNeed: "User control is provided through simple presets or source selection.",
      networkNeed: isAvoip ? "Managed network infrastructure suitable for AV-over-IP traffic." : "Network access is provided where control or connected devices require it.",
      budgetLevel: "Commercial project budget"
    },
    likelySources: seed.likelySources.length ? seed.likelySources : ["User source device", "Media source", "Room PC"],
    likelyDisplays: seed.likelyDisplays.length ? seed.likelyDisplays : ["Main display", "Secondary display"],
    wyrestormDirection: seed.wyrestormDirection || "WyreStorm provides the AV routing, switching, extension or endpoint layer for the system.",
    productDirection: seed.productDirection.length ? seed.productDirection : ["WyreStorm AV routing/switching equipment"],
    dependencies: seed.dependencies.length ? seed.dependencies : ["Displays", "Source devices", "Network/control infrastructure", "Audio handoff"]
  };
}

function readSeed(): TemplateDiscoverySeed | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(TEMPLATE_UPDATED_SEED_KEY) ?? window.sessionStorage.getItem(TEMPLATE_SEED_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TemplateDiscoverySeed;
  } catch {
    return null;
  }
}

function mergeAssumptions(defaults: Required<Assumptions>, current: Assumptions): Required<Assumptions> {
  return {
    displayCount: current.displayCount ?? defaults.displayCount,
    sourceCount: current.sourceCount ?? defaults.sourceCount,
    zoneCount: current.zoneCount ?? defaults.zoneCount,
    sourceLocation: current.sourceLocation || defaults.sourceLocation,
    displayLocation: current.displayLocation || defaults.displayLocation,
    videoResolution: current.videoResolution || defaults.videoResolution,
    transport: current.transport || defaults.transport,
    productFamily: current.productFamily || defaults.productFamily,
    usbRequired: current.usbRequired ?? defaults.usbRequired,
    usbNotes: current.usbNotes || defaults.usbNotes,
    audioNeed: current.audioNeed || defaults.audioNeed,
    controlNeed: current.controlNeed || defaults.controlNeed,
    networkNeed: current.networkNeed || defaults.networkNeed,
    budgetLevel: current.budgetLevel || defaults.budgetLevel
  };
}

function completeSeed(seed: TemplateDiscoverySeed): TemplateDiscoverySeed {
  const profile = completeProfiles[seed.templateId] ?? genericProfile(seed);

  return {
    ...seed,
    application: profile.application ?? seed.application,
    roomType: profile.roomType ?? seed.roomType,
    physicalScale: profile.physicalScale ?? seed.physicalScale,
    confidence: seed.confidence === "confirmed" ? "confirmed" : "partially-confirmed",
    editableAssumptions: mergeAssumptions(profile.assumptions, seed.editableAssumptions),
    likelySources: seed.likelySources.length ? seed.likelySources : profile.likelySources,
    likelyDisplays: seed.likelyDisplays.length ? seed.likelyDisplays : profile.likelyDisplays,
    wyrestormDirection: seed.wyrestormDirection || profile.wyrestormDirection,
    productDirection: seed.productDirection.length ? seed.productDirection : profile.productDirection,
    dependencies: seed.dependencies.length ? seed.dependencies : profile.dependencies,
    missingInformation: [],
    nextQuestions: []
  };
}

function writeSeed(seed: TemplateDiscoverySeed): void {
  window.sessionStorage.setItem(TEMPLATE_UPDATED_SEED_KEY, JSON.stringify(seed));
  window.sessionStorage.setItem(TEMPLATE_SEED_KEY, JSON.stringify(seed));
}

function valueText(value: string | number | boolean | undefined): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value ?? "");
}

function qty(value: string | number | boolean | undefined): string {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "1";
}

function isNetworkHdFamily(productFamily: string): boolean {
  return productFamily.toLowerCase().includes("networkhd") || productFamily.toLowerCase().includes("nhd-");
}

function isNetworkHd100(productFamily: string): boolean {
  return productFamily.toLowerCase().includes("networkhd 100") || productFamily.toLowerCase().includes("nhd-124") || productFamily.toLowerCase().includes("nhd-150");
}

function isNetworkHd500(productFamily: string): boolean {
  return productFamily.toLowerCase().includes("networkhd 500") || productFamily.toLowerCase().includes("nhd-500");
}

function isNetworkHd600(productFamily: string): boolean {
  return productFamily.toLowerCase().includes("networkhd 600") || productFamily.toLowerCase().includes("nhd-600");
}

function isMatrixFamily(productFamily: string, transport: string): boolean {
  const text = `${productFamily} ${transport}`.toLowerCase();
  return text.includes("matrix") || text.includes("mx-");
}

function isPresentationFamily(productFamily: string, transport: string): boolean {
  const text = `${productFamily} ${transport}`.toLowerCase();
  return text.includes("apollo") || text.includes("uc") || text.includes("presentation") || text.includes("byod");
}

function isHdbasetFamily(productFamily: string, transport: string): boolean {
  const text = `${productFamily} ${transport}`.toLowerCase();
  return text.includes("hdbaset") || text.includes("hdbt");
}

function buildBom(seed: TemplateDiscoverySeed): { wyrestormBom: BomLine[]; projectScopeItems: BomLine[] } {
  const completedSeed = completeSeed(seed);
  const assumptions = completedSeed.editableAssumptions;

  const displayQty = qty(assumptions.displayCount);
  const sourceQty = qty(assumptions.sourceCount);
  const zoneQty = qty(assumptions.zoneCount);
  const family = valueText(assumptions.productFamily);
  const transport = valueText(assumptions.transport);
  const usbRequired = Boolean(assumptions.usbRequired);

  if (seed.templateId === "hospitality-sportsbar-nhd100") {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NetworkHD 100 encoder endpoints", role: "Connect venue source devices to the AV-over-IP system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "NetworkHD 100 receiver endpoints", role: "Provide routed video to each display location.", notes: "Quantity follows the Displays value above." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides routing control, presets and system management.", notes: "Required for NetworkHD control." },
        { qty: "As required", item: "NHD-150-RX", role: "Provides multiview monitoring where multiple sources are required on a single display.", notes: "Use for overview or feature displays where multiview is required." }
      ],
      projectScopeItems: [
        { qty: displayQty, item: "Displays, mounts and local power", role: "Venue display estate.", notes: "Quantity follows the Displays value above." },
        { qty: sourceQty, item: "TV receivers, IPTV, signage or media sources", role: "Content source devices.", notes: "Quantity follows the Sources value above." },
        { qty: "1", item: "Managed 1GbE network switch", role: "Network transport for the AV-over-IP system.", notes: "Switching must support multicast and IGMP requirements." },
        { qty: zoneQty, item: "Venue audio zones", role: "Audio playback and zoning.", notes: "Quantity follows the Zones value above." }
      ]
    };
  }

  if (seed.templateId === "control-room-nhd600-command-led") {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NetworkHD 600 source endpoints", role: "Encode operational source devices into the 10G AV-over-IP system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "NetworkHD 600 display endpoints", role: "Decode routed video to command displays, operator displays or processor feeds.", notes: "Quantity follows the Displays value above." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides NetworkHD routing control and system management.", notes: "Required for NetworkHD control." }
      ],
      projectScopeItems: [
        { qty: "1", item: "NovaStar LED processor", role: "Processes the LED wall canvas.", notes: "Integrated with the WyreStorm source routing layer." },
        { qty: "1", item: "Large LED wall system", role: "Main visual display canvas.", notes: "Included within the wider project scope." },
        { qty: "1", item: "10G managed AV network", role: "Transport layer for NetworkHD 600.", notes: "Designed to support the required 10G AV topology." },
        { qty: sourceQty, item: "Command PCs and data sources", role: "Operational source devices.", notes: "Quantity follows the Sources value above." },
        { qty: zoneQty, item: "Operational control zones", role: "Gold, silver and supporting operator areas.", notes: "Quantity follows the Zones value above." }
      ]
    };
  }

  if (seed.templateId === "security-office-nhd100-monitoring") {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NHD-124-TX", role: "Encodes source feeds for the security monitoring system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "NHD-150-RX", role: "Provides multiview monitoring at the security office displays.", notes: "Quantity follows the Displays value above." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides routing and layout control.", notes: "Required for NetworkHD control." }
      ],
      projectScopeItems: [
        { qty: "1", item: "Managed 1GbE network switch", role: "Transport layer for NetworkHD 100.", notes: "Switching must support multicast AV traffic." },
        { qty: displayQty, item: "Security office displays", role: "Monitoring display estate.", notes: "Quantity follows the Displays value above." },
        { qty: sourceQty, item: "Security system feeds", role: "Source systems for monitoring.", notes: "Quantity follows the Sources value above." }
      ]
    };
  }

  if (seed.templateId === "ops-centre-50pc-nhd500-kvm") {
    const kvmDisplays = Math.min(Number(assumptions.displayCount ?? 12), 4);
    const viewOnlyDisplays = Math.max(Number(assumptions.displayCount ?? 12) - kvmDisplays, 0);

    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NHD-500-TX", role: "Encodes each centralised PC into the NetworkHD 500 system.", notes: "Quantity follows the Sources value above." },
        { qty: String(viewOnlyDisplays), item: "NHD-500-E-RX", role: "Provides view-only display endpoints.", notes: "Calculated from Displays minus 4 USB-KVM positions." },
        { qty: String(kvmDisplays), item: "NHD-500-RX", role: "Provides USB-capable receiver endpoints for operator KVM positions.", notes: "Assumes up to 4 USB-KVM positions from the Displays value." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides routing and USB-KVM workflow management.", notes: "Required for NetworkHD control." }
      ],
      projectScopeItems: [
        { qty: "1", item: "Managed 1GbE AV network", role: "Transport layer for NetworkHD 500.", notes: `Sized for ${sourceQty} encoder(s) and ${displayQty} display endpoint(s).` },
        { qty: sourceQty, item: "Centralised PCs with USB host", role: "Operational source computers.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "Operator and monitoring displays", role: "Control desk display estate.", notes: "Quantity follows the Displays value above." },
        { qty: String(kvmDisplays), item: "Keyboard and mouse peripheral sets", role: "Operator USB-KVM control devices.", notes: "Quantity follows the calculated KVM display count." }
      ]
    };
  }

  if (isNetworkHd600(family)) {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NetworkHD 600 source endpoints", role: "Encode source devices into the 10G AV-over-IP system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "NetworkHD 600 display endpoints", role: "Decode routed video to displays or processor feeds.", notes: "Quantity follows the Displays value above." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides routing control and system management.", notes: "Required for NetworkHD control." }
      ],
      projectScopeItems: [
        { qty: "1", item: "10G managed AV network", role: "Transport layer for NetworkHD 600.", notes: "Designed around the edited source and display counts." },
        { qty: sourceQty, item: "Source devices", role: "Operational or media source equipment.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "Displays or processor inputs", role: "Display estate or wall processor feed points.", notes: "Quantity follows the Displays value above." }
      ]
    };
  }

  if (isNetworkHd500(family)) {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NHD-500-TX", role: "Encode source devices into the NetworkHD 500 system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: usbRequired ? "NHD-500-RX" : "NHD-500-E-RX", role: usbRequired ? "Decode routed video and support USB workflows at display/operator endpoints." : "Decode routed video at view-only display endpoints.", notes: "Quantity follows the Displays value above." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides routing control and system management.", notes: "Required for NetworkHD control." }
      ],
      projectScopeItems: [
        { qty: "1", item: "Managed 1GbE AV network", role: "Transport layer for NetworkHD 500.", notes: "Designed around the edited source and display counts." },
        { qty: sourceQty, item: "Source devices", role: "Operational or media source equipment.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "Displays", role: "Display estate.", notes: "Quantity follows the Displays value above." }
      ]
    };
  }

  if (isNetworkHd100(family) || isNetworkHdFamily(family)) {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "NetworkHD source encoder endpoints", role: "Encode source devices into the AV-over-IP system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "NetworkHD display receiver endpoints", role: "Decode routed video at display endpoints.", notes: "Quantity follows the Displays value above." },
        { qty: "1", item: "NHD-CTL-PRO v2", role: "Provides routing control and system management.", notes: "Required for NetworkHD control." }
      ],
      projectScopeItems: [
        { qty: "1", item: "Managed 1GbE network switch", role: "Transport layer for AV-over-IP.", notes: "Designed around the edited source and display counts." },
        { qty: sourceQty, item: "Source devices", role: "Content source devices.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "Displays", role: "Display estate.", notes: "Quantity follows the Displays value above." },
        { qty: zoneQty, item: "Operating zones", role: "User-facing content zones.", notes: "Quantity follows the Zones value above." }
      ]
    };
  }

  if (isPresentationFamily(family, transport)) {
    return {
      wyrestormBom: [
        { qty: "1", item: family, role: "Provides the room presentation, UC or BYOD connection layer.", notes: "One presentation system is allocated to the room." },
        { qty: displayQty, item: "Display output path", role: "Connects the presentation system to the display estate.", notes: "Quantity follows the Displays value above." },
        { qty: usbRequired ? "1" : "0", item: "USB device path", role: "Connects room USB devices to the user or room system.", notes: usbRequired ? "Included because USB is enabled above." : "Not required for the current assumptions." }
      ],
      projectScopeItems: [
        { qty: displayQty, item: "Room display hardware", role: "Display estate.", notes: "Quantity follows the Displays value above." },
        { qty: sourceQty, item: "User/source devices", role: "Laptop, room PC or collaboration source devices.", notes: "Quantity follows the Sources value above." },
        { qty: usbRequired ? "1" : "0", item: "USB camera/speakerphone", role: "Room conferencing peripherals.", notes: usbRequired ? "Included because USB is enabled above." : "Not required for the current assumptions." }
      ]
    };
  }

  if (isMatrixFamily(family, transport)) {
    return {
      wyrestormBom: [
        { qty: "1", item: family, role: "Provides fixed source-to-display matrix routing.", notes: `${sourceQty} input(s) and ${displayQty} output(s) are assumed from the edited values.` },
        { qty: displayQty, item: "Receiver / display extension endpoints", role: "Extend matrix outputs to display locations where required.", notes: "Quantity follows the Displays value above where extension is required." }
      ],
      projectScopeItems: [
        { qty: sourceQty, item: "Source devices", role: "Content source devices.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "Displays", role: "Display estate.", notes: "Quantity follows the Displays value above." },
        { qty: zoneQty, item: "Operating zones", role: "User-facing content zones.", notes: "Quantity follows the Zones value above." }
      ]
    };
  }

  if (isHdbasetFamily(family, transport)) {
    return {
      wyrestormBom: [
        { qty: sourceQty, item: "HDBaseT source/input path", role: "Connects local source devices into the switching or extension system.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "HDBaseT receiver/display path", role: "Extends video to the display locations.", notes: "Quantity follows the Displays value above." }
      ],
      projectScopeItems: [
        { qty: sourceQty, item: "Source devices", role: "Content source devices.", notes: "Quantity follows the Sources value above." },
        { qty: displayQty, item: "Displays or projectors", role: "Display estate.", notes: "Quantity follows the Displays value above." }
      ]
    };
  }

  return {
    wyrestormBom: [
      { qty: sourceQty, item: `${family} source/input allocation`, role: "WyreStorm source-side equipment or input capacity for the solution.", notes: "Quantity follows the Sources value above." },
      { qty: displayQty, item: `${family} display/output allocation`, role: "WyreStorm display-side equipment or output capacity for the solution.", notes: "Quantity follows the Displays value above." }
    ],
    projectScopeItems: completedSeed.dependencies.map((item) => ({
      qty: "As required",
      item,
      role: "Project delivery item supporting the AV solution.",
      notes: "Included within the wider project scope."
    }))
  };
}
function buildProposalPack(rawSeed: TemplateDiscoverySeed): ProposalPack {
  const seed = completeSeed(rawSeed);
  const assumptions = seed.editableAssumptions;
  const bom = buildBom(seed);

  const executiveSummary = [
    `This solution provides a ${valueText(assumptions.productFamily)} AV system for the ${seed.roomType}.`,
    `The design supports ${valueText(assumptions.sourceCount)} source devices, ${valueText(assumptions.displayCount)} display endpoints and ${valueText(assumptions.zoneCount)} operating zone(s).`,
    `WyreStorm provides the AV routing, endpoint and control layer that connects the source devices to the display estate. Supporting project items such as displays, source devices, network infrastructure, audio systems and mounting are included as project scope items for coordination with the delivery team.`
  ].join(" ");

  const technicalSummary = [
    `Transport approach: ${valueText(assumptions.transport)}.`,
    `WyreStorm platform: ${valueText(assumptions.productFamily)}.`,
    `Source location: ${valueText(assumptions.sourceLocation)}.`,
    `Display location: ${valueText(assumptions.displayLocation)}.`,
    `Video format: ${valueText(assumptions.videoResolution)}.`,
    `USB requirement: ${valueText(assumptions.usbRequired)}. ${valueText(assumptions.usbNotes)}`,
    `Audio approach: ${valueText(assumptions.audioNeed)}`,
    `Control approach: ${valueText(assumptions.controlNeed)}`,
    `Network approach: ${valueText(assumptions.networkNeed)}`
  ].join("\n");

  const equipmentOverview = bom.wyrestormBom.map((line) => `${line.item}: ${line.role} ${line.notes}`).join("\n");

  const schematicText = [
    "Indicative signal flow:",
    `${valueText(assumptions.sourceLocation)} / source devices`,
    "-> WyreStorm source input or encoder layer",
    `-> ${valueText(assumptions.transport)} transport and control layer`,
    "-> WyreStorm receiver or display endpoint layer",
    `-> ${valueText(assumptions.displayLocation)} / display estate`,
    "",
    "Project scope coordination:",
    "- display hardware and mounting",
    "- source devices",
    "- network infrastructure",
    "- rack, power and cabling",
    "- audio system and control integration"
  ].join("\n");

  return {
    source: "Template Solution Builder",
    templateId: seed.templateId,
    application: seed.application,
    vertical: seed.vertical,
    roomType: seed.roomType,
    assumptions,
    executiveSummary,
    technicalSummary,
    equipmentOverview,
    schematicText,
    wyrestormBom: bom.wyrestormBom,
    projectScopeItems: bom.projectScopeItems
  };
}

function TemplateDiscoverySeedPanel() {
  const [seed, setSeed] = useState<TemplateDiscoverySeed | null>(() => {
    const rawSeed = readSeed();
    return rawSeed ? completeSeed(rawSeed) : null;
  });
  const [packCreated, setPackCreated] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const rawSeed = readSeed();

    if (!rawSeed) {
      setSeed(null);
      return;
    }

    const completed = completeSeed(rawSeed);
    setSeed(completed);
    writeSeed(completed);
  }, []);

  const bom = useMemo(() => {
    if (!seed) {
      return { wyrestormBom: [], projectScopeItems: [] };
    }

    return buildBom(seed);
  }, [seed]);

  const pack = useMemo(() => {
    if (!seed) {
      return null;
    }

    return buildProposalPack(seed);
  }, [seed]);

  if (!seed || !pack) {
    return null;
  }

  const assumptions = seed.editableAssumptions;

  const updateAssumption = <Key extends keyof Assumptions>(key: Key, value: Assumptions[Key]) => {
    const nextSeed = completeSeed({
      ...seed,
      confidence: "confirmed",
      editableAssumptions: {
        ...seed.editableAssumptions,
        [key]: value
      }
    });

    setSeed(nextSeed);
    writeSeed(nextSeed);
    setPackCreated(false);
  };

  const savePack = () => {
    const latestPack = buildProposalPack(seed);
    window.sessionStorage.setItem(TEMPLATE_PACK_KEY, JSON.stringify(latestPack));
    window.sessionStorage.setItem(PROPOSAL_SEED_KEY, JSON.stringify(latestPack));
    setPackCreated(true);
  };

  const openProposal = () => {
    savePack();
    window.location.assign("/wingman/proposal");
  };

  const copyText = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const clearSeed = () => {
    window.sessionStorage.removeItem(TEMPLATE_SEED_KEY);
    window.sessionStorage.removeItem(TEMPLATE_UPDATED_SEED_KEY);
    window.sessionStorage.removeItem(TEMPLATE_PACK_KEY);
    window.sessionStorage.removeItem(PROPOSAL_SEED_KEY);
    setSeed(null);
  };

  return (
    <section className="wm-template-solution-builder wingman-surface" aria-label="Solution builder">
      <div className="wm-template-solution-header">
        <div>
          <p className="wm-template-seed-kicker">Solution builder</p>
          <h2>{seed.application}</h2>
          <p>
            This solution is pre-populated with a complete project data set. Edit any values that need to be adjusted,
            then save the revised data or send the completed pack to the proposal section.
          </p>
        </div>

        <div className="wm-template-solution-actions">
          <span>Complete solution</span>
          <button type="button" onClick={savePack}>{packCreated ? "Pack saved" : "Save revised data"}</button>
          <button type="button" onClick={openProposal}>Send to proposal</button>
          <button type="button" onClick={clearSeed}>Clear</button>
        </div>
      </div>

      <div className="wm-template-seed-grid">
        <label><span>Displays</span><input type="number" min={0} value={assumptions.displayCount ?? ""} onChange={(event) => updateAssumption("displayCount", Number(event.target.value))} /></label>
        <label><span>Sources</span><input type="number" min={0} value={assumptions.sourceCount ?? ""} onChange={(event) => updateAssumption("sourceCount", Number(event.target.value))} /></label>
        <label><span>Zones</span><input type="number" min={0} value={assumptions.zoneCount ?? ""} onChange={(event) => updateAssumption("zoneCount", Number(event.target.value))} /></label>
        <label><span>Product family</span><input value={assumptions.productFamily ?? ""} onChange={(event) => updateAssumption("productFamily", event.target.value)} /></label>
        <label><span>Transport</span><input value={assumptions.transport ?? ""} onChange={(event) => updateAssumption("transport", event.target.value)} /></label>
        <label><span>Resolution</span><input value={assumptions.videoResolution ?? ""} onChange={(event) => updateAssumption("videoResolution", event.target.value)} /></label>
        <label><span>Source location</span><input value={assumptions.sourceLocation ?? ""} onChange={(event) => updateAssumption("sourceLocation", event.target.value)} /></label>
        <label><span>Display location</span><input value={assumptions.displayLocation ?? ""} onChange={(event) => updateAssumption("displayLocation", event.target.value)} /></label>
      </div>

      <div className="wm-template-seed-wide-grid">
        <label>
          <span>USB requirement</span>
          <select value={assumptions.usbRequired ? "yes" : "no"} onChange={(event) => updateAssumption("usbRequired", event.target.value === "yes")}>
            <option value="no">No USB required</option>
            <option value="yes">USB required</option>
          </select>
        </label>
        <label><span>USB notes</span><textarea value={assumptions.usbNotes ?? ""} onChange={(event) => updateAssumption("usbNotes", event.target.value)} /></label>
        <label><span>Audio approach</span><textarea value={assumptions.audioNeed ?? ""} onChange={(event) => updateAssumption("audioNeed", event.target.value)} /></label>
        <label><span>Control approach</span><textarea value={assumptions.controlNeed ?? ""} onChange={(event) => updateAssumption("controlNeed", event.target.value)} /></label>
        <label><span>Network approach</span><textarea value={assumptions.networkNeed ?? ""} onChange={(event) => updateAssumption("networkNeed", event.target.value)} /></label>
      </div>

      <div className="wm-template-pack-grid">
        <article>
          <h3>Executive summary</h3>
          <p>{pack.executiveSummary}</p>
          <button type="button" onClick={() => copyText("Executive summary", pack.executiveSummary)}>{copied === "Executive summary" ? "Copied" : "Copy"}</button>
        </article>

        <article>
          <h3>Technical summary</h3>
          <pre>{pack.technicalSummary}</pre>
          <button type="button" onClick={() => copyText("Technical summary", pack.technicalSummary)}>{copied === "Technical summary" ? "Copied" : "Copy"}</button>
        </article>

        <article>
          <h3>Equipment overview</h3>
          <pre>{pack.equipmentOverview}</pre>
          <button type="button" onClick={() => copyText("Equipment overview", pack.equipmentOverview)}>{copied === "Equipment overview" ? "Copied" : "Copy"}</button>
        </article>

        <article>
          <h3>Schematic / visual brief</h3>
          <pre>{pack.schematicText}</pre>
          <button type="button" onClick={() => copyText("Schematic", pack.schematicText)}>{copied === "Schematic" ? "Copied" : "Copy"}</button>
        </article>
      </div>

      <div className="wm-template-bom-section">
        <div>
          <p className="wm-template-seed-kicker">WyreStorm BoM direction</p>
          <h3>Equipment to include in the WyreStorm section</h3>
        </div>

        <table>
          <thead>
            <tr><th>Qty</th><th>Item</th><th>Role</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {bom.wyrestormBom.map((line) => (
              <tr key={`${line.qty}-${line.item}`}>
                <td>{line.qty}</td>
                <td>{line.item}</td>
                <td>{line.role}</td>
                <td>{line.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="wm-template-bom-section wm-template-project-scope">
        <div>
          <p className="wm-template-seed-kicker">Project scope items</p>
          <h3>Items for coordination within the wider project</h3>
        </div>

        <table>
          <thead>
            <tr><th>Qty</th><th>Item</th><th>Role</th><th>Delivery notes</th></tr>
          </thead>
          <tbody>
            {bom.projectScopeItems.map((line) => (
              <tr key={`${line.qty}-${line.item}`}>
                <td>{line.qty}</td>
                <td>{line.item}</td>
                <td>{line.role}</td>
                <td>{line.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { TemplateDiscoverySeedPanel };
export default TemplateDiscoverySeedPanel;