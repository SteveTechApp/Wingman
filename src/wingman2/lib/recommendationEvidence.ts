import type {
  StoredCompareRun,
  StoredDiscoveryBrief,
  StoredProductSelection,
  StoredProject,
  StoredProductFamilyScore,
  StoredQuoteSafetyStatus,
  StoredRecommendationEvidence,
  StoredRecommendationProductFamily,
} from "../data/projectStore";
import { buildSalesReadinessPackage } from "./salesReadiness";
import { buildAvDecisionEvidence } from "./avDecisionEvidence";
import {
  normaliseProjectTopology,
  projectTopologyConnectionTypes,
  projectTopologyEvidenceLines,
  projectTopologySummary,
} from "./projectTopology";

export type RecommendationEvidenceProduct = {
  sku: string;
  title?: string;
  name?: string;
  family?: string;
  category?: string;
  summary?: string;
  features?: string[];
  tags?: string[];
  source?: string;
  isFallback?: boolean;
};

export type RecommendationEvidenceCompare = {
  id?: string;
  competitorBrand?: string;
  competitorSku?: string;
  competitorName?: string;
  wyrestormSku?: string;
  wyrestormTitle?: string;
  matchScore?: number;
  confidence?: string;
  warnings?: string[];
  evidence?: string[];
  summary?: string;
  source?: string;
};

export type RecommendationEvidenceInput = {
  source: string;
  project?: StoredProject | null;
  discoveryBrief?: StoredDiscoveryBrief | null;
  product?: RecommendationEvidenceProduct | StoredProductSelection | null;
  compare?: RecommendationEvidenceCompare | StoredCompareRun | null;
  query?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function text(value: unknown, fallback = "") {
  const output = String(value ?? "").trim();
  return output || fallback;
}

function list(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  const output = text(value);
  return output ? [output] : [];
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => text(item)).filter(Boolean)));
}

function hasAny(value: string, terms: string[]) {
  const haystack = value.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function valueIsMissing(value: unknown) {
  const output = text(value).toLowerCase();
  return !output || output === "unknown" || output === "not confirmed" || output === "not sure";
}

function productTitle(product?: RecommendationEvidenceProduct | StoredProductSelection | null) {
  if (!product) return "";
  return text("name" in product ? product.name : "", text(product.title, product.sku));
}

function productSummary(product?: RecommendationEvidenceProduct | StoredProductSelection | null) {
  return product && "summary" in product ? text(product.summary) : "";
}

function productEvidence(product?: RecommendationEvidenceProduct | StoredProductSelection | null) {
  return product && "evidence" in product ? product.evidence ?? [] : [];
}

function productCautions(product?: RecommendationEvidenceProduct | StoredProductSelection | null) {
  return product && "cautions" in product ? product.cautions ?? [] : [];
}

function productText(product?: RecommendationEvidenceProduct | StoredProductSelection | null) {
  if (!product) return "";
  return [
    product.sku,
    productTitle(product),
    product.family,
    product.category,
    "summary" in product ? product.summary : "",
    ...("features" in product ? product.features ?? [] : []),
    ...(product.tags ?? []),
    ...productEvidence(product),
    ...productCautions(product),
  ].join(" ").toLowerCase();
}

function roomModelFrom(input: RecommendationEvidenceInput) {
  return input.discoveryBrief?.roomModel ?? input.project?.discoveryBrief?.roomModel ?? {};
}

function inferenceFrom(input: RecommendationEvidenceInput) {
  return input.discoveryBrief?.inference ?? input.project?.discoveryBrief?.inference ?? {};
}

function discoveryFrom(input: RecommendationEvidenceInput) {
  return input.discoveryBrief ?? input.project?.discoveryBrief ?? null;
}

function topologyFrom(input: RecommendationEvidenceInput) {
  const discovery = discoveryFrom(input);
  const roomModel = roomModelFrom(input);
  return normaliseProjectTopology(discovery?.topology ?? roomModel.topology);
}

function combinedRequirementText(input: RecommendationEvidenceInput) {
  const roomModel = roomModelFrom(input);
  const inference = inferenceFrom(input);
  const topology = topologyFrom(input);
  return [
    input.query,
    input.project?.name,
    roomModel.customerWording,
    roomModel.notes,
    roomModel.applicationType,
    roomModel.outcome,
    roomModel.roomType,
    roomModel.displayBehaviour,
    roomModel.displays,
    roomModel.videoWallRequirement,
    roomModel.ucPurpose,
    roomModel.unifiedCommunicationsRequirement,
    roomModel.conferencingPlatform,
    roomModel.cameraNeeds,
    roomModel.cameraRouting,
    roomModel.microphoneNeeds,
    roomModel.microphoneConnections,
    roomModel.usbTransport,
    roomModel.usbOwnership,
    roomModel.audioPath,
    roomModel.networkAvailability,
    roomModel.network,
    projectTopologySummary(topology),
    ...projectTopologyConnectionTypes(topology),
    ...projectTopologyEvidenceLines(topology),
    inference.summary,
    inference.architecture,
    input.compare?.summary,
    input.compare?.competitorSku,
    input.compare?.competitorName,
  ].join(" ").toLowerCase();
}

function fieldLine(label: string, value: unknown) {
  const output = Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean).join(", ") : text(value);
  return output ? `${label}: ${output}` : "";
}

