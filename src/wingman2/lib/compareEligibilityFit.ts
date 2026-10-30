/**
 * Whether a candidate fits the intent, and what it costs when it nearly does.
 *
 * The rules in evaluateProductEligibility are the verdicts; this module is the evidence
 * they are made on — which products may never lead, which NetworkHD endpoints are the
 * right side of a transport, how a matrix's routed capacity compares with the
 * competitor's, and whether an extender's reach, generation, KVM path and USB extension
 * cover what was asked. Each returns a reason and a fit penalty rather than a verdict, so
 * the core can combine them without a second copy of the wording.
 */
import { networkClassOfNetworkHdSku, type AvoipNetworkClass } from "./networkHdAvoipEquivalence";
import { extractCandidateMatrixSize, extractMatrixSizeFromText, numberFromValue } from "./compareEligibilityMatrix";
import { normalise, skuKey } from "./compareEligibilityText";
import {
  SUPPORT_ONLY_LEAD_BLOCKER,
  type CompareEligibilityResult,
  type CompareIntentKind,
  type LooseMatch,
  type LooseRecord,
} from "./compareEligibilityTypes";

/**
 * Enforce the "never mix 10G and 1G" rule: a 1G competitor must not be offered a
 * 10G NetworkHD 600 endpoint, and a 10G/SDVoE competitor must not be offered a 1G
 * (100/500) endpoint. Returns a blocker reason, or null when the pairing is allowed.
 */
export function avoipNetworkMismatch(competitorNetworkClass: AvoipNetworkClass, candidateSku: string): string | null {
  if (competitorNetworkClass === "unknown") {
    return null;
  }

  const candidateClass = networkClassOfNetworkHdSku(candidateSku);

  if (candidateClass === "unknown" || candidateClass === competitorNetworkClass) {
    return null;
  }

  if (competitorNetworkClass === "10g") {
    return "1G NetworkHD endpoint cannot replace a 10G/SDVoE competitor. Use the NetworkHD 600 series; do not mix 10G and 1G.";
  }

  return "NetworkHD 600 is 10G SDVoE and must not be mixed with a 1G competitor. Use the NetworkHD 100/500 series.";
}


export function blocked(sku: string, intent: CompareIntentKind, reasons: string[]): CompareEligibilityResult {
  return {
    eligibility: "blocked",
    intent,
    reasons,
    blockers: reasons,
    fitPenalty: 9999,
  };
}

export function direct(intent: CompareIntentKind, reasons: string[], fitPenalty = 0): CompareEligibilityResult {
  return {
    eligibility: "direct",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
  };
}

export function alternative(intent: CompareIntentKind, reasons: string[], fitPenalty = 25): CompareEligibilityResult {
  return {
    eligibility: "architecture-alternative",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
  };
}

export function related(intent: CompareIntentKind, reasons: string[], fitPenalty = 75): CompareEligibilityResult {
  return {
    eligibility: "related-only",
    intent,
    reasons,
    blockers: [],
    fitPenalty,
  };
}

