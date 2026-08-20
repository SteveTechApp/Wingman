import fs from "node:fs";
import path from "node:path";

const registryRelativePath = path.join(
  "data",
  "governance",
  "transport-technology-registry.json",
);

function resolveTechnologyRegistryPath() {
  const candidates = [
    process.env.WINGMAN_REPO_ROOT
      ? path.resolve(process.env.WINGMAN_REPO_ROOT, registryRelativePath)
      : "",
    path.resolve(process.cwd(), registryRelativePath),
  ].filter(Boolean);

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolved) {
    throw new Error(
      `Wingman technology registry not found. Checked: ${candidates.join(", ")}`,
    );
  }

  return resolved;
}

const registryPath = resolveTechnologyRegistryPath();
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

function tidy(value) {
  return String(value ?? "").trim();
}

function serialise(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function combinedText(input = {}) {
  return [
    input.manufacturer,
    input.brand,
    input.sku,
    input.model,
    input.family,
    input.productClass,
    input.category,
    input.transport,
    input.technology,
    input.summary,
    input.description,
    serialise(input.features),
    serialise(input.specs),
    input.rawText,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function testPattern(pattern, value) {
  if (!pattern) return true;
  return new RegExp(pattern, "i").test(value);
}

function matchesRule(rule, input, blob) {
  const manufacturer = tidy(input.manufacturer || input.brand);
  const sku = tidy(input.sku || input.model);

  return (
    testPattern(rule.manufacturerPattern, manufacturer) &&
    testPattern(rule.skuPattern, sku) &&
    testPattern(rule.textPattern, blob)
  );
}

function unique(values) {
  return [...new Set((values || []).map((value) => tidy(value)).filter(Boolean))];
}

export function normaliseProductTechnology(input = {}) {
  const blob = combinedText(input);
  const rules = (Array.isArray(registry?.rules) ? registry.rules : [])
    .filter((rule) => matchesRule(rule, input, blob))
    .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));

  const result = {
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
    result.matchedRuleIds.push(id);

    if (evidenceUrl || evidenceStatement) {
      result.evidence.push({
        sourceUrl: evidenceUrl || "",
        sourceType: "manufacturer",
        statement: evidenceStatement || "",
        confidence: "verified",
      });
    }
  }

  if (
    /\bhdbaset(?:\s+standard)?[\s-]+(?:compatible|compliant|certified)\b/i.test(blob) ||
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

  if (/\bfiber\b|\bfibre\b/i.test(blob) && /dxlink|dm\s*8g/i.test(blob)) {
    if (/dxlink/i.test(blob)) {
      result.vendorTechnology = "AMX DXLink Fiber";
      result.canonicalTransport = "DXLink Fiber";
      result.transportFamily = "fiber";
      result.standardRelationship = "proprietary";
      result.interoperability = "vendor-ecosystem";
    } else if (/dm\s*8g/i.test(blob) && !/dm\s*8g\+/i.test(blob)) {
      result.vendorTechnology = "Crestron DigitalMedia 8G Fiber";
      result.canonicalTransport = "DigitalMedia fiber";
      result.transportFamily = "fiber";
      result.standardRelationship = "proprietary";
      result.interoperability = "vendor-ecosystem";
    }
  }

  result.matchedRuleIds = unique(result.matchedRuleIds);
  result.notes = unique(result.notes);

  if (result.evidence.length === 0 && input.sourceUrl) {
    result.evidence.push({
      sourceUrl: input.sourceUrl,
      sourceType: "manufacturer",
      confidence: "requires-review",
    });
  }

  return result;
}

export function technologyProfilesAreDirectlyComparable(left = {}, right = {}) {
  if (!left.canonicalTransport || !right.canonicalTransport) return false;
  if (left.canonicalTransport !== right.canonicalTransport) return false;

  if (left.canonicalTransport === "HDBaseT") {
    if (left.standardRelationship === "proprietary" || right.standardRelationship === "proprietary") {
      return false;
    }
    return true;
  }

  if (left.canonicalTransport === "AV-over-IP") {
    if (left.networkClass && right.networkClass && left.networkClass !== right.networkClass) {
      return false;
    }
    return true;
  }

  return true;
}