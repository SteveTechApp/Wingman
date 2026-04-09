export type ProductFamily =
  | "Presentation Switcher"
  | "Matrix Switcher"
  | "HDBaseT Matrix"
  | "Seamless Matrix"
  | "AVoIP"
  | "Video Wall"
  | "Extender"
  | "UC / Conferencing"
  | "Other";

export type FunctionalRole =
  | "Room Switcher"
  | "Room Core"
  | "Limited Matrix"
  | "Full Matrix"
  | "Distribution Core"
  | "Transport Endpoint"
  | "Video Processor"
  | "Other";

export type RoutingClass =
  | "Fixed Switching"
  | "Dual Display Switching"
  | "Limited Matrix"
  | "Limited Matrix + Extension"
  | "Full Matrix"
  | "Distributed Matrix"
  | "Processing"
  | "Transport"
  | "Other";

export type ClassificationRecord = {
  commercialFamily: ProductFamily | string;
  functionalRole: FunctionalRole | string;
  routingClass: RoutingClass | string;
  featureTags: string[];
  applicationTags: string[];
  matrixCapable: boolean;
  trueMatrix: boolean;
  conferencingOptimised: boolean;
  distributionOptimised: boolean;
  notes?: string;
};

export type RawProductRecord = {
  sku?: string;
  model?: string;
  name?: string;
  title?: string;
  family?: string;
  series?: string;
  category?: string;
  type?: string;
  description?: string;
  summary?: string;
  featureTags?: string[];
  features?: string[];
  tags?: string[];
  applications?: string[];
  applicationTags?: string[];
  [key: string]: unknown;
};

const EXPLICIT_OVERRIDES: Record<string, Partial<ClassificationRecord>> = {
  "MX-0402-MST": {
    commercialFamily: "Presentation Switcher",
    functionalRole: "Room Core",
    routingClass: "Limited Matrix",
    featureTags: [
      "USB-C",
      "HDMI",
      "MST",
      "Dual Display",
      "USB Routing",
      "USB Host",
      "USB Device",
      "Scaling",
      "BYOD / BYOM",
      "MTR Ready",
    ],
    applicationTags: ["Meeting room", "Boardroom", "Teams room", "BYOD", "BYOM"],
    matrixCapable: true,
    trueMatrix: false,
    conferencingOptimised: true,
    distributionOptimised: false,
    notes:
      "Presentation-focused room core with limited matrix-style behaviour. Use for dual-display room workflows, not traditional infrastructure distribution.",
  },
  "MX-0403-H3-MST": {
    commercialFamily: "Presentation Switcher",
    functionalRole: "Room Core",
    routingClass: "Limited Matrix + Extension",
    featureTags: [
      "USB-C",
      "HDMI",
      "MST",
      "3 Outputs",
      "HDBaseT Output",
      "USB Routing",
      "USB Host",
      "USB Device",
      "Ethernet Extension",
      "BYOD / BYOM",
      "MTR Ready",
    ],
    applicationTags: ["Meeting room", "Boardroom", "Teams room", "Classroom", "BYOD", "BYOM"],
    matrixCapable: true,
    trueMatrix: false,
    conferencingOptimised: true,
    distributionOptimised: false,
    notes:
      "Room-core switcher with limited matrix-style routing and extension. Best treated as presentation + room-core, not a traditional matrix.",
  },
  "SW-620-TX-W": {
    commercialFamily: "Presentation Switcher",
    functionalRole: "Room Switcher",
    routingClass: "Dual Display Switching",
    matrixCapable: false,
    trueMatrix: false,
    conferencingOptimised: true,
    distributionOptimised: false,
  },
  "SW-640L-TX-W": {
    commercialFamily: "Presentation Switcher",
    functionalRole: "Room Switcher",
    routingClass: "Dual Display Switching",
    matrixCapable: false,
    trueMatrix: false,
    conferencingOptimised: true,
    distributionOptimised: false,
  },
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function upperSku(value: unknown): string {
  return clean(value).toUpperCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((item) => clean(item)).filter(Boolean))];
}

function detectCommercialFamily(text: string): ProductFamily {
  if (text.includes("presentation")) return "Presentation Switcher";
  if (text.includes("seamless matrix")) return "Seamless Matrix";
  if (text.includes("hdbaset matrix")) return "HDBaseT Matrix";
  if (text.includes("matrix")) return "Matrix Switcher";
  if (text.includes("networkhd") || text.includes("avoip") || text.includes("nhd-")) return "AVoIP";
  if (text.includes("video wall")) return "Video Wall";
  if (text.includes("extender") || text.includes("rx3-") || text.includes("ex-")) return "Extender";
  if (text.includes("conference") || text.includes("video bar") || text.includes("uc")) return "UC / Conferencing";
  return "Other";
}

