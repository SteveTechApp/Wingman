import { useEffect, useMemo, useState } from "react";

export type IntelligenceSourceType = "wyrestorm" | "competitor";
export type IntelligenceReviewStatus = "draft" | "needs-review" | "approved" | "rejected";
export type IntelligenceSurface = "finder" | "compare" | "proposal" | "pitch";

export type IntelligenceConnection = {
  id: string;
  side: "input" | "output" | "bidirectional" | "control" | "audio" | "network" | "usb";
  label: string;
  connector: string;
  count: number;
  notes: string;
};

export type IntelligenceFeatureSet = {
  mst: boolean;
  wirelessCasting: boolean;
  ndi: boolean;
  dante: boolean;
  multiview: boolean;
  videoWall: boolean;
  scaling: boolean;
  seamless: boolean;
  hdbaset: boolean;
  hdbasetClass: string;
  avoip: boolean;
  networkSpeed: string;
  usb2: boolean;
  usb3: boolean;
  usbHostCount: number;
  usbPeripheralCount: number;
  kvm: boolean;
  audioDeEmbed: boolean;
  audioEmbed: boolean;
  audioDsp: boolean;
  micInputs: number;
  phantomPower: boolean;
  ir: boolean;
  rs232: boolean;
  telnet: boolean;
  ipControl: boolean;
  relays: number;
};

export type IntelligenceRelationship = {
  id: string;
  relationshipType: "works-with" | "requires" | "alternative-to" | "replaced-by" | "accessory-for" | "source-side" | "display-side";
  brand: string;
  sku: string;
  notes: string;
};

export type IntelligenceEvidence = {
  id: string;
  sourceType: "manual-entry" | "manufacturer-page" | "datasheet" | "manual" | "distributor-page" | "search-result" | "user-note";
  title: string;
  url: string;
  notes: string;
};