function countEvidence(input: RecommendationEvidenceInput) {
  const roomModel = roomModelFrom(input);
  return unique([
    fieldLine("Customer wording", roomModel.customerWording ?? roomModel.notes ?? roomModel.outcome),
    fieldLine("Application", roomModel.applicationType ?? roomModel.outcome),
    fieldLine("Room type", roomModel.roomType),
    fieldLine("Source count", roomModel.sourceCount),
    fieldLine("Display count", roomModel.displayCount),
    fieldLine("Resolution", roomModel.resolutionRequirement ?? roomModel.signalStandard),
    fieldLine("Locations/connections", projectTopologySummary(topologyFrom(input)) || (roomModel.distanceInfrastructureNotes ?? roomModel.longestRun ?? roomModel.cableRun)),
    fieldLine("Connection types", projectTopologyConnectionTypes(topologyFrom(input))),
    fieldLine("Unified Communications", roomModel.unifiedCommunicationsRequirement ?? roomModel.ucPurpose),
    fieldLine("UC platform", roomModel.conferencingPlatform),
    fieldLine("Cameras", roomModel.cameraNeeds),
    fieldLine("Camera routing", roomModel.cameraRouting),
    fieldLine("Microphones", roomModel.microphoneNeeds),
    fieldLine("Microphone connections", roomModel.microphoneConnections),
    fieldLine("USB host/transport", roomModel.usbTransport ?? roomModel.usbOwnership),
    fieldLine("Audio", roomModel.audioPath ?? roomModel.audioNeeds),
    fieldLine("Control", roomModel.controlNeeds),
    fieldLine("Network", roomModel.networkAvailability ?? roomModel.network),
    fieldLine("Wall/multiview", roomModel.videoWallRequirement ?? roomModel.displayBehaviour),
  ]);
}

function customerRequirement(input: RecommendationEvidenceInput) {
  const roomModel = roomModelFrom(input);
  return text(
    roomModel.customerWording,
    text(roomModel.notes, text(roomModel.outcome, text(input.query, "Customer requirement not confirmed."))),
  );
}

function productDirection(input: RecommendationEvidenceInput) {
  if (input.product?.sku) {
    return `${input.product.sku} - ${productTitle(input.product)}`;
  }

  const inference = inferenceFrom(input);
  const roomModel = roomModelFrom(input);
  return text(
    inference.architecture,
    text(roomModel.inferredArchitectureDirection, text(roomModel.designDirection, "Product direction not selected.")),
  );
}

type RecommendationArchitectureDecision = {
  path:
    | "dedicated-wall-processor"
    | "networkhd-avoip"
    | "education-hybrid"
    | "meeting-room"
    | "contained-routing"
    | "core-review";
  systemShape: string;
  evidence: string[];
  missingInformation: string[];
  requiredDependencies: string[];
  optionalUpgrades: string[];
  alternatives: string[];
  quoteChecks: string[];
  customerSafeWording: string[];
  repGuidance: string[];
};


type RecommendationProductFamily = StoredRecommendationProductFamily;
type RecommendationProductFamilyScore = StoredProductFamilyScore;

function numberFromRequirement(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);
  const parsed = Number(match?.[0]);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return null;
}

