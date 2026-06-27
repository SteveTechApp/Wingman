export type TemplateDiscoverySeed = {
  templateId: string;
  source: "Templates";
  application: string;
  vertical: string;
  roomType: string;
  physicalScale: string;
  confidence: "assumed" | "partially-confirmed" | "confirmed";
  editableAssumptions: {
    displayCount?: number;
    sourceCount?: number;
    zoneCount?: number;
    sourceLocation?: string;
    displayLocation?: string;
    videoResolution?: string;
    transport?: string;
    productFamily?: string;
    usbRequired?: boolean;
    usbNotes?: string;
    audioNeed?: string;
    controlNeed?: string;
    networkNeed?: string;
    budgetLevel?: string;
  };
  likelySources: string[];
  likelyDisplays: string[];
  wyrestormDirection: string;
  productDirection: string[];
  dependencies: string[];
  missingInformation: string[];
  nextQuestions: string[];
};

export const TEMPLATE_DISCOVERY_SEEDS: Record<string, TemplateDiscoverySeed> = {
  "hospitality-sportsbar-nhd100": {
    templateId: "hospitality-sportsbar-nhd100",
    source: "Templates",
    application: "Sports bar AV distribution",
    vertical: "Hospitality",
    roomType: "Sports bar / multi-zone venue",
    physicalScale: "Medium to large venue with multiple viewing areas",
    confidence: "assumed",
    editableAssumptions: {
      displayCount: 12,
      sourceCount: 4,
      zoneCount: 4,
      sourceLocation: "Central AV rack or manager's office",
      displayLocation: "Distributed around bar, seating and event areas",
      videoResolution: "4K HDMI sources assumed",
      transport: "AV-over-IP",
      productFamily: "NetworkHD 100",
      usbRequired: false,
      usbNotes: "No USB assumed for sports bar TV distribution unless PCs or interactive displays are added.",
      audioNeed: "Zoned venue audio to be confirmed.",
      controlNeed: "Simple staff control with presets or source selection by zone.",
      networkNeed: "Managed 1GbE switching with multicast/IGMP support.",
      budgetLevel: "Cost-sensitive commercial venue"
    },
    likelySources: [
      "Satellite / set-top boxes",
      "IPTV receivers",
      "Digital signage player",
      "Local media player or PC"
    ],
    likelyDisplays: [
      "Bar area TVs",
      "Dining/seating area TVs",
      "Large feature display",
      "Optional multiview display"
    ],
    wyrestormDirection: "Use NetworkHD 100 for cost-effective flexible routing where multiple sources need to feed multiple venue displays.",
    productDirection: [
      "NetworkHD 100 source encoders",
      "NetworkHD 100 display receivers",
      "NHD-CTL-PRO v2",
      "Optional NHD-150-RX where multiview is needed"
    ],
    dependencies: [
      "Managed network switch",
      "Display count confirmation",
      "Source count confirmation",
      "Control interface",
      "Audio zoning review"
    ],
    missingInformation: [
      "Final number of displays",
      "Final number and type of sources",
      "Cable/network routes",
      "Control method",
      "Audio routing requirement"
    ],
    nextQuestions: [
      "How many screens are required across the venue?",
      "How many different sources need to be shown at the same time?",
      "Are the screens grouped into zones such as bar, lounge, restaurant and private room?",
      "Does staff need simple presets such as Match Day, Normal Trading and Private Event?",
      "Is there an existing managed network switch, or does the AV system need its own switch?"
    ]
  },

  "control-room-nhd600-command-led": {
    templateId: "control-room-nhd600-command-led",
    source: "Templates",
    application: "Command and control room",
    vertical: "Control room",
    roomType: "Large command and control room",
    physicalScale: "Large operations room with command positions and LED wall",
    confidence: "assumed",
    editableAssumptions: {
      displayCount: 1,
      sourceCount: 8,
      zoneCount: 3,
      sourceLocation: "Central rack / technical area",
      displayLocation: "Large LED wall via NovaStar processor plus gold and silver command positions",
      videoResolution: "High-performance 4K source routing assumed",
      transport: "10G AV-over-IP",
      productFamily: "NetworkHD 600",
      usbRequired: true,
      usbNotes: "USB host control required for selected data sources and command positions.",
      audioNeed: "Operational audio requirement to be confirmed.",
      controlNeed: "Priority control for gold and silver command positions.",
      networkNeed: "10G managed AV network required.",
      budgetLevel: "Premium / mission-critical"
    },
    likelySources: [
      "Command PCs",
      "Data visualisation PCs",
      "Security or situational feeds",
      "Operator workstations",
      "External HDMI feeds"
    ],
    likelyDisplays: [
      "Large LED wall through NovaStar processor",
      "Gold command position displays",
      "Silver command position displays"
    ],
    wyrestormDirection: "Use NetworkHD 600 for the main room where high performance, low latency and premium source routing are required.",
    productDirection: [
      "NetworkHD 600 endpoints",
      "NHD-CTL-PRO v2",
      "10G managed switch",
      "NovaStar LED processor feed"
    ],
    dependencies: [
      "NovaStar processor input design",
      "10G network design",
      "USB host/control workflow",
      "Operator permissions",
      "LED wall resolution/scaling validation"
    ],
    missingInformation: [
      "Exact number of data sources",
      "Exact number of operator displays",
      "NovaStar input configuration",
      "USB control mapping",
      "Gold and silver command position control rules"
    ],
    nextQuestions: [
      "How many source PCs and data feeds need to be routed?",
      "Does the NovaStar processor need one canvas feed or multiple HDMI feeds?",
      "How many displays are at the gold and silver command positions?",
      "Which sources require USB host control?",
      "Do gold and silver positions have different control permissions?"
    ]
  },

  "security-office-nhd100-monitoring": {
    templateId: "security-office-nhd100-monitoring",
    source: "Templates",
    application: "Security office monitoring",
    vertical: "Control room",
    roomType: "Security monitoring room",
    physicalScale: "Small to medium monitoring room",
    confidence: "assumed",
    editableAssumptions: {
      displayCount: 2,
      sourceCount: 4,
      zoneCount: 1,
      sourceLocation: "Security rack or local source area",
      displayLocation: "Security office monitoring displays",
      videoResolution: "4K HDMI source monitoring assumed",
      transport: "1GbE AV-over-IP",
      productFamily: "NetworkHD 100",
      usbRequired: false,
      usbNotes: "No USB assumed unless operators need keyboard/mouse control of sources.",
      audioNeed: "Usually view-focused; audio monitoring to be confirmed.",
      controlNeed: "Security staff source/layout selection.",
      networkNeed: "Managed 1GbE switching with multicast/IGMP support.",
      budgetLevel: "Cost-effective monitoring"
    },
    likelySources: [
      "CCTV overview feed",
      "Security PC",
      "Access control PC",
      "Main control room handoff feed"
    ],
    likelyDisplays: [
      "Security office multiview display",
      "Optional second monitoring display"
    ],
    wyrestormDirection: "Use NHD-124-TX and NHD-150-RX as a NetworkHD 100 monitoring subsystem. Do not mix directly with NetworkHD 500 or 600 endpoint routing.",
    productDirection: [
      "NHD-124-TX",
      "NHD-150-RX",
      "NHD-CTL-PRO v2"
    ],
    dependencies: [
      "Managed 1GbE switch",
      "Multiview layout confirmation",
      "Security office control method",
      "HDMI handoff if monitoring another NetworkHD series"
    ],
    missingInformation: [
      "Number of security sources",
      "Number of monitoring displays",
      "Required multiview layouts",
      "Whether sources are local or handed off from another system"
    ],
    nextQuestions: [
      "How many feeds does the security office need to monitor?",
      "Does the NHD-150-RX need fixed multiview layouts or user-selectable views?",
      "Are the monitored sources local to the security office?",
      "Does the security office need any USB control, or view-only monitoring?",
      "Is this a standalone NetworkHD 100 system or fed from the main control room?"
    ]
  },

  "ops-centre-50pc-nhd500-kvm": {
    templateId: "ops-centre-50pc-nhd500-kvm",
    source: "Templates",
    application: "Operations centre USB-KVM",
    vertical: "Control room",
    roomType: "Control desk operations centre",
    physicalScale: "Large centralised PC and operator monitoring system",
    confidence: "assumed",
    editableAssumptions: {
      displayCount: 12,
      sourceCount: 50,
      zoneCount: 2,
      sourceLocation: "Central PC rack",
      displayLocation: "Control desk monitors",
      videoResolution: "4K60 operator display routing assumed",
      transport: "1GbE AV-over-IP",
      productFamily: "NetworkHD 500",
      usbRequired: true,
      usbNotes: "Four operator positions require USB-KVM control over selected centralised PCs.",
      audioNeed: "Audio requirement to be confirmed per operator or view-only display.",
      controlNeed: "Operator source selection and USB-KVM routing via controlled presets or UI.",
      networkNeed: "Managed 1GbE switching sized for 50 encoders and 12 receivers.",
      budgetLevel: "Professional control room"
    },
    likelySources: [
      "50 centralised PCs with USB host",
      "Optional supervisor PC",
      "Optional data visualisation source"
    ],
    likelyDisplays: [
      "4 USB-KVM operator monitors",
      "8 view-only monitoring displays"
    ],
    wyrestormDirection: "Use NetworkHD 500 for centralised PC routing with USB-KVM to selected operator positions and view-only receiver endpoints for monitoring displays.",
    productDirection: [
      "NHD-500-TX x50",
      "NHD-500-E-RX x8",
      "NHD-500-RX x4 assumed for USB-KVM positions",
      "NHD-CTL-PRO v2"
    ],
    dependencies: [
      "1GbE managed network switching",
      "USB routing design",
      "Operator permission model",
      "Rack power/cooling",
      "Structured patching",
      "Control interface"
    ],
    missingInformation: [
      "Whether all users can access all 50 PCs",
      "USB device types required",
      "Operator monitor layout",
      "View-only display routing behaviour",
      "Preset and permission requirements"
    ],
    nextQuestions: [
      "Do all four KVM users need access to all 50 PCs?",
      "Are the four KVM positions single-monitor or multi-monitor workstations?",
      "What USB devices are required at each operator position?",
      "Are the eight view-only displays fixed or freely routable?",
      "Are permissions required to restrict which users can control which PCs?"
    ]
  }
};

export function getTemplateDiscoverySeed(templateId: string): TemplateDiscoverySeed | null {
  return TEMPLATE_DISCOVERY_SEEDS[templateId] ?? null;
}