export type WyreStormTriageStatus =
  | "wyrestorm_candidate"
  | "architecture_alternative"
  | "accessory_dependency"
  | "not_wyrestorm_addressable"
  | "unknown_review_required";

export type WyreStormMatchType =
  | "governed_sku"
  | "family_direction"
  | "architecture_direction"
  | "dependency_only"
  | "not_applicable"
  | "review_required";

export type DocumentTriageConfidence = "high" | "medium" | "low";

export type DocumentSkuTriageRow = {
  id: string;
  rawItem: string;
  sku: string;
  brand: string;
  productClass: string;
  role: string;
  quantity: number;
  status: WyreStormTriageStatus;
  wyrestormDirection: string;
  matchType: WyreStormMatchType;
  confidence: DocumentTriageConfidence;
  reason: string;
  defaultIncluded: boolean;
  batchCompareEligible: boolean;
  retainAsProjectContext: boolean;
};

export type DocumentSkuTriageAnalysis = {
  rows: DocumentSkuTriageRow[];
  extractedRowCount: number;
  wyrestormCandidateCount: number;
  architectureAlternativeCount: number;
  accessoryDependencyCount: number;
  ignoredNoiseCount: number;
  unknownReviewCount: number;
  batchEligibleRowIds: string[];
};

export type ParsedSkuForTriage = {
  sku: string;
  description: string;
  manufacturer: string;
  productClass: string;
  role: string;
  sourceLine: string;
  quantity?: number;
};

const COMPETITOR_BRANDS = [
  "Blustream",
  "Atlona",
  "Extron",
  "Crestron",
  "Kramer",
  "Lightware",
  "CYP",
  "SY",
  "AMX",
  "Aurora",
  "AVPro Edge",
  "AV Access",
  "HDAnywhere",
  "Just Add Power",
  "ZeeVee",
  "MuxLab",
  "Gefen",
  "Hall Technologies",
  "Black Box",
  "ATEN",
] as const;

const CONTEXT_BRANDS = [
  "Samsung",
  "Chief",
  "LG",
  "NEC",
  "Sharp",
  "Epson",
  "BenQ",
  "Dell",
  "HP",
  "Lenovo",
  "Cisco",
  "Netgear",
  "Ubiquiti",
  "Shure",
  "QSC",
  "Biamp",
  "Bose",
  "JBL",
  "Middle Atlantic",
] as const;

