import * as React from "react";
import type { CompetitorItem, MatchReason, MatchResult, Product } from "./types";
import { WYRESTORM_PRODUCTS } from "./competitorDataset";

/** Normalise SKUs to compare: uppercase, strip spaces, dashes, underscores, slashes */
export function normaliseSku(s: string): string {
  return (s || "")
    .toUpperCase()
    .replace(/[\s\-_\/\\]+/g, "")
    .replace(/[^\w]/g, "");
}

/** Normalise feature tokens */
function normFeat(xs?: string[]): string[] {
  return (xs || []).map(x => (x || "").toLowerCase().trim()).filter(Boolean);
}

/** Map resolution label to a comparable rank */
function resRank(r?: string): number {
  switch ((r || "").toUpperCase()) {
    case "1080P": return 1;
    case "4K30":  return 2;
    case "4K60":  return 3;
    case "8K":    return 4;
    default:      return 0;
  }
}

function scoreExactSku(c: CompetitorItem, p: Product): MatchReason {
  // Not usually exact across brands, but supports same-SKU within WyreStorm if used.
  const s = normaliseSku(c.sku);
  const t = normaliseSku(p.sku);
  const hit = s === t ? 1 : 0;
  return { key: "exactSku", score: hit * 0.25, text: hit ? "Exact SKU match" : "No exact SKU match" };
}

function scoreCategory(c: CompetitorItem, p: Product): MatchReason {
  const a = (c.category || "").toLowerCase();
  const b = (p.category || "").toLowerCase();
  const hit = a && b && a === b ? 1 : 0;
  return { key: "category", score: hit * 0.20, text: hit ? `Category match: ${a}` : "Category differs/unknown" };
}

function scoreRole(c: CompetitorItem, p: Product): MatchReason {
  const a = (c.role || "").toLowerCase();
  const b = (p.role || "").toLowerCase();
  const hit = a && b && a === b ? 1 : 0;
  return { key: "role", score: hit * 0.20, text: hit ? `Role match: ${a}` : "Role differs/unknown" };
}

function scoreResolution(c: CompetitorItem, p: Product): MatchReason {
  const cr = resRank(c.video?.maxResolution);
  const pr = resRank(p.video?.maxResolution);
  if (!cr || !pr) return { key: "resolution", score: 0.05, text: "Resolution unknown (light weight)" };
  const diff = Math.abs(cr - pr);
  const hit = diff === 0 ? 1 : diff === 1 ? 0.6 : 0.2;
  return { key: "resolution", score: hit * 0.15, text: `Resolution closeness: competitor ${c.video?.maxResolution} vs WyreStorm ${p.video?.maxResolution}` };
}

function scoreBandwidth(c: CompetitorItem, p: Product): MatchReason {
  const cb = c.video?.bandwidthGbps || 0;
  const pb = p.video?.bandwidthGbps || 0;
  if (!cb || !pb) return { key: "bandwidth", score: 0.05, text: "Bandwidth unknown (light weight)" };
  const diff = Math.abs(cb - pb);
  const hit = diff <= 1 ? 1 : diff <= 3 ? 0.6 : 0.2;
  return { key: "bandwidth", score: hit * 0.10, text: `Bandwidth closeness: competitor ${cb}Gbps vs WyreStorm ${pb}Gbps` };
}

function scoreFeatures(c: CompetitorItem, p: Product): MatchReason {
  const cf = new Set(normFeat(c.features));
  const pf = new Set(normFeat(p.features));
  if (cf.size === 0 || pf.size === 0) return { key: "features", score: 0.05, text: "Features sparse/unknown (light weight)" };

  let common = 0;
  cf.forEach(x => { if (pf.has(x)) common++; });
  const denom = Math.max(cf.size, pf.size);
  const ratio = denom ? common / denom : 0;
  return { key: "features", score: ratio * 0.10, text: `Feature overlap: ${common}/${denom}` };
}

function scoreFamilyHint(c: CompetitorItem, p: Product): MatchReason {
  const a = (c.familyHint || "").toLowerCase();
  const b = (p.family || "").toLowerCase();
  const hit = a && b && a === b ? 1 : 0;
  return { key: "family", score: hit * 0.10, text: hit ? `Family hint match: ${c.familyHint}` : "No family hint match" };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export type MatchOptions = {
  topN?: number;
  products?: Product[]; // If provided, use your real product catalog here
};

export function matchCompetitor(competitor: CompetitorItem, opts: MatchOptions = {}): MatchResult[] {
  const topN = opts.topN ?? 5;
  const products = (opts.products && opts.products.length ? opts.products : WYRESTORM_PRODUCTS);

  const results: MatchResult[] = products.map(p => {
    const reasons: MatchReason[] = [
      scoreExactSku(competitor, p),
      scoreCategory(competitor, p),
      scoreRole(competitor, p),
      scoreResolution(competitor, p),
      scoreBandwidth(competitor, p),
      scoreFeatures(competitor, p),
      scoreFamilyHint(competitor, p)
    ];

    const score = clamp01(reasons.reduce((a, r) => a + r.score, 0));
    const percent = Math.round(score * 100);

    return { competitor, product: p, score, percent, reasons };
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/** Convenience: input "Brand SKU" or just SKU; parses a minimal CompetitorItem */
export function parseCompetitorInput(input: string): CompetitorItem {
  const raw = (input || "").trim();
  if (!raw) return { brand: "Unknown", sku: "" };

  // crude parse: first token brand if it looks alphabetic; rest sku
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^[A-Za-z]{2,}$/.test(parts[0])) {
    return { brand: parts[0], sku: parts.slice(1).join(" ") };
  }
  return { brand: "Unknown", sku: raw };
}
export function searchCompetitors(_query: string): CompetitorItem[] {
  return [];
}
export function matchToCatalog(competitor: CompetitorItem, opts: MatchOptions = {}): MatchResult[] {
  return matchCompetitor(competitor, opts);
}
export function canAddSku(sku: string): boolean {
  return !!sku && !!sku.trim();
}