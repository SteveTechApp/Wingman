const C88CS_SAFE_PROFILE_SUMMARY = "8x8 HDBaseT matrix. Routes multiple HDMI sources to multiple remote displays over HDBaseT. Maximum resolution noted as 4K60; verify HDMI version, HDCP version, distance, receiver package, control, audio and power details before external positioning.";
import { hydrateWyrestormCompareProfile } from "./knownWyrestormCompareProfiles";
import { enrichWyrestormProductWithKnownMatrixProfile } from "./knownWyrestormMatrixProfiles";
import { resolveWyrestormSkuAlias, skuAliasMatches, normaliseSkuKey } from "./skuAliasResolver";

type AnyRecord = Record<string, any>;

interface PreferredCandidate {
  sku: string;
  relationship: string;
  confidence: number;
  outcome: "GOOD MATCH" | "PARTIAL MATCH" | "VERIFY" | "NO MATCH";
  summary: string;
  matches: string[];
  gaps: string[];
  verify: string[];
  nextAction: string;
}

interface KnownCompareProfile {
  brand: string;
  sku: string;
  productClass: string;
  domainTag: string;
  matrixSize: string;
  inputCount: number;
  outputCount: number;
  inputTypes: string[];
  outputTypes: string[];
  transport: string;
  technology: string;
  systemRole: string;
  resolution: string;
  chroma: string;
  readiness: "approved" | "usable-with-review" | "needs-evidence" | "sku-only";
  assumptions: string[];
  preferredCandidates: PreferredCandidate[];
  blockedCandidatePatterns: RegExp[];
  architectureAlternativeFamilies: string[];
  profileText: string;
}

export const C88CS_PROFILE: KnownCompareProfile = {
  brand: "Blustream",
  sku: "C88CS",
  productClass: "8x8 HDBaseT matrix",
  domainTag: "hdbaset_matrix",
  matrixSize: "8x8",
  inputCount: 8,
  outputCount: 8,
  inputTypes: ["HDMI"],
  outputTypes: ["HDBaseT"],
  transport: "HDBaseT",
  technology: "8x8 HDBaseT matrix",
  systemRole: "Route multiple HDMI sources to multiple remote displays over HDBaseT.",
  resolution: "4K60",
  chroma: "Unknown",
  readiness: "approved",
  assumptions: [
    "Known profile resolver used for competitor classification.",
    "Known seeded profile: C88CS resolved as Blustream 8x8 HDBaseT matrix.",
  ],
  preferredCandidates: [
    {
      sku: "MXV-0808-H2A-V3",
      relationship: "direct_matrix_candidate",
      confidence: 78,
      outcome: "PARTIAL MATCH",
      summary: "Known profile override: 8x8 HDBaseT matrix candidate. Verify datasheet-level video, distance, control and power details before external positioning.",
      matches: ["8x8 matrix topology.", "HDBaseT output transport.", "HDMI source input direction."],
      gaps: ["Datasheet-level video, distance, control and power details must be confirmed."],
      verify: ["Confirm HDMI/HDCP version.", "Confirm 4K distance and receiver compatibility.", "Confirm IR, RS-232 and IP control requirements."],
      nextAction: "Use as the primary WyreStorm fixed-matrix comparison path.",
    },
    {
      sku: "MXV-0808-H2A-70-V3",
      relationship: "long_distance_direct_matrix_candidate",
      confidence: 76,
      outcome: "PARTIAL MATCH",
      summary: "Known profile override: long-distance 8x8 HDBaseT matrix candidate. Verify datasheet-level details before external positioning.",
      matches: ["8x8 matrix topology.", "HDBaseT output transport.", "Longer-distance matrix direction."],
      gaps: ["Verify exact distance, receiver compatibility and control set."],
      verify: ["Confirm distance requirement.", "Confirm receiver type.", "Confirm control and audio requirements."],
      nextAction: "Use where the opportunity is distance-sensitive.",
    },
    {
      sku: "MXV-0808-H2A-KIT",
      relationship: "related_package",
      confidence: 70,
      outcome: "VERIFY",
      summary: "Known profile override: 8x8 HDBaseT matrix kit direction with receivers included.",
      matches: ["Same 8x8 matrix topology.", "HDBaseT matrix product class.", "KIT package includes receivers."],
      gaps: ["Confirm receiver mix and exact receiver types included in the kit."],
      verify: ["Confirm whether this is a kit/package comparison or matrix-only comparison."],
      nextAction: "Use as the package/kit comparison path when included receivers are required.",
    },
    {
      sku: "MX-0808-KIT-V2",
      relationship: "related_package",
      confidence: 64,
      outcome: "VERIFY",
      summary: "Known profile override: 8x8 matrix kit direction where receivers are included in the box.",
      matches: ["8x8 matrix direction.", "KIT package may suit projects where receivers need to be included."],
      gaps: ["KIT package does not automatically make it a like-for-like equivalent."],
      verify: ["Confirm receiver/package and specification requirements."],
      nextAction: "Position as a related package option only after confirming receiver/package requirements.",
    },
  ],
  blockedCandidatePatterns: [/-TX(?:-|$)/i, /-RX(?:-|$)/i, /^NHD-\d+/i, /^NHD-CTL/i, /^CAB-/i, /^EX-/i],
  architectureAlternativeFamilies: ["NetworkHD"],
  profileText: [
    "Known competitor profile:",
    "Brand Blustream.",
    "SKU C88CS.",
    "Product class 8x8 HDBaseT matrix.",
    "Product class tag hdbaset_matrix.",
    "Matrix size 8 inputs by 8 outputs.",
    "Input transport HDMI.",
    "Output transport HDBaseT.",
    "System role route multiple HDMI sources to multiple remote displays over HDBaseT.",
    "Preferred WyreStorm direct matrix candidates MXV-0808-H2A-V3 and MXV-0808-H2A-70-V3.",
    "Alias MXV-0808-70-H2A resolves to MXV-0808-H2A-70-V3.",
    "Related WyreStorm package candidates MXV-0808-H2A-KIT and MX-0808-KIT-V2.",
  ].join("\n"),
};

