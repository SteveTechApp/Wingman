import type { StoredCompareRun, StoredIngestAnalysis, StoredProductSelection } from "../data/projectStore";
import type { SalesBomType } from "./salesReadiness";

export type DependencyConfidence = "High" | "Medium" | "Low";
export type DependencyGovernanceKind = "Exact" | "Validate" | "Prompt";

export type GovernedDependency = {
  id: string;
  sku: string;
  label: string;
  role: string;
  qty: number;
  type: SalesBomType;
  status: "required" | "validate" | "optional";
  confidence: DependencyConfidence;
  governanceKind: DependencyGovernanceKind;
  trigger: string;
  evidence: string;
  validationQuestion: string;
  customerSafeNote: string;
  sourceSku?: string;
  ruleId?: string;
  ruleSource?: string;
};

export type DependencyGovernanceInput = {
  products: StoredProductSelection[];
  discovery: {
    projectTitle: string;
    summary: string;
    roomSize: string;
    displays: string;
    displayCount?: string;
    displayBehaviour?: string;
    sourceCount?: string;
    usb: string;
    distance: string;
    network?: string;
    audio?: string;
    control?: string;
    budget: string;
  };
  assumptions: string[];
  ingest?: StoredIngestAnalysis;
  compareRun?: StoredCompareRun | null;
};

type DependencyQuantityBasis = "one" | "source-count" | "display-count" | "source-unit-count";

type ExactDependencyRule = {
  id: string;
  targetSku: string;
  label: string;
  role: string;
  type: SalesBomType;
  status: GovernedDependency["status"];
  confidence: DependencyConfidence;
  sourceSkus?: string[];
  satisfiedBySkus?: string[];
  productGroups?: string[][];
  requirementGroups?: string[][];
  combinedGroups?: string[][];
  excludedCombinedTerms?: string[];
  maxDistanceMetres?: number;
  minDistanceMetres?: number;
  allowUnknownDistance?: boolean;
  distanceFallbackTerms?: string[];
  skipWhenUsbNotRequired?: boolean;
  qtyBasis: DependencyQuantityBasis;
  trigger: string;
  evidence: string;
  validationQuestion: string;
  customerSafeNote: string;
  ruleSource: string;
};