function architectureDecision(input: RecommendationEvidenceInput): RecommendationArchitectureDecision {
  const roomModel = roomModelFrom(input);
  const productBlob = productText(input.product);
  const requirementText = combinedRequirementText(input);
  const combined = `${productBlob} ${requirementText}`;

  const sourceCount = numberFromRequirement(roomModel.sourceCount);
  const displayCount = numberFromRequirement(roomModel.displayCount);

  const isWall = hasAny(combined, ["video wall", "videowall", "led wall", "lcd wall", "novastar", "wall processor"]);
  const isNetworkHd = hasAny(combined, ["networkhd", "av over ip", "av-over-ip", "avoip", "nhd-"]);
  const isMeeting = hasAny(combined, ["meeting", "conference", "teams", "zoom", "uc", "usb", "byod", "byom", "camera", "speakerphone"]);
  const isEducation = hasAny(combined, ["higher education", "education", "teaching", "classroom", "lecture", "lectern", "confidence display"]);
  const isHospitality = hasAny(combined, ["hospitality", "sports bar", "bar", "casino", "hotel", "pub", "venue"]);
  const isContained = hasAny(combined, ["contained", "local rack", "local source", "simple source", "fixed routing"]);
  const isFlexibleDistribution = hasAny(combined, [
    "any source to any display",
    "multi-room",
    "distributed",
    "remote source",
    "campus",
    "estate",
    "managed network",
    "av vlan",
    "networked building",
    "flexible routing",
  ]);

  if (isWall) {
    return {
      path: "dedicated-wall-processor",
      systemShape:
        "Validate the wall as a dedicated processor path first, then compare against AV-over-IP only if routing flexibility, source expansion, or distributed endpoints are required.",
      evidence: [
        "Architecture decision: video wall or LED wall language detected.",
        "Dedicated processor validation should happen before selecting an AV-over-IP wall approach.",
      ],
      missingInformation: [
        "Wall layout, source behaviour, canvas/preset needs and processor path",
      ],
      requiredDependencies: [
        "Confirmed LED/LCD processor input path, canvas behaviour, source layout presets and control requirement.",
      ],
      optionalUpgrades: [
        "Consider SW-0204-VW for simple preset-layout walls.",
        "Consider SW-0206-VW for flexible dedicated non-AV-over-IP wall processing.",
      ],
      alternatives: [
        "Do not assume AV-over-IP is best for video wall work; compare SW-0206-VW, SW-0204-VW and NetworkHD options against the confirmed behaviour.",
      ],
      quoteChecks: [
        "Validate wall geometry, processor path, scaling behaviour, presets, source count and control before quote.",
      ],
      customerSafeWording: [
        "For the wall element, we should validate the processor and layout behaviour before treating this as a generic distribution system.",
      ],
      repGuidance: [
        "Ask whether the customer needs full canvas, preset layouts, per-display content, multiview, or simple processor input switching.",
      ],
    };
  }

  if (isNetworkHd || isFlexibleDistribution || (displayCount !== null && displayCount > 10 && !isContained)) {
    return {
      path: "networkhd-avoip",
      systemShape:
        "NetworkHD direction: source encoders, display decoders, NHD-CTL-PRO control, and a validated managed network switching design.",
      evidence: [
        "Architecture decision: flexible or distributed routing requirement detected.",
        displayCount !== null ? `Display count captured: ${displayCount}.` : "",
        sourceCount !== null ? `Source count captured: ${sourceCount}.` : "",
      ],
      missingInformation: [
        "Network availability, managed switch suitability and AV VLAN approach",
      ],
      requiredDependencies: [
        "NHD-CTL-PRO control layer for NetworkHD projects.",
        "Suitable managed network switching design, including multicast/IGMP and AV VLAN considerations.",
      ],
      optionalUpgrades: [
        "Consider NetworkHD 500 for premium 4K60 4:4:4 workflows, stronger USB support, or Dante-ready discussions.",
        "Consider NetworkHD 600 where the project genuinely needs highest-performance lossless zero-latency 10G AV-over-IP.",
      ],
      alternatives: [
        "Do not choose AV-over-IP when a contained matrix or dedicated wall processor is the simpler, safer answer.",
        "Do not imply NetworkHD series interoperability; keep each NetworkHD family validated as its own system.",
      ],
      quoteChecks: [
        "Validate switching infrastructure, multicast/IGMP, VLAN design, endpoint count, controller, and NetworkHD family before quote.",
      ],
      customerSafeWording: [
        "The NetworkHD direction is appropriate only if the project needs flexible routing, distributed endpoints, or expansion beyond a simple fixed matrix.",
      ],
      repGuidance: [
        "Confirm whether the customer needs any-source-to-any-display routing or whether a simpler matrix would satisfy the brief.",
      ],
    };
  }

  if (isEducation) {
    return {
      path: "education-hybrid",
      systemShape:
        "Education / hybrid teaching-room direction: confirm presentation switching, USB capture, audio, control, confidence display and managed-network requirements before selecting the final platform.",
      evidence: [
        "Architecture decision: higher-education or teaching-room language detected.",
      ],
      missingInformation: [
        "Teaching-room USB capture path, audio path, control ownership and confidence-display behaviour",
      ],
      requiredDependencies: [
        "Confirmed USB, camera/capture, microphone/audio, control and confidence-display paths before quote.",
      ],
      optionalUpgrades: [
        "Consider hybrid matrix or presentation switcher direction where USB, audio and control are part of the room workflow.",
        "Consider NetworkHD only when room-to-room routing, distributed endpoints or managed-network scale justify it.",
      ],
      alternatives: [
        "Do not reduce teaching rooms to video switching only; USB, audio, control and confidence display may drive the design.",
      ],
      quoteChecks: [
        "Validate lectern sources, laptop inputs, USB devices, capture path, audio routing, control interface and display behaviour.",
      ],
      customerSafeWording: [
        "For a teaching room, the video path should be checked alongside USB, audio, control and confidence-display behaviour.",
      ],
      repGuidance: [
        "Ask what needs to be captured, what the lecturer controls, and whether the confidence display follows or differs from the main output.",
      ],
    };
  }

  if (isMeeting) {
    return {
      path: "meeting-room",
      systemShape:
        "Meeting-room direction: presentation path plus explicit USB host/peripheral routing, audio path, display behaviour, and control ownership.",
      evidence: [
        "Architecture decision: meeting, UC, BYOD/BYOM or USB language detected.",
      ],
      missingInformation: [
        "USB host ownership, peripheral location and transport bandwidth",
      ],
      requiredDependencies: [
        "Confirmed USB host/peripheral transport path before quoting conferencing or BYOD workflows.",
      ],
      optionalUpgrades: [
        "Consider presentation switcher or UC direction before AV-over-IP for simple one-room collaboration spaces.",
      ],
      alternatives: [
        "Do not default a one-room USB-C/BYOM meeting room to AV-over-IP unless routing scale or distribution requires it.",
      ],
      quoteChecks: [
        "Validate laptop ownership, USB host, camera, microphone/speakerphone, display count, audio path and control needs.",
      ],
      customerSafeWording: [
        "The meeting-room direction should be led by how the laptop, USB devices, audio and display are actually used.",
      ],
      repGuidance: [
        "Ask where the camera, microphone and speakerphone connect, and which device owns the USB session.",
      ],
    };
  }

  if (isContained || isHospitality || hasAny(combined, ["matrix", "multi-zone", "switcher"]) || (displayCount !== null && displayCount <= 10)) {
    return {
      path: "contained-routing",
      systemShape:
        "Contained routing direction: matrix or switcher architecture with confirmed input/output count, display behaviour, distance, and receiver requirements.",
      evidence: [
        "Architecture decision: contained matrix/switcher or hospitality distribution requirement detected.",
        displayCount !== null ? `Display count captured: ${displayCount}.` : "",
        sourceCount !== null ? `Source count captured: ${sourceCount}.` : "",
      ],
      missingInformation: [
        "Routed output count, source count, receiver requirement and cable-distance path",
      ],
      requiredDependencies: [
        "Confirmed receiver/extender requirement, cable distance, output behaviour and control method for contained distribution.",
      ],
      optionalUpgrades: [
        "Keep MX-0808-KIT or matrix direction in play for contained cost-sensitive systems.",
      ],
      alternatives: [
        "Do not move a contained local system to AV-over-IP unless flexibility, distance, mixed locations or expansion justify it.",
      ],
      quoteChecks: [
        "Validate source count, routed display count, mirrored outputs, HDBaseT receiver needs, cable distance and audio/control requirements.",
      ],
      customerSafeWording: [
        "For contained distribution, a matrix or switcher route may be simpler and safer than networked AV if the routing requirement is fixed.",
      ],
      repGuidance: [
        "Start from the display count and work backwards to sources, routed outputs, receiver locations and cable distances.",
      ],
    };
  }

  return {
    path: "core-review",
    systemShape:
      "Core WyreStorm product direction with source, display, distance, USB, audio, control, and dependency checks still visible.",
    evidence: [
      "Architecture decision: not enough confirmed context to choose a stronger architecture path.",
    ],
    missingInformation: [
      "Application type, source count, display count, distance, USB, audio, control and network requirement",
    ],
    requiredDependencies: [],
    optionalUpgrades: [],
    alternatives: [
      "Do not name a final SKU until the architecture path is clearer.",
    ],
    quoteChecks: [
      "Confirm the application, source/display count, signal distance, USB, audio, control and network needs before quote.",
    ],
    customerSafeWording: [
      "The current direction needs further requirement confirmation before it becomes a final design.",
    ],
    repGuidance: [
      "Use discovery to clarify the architecture before pushing a product.",
    ],
  };
}

