import type { StoredProductSelection, StoredRecommendationFeedback } from "../data/projectStore";
import { readProjectStore } from "../data/projectStore";

export type FeedbackInformedGuidanceInput = {
  products: StoredProductSelection[];
  /**
   * Feedback entries from across the workspace's projects. Pass the union of
   * every project's `feedback` array so a lesson learned on one opportunity
   * informs the next proposal that selects the same SKU.
   */
  feedback?: StoredRecommendationFeedback[];
};

export type SkuFeedbackLesson = {
  sku: string;
  rating: string;
  count: number;
  label: string;
  notes: string[];
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseSku(value: string): string {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

/**
 * Aggregates feedback entries by SKU. The result is the memory of the tool:
 * which SKUs have previously been accepted, flagged as wrong-fit, or found to
 * be missing an accessory or dependency.
 */
export function aggregateSkuFeedback(feedback: StoredRecommendationFeedback[] | undefined): SkuFeedbackLesson[] {
  const bySku = new Map<string, { displaySku: string; ratings: Map<string, { label: string; notes: string[]; count: number }> }>();

  for (const entry of feedback ?? []) {
    const key = normaliseSku(entry.sku ?? "");
    if (!key) continue;
    const rating = text(entry.rating);
    if (!rating) continue;

    const bucket = bySku.get(key) ?? {
      displaySku: text(entry.sku).toUpperCase(),
      ratings: new Map<string, { label: string; notes: string[]; count: number }>(),
    };
    const existing = bucket.ratings.get(rating) ?? { label: text(entry.label), notes: [], count: 0 };
    existing.count += 1;
    if (text(entry.note)) existing.notes.push(text(entry.note));
    bucket.ratings.set(rating, existing);
    bySku.set(key, bucket);
  }

  return Array.from(bySku.values()).flatMap((bucket) =>
    Array.from(bucket.ratings.entries()).map(([rating, entry]) => ({
      sku: bucket.displaySku,
      rating,
      count: entry.count,
      label: entry.label,
      notes: entry.notes,
    })),
  );
}

const NEGATIVE_RATINGS = new Set(["wrong-fit", "missing-accessory", "needs-review"]);

/**
 * The feedback loop: before a SKU is carried into a new proposal, surface what
 * the field previously said about it. A "wrong-fit" or "missing-accessory"
 * rating on a prior project is exactly the kind of lesson that should temper a
 * repeat recommendation - and an "accepted" history is evidence the rep can
 * quote with more confidence.
 */
export function buildFeedbackInformedGuidance(input: FeedbackInformedGuidanceInput): DesignAssuranceLikeItem[] {
  const items: DesignAssuranceLikeItem[] = [];
  const lessons = aggregateSkuFeedback(input.feedback);
  if (!lessons.length) return items;

  const selectedKeys = new Set(input.products.map((product) => normaliseSku(product.sku)));

  for (const lesson of lessons) {
    if (!selectedKeys.has(normaliseSku(lesson.sku))) continue;
    const skuLabel = input.products.find((product) => normaliseSku(product.sku) === normaliseSku(lesson.sku))?.sku.toUpperCase() ?? lesson.sku;

    if (NEGATIVE_RATINGS.has(lesson.rating)) {
      const noteDetail = lesson.notes.length
        ? ` Field note: ${lesson.notes[0]}`
        : "";
      const countNote = lesson.count > 1
        ? ` (received ${lesson.count} times)`
        : "";
      items.push({
        id: `feedback-${lesson.sku}-${lesson.rating}`,
        severity: "warning",
        domain: "product",
        sku: skuLabel,
        message: `${skuLabel} previously received "${lesson.label || lesson.rating}" feedback${countNote} in another project.${noteDetail} Revalidate the fit, accessory coverage and dependency set for this opportunity before quoting.`,
      });
    } else if (lesson.rating === "accepted") {
      items.push({
        id: `feedback-${lesson.sku}-accepted`,
        severity: "information",
        domain: "product",
        sku: skuLabel,
        message: `${skuLabel} was accepted in a prior project - useful field evidence for this recommendation, but still validate against the current brief.`,
      });
    }
  }

  return items;
}

/**
 * Minimal structural type so the feedback module stays decoupled from the
 * assurance ledger's type while remaining assignable to it.
 */
type DesignAssuranceLikeItem = {
  id: string;
  severity: "blocker" | "warning" | "information";
  domain: "product";
  message: string;
  sku?: string;
};

export type CrossProjectFeedbackSummary = {
  sku: string;
  /** Per-rating breakdown: how many projects gave this rating, and the
   * labels/notes attached. */
  ratings: {
    rating: string;
    count: number;
    label: string;
    notes: string[];
    projectNames: string[];
  }[];
  /** Total number of feedback entries for this SKU across all projects. */
  totalEntries: number;
  /** Number of distinct projects that gave feedback on this SKU. */
  projectCount: number;
};

/**
 * Aggregates feedback across every project in the store, grouped by SKU.
 * Returns summaries sorted worst-first (negative-feedback SKUs first, then
 * accepted, then neutral), so the most caution-worthy products surface
 * immediately in the consolidation view.
 */
export function collectCrossProjectFeedback(): CrossProjectFeedbackSummary[] {
  const { projects } = readProjectStore();
  const byKey = new Map<string, {
    displaySku: string;
    ratings: Map<string, { label: string; notes: string[]; projectNames: string[] }>;
    totalEntries: number;
    projectNames: Set<string>;
  }>();

  for (const project of projects) {
    if (project.isDemo) continue;
    const projectName = project.name || "Untitled";
    for (const entry of project.feedback ?? []) {
      const key = normaliseSku(entry.sku ?? "");
      if (!key) continue;
      const rating = text(entry.rating);
      if (!rating) continue;

      const bucket = byKey.get(key) ?? {
        displaySku: text(entry.sku).toUpperCase(),
        ratings: new Map(),
        totalEntries: 0,
        projectNames: new Set(),
      };
      bucket.totalEntries += 1;
      bucket.projectNames.add(projectName);

      const existing = bucket.ratings.get(rating) ?? {
        label: text(entry.label),
        notes: [],
        projectNames: [],
      };
      existing.projectNames.push(projectName);
      const note = text(entry.note);
      if (note && !existing.notes.includes(note)) existing.notes.push(note);
      bucket.ratings.set(rating, existing);
      byKey.set(key, bucket);
    }
  }

  const summaries: CrossProjectFeedbackSummary[] = Array.from(byKey.values()).map((bucket) => ({
    sku: bucket.displaySku,
    ratings: Array.from(bucket.ratings.entries()).map(([rating, entry]) => ({
      rating,
      count: entry.projectNames.length,
      label: entry.label,
      notes: entry.notes,
      projectNames: entry.projectNames,
    })),
    totalEntries: bucket.totalEntries,
    projectCount: bucket.projectNames.size,
  }));

  // Sort worst-first: SKUs with negative ratings come before those with only
  // accepted ratings, with ties broken by total entry count.
  return summaries.sort((a, b) => {
    const aNeg = a.ratings.filter((r) => NEGATIVE_RATINGS.has(r.rating)).reduce((s, r) => s + r.count, 0);
    const bNeg = b.ratings.filter((r) => NEGATIVE_RATINGS.has(r.rating)).reduce((s, r) => s + r.count, 0);
    if (bNeg !== aNeg) return bNeg - aNeg;
    return b.totalEntries - a.totalEntries;
  });
}

// ── Win/loss patterns ────────────────────────────────────────────────

export type DealOutcomeRecord = {
  projectId: string;
  projectName: string;
  outcome: "won" | "lost" | "deferred";
  why: string;
  productSkus: string[];
  stage: string;
};

export type DealOutcomePattern = {
  /** Competitor or reason keyword extracted from "why" text. */
  keyword: string;
  /** How many lost deals mention this keyword. */
  lostCount: number;
  /** How many won deals mention this keyword. */
  wonCount: number;
  /** Project names that mention this keyword. */
  projectNames: string[];
};

/** Collect all projects with a deal outcome set. */
export function collectDealOutcomes(): DealOutcomeRecord[] {
  const { projects } = readProjectStore();
  const records: DealOutcomeRecord[] = [];

  for (const project of projects) {
    if (project.isDemo) continue;
    if (!project.dealOutcome) continue;

    records.push({
      projectId: project.id,
      projectName: project.name || "Untitled",
      outcome: project.dealOutcome as "won" | "lost" | "deferred",
      why: text(project.dealOutcomeWhy),
      productSkus: (project.productSelections ?? []).map((p) => text(p.sku).toUpperCase()).filter(Boolean),
      stage: text(project.stage),
    });
  }

  return records;
}

/** Extract common keywords from deal outcome "why" text. */
function extractKeywords(why: string): string[] {
  const lower = why.toLowerCase();
  const keywords: string[] = [];

  // Common competitor brands
  const brands = ["crestron", "extron", "amx", "kramer", "q-sys", "logitech", "poly",
    "barco", "merisive", "airtame", "clickshare", "barco", "cyp", "atlona",
    "blustream", "just add power", "jap", "datavideo", "black box"];
  for (const brand of brands) {
    if (lower.includes(brand)) keywords.push(brand.charAt(0).toUpperCase() + brand.slice(1));
  }

  // Common reasons
  if (/price|cost|budget|expensive|cheap/i.test(lower)) keywords.push("Price / budget");
  if (/ecosystem|existing|already| incumbent|familiar/i.test(lower)) keywords.push("Existing ecosystem");
  if (/spec|resolution|4k|60hz|feature/i.test(lower)) keywords.push("Specification gap");
  if (/support|service|warranty|install/i.test(lower)) keywords.push("Support / service");
  if (/timing|delayed|deferred|not ready|not now/i.test(lower)) keywords.push("Timing");
  if (/relationship|trust|known|partner/i.test(lower)) keywords.push("Relationship");
  if (/stock|availability|lead time|delivery/i.test(lower)) keywords.push("Availability");

  return keywords.length > 0 ? keywords : [why.slice(0, 60) || "No reason given"];
}

/** Surface patterns from win/loss outcomes across all projects. */
export function collectDealOutcomePatterns(): DealOutcomePattern[] {
  const records = collectDealOutcomes();
  const byKeyword = new Map<string, { lostCount: number; wonCount: number; projectNames: string[] }>();

  for (const record of records) {
    const keywords = extractKeywords(record.why);
    for (const keyword of keywords) {
      const existing = byKeyword.get(keyword) ?? { lostCount: 0, wonCount: 0, projectNames: [] };
      if (record.outcome === "lost") existing.lostCount += 1;
      if (record.outcome === "won") existing.wonCount += 1;
      if (!existing.projectNames.includes(record.projectName)) {
        existing.projectNames.push(record.projectName);
      }
      byKeyword.set(keyword, existing);
    }
  }

  return Array.from(byKeyword.entries())
    .map(([keyword, data]) => ({ keyword, ...data }))
    .sort((a, b) => b.lostCount - a.lostCount || b.wonCount - a.wonCount);
}

// ── Brand loss tracking for battle card priority ────────────────────

export type CompetitorBrandLoss = {
  brand: string;
  lossCount: number;
  winCount: number;
  whySnippets: string[];
};

/**
 * Collects which competitor brands are mentioned in lost-deal "why" text,
 * along with how many times WyreStorm won against that brand. Used by the
 * battle card engine to boost brands that are actively costing deals.
 */
export function collectCompetitorBrandLosses(): CompetitorBrandLoss[] {
  const records = collectDealOutcomes();
  const byBrand = new Map<string, { lossCount: number; winCount: number; whySnippets: string[] }>();

  const knownBrands = [
    "crestron", "extron", "amx", "kramer", "q-sys", "logitech", "poly",
    "barco", "merisive", "airtame", "clickshare", "cyp", "atlona",
    "blustream", "just add power", "jap", "datavideo", "black box",
  ];

  for (const record of records) {
    const lower = record.why.toLowerCase();
    for (const brand of knownBrands) {
      if (!lower.includes(brand)) continue;
      const display = brand.charAt(0).toUpperCase() + brand.slice(1);
      const existing = byBrand.get(display) ?? { lossCount: 0, winCount: 0, whySnippets: [] };
      if (record.outcome === "lost") existing.lossCount += 1;
      if (record.outcome === "won") existing.winCount += 1;
      if (record.why && !existing.whySnippets.includes(record.why)) {
        existing.whySnippets.push(record.why);
      }
      byBrand.set(display, existing);
    }
  }

  return Array.from(byBrand.entries())
    .map(([brand, data]) => ({ brand, ...data }))
    .sort((a, b) => b.lossCount - a.lossCount || b.winCount - a.winCount);
}

