const C88CS_SAFE_PROFILE_SUMMARY = "8x8 HDBaseT matrix. Routes multiple HDMI sources to multiple remote displays over HDBaseT. Maximum resolution noted as 4K60; verify HDMI version, HDCP version, distance, receiver package, control, audio and power details before external positioning.";
const LIGHTWARE_MMX4X2_SAFE_PROFILE_SUMMARY = "4x2 HDMI matrix switcher. Routes four HDMI sources to two independently routed HDMI outputs. Treat as a compact local HDMI matrix, not an 8x8 system.";
const AVPRO_4X4_HDBT_SAFE_PROFILE_SUMMARY = "4x4 HDBaseT matrix intent. Routes four HDMI sources to four independently routed display zones. Confirm the exact AVPro SKU because AC-EX SKUs are extender-family products, while AC-MX SKUs are matrix-family products.";
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
  safeProfileSummary?: string;
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
  safeProfileSummary: C88CS_SAFE_PROFILE_SUMMARY,
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

export const LIGHTWARE_MMX4X2_PROFILE: KnownCompareProfile = {
  brand: "Lightware",
  sku: "MMX4x2-HDMI",
  productClass: "4x2 HDMI matrix",
  domainTag: "hdmi_matrix",
  matrixSize: "4x2",
  inputCount: 4,
  outputCount: 2,
  inputTypes: ["HDMI"],
  outputTypes: ["HDMI"],
  transport: "HDMI",
  technology: "4x2 HDMI matrix",
  systemRole: "Route four HDMI sources to two independently routed HDMI displays.",
  resolution: "4K30",
  chroma: "4:4:4 at supported UHD modes",
  readiness: "usable-with-review",
  assumptions: [
    "Verified seeded profile from competitor source feed.",
    "MMX4x2-HDMI must remain 4 routed inputs by 2 routed outputs; do not derive 8x8 from unrelated matrix candidates.",
  ],
  preferredCandidates: [
    {
      sku: "EXP-MX-0402-H2",
      relationship: "direct_hdmi_matrix_candidate",
      confidence: 82,
      outcome: "GOOD MATCH",
      summary: "Known profile override: direct 4x2 HDMI matrix candidate. Verify detailed HDMI/HDCP, control and audio behaviour before quote positioning.",
      matches: ["4x2 matrix topology.", "HDMI input transport.", "HDMI output transport."],
      gaps: ["Datasheet-level HDMI/HDCP, audio and control behaviour must still be confirmed."],
      verify: ["Confirm HDMI/HDCP version.", "Confirm audio de-embed and ARC requirements.", "Confirm control method."],
      nextAction: "Use as the primary compact HDMI matrix comparison path.",
    },
    {
      sku: "MX-0808-H2A-MK2",
      relationship: "larger_capacity_matrix_candidate",
      confidence: 48,
      outcome: "VERIFY",
      summary: "Known profile override: larger 8x8 HDMI matrix. Only position if the customer needs extra routed HDMI I/O.",
      matches: ["HDMI matrix family.", "HDMI source and output direction."],
      gaps: ["Oversized versus the 4x2 requirement."],
      verify: ["Confirm whether the opportunity actually needs 8 inputs or 8 outputs."],
      nextAction: "Treat as an over-capacity option, not the direct replacement.",
    },
    {
      sku: "MX-0808-SCL",
      relationship: "larger_scaling_matrix_candidate",
      confidence: 42,
      outcome: "VERIFY",
      summary: "Known profile override: larger 8x8 scaling matrix with USB-C capability. Only position if scaling or USB-C changes the requirement.",
      matches: ["Matrix workflow.", "HDMI destination outputs."],
      gaps: ["Oversized versus the 4x2 requirement.", "USB-C/scaling features may be unnecessary."],
      verify: ["Confirm whether scaling or USB-C input is required.", "Confirm whether 8x8 capacity is justified."],
      nextAction: "Use only as an upgrade conversation, not as the direct like-for-like comparison.",
    },
  ],
  blockedCandidatePatterns: [/-TX(?:-|$)/i, /-RX(?:-|$)/i, /^NHD-\d+/i, /^NHD-CTL/i, /^CAB-/i],
  architectureAlternativeFamilies: ["NetworkHD"],
  safeProfileSummary: LIGHTWARE_MMX4X2_SAFE_PROFILE_SUMMARY,
  profileText: [
    "Known competitor profile:",
    "Brand Lightware.",
    "SKU MMX4x2-HDMI.",
    "Product class 4x2 HDMI matrix.",
    "Product class tag hdmi_matrix.",
    "Matrix size 4 inputs by 2 outputs.",
    "Input transport HDMI.",
    "Output transport HDMI.",
    "System role route four HDMI sources to two independently routed HDMI displays.",
    "Preferred WyreStorm direct matrix candidate EXP-MX-0402-H2.",
    "Larger 8x8 WyreStorm matrices are upgrade/over-capacity options, not direct replacements.",
  ].join("\n"),
};