export const EXACT_DEPENDENCY_RULES: ExactDependencyRule[] = [
  {
    id: "hdbaset-sw130-rx500-short-receiver",
    targetSku: "RX-500",
    label: "RX-500 short-distance receiver for SW-130-TX",
    role: "HDBaseT receiver",
    type: "Required",
    status: "required",
    confidence: "High",
    sourceSkus: ["SW-130-TX", "SW-130-TX-UK", "SW-130-TX-US"],
    satisfiedBySkus: ["RX-500", "RX-700"],
    maxDistanceMetres: 35,
    distanceFallbackTerms: ["short distance", "short-distance", "shorter distance", "shorter run", "short run"],
    skipWhenUsbNotRequired: true,
    qtyBasis: "source-unit-count",
    trigger: "SW-130-TX family transmitter selected with a short-distance receive path.",
    evidence: "RX-500 is a valid shorter-distance HDBaseT receiver path for SW-130/APO-style products.",
    validationQuestion: "Confirm the actual cable distance, required resolution, USB/control needs, and cable grade before treating RX-500 as final.",
    customerSafeNote: "Use RX-500 for SW-130 when the confirmed run fits the shorter-distance receiver path.",
    ruleSource: "WyreStorm 2026 catalog: RX-500 is listed for APO/SW products with shorter-distance HDBaseT receiver capability.",
  },
  {
    id: "hdbaset-sw130-rx700-receiver",
    targetSku: "RX-700",
    label: "RX-700 long-distance receiver for SW-130-TX",
    role: "HDBaseT receiver",
    type: "Required",
    status: "required",
    confidence: "High",
    sourceSkus: ["SW-130-TX", "SW-130-TX-UK", "SW-130-TX-US"],
    satisfiedBySkus: ["RX-700", "RX-500"],
    minDistanceMetres: 36,
    allowUnknownDistance: true,
    excludedCombinedTerms: ["short distance", "short-distance", "shorter distance", "shorter run", "short run"],
    skipWhenUsbNotRequired: true,
    qtyBasis: "source-unit-count",
    trigger: "SW-130-TX family transmitter selected without a confirmed short-distance receiver path.",
    evidence: "Catalog receiver record identifies RX-700 as the longer-distance receiver path for SW-130-TX.",
    validationQuestion: "Confirm the receiver location, cable path, required resolution, USB/control needs, and whether an existing compatible receiver is already in scope.",
    customerSafeNote: "Use RX-700 for SW-130 when the run needs the longer-distance receiver path or distance is not yet confirmed.",
    ruleSource: "WyreStorm 2026 catalog: RX-700 description includes [For SW-130-TX].",
  },
  {
    id: "hdbaset-sw120tx3-rx3100-receiver",
    targetSku: "RX3-100",
    label: "RX3-100 receiver for SW-120-TX3",
    role: "HDBaseT 3.0 receiver",
    type: "Required",
    status: "required",
    confidence: "High",
    sourceSkus: ["SW-120-TX3", "SW-120-TX3-UK"],
    qtyBasis: "source-unit-count",
    trigger: "SW-120-TX3 family transmitter selected.",
    evidence: "Catalog transmitter and receiver records cross-reference SW-120-TX3 and RX3-100.",
    validationQuestion: "Confirm whether RX3-100 or the paired matrix input path is the intended receive side, and validate cable grade and USB/control requirements.",
    customerSafeNote: "Use the catalog-paired RX3-100 receive path unless the design deliberately terminates into a compatible matrix path.",
    ruleSource: "WyreStorm 2026 catalog: SW-120-TX3 and RX3-100 descriptions cross-reference each other.",
  },
  {
    id: "networkhd-100-tx-needs-rx",
    targetSku: "NHD-120-RX",
    label: "NHD-120-RX decoder count",
    role: "NetworkHD 100 display endpoint",
    type: "Validate",
    status: "validate",
    confidence: "Medium",
    sourceSkus: ["NHD-120-TX"],
    qtyBasis: "display-count",
    trigger: "NetworkHD 100 encoder selected without a matching decoder count.",
    evidence: "Each NetworkHD 100 display endpoint needs a governed decoder count.",
    validationQuestion: "How many displays/zones need a NetworkHD 100 decoder now, and should expansion capacity be allowed?",
    customerSafeNote: "Decoder quantity should follow the confirmed display or zone count.",
    ruleSource: "NetworkHD 100 endpoint governance: NHD-120-TX encoder to NHD-120-RX decoder topology.",
  },
  {
    id: "networkhd-100-rx-needs-tx",
    targetSku: "NHD-120-TX",
    label: "NHD-120-TX encoder count",
    role: "NetworkHD 100 source endpoint",
    type: "Validate",
    status: "validate",
    confidence: "Medium",
    sourceSkus: ["NHD-120-RX"],
    qtyBasis: "source-count",
    trigger: "NetworkHD 100 decoder selected without a matching encoder count.",
    evidence: "Each NetworkHD 100 source endpoint needs a governed encoder count unless the source is already network-native.",
    validationQuestion: "How many source encoders are required, and are any sources already available as network streams?",
    customerSafeNote: "Encoder quantity should follow confirmed source count and source format.",
    ruleSource: "NetworkHD 100 endpoint governance: NHD-120-RX decoder to NHD-120-TX encoder topology.",
  },
  {
    id: "networkhd-500-tx-needs-rx",
    targetSku: "NHD-500-RX",
    label: "NHD-500-RX decoder count",
    role: "NetworkHD 500 display endpoint",
    type: "Validate",
    status: "validate",
    confidence: "Medium",
    sourceSkus: ["NHD-500-TX"],
    qtyBasis: "display-count",
    trigger: "NetworkHD 500 encoder selected without a matching decoder count.",
    evidence: "Each NetworkHD 500 display endpoint needs a governed decoder count.",
    validationQuestion: "How many displays/zones need a NetworkHD 500 decoder, and is USB routing required at any display?",
    customerSafeNote: "Decoder quantity should follow the confirmed display or zone count.",
    ruleSource: "NetworkHD 500 endpoint governance: NHD-500-TX encoder to NHD-500-RX decoder topology.",
  },
  {
    id: "networkhd-500-rx-needs-tx",
    targetSku: "NHD-500-TX",
    label: "NHD-500-TX encoder count",
    role: "NetworkHD 500 source endpoint",
    type: "Validate",
    status: "validate",
    confidence: "Medium",
    sourceSkus: ["NHD-500-RX"],
    qtyBasis: "source-count",
    trigger: "NetworkHD 500 decoder selected without a matching encoder count.",
    evidence: "Each NetworkHD 500 source endpoint needs a governed encoder count unless the source is already network-native.",
    validationQuestion: "How many source encoders are required, and do any sources need USB, Dante-ready, or control routing?",
    customerSafeNote: "Encoder quantity should follow confirmed source count and source format.",
    ruleSource: "NetworkHD 500 endpoint governance: NHD-500-RX decoder to NHD-500-TX encoder topology.",
  },
  {
    id: "networkhd-100-multiview-decoder",
    targetSku: "NHD-150-RX",
    label: "NHD-150-RX multiview decoder",
    role: "NetworkHD 100 multiview output",
    type: "Required",
    status: "required",
    confidence: "High",
    combinedGroups: [
      ["networkhd 100", "nhd-120"],
      ["multiview", "multi-view", "quad view", "monitoring wall"],
    ],
    qtyBasis: "one",
    trigger: "NetworkHD 100 plus multiview requirement detected.",
    evidence: "NetworkHD 100 multiview output is governed to NHD-150-RX.",
    validationQuestion: "Confirm the multiview window count, source set, output display, and whether tile/overlap layout is required.",
    customerSafeNote: "Use NHD-150-RX when a NetworkHD 100 design requires multiview output.",
    ruleSource: "Wingman product-family rule: NHD-150-RX is the NetworkHD 100 multiview decoder option.",
  },
  {
    id: "networkhd-500-multiview-processor",
    targetSku: "NHD-0401-MV",
    label: "NHD-0401-MV multiview processor",
    role: "NetworkHD 500 multiview processing",
    type: "Required",
    status: "required",
    confidence: "High",
    combinedGroups: [
      ["networkhd 500", "nhd-500"],
      ["multiview", "multi-view", "quad view", "monitoring wall"],
    ],
    qtyBasis: "one",
    trigger: "NetworkHD 500 plus multiview requirement detected.",
    evidence: "NetworkHD 500 multiview output is governed to NHD-0401-MV.",
    validationQuestion: "Confirm the number of multiview sources, output count, monitoring workflow, and whether the multiview sits inside a wider NetworkHD 500 system.",
    customerSafeNote: "Use NHD-0401-MV for NetworkHD 500 multiview discussions and recommendations.",
    ruleSource: "Wingman product-family rule: NHD-0401-MV is the correct multiview processor SKU for NetworkHD 500.",
  },
  {
    id: "video-wall-simple-preset-processor",
    targetSku: "SW-0204-VW",
    label: "SW-0204-VW preset-layout wall processor",
    role: "Dedicated video wall processor",
    type: "Validate",
    status: "validate",
    confidence: "Medium",
    requirementGroups: [
      ["video wall", "videowall", "lcd wall"],
      ["preset", "simple", "basic", "1x4", "2x2", "tile"],
    ],
    excludedCombinedTerms: ["networkhd", "av over ip", "avoip"],
    qtyBasis: "one",
    trigger: "Simple fixed-layout video wall requirement detected without AV-over-IP language.",
    evidence: "A fixed preset-layout wall can be governed to the dedicated SW-0204-VW path before escalating to AV-over-IP.",
    validationQuestion: "Confirm the wall is a basic 1x4 or 2x2 style layout and does not need mixed layouts, per-display routing, or flexible source composition.",
    customerSafeNote: "Use SW-0204-VW only when the wall behaviour is simple enough for a preset-layout processor.",
    ruleSource: "Wingman video-wall rule: SW-0204-VW is the simpler preset-layout video wall processor.",
  },
  {
    id: "video-wall-flexible-dedicated-processor",
    targetSku: "SW-0206-VW",
    label: "SW-0206-VW flexible wall processor",
    role: "Dedicated video wall processor",
    type: "Validate",
    status: "validate",
    confidence: "Medium",
    requirementGroups: [
      ["video wall", "videowall", "lcd wall"],
      ["custom", "mixed", "cascading", "flexible", "multi-fast", "full canvas", "6-output", "6 output", "six output", "more than 4"],
    ],
    excludedCombinedTerms: ["networkhd", "av over ip", "avoip"],
    qtyBasis: "one",
    trigger: "Flexible dedicated video wall processor requirement detected without AV-over-IP language.",
    evidence: "A dedicated non-AV-over-IP wall path can be governed to SW-0206-VW when flexible fixed processing is the better fit.",
    validationQuestion: "Confirm output count, wall geometry, source count, desired layouts, and whether AV-over-IP flexibility is required instead.",
    customerSafeNote: "Use SW-0206-VW when a dedicated video wall processor is a better fit than AV-over-IP for the confirmed behaviour.",
    ruleSource: "Wingman video-wall rule: SW-0206-VW is the dedicated non-AV-over-IP video wall processor to consider alongside AVoIP wall options.",
  },
];

