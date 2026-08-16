export type DocumentIngestType =
  | "multi_sku_competitor_list"
  | "single_sku_competitor_enquiry"
  | "general_document";

export type IngestProductClass =
  | "hdbaset-extender-kit"
  | "hdbaset-transmitter"
  | "hdbaset-receiver"
  | "hdbaset-matrix"
  | "hdmi-splitter"
  | "hdmi-switcher"
  | "presentation-switcher"
  | "usb-extender"
  | "usb-kvm"
  | "audio-dante"
  | "audio-analogue"
  | "signal-manager"
  | "accessory-power"
  | "unknown";

export type IngestSkuRole = "kit" | "transmitter" | "receiver" | "matrix" | "supporting-accessory" | "standalone" | "unknown";

export type ExtractedCompetitorSku = {
  sku: string;
  description: string;
  manufacturer: string;
  productClass: IngestProductClass;
  classLabel: string;
  role: IngestSkuRole;
  confidence: "high" | "medium" | "low";
  sourceLine: string;
  workflowTags: string[];
  eligibleAsLead: boolean;
  quoteRisks: string[];
  quantity: number;
};

export type ProductSetOpportunity = {
  id: string;
  title: string;
  summary: string;
  skuCount: number;
  skus: string[];
  productClasses: IngestProductClass[];
  salesDirection: string;
  relationship: "family-direction" | "supporting-only" | "needs-evidence";
  checks: string[];
};

export type MultiSkuCompetitorAnalysis = {
  documentType: DocumentIngestType;
  manufacturer: string;
  accountCustomer: string;
  senderContext: string;
  subject: string;
  skuCount: number;
  skus: ExtractedCompetitorSku[];
  productSets: ProductSetOpportunity[];
  recommendedSalesDirections: string[];
  quoteRisks: string[];
  discoveryQuestions: string[];
  sourceKind: "email" | "csv_or_table" | "pasted_list" | "document";
  isSellOutList: boolean;
  triage: DocumentSkuTriageAnalysis;
  analyzedAt: string;
};

const MANUFACTURERS = [
  "Blustream",
  "Atlona",
  "AVPro Edge",
  "Crestron",
  "Extron",
  "Kramer",
  "Lightware",
  "AMX",
  "Barco",
  "Binary",
  "ZeeVee",
  "BirdDog",
  "Marshall",
  "Mersive",
  "Sony",
  "CYP",
  "SY",
  "Aurora",
  "AV Access",
  "HDAnywhere",
  "Just Add Power",
  "MuxLab",
  "Gefen",
  "Hall Technologies",
  "Black Box",
  "ATEN",
] as const;

const NON_SKU_TOKENS = new Set([
  "HDMI2",
  "HDCP2",
  "CAT5",
  "CAT6",
  "CAT7",
  "USB2",
  "USB3",
  "H264",
  "H265",
  "AVOIP",
  "POE",
  "POC",
  "PSE",
]);

