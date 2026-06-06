import type {
  StoredCompareRun,
  StoredDiscoveryBrief,
  StoredProductSelection,
  StoredProject,
  StoredQuoteSafetyStatus,
  StoredRecommendationEvidence,
} from "../data/projectStore";
import { buildSalesReadinessPackage } from "./salesReadiness";
import { buildAvDecisionEvidence } from "./avDecisionEvidence";

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

function combinedRequirementText(input: RecommendationEvidenceInput) {
  const roomModel = roomModelFrom(input);
  const inference = inferenceFrom(input);
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
    roomModel.usbTransport,
    roomModel.usbOwnership,
    roomModel.audioPath,
    roomModel.networkAvailability,
    roomModel.network,
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
    fieldLine("Distance/infrastructure", roomModel.distanceInfrastructureNotes ?? roomModel.longestRun ?? roomModel.cableRun),
    fieldLine("USB/conferencing", roomModel.usbTransport ?? roomModel.usbOwnership),
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

function suggestedSystemShape(input: RecommendationEvidenceInput) {
  const textBlob = `${productText(input.product)} ${combinedRequirementText(input)}`;

  if (hasAny(textBlob, ["video wall", "videowall", "lcd wall", "led wall"])) {
    return "Validate the wall as a dedicated processor path first, then compare against AV-over-IP only if routing flexibility, source expansion, or distributed endpoints are required.";
  }

  if (hasAny(textBlob, ["networkhd", "av over ip", "avoip"])) {
    return "NetworkHD direction: source encoders, display decoders, NHD-CTL-PRO control, and a validated managed network switching design.";
  }

  if (hasAny(textBlob, ["meeting", "conference", "teams", "zoom", "uc", "usb", "byod", "byom"])) {
    return "Meeting-room direction: presentation path plus explicit USB host/peripheral routing, audio path, display behaviour, and control ownership.";
  }

  if (hasAny(textBlob, ["matrix", "multi-zone", "hospitality", "sports bar"])) {
    return "Contained routing direction: matrix or switcher architecture with confirmed input/output count, display behaviour, distance, and receiver requirements.";
  }

  return "Core WyreStorm product direction with source, display, distance, USB, audio, control, and dependency checks still visible.";
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
}

function requiredDependencies(input: RecommendationEvidenceInput) {
  const product = input.product;
  const productBlob = productText(product);
  const requirementText = combinedRequirementText(input);
  const combined = `${productBlob} ${requirementText}`;
  const dependencies: string[] = [];

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
  const output: string[] = [];

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
  const checks = status === "quote-ready"
    ? "We will still run the final datasheet and dependency check before issuing the quote."
    : "Before this becomes a quote, we need to confirm the open design details and dependencies.";

  return [
    `The current WyreStorm direction is ${direction}.`,
    checks,
    "This recommendation is based on the captured room requirement, not just a SKU match.",
  ];
}

function internalGuidance(input: RecommendationEvidenceInput, status: StoredQuoteSafetyStatus) {
  const output = [
    status === "do-not-quote-yet"
      ? "Keep this as a design direction. Do not send a price or BOM until the missing information is confirmed."
      : "Use this as a sales conversation aid and keep validation items visible.",
    "Escalate to pre-sales when architecture, USB, network, video wall, or dependency validation affects the final design.",
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
    ...avDecision.quoteChecks,
  ]);

  return {
    updatedAt: nowIso(),
    source: input.source,
    customerRequirement: customerRequirement(input),
    productDirection: productDirection(input),
    systemShape: suggestedSystemShape(input),
    whyThisFits: whyThisFits(input),
    evidenceUsed: unique([...countEvidence(input), ...compareEvidence(input.compare), ...avDecision.evidence]),
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
