import registry from "../../../data/governance/transport-technology-registry.json";
import type {
  ProductTechnologyProfile,
  TechnologyNormalisationInput,
} from "../types/technologyProfile";

type RegistryRule = {
  id: string;
  priority?: number;
  manufacturerPattern?: string;
  skuPattern?: string;
  textPattern?: string;
  vendorTechnology?: string;
  canonicalTransport?: string;
  transportFamily?: ProductTechnologyProfile["transportFamily"];
  standardRelationship?: ProductTechnologyProfile["standardRelationship"];
  interoperability?: ProductTechnologyProfile["interoperability"];
  networkClass?: string;
  codecName?: string;
  codecStandard?: string;
  compressionClass?: ProductTechnologyProfile["compressionClass"];
  latencyClass?: string;
  medium?: string;
  distanceMeters?: number;
  powerMethod?: string;
  controllerRequirement?: string;
  notes?: string[];
  evidenceUrl?: string;
  evidenceStatement?: string;
};

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function combinedText(input: TechnologyNormalisationInput): string {
  return [
    input.manufacturer,
    input.sku,
    input.model,
    input.family,
    input.productClass,
    input.transport,
    input.technology,
    input.summary,
    input.description,
    text(input.features),
    text(input.specs),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function testPattern(pattern: string | undefined, value: string): boolean {
  if (!pattern) return true;
  return new RegExp(pattern, "i").test(value);
}

function matchesRule(
  rule: RegistryRule,
  input: TechnologyNormalisationInput,
  blob: string,
): boolean {
  const manufacturer = String(input.manufacturer || "").trim();
  const sku = String(input.sku || input.model || "").trim();

  return (
    testPattern(rule.manufacturerPattern, manufacturer) &&
    testPattern(rule.skuPattern, sku) &&
    testPattern(rule.textPattern, blob)
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normaliseProductTechnology(
  input: TechnologyNormalisationInput,
): ProductTechnologyProfile {
  const blob = combinedText(input);
  const rules = (registry.rules as RegistryRule[])
    .filter((rule) => matchesRule(rule, input, blob))
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));

  const result: ProductTechnologyProfile = {
    matchedRuleIds: [],
    notes: [],
    evidence: [],
  };

  for (const rule of rules) {
    const {
      id,
      priority: _priority,
      manufacturerPattern: _manufacturerPattern,
      skuPattern: _skuPattern,
      textPattern: _textPattern,
      evidenceUrl,
      evidenceStatement,
      ...facts
    } = rule;

    Object.assign(result, facts);
    result.matchedRuleIds?.push(id);

    if (evidenceUrl || evidenceStatement) {
      result.evidence?.push({
        sourceUrl: evidenceUrl,
        sourceType: "manufacturer",
        statement: evidenceStatement,
        confidence: "verified",
      });
    }
  }

  const lower = blob.toLowerCase();

  // Evidence-derived standards upgrade:
  // do not promote a vendor protocol to HDBaseT merely because it has a similar
  // one-cable topology. The source text itself must establish compatibility.
  if (
    /\bhdbaset(?:\s+standard)?\s+(?:compatible|compliant|certified)\b/i.test(blob) ||
    /configurable\s+for\s+compatibility\s+with\s+hdbaset/i.test(blob) ||
    /uses?\s+hdbaset(?:\s+technology)?/i.test(blob)
  ) {
    result.canonicalTransport = "HDBaseT";
    result.transportFamily = "twisted-pair";
    result.interoperability = "third-party-compatible";

    if (/configurable\s+for\s+compatibility\s+with\s+hdbaset/i.test(blob)) {
      result.standardRelationship = "selectable-mode";
    } else if (/\bcertified\b/i.test(blob)) {
      result.standardRelationship = "certified";
    } else if (/\bcompatible|compliant\b/i.test(blob)) {
      result.standardRelationship = "compatible";
    } else {
      result.standardRelationship = "based-on";
    }
  }

  // Never let generic HDBaseT words overwrite an explicit fiber family.
  if (/\bfiber\b|\bfibre\b/i.test(blob) && /dxlink|dm\s*8g/i.test(lower)) {
    if (/dxlink/i.test(lower)) {
      result.vendorTechnology = "AMX DXLink Fiber";
      result.canonicalTransport = "DXLink Fiber";
      result.transportFamily = "fiber";
      result.standardRelationship = "proprietary";
      result.interoperability = "vendor-ecosystem";
    } else if (/dm\s*8g/i.test(lower) && !/dm\s*8g\+/i.test(lower)) {
      result.vendorTechnology = "Crestron DigitalMedia 8G Fiber";
      result.canonicalTransport = "DigitalMedia fiber";
      result.transportFamily = "fiber";
      result.standardRelationship = "proprietary";
      result.interoperability = "vendor-ecosystem";
    }
  }

  result.matchedRuleIds = unique(result.matchedRuleIds ?? []);
  result.notes = unique(result.notes ?? []);

  if ((result.evidence?.length ?? 0) === 0 && input.sourceUrl) {
    result.evidence = [
      {
        sourceUrl: input.sourceUrl,
        sourceType: "manufacturer",
        confidence: "requires-review",
      },
    ];
  }

  return result;
}

export function technologyProfilesAreDirectlyComparable(
  left: ProductTechnologyProfile,
  right: ProductTechnologyProfile,
): boolean {
  if (!left.canonicalTransport || !right.canonicalTransport) return false;

  if (left.canonicalTransport !== right.canonicalTransport) return false;

  if (left.canonicalTransport === "HDBaseT") {
    return ![
      left.standardRelationship,
      right.standardRelationship,
    ].includes("proprietary");
  }

  if (left.canonicalTransport === "AV-over-IP") {
    // Network class is a hard architecture discriminator when known.
    if (
      left.networkClass &&
      right.networkClass &&
      left.networkClass !== right.networkClass
    ) {
      return false;
    }

    // Codec equality is NOT required for an equivalent application.
    // It is retained as an important comparison fact rather than a hard gate.
    return true;
  }

  return true;
}