function suggestedSystemShape(input: RecommendationEvidenceInput) {
  return architectureDecision(input).systemShape;
}


function addFamilyScore(
  scores: Map<RecommendationProductFamily, RecommendationProductFamilyScore>,
  family: RecommendationProductFamily,
  points: number,
  reason: string,
) {
  const existing = scores.get(family) ?? {
    family,
    score: 0,
    reasons: [],
    cautions: [],
  };

  existing.score += points;

  if (reason) {
    existing.reasons.push(reason);
  }

  scores.set(family, existing);
}

function addFamilyCaution(
  scores: Map<RecommendationProductFamily, RecommendationProductFamilyScore>,
  family: RecommendationProductFamily,
  caution: string,
) {
  const existing = scores.get(family) ?? {
    family,
    score: 0,
    reasons: [],
    cautions: [],
  };

  if (caution) {
    existing.cautions.push(caution);
  }

  scores.set(family, existing);
}

function productFamilyScores(input: RecommendationEvidenceInput): RecommendationProductFamilyScore[] {
  const architecture = architectureDecision(input);
  const roomModel = roomModelFrom(input);
  const combined = `${productText(input.product)} ${combinedRequirementText(input)}`;
  const requirementText = combinedRequirementText(input);
  const displayCount = numberFromRequirement(roomModel.displayCount);
  const sourceCount = numberFromRequirement(roomModel.sourceCount);
  const scores = new Map<RecommendationProductFamily, RecommendationProductFamilyScore>();

  addFamilyScore(scores, "Core review", 10, "Every recommendation still needs requirement, datasheet and dependency validation.");

  if (architecture.path === "networkhd-avoip") {
    addFamilyScore(scores, "NetworkHD", 70, "Architecture decision favours flexible or distributed AV-over-IP.");
    addFamilyScore(scores, "Matrix / HDBaseT", 20, "Matrix / HDBaseT remains an alternative if routing proves fixed and local.");
    addFamilyCaution(scores, "NetworkHD", "Confirm controller, managed switch, multicast/IGMP, VLAN and NetworkHD family before quoting.");
  }

  if (architecture.path === "contained-routing") {
    addFamilyScore(scores, "Matrix / HDBaseT", 70, "Architecture decision favours contained fixed routing.");
    addFamilyScore(scores, "NetworkHD", 20, "NetworkHD remains an upgrade path only if routing flexibility or expansion is required.");
    addFamilyCaution(scores, "NetworkHD", "Do not move a simple local system to AV-over-IP without a routing or scale reason.");
  }

  if (architecture.path === "meeting-room") {
    addFamilyScore(scores, "Presentation / UC", 75, "Meeting-room workflow is driven by USB, BYOM/BYOD, camera, audio and display behaviour.");
    addFamilyScore(scores, "Matrix / HDBaseT", 20, "Matrix / HDBaseT may apply where room extension or local routed outputs are required.");
    addFamilyCaution(scores, "NetworkHD", "Do not default a single-room USB-C/BYOM requirement to AV-over-IP.");
  }

  if (architecture.path === "education-hybrid") {
    addFamilyScore(scores, "Presentation / UC", 45, "Teaching-room workflow includes USB, capture, audio and control validation.");
    addFamilyScore(scores, "Matrix / HDBaseT", 45, "Education spaces often need routed outputs, confidence display and extension.");
    addFamilyScore(scores, "NetworkHD", 25, "NetworkHD applies when the teaching space connects into distributed or campus routing.");
    addFamilyCaution(scores, "Presentation / UC", "Validate audio, capture, control and confidence display before proposing.");
  }

  if (architecture.path === "dedicated-wall-processor") {
    addFamilyScore(scores, "Video wall processor", 80, "Video wall or LED processor language requires dedicated wall-processing validation first.");
    addFamilyScore(scores, "NetworkHD", 25, "NetworkHD applies only if routing flexibility, distributed endpoints or expansion justify it.");
    addFamilyCaution(scores, "NetworkHD", "Do not assume AV-over-IP is the primary wall approach before wall behaviour is confirmed.");
  }

  if (sourceCount !== null && sourceCount > 8) {
    addFamilyScore(scores, "NetworkHD", 10, `Source count is high: ${sourceCount}.`);
    addFamilyScore(scores, "Matrix / HDBaseT", 10, `Source count may require a larger matrix: ${sourceCount}.`);
  }

  if (displayCount !== null && displayCount > 10) {
    addFamilyScore(scores, "NetworkHD", 15, `Display count favours scalable distribution: ${displayCount}.`);
  }

  if (hasAny(combined, ["hdbaset", "receiver", "extender", "cat6", "cat 6", "distance"])) {
    addFamilyScore(scores, "Matrix / HDBaseT", 15, "Distance or receiver language supports matrix / HDBaseT validation.");
  }

  if (hasAny(combined, ["usb", "byom", "byod", "teams", "zoom", "camera", "speakerphone"])) {
    addFamilyScore(scores, "Presentation / UC", 15, "USB or UC language supports presentation / UC validation.");
  }

  if (hasAny(requirementText, ["mst", "multi-stream transport", "extended desktop", "independent desktop", "independent displays"])) {
    addFamilyScore(scores, "Presentation / UC", 30, "True USB-C MST / independent desktop behaviour is required.");
    addFamilyScore(scores, "Matrix / HDBaseT", 15, "A room-core switcher/matrix may be required to carry the MST-capable USB-C workflow.");
    addFamilyCaution(scores, "NetworkHD", "Do not treat AVoIP, dual outputs or multiview as a substitute for USB-C MST extended desktops.");
  }

  if (hasAny(requirementText, ["wireless presentation", "wireless casting", "airplay", "miracast", "chromecast", "wireless screen share", "wireless screenshare"])) {
    addFamilyScore(scores, "Presentation / UC", 25, "Wireless casting workflow is explicitly required.");
    addFamilyCaution(scores, "Presentation / UC", "Confirm the required casting protocols, corporate Wi-Fi policy, guest access and simultaneous presenter behaviour.");
  }

  if (hasAny(requirementText, ["multiview", "multi-view", "quad view", "picture in picture", "picture-by-picture", "multiple sources on one screen"])) {
    if (hasAny(requirementText, ["video wall", "videowall", "led wall", "lcd wall", "novastar", "led processor"])) {
      addFamilyScore(scores, "Video wall processor", 25, "Multiview is required on a wall/LED canvas.");
    } else if (hasAny(requirementText, ["networkhd", "av over ip", "avoip", "distributed", "networked"])) {
      addFamilyScore(scores, "NetworkHD", 20, "Multiview is required within a distributed AV-over-IP workflow.");
    } else {
      addFamilyScore(scores, "Presentation / UC", 20, "Multiview is required in a contained presentation workflow.");
    }

    addFamilyCaution(scores, "Core review", "Confirm whether the customer needs multiview on one canvas, matrix routing to several displays, or USB-C MST extended desktops.");
  }

  if (hasAny(requirementText, ["zero latency", "zero-latency", "genlock", "lossless", "sdvoe", "10gbe", "10g"])) {
    addFamilyScore(scores, "NetworkHD", 25, "High-performance lossless/zero-latency AV-over-IP language detected.");
    addFamilyCaution(scores, "NetworkHD", "Validate NetworkHD 600, 10GbE switching, cabling and Genlock expectations before positioning a zero-latency solution.");
  }

  if (hasAny(combined, ["sw-0206-vw", "sw-0204-vw", "novastar", "led wall", "video wall"])) {
    addFamilyScore(scores, "Video wall processor", 20, "Wall processor language detected.");
  }

  return Array.from(scores.values())
    .map((score) => ({
      ...score,
      score: Math.max(0, Math.min(100, score.score)),
      reasons: unique(score.reasons),
      cautions: unique(score.cautions),
    }))
    .sort((a, b) => b.score - a.score);
}