export function productIsSupportOnly(sku: string, text: string): string | null {
  const key = skuKey(sku);
  const value = normalise(text);

  const explicitlyPrimaryHardware =
    /^NHD/.test(key) ||
    /^APO(?:100|200|210|VX20)UC/.test(key) ||
    // APO-DG2(-PRO) is the wireless-casting dongle itself, not a supporting
    // accessory for other hardware - it's the lead candidate when a
    // competitor's own product is a wireless casting dongle.
    /^APODG2/.test(key) ||
    /^SW020[46]VW$/.test(key) ||
    // SW-620/640-TX-W are the wireless presentation switchers themselves -
    // primary hardware, never support items (their box-contents copy mentions
    // an included PSU, which must not flip them into a "power accessory").
    /^SW6/.test(key) ||
    /^MX/.test(key) ||
    /^MV0401PRO$/.test(key) ||
    /^EX/.test(key);

  if (explicitlyPrimaryHardware && !/^NHD000CTL$/.test(key) && !/^NHD000RACK/.test(key)) {
    return null;
  }

  if (/^CAB/.test(key)) {
    return "Cable/accessory cannot be a lead replacement candidate.";
  }

  if (/RACK|MOUNT|BRACKET|SHELF|RMK/.test(key) || /\b(rack mount|mounting bracket|mounting shelf)\b/i.test(value)) {
    return "Rack/mount/support item cannot be a lead replacement candidate.";
  }

  if (/CTL|CONTROLLER/.test(key) || /\b(system controller|control processor|controller only)\b/i.test(value)) {
    return "Controller cannot be a lead replacement for signal transport hardware.";
  }

  // Power wording is matched on the SKU identity ONLY. A primary product's
  // box-contents copy routinely mentions an included PSU ("20V 10A power
  // supply"), so matching on description text turns real hardware into
  // "power accessories" - see SW-640L-TX-W / AMP-260-DNT.
  if (/^PSU|^PWR|POWERADAPTER|POWERSUPPLY/.test(key)) {
    return "Power accessory cannot be a lead replacement candidate.";
  }

  if (/^CAM/.test(key)) {
    return "Camera cannot be a lead replacement for signal-management hardware.";
  }

  if (/^APO/.test(key)) {
    return "UC/audio endpoint cannot be a lead replacement for signal-management hardware.";
  }

  return null;
}

export function invalidLeadReasonForIntent(supportOnlyReason: string | null, intent: CompareIntentKind): string | null {
  if (!supportOnlyReason || intent === "controller-accessory") {
    return null;
  }

  if ((intent === "ndi-camera" || intent === "ptz-camera") && supportOnlyReason.startsWith("Camera")) {
    return null;
  }

  if ((intent === "uc-byod" || intent === "usb-audio") && supportOnlyReason.startsWith("UC/audio")) {
    return null;
  }

  return `${SUPPORT_ONLY_LEAD_BLOCKER} ${supportOnlyReason}`;
}

export function networkHdEndpointRoleFromSku(sku: string): "tx" | "rx" | "trx" | null {
  const key = skuKey(sku);

  if (!/^NHD/.test(key) || /^NHDUSB/.test(key) || /CTL|RACK|0401MV/.test(key)) {
    return null;
  }

  if (/TRX$/.test(key)) return "trx";
  if (/RX$/.test(key)) return "rx";
  if (/TX$/.test(key)) return "tx";
  return null;
}

export function productHasNetworkHdEndpointRole(sku: string, text: string): boolean {
  const key = skuKey(sku);
  const value = normalise(text);

  if (!/^NHD/.test(key)) {
    return false;
  }

  if (/CTL|RACK|0401MV/.test(key)) {
    return false;
  }

  if (/\b(controller|rack|mount|multiview processor)\b/i.test(value)) {
    return false;
  }

  return Boolean(networkHdEndpointRoleFromSku(key)) ||
    /\b(tx|rx|trx|encoder|decoder|transceiver|transmitter|receiver)\b/i.test(value);
}

/** Extract transport text from the product record's structured data. */
export function candidateProductTransportText(product: unknown): string {
  if (!product || typeof product !== "object" || Array.isArray(product)) return "";
  const record = product as LooseRecord;

  // 1. Structured transport array on the governed technical profile
  const transports = record.transport ?? record.technologies;
  if (Array.isArray(transports) && transports.length > 0) {
    return transports.map((t: unknown) => String(t ?? "")).join(" ");
  }

  // 2. Product class / product type labels
  const productType = String(record.productType ?? record.productClass ?? "");
  if (productType) return productType;

  // 3. WyreStorm compare profile (if already built)
  const profile = record.wyrestorm ?? record;
  const profileTransport = profile.transport;
  if (Array.isArray(profileTransport) && profileTransport.length > 0) {
    return profileTransport.map((t: unknown) => String(t ?? "")).join(" ");
  }

  // 4. Technical profile transport
  const techProfile = record.technicalProfile;
  if (techProfile && typeof techProfile === "object") {
    const techTransports = (techProfile as LooseRecord).transport;
    if (Array.isArray(techTransports) && techTransports.length > 0) {
      return techTransports.map((t: unknown) => String(t ?? "")).join(" ");
    }
  }

  return "";
}

