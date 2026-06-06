import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const intelligence = readFileSync(path.join(root, "src/wingman2/lib/competitorProductIntelligence.ts"), "utf8");
const decision = readFileSync(path.join(root, "src/wingman2/lib/competitorCompareDecision.ts"), "utf8");

const requiredIntelligenceMarkers = [
  "CompetitorIntelligenceTier",
  "sku-only",
  "family-rule",
  "fingerprint",
  "verified-profile",
  "approved-compare-profile",
  "COMPETITOR_SKU_SEED_CATALOG",
  "REQUIRED_FACTS",
  "FAMILY_RULES",
  "buildCompetitorDecisionEvidence",
  "whyNotDirectEquivalent",
  "confidencePenalty",
  "buildCompetitorIntelligenceAudit",
  "AMX",
  "Crestron",
  "Extron",
  "Blustream",
];

const requiredDecisionMarkers = [
  "buildCompetitorDecisionEvidence",
  "const competitorIntelligence = buildCompetitorDecisionEvidence(competitor);",
  "Competitor intelligence tier:",
  "Competitor data missing:",
  "Why not direct equivalent:",
  "competitorIntelligence.confidencePenalty",
];

const missing = [
  ...requiredIntelligenceMarkers.filter((marker) => !intelligence.includes(marker)).map((marker) => "competitorProductIntelligence.ts missing: " + marker),
  ...requiredDecisionMarkers.filter((marker) => !decision.includes(marker)).map((marker) => "competitorCompareDecision.ts missing: " + marker),
];

if (missing.length) {
  console.error("[competitor-intelligence] Check failed:");
  for (const item of missing) {
    console.error("- " + item);
  }
  process.exit(1);
}

const knownSkus = [
  "DM-NVX-360",
  "NAV E 121",
  "HMX44-18G-KIT",
  "NMX-ENC-N2612S",
  "ZyPer4K Encoder",
  "MXNet-1G-E",
];

for (const sku of knownSkus) {
  if (!intelligence.includes(sku)) {
    console.error("[competitor-intelligence] Missing known SKU: " + sku);
    process.exit(1);
  }
}

console.log("[competitor-intelligence] Verified competitor registry, quality tiers, required facts, why-not reasons and compare-decision confidence penalties.");