export const AVPRO_ACMX44HDBT_PROFILE: KnownCompareProfile = {
  brand: "AVPro Edge",
  sku: "AC-MX-44HDBT",
  productClass: "4x4 HDBaseT matrix",
  domainTag: "hdbaset_matrix",
  matrixSize: "4x4",
  inputCount: 4,
  outputCount: 4,
  inputTypes: ["HDMI"],
  outputTypes: ["HDBaseT"],
  transport: "HDBaseT",
  technology: "4x4 HDBaseT matrix",
  systemRole: "Route four HDMI sources to four independently routed remote display zones over HDBaseT.",
  resolution: "4K60",
  chroma: "4:4:4",
  readiness: "usable-with-review",
  assumptions: [
    "Known profile resolver used for AVPro Edge AC-MX matrix classification.",
    "Matrix size is four routed inputs by four routed outputs; do not infer 8, 16 or more outputs from mirrored or accessory connectors.",
  ],
  preferredCandidates: [
    {
      sku: "MXV-0404-H2A-KIT-V2",
      relationship: "direct_hdbaset_matrix_candidate",
      confidence: 82,
      outcome: "GOOD MATCH",
      summary: "Known profile override: 4x4 HDBaseT matrix kit candidate. Treat routed outputs as four zones; mirrored HDMI is a feature, not extra matrix capacity.",
      matches: ["4x4 matrix topology.", "HDBaseT destination transport.", "HDMI source input direction.", "Receiver package direction."],
      gaps: ["Confirm exact distance, receiver mix, control and audio requirements before quote positioning."],
      verify: ["Confirm HDMI/HDCP version.", "Confirm 4K distance and receiver package.", "Confirm whether mirrored HDMI is required or only useful."],
      nextAction: "Use as the primary WyreStorm 4x4 HDBaseT matrix comparison path.",
    },
    {
      sku: "MXV-0404-H2A-KIT",
      relationship: "related_hdbaset_matrix_candidate",
      confidence: 78,
      outcome: "PARTIAL MATCH",
      summary: "Known profile override: related 4x4 HDBaseT matrix kit. Verify current availability and receiver package before positioning.",
      matches: ["4x4 matrix topology.", "HDBaseT output direction.", "HDMI source input direction."],
      gaps: ["Availability and package contents need confirmation."],
      verify: ["Confirm active/current SKU status.", "Confirm included receivers.", "Confirm distance class."],
      nextAction: "Use as the related 4x4 HDBaseT matrix path when the V2/current kit is not the right package.",
    },
    {
      sku: "MX-0404-KIT",
      relationship: "mixed_output_matrix_candidate",
      confidence: 66,
      outcome: "VERIFY",
      summary: "Known profile override: 4x4 matrix kit with mixed HDBaseT and HDMI outputs. It can be useful, but it is not a pure four-zone HDBaseT like-for-like.",
      matches: ["4x4 routed matrix topology.", "HDBaseT matrix family.", "Receiver-kit direction."],
      gaps: ["Mixed output transport may not match a four-zone HDBaseT requirement."],
      verify: ["Confirm whether all four destinations need HDBaseT.", "Confirm whether one local HDMI output is acceptable."],
      nextAction: "Use only if the system design accepts the mixed HDBaseT/HDMI output set.",
    },
    {
      sku: "MX-0404-HDMI",
      relationship: "local_hdmi_matrix_candidate",
      confidence: 58,
      outcome: "VERIFY",
      summary: "Known profile override: local 4x4 HDMI matrix. Same routed size, different transport.",
      matches: ["4x4 routed matrix topology.", "HDMI input direction."],
      gaps: ["Local HDMI outputs do not replace HDBaseT distance or receiver requirements."],
      verify: ["Confirm cable-distance requirement.", "Confirm whether remote receivers are required."],
      nextAction: "Use when the job only needs local HDMI routing.",
    },
  ],
  blockedCandidatePatterns: [/-TX(?:-|$)/i, /-RX(?:-|$)/i, /^NHD-\d+/i, /^NHD-CTL/i, /^CAB-/i, /^EX-/i],
  architectureAlternativeFamilies: ["NetworkHD"],
  safeProfileSummary: AVPRO_4X4_HDBT_SAFE_PROFILE_SUMMARY,
  profileText: [
    "Known competitor profile:",
    "Brand AVPro Edge.",
    "SKU AC-MX-44HDBT.",
    "Product class 4x4 HDBaseT matrix.",
    "Product class tag hdbaset_matrix.",
    "Matrix size 4 inputs by 4 outputs.",
    "Input transport HDMI.",
    "Output transport HDBaseT.",
    "System role route four HDMI sources to four independently routed remote display zones over HDBaseT.",
    "Preferred WyreStorm direct matrix candidate MXV-0404-H2A-KIT-V2.",
    "Related WyreStorm candidates MXV-0404-H2A-KIT, MX-0404-KIT and MX-0404-HDMI.",
  ].join("\n"),
};