const NOISE_RULES: Array<{ productClass: string; pattern: RegExp; retain: boolean; reason: string }> = [
  { productClass: "display", pattern: /\b(commercial\s+display|flat\s*panel\s+display|display\s+screen|monitor|television|commercial\s+screen|lcd|oled|qled|\d{2,3}[- ]?inch\s+display)\b/i, retain: true, reason: "Display retained as project context, but WyreStorm does not supply the screen." },
  { productClass: "projector", pattern: /\b(projector|projection)\b/i, retain: true, reason: "Projector retained as project context, but it is not a WyreStorm comparison candidate." },
  { productClass: "led-panel", pattern: /\b(led\s*(panel|tile|cabinet|wall))\b/i, retain: true, reason: "LED display hardware is specialist third-party equipment, not a WyreStorm product candidate." },
  { productClass: "mount-or-bracket", pattern: /\b(mount|bracket|wall\s*plate\s*mount|tilt\s*mount|ceiling\s*mount)\b/i, retain: true, reason: "Mounting hardware may be a project dependency but is not WyreStorm-addressable." },
  { productClass: "furniture", pattern: /\b(furniture|desk|lectern|podium|credenza|table|cabinetry)\b/i, retain: true, reason: "Furniture is useful project context but is outside the WyreStorm product scope." },
  { productClass: "rack", pattern: /\b(rack|rackmount\s+cabinet|equipment\s+cabinet)\b/i, retain: true, reason: "Rack hardware is a project dependency, not a WyreStorm comparison candidate." },
  { productClass: "patch-panel", pattern: /\bpatch\s*panel\b/i, retain: true, reason: "Patch panels are installation infrastructure and are not WyreStorm comparison candidates." },
  { productClass: "generic-cable", pattern: /\b(cat\s*[5-8]|hdmi|usb|fibre|fiber|network|patch)\s*(cable|lead|loom)\b|\bgeneric\s+cable\b/i, retain: false, reason: "Generic cabling is suppressed from product comparison; confirm it later as an installation dependency." },
  { productClass: "power-distribution", pattern: /\b(power\s+distribution|pdu|ups|uninterruptible|mains\s+distribution)\b/i, retain: true, reason: "Power distribution is project context but is not a WyreStorm product candidate." },
  { productClass: "computer", pattern: /\b(pc|computer|workstation|laptop|desktop|thin\s+client|mac\s*mini)\b/i, retain: true, reason: "Computer hardware is retained as source context and excluded from WyreStorm comparison." },
  { productClass: "tablet", pattern: /\b(tablet|ipad|surface\s+pro)\b/i, retain: true, reason: "Tablet hardware is project context and not a WyreStorm product candidate." },
  { productClass: "microphone", pattern: /\b(microphone|wireless\s+mic|boundary\s+mic|ceiling\s+mic)\b/i, retain: true, reason: "Microphones are specialist audio items outside the governed WyreStorm comparison scope." },
  { productClass: "speaker", pattern: /\b(speaker|soundbar|loudspeaker|subwoofer)\b/i, retain: true, reason: "Speaker hardware is specialist audio equipment and is not a WyreStorm product candidate." },
  { productClass: "audio-dsp", pattern: /\b(dsp|digital\s+signal\s+processor|audio\s+processor|conference\s+processor)\b/i, retain: true, reason: "Audio DSPs are specialist audio products and must not be forced into a WyreStorm comparison." },
  { productClass: "control-processor", pattern: /\b(control\s+processor|automation\s+processor|central\s+controller)\b/i, retain: true, reason: "Third-party control processors are retained as system context and excluded from candidate matching." },
  { productClass: "network-switch", pattern: /\b(network|ethernet|poe)\s+switch\b|\bswitch\s+(?:24|48)\s*port\b/i, retain: true, reason: "Network switches are infrastructure dependencies, not WyreStorm product candidates." },
  { productClass: "lighting", pattern: /\b(lighting|dali|dmx\s+light|luminaire)\b/i, retain: true, reason: "Lighting equipment is outside the WyreStorm comparison scope." },
  { productClass: "installation-consumable", pattern: /\b(cable\s+tie|fixing|screw|anchor|consumable|heatshrink|label\s+pack)\b/i, retain: false, reason: "Installation consumables are suppressed from product comparison." },
];