function productFamilyScoreEvidence(scores: RecommendationProductFamilyScore[]) {
  return scores.map((score) => {
    const reasons = score.reasons.slice(0, 2).join(" ");
    return `Product-family score: ${score.family} ${score.score}/100. ${reasons}`.trim();
  });
}

function productFamilyScoreQuoteChecks(scores: RecommendationProductFamilyScore[]) {
  return scores.flatMap((score) =>
    score.cautions.map((caution) => `Product-family caution: ${score.family}: ${caution}`),
  );
}

function topProductFamily(scores: RecommendationProductFamilyScore[]) {
  return scores[0]?.family ?? "Core review";
}

function addMissingInformation(input: RecommendationEvidenceInput, output: Set<string>) {
  const roomModel = roomModelFrom(input);
  const requirementText = combinedRequirementText(input);
  const productBlob = productText(input.product);
  const combined = `${requirementText} ${productBlob}`;
  const discovery = discoveryFrom(input);

  list(discovery?.missingInformation).forEach((item) => output.add(item));
  list(inferenceFrom(input).missing).forEach((item) => output.add(item));

  if (valueIsMissing(roomModel.sourceCount)) output.add("Source count and source connector types");
  if (valueIsMissing(roomModel.displayCount)) output.add("Display/output count and display behaviour");
  if (valueIsMissing(roomModel.resolutionRequirement ?? roomModel.signalStandard)) output.add("Resolution, HDR, HDCP and EDID requirement");
  if (valueIsMissing(roomModel.distanceInfrastructureNotes ?? roomModel.longestRun ?? roomModel.cableRun)) output.add("Installed cable distance and infrastructure path");

  if (hasAny(combined, ["meeting", "conference", "teams", "zoom", "uc", "usb", "byod", "byom"]) && valueIsMissing(roomModel.usbTransport ?? roomModel.usbOwnership)) {
    output.add("USB host ownership, peripheral location and transport bandwidth");
  }

  if (hasAny(combined, ["networkhd", "av over ip", "avoip", "ndi"]) && valueIsMissing(roomModel.networkAvailability ?? roomModel.network)) {
    output.add("Network availability, managed switch suitability and AV VLAN approach");
  }

  if (hasAny(combined, ["video wall", "videowall", "multiview", "multi-view", "lcd wall", "led wall"])) {
    output.add("Wall layout, source behaviour, canvas/preset needs and processor path");
  }

  architectureDecision(input).missingInformation.forEach((item) => output.add(item));
}