export function matrixFitPenalty(competitorText: string, sku: string, text: string, product?: unknown): number {
  const required = extractMatrixSizeFromText(competitorText);
  const encoded = extractMatrixSizeFromText(sku);
  const offered = /^(?:EXPSP|SP)/.test(skuKey(sku))
    ? encoded
    : extractCandidateMatrixSize(product) ?? encoded;

  let penalty = 0;

  if (required.inputs && offered.inputs) {
    if (offered.inputs < required.inputs) {
      penalty += 200;
    } else {
      penalty += Math.max(0, offered.inputs - required.inputs) * 10;
    }
  }

  if (required.outputs && offered.outputs) {
    if (offered.outputs < required.outputs) {
      penalty += 200;
    } else {
      penalty += Math.max(0, offered.outputs - required.outputs) * 10;
    }
  }

  // Matrix capacity alone is not enough to establish technical equivalence.
  // A local-HDMI matrix and an HDBaseT matrix kit can both be 4x4, but they
  // have different output transports, cabling, receiver requirements and
  // package topology. Prefer the architecture that the competitor evidence
  // actually describes, without relying on a permanent SKU-to-SKU mapping.
  const requirement = normalise(competitorText);
  const candidate = normalise(`${sku} ${text}`);
  const requiresRemoteTransport = /\b(hdbaset|hdbt|tps|category cable|cat\s*[56][a-z]?|receiver(?:s| kit)?|rx kit)\b/i.test(requirement);
  const requiresLocalHdmi = /\bhdmi\b/i.test(requirement) && !requiresRemoteTransport;

  // Determine the candidate's actual output transport. Structured transport
  // data on the product record is authoritative — the SKU regex is a fallback
  // only. The H2A family prefix appears on both HDBaseT matrices (MXV-*) and
  // pure HDMI matrices (MX-0808-H2A-MK2), so matching H2A in the SKU alone
  // falsely flags local-HDMI products as offering remote transport.
  const candidateProductTransport = candidateProductTransportText(product);
  const offersRemoteTransport =
    (candidateProductTransport && /\b(hdbaset|hdbt|receiver(?:s| kit)?|rx kit)\b/i.test(candidateProductTransport))
    || /\b(hdbaset|hdbt|receiver(?:s| kit)?|rx kit)\b/i.test(candidate)
    || /(?:HDBT)/.test(skuKey(sku));
  const offersLocalHdmiOnly = /\bhdmi\b/i.test(candidate) && !offersRemoteTransport;
  const addsUnrequestedScaling = /\b(seamless|scaling|scaler)\b/i.test(candidate) || /SCL/.test(skuKey(sku));

  if (requiresRemoteTransport && offersLocalHdmiOnly) {
    penalty += 120;
  } else if (requiresLocalHdmi && offersRemoteTransport) {
    penalty += 120;
  } else if (requiresLocalHdmi && offersLocalHdmiOnly) {
    // Pure HDMI candidate matches a local-HDMI competitor: small tiebreaker
    // so it ranks above HDBaseT / remote-transport candidates when penalties
    // are otherwise equal. Kept small enough to avoid promoting NO-MATCH
    // candidates past the viability threshold.
    penalty -= 5;
  } else if (requiresRemoteTransport && offersRemoteTransport) {
    // HDBaseT candidate matches an HDBaseT competitor: small tiebreaker.
    penalty -= 5;
  }

  if (!/\b(seamless|scaling|scaler)\b/i.test(requirement) && addsUnrequestedScaling) {
    penalty += 30;
  }

  return penalty;
}