export const AVPRO_ACEX40_MATRIX_INTENT_PROFILE: KnownCompareProfile = {
  ...AVPRO_ACMX44HDBT_PROFILE,
  sku: "AC-EX40-444-KIT",
  productClass: "4x4 HDBaseT matrix intent - verify exact AVPro SKU",
  readiness: "needs-evidence",
  assumptions: [
    "AC-EX40-444-KIT is an AVPro Edge extender-family SKU, not the normal AC-MX matrix-family naming pattern.",
    "Wingman is using 4x4 matrix intent to avoid a dead-end because the selected comparison request is clearly asking for a simple 4x4 matrix replacement.",
    "Before quote use, confirm whether the intended competitor SKU is AC-MX-44HDBT or another AVPro 4x4 matrix.",
  ],
  preferredCandidates: AVPRO_ACMX44HDBT_PROFILE.preferredCandidates.map((candidate, index) => ({
    ...candidate,
    outcome: index === 0 ? "PARTIAL MATCH" : candidate.outcome,
    confidence: Math.max(45, candidate.confidence - 8),
    summary: `${candidate.summary} Verify the source competitor SKU because AC-EX40-444-KIT reads as an extender kit, not a matrix SKU.`,
    verify: [
      "Confirm the exact AVPro competitor SKU before quote positioning.",
      ...candidate.verify,
    ],
  })),
  safeProfileSummary: AVPRO_4X4_HDBT_SAFE_PROFILE_SUMMARY,
  profileText: [
    "Known competitor profile fallback:",
    "Brand AVPro Edge.",
    "Selected SKU AC-EX40-444-KIT.",
    "AC-EX naming is extender-family, so this is a matrix-intent fallback rather than a verified SKU profile.",
    "Use this path when the call/request intent is a simple 4x4 HDBaseT matrix comparison.",
    "Matrix intent 4 inputs by 4 outputs.",
    "Input transport HDMI.",
    "Output transport HDBaseT.",
    "Preferred WyreStorm direct matrix candidate MXV-0404-H2A-KIT-V2.",
    "Sales action: confirm whether the intended AVPro matrix SKU is AC-MX-44HDBT or another 4x4 matrix before external quote use.",
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
  const safeProfileSummary = profile.safeProfileSummary ?? profile.profileText ?? C88CS_SAFE_PROFILE_SUMMARY;

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
    description: safeProfileSummary,
    summary: safeProfileSummary,
    displaySummary: safeProfileSummary,
    profileSummary: safeProfileSummary,
    productSummary: safeProfileSummary,
    shortDescription: safeProfileSummary,
    fullDescription: safeProfileSummary,
    sourceText: safeProfileSummary,
    rawText: safeProfileSummary,
    evidenceText: safeProfileSummary,
    lookupText: safeProfileSummary,
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
      blockers: [],
      gaps: candidate.gaps,
      matches: candidate.matches,
      verify: candidate.verify,
      summary: candidate.summary,
      nextAction: candidate.nextAction,
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
  const compactText = text.replace(/[^A-Z0-9]+/g, "");

  if (text.includes("C88CS") || (text.includes("BLUSTREAM") && text.includes("C88"))) {
    return C88CS_PROFILE;
  }

  if (compactText.includes("MMX4X2HDMI") || (text.includes("LIGHTWARE") && compactText.includes("MMX4X2"))) {
    return LIGHTWARE_MMX4X2_PROFILE;
  }

  if (
    compactText.includes("ACMX44HDBT") ||
    compactText.includes("ACMX44") ||
    compactText.includes("ACMX42X") ||
    (text.includes("AVPRO") && compactText.includes("4X4") && text.includes("MATRIX"))
  ) {
    return AVPRO_ACMX44HDBT_PROFILE;
  }

  if (compactText.includes("ACEX40444KIT")) {
    return AVPRO_ACEX40_MATRIX_INTENT_PROFILE;
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
  const preferredSkus = profile.preferredCandidates.map((candidate) => candidate.sku).join(", ");
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
      `${profile.brand} ${profile.sku} resolved as ${profile.productClass}.`,
      `Preferred WyreStorm candidates are ${preferredSkus}.`,
      "Use the recommendation evidence for fit judgement and verify datasheet-level differences before external positioning.",
    ].join(" "),
  };
}