function requiredDependencies(input: RecommendationEvidenceInput) {
  const product = input.product;
  const productBlob = productText(product);
  const requirementText = combinedRequirementText(input);
  const combined = `${productBlob} ${requirementText}`;
  const dependencies: string[] = [...architectureDecision(input).requiredDependencies];

  if (hasAny(combined, ["networkhd", "av over ip", "avoip"])) {
    dependencies.push("NHD-CTL-PRO control layer for NetworkHD projects.");
    dependencies.push("Suitable managed network switching design, including multicast/IGMP and AV VLAN considerations.");
  }

  if (hasAny(combined, ["usb", "uc", "teams", "zoom", "byod", "byom", "camera", "microphone"])) {
    dependencies.push("Confirmed USB host/peripheral transport path before quoting conferencing or BYOD workflows.");
  }

  if (hasAny(combined, ["video wall", "videowall", "multiview", "multi-view"])) {
    dependencies.push("Confirmed source count, display count, wall geometry, layout behaviour and control requirement.");
  }

  if (product?.sku) {
    const selection = productToSelection(product, input.source);
    const readiness = buildSalesReadinessPackage({
      products: [selection],
      discovery: salesDiscovery(input),
      assumptions: missingInformation(input),
      compareRun: compareToStoredRun(input.compare),
    });
    dependencies.push(...readiness.governedDependencies.map((dependency) => `${dependency.sku}: ${dependency.customerSafeNote || dependency.validationQuestion}`));
  }

  return unique(dependencies).slice(0, 8);
}

function optionalUpgrades(input: RecommendationEvidenceInput) {
  const combined = `${productText(input.product)} ${combinedRequirementText(input)}`;
  const output: string[] = [...architectureDecision(input).optionalUpgrades];

  if (hasAny(combined, ["networkhd 100", "nhd-120", "nhd-150"])) {
    output.push("Consider NetworkHD 500 where the brief needs premium 4K60 4:4:4 workflows, stronger USB support, or Dante-ready discussions.");
    output.push("Consider NetworkHD 600 where the project genuinely needs highest-performance lossless zero-latency 10G AV-over-IP.");
  }

  if (hasAny(combined, ["video wall", "videowall", "lcd wall"])) {
    output.push("Consider SW-0204-VW for simple preset-layout walls.");
    output.push("Consider SW-0206-VW for flexible dedicated non-AV-over-IP wall processing.");
  }

  if (hasAny(combined, ["matrix", "hospitality", "sports bar", "contained"])) {
    output.push("Keep MX-0808-KIT or matrix direction in play for contained cost-sensitive systems.");
  }

  return unique(output);
}

