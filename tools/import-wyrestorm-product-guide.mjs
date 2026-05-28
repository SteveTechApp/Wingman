import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_PDF_PATH = "C:/Users/steve/Downloads/Product.pdf";
const PRODUCT_DB_PATH = path.join(projectRoot, "data", "product-intelligence-db.json");
const WYRESTORM_SOURCE_PATH = path.join(projectRoot, "data", "wyrestorm-product-intelligence.json");
const PROFILE_VERSION = "wyrestorm-product-manager-v1";
const GUIDE_SOURCE_LABEL = "2026 WyreStorm Product Guide PDF";

const NON_PRODUCT_SKU_KEYS = new Set([
  "AVA",
  "CABHAOC",
  "DEEMBEDDED",
  "DVII",
  "HDR10",
  "MULTIZONE",
  "MXH2A",
  "MXKIT",
  "MXV70",
  "NEXTGEN",
  "NHD500",
  "PWRUK",
  "RJ45",
  "RS232",
  "SLHDR1",
  "UBPX1000ES",
  "USBA",
  "USBB",
  "USBC",
  "VW1",
]);

const GUIDE_SKU_ALIASES = new Map([
  ["APOVX20UCV2", "APO-VX20-UC"],
  ["EXP4KUHD1M", "EXP-4KUHD-1.0"],
  ["EXP8KUHD0", "EXP-8KUHD-0.5"],
  ["EXP8KUHD05M", "EXP-8KUHD-0.5"],
  ["EX60USB20", "EX-60-USB2"],
  ["MX0808KIT", "MX-0808-KIT-V2"],
  ["MXV0808H2A70", "MXV-0808-H2A-70-V3"],
  ["NHD500IWTXV2", "NHD-500-IW-TX"],
  ["NHD500RXV2", "NHD-500-RX"],
  ["NHD500TXV2", "NHD-500-TX"],
]);

const MANUAL_GUIDE_SKUS = [
  "FOCUS 200 PRO",
  "FOCUS-200-PRO",
  "HALO 80",
  "IDB-PWR-UK",
  "IDB-PWR-SCH",
];