export type ProductIntelligenceRecord = {
  id: string;
  sourceType: IntelligenceSourceType;
  brand: string;
  sku: string;
  productName: string;
  productClass: string;
  productRole: string;
  purpose: string;
  family: string;
  confidence: number;
  reviewStatus: IntelligenceReviewStatus;
  approvedFor: Record<IntelligenceSurface, boolean>;
  physicalConnections: IntelligenceConnection[];
  softwareConnections: string[];
  features: IntelligenceFeatureSet;
  relationships: IntelligenceRelationship[];
  evidence: IntelligenceEvidence[];
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductIntelligenceDraftInput = {
  sourceType: IntelligenceSourceType;
  brand: string;
  sku: string;
  productName?: string;
};

const storageKey = "wingman.product-intelligence-admin.v1";
const changedEvent = "wingman:product-intelligence-admin-changed";

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "wia") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function normalise(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function defaultFeatures(): IntelligenceFeatureSet {
  return {
    mst: false,
    wirelessCasting: false,
    ndi: false,
    dante: false,
    multiview: false,
    videoWall: false,
    scaling: false,
    seamless: false,
    hdbaset: false,
    hdbasetClass: "",
    avoip: false,
    networkSpeed: "",
    usb2: false,
    usb3: false,
    usbHostCount: 0,
    usbPeripheralCount: 0,
    kvm: false,
    audioDeEmbed: false,
    audioEmbed: false,
    audioDsp: false,
    micInputs: 0,
    phantomPower: false,
    ir: false,
    rs232: false,
    telnet: false,
    ipControl: false,
    relays: 0,
  };
}

function approvedDefaults(): Record<IntelligenceSurface, boolean> {
  return {
    finder: false,
    compare: false,
    proposal: false,
    pitch: false,
  };
}

function inferClassFromSku(brand: string, sku: string) {
  const upperSku = sku.toUpperCase();
  const lowerBrand = normalise(brand);

  if (upperSku.startsWith("SP-")) return "distribution-amplifier";
  if (upperSku.startsWith("EX-")) return "signal-extender-kit";
  if (upperSku.startsWith("TX-")) return "transmitter";
  if (upperSku.startsWith("RX-")) return "receiver";
  if (upperSku.startsWith("MX-")) return "matrix-or-presentation-switch";
  if (upperSku.startsWith("SW-")) return "switcher-or-processor";
  if (upperSku.startsWith("UC-") || upperSku.startsWith("APO-")) return "unified-comms";
  if (upperSku.startsWith("CAM-")) return "camera-or-camera-bridge";
  if (upperSku.startsWith("CAB-") || upperSku.includes("HAOC")) return "cable";
  if (upperSku.startsWith("NHD-") && upperSku.includes("-TX")) return "avoip-encoder";
  if (upperSku.startsWith("NHD-") && upperSku.includes("-RX")) return "avoip-decoder";
  if (upperSku.startsWith("NHD-") && upperSku.includes("-TRX")) return "avoip-transceiver";
  if (upperSku.includes("-MV")) return "multiview-processor";
  if (upperSku.includes("-VW")) return "video-wall-processor";
  if (lowerBrand && lowerBrand !== "wyrestorm") return "competitor-unclassified";

  return "unclassified";
}

function inferPurposeFromClass(productClass: string) {
  if (productClass === "distribution-amplifier") return "Duplicates one source to multiple outputs. Also called splitter by lower-knowledge users.";
  if (productClass === "signal-extender-kit") return "Moves one signal path from source side to display side over distance.";
  if (productClass === "transmitter") return "Source-side signal transport endpoint.";
  if (productClass === "receiver") return "Display-side signal transport endpoint.";
  if (productClass === "avoip-encoder") return "Source-side AV-over-IP endpoint that places a source onto the AV network.";
  if (productClass === "avoip-decoder") return "Display-side AV-over-IP endpoint that receives a network stream.";
  if (productClass === "avoip-transceiver") return "Flexible AV-over-IP endpoint that may operate source-side or display-side depending on configuration.";
  if (productClass === "matrix-or-presentation-switch") return "Requires review. MX prefix may indicate matrix switching or presentation/MST room workflow.";
  if (productClass === "switcher-or-processor") return "Requires review. SW prefix may indicate HDMI switcher, presentation switcher, wireless, multiview or video wall processor.";
  if (productClass === "unified-comms") return "Unified communications or room collaboration product.";
  if (productClass === "camera-or-camera-bridge") return "Camera, PTZ, capture or camera bridge workflow.";
  if (productClass === "cable") return "Signal cable or active optical cable. Not an active switching/routing processor.";

  return "Requires manual review before Finder, Compare or Proposal can trust this record.";
}

function inferSeedConnections(sku: string, productClass: string): IntelligenceConnection[] {
  const upperSku = sku.toUpperCase();
  const items: IntelligenceConnection[] = [];

  function add(side: IntelligenceConnection["side"], label: string, connector: string, count: number, notes: string) {
    items.push({
      id: uid("conn"),
      side,
      label,
      connector,
      count,
      notes,
    });
  }

  if (productClass === "distribution-amplifier") {
    add("input", "Source input", "HDMI", 1, "Confirm exact source connector and bandwidth.");
    add("output", "Duplicated outputs", "HDMI", 2, "Update count from datasheet. All outputs normally show the same source.");
  }

  if (productClass === "signal-extender-kit") {
    add("input", "Source-side input", "HDMI", 1, "Confirm USB/audio/control support.");
    add("output", "Display-side output", "HDMI", 1, "Confirm receiver output and supported resolution.");
    add("network", "Extension path", "Category cable / HDBaseT", 1, "Confirm distance, class and cable standard.");
  }

  if (productClass === "avoip-encoder") {
    add("input", "Source input", "HDMI", 1, "Confirm source connector, resolution and audio handling.");
    add("network", "AV network", "RJ45 / network", 1, "Confirm NetworkHD family and network speed.");
  }

  if (productClass === "avoip-decoder") {
    add("network", "AV network", "RJ45 / network", 1, "Receives stream from AV network.");
    add("output", "Display output", "HDMI", 1, "Confirm resolution, scaling, wall and USB requirements.");
  }

  if (productClass === "matrix-or-presentation-switch" || upperSku.includes("0402") || upperSku.includes("0403")) {
    add("input", "Presentation inputs", "HDMI / USB-C", 4, "Review exact connector mix from datasheet.");
    add("output", "Room outputs", "HDMI", upperSku.includes("0403") ? 3 : upperSku.includes("0402") ? 2 : 1, "For MST products, review room display and MTR output behaviour.");
  }

  return items;
}

function inferFeaturesFromSku(sku: string, productClass: string): IntelligenceFeatureSet {
  const features = defaultFeatures();
  const upperSku = sku.toUpperCase();

  if (upperSku.includes("-MST")) features.mst = true;
  if (upperSku.endsWith("-W")) features.wirelessCasting = true;
  if (upperSku.includes("NDI")) features.ndi = true;
  if (upperSku.includes("DNT")) features.dante = true;
  if (upperSku.includes("-MV")) features.multiview = true;
  if (upperSku.includes("-VW")) features.videoWall = true;

  if (productClass.includes("avoip")) {
    features.avoip = true;
    features.networkSpeed = upperSku.includes("600") ? "10G" : "1G";
  }

  if (productClass === "signal-extender-kit") {
    features.hdbaset = true;
  }

  if (upperSku.includes("USB3")) {
    features.usb3 = true;
    features.usbHostCount = 1;
    features.usbPeripheralCount = 1;
  }

  if (upperSku.includes("KVM")) {
    features.kvm = true;
    features.usb2 = true;
    features.usbHostCount = 1;
    features.usbPeripheralCount = 1;
  }

  if (upperSku.includes("0402-MST") || upperSku.includes("0403") || upperSku.includes("MST")) {
    features.usb2 = true;
    features.scaling = true;
  }

  return features;
}

export function createIntelligenceRecord(input: ProductIntelligenceDraftInput): ProductIntelligenceRecord {
  const sku = input.sku.trim();
  const brand = input.brand.trim() || (input.sourceType === "wyrestorm" ? "WyreStorm" : "");
  const productClass = inferClassFromSku(brand, sku);
  const createdAt = nowIso();

  return {
    id: uid("intel"),
    sourceType: input.sourceType,
    brand,
    sku,
    productName: input.productName?.trim() || "",
    productClass,
    productRole:
      productClass.includes("encoder") || productClass.includes("decoder") || productClass.includes("transceiver")
        ? "endpoint"
        : productClass === "cable"
          ? "cable"
          : "primary-hardware",
    purpose: inferPurposeFromClass(productClass),
    family: "",
    confidence: productClass === "unclassified" || productClass === "competitor-unclassified" ? 30 : 60,
    reviewStatus: "draft",
    approvedFor: approvedDefaults(),
    physicalConnections: inferSeedConnections(sku, productClass),
    softwareConnections: [],
    features: inferFeaturesFromSku(sku, productClass),
    relationships: [],
    evidence: [
      {
        id: uid("ev"),
        sourceType: "manual-entry",
        title: "Manual seed record",
        url: "",
        notes: "Created in Wingman Product Intelligence Admin. Add datasheet/manual/manufacturer/distributor evidence before approval.",
      },
    ],
    reviewNotes: "",
    createdAt,
    updatedAt: createdAt,
  };
}

function seedRecords(): ProductIntelligenceRecord[] {
  const mx0402 = createIntelligenceRecord({
    sourceType: "wyrestorm",
    brand: "WyreStorm",
    sku: "MX-0402-MST",
    productName: "MST presentation switcher",
  });

  mx0402.productClass = "presentation-switcher";
  mx0402.productRole = "primary-hardware";
  mx0402.purpose = "Mixed-use presentation switcher for meeting-room workflows. Review MST, USB and room display topology before approval.";
  mx0402.family = "Presentation / MST";
  mx0402.confidence = 72;
  mx0402.reviewStatus = "needs-review";
  mx0402.reviewNotes = "Important mixed-use product. Model must capture dual-output and Microsoft Teams Room feed use case accurately.";
  mx0402.features.mst = true;
  mx0402.features.usb2 = true;
  mx0402.features.scaling = true;
  mx0402.relationships.push({
    id: uid("rel"),
    relationshipType: "works-with",
    brand: "Microsoft",
    sku: "Teams Room / MTR",
    notes: "User note: third output is relevant to MTR feed workflow. Confirm and document from trusted source.",
  });

  const mx0403 = createIntelligenceRecord({
    sourceType: "wyrestorm",
    brand: "WyreStorm",
    sku: "MX-0403-H3-MST",
    productName: "MST presentation switcher with MTR output consideration",
  });

  mx0403.productClass = "presentation-switcher";
  mx0403.productRole = "primary-hardware";
  mx0403.purpose = "Mixed-use room presentation product. Requires granular modelling of display outputs, MTR feed, USB and MST behaviour.";
  mx0403.family = "Presentation / MST";
  mx0403.confidence = 72;
  mx0403.reviewStatus = "needs-review";
  mx0403.reviewNotes = "Treat as priority enrichment example. Capture third-output purpose, MTR workflow, dual display and USB topology.";
  mx0403.features.mst = true;
  mx0403.features.usb2 = true;
  mx0403.features.scaling = true;
  mx0403.relationships.push({
    id: uid("rel"),
    relationshipType: "works-with",
    brand: "Microsoft",
    sku: "Teams Room / MTR",
    notes: "User note: third output designed to feed Microsoft MTR. Verify and document evidence.",
  });

  const cameraApp = createIntelligenceRecord({
    sourceType: "wyrestorm",
    brand: "WyreStorm",
    sku: "Teams Camera Control App",
    productName: "Teams-certified camera control app",
  });

  cameraApp.productClass = "software-capability";
  cameraApp.productRole = "software";
  cameraApp.purpose = "Software capability for Teams-certified camera control, multi-camera management and composited single-camera output workflow.";
  cameraApp.family = "Unified Comms / Camera Control";
  cameraApp.confidence = 45;
  cameraApp.reviewStatus = "needs-review";
  cameraApp.reviewNotes = "User-reported new WyreStorm app. Needs trusted evidence before being used in Product Pitch, Call Cards, Discovery or Proposal.";
  cameraApp.softwareConnections = ["Microsoft Teams", "camera control", "multi-camera management", "single composed camera feed"];
  cameraApp.relationships.push({
    id: uid("rel"),
    relationshipType: "works-with",
    brand: "WyreStorm",
    sku: "Compatible WyreStorm cameras / camera bridges",
    notes: "Define compatible SKUs once confirmed.",
  });

  return [mx0402, mx0403, cameraApp];
}

function readRecords(): ProductIntelligenceRecord[] {
  if (typeof window === "undefined") {
    return seedRecords();
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    const seeds = seedRecords();
    window.localStorage.setItem(storageKey, JSON.stringify(seeds));
    return seeds;
  }

  try {
    const parsed = JSON.parse(raw) as ProductIntelligenceRecord[];
    return Array.isArray(parsed) ? parsed : seedRecords();
  } catch {
    return seedRecords();
  }
}

function writeRecords(records: ProductIntelligenceRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(changedEvent));
}

