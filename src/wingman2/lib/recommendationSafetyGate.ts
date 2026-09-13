export type RecommendationRole =
  | "source"
  | "destination"
  | "transmitter"
  | "receiver"
  | "transceiver"
  | "matrix"
  | "processor"
  | "controller"
  | "dependency"
  | "support"
  | string;

export type RecommendationSafetyCandidate = Record<string, unknown> & {
  sku?: unknown;
  productSku?: unknown;
  product?: unknown;
  role?: unknown;
  roleContract?: unknown;
  dependencyOnly?: unknown;
  explicitlyRequested?: unknown;
  safetyApproved?: unknown;
  pairedWith?: unknown;
  compatibility?: unknown;
};

export type RecommendationSafetyContext = {
  requiredRole?: RecommendationRole | null;
  explicitSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  selectedSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  removedSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  pairingSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  allowDependencies?: boolean;
  hdBaseTGeneration?: string | null;
  resolutionCompatible?: boolean;
  usbCompatible?: boolean;
  distanceCompatible?: boolean;
};

const RX3_SKU = "RX3-100";
const RX3_ALLOWED_PAIRS = new Set(["SW-120-TX3", "MX-1007-HYB"]);

function recordOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalise(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/[ _]/g, "-");
}

function valuesOf(value: ReadonlyArray<string> | ReadonlySet<string> | undefined): Set<string> {
  if (value instanceof Set) {
    return new Set(Array.from(value, normalise));
  }
  return new Set((value ?? []).map(normalise));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (typeof item === "string") {
      return item;
    }
    const row = recordOf(item);
    return String(row.sku ?? row.productSku ?? row.id ?? "");
  }).filter(Boolean);
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

export function buildRecommendationSafetyContext(systemBrief: unknown): RecommendationSafetyContext {
  const root = recordOf(systemBrief);
  const compatibility = recordOf(root.compatibility ?? root.transportCompatibility);
  const generation = root.hdBaseTGeneration ?? compatibility.hdBaseTGeneration;
  return {
    explicitSkus: stringArray(root.explicitSkus ?? root.requestedSkus ?? root.explicitProducts),
    selectedSkus: stringArray(root.selectedSkus ?? root.currentSkus ?? root.existingSkus),
    removedSkus: stringArray(root.removedSkus ?? root.omittedSkus ?? root.removedLineItemSkus),
    pairingSkus: stringArray(root.pairingSkus ?? root.pairedSkus ?? root.pairedProducts),
    hdBaseTGeneration: typeof generation === "string" ? generation : undefined,
    resolutionCompatible: booleanValue(root.resolutionCompatible ?? compatibility.resolutionCompatible),
    usbCompatible: booleanValue(root.usbCompatible ?? compatibility.usbCompatible),
    distanceCompatible: booleanValue(root.distanceCompatible ?? compatibility.distanceCompatible),
  };
}

function candidateProduct(candidate: RecommendationSafetyCandidate): Record<string, unknown> {
  return recordOf(candidate.product);
}

function candidateSku(candidate: RecommendationSafetyCandidate): string {
  const product = candidateProduct(candidate);
  return normalise(candidate.sku ?? candidate.productSku ?? product.sku ?? product.productSku);
}

function candidateRole(candidate: RecommendationSafetyCandidate): string {
  const product = candidateProduct(candidate);
  return normalise(candidate.roleContract ?? candidate.role ?? product.roleContract ?? product.role);
}

function candidatePairs(candidate: RecommendationSafetyCandidate): Set<string> {
  const product = candidateProduct(candidate);
  const raw = candidate.pairedWith ?? product.pairedWith;
  if (Array.isArray(raw)) {
    return new Set(raw.map(normalise));
  }
  return new Set([normalise(raw)]);
}

function compatibilityEvidence(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {
  const product = candidateProduct(candidate);
  const compatibility = recordOf(candidate.compatibility ?? product.compatibility);
  const generation = normalise(context.hdBaseTGeneration ?? compatibility.hdBaseTGeneration);
  const resolution = context.resolutionCompatible ?? compatibility.resolutionCompatible;
  const usb = context.usbCompatible ?? compatibility.usbCompatible;
  const distance = context.distanceCompatible ?? compatibility.distanceCompatible;
  if (generation !== "HDBASET-3.0" && generation !== "3.0") {
    return false;
  }
  if (resolution !== true || usb !== true || distance !== true) {
    return false;
  }
  return true;
}

function rx3HasPair(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {
  const contextPairs = valuesOf(context.pairingSkus);
  const candidatePairSet = candidatePairs(candidate);
  for (const sku of RX3_ALLOWED_PAIRS) {
    if (contextPairs.has(sku) || candidatePairSet.has(sku)) {
      return true;
    }
  }
  return false;
}

function roleMatches(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {
  const required = normalise(context.requiredRole);
  if (required.length === 0) {
    return true;
  }
  return candidateRole(candidate) === required;
}

function isDependency(candidate: RecommendationSafetyCandidate): boolean {
  const product = candidateProduct(candidate);
  const role = candidateRole(candidate);
  return candidate.dependencyOnly === true || product.dependencyOnly === true || role === "DEPENDENCY" || role === "SUPPORT";
}

export function filterSafeRecommendationCandidates<T extends RecommendationSafetyCandidate>(
  candidates: ReadonlyArray<T>,
  context: RecommendationSafetyContext = {}
): T[] {
  const explicit = valuesOf(context.explicitSkus);
  const selected = valuesOf(context.selectedSkus);
  const removed = valuesOf(context.removedSkus);
  const result: T[] = [];

  for (const candidate of candidates) {
    const sku = candidateSku(candidate);
    const requested = explicit.has(sku) || candidate.explicitlyRequested === true;
    if (removed.has(sku)) {
      continue;
    }
    if (selected.has(sku) && candidate.safetyApproved !== true && !requested) {
      continue;
    }
    if (!roleMatches(candidate, context)) {
      continue;
    }
    if (isDependency(candidate) && !context.allowDependencies && !requested) {
      continue;
    }
    if (sku === RX3_SKU) {
      if (!rx3HasPair(candidate, context)) {
        continue;
      }
      if (!compatibilityEvidence(candidate, context)) {
        continue;
      }
    }
    result.push(candidate);
  }
  return result;
}

export function removeLineItemById<T extends { id?: unknown; sku?: unknown; productSku?: unknown; product?: unknown }>(
  items: ReadonlyArray<T>,
  idOrSku: string
): T[] {
  const target = normalise(idOrSku);
  return items.filter((item) => {
    const product = recordOf(item.product);
    const id = normalise(item.id ?? product.id);
    const sku = normalise(item.sku ?? item.productSku ?? product.sku ?? product.productSku);
    return id !== target && sku !== target;
  });
}

export function mergeRemovedRecommendationSkus(
  existing: ReadonlyArray<string> | undefined,
  removed: ReadonlyArray<string>
): string[] {
  return Array.from(new Set([...(existing ?? []), ...removed].map(normalise))).filter(Boolean);
}

export function isRecommendationSkuRemoved(
  removed: ReadonlyArray<string> | ReadonlySet<string> | undefined,
  sku: string
): boolean {
  return valuesOf(removed).has(normalise(sku));
}