export type ExtenderStructuralFitFacts = {
  distanceMeters: number | null;
  hasUsbExtension: boolean;
  hasKvm: boolean;
  hdbasetGeneration: number | null;
  hdbasetClass: "A" | "B" | null;
  uncompressed18Gbps: boolean;
};

export type ExtenderStructuralAssessment = {
  directCapable: boolean;
  fitPenalty: number;
  reasons: string[];
};

/**
 * Reads advertised extension reach from text.
 *
 * Distance is never inferred from the SKU number. It must come from structured
 * data or an explicit metres/feet statement.
 */
function deriveAdvertisedDistanceMeters(text: string): number | null {
  const metres = Array.from(
    text.matchAll(/(\d+(?:\.\d+)?)\s*m(?:eters?|etres?)?\b/gi),
  )
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 20000);

  const feet = Array.from(
    text.matchAll(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\b/gi),
  )
    .map((match) => Number(match[1]) * 0.3048)
    .filter((value) => Number.isFinite(value) && value > 0 && value < 20000);

  const values = [...metres, ...feet];

  return values.length > 0 ? Math.max(...values) : null;
}

export function deriveExtenderStructuralFitFacts(
  value: unknown,
  extraText = "",
): ExtenderStructuralFitFacts {
  const record: LooseRecord =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as LooseRecord)
      : {};

  const specs: LooseRecord =
    record.specs && typeof record.specs === "object" && !Array.isArray(record.specs)
      ? (record.specs as LooseRecord)
      : {};

  const technicalProfile: LooseRecord =
    record.technicalProfile &&
    typeof record.technicalProfile === "object" &&
    !Array.isArray(record.technicalProfile)
      ? (record.technicalProfile as LooseRecord)
      : {};

  const technicalSpecs: LooseRecord =
    technicalProfile.specs &&
    typeof technicalProfile.specs === "object" &&
    !Array.isArray(technicalProfile.specs)
      ? (technicalProfile.specs as LooseRecord)
      : {};

  const text = normalise([value, extraText]);

  const structuredDistance = numberFromValue(
    record.hdbasetDistance ??
      record.distanceMeters ??
      specs.hdbasetDistance ??
      specs.distanceMeters ??
      technicalProfile.hdbasetDistance ??
      technicalProfile.distanceMeters ??
      technicalSpecs.hdbasetDistance ??
      technicalSpecs.distanceMeters ??
      technicalProfile.hdbaset?.distanceMeters ??
      technicalProfile.hdbaset?.distance,
  );

  const distanceMeters =
    structuredDistance ??
    deriveAdvertisedDistanceMeters(text);

  const hasKvm =
    /\bkvm\b/i.test(text) ||
    /\bkeyboard\b.{0,80}\bmouse\b/i.test(text) ||
    /\bmouse\b.{0,80}\bkeyboard\b/i.test(text);

  // A bare USB-C video input is not USB extension evidence.
  const hasUsbExtension =
    hasKvm ||
    /\busb[\s_-]*(?:2(?:\.0)?|3(?:\.\d+)?|host|device|extension|extender|over[\s_-]*ip)\b/i.test(
      text,
    );

  const generationMatch = text.match(/\bhdbaset\s*(?:tm\s*)?(?:version\s*)?(3(?:\.0)?)\b/i);
  const classMatch = text.match(/\bhdbaset[^.]{0,30}\bclass\s*([ab])\b|\bclass\s*([ab])\b[^.]{0,30}\bhdbaset\b/i);
  const hdbasetGeneration = generationMatch ? Number(generationMatch[1]) : null;
  const hdbasetClass = String(classMatch?.[1] ?? classMatch?.[2] ?? "").toUpperCase() as "A" | "B" | "";
  const uncompressed18Gbps =
    /\buncompressed\b[^.]{0,50}\b18\s*gbps\b|\b18\s*gbps\b[^.]{0,50}\buncompressed\b/i.test(text) ||
    (/\b4k\s*60(?:hz)?\b/i.test(text) && /\b4\s*:\s*4\s*:\s*4\b/i.test(text) && hdbasetGeneration === 3);

  return {
    distanceMeters: distanceMeters ?? null,
    hasUsbExtension,
    hasKvm,
    hdbasetGeneration,
    hdbasetClass: hdbasetClass || null,
    uncompressed18Gbps,
  };
}

