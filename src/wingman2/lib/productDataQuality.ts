import type { ProductIntelligenceRecord } from "../data/productIntelligenceRepository";
import type { DataConfidence, ProductQualityIssue } from "../types/productTruth";

export function recordConfidence(record: ProductIntelligenceRecord): DataConfidence {
  const governed = record.productTruth?.governance?.confidence;
  if (governed) return governed;
  const value = typeof record.confidence === "number" ? record.confidence : null;
  if (value === null) return "requires-review";
  return value >= .9 ? "verified" : value >= .75 ? "high" : value >= .5 ? "medium" : "low";
}

export function productQualityIssues(record: ProductIntelligenceRecord): ProductQualityIssue[] {
  const issues: ProductQualityIssue[] = [];
  const truth = record.productTruth;
  const maxVideo = truth?.videoCapability?.maximumResolution ?? (record.video as { maxResolution?: string } | undefined)?.maxResolution;
  if (!maxVideo) issues.push("missing-video-capability");
  if (!(record.inputs?.length || record.outputs?.length || record.mirroredOutputs?.length)) issues.push("missing-io-topology");
  if (!record.family || record.family === "Unknown" || !record.category || record.category === "Uncategorized") issues.push("missing-classification");
  if (record.lifecycle === "review" || recordConfidence(record) === "requires-review") issues.push("requires-review");
  if (recordConfidence(record) === "low") issues.push("low-confidence");
  if (!(truth?.governance?.lastVerifiedAt || record.lastReviewedAt)) issues.push("never-verified");
  if (record.lifecycle === "discontinued") issues.push("discontinued");
  if (record.vendorType === "competitor" && !record.equivalence) issues.push("missing-equivalence-review");
  return issues;
}

export function qualityCounts(records: ProductIntelligenceRecord[]) {
  return records.reduce<Partial<Record<ProductQualityIssue, number>>>((counts, record) => {
    productQualityIssues(record).forEach((issue) => { counts[issue] = (counts[issue] ?? 0) + 1; });
    return counts;
  }, {});
}

export function matchesProductFilters(record: ProductIntelligenceRecord, filters: { query?: string; manufacturer?: string; family?: string; category?: string; lifecycle?: string; confidence?: string; qualityIssue?: ProductQualityIssue | "" }) {
  const blob = `${record.brand} ${record.sku} ${record.name} ${record.family} ${record.category}`.toLowerCase();
  return (!filters.query || blob.includes(filters.query.toLowerCase())) && (!filters.manufacturer || record.brand === filters.manufacturer)
    && (!filters.family || record.family === filters.family) && (!filters.category || record.category === filters.category)
    && (!filters.lifecycle || (record.lifecycle || record.status) === filters.lifecycle) && (!filters.confidence || recordConfidence(record) === filters.confidence)
    && (!filters.qualityIssue || productQualityIssues(record).includes(filters.qualityIssue));
}