const GOVERNED_SKUS: Record<string, { sku: string; reason: string }> = {
  SP14CS: {
    sku: "SP-0104-H2",
    reason: "Governed same-topology direction: four-output HDMI distribution amplifier.",
  },
  SP18CS: {
    sku: "SP-0108-SCL",
    reason: "Governed same-topology direction: eight-output HDMI distribution amplifier with scaling checks.",
  },
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function skuKey(value: unknown): string {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function detectBrand(text: string, fallback = ""): string {
  const brands = [...COMPETITOR_BRANDS, ...CONTEXT_BRANDS];
  const explicit = brands.find((brand) => new RegExp(`\\b${brand.replace(/\s+/g, "\\s+")}\\b`, "i").test(text));
  if (explicit) return explicit;

  const compact = skuKey(text);
  if (/^(?:HEX|UEX|SP\d|C\d{2}CS|PLA\d|HMXL?|PAC\d|PS\d|SM\d|MFP\d|SW\d)/.test(compact)) return "Blustream";
  if (/^(?:QM|QB|QH|BE|LH)\d/.test(compact)) return "Samsung";
  if (/^(?:XTM|MTM|LSM|VTM|RPA|CMA)\d/.test(compact)) return "Chief";
  return clean(fallback) || "Not confirmed";
}

function inferNoise(text: string, brand: string): typeof NOISE_RULES[number] | null {
  const match = NOISE_RULES.find((rule) => rule.pattern.test(text));
  if (match) return match;

  if (brand === "Samsung" || brand === "LG" || brand === "NEC" || brand === "Sharp") {
    return NOISE_RULES[0];
  }
  if (brand === "Chief") {
    return NOISE_RULES.find((rule) => rule.productClass === "mount-or-bracket") ?? null;
  }
  return null;
}

function directionForProductClass(productClass: string, role: string): {
  status: WyreStormTriageStatus;
  direction: string;
  matchType: WyreStormMatchType;
  confidence: DocumentTriageConfidence;
  reason: string;
} {
  if (productClass === "accessory-power" || role === "supporting-accessory") {
    return {
      status: "accessory_dependency",
      direction: "Confirm the parent WyreStorm product first, then select its governed regional power dependency.",
      matchType: "dependency_only",
      confidence: "high",
      reason: "Power supplies and support accessories cannot become lead recommendations.",
    };
  }

  if (productClass === "hdbaset-matrix") {
    return {
      status: "architecture_alternative",
      direction: "WyreStorm fixed HDBaseT matrix kit or NetworkHD architecture, subject to routed I/O and receiver requirements.",
      matchType: "architecture_direction",
      confidence: "medium",
      reason: "Matrix topology is addressable, but a direct SKU is unsafe until routed inputs, zones, distance and included receivers are confirmed.",
    };
  }

  const familyDirections: Record<string, string> = {
    "hdbaset-extender-kit": "WyreStorm HDBaseT extender kit family",
    "hdbaset-transmitter": "WyreStorm source-side HDBaseT transmitter family",
    "hdbaset-receiver": "WyreStorm display-side HDBaseT receiver family",
    "hdmi-splitter": "WyreStorm HDMI distribution amplifier family",
    "hdmi-switcher": "WyreStorm HDMI switcher family",
    "presentation-switcher": "WyreStorm presentation switcher family",
    "usb-extender": "WyreStorm USB extension family",
    "usb-kvm": "WyreStorm USB/KVM extension family",
    "signal-manager": "WyreStorm signal-management family",
  };
  const direction = familyDirections[productClass];

  if (direction) {
    return {
      status: "wyrestorm_candidate",
      direction,
      matchType: "family_direction",
      confidence: role === "unknown" ? "medium" : "high",
      reason: `The row is in a governed WyreStorm-addressable product class; ${role === "unknown" ? "role still needs review" : `${role} role is preserved`}.`,
    };
  }

  if (productClass === "audio-dante" || productClass === "audio-analogue") {
    return {
      status: "not_wyrestorm_addressable",
      direction: "Retain as specialist audio context; qualify integration points only.",
      matchType: "not_applicable",
      confidence: "medium",
      reason: "Specialist audio/DSP products are not promoted as WyreStorm product candidates in document triage.",
    };
  }

  return {
    status: "unknown_review_required",
    direction: "Request an official datasheet or product URL before comparison.",
    matchType: "review_required",
    confidence: "low",
    reason: "The SKU-like row cannot be safely classified; no WyreStorm match has been forced.",
  };
}

function candidateRow(item: ParsedSkuForTriage, index: number): DocumentSkuTriageRow {
  const rawItem = clean(item.sourceLine) || [item.sku, item.description].filter(Boolean).join(" ");
  const brand = detectBrand(rawItem, item.manufacturer);
  const noise = inferNoise(`${rawItem} ${item.description}`, brand);

  const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 1 ? Math.round(Number(item.quantity)) : 1;

  if (noise) {
    return {
      id: `row-${index}-${skuKey(item.sku) || "context"}`,
      rawItem,
      sku: clean(item.sku).toUpperCase(),
      brand,
      productClass: noise.productClass,
      role: item.role,
      quantity,
      status: "not_wyrestorm_addressable",
      wyrestormDirection: "No WyreStorm candidate",
      matchType: "not_applicable",
      confidence: "high",
      reason: noise.reason,
      defaultIncluded: false,
      batchCompareEligible: false,
      retainAsProjectContext: noise.retain,
    };
  }

  const governed = GOVERNED_SKUS[skuKey(item.sku)];
  if (governed) {
    return {
      id: `row-${index}-${skuKey(item.sku)}`,
      rawItem,
      sku: clean(item.sku).toUpperCase(),
      brand,
      productClass: item.productClass,
      role: item.role,
      quantity,
      status: "wyrestorm_candidate",
      wyrestormDirection: governed.sku,
      matchType: "governed_sku",
      confidence: "high",
      reason: governed.reason,
      defaultIncluded: true,
      batchCompareEligible: true,
      retainAsProjectContext: true,
    };
  }

  const direction = directionForProductClass(item.productClass, item.role);
  const eligible = direction.status === "wyrestorm_candidate" || direction.status === "architecture_alternative";
  return {
    id: `row-${index}-${skuKey(item.sku) || "context"}`,
    rawItem,
    sku: clean(item.sku).toUpperCase(),
    brand,
    productClass: item.productClass,
    role: item.role,
    quantity,
    status: direction.status,
    wyrestormDirection: direction.direction,
    matchType: direction.matchType,
    confidence: direction.confidence,
    reason: direction.reason,
    defaultIncluded: eligible,
    batchCompareEligible: eligible,
    retainAsProjectContext: direction.status !== "unknown_review_required",
  };
}

function contextNoiseRows(text: string, existingRows: DocumentSkuTriageRow[], parsedSkus: ParsedSkuForTriage[]): DocumentSkuTriageRow[] {
  const existingRaw = new Set(existingRows.map((row) => clean(row.rawItem).toLowerCase()));
  const consumedDescriptions = new Set(parsedSkus.map((item) => clean(item.description).toLowerCase()).filter(Boolean));
  return text
    .split(/\r?\n/)
    .map(clean)
    .filter((line) => line && line.length <= 240 && !existingRaw.has(line.toLowerCase()) && !consumedDescriptions.has(line.toLowerCase()))
    .flatMap((line, index) => {
      const brand = detectBrand(line);
      const noise = inferNoise(line, brand);
      if (!noise) return [];
      return [{
        id: `noise-${index}-${skuKey(line).slice(0, 20) || "context"}`,
        rawItem: line,
        sku: "",
        brand,
        productClass: noise.productClass,
        role: "unknown",
        quantity: 1,
        status: "not_wyrestorm_addressable" as const,
        wyrestormDirection: "No WyreStorm candidate",
        matchType: "not_applicable" as const,
        confidence: "high" as const,
        reason: noise.reason,
        defaultIncluded: false,
        batchCompareEligible: false,
        retainAsProjectContext: noise.retain,
      }];
    });
}

export function triageDocumentSkuRows(text: string, parsedSkus: ParsedSkuForTriage[]): DocumentSkuTriageAnalysis {
  const candidateRows = parsedSkus.map(candidateRow);
  const rows = [...candidateRows, ...contextNoiseRows(text, candidateRows, parsedSkus)];

  return {
    rows,
    extractedRowCount: rows.length,
    wyrestormCandidateCount: rows.filter((row) => row.status === "wyrestorm_candidate").length,
    architectureAlternativeCount: rows.filter((row) => row.status === "architecture_alternative").length,
    accessoryDependencyCount: rows.filter((row) => row.status === "accessory_dependency").length,
    ignoredNoiseCount: rows.filter((row) => row.status === "not_wyrestorm_addressable").length,
    unknownReviewCount: rows.filter((row) => row.status === "unknown_review_required").length,
    batchEligibleRowIds: rows.filter((row) => row.batchCompareEligible).map((row) => row.id),
  };
}

export function normalizeDocumentSkuTriage(value: unknown): DocumentSkuTriageAnalysis | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<DocumentSkuTriageAnalysis>;
  if (!Array.isArray(candidate.rows)) return undefined;
  const rows = candidate.rows
    .filter((row): row is DocumentSkuTriageRow => Boolean(row && typeof row === "object"))
    .map((row) => ({
      ...row,
      role: typeof row.role === "string" && row.role ? row.role : "unknown",
      quantity: Number.isFinite(Number(row.quantity)) && Number(row.quantity) >= 1 ? Math.round(Number(row.quantity)) : 1,
    }));
  const eligibleIds = new Set(rows.filter((row) => row.batchCompareEligible).map((row) => row.id));
  const requestedIds = Array.isArray(candidate.batchEligibleRowIds)
    ? candidate.batchEligibleRowIds.filter((id): id is string => typeof id === "string" && eligibleIds.has(id))
    : Array.from(eligibleIds);
  return {
    rows,
    extractedRowCount: rows.length,
    wyrestormCandidateCount: rows.filter((row) => row.status === "wyrestorm_candidate").length,
    architectureAlternativeCount: rows.filter((row) => row.status === "architecture_alternative").length,
    accessoryDependencyCount: rows.filter((row) => row.status === "accessory_dependency").length,
    ignoredNoiseCount: rows.filter((row) => row.status === "not_wyrestorm_addressable").length,
    unknownReviewCount: rows.filter((row) => row.status === "unknown_review_required").length,
    batchEligibleRowIds: requestedIds,
  };
}