function inferFeatures(text: string, existing: string[]): string[] {
  const found = [...existing];
  const add = (feature: string, match: boolean) => {
    if (match) found.push(feature);
  };

  add("USB-C", text.includes("usb-c") || text.includes("usb c"));
  add("HDMI", text.includes("hdmi"));
  add("Wireless Casting", text.includes("wireless casting") || text.includes("airplay") || text.includes("miracast"));
  add("Wireless Conferencing", text.includes("wireless conferencing"));
  add("MST", text.includes("mst"));
  add("Dual Display", text.includes("dual output") || text.includes("dual outputs") || text.includes("dual display"));
  add("3 Outputs", text.includes("3-output") || text.includes("3 output") || text.includes("three output"));
  add("4+ Outputs", /(?:^|\s)(4x4|8x8|16x16|10x7|8x4|8x12)(?:\s|$)/.test(text) || text.includes("4 outputs") || text.includes("8 outputs"));
  add("HDBaseT Output", text.includes("hdbt output") || text.includes("hdbaset output"));
  add("USB Routing", text.includes("usb routing") || text.includes("usb switching") || text.includes("usb over ip"));
  add("USB Host", text.includes("usb host"));
  add("USB Device", text.includes("usb device"));
  add("Audio De-embed", text.includes("audio de-embed") || text.includes("de-embedding audio") || text.includes("audio de-embedding"));
  add("Dante / AES67", text.includes("dante") || text.includes("aes67"));
  add("Multiview", text.includes("multiview"));
  add("Video Wall", text.includes("video wall") || text.includes("videowall"));
  add("Seamless Switching", text.includes("seamless switching") || text.includes("fast seamless"));
  add("Scaling", text.includes("scaling") || text.includes("scaler"));
  add("Ethernet Extension", text.includes("ethernet extension") || text.includes("deliver network"));
  add("eARC / ARC", text.includes("earc") || text.includes("arc"));
  add("PoE / PoH", text.includes("poe") || text.includes("poh"));
  add("BYOD / BYOM", text.includes("byod") || text.includes("byom"));
  add("MTR Ready", text.includes("mtr") || text.includes("teams room"));

  return unique(found);
}

function inferApplications(text: string, existing: string[]): string[] {
  const found = [...existing];
  const add = (label: string, match: boolean) => {
    if (match) found.push(label);
  };

  add("Meeting room", text.includes("meeting room"));
  add("Boardroom", text.includes("boardroom"));
  add("Teams room", text.includes("teams room") || text.includes("mtr"));
  add("Classroom", text.includes("classroom"));
  add("Training room", text.includes("training room"));
  add("BYOD", text.includes("byod"));
  add("BYOM", text.includes("byom"));
  add("Hybrid UC", text.includes("hybrid meeting") || text.includes("conference"));
  add("Video wall", text.includes("video wall"));
  add("LED wall", text.includes("led"));
  add("Hospitality", text.includes("hospitality"));
  add("Control room", text.includes("control room"));
  add("Retail", text.includes("retail"));

  return unique(found);
}

function classifyBySignals(
  commercialFamily: string,
  featureTags: string[],
  text: string,
): Pick<
  ClassificationRecord,
  "functionalRole" | "routingClass" | "matrixCapable" | "trueMatrix" | "conferencingOptimised" | "distributionOptimised"