function productSku(product: AnyRecord): string {
  return String(product.sku ?? product.model ?? product.partNumber ?? product.title ?? "");
}

function productName(product: AnyRecord): string {
  return String(product.name ?? product.title ?? productSku(product));
}

function findProduct(products: readonly AnyRecord[], sku: string): AnyRecord {
  const canonicalSku = resolveWyrestormSkuAlias(sku);
  const target = normaliseSkuKey(canonicalSku);

  const found = products.find((product) => {
    const indexedSku = productSku(product);
    return normaliseSkuKey(indexedSku) === target || skuAliasMatches(sku, indexedSku);
  });

  if (found) {
    return enrichWyrestormProductWithKnownMatrixProfile(found, canonicalSku);
  }

  return enrichWyrestormProductWithKnownMatrixProfile({
    sku: canonicalSku,
    name: canonicalSku,
    family: "Known WyreStorm candidate requiring product-data enrichment",
  }, canonicalSku);
}

function competitorProfile(profile: KnownCompareProfile): AnyRecord {
  return {
    brand: profile.brand,
    manufacturer: profile.brand,
    sku: profile.sku,
    title: `${profile.brand} ${profile.sku}`,
    productClass: profile.productClass,
    domainTag: profile.domainTag,
    productDomainTag: profile.domainTag,
    domain: profile.productClass,
    technology: profile.technology,
    role: profile.systemRole,
    systemRole: profile.systemRole,
    transport: profile.transport,
    matrixSize: profile.matrixSize,
    inputCount: profile.inputCount,
    outputCount: profile.outputCount,
    routedInputCount: profile.inputCount,
    routedOutputCount: profile.outputCount,
    inputs: profile.inputCount,
    outputs: profile.outputCount,
    inputTypes: profile.inputTypes,
    outputTypes: profile.outputTypes,
    resolution: profile.resolution,
    maxResolution: profile.resolution,
    chroma: profile.chroma,
    readiness: profile.readiness,
    assumptions: profile.assumptions,
    evidenceTier: "verified-profile",
    description: C88CS_SAFE_PROFILE_SUMMARY,
    summary: C88CS_SAFE_PROFILE_SUMMARY,
    displaySummary: C88CS_SAFE_PROFILE_SUMMARY,
    profileSummary: C88CS_SAFE_PROFILE_SUMMARY,
    productSummary: C88CS_SAFE_PROFILE_SUMMARY,
    shortDescription: C88CS_SAFE_PROFILE_SUMMARY,
    fullDescription: C88CS_SAFE_PROFILE_SUMMARY,
    sourceText: C88CS_SAFE_PROFILE_SUMMARY,
    rawText: C88CS_SAFE_PROFILE_SUMMARY,
    evidenceText: C88CS_SAFE_PROFILE_SUMMARY,
    lookupText: C88CS_SAFE_PROFILE_SUMMARY,
  };
}