function alternatives(input: RecommendationEvidenceInput) {
  const combined = `${productText(input.product)} ${combinedRequirementText(input)}`;
  const output: string[] = [
    ...architectureDecision(input).alternatives,
    "Do not issue a final quote until datasheet, lifecycle, region, firmware and accessory checks are complete.",
  ];

  if (hasAny(combined, ["networkhd", "av over ip", "avoip"])) {
    output.push("Do not imply NetworkHD series interoperability; keep each NetworkHD family validated as its own system.");
    output.push("Do not choose AV-over-IP when a contained matrix or dedicated wall processor is the simpler, safer answer.");
  }

  if (hasAny(combined, ["video wall", "videowall", "lcd wall"])) {
    output.push("Do not assume AV-over-IP is best for video wall work; compare SW-0206-VW, SW-0204-VW and NetworkHD options against the confirmed behaviour.");
  }

  if (input.compare?.competitorSku || input.compare?.competitorName || input.compare?.competitorBrand) {
    output.push("Competitor products are comparison-only and must not be carried into a WyreStorm BOM.");
  }

  return unique(output);
}

function missingInformation(input: RecommendationEvidenceInput) {
  const missing = new Set<string>();
  addMissingInformation(input, missing);
  return Array.from(missing);
}

function quoteSafetyStatus(input: RecommendationEvidenceInput, missing: string[], dependencies: string[], decisionBlockerCount = 0): StoredQuoteSafetyStatus {
  const compareScore = Number(input.compare?.matchScore ?? 0);
  const fallbackProduct = Boolean(input.product && "isFallback" in input.product && input.product.isFallback);
  const weakCompare = Boolean(input.compare && compareScore > 0 && compareScore < 66);

  if (decisionBlockerCount > 0 || missing.length >= 3 || !input.product?.sku) return "do-not-quote-yet";
  if (missing.length > 0 || fallbackProduct || weakCompare || dependencies.length > 0) return "validate-before-quote";
  return "quote-ready";
}

function quoteSafetyMessage(status: StoredQuoteSafetyStatus, missing: string[]) {
  if (status === "quote-ready") return "Quote-ready draft after final datasheet and dependency validation.";
  if (status === "validate-before-quote") return "Validate before quote - the product direction is usable, but checks remain.";
  return `Do not quote yet - confirm ${missing[0] || "the missing requirement detail"} first.`;
}

function confidence(status: StoredQuoteSafetyStatus, missing: string[]): StoredRecommendationEvidence["confidence"] {
  if (status === "quote-ready") return "high";
  if (status === "validate-before-quote" && missing.length <= 2) return "medium";
  return "low";
}

function compareEvidence(compare?: RecommendationEvidenceCompare | StoredCompareRun | null) {
  if (!compare) return [];
  return unique([
    fieldLine("Competitor", [compare.competitorBrand, compare.competitorSku || compare.competitorName].filter(Boolean).join(" ")),
    fieldLine("WyreStorm candidate", compare.wyrestormSku || compare.wyrestormTitle),
    fieldLine("Match score", compare.matchScore),
    ...list(compare.evidence),
    ...list(compare.warnings).map((item) => `Compare warning: ${item}`),
  ]);
}

function whyThisFits(input: RecommendationEvidenceInput) {
  const product = input.product;
  const summary = productSummary(product);
  const output = [
    summary,
    product?.family ? `Fits the ${product.family} direction carried by the current brief.` : "",
    ...productEvidence(product),
  ];

  if (input.compare?.matchScore) {
    output.push(`Comparison score captured: ${input.compare.matchScore}. Treat as validation evidence, not a BOM source.`);
  }

  return unique(output).slice(0, 6);
}

function customerSafeWording(input: RecommendationEvidenceInput, status: StoredQuoteSafetyStatus) {
  const direction = productDirection(input);
  const architecture = architectureDecision(input);
  const familyScores = productFamilyScores(input);
  const checks = status === "quote-ready"
    ? "We will still run the final datasheet and dependency check before issuing the quote."
    : "Before this becomes a quote, we need to confirm the open design details and dependencies.";

  return unique([
    `The current WyreStorm direction is ${direction}.`,
    `The leading product-family path is ${topProductFamily(familyScores)} before final SKU selection.`,
    checks,
    "This recommendation is based on the captured room requirement, not just a SKU match.",
    ...architecture.customerSafeWording,
  ]);
}

function internalGuidance(input: RecommendationEvidenceInput, status: StoredQuoteSafetyStatus) {
  const familyScores = productFamilyScores(input);
  const output = [
    status === "do-not-quote-yet"
      ? "Keep this as a design direction. Do not send a price or BOM until the missing information is confirmed."
      : "Use this as a sales conversation aid and keep validation items visible.",
    `Use product-family scoring before SKU selection. Leading family: ${topProductFamily(familyScores)}.`,
    "Escalate to pre-sales when architecture, USB, network, video wall, or dependency validation affects the final design.",
    ...architectureDecision(input).repGuidance,
  ];

  if (input.compare?.competitorSku || input.compare?.competitorName) {
    output.push("Use competitor data only to explain replacement logic; never place competitor products in the WyreStorm BOM.");
  }

  return unique(output);
}

function nextBestQuestion(input: RecommendationEvidenceInput, missing: string[]) {
  const stored = text(discoveryFrom(input)?.nextBestQuestion);
  if (stored) return stored;
  if (!missing.length) return "Can we confirm final quantities, accessories and install constraints before quote?";
  return `Can we confirm ${missing[0].toLowerCase()}?`;
}