> {
  const f = new Set(featureTags);

  const roomSignals =
    Number(f.has("USB-C")) +
    Number(f.has("Wireless Casting")) +
    Number(f.has("Wireless Conferencing")) +
    Number(f.has("MST")) +
    Number(f.has("USB Routing")) +
    Number(f.has("Dual Display")) +
    Number(f.has("3 Outputs")) +
    Number(text.includes("presentation")) +
    Number(text.includes("meeting room")) +
    Number(text.includes("teams room")) +
    Number(text.includes("conference"));

  const matrixSignals =
    Number(commercialFamily.includes("Matrix")) +
    Number(f.has("4+ Outputs")) +
    Number(f.has("HDBaseT Output")) +
    Number(f.has("Seamless Switching")) +
    Number(f.has("Ethernet Extension")) +
    Number(text.includes("distribution")) +
    Number(text.includes("infrastructure")) +
    Number(text.includes("central routing"));

  const avoipSignals =
    Number(commercialFamily === "AVoIP") +
    Number(text.includes("networkhd")) +
    Number(text.includes("decoder")) +
    Number(text.includes("transceiver")) +
    Number(text.includes("encoder"));

  const processorSignals =
    Number(commercialFamily === "Video Wall") +
    Number(f.has("Video Wall")) +
    Number(text.includes("processor"));

  if (processorSignals >= 2) {
    return {
      functionalRole: "Video Processor",
      routingClass: "Processing",
      matrixCapable: false,
      trueMatrix: false,
      conferencingOptimised: false,
      distributionOptimised: false,
    };
  }

  if (avoipSignals >= 2) {
    return {
      functionalRole: "Transport Endpoint",
      routingClass: "Distributed Matrix",
      matrixCapable: true,
      trueMatrix: false,
      conferencingOptimised: false,
      distributionOptimised: true,
    };
  }

  if (roomSignals >= 4 && matrixSignals >= 2) {
    return {
      functionalRole: "Room Core",
      routingClass: f.has("HDBaseT Output") || f.has("3 Outputs") ? "Limited Matrix + Extension" : "Limited Matrix",
      matrixCapable: true,
      trueMatrix: false,
      conferencingOptimised: true,
      distributionOptimised: false,
    };
  }

  if (roomSignals >= 3) {
    return {
      functionalRole: "Room Switcher",
      routingClass: f.has("Dual Display") ? "Dual Display Switching" : "Fixed Switching",
      matrixCapable: false,
      trueMatrix: false,
      conferencingOptimised: true,
      distributionOptimised: false,
    };
  }

  if (matrixSignals >= 4) {
    return {
      functionalRole: matrixSignals >= 6 ? "Distribution Core" : "Full Matrix",
      routingClass: "Full Matrix",
      matrixCapable: true,
      trueMatrix: true,
      conferencingOptimised: false,
      distributionOptimised: true,
    };
  }

  if (commercialFamily === "Extender") {
    return {
      functionalRole: "Transport Endpoint",
      routingClass: "Transport",
      matrixCapable: false,
      trueMatrix: false,
      conferencingOptimised: false,
      distributionOptimised: false,
    };
  }

  return {
    functionalRole: "Other",
    routingClass: "Other",
    matrixCapable: false,
    trueMatrix: false,
    conferencingOptimised: false,
    distributionOptimised: false,
  };
}

export function enrichProductClassification(raw: RawProductRecord): ClassificationRecord {
  const sku = upperSku(raw.sku ?? raw.model);

  const text = [
    sku,
    clean(raw.name ?? raw.title),
    clean(raw.family ?? raw.series),
    clean(raw.category ?? raw.type),
    clean(raw.description ?? raw.summary),
    ...(Array.isArray(raw.featureTags) ? raw.featureTags : []),
    ...(Array.isArray(raw.features) ? raw.features : []),
    ...(Array.isArray(raw.tags) ? raw.tags : []),
    ...(Array.isArray(raw.applications) ? raw.applications : []),
    ...(Array.isArray(raw.applicationTags) ? raw.applicationTags : []),
  ]
    .join(" ")
    .toLowerCase();

  const commercialFamily = clean(raw.family ?? raw.series) || detectCommercialFamily(text);
  const featureTags = inferFeatures(
    text,
    unique([
      ...(Array.isArray(raw.featureTags) ? raw.featureTags : []),
      ...(Array.isArray(raw.features) ? raw.features : []),
      ...(Array.isArray(raw.tags) ? raw.tags : []),
    ]),
  );
  const applicationTags = inferApplications(
    text,
    unique([
      ...(Array.isArray(raw.applications) ? raw.applications : []),
      ...(Array.isArray(raw.applicationTags) ? raw.applicationTags : []),
    ]),
  );
  const inferred = classifyBySignals(commercialFamily, featureTags, text);
  const override = EXPLICIT_OVERRIDES[sku] ?? {};

  return {
    commercialFamily: override.commercialFamily ?? commercialFamily,
    functionalRole: override.functionalRole ?? inferred.functionalRole,
    routingClass: override.routingClass ?? inferred.routingClass,
    featureTags: unique([...(override.featureTags ?? []), ...featureTags]),
    applicationTags: unique([...(override.applicationTags ?? []), ...applicationTags]),
    matrixCapable: override.matrixCapable ?? inferred.matrixCapable,
    trueMatrix: override.trueMatrix ?? inferred.trueMatrix,
    conferencingOptimised: override.conferencingOptimised ?? inferred.conferencingOptimised,
    distributionOptimised: override.distributionOptimised ?? inferred.distributionOptimised,
    notes: override.notes,
  };
}

export function matchesFeatureFilter(record: ClassificationRecord, selectedFeatures: string[]): boolean {
  if (selectedFeatures.length === 0) return true;
  return selectedFeatures.every((feature) => record.featureTags.includes(feature));
}

export function shouldHideHybridInMatrixView(
  record: ClassificationRecord,
  selectedFamily: string,
  showHybridProducts: boolean,
): boolean {
  const hybridRoomCore =
    record.functionalRole === "Room Core" &&
    (record.routingClass === "Limited Matrix" || record.routingClass === "Limited Matrix + Extension");

  return !showHybridProducts && selectedFamily === "Matrix Switcher" && hybridRoomCore;
}