function makeMatch(candidate: PreferredCandidate, product: AnyRecord): AnyRecord {
  const hydratedProduct = hydrateWyrestormCompareProfile({
    ...product,
    sku: productSku(product) || candidate.sku,
  });

  return {
    sku: productSku(hydratedProduct) || resolveWyrestormSkuAlias(candidate.sku),
    name: productName(hydratedProduct),
    wyrestorm: hydratedProduct,
    decision: {
      outcome: candidate.outcome,
      confidence: candidate.confidence,
      relationship: candidate.relationship,
    },
    summary: candidate.summary,
    matches: candidate.matches,
    gaps: candidate.gaps,
    verify: candidate.verify,
    nextAction: candidate.nextAction,
  };
}

export function findKnownCompareProfile(input: string, brand?: string): KnownCompareProfile | undefined {
  const text = `${brand ?? ""} ${input ?? ""}`.toUpperCase();

  if (text.includes("C88CS") || (text.includes("BLUSTREAM") && text.includes("C88"))) {
    return C88CS_PROFILE;
  }

  return undefined;
}

export function enrichCompareInputWithKnownProfile(input: string, brand?: string): string {
  const profile = findKnownCompareProfile(input, brand);

  if (!profile) {
    return input;
  }

  return `${input}\n\n${profile.profileText}`;
}

export function applyKnownCompareProfileOverrides(result: AnyRecord, products: readonly AnyRecord[], rawInput: string, brand?: string): AnyRecord {
  const profile = findKnownCompareProfile(rawInput, brand);

  if (!profile) {
    return result;
  }

  const matches = profile.preferredCandidates.map((candidate) => makeMatch(candidate, findProduct(products, candidate.sku)));
  const existingMatches = Array.isArray(result?.matches) ? result.matches : [];
  const existingRejected = Array.isArray(result?.rejected) ? result.rejected : [];

  const knownKeys = new Set(matches.map((match) => normaliseSkuKey(productSku(match))));
  const remainingMatches = existingMatches.filter((match: AnyRecord) => !knownKeys.has(normaliseSkuKey(productSku(match))));

  const rejectedFromBlocked = remainingMatches.filter((match: AnyRecord) => {
    const sku = productSku(match);
    return profile.blockedCandidatePatterns.some((pattern) => pattern.test(sku));
  });

  const allowedRemainingMatches = remainingMatches.filter((match: AnyRecord) => {
    const sku = productSku(match);
    return !profile.blockedCandidatePatterns.some((pattern) => pattern.test(sku));
  });

  return {
    ...result,
    competitor: {
      ...(result?.competitor ?? {}),
      ...competitorProfile(profile),
    },
    matches: [...matches, ...allowedRemainingMatches],
    rejected: [...existingRejected, ...rejectedFromBlocked],
    topOutcome: matches[0]?.decision?.outcome ?? result?.topOutcome ?? "PARTIAL MATCH",
    recommendation: [
      "Blustream C88CS resolved as 8x8 HDBaseT matrix.",
      "Preferred WyreStorm candidates are MXV-0808-H2A-V3, MXV-0808-H2A-70-V3, MXV-0808-H2A-KIT and MX-0808-KIT-V2.",
      "Treat MX-0808-KIT-V2 and MXV-0808-H2A-KIT as related/package candidates and verify receiver/package specification before positioning.",
    ].join(" "),
  };
}