function salesDiscovery(input: RecommendationEvidenceInput) {
  const roomModel = roomModelFrom(input);
  const inference = inferenceFrom(input);
  return {
    projectTitle: text(input.project?.name, text(roomModel.roomType, "Product Pitch")),
    summary: text(inference.summary, customerRequirement(input)),
    roomSize: text(roomModel.roomSize, "Unknown"),
    displays: text(roomModel.displays, text(roomModel.displayBehaviour, "Unknown")),
    displayCount: text(roomModel.displayCount, "Unknown"),
    displayBehaviour: text(roomModel.displayBehaviour, "Unknown"),
    sourceCount: text(roomModel.sourceCount, "Unknown"),
    usb: text(roomModel.usbTransport, text(roomModel.usbOwnership, "Unknown")),
    distance: text(roomModel.longestRun, text(roomModel.cableRun, "Unknown")),
    network: text(roomModel.networkAvailability, text(roomModel.network, "Unknown")),
    audio: text(roomModel.audioPath, list(roomModel.audioNeeds).join(", ") || "Unknown"),
    control: list(roomModel.controlNeeds).join(", ") || "Unknown",
    budget: "Unknown",
  };
}

function compareToStoredRun(compare?: RecommendationEvidenceCompare | StoredCompareRun | null): StoredCompareRun | null {
  if (!compare) return null;
  return {
    id: text(compare.id, "pitch-compare"),
    createdAt: nowIso(),
    competitorBrand: compare.competitorBrand,
    competitorSku: compare.competitorSku,
    competitorName: compare.competitorName,
    wyrestormSku: compare.wyrestormSku,
    wyrestormTitle: compare.wyrestormTitle,
    summary: compare.summary,
    warnings: list(compare.warnings),
    matchScore: Number.isFinite(Number(compare.matchScore)) ? Number(compare.matchScore) : undefined,
    confidence: compare.confidence,
    evidence: list(compare.evidence),
    source: compare.source ?? "Competitor Compare",
  };
}

export function productToSelection(
  product: RecommendationEvidenceProduct | StoredProductSelection,
  source = "Product Pitch",
): StoredProductSelection {
  return {
    sku: product.sku,
    title: productTitle(product),
    family: product.family,
    category: product.category,
    status: "status" in product ? product.status : "alternative",
    tags: "tags" in product ? product.tags ?? [] : [],
    addedAt: nowIso(),
    source,
    evidence: "evidence" in product ? product.evidence ?? [] : [productSummary(product)].filter(Boolean),
    cautions: "cautions" in product ? product.cautions ?? [] : [],
  };
}

export function buildRecommendationEvidence(input: RecommendationEvidenceInput): StoredRecommendationEvidence {
  const missing = missingInformation(input);
  const dependencies = requiredDependencies(input);
  const architecture = architectureDecision(input);
  const familyScores = productFamilyScores(input);

  const avDecision = buildAvDecisionEvidence({
    source: input.source,
    requirementText: combinedRequirementText(input),
    productText: productText(input.product),
    productSku: input.product?.sku,
    productFamily: input.product?.family,
    productCategory: input.product?.category,
    missingInformation: missing,
    dependencies,
  });

  const status = quoteSafetyStatus(input, missing, dependencies, avDecision.blockerCount);

  const quoteChecks = unique([
    ...missing.map((item) => `Confirm ${item}.`),
    "Validate datasheet, lifecycle, firmware, region, accessory, power and mounting requirements.",
    ...dependencies.map((item) => `Dependency check: ${item}`),
    ...architecture.quoteChecks,
    ...productFamilyScoreQuoteChecks(familyScores),
    ...avDecision.quoteChecks,
  ]);

  return {
    updatedAt: nowIso(),
    source: input.source,
    customerRequirement: customerRequirement(input),
    productDirection: productDirection(input),
    systemShape: suggestedSystemShape(input),
    whyThisFits: whyThisFits(input),
    evidenceUsed: unique([
      ...countEvidence(input),
      ...compareEvidence(input.compare),
      ...architecture.evidence,
      ...productFamilyScoreEvidence(familyScores),
      ...avDecision.evidence,
    ]),
    productFamilyScores: familyScores,
    quoteChecks,
    missingInformation: unique([...missing, ...avDecision.missingInformation]),
    requiredDependencies: unique([...dependencies, ...avDecision.requiredDependencies]),
    optionalUpgrades: optionalUpgrades(input),
    alternatives: unique([...alternatives(input), ...avDecision.alternatives]),
    customerSafeWording: customerSafeWording(input, status),
    internalGuidance: unique([...internalGuidance(input, status), ...avDecision.repGuidance]),
    quoteSafetyStatus: status,
    quoteSafetyMessage: quoteSafetyMessage(status, missing),
    confidence: confidence(status, missing),
    nextBestQuestion: avDecision.nextBestQuestion || nextBestQuestion(input, missing),
  };
}

export function buildDiscoveryRecommendationEvidence(brief: StoredDiscoveryBrief): StoredRecommendationEvidence {
  return buildRecommendationEvidence({
    source: "Discovery",
    discoveryBrief: brief,
  });
}
