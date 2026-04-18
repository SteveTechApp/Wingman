import type { CatalogProduct } from "@/catalog";

import { compareStructuredCompetitor } from "./fit";
import type { StructuredFitResult } from "./fit/types";

type MatchableCompetitor = Partial<CatalogProduct> & {
  brand?: string;
};

export type StructuredSkuFit = {
  sku: string;
  score: number;
  reasons: string[];
};

const GENERIC_FAMILY_HINTS = new Set([
  "apollo",
  "avoip",
  "hdbaset",
  "matrix",
  "videowall",
  "usbextension",
]);

const WYRESTORM_FAMILY_HINTS = new Set([
  "halo",
  "networkhd",
  "networkhdtouch",
]);

const GUIDANCE_FEATURE_PATTERNS = [
  /\bwingman\b/i,
  /\bwyrestorm\b/i,
  /\bdirection\b/i,
  /^(closest|confirm|check|review|validate|assess|ask|manual review)\b/i,
] as const;

const GUIDANCE_NOTE_PATTERNS = [
  /\bwingman\b/i,
  /\bwyrestorm\b/i,
  /\bdirection\b/i,
  /^(confirm|check|review|validate|assess|ask)\b/i,
] as const;

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function dedupeStrings(values: unknown[], limit = 24): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function splitNoteSegments(value: unknown): string[] {
  return tidy(value)
    .split("|")
    .map((segment) => tidy(segment))
    .filter(Boolean);
}

function isContaminatedFeature(value: string): boolean {
  const normalized = normalizeId(value);
  if (!normalized) return true;
  if (
    GENERIC_FAMILY_HINTS.has(normalized) ||
    WYRESTORM_FAMILY_HINTS.has(normalized)
  ) {
    return true;
  }

  return GUIDANCE_FEATURE_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeCompetitorFeatureList(values: unknown[]): string[] {
  return dedupeStrings(values, 24).filter((value) => !isContaminatedFeature(value));
}

export function sanitizeCompetitorNotes(value: unknown): string | undefined {
  const cleaned = dedupeStrings(
    splitNoteSegments(value).filter(
      (segment) => !GUIDANCE_NOTE_PATTERNS.some((pattern) => pattern.test(segment)),
    ),
    16,
  );
  return cleaned.length > 0 ? cleaned.join(" | ") : undefined;
}

export function sanitizeCompetitorForMatching<T extends MatchableCompetitor>(
  product: T,
): T {
  return {
    ...product,
    features: sanitizeCompetitorFeatureList(product.features ?? []),
    notes: sanitizeCompetitorNotes(product.notes),
  } as T;
}

function toStructuredCompetitorInput(product: MatchableCompetitor) {
  const sanitized = sanitizeCompetitorForMatching(product);
  return {
    sku: tidy(sanitized.sku),
    name: tidy(sanitized.name) || tidy(sanitized.sku),
    summary: tidy(sanitized.summary),
    category: tidy(sanitized.category),
    technology: tidy(sanitized.technology),
    features: sanitizeCompetitorFeatureList(sanitized.features ?? []),
  };
}

function toStructuredCandidateInput(product: CatalogProduct) {
  return {
    sku: product.sku,
    name: product.name,
    summary: product.summary,
    category: product.category,
    technology: product.technology,
    features: product.features ?? [],
  };
}

export function buildStructuredFitMap(
  competitor: MatchableCompetitor,
  candidates: CatalogProduct[],
): Map<string, StructuredSkuFit> {
  const ranked = compareStructuredCompetitor(
    toStructuredCompetitorInput(competitor),
    candidates.map((candidate) => toStructuredCandidateInput(candidate)),
  );

  return new Map(
    ranked.map((fit: StructuredFitResult) => [
      fit.sku,
      {
        sku: fit.sku,
        score: fit.score,
        reasons: fit.breakdown.reasons,
      },
    ]),
  );
}