const CLASS_LABELS: Record<IngestProductClass, string> = {
  "hdbaset-extender-kit": "HDBaseT extender kit",
  "hdbaset-transmitter": "HDBaseT transmitter",
  "hdbaset-receiver": "HDBaseT receiver",
  "hdbaset-matrix": "HDBaseT / AV matrix",
  "hdmi-splitter": "HDMI splitter / distribution amplifier",
  "hdmi-switcher": "HDMI switcher",
  "presentation-switcher": "Presentation switcher",
  "usb-extender": "USB extender",
  "usb-kvm": "USB / KVM workflow product",
  "audio-dante": "Dante / network-audio product",
  "audio-analogue": "Analogue audio product",
  "signal-manager": "Signal manager / converter",
  "accessory-power": "Power accessory",
  unknown: "Unknown product class",
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function skuKey(value: unknown): string {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function lineHasSku(line: string): boolean {
  return extractSkuTokens(line).length > 0;
}

function looksLikeSku(token: string): boolean {
  const normalized = token.toUpperCase().replace(/[),.;:'"]+$/g, "");
  if (normalized.length < 4 || normalized.length > 32) return false;
  if (!/[A-Z]/.test(normalized) || !/\d/.test(normalized)) return false;
  if (NON_SKU_TOKENS.has(normalized)) return false;
  if (/^\d+(?:V|W|A|MM|M|GBPS|HZ)$/i.test(normalized)) return false;
  if (/^\d+-?(?:INCH|IN|CM|MM|M|FT)$/i.test(normalized)) return false;
  if (/^\d+-?(?:WAY|PORT|CHANNEL|ZONE|INPUT|OUTPUT)S?$/i.test(normalized)) return false;
  if (/^(?:19|20)\d{2}$/.test(normalized)) return false;
  if (/^\d/.test(normalized) && (normalized.match(/[A-Z]/g) ?? []).length < 2) return false;
  return /^[A-Z0-9][A-Z0-9]*(?:-[A-Z0-9]+)*$/.test(normalized);
}

export function extractSkuTokens(value: string): string[] {
  const tokens = value.toUpperCase().match(/\b[A-Z0-9][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g) ?? [];
  return unique(tokens.filter(looksLikeSku).map((token) => token.replace(/[),.;:'"]+$/g, "")));
}

function descriptionForLine(lines: string[], lineIndex: number, sku: string): string {
  const sourceLine = lines[lineIndex] ?? "";
  const inline = clean(
    sourceLine
      .replace(new RegExp(`\\b${sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), " ")
      .replace(/^[\s,;|:\t\-–—]+|[\s,;|:\t\-–—]+$/g, "")
      .replace(/\b(?:qty|quantity)\s*[:=]?\s*\d+\b/gi, ""),
  );

  if (inline && !/^(?:sku|model|part number|description|qty|quantity)$/i.test(inline)) {
    return inline;
  }

  for (const neighborIndex of [lineIndex + 1, lineIndex - 1]) {
    const neighbor = clean(lines[neighborIndex]);
    if (!neighbor || lineHasSku(neighbor) || /^(?:from|to|cc|subject|account|customer|date)\s*:/i.test(neighbor)) {
      continue;
    }
    return neighbor;
  }

  return "";
}

function extractQuantity(sourceLine: string): number {
  const line = String(sourceLine ?? "");
  const patterns = [
    /\bqty\.?\s*[:=]?\s*(\d{1,3})\b/i,
    /\bquantity\s*[:=]?\s*(\d{1,3})\b/i,
    /\b(\d{1,3})\s*(?:off|no\.?)\b/i,
    // Quantity-first form ("12x Kramer VS-42H"). The (?![0-9]) guard keeps the
    // "4x2" matrix-size notation from being read as a count, and the lookbehind
    // stops "2.5x" decimals from leaking a phantom quantity.
    /(?<![0-9.])(\d{1,3})\s*x(?![0-9])\b/i,
    // Suffix form ("VS-42H x2") - the x must be a standalone token, not the
    // X inside an SKU like TX3/RX3 or part of a "4x2" size.
    /(?<![A-Za-z0-9])x\s*(\d{1,3})\b/i,
    /\(\s*(\d{1,3})\s*\)/,
    // Table/CSV rows carry the quantity as their own trailing cell
    // ("SW-120-TX3, HDBaseT 3.0 transmitter, 8").
    /(?:,|\t|\|)\s*(?<![0-9.])(\d{1,3})\s*$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value >= 1 && value <= 999) return value;
    }
  }

  return 1;
}

function detectManufacturer(text: string, skus: string[]): string {
  const explicit = MANUFACTURERS
    .map((manufacturer) => ({
      manufacturer,
      count: (text.match(new RegExp(manufacturer.replace(/\s+/g, "\\s+"), "gi")) ?? []).length,
    }))
    .sort((a, b) => b.count - a.count)[0];

  if (explicit?.count) return explicit.manufacturer;

  const skuBlob = skus.join(" ");
  if (/\b(?:UEX|SP\d|HEX|HMX|HMXL|PLA|SW\d|DA\d|PAC\d|HD\d|PS\d|SM\d|MFP)\b/i.test(skuBlob)) {
    return "Blustream";
  }

  return "Not confirmed";
}

function captureHeader(text: string, header: string): string {
  return clean(text.match(new RegExp(`^${header}\\s*:\\s*(.+)$`, "im"))?.[1]);
}

function detectAccount(text: string): string {
  const labelled = text.match(/^(?:account|customer|client|end customer|opportunity)\s*[:-]\s*(.+)$/im)?.[1];
  if (labelled) return clean(labelled).replace(/[<([].*$/, "").replace(/\s+-\s+.*$/, "");

  const recipient = captureHeader(text, "To");
  if (recipient && !/@(?:blustream|wyrestorm)\b/i.test(recipient)) {
    const recipientName = clean(recipient.replace(/<[^>]+>/g, "").replace(/\([^)]*\)/g, ""));
    if (recipientName && !/@/.test(recipientName)) return recipientName;
  }

  const subject = captureHeader(text, "Subject");
  if (/\bPacific\b/i.test(subject) || /\bPacific\b/i.test(text)) return "Pacific";

  return "Not confirmed";
}

function detectSourceKind(text: string): MultiSkuCompetitorAnalysis["sourceKind"] {
  if (/^(?:from|to|subject|sent|date)\s*:/im.test(text)) return "email";
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const tableLines = lines.filter((line) => /,|\t|\|/.test(line)).length;
  if (tableLines >= 2) return "csv_or_table";
  if (extractSkuTokens(text).length >= 2) return "pasted_list";
  return "document";
}

function classifySku(sku: string, description = ""): {
  productClass: IngestProductClass;
  role: IngestSkuRole;
  workflowTags: string[];
  confidence: ExtractedCompetitorSku["confidence"];
} {
  const key = skuKey(sku);
  const text = `${sku} ${description}`.toLowerCase();

  if (/^(?:PS\d+)/.test(key) || /\b(power supply|psu|power adapter)\b/i.test(text)) {
    return { productClass: "accessory-power", role: "supporting-accessory", workflowTags: ["power", "accessory"], confidence: "high" };
  }

  if (/KVM/.test(key) || /^SW12USB/.test(key) || /\b(?:usb\s*\/?\s*kvm|kvm switch)\b/i.test(text)) {
    return { productClass: "usb-kvm", role: "standalone", workflowTags: ["usb", "kvm"], confidence: "high" };
  }

  // "HDMI matrix", "4x2 matrix switcher" and "8x8 matrix" are the common RFQ
  // phrasings; a bare "matrix" mention is enough when the SKU gives no clue.
  // The earlier power/accessory checks keep "matrix power supply" out of here.
  if (/^(?:C\d{2}(?:CS)?KIT|PLA\d+CS|HMX|HMXL)/.test(key) || /\bmatrix\b/i.test(text)) {
    return { productClass: "hdbaset-matrix", role: "matrix", workflowTags: ["matrix", "routed outputs"], confidence: "high" };
  }

  if (/^UEX/.test(key)) {
    if (/KIT$/.test(key)) {
      return { productClass: "hdbaset-extender-kit", role: "kit", workflowTags: ["usb", "hdbaset", "extender kit"], confidence: "high" };
    }
    return { productClass: "usb-extender", role: /RX$/.test(key) ? "receiver" : /TX$/.test(key) ? "transmitter" : "standalone", workflowTags: ["usb", "extension"], confidence: "high" };
  }

  if (/^(?:HEX|TX|WP)[A-Z0-9]*TX$/.test(key) || /TX$/.test(key) || /\b(?:hdbaset\s+)?transmitter\b/i.test(text)) {
    return { productClass: "hdbaset-transmitter", role: "transmitter", workflowTags: ["hdbaset", "source side"], confidence: "high" };
  }

  if (/^(?:HEX|RX)[A-Z0-9]*RX$/.test(key) || /^RX\d/.test(key) || /RX$/.test(key) || /\b(?:hdbaset\s+)?receiver\b/i.test(text)) {
    return { productClass: "hdbaset-receiver", role: "receiver", workflowTags: ["hdbaset", "display side"], confidence: "high" };
  }

  if (/^(?:HEX).+KIT$/.test(key) || /\b(?:hdbaset\s+)?extender\s+kit\b/i.test(text)) {
    return { productClass: "hdbaset-extender-kit", role: "kit", workflowTags: ["hdbaset", "extender kit"], confidence: "high" };
  }

  if (/^SP\d/.test(key) || /\b(?:hdmi\s+)?(?:splitter|distribution amplifier)\b/i.test(text)) {
    return { productClass: "hdmi-splitter", role: "standalone", workflowTags: ["hdmi", "mirrored outputs"], confidence: "high" };
  }

  if (/^DA\d/.test(key) || /\b(?:dante|aes67)\b/i.test(text)) {
    return { productClass: "audio-dante", role: "standalone", workflowTags: ["audio", "dante"], confidence: /^DA\d/.test(key) ? "high" : "medium" };
  }

  if (/^(?:PAC|HD)\d/.test(key) || /\b(?:analogue|analog)\s+audio\b/i.test(text)) {
    return { productClass: "audio-analogue", role: "standalone", workflowTags: ["audio", "analogue"], confidence: "medium" };
  }

  if (/^SM\d/.test(key) || /\b(?:signal manager|converter|scaler)\b/i.test(text)) {
    return { productClass: "signal-manager", role: "standalone", workflowTags: ["signal management"], confidence: "high" };
  }

  if (/^(?:MFP|SW4)/.test(key) || /\b(?:presentation|multi.?format)\s+switch/i.test(text)) {
    return { productClass: "presentation-switcher", role: "standalone", workflowTags: ["presentation", "switching"], confidence: "high" };
  }

  if (/^SW\d/.test(key) || /\bhdmi\s+switch(?:er)?\b/i.test(text)) {
    return { productClass: "hdmi-switcher", role: "standalone", workflowTags: ["hdmi", "switching"], confidence: "medium" };
  }

  if (/\b(?:usb\s+extender|usb\s+extension)\b/i.test(text)) {
    return { productClass: "usb-extender", role: /kit/i.test(text) ? "kit" : "standalone", workflowTags: ["usb", "extension"], confidence: "medium" };
  }

  return { productClass: "unknown", role: "unknown", workflowTags: [], confidence: "low" };
}

function classDisplayLabel(productClass: IngestProductClass, workflowTags: string[]): string {
  if (productClass === "hdbaset-extender-kit" && workflowTags.includes("usb")) {
    return "USB / HDBaseT extender kit";
  }
  return CLASS_LABELS[productClass];
}

function buildSkuRisks(productClass: IngestProductClass, role: IngestSkuRole): string[] {
  const risks: string[] = [];
  if (productClass === "unknown") risks.push("Product class is not confirmed; do not recommend an equivalent.");
  if (role === "transmitter") risks.push("TX/source-side product: do not match to an RX-only product or assume a complete kit.");
  if (role === "receiver") risks.push("RX/display-side product: do not match to a TX-only product or assume a complete kit.");
  if (role === "kit") risks.push("KIT/package product: verify included TX/RX units and accessories before comparison.");
  if (productClass === "accessory-power") risks.push("Supporting power accessory only; it must not become a lead recommendation.");
  return risks;
}

type GroupDefinition = {
  id: string;
  title: string;
  classes: IngestProductClass[];
  summary: string;
  salesDirection: string;
  checks: string[];
};

const GROUP_DEFINITIONS: GroupDefinition[] = [
  {
    id: "hdbaset-extension",
    title: "HDBaseT extension product set",
    classes: ["hdbaset-extender-kit", "hdbaset-transmitter", "hdbaset-receiver"],
    summary: "Treat the kits and source/display-side endpoints as related systems, while preserving TX, RX and KIT roles.",
    salesDirection: "Review WyreStorm HDBaseT extender kits and compatible endpoint architecture by distance, video format, USB/control and power requirements.",
    checks: ["Confirm which TX/RX items form complete systems.", "Confirm distance, PoC/PoH, USB, audio and control requirements."],
  },
  {
    id: "matrix-routing",
    title: "Matrix and routed AV opportunity",
    classes: ["hdbaset-matrix"],
    summary: "Compare routed source and zone capacity as a system rather than treating physical or mirrored outputs as independent routes.",
    salesDirection: "Review WyreStorm fixed matrix or NetworkHD architecture only after routed I/O, distance and receiver dependencies are confirmed.",
    checks: ["Confirm routed inputs and independently routed outputs.", "Confirm receiver package, distance and future expansion."],
  },
  {
    id: "hdmi-distribution",
    title: "Mirrored HDMI distribution opportunity",
    classes: ["hdmi-splitter"],
    summary: "These products mirror one HDMI source to multiple outputs and must stay separate from matrix and AVoIP endpoint comparisons.",
    salesDirection: "Review same-class WyreStorm HDMI splitters by output count, bandwidth, EDID, scaling and audio breakout.",
    checks: ["Confirm every display shows the same source.", "Confirm output count, local cable distance and mixed-display scaling."],
  },
  {
    id: "switching-presentation",
    title: "Switching and presentation opportunity",
    classes: ["hdmi-switcher", "presentation-switcher"],
    summary: "Qualify source formats, output behaviour, USB-C, scaling and room workflow before selecting a switcher direction.",
    salesDirection: "Review WyreStorm HDMI or presentation switchers; do not promote a plain matrix unless independent routing is required.",
    checks: ["Confirm source count and connector types.", "Confirm USB-C, scaling, audio and control needs."],
  },
  {
    id: "usb-kvm",
    title: "USB extension and KVM opportunity",
    classes: ["usb-extender", "usb-kvm"],
    summary: "Treat host/device direction, USB generation and KVM behaviour as hard comparison gates.",
    salesDirection: "Review WyreStorm USB extension or KVM workflows by USB version, host/peripheral topology, distance and video requirements.",
    checks: ["Confirm USB 2.0/3.x bandwidth and device types.", "Confirm whether video and USB travel together."],
  },
  {
    id: "audio",
    title: "Audio and Dante opportunity",
    classes: ["audio-dante", "audio-analogue"],
    summary: "Separate Dante/network-audio devices from analogue audio products and qualify channel direction.",
    salesDirection: "Review WyreStorm audio integration only after Dante/AES67, analogue I/O, channel count and signal direction are confirmed.",
    checks: ["Confirm Dante/AES67 requirement.", "Confirm input/output direction, channel count and connector format."],
  },
  {
    id: "signal-management",
    title: "Signal-management opportunity",
    classes: ["signal-manager"],
    summary: "Confirm the actual conversion, scaling or signal-management job before selecting a product.",
    salesDirection: "Review WyreStorm signal-management products by exact input/output format and processing requirement.",
    checks: ["Confirm source and destination formats.", "Confirm scaling, conversion and audio handling."],
  },
  {
    id: "supporting-accessories",
    title: "Supporting accessories",
    classes: ["accessory-power"],
    summary: "These are dependencies, not lead product opportunities.",
    salesDirection: "Map to the required WyreStorm system accessory only after the primary hardware is selected.",
    checks: ["Do not recommend as a lead product.", "Confirm voltage, current, region and parent-product compatibility."],
  },
  {
    id: "unclassified",
    title: "Products needing identification",
    classes: ["unknown"],
    summary: "No safe product direction can be given until these SKUs are identified.",
    salesDirection: "Request datasheets or official product URLs before comparison.",
    checks: ["Confirm manufacturer and product class.", "Capture I/O, role, transport and required system dependencies."],
  },
];

function buildProductSets(skus: ExtractedCompetitorSku[]): ProductSetOpportunity[] {
  return GROUP_DEFINITIONS.flatMap((definition) => {
    const members = skus.filter((item) => definition.classes.includes(item.productClass));
    if (!members.length) return [];
    const supportingOnly = members.every((item) => !item.eligibleAsLead);
    const needsEvidence = members.some((item) => item.productClass === "unknown");

    return [{
      id: definition.id,
      title: definition.title,
      summary: definition.summary,
      skuCount: members.length,
      skus: members.map((item) => item.sku),
      productClasses: unique(members.map((item) => item.productClass)) as IngestProductClass[],
      salesDirection: definition.salesDirection,
      relationship: supportingOnly ? "supporting-only" : needsEvidence ? "needs-evidence" : "family-direction",
      checks: definition.checks,
    }];
  });
}

function buildDiscoveryQuestions(skus: ExtractedCompetitorSku[], isSellOutList: boolean): string[] {
  const classes = new Set(skus.map((item) => item.productClass));
  const questions = [
    "Is this list a stock/sell-out exercise, a live project BOM, or a request for technical equivalents?",
    "Which quantities, sites and delivery dates apply to each product set?",
  ];
  if (isSellOutList) questions.push("Which products are genuinely required by a customer design, versus stock the distributor wants to move?");
  if ([...classes].some((item) => item.startsWith("hdbaset"))) questions.push("What are the cable distances, video formats, power method and TX/RX pairing requirements?");
  if (classes.has("hdbaset-matrix")) questions.push("How many independently routed sources and display zones are required?");
  if (classes.has("hdmi-splitter")) questions.push("Do all splitter outputs show the same source, and are mixed-resolution displays involved?");
  if (classes.has("usb-extender") || classes.has("usb-kvm")) questions.push("What USB generation, host/device topology and peripheral types are required?");
  if (classes.has("audio-dante") || classes.has("audio-analogue")) questions.push("Is Dante/AES67 required, and what are the audio channel direction and connector types?");
  return unique(questions);
}

function normalizedAnalysis(value: MultiSkuCompetitorAnalysis): MultiSkuCompetitorAnalysis {
  return {
    ...value,
    manufacturer: clean(value.manufacturer) || "Not confirmed",
    accountCustomer: clean(value.accountCustomer) || "Not confirmed",
    senderContext: clean(value.senderContext),
    subject: clean(value.subject),
    skuCount: value.skus.length,
    skus: value.skus.map((item) => ({
      ...item,
      sku: clean(item.sku).toUpperCase(),
      description: clean(item.description),
      manufacturer: clean(item.manufacturer) || "Not confirmed",
      sourceLine: clean(item.sourceLine),
      workflowTags: unique(item.workflowTags),
      quoteRisks: unique(item.quoteRisks),
      eligibleAsLead: item.productClass !== "accessory-power" && item.productClass !== "unknown",
      quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 1 ? Math.round(Number(item.quantity)) : 1,
    })),
    productSets: value.productSets,
    recommendedSalesDirections: unique(value.recommendedSalesDirections),
    quoteRisks: unique(value.quoteRisks),
    discoveryQuestions: unique(value.discoveryQuestions),
    triage: normalizeDocumentSkuTriage(value.triage) ?? triageDocumentSkuRows("", value.skus),
  };
}

export function normalizeMultiSkuCompetitorAnalysis(value: unknown): MultiSkuCompetitorAnalysis | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<MultiSkuCompetitorAnalysis>;
  if (!Array.isArray(candidate.skus) || !Array.isArray(candidate.productSets)) return undefined;
  return normalizedAnalysis(candidate as MultiSkuCompetitorAnalysis);
}

export function analyzeMultiSkuCompetitorDocument(text: string): MultiSkuCompetitorAnalysis {
  const normalizedText = String(text ?? "").replace(/\r\n?/g, "\n");
  const lines = normalizedText.split("\n");
  const skuOccurrences = new Map<string, { lineIndex: number; sourceLine: string }>();

  lines.forEach((line, lineIndex) => {
    extractSkuTokens(line).forEach((sku) => {
      if (!skuOccurrences.has(sku)) skuOccurrences.set(sku, { lineIndex, sourceLine: line });
    });
  });

  const skuNames = Array.from(skuOccurrences.keys());
  const manufacturer = detectManufacturer(normalizedText, skuNames);
  const skus = skuNames.map((sku): ExtractedCompetitorSku => {
    const occurrence = skuOccurrences.get(sku)!;
    const description = descriptionForLine(lines, occurrence.lineIndex, sku);
    const classification = classifySku(sku, description);
    const quoteRisks = buildSkuRisks(classification.productClass, classification.role);

    return {
      sku,
      description,
      manufacturer,
      productClass: classification.productClass,
      classLabel: classDisplayLabel(classification.productClass, classification.workflowTags),
      role: classification.role,
      confidence: classification.confidence,
      sourceLine: occurrence.sourceLine,
      workflowTags: classification.workflowTags,
      eligibleAsLead: classification.productClass !== "accessory-power" && classification.productClass !== "unknown",
      quoteRisks,
      quantity: extractQuantity(occurrence.sourceLine),
    };
  });

  const sourceKind = detectSourceKind(normalizedText);
  const isSellOutList = /\b(sell[\s-]?out|stock list|clearance|distributor list|availability list|price list|inventory)\b/i.test(normalizedText);
  const multiSkuEvidence = skus.length >= 3 || (skus.length >= 2 && /\b(bom|list|sell[\s-]?out|sku|part number|qty|quantity)\b/i.test(normalizedText));
  const documentType: DocumentIngestType = multiSkuEvidence
    ? "multi_sku_competitor_list"
    : skus.length === 1
      ? "single_sku_competitor_enquiry"
      : "general_document";
  const productSets = buildProductSets(skus);
  const triage = triageDocumentSkuRows(normalizedText, skus);
  const quoteRisks = unique([
    ...(documentType === "multi_sku_competitor_list"
      ? ["This is a product list, not a confirmed project design. Do not treat every line as a required like-for-like replacement."]
      : []),
    ...(isSellOutList
      ? ["Sell-out/distributor context detected. Stock movement does not prove customer application, quantities or technical equivalence."]
      : []),
    "Do not force direct WyreStorm equivalents where role, I/O, distance, features or package contents are incomplete.",
    "Competitor SKUs are intelligence inputs only and must not be added to a WyreStorm BOM.",
    ...(skus.some((item) => item.role === "transmitter" || item.role === "receiver")
      ? ["TX/RX endpoints are present. Preserve source-side/display-side roles and confirm complete system pairings."]
      : []),
    ...(skus.some((item) => item.productClass === "accessory-power")
      ? ["Power/accessory products are supporting items and must not become lead recommendations."]
      : []),
    ...(skus.some((item) => item.productClass === "unknown")
      ? ["One or more SKUs remain unclassified and require an official product source before comparison."]
      : []),
  ]);

  return normalizedAnalysis({
    documentType,
    manufacturer,
    accountCustomer: detectAccount(normalizedText),
    senderContext: unique([
      captureHeader(normalizedText, "From") ? `From: ${captureHeader(normalizedText, "From")}` : "",
      captureHeader(normalizedText, "To") ? `To: ${captureHeader(normalizedText, "To")}` : "",
    ]).join(" | "),
    subject: captureHeader(normalizedText, "Subject"),
    skuCount: skus.length,
    skus,
    productSets,
    recommendedSalesDirections: productSets.map((group) => group.salesDirection),
    quoteRisks,
    discoveryQuestions: buildDiscoveryQuestions(skus, isSellOutList),
    sourceKind,
    isSellOutList,
    triage,
    analyzedAt: new Date().toISOString(),
  });
}

export function buildMultiSkuResponseDraft(analysis: MultiSkuCompetitorAnalysis): string {
  const account = analysis.accountCustomer !== "Not confirmed" ? ` for ${analysis.accountCustomer}` : "";
  return [
    `Thanks for sending the ${analysis.manufacturer} product list${account}.`,
    `We identified ${analysis.skuCount} competitor SKUs across ${analysis.productSets.length} related product sets; ${analysis.triage.wyrestormCandidateCount} are governed WyreStorm candidates and ${analysis.triage.architectureAlternativeCount} need an architecture-led review.`,
    `${analysis.triage.ignoredNoiseCount} non-addressable item(s) were retained separately as project context and excluded from comparison.`,
    "Before proposing WyreStorm alternatives, we need to confirm which lines belong to a live customer design, the required quantities, endpoint pairings, distances, routed I/O and must-have USB/audio/control features.",
    "We will treat TX, RX, KIT and accessory lines separately and will not position an item as a direct equivalent unless the product class and critical specifications are confirmed.",
  ].join(" ");
}
import {
  normalizeDocumentSkuTriage,
  triageDocumentSkuRows,
  type DocumentSkuTriageAnalysis,
} from "./skuTriage";