export function scoreExtenderStructuralFit(
  required: ExtenderStructuralFitFacts,
  candidate: ExtenderStructuralFitFacts,
): ExtenderStructuralAssessment {
  let directCapable = true;
  let fitPenalty = 0;
  const reasons: string[] = [];

  if (required.hdbasetGeneration !== null) {
    if (candidate.hdbasetGeneration !== required.hdbasetGeneration) {
      directCapable = false;
      fitPenalty += 220;
      reasons.push(
        candidate.hdbasetGeneration === null
          ? `HDBaseT ${required.hdbasetGeneration.toFixed(1)} is required, but the candidate's HDBaseT generation is not evidenced.`
          : `Candidate uses HDBaseT ${candidate.hdbasetGeneration.toFixed(1)}, not the required HDBaseT ${required.hdbasetGeneration.toFixed(1)}.`,
      );
    } else {
      fitPenalty -= 45;
      reasons.push(`Candidate matches the required HDBaseT ${required.hdbasetGeneration.toFixed(1)} generation.`);
    }
  } else if (required.hdbasetClass !== null) {
    if (candidate.hdbasetClass !== required.hdbasetClass) {
      directCapable = false;
      fitPenalty += 180;
      reasons.push(`HDBaseT Class ${required.hdbasetClass} is required, but the candidate does not evidence the same class.`);
    }
  }

  if (required.uncompressed18Gbps) {
    if (!candidate.uncompressed18Gbps) {
      directCapable = false;
      fitPenalty += 200;
      reasons.push("Uncompressed 18Gbps / 4K60 4:4:4 transport is required but is not evidenced on this candidate.");
    } else {
      fitPenalty -= 35;
      reasons.push("Candidate evidences the required uncompressed 18Gbps / 4K60 4:4:4 transport class.");
    }
  }

  if (required.distanceMeters !== null) {
    if (candidate.distanceMeters === null) {
      directCapable = false;
      fitPenalty += 120;
      reasons.push(
        `Required extender reach is ${Math.round(required.distanceMeters)}m, but the candidate's supported reach is not evidenced.`,
      );
    } else if (candidate.distanceMeters < required.distanceMeters) {
      directCapable = false;
      fitPenalty += 180;
      reasons.push(
        `Candidate reach (${Math.round(candidate.distanceMeters)}m) is below the required ${Math.round(required.distanceMeters)}m.`,
      );
    } else if (candidate.distanceMeters <= required.distanceMeters * 1.25) {
      fitPenalty -= 30;
      reasons.push(
        `Candidate reach (${Math.round(candidate.distanceMeters)}m) closely covers the required ${Math.round(required.distanceMeters)}m.`,
      );
    } else {
      fitPenalty += 5;
      reasons.push(
        `Candidate reach (${Math.round(candidate.distanceMeters)}m) covers the required ${Math.round(required.distanceMeters)}m with additional headroom.`,
      );
    }
  }

  if (required.hasKvm) {
    if (!candidate.hasKvm) {
      directCapable = false;
      fitPenalty += 180;
      reasons.push(
        "KVM/USB host-control transport is required, but no KVM capability is evidenced on this candidate.",
      );
    } else {
      fitPenalty -= 25;
      reasons.push("Candidate provides the required KVM/USB host-control path.");
    }
  } else if (required.hasUsbExtension) {
    if (!candidate.hasUsbExtension) {
      directCapable = false;
      fitPenalty += 150;
      reasons.push(
        "USB extension is required, but no USB extension capability is evidenced on this candidate.",
      );
    } else {
      fitPenalty -= 20;
      reasons.push("Candidate provides the required USB extension path.");
    }
  }

  return {
    directCapable,
    fitPenalty,
    reasons,
  };
}