function joinedProductText(products: StoredProductSelection[]) {
  return products
    .flatMap((product) => [
      product.sku,
      product.title,
      product.family,
      product.category,
      ...(product.tags ?? []),
      ...(product.evidence ?? []),
      ...(product.cautions ?? []),
    ])
    .join(" ")
    .toLowerCase();
}

function joinedRequirementText(input: DependencyGovernanceInput) {
  return [
    input.discovery.projectTitle,
    input.discovery.summary,
    input.discovery.roomSize,
    input.discovery.displays,
    input.discovery.displayCount,
    input.discovery.displayBehaviour,
    input.discovery.sourceCount,
    input.discovery.usb,
    input.discovery.distance,
    input.discovery.network,
    input.discovery.audio,
    input.discovery.control,
    ...(input.ingest?.requirements ?? []),
    ...(input.ingest?.unknowns ?? []),
    ...(input.compareRun?.warnings ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function hasEveryGroup(text: string, groups: string[][] = []) {
  return groups.every((group) => hasAny(text, group));
}

function normaliseSku(value: string) {
  return value.trim().toUpperCase();
}

function selectedSkuSet(products: StoredProductSelection[]) {
  return new Set(products.map((product) => normaliseSku(product.sku)));
}

function isSw130Sku(sku: string) {
  const normalised = normaliseSku(sku);
  return normalised === "SW-130-TX" || normalised === "SW-130-TX-UK" || normalised === "SW-130-TX-US";
}

function selectedSw130Sku(products: StoredProductSelection[]) {
  return products.find((product) => isSw130Sku(product.sku))?.sku;
}

function selectedCompatibleHdbtReceiver(products: StoredProductSelection[]) {
  return products.some((product) => {
    if (isSw130Sku(product.sku)) return false;
    const productText = [
      product.sku,
      product.title,
      product.family,
      product.category,
      ...(product.tags ?? []),
      ...(product.evidence ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return hasAny(productText, ["hdbaset", "hdbt 2.0", "hdbt2"]) && hasAny(productText, ["receiver", "rx"]);
  });
}

function selectedSourceSku(rule: ExactDependencyRule, selectedSkus: Set<string>) {
  return rule.sourceSkus?.find((sku) => selectedSkus.has(normaliseSku(sku)));
}

function ruleIsSatisfied(rule: ExactDependencyRule, selectedSkus: Set<string>) {
  const satisfiedSkus = [rule.targetSku, ...(rule.satisfiedBySkus ?? [])];
  return satisfiedSkus.some((sku) => selectedSkus.has(normaliseSku(sku)));
}

function numericBasis(value: string | undefined) {
  const text = String(value ?? "");
  const grid = text.match(/(\d{1,2})\s*[xX]\s*(\d{1,2})/);
  if (grid) {
    const rows = Number(grid[1]);
    const columns = Number(grid[2]);
    if (Number.isFinite(rows) && Number.isFinite(columns) && rows > 0 && columns > 0) {
      return rows * columns;
    }
  }

  const count = text.match(/\b(\d{1,3})\b/);
  if (!count) return null;
  const valueNumber = Number(count[1]);
  return Number.isFinite(valueNumber) && valueNumber > 0 ? valueNumber : null;
}

function usbTransportNotRequired(input: DependencyGovernanceInput) {
  const text = [
    input.discovery.usb,
    input.discovery.summary,
    ...(input.ingest?.requirements ?? []),
    ...(input.ingest?.unknowns ?? []),
    ...(input.compareRun?.warnings ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return hasAny(text, [
    "usb not required",
    "usb is not required",
    "usb not needed",
    "no usb",
    "without usb",
    "video only",
    "video-only",
    "no byom",
    "no byod",
  ]);
}

function distanceMetresFromInput(input: DependencyGovernanceInput) {
  const text = [
    input.discovery.distance,
    input.discovery.summary,
    ...(input.ingest?.requirements ?? []),
    ...(input.ingest?.unknowns ?? []),
  ]
    .join(" ")
    .toLowerCase();
  const match = text.match(/\b(\d{1,3})\s*(m|metre|metres|meter|meters)\b/);
  if (!match) return null;

  const distance = Number.parseInt(match[1], 10);
  return Number.isFinite(distance) && distance > 0 ? distance : null;
}

function ruleDistanceMatches(rule: ExactDependencyRule, input: DependencyGovernanceInput, combinedText: string) {
  const hasDistanceRule = Boolean(rule.maxDistanceMetres || rule.minDistanceMetres || rule.distanceFallbackTerms?.length);
  if (!hasDistanceRule) return true;

  const distance = distanceMetresFromInput(input);
  if (distance !== null) {
    if (rule.maxDistanceMetres && distance > rule.maxDistanceMetres) return false;
    if (rule.minDistanceMetres && distance < rule.minDistanceMetres) return false;
    return true;
  }

  if (rule.distanceFallbackTerms?.length && hasAny(combinedText, rule.distanceFallbackTerms)) {
    return true;
  }

  return Boolean(rule.allowUnknownDistance);
}

function distanceEvidenceForRule(rule: ExactDependencyRule, input: DependencyGovernanceInput, combinedText: string) {
  const hasDistanceRule = Boolean(rule.maxDistanceMetres || rule.minDistanceMetres || rule.distanceFallbackTerms?.length);
  if (!hasDistanceRule) return "";

  const distance = distanceMetresFromInput(input);
  if (distance !== null) return ` Distance basis: ${distance}m.`;
  if (rule.distanceFallbackTerms?.length && hasAny(combinedText, rule.distanceFallbackTerms)) {
    return " Distance basis: short-distance language was detected but the exact run length still needs confirmation.";
  }

  return " Distance basis: not confirmed.";
}

function selectedSourceUnits(rule: ExactDependencyRule, input: DependencyGovernanceInput) {
  const sourceSkus = rule.sourceSkus ?? [];
  return input.products
    .filter((product) => sourceSkus.some((sku) => normaliseSku(sku) === normaliseSku(product.sku)))
    .reduce((sum, product) => {
      const explicit = Number(product.quantity);
      if (Number.isFinite(explicit) && explicit > 0) return sum + Math.floor(explicit);
      return sum + (numericBasis(input.discovery.sourceCount) ?? 1);
    }, 0);
}

function quantityForRule(rule: ExactDependencyRule, input: DependencyGovernanceInput) {
  if (rule.qtyBasis === "source-count") {
    return numericBasis(input.discovery.sourceCount) ?? 1;
  }

  if (rule.qtyBasis === "display-count") {
    return numericBasis(input.discovery.displayCount) ?? numericBasis(input.discovery.displays) ?? 1;
  }

  // A pairing dependency (receiver for a transmitter) must follow how many
  // source units were actually selected, not assume a single-unit project.
  if (rule.qtyBasis === "source-unit-count") {
    return selectedSourceUnits(rule, input) || 1;
  }

  return 1;
}

function confidenceForRule(rule: ExactDependencyRule, input: DependencyGovernanceInput) {
  if (rule.qtyBasis === "source-count" && !numericBasis(input.discovery.sourceCount)) {
    return "Low" satisfies DependencyConfidence;
  }

  if (
    rule.qtyBasis === "source-unit-count" &&
    !input.products.some((product) => {
      const explicit = Number(product.quantity);
      return Number.isFinite(explicit) && explicit > 0;
    }) &&
    !numericBasis(input.discovery.sourceCount)
  ) {
    return "Low" satisfies DependencyConfidence;
  }

  if (
    rule.qtyBasis === "display-count" &&
    !numericBasis(input.discovery.displayCount) &&
    !numericBasis(input.discovery.displays)
  ) {
    return "Low" satisfies DependencyConfidence;
  }

  if (
    (rule.maxDistanceMetres || rule.minDistanceMetres) &&
    distanceMetresFromInput(input) === null &&
    rule.distanceFallbackTerms?.length
  ) {
    return "Medium" satisfies DependencyConfidence;
  }

  return rule.confidence;
}

function exactDependencyFromRule(
  rule: ExactDependencyRule,
  input: DependencyGovernanceInput,
  productText: string,
  requirementText: string,
  combinedText: string,
  selectedSkus: Set<string>,
) {
  if (rule.sourceSkus?.length && !selectedSourceSku(rule, selectedSkus)) return null;
  if (ruleIsSatisfied(rule, selectedSkus)) return null;
  if (rule.productGroups?.length && !hasEveryGroup(productText, rule.productGroups)) return null;
  if (rule.requirementGroups?.length && !hasEveryGroup(requirementText, rule.requirementGroups)) return null;
  if (rule.combinedGroups?.length && !hasEveryGroup(combinedText, rule.combinedGroups)) return null;
  if (rule.excludedCombinedTerms?.length && hasAny(combinedText, rule.excludedCombinedTerms)) return null;
  if (rule.skipWhenUsbNotRequired && usbTransportNotRequired(input)) return null;
  if (!ruleDistanceMatches(rule, input, combinedText)) return null;

  const qty = quantityForRule(rule, input);
  const sourceSku = rule.sourceSkus ? selectedSourceSku(rule, selectedSkus) : undefined;
  const countBasis =
    rule.qtyBasis === "source-count"
      ? ` Source count basis: ${input.discovery.sourceCount || "not confirmed"}.`
      : rule.qtyBasis === "display-count"
        ? ` Display count basis: ${input.discovery.displayCount || input.discovery.displays || "not confirmed"}.`
        : "";
  const distanceBasis = distanceEvidenceForRule(rule, input, combinedText);

  return dependency({
    id: rule.id,
    sku: rule.targetSku,
    label: rule.label,
    role: rule.role,
    qty,
    type: rule.type,
    status: rule.status,
    confidence: confidenceForRule(rule, input),
    governanceKind: "Exact",
    sourceSku,
    ruleId: rule.id,
    ruleSource: rule.ruleSource,
    trigger: rule.trigger,
    evidence: `${rule.evidence}${countBasis}${distanceBasis}`,
    validationQuestion: rule.validationQuestion,
    customerSafeNote: rule.customerSafeNote,
  });
}

function buildExactDependencies(
  input: DependencyGovernanceInput,
  productText: string,
  requirementText: string,
  combinedText: string,
) {
  const selectedSkus = selectedSkuSet(input.products);

  return EXACT_DEPENDENCY_RULES.flatMap((rule) => {
    const dependencyItem = exactDependencyFromRule(rule, input, productText, requirementText, combinedText, selectedSkus);
    return dependencyItem ? [dependencyItem] : [];
  });
}

function dependency(input: GovernedDependency): GovernedDependency {
  return input;
}

function dedupeDependencies(dependencies: GovernedDependency[]) {
  const seen = new Set<string>();

  return dependencies.filter((item) => {
    const key = `${item.sku}::${item.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildGovernedDependencies(input: DependencyGovernanceInput): GovernedDependency[] {
  const productText = joinedProductText(input.products);
  const requirementText = joinedRequirementText(input);
  const combinedText = `${productText} ${requirementText}`;
  const dependencies: GovernedDependency[] = buildExactDependencies(input, productText, requirementText, combinedText);
  const sourceBasis = input.discovery.sourceCount || "source count not confirmed";
  const displayBasis = input.discovery.displayCount || input.discovery.displays || "display count not confirmed";
  const sw130Sku = selectedSw130Sku(input.products);
  const hasHdbtReceiverSelection = selectedCompatibleHdbtReceiver(input.products);

  if (sw130Sku && usbTransportNotRequired(input) && !hasHdbtReceiverSelection) {
    dependencies.push(
      dependency({
        id: "hdbaset-sw130-value-hdbt2-receiver",
        sku: "TBC-HDBT2-COMPATIBLE-RX",
        label: "WyreStorm HDBT 2.0 compatible receiver",
        role: "Value-engineered HDBaseT receiver",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: input.discovery.distance && input.discovery.distance !== "Not confirmed" ? "Medium" : "Low",
        governanceKind: "Validate",
        sourceSku: sw130Sku,
        ruleId: "hdbaset-sw130-value-hdbt2-receiver",
        ruleSource: "Wingman value-engineering rule: when SW-130 USB transport is not required, use any WyreStorm HDBT 2.0 compatible receiver that satisfies distance, resolution, cable, audio, control, and power needs.",
        trigger: "SW-130-TX family selected and USB transport is explicitly not required.",
        evidence: `USB basis: ${input.discovery.usb || "USB transport not required"}. Distance basis: ${input.discovery.distance || "not confirmed"}.`,
        validationQuestion: "Which WyreStorm HDBT 2.0 compatible receiver best meets the confirmed distance, resolution, cable grade, audio/control, and power requirements?",
        customerSafeNote: "Do not force RX-500 or RX-700 for a video-only/value-engineered SW-130 path if another compatible WyreStorm HDBT 2.0 receiver is technically sufficient.",
      }),
    );
  }

  const hasExactAvoipEndpointDependency = dependencies.some((item) => item.role.includes("NetworkHD") && item.role.includes("endpoint"));
  const hasExactHdbasetPairing = dependencies.some((item) => item.ruleId?.startsWith("hdbaset-"));

  const requiresAvoip = hasAny(combinedText, [
    "networkhd",
    "av over ip",
    "avoip",
    "encoder",
    "decoder",
    "ndi",
    "distributed displays",
    "multiple zones",
    "choose source per zone",
  ]);

  if (requiresAvoip) {
    if (!hasExactAvoipEndpointDependency) {
      dependencies.push(
        dependency({
          id: "networkhd-endpoints",
          sku: "TBC-NHD-ENDPOINTS",
          label: "NetworkHD endpoint count",
          role: "AV-over-IP endpoints",
          qty: 1,
          type: "Validate",
          status: "validate",
          confidence: input.discovery.sourceCount && input.discovery.displayCount ? "Medium" : "Low",
          governanceKind: "Prompt",
          trigger: "AV-over-IP, NDI, distributed display, or NetworkHD language detected.",
          evidence: `Endpoint sizing depends on ${sourceBasis} and ${displayBasis}.`,
          validationQuestion: "How many source encoders and display decoders are required now, and what expansion should be allowed for?",
          customerSafeNote: "Endpoint counts are governed by confirmed source and display counts before customer issue.",
        }),
      );
    }

    dependencies.push(
      dependency({
        id: "av-network-design",
        sku: "TBC-AV-NETWORK",
        label: "AV network readiness",
        role: "Network infrastructure",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: hasAny(requirementText, ["managed switch", "dedicated av network", "10g", "vlan"]) ? "Medium" : "Low",
        governanceKind: "Prompt",
        trigger: "Network video architecture requires governed switching and multicast assumptions.",
        evidence: input.discovery.network || "Network availability is not fully confirmed.",
        validationQuestion: "Is there a managed AV network with suitable bandwidth, multicast/IGMP handling, VLAN plan, and power strategy?",
        customerSafeNote: "Network switching and configuration must be validated with the AV/IT owner.",
      }),
    );
  }

  const requiresHdbasetOrExtension = hasAny(combinedText, [
    "hdbaset",
    "extender",
    "transmitter",
    "receiver",
    "-tx",
    "-rx",
    "35-70m",
    "70-100m",
    "100m+",
    "longest run",
  ]);

  if (requiresHdbasetOrExtension) {
    if (!hasExactHdbasetPairing) {
      dependencies.push(
        dependency({
          id: "hdbaset-pairing",
          sku: "TBC-HDBASET-PAIR",
          label: "TX/RX pairing",
          role: "Signal extension pair",
          qty: 1,
          type: "Validate",
          status: "validate",
          confidence: input.discovery.distance && input.discovery.distance !== "Not confirmed" ? "Medium" : "Low",
          governanceKind: "Prompt",
          trigger: "Distance or extender language detected.",
          evidence: `Longest run basis: ${input.discovery.distance || "not confirmed"}.`,
          validationQuestion: "Which transmitter and receiver/end display input are paired, and does the path need USB, control, audio, or power?",
          customerSafeNote: "TX/RX compatibility, cable grade, and feature pass-through must be confirmed.",
        }),
      );
    }

    dependencies.push(
      dependency({
        id: "cable-path",
        sku: "TBC-CABLE-PATH",
        label: "Cable path validation",
        role: "Infrastructure",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: hasAny(requirementText, ["cat6", "cat6a", "fibre", "certified"]) ? "Medium" : "Low",
        governanceKind: "Prompt",
        trigger: "Distance-based transport depends on the installed cable route.",
        evidence: `Path basis: ${input.discovery.distance || "not confirmed"}.`,
        validationQuestion: "Is the installed cable type, run length, patching, and certification known?",
        customerSafeNote: "Installed cabling and pathway assumptions should be treated as validation items.",
      }),
    );
  }

  const requiresUsb = hasAny(combinedText, [
    "usb",
    "byom",
    "byod",
    "camera",
    "speakerphone",
    "microphone",
    "touch display",
    "keyboard",
    "mouse",
    "conference",
    "conferencing",
  ]);

  if (requiresUsb) {
    dependencies.push(
      dependency({
        id: "usb-topology",
        sku: "TBC-USB-TOPOLOGY",
        label: "USB host/device topology",
        role: "USB and conferencing dependencies",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: input.discovery.usb && input.discovery.usb !== "Not confirmed" ? "Medium" : "Low",
        governanceKind: "Prompt",
        trigger: "USB, camera, BYOD/BYOD, or conferencing language detected.",
        evidence: `USB basis: ${input.discovery.usb || "not confirmed"}.`,
        validationQuestion: "Which device is the USB host, which peripherals are required, and is USB 2.0 or USB 3.x needed?",
        customerSafeNote: "USB host/device direction and bandwidth must be confirmed before a final BOM.",
      }),
    );
  }

  const requiresWall = hasAny(combinedText, ["video wall", "videowall", "lcd wall", "led wall", "multiview", "tile-mode", "canvas"]);

  if (requiresWall) {
    dependencies.push(
      dependency({
        id: "wall-behaviour",
        sku: "TBC-WALL-BEHAVIOUR",
        label: "Wall behaviour and processing",
        role: "Wall processing dependencies",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: input.discovery.displayBehaviour && input.discovery.displayBehaviour !== "Not confirmed" ? "Medium" : "Low",
        governanceKind: "Prompt",
        trigger: "Video wall, multiview, or wall processing language detected.",
        evidence: `Display behaviour basis: ${input.discovery.displayBehaviour || input.discovery.displays || "not confirmed"}.`,
        validationQuestion: "Does the wall need full canvas, per-display content, signage, multiview, or mixed layouts?",
        customerSafeNote: "Wall processor or AV-over-IP path depends on confirmed layout behaviour.",
      }),
    );
  }

  const requiresAudio = hasAny(combinedText, ["audio", "dante", "aes67", "speaker", "speakerphone", "microphone", "amplifier", "dsp"]);

  if (requiresAudio) {
    dependencies.push(
      dependency({
        id: "audio-handoff",
        sku: "TBC-AUDIO-HANDOFF",
        label: "Audio handoff",
        role: "Audio dependencies",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: input.discovery.audio ? "Medium" : "Low",
        governanceKind: "Prompt",
        trigger: "Audio, microphone, speakerphone, DSP, Dante, or amplifier language detected.",
        evidence: input.discovery.audio || "Audio ownership and endpoints are not fully confirmed.",
        validationQuestion: "Which audio endpoints, DSP/amplifier ownership, and network audio requirements are in scope?",
        customerSafeNote: "Audio path and handoff should be validated with the responsible audio owner.",
      }),
    );
  }

  const requiresControl = hasAny(combinedText, ["control", "rs-232", "rs232", "relay", "api", "touch panel", "button panel", "web ui"]);

  if (requiresControl) {
    dependencies.push(
      dependency({
        id: "control-handoff",
        sku: "TBC-CONTROL-HANDOFF",
        label: "Control handoff",
        role: "Control dependencies",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: input.discovery.control ? "Medium" : "Low",
        governanceKind: "Prompt",
        trigger: "Control, API, relay, RS-232, touch panel, or button panel language detected.",
        evidence: input.discovery.control || "Control scope is not fully confirmed.",
        validationQuestion: "Who provides control programming and which devices need display/source/preset control?",
        customerSafeNote: "Control ownership and commissioning responsibility should be stated clearly.",
      }),
    );
  }

  if (!input.products.length) {
    dependencies.push(
      dependency({
        id: "core-solution-selection",
        sku: "TBC-CORE-SOLUTION",
        label: "Core WyreStorm selection",
        role: "Core solution",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: "Low",
        governanceKind: "Prompt",
        trigger: "No WyreStorm product has been selected yet.",
        evidence: "Finder or pre-sales review has not supplied a core WyreStorm product.",
        validationQuestion: "Which WyreStorm product family best fits the confirmed outcome, signal path, and architecture?",
        customerSafeNote: "Run Finder or request review before issuing a customer-facing BOM.",
      }),
    );
  }

  return dedupeDependencies(dependencies);
}

export function governedDependencyToBomRow(dependency: GovernedDependency, item = 0) {
  const governanceNote =
    dependency.governanceKind === "Exact"
      ? `Exact dependency rule${dependency.sourceSku ? ` from ${dependency.sourceSku}` : ""}.`
      : dependency.governanceKind === "Validate"
        ? "Exact SKU candidate requiring design validation."
        : "Dependency prompt requiring design validation.";
  const ruleSource = dependency.ruleSource ? `Source: ${dependency.ruleSource}` : "";

  return {
    item,
    sku: dependency.sku,
    description: dependency.label,
    role: dependency.role,
    qty: dependency.qty,
    type: dependency.type,
    status: dependency.status,
    evidence: dependency.evidence,
    notes: [governanceNote, ruleSource, dependency.customerSafeNote, dependency.validationQuestion].filter(Boolean).join(" "),
  };
}