const GUIDE_ONLY_RECORDS = {
  "AMP-2120": {
    title: "Advanced 2 or 4 Channel Amplifier",
    description:
      "Advanced 2 or 4 channel amplifier with flexible 240W output, built-in DSP processing, analog and digital I/O, LAN / RS-232 control, professional protection, and trigger input for paging or automation.",
    technologyType: "Audio / Control",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["Analog audio", "Network", "Control"],
    signalDomains: ["Audio", "Control", "Network", "Power"],
    connectors: ["Speaker output", "Mic/Line input", "Line output", "LAN", "RS-232", "Trigger input"],
    features: [
      "240W flexible amplifier output",
      "Built-in DSP processing",
      "Mic/Line and line-level audio I/O",
      "LAN and RS-232 control",
      "Paging and automation trigger input",
      "Over-temperature, overload and over-voltage protection",
    ],
    applications: ["Meeting room", "Classroom / lecture", "Room audio", "Installed speaker reinforcement"],
    classification: ["Audio", "Amplification", "DSP amplifier", "Network amplifier"],
    subClassifications: ["amplifier", "dsp", "room-audio"],
    pageReferences: [14],
  },
  "CAB-UAOC-15": {
    title: "USB 3.2 Active Optical Extension Cable",
    description:
      "15m USB 3.2 active optical extension cable with Type-A male to Type-A female connections, up to 10Gbps data transfer, backward USB 2.0 compatibility, and remote USB device power up to 5V 900mA.",
    technologyType: "Cable",
    productRole: "cable",
    catalogVisibility: "request-only",
    transports: ["USB 3.x", "USB 2.0", "USB"],
    signalDomains: ["USB", "Power"],
    connectors: ["USB-A male", "USB-A female"],
    features: ["15m USB extension", "USB 3.2 Gen 2 up to 10Gbps", "Backward compatible with USB 2.0", "Remote USB device power"],
    applications: ["USB extension", "Hybrid conferencing", "Meeting room", "Camera or peripheral extension"],
    classification: ["Cable", "USB cable", "Active optical USB extension", "Cable"],
    subClassifications: ["cable", "usb-extension", "active-optical"],
    pageReferences: [11],
  },
  "EX-60D-KVM": {
    title: "60m Dual HDMI KVM Extender",
    description:
      "Dual HDMI KVM extender for 1080p dual-display workstation environments, extending dual HDMI signals up to 60m over Cat cable with integrated USB control and bi-directional PoC.",
    technologyType: "Extender / HDBaseT",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["UTP", "HDMI", "USB 2.0", "PoC"],
    signalDomains: ["Video", "USB", "Power"],
    connectors: ["2x HDMI input", "2x HDMI output", "USB host", "4x remote USB-A", "Cat cable"],
    features: ["Dual HDMI extension", "60m Cat cable transport", "Integrated USB KVM", "Bi-directional PoC", "Dual-display workstation support"],
    applications: ["KVM extension", "Control room", "Operator workstation", "Dual-display workstation"],
    classification: ["Video", "Extension", "KVM extender", "Dual HDMI KVM extender"],
    subClassifications: ["extender", "kvm", "dual-display"],
    pageReferences: [28, 30],
  },
  "IDB-200-NA": {
    title: "Flip-Up In-Desk Box with USB-C, HDMI, USB Charging and Mains",
    description:
      "Compact flip-up in-desk connectivity box with mains, USB charging, HDMI and USB-C passthrough for table or desk presentation connectivity.",
    technologyType: "Accessory",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["HDMI", "USB-C", "USB", "Power"],
    signalDomains: ["Video", "USB", "Power"],
    connectors: ["Mains", "USB charging", "HDMI", "USB-C"],
    features: ["Flip-top in-desk connectivity", "HDMI and USB-C 4K UHD passthrough", "USB Type-A charging", "Compact table installation"],
    applications: ["Meeting room", "Boardroom", "Training room", "Table connectivity"],
    classification: ["Accessory / Other", "Accessory", "In-desk connectivity", "Table box"],
    subClassifications: ["in-desk", "connectivity", "table-box"],
    pageReferences: [12],
  },
  "IDB-400-EU-C": {
    title: "Flip-Up In-Desk Box with USB-C, HDMI, USB Charging and RJ-45",
    description:
      "Flip-up in-desk connectivity box with mains, USB charging, two HDMI connections, USB-C and RJ-45 passthrough for meeting table connectivity.",
    technologyType: "Accessory",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["HDMI", "USB-C", "USB", "Ethernet", "Power"],
    signalDomains: ["Video", "USB", "Network", "Power"],
    connectors: ["Mains", "USB charging", "2x HDMI", "USB-C", "RJ-45"],
    features: ["Flip-up in-desk connectivity", "HDMI and USB-C 4K UHD passthrough", "USB Type-A charging", "RJ-45 passthrough", "Spring-loaded lid"],
    applications: ["Meeting room", "Boardroom", "Training room", "Table connectivity"],
    classification: ["Accessory / Other", "Accessory", "In-desk connectivity", "Table box"],
    subClassifications: ["in-desk", "connectivity", "table-box"],
    pageReferences: [12],
  },
  "IDB-SPINE": {
    title: "Under-Desk Cable Management Spine with Adjustable Height",
    description:
      "Under-desk cable management spine for organizing wires below a table or desk, with adjustable height up to 36 inches and pairing with the IDB in-desk connectivity range.",
    technologyType: "Accessory",
    productRole: "accessory",
    catalogVisibility: "request-only",
    transports: ["Mechanical"],
    signalDomains: ["Mechanical"],
    connectors: [],
    features: ["Under-desk cable management", "Adjustable height up to 36 inches", "Pairs with IDB in-desk connectivity"],
    applications: ["Meeting room", "Boardroom", "Table cable management"],
    classification: ["Accessory / Other", "Accessory", "Cable management", "Under-desk spine"],
    subClassifications: ["accessory", "cable-management", "idb-accessory"],
    pageReferences: [12],
  },
  "IDB-PWR-UK": {
    title: "Optional Wieland to UK Power Cable for IDB MS Models",
    description: "Optional Wieland to UK 2m power cable for compatible IDB MS in-desk connectivity models.",
    technologyType: "Accessory",
    productRole: "accessory",
    catalogVisibility: "request-only",
    transports: ["Power"],
    signalDomains: ["Power"],
    connectors: ["Wieland", "UK mains"],
    features: ["Optional 2m power cable", "For compatible IDB MS in-desk models"],
    applications: ["Meeting room", "Boardroom", "Table connectivity power accessory"],
    classification: ["Accessory / Other", "Accessory", "Power accessory", "IDB power cable"],
    subClassifications: ["accessory", "power", "idb-accessory"],
    pageReferences: [12],
  },
  "IDB-PWR-SCH": {
    title: "Optional Wieland to Schuko Power Cable for IDB MS Models",
    description: "Optional Wieland to Schuko 2m power cable for compatible IDB MS in-desk connectivity models.",
    technologyType: "Accessory",
    productRole: "accessory",
    catalogVisibility: "request-only",
    transports: ["Power"],
    signalDomains: ["Power"],
    connectors: ["Wieland", "Schuko mains"],
    features: ["Optional 2m power cable", "For compatible IDB MS in-desk models"],
    applications: ["Meeting room", "Boardroom", "Table connectivity power accessory"],
    classification: ["Accessory / Other", "Accessory", "Power accessory", "IDB power cable"],
    subClassifications: ["accessory", "power", "idb-accessory"],
    pageReferences: [12],
  },
  "MV-0401-PRO": {
    title: "4-Input 4K60 Multiview Processor for NetworkHD",
    description:
      "4-input 4K60 multiview processor supporting up to four inputs simultaneously, standalone multiview operation, NetworkHD 400 / 500 integration, and NetworkHD Touch compatibility.",
    technologyType: "Video Wall / Multiview",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["HDMI", "NetworkHD"],
    signalDomains: ["Video", "Processing", "Control"],
    connectors: ["4x video inputs", "Multiview output"],
    features: ["4K60 source support", "Multiview processing up to 4 inputs", "Standalone multiview processor", "NetworkHD 400 / 500 compatible", "NetworkHD Touch compatible"],
    applications: ["Control room", "Training room", "Monitoring", "Multiview display"],
    classification: ["Video", "Multiview", "NetworkHD multiview processor", "Multiview processor"],
    subClassifications: ["multiview", "video-processor", "networkhd"],
    pageReferences: [7],
  },
  "MXV-0808-H2A-MK2": {
    title: "4K60 8x8 HDMI Matrix",
    description:
      "8x8 HDMI matrix supporting up to 4K60 4:4:4 pure HDMI content, automatic 4K to 1080p downscaling on each output, balanced analog and S/PDIF audio de-embedding from input or ARC, CEC power triggering via API, and A/V mute.",
    technologyType: "Matrix",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["HDMI", "Analog audio", "S/PDIF", "CEC", "Control"],
    signalDomains: ["Video", "Audio", "Control"],
    connectors: ["8x HDMI input", "8x HDMI output", "Balanced analog audio", "S/PDIF audio"],
    features: ["8x8 HDMI matrix switching", "4K60 4:4:4 HDMI", "Automatic 4K to 1080p downscaling", "Audio de-embed from input or ARC", "CEC triggering via API", "A/V mute"],
    applications: ["Residential AV", "Education", "Commercial AV", "HDMI matrix distribution"],
    classification: ["Video", "Matrix switching", "HDMI matrix", "8x8 HDMI matrix"],
    subClassifications: ["matrix", "hdmi", "audio-deembed"],
    pageReferences: [22],
  },
  "NHD-124-RACK-1U": {
    title: "1U 2-Slot Rack Mount for NetworkHD NHD-124-TX",
    description:
      "1U shallow-depth rack mount designed to support two NHD-124-TX quad encoders, with front or rear facing mounting options and proper thermal dissipation.",
    technologyType: "Accessory",
    productRole: "rack-mount",
    catalogVisibility: "request-only",
    transports: ["Mechanical"],
    signalDomains: ["Mechanical"],
    connectors: [],
    features: ["1U rack mount", "Supports two NHD-124-TX quad encoders", "Front or rear facing mounting", "Thermal dissipation support"],
    applications: ["AV rack", "NetworkHD installation", "Rack mounting"],
    classification: ["Accessory / Other", "Rack accessory", "NetworkHD rack mount", "Rack mount"],
    subClassifications: ["rack-mount", "networkhd-accessory"],
    pageReferences: [7],
  },
  "NHD-600-E-TX": {
    title: "4K60 4:4:4 SDVoE Encoder with Zero-Latency Video and PoE+ Power",
    description:
      "NetworkHD 600 Series SDVoE encoder supporting pixel-perfect 4K60 4:4:4 8-bit transmissions with Dolby Vision / HDR compatibility, zero-latency A/V transmission and PoE+ power.",
    technologyType: "AVoIP",
    productRole: "endpoint-hardware",
    catalogVisibility: "default",
    transports: ["SDVoE", "10GbE", "HDMI", "PoE+"],
    signalDomains: ["Video", "Audio", "Network", "Power"],
    connectors: ["HDMI input", "10GbE network", "PoE+"],
    features: ["SDVoE encoding", "Zero-latency video", "4K60 4:4:4", "Dolby Vision / HDR compatibility", "PoE+ power"],
    applications: ["AV over IP", "NetworkHD 600", "High-performance video distribution", "Zero-latency routing"],
    classification: ["Video", "AV over IP", "NetworkHD 600", "SDVoE encoder"],
    subClassifications: ["avoip", "encoder", "sdvoe", "networkhd-600"],
    pageReferences: [6],
  },
  "NHD-600-E-RX": {
    title: "4K60 4:4:4 SDVoE Decoder with Zero-Latency Video and PoE+ Power",
    description:
      "NetworkHD 600 Series SDVoE decoder supporting pixel-perfect 4K60 4:4:4 8-bit transmissions with Dolby Vision / HDR compatibility, zero-latency A/V transmission and PoE+ power.",
    technologyType: "AVoIP",
    productRole: "endpoint-hardware",
    catalogVisibility: "default",
    transports: ["SDVoE", "10GbE", "HDMI", "PoE+"],
    signalDomains: ["Video", "Audio", "Network", "Power"],
    connectors: ["HDMI output", "10GbE network", "PoE+"],
    features: ["SDVoE decoding", "Zero-latency video", "4K60 4:4:4", "Dolby Vision / HDR compatibility", "PoE+ power"],
    applications: ["AV over IP", "NetworkHD 600", "High-performance video distribution", "Zero-latency routing"],
    classification: ["Video", "AV over IP", "NetworkHD 600", "SDVoE decoder"],
    subClassifications: ["avoip", "decoder", "sdvoe", "networkhd-600"],
    pageReferences: [6],
  },
  "SWX-100-IW-UX": {
    title: "100m 4K60 HDBaseT 3.0 In-Wall KVM Extender with USB-C and HDMI",
    description:
      "HDBaseT 3.0 in-wall KVM extender supporting 4K60 4:4:4 over 100m, HDMI and USB-C source input, local USB host, three remote USB-A ports, audio de-embed and one-way PoH+.",
    technologyType: "Extender / HDBaseT",
    productRole: "primary-hardware",
    catalogVisibility: "default",
    transports: ["HDBaseT 3.0", "HDMI", "USB-C", "USB 2.0", "PoH+"],
    signalDomains: ["Video", "USB", "Audio", "Network", "Power"],
    connectors: ["HDMI input", "USB-C input", "HDMI output", "USB host", "3x remote USB-A", "Audio output"],
    features: ["100m HDBaseT 3.0 KVM extension", "4K60 4:4:4", "HDMI and USB-C inputs", "USB host built into USB-C input", "3x remote USB-A", "Audio output", "One-way PoH+"],
    applications: ["KVM extension", "Meeting room", "Education", "USB-C presentation extension"],
    classification: ["Video", "Extension", "HDBaseT 3.0 KVM extender", "In-wall KVM extender"],
    subClassifications: ["extender", "hdbaset-3", "kvm", "usb-c"],
    pageReferences: [30],
  },
};

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const pdfArg = process.argv.find((arg) => arg.startsWith("--pdf="));
  const pdfPath = pdfArg ? pdfArg.slice("--pdf=".length) : process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : DEFAULT_PDF_PATH;
  return { dryRun, pdfPath };
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function unique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values.flat().map(clean).filter(Boolean)) {
    const key = lower(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function mergePageNumbers(existingPages, newPages) {
  const pages = [...(existingPages || []), ...(newPages || [])]
    .map((page) => Number(page))
    .filter((page) => Number.isFinite(page));

  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

function normaliseSkuKey(value) {
  return upper(value)
    .replace(/\s+V(\d+)$/g, "-V$1")
    .replace(/[^A-Z0-9]/g, "");
}

function normaliseGuideSku(value) {
  return upper(value)
    .replace(/\s+V(\d+)$/g, "-V$1")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function familyForTechnologyType(technologyType) {
  const familyByType = {
    AVoIP: "NetworkHD AVoIP",
    "AVoIP Infrastructure": "NetworkHD AVoIP",
    Accessory: "Accessory",
    "Audio / Control": "Audio / Control",
    Cable: "Cable",
    "Camera / Capture": "Camera / Capture",
    "Extender / HDBaseT": "Extender / HDBaseT",
    Matrix: "Matrix Switcher",
    "Presentation / Room Core": "Presentation / Room Core",
    "Splitter / Distribution": "Splitter / Distribution",
    "Unified Comms": "Unified Comms",
    "Video Wall / Multiview": "Video Processor",
  };

  return familyByType[technologyType] || technologyType || "WyreStorm";
}

function routingClassForTechnologyType(technologyType) {
  if (technologyType === "AVoIP") return "AV over IP";
  if (technologyType === "Matrix") return "Matrix";
  if (technologyType === "Extender / HDBaseT") return "Extension";
  if (technologyType === "Presentation / Room Core") return "Presentation";
  if (technologyType === "Video Wall / Multiview") return "Video wall / multiview";
  if (technologyType === "Splitter / Distribution") return "Distribution";
  return "Other";
}

function guideSalesLanguage(sku, title, applications) {
  const primaryApplication = applications[0] || "AV project";

  return {
    voiceVersion: "wingman-sales-language-v1",
    headline: `${sku}: ${title}`,
    plainEnglishSummary: `Use this when the ${primaryApplication.toLowerCase()} needs this specific WyreStorm capability from the 2026 product guide.`,
    customerValue: "It keeps the recommendation aligned with the latest WyreStorm guide and gives the sales person a credible opening position.",
    realWorldApplication: applications.join(", "),
    salespersonCue: "Confirm the room requirement first, then use this product as a WyreStorm-fit option rather than leading with the SKU.",
    talkTrack: [
      "Open with the customer outcome before naming the product.",
      "Use the product guide facts as confidence builders, then hand deeper specification detail to a WyreStorm expert when needed.",
    ],
    discoveryPrompts: [
      "What is the room or application?",
      "What signal types, distances and USB needs are involved?",
      "Is this a simple point solution or part of a wider system?",
    ],
    positioningNotes: ["Position from application fit, not a generic SKU list."],
    avoidPositioningAs: ["Do not treat product-guide inclusion alone as a complete design recommendation."],
    marketApplications: applications,
    voices: {
      endUser: {
        label: "End user",
        audience: "Customer stakeholder",
        value: "Keeps the system easier to use and aligned with the room outcome.",
        opener: "This is the WyreStorm option I would consider if the room needs that workflow.",
      },
      systemIntegrator: {
        label: "System integrator",
        audience: "Dealer / installer",
        value: "Gives you a current WyreStorm path with the key installation constraints visible.",
        opener: "This guide entry points us toward the right architecture, then we can validate the exact design details.",
      },
      consultant: {
        label: "Technical consultant",
        audience: "Consultant / designer",
        value: "Provides a current product-guide reference for the technical design discussion.",
        opener: "We can use this as the WyreStorm basis of design, subject to final signal path and control validation.",
      },
    },
  };
}

function buildClassification(entry) {
  const classificationPath = entry.classification;
  const [primaryCategory, category, subCategory, productType] = classificationPath;

  return {
    taxonomyVersion: PROFILE_VERSION,
    primaryCategory,
    category: category || primaryCategory,
    subCategory: subCategory || "",
    productType: productType || entry.title,
    productSubType: "",
    systemRole: entry.systemRole || entry.title,
    applicationRole: entry.applications[0] || "WyreStorm product guide item",
    transportClass: entry.transports,
    signalDomains: entry.signalDomains,
    subClassifications: entry.subClassifications,
    classificationPath,
    confidence: 0.84,
    productRole: entry.productRole,
    catalogVisibility: entry.catalogVisibility,
  };
}

function buildTechnicalProfile(sku, entry, pdfMeta) {
  const featureObjects = entry.features.map((feature) => ({
    label: feature,
    group: entry.technologyType,
    evidence: `${GUIDE_SOURCE_LABEL}, page ${entry.pageReferences.join(", ")}`,
  }));

  return {
    profileVersion: PROFILE_VERSION,
    sourceQuality: {
      officialPageStatus: "product-guide-pdf",
      livePageUsed: false,
      productGuidePdf: path.basename(pdfMeta.path),
      productGuideLastModified: pdfMeta.lastModified,
      productGuidePages: entry.pageReferences,
    },
    signalDomains: entry.signalDomains,
    transports: entry.transports,
    io: {
      ports: entry.connectors.map((connector) => ({
        count: 1,
        connector,
        direction: "unspecified",
        category: lower(connector).includes("audio") ? "audio" : lower(connector).includes("usb") ? "usb" : "other",
        evidence: connector,
      })),
      video: [],
      audio: [],
      usb: [],
      network: [],
      control: [],
      power: [],
    },
    features: featureObjects,
    applications: entry.applications,
    processing: entry.features.filter((feature) => /scal|switch|multiview|matrix|wall|dsp|kvm/i.test(feature)),
    salesLanguage: guideSalesLanguage(sku, entry.title, entry.applications),
  };
}

function buildGuideOnlyRecord(sku, entry, pdfMeta) {
  const productClassification = buildClassification(entry);
  const technicalProfile = buildTechnicalProfile(sku, entry, pdfMeta);
  const salesLanguage = guideSalesLanguage(sku, entry.title, entry.applications);
  const tags = unique([
    entry.technologyType,
    familyForTechnologyType(entry.technologyType),
    ...entry.transports,
    ...entry.signalDomains,
    ...entry.features,
    ...entry.applications,
    ...entry.classification,
    ...entry.subClassifications,
    GUIDE_SOURCE_LABEL,
  ]);

  return {
    brand: "WyreStorm",
    vendorType: "wyrestorm",
    sku,
    name: entry.title,
    title: entry.title,
    description: entry.description,
    summary: entry.description,
    category: entry.technologyType,
    family: familyForTechnologyType(entry.technologyType),
    technologies: unique([entry.technologyType, ...entry.transports, ...entry.signalDomains]),
    connectors: entry.connectors,
    features: unique([entry.technologyType, ...entry.features]),
    applications: entry.applications,
    tags,
    routingClass: routingClassForTechnologyType(entry.technologyType),
    source: GUIDE_SOURCE_LABEL,
    productRole: entry.productRole,
    catalogVisibility: entry.catalogVisibility,
    technologyType: entry.technologyType,
    hardwareType: entry.technologyType,
    productClassification,
    classificationPath: productClassification.classificationPath,
    subClassifications: productClassification.subClassifications,
    technicalProfile,
    salesLanguage,
  };
}

function cloneSourceRecordForFinder(sourceProduct, guideMeta) {
  const technologyType = clean(sourceProduct.technologyType || sourceProduct.hardwareType || sourceProduct.category || "Accessory");
  const classification = sourceProduct.productClassification && typeof sourceProduct.productClassification === "object"
    ? sourceProduct.productClassification
    : null;
  const profile = sourceProduct.technicalProfile && typeof sourceProduct.technicalProfile === "object"
    ? {
        ...sourceProduct.technicalProfile,
        sourceQuality: {
          ...(sourceProduct.technicalProfile.sourceQuality || {}),
          productGuidePdf: path.basename(guideMeta.pdf.path),
          productGuideLastModified: guideMeta.pdf.lastModified,
          productGuidePages: guideMeta.pages,
        },
      }
    : null;

  return {
    ...sourceProduct,
    brand: sourceProduct.brand || "WyreStorm",
    vendorType: sourceProduct.vendorType || "wyrestorm",
    name: clean(sourceProduct.name || sourceProduct.title || sourceProduct.sku),
    title: clean(sourceProduct.title || sourceProduct.name || sourceProduct.sku),
    description: clean(sourceProduct.description || sourceProduct.summary || sourceProduct.title),
    summary: clean(sourceProduct.summary || sourceProduct.description || sourceProduct.title),
    category: clean(sourceProduct.category || technologyType),
    family: clean(sourceProduct.family || familyForTechnologyType(technologyType)),
    technologies: unique([...(sourceProduct.technologies || []), technologyType, ...(profile?.transports || []), ...(classification?.signalDomains || [])]),
    connectors: unique([...(sourceProduct.connectors || []), ...((profile?.io?.ports || []).map((port) => port.connector))]),
    features: unique([...(sourceProduct.features || []), technologyType, ...(classification?.classificationPath || []), ...((profile?.features || []).map((feature) => feature.label || feature))]),
    applications: unique([...(sourceProduct.applications || []), ...(profile?.applications || [])]),
    tags: unique([...(sourceProduct.tags || []), GUIDE_SOURCE_LABEL, ...(guideMeta.rawSkus || []), ...(classification?.classificationPath || [])]),
    routingClass: sourceProduct.routingClass || routingClassForTechnologyType(technologyType),
    source: unique([sourceProduct.source || "WyreStorm official product intelligence", GUIDE_SOURCE_LABEL]).join(" | "),
    productRole: sourceProduct.productRole || classification?.productRole || "primary-hardware",
    catalogVisibility: sourceProduct.catalogVisibility || classification?.catalogVisibility || "default",
    technologyType,
    hardwareType: sourceProduct.hardwareType || technologyType,
    productClassification: classification,
    classificationPath: Array.isArray(sourceProduct.classificationPath) ? sourceProduct.classificationPath : classification?.classificationPath || [],
    subClassifications: Array.isArray(sourceProduct.subClassifications) ? sourceProduct.subClassifications : classification?.subClassifications || [],
    technicalProfile: profile,
    salesLanguage: sourceProduct.salesLanguage || profile?.salesLanguage || null,
  };
}

async function extractGuideSkus(pdfPath) {
  const data = await fs.readFile(pdfPath);
  const pdf = await getDocument({ data: new Uint8Array(data), disableWorker: true }).promise;
  const rawHits = new Map();
  const skuPattern = /\b(?:[A-Z]{2,8}|[A-Z]{1,5}\d)(?:-[A-Z0-9]+(?:\.[0-9]+)?[A-Z0-9]*){1,8}(?:\s+v\d+)?\b/g;

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const text = content.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();

    for (const match of text.matchAll(skuPattern)) {
      addGuideHit(rawHits, match[0], pageNo);
    }

    for (const manualSku of MANUAL_GUIDE_SKUS) {
      if (text.includes(manualSku)) addGuideHit(rawHits, manualSku, pageNo);
    }
  }

  return { pageCount: pdf.numPages, rawHits };
}

function addGuideHit(rawHits, rawSku, pageNo) {
  const cleaned = clean(rawSku)
    .replace(/\s+v(\d+)$/i, " v$1")
    .replace(/\s+/g, " ");

  if (!cleaned) return;

  const key = normaliseSkuKey(cleaned);
  if (NON_PRODUCT_SKU_KEYS.has(key)) return;

  if (!rawHits.has(cleaned)) rawHits.set(cleaned, new Set());
  rawHits.get(cleaned).add(pageNo);
}

function buildGuideEntries(rawHits) {
  const entriesByCanonical = new Map();

  for (const [rawSku, pageSet] of rawHits.entries()) {
    const rawKey = normaliseSkuKey(rawSku);
    const canonicalSku = GUIDE_SKU_ALIASES.get(rawKey) || normaliseGuideSku(rawSku);
    const canonicalKey = normaliseSkuKey(canonicalSku);

    if (NON_PRODUCT_SKU_KEYS.has(canonicalKey)) continue;

    const existing = entriesByCanonical.get(canonicalKey) || {
      canonicalSku,
      rawSkus: new Set(),
      pages: new Set(),
    };

    existing.rawSkus.add(rawSku);
    for (const page of pageSet) existing.pages.add(page);
    entriesByCanonical.set(canonicalKey, existing);
  }

  return Array.from(entriesByCanonical.values()).map((entry) => ({
    canonicalSku: entry.canonicalSku,
    canonicalKey: normaliseSkuKey(entry.canonicalSku),
    rawSkus: Array.from(entry.rawSkus).sort(),
    pages: Array.from(entry.pages).sort((a, b) => a - b),
  })).sort((a, b) => a.canonicalSku.localeCompare(b.canonicalSku));
}

function addGuideEvidenceToExisting(record, guideEntry, pdfMeta) {
  const sourceText = clean(record.source || "");
  const source = sourceText.includes(GUIDE_SOURCE_LABEL)
    ? sourceText
    : unique([sourceText, GUIDE_SOURCE_LABEL]).join(" | ");

  return {
    ...record,
    tags: unique([...(record.tags || []), ...guideEntry.rawSkus, GUIDE_SOURCE_LABEL]),
    source,
    technicalProfile: record.technicalProfile && typeof record.technicalProfile === "object"
      ? {
          ...record.technicalProfile,
          sourceQuality: {
            ...(record.technicalProfile.sourceQuality || {}),
            productGuidePdf: path.basename(pdfMeta.path),
            productGuideLastModified: pdfMeta.lastModified,
            productGuidePages: mergePageNumbers(record.technicalProfile.sourceQuality?.productGuidePages, guideEntry.pages),
          },
        }
      : record.technicalProfile,
  };
}

async function main() {
  const { dryRun, pdfPath } = parseArgs();
  const absolutePdfPath = path.resolve(pdfPath);
  const pdfStat = await fs.stat(absolutePdfPath);
  const pdfMeta = {
    path: absolutePdfPath,
    lastModified: pdfStat.mtime.toISOString(),
    sizeBytes: pdfStat.size,
  };

  const [productDbRaw, sourceProducts, extraction] = await Promise.all([
    fs.readFile(PRODUCT_DB_PATH, "utf8").then(JSON.parse),
    fs.readFile(WYRESTORM_SOURCE_PATH, "utf8").then(JSON.parse),
    extractGuideSkus(absolutePdfPath),
  ]);

  const records = Array.isArray(productDbRaw.records) ? productDbRaw.records : [];
  const sourceRecords = Array.isArray(sourceProducts) ? sourceProducts : [];
  const guideEntries = buildGuideEntries(extraction.rawHits);
  const sourceByKey = new Map(sourceRecords.map((record) => [normaliseSkuKey(record.sku), record]));

  const updatedRecords = [...records];
  const updatedSourceRecords = [...sourceRecords];
  const sourceKeys = new Set(sourceRecords.map((record) => normaliseSkuKey(record.sku)));
  const recordIndexByKey = new Map(updatedRecords.map((record, index) => [normaliseSkuKey(record.sku), index]));
  const sourceAdditions = [];
  const guideOnlyAdditions = [];
  const matchedExisting = [];
  const ignoredMissing = [];

  for (const guideEntry of guideEntries) {
    const recordIndex = recordIndexByKey.get(guideEntry.canonicalKey);
    if (recordIndex !== undefined) {
      updatedRecords[recordIndex] = addGuideEvidenceToExisting(updatedRecords[recordIndex], guideEntry, pdfMeta);
      matchedExisting.push(guideEntry.canonicalSku);
      continue;
    }

    const sourceProduct = sourceByKey.get(guideEntry.canonicalKey);
    if (sourceProduct) {
      const newRecord = cloneSourceRecordForFinder(sourceProduct, { pdf: pdfMeta, pages: guideEntry.pages, rawSkus: guideEntry.rawSkus });
      updatedRecords.push(newRecord);
      recordIndexByKey.set(guideEntry.canonicalKey, updatedRecords.length - 1);
      sourceAdditions.push(guideEntry.canonicalSku);
      continue;
    }

    const guideOnly = GUIDE_ONLY_RECORDS[guideEntry.canonicalSku];
    if (guideOnly) {
      const newRecord = buildGuideOnlyRecord(guideEntry.canonicalSku, guideOnly, pdfMeta);
      updatedRecords.push(newRecord);
      recordIndexByKey.set(guideEntry.canonicalKey, updatedRecords.length - 1);
      guideOnlyAdditions.push(guideEntry.canonicalSku);

      if (!sourceKeys.has(guideEntry.canonicalKey)) {
        updatedSourceRecords.push({
          id: guideEntry.canonicalSku,
          url: "",
          role: newRecord.productRole,
          capabilities: newRecord.technologies,
          ...newRecord,
        });
        sourceKeys.add(guideEntry.canonicalKey);
      }
      continue;
    }

    ignoredMissing.push(guideEntry.canonicalSku);
  }

  const importSummary = {
    importedAt: new Date().toISOString(),
    source: GUIDE_SOURCE_LABEL,
    pdfFile: path.basename(pdfMeta.path),
    pdfLastModified: pdfMeta.lastModified,
    pdfSizeBytes: pdfMeta.sizeBytes,
    pageCount: extraction.pageCount,
    guideProductCount: guideEntries.length,
    matchedExistingCount: matchedExisting.length,
    addedFromWyrestormSourceCount: sourceAdditions.length,
    addedFromGuideOnlyCount: guideOnlyAdditions.length,
    ignoredUnmappedCount: ignoredMissing.length,
    addedFromWyrestormSource: sourceAdditions,
    addedFromGuideOnly: guideOnlyAdditions,
    ignoredUnmapped: ignoredMissing,
  };

  const nextDb = {
    ...productDbRaw,
    records: updatedRecords,
    meta: {
      ...(productDbRaw.meta || {}),
      latestProductGuideImport: importSummary,
      uniqueSkuCount: updatedRecords.length,
    },
  };

  console.log("[product-guide-import] Import summary:");
  console.log(JSON.stringify(importSummary, null, 2));

  if (dryRun) {
    console.log("[product-guide-import] Dry run only. No files written.");
    return;
  }

  await fs.writeFile(PRODUCT_DB_PATH, `${JSON.stringify(nextDb, null, 2)}\n`, "utf8");
  await fs.writeFile(WYRESTORM_SOURCE_PATH, `${JSON.stringify(updatedSourceRecords, null, 2)}\n`, "utf8");

  console.log(`[product-guide-import] Wrote ${path.relative(projectRoot, PRODUCT_DB_PATH)}`);
  console.log(`[product-guide-import] Wrote ${path.relative(projectRoot, WYRESTORM_SOURCE_PATH)}`);
}

main().catch((error) => {
  console.error("[product-guide-import] Failed.");
  console.error(error);
  process.exitCode = 1;
});