export function getProductIntelligenceRecords() {
  return readRecords();
}

export function saveProductIntelligenceRecord(record: ProductIntelligenceRecord) {
  const records = readRecords();
  const updatedRecord = {
    ...record,
    updatedAt: nowIso(),
  };

  const existingIndex = records.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = updatedRecord;
  } else {
    records.unshift(updatedRecord);
  }

  writeRecords(records);
  return updatedRecord;
}

export function deleteProductIntelligenceRecord(id: string) {
  writeRecords(readRecords().filter((item) => item.id !== id));
}

export function useProductIntelligenceAdmin() {
  const [records, setRecords] = useState<ProductIntelligenceRecord[]>(() => readRecords());

  useEffect(() => {
    function handleChange() {
      setRecords(readRecords());
    }

    window.addEventListener(changedEvent, handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(changedEvent, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const stats = useMemo(() => {
    const total = records.length;
    const needsReview = records.filter((item) => item.reviewStatus === "needs-review" || item.reviewStatus === "draft").length;
    const approved = records.filter((item) => item.reviewStatus === "approved").length;
    const competitors = records.filter((item) => item.sourceType === "competitor").length;
    const wyrestorm = records.filter((item) => item.sourceType === "wyrestorm").length;

    return { total, needsReview, approved, competitors, wyrestorm };
  }, [records]);

  function upsert(record: ProductIntelligenceRecord) {
    const saved = saveProductIntelligenceRecord(record);
    setRecords(readRecords());
    return saved;
  }

  function addDraft(input: ProductIntelligenceDraftInput) {
    const saved = saveProductIntelligenceRecord(createIntelligenceRecord(input));
    setRecords(readRecords());
    return saved;
  }

  function remove(id: string) {
    deleteProductIntelligenceRecord(id);
    setRecords(readRecords());
  }

  return {
    records,
    stats,
    upsert,
    addDraft,
    remove,
  };
}