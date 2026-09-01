/**
 * AnalyticsDashboard — Collects and displays usage patterns, product quote
 * frequency, and win rates from local storage.
 *
 * Design constraints:
 *   1. All data stored in localStorage (no server dependency)
 *   2. Privacy-first: no customer names or project content
 *   3. Aggregated data only — no individual event browsing
 *   4. Automatic cleanup after 90 days
 */
import type { StoredProject } from "../data/projectStore";
import { readProjectStore } from "../data/projectStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeatureUsage = {
  feature: string;
  opens: number;
  exports: number;
  searches: number;
  lastUsed: string;
};

export type ProductQuoteFrequency = {
  sku: string;
  name: string;
  quoteCount: number;
  lastQuoted: string;
  winRate: number;
};

export type WinRateByCategory = {
  category: string;
  total: number;
  won: number;
  lost: number;
  deferred: number;
  winRate: number;
};

export type CompetitorLossFrequency = {
  brand: string;
  lossCount: number;
  winCount: number;
  whySnippets: string[];
};

export type AnalyticsDashboardData = {
  featureUsage: FeatureUsage[];
  productQuotes: ProductQuoteFrequency[];
  winRates: WinRateByCategory[];
  competitorLosses: CompetitorLossFrequency[];
  summary: {
    totalProjects: number;
    totalProducts: number;
    overallWinRate: number;
    mostUsedFeature: string;
    mostQuotedProduct: string;
    topCompetitorThreat: string;
  };
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const ANALYTICS_STORAGE_KEY = "wingman:analytics-events";
const MAX_EVENTS = 1000;
const RETENTION_DAYS = 90;

// ─── Event Storage ────────────────────────────────────────────────────────────

type StoredEvent = {
  kind: string;
  feature: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
};

function getStoredEvents(): StoredEvent[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredEvent[];
  } catch {
    return [];
  }
}

function storeEvent(event: StoredEvent): void {
  try {
    if (typeof window === "undefined") return;
    const events = getStoredEvents();
    events.push(event);

    // Trim old events
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const filtered = events.filter((e) => e.timestamp > cutoff).slice(-MAX_EVENTS);

    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Storage may be full or unavailable
  }
}

/**
 * Track a feature usage event and store it locally.
 */
export function trackFeatureUsage(
  kind: string,
  feature: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  storeEvent({
    kind,
    feature,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

/**
 * Build the analytics dashboard data from local storage and project store.
 */
export function buildAnalyticsDashboard(): AnalyticsDashboardData {
  const events = getStoredEvents();
  const projects = readProjectStore().projects ?? [];

  const featureUsage = aggregateFeatureUsage(events);
  const productQuotes = aggregateProductQuotes(projects);
  const winRates = aggregateWinRates(projects);
  const competitorLosses = aggregateCompetitorLosses(projects);

  const summary = {
    totalProjects: projects.length,
    totalProducts: new Set(
      projects.flatMap((p) => (p.productSelections ?? []).map((s) => s.sku)),
    ).size,
    overallWinRate: calculateOverallWinRate(winRates),
    mostUsedFeature: featureUsage[0]?.feature ?? "No data yet",
    mostQuotedProduct: productQuotes[0]?.sku ?? "No data yet",
    topCompetitorThreat: competitorLosses[0]?.brand ?? "No data yet",
  };

  return {
    featureUsage,
    productQuotes,
    winRates,
    competitorLosses,
    summary,
  };
}

// ─── Aggregation Functions ────────────────────────────────────────────────────

function aggregateFeatureUsage(events: StoredEvent[]): FeatureUsage[] {
  const usageMap = new Map<string, FeatureUsage>();

  for (const event of events) {
    const existing = usageMap.get(event.feature) ?? {
      feature: event.feature,
      opens: 0,
      exports: 0,
      searches: 0,
      lastUsed: event.timestamp,
    };

    if (event.kind === "feature_open") existing.opens += 1;
    if (event.kind === "export") existing.exports += 1;
    if (event.kind === "search") existing.searches += 1;

    if (event.timestamp > existing.lastUsed) {
      existing.lastUsed = event.timestamp;
    }

    usageMap.set(event.feature, existing);
  }

  return Array.from(usageMap.values())
    .sort((a, b) => (b.opens + b.exports + b.searches) - (a.opens + a.exports + a.searches));
}

function aggregateProductQuotes(projects: StoredProject[]): ProductQuoteFrequency[] {
  const quoteMap = new Map<string, ProductQuoteFrequency>();

  for (const project of projects) {
    const selections = project.productSelections ?? [];
    for (const selection of selections) {
      const sku = selection.sku?.toUpperCase() ?? "";
      if (!sku) continue;

      const existing = quoteMap.get(sku) ?? {
        sku,
        name: selection.title ?? sku,
        quoteCount: 0,
        lastQuoted: project.updatedAt ?? "",
        winRate: 0,
      };

      existing.quoteCount += 1;

      if ((project.updatedAt ?? "") > existing.lastQuoted) {
        existing.lastQuoted = project.updatedAt ?? "";
      }

      quoteMap.set(sku, existing);
    }
  }

  // Calculate win rates per product
  const projectsBySku = new Map<string, { won: number; total: number }>();
  for (const project of projects) {
    const outcome = project.dealOutcome;
    if (!outcome || outcome === "deferred") continue;

    const selections = project.productSelections ?? [];
    for (const selection of selections) {
      const sku = selection.sku?.toUpperCase() ?? "";
      if (!sku) continue;

      const stats = projectsBySku.get(sku) ?? { won: 0, total: 0 };
      stats.total += 1;
      if (outcome === "won") stats.won += 1;
      projectsBySku.set(sku, stats);
    }
  }

  for (const [sku, stats] of projectsBySku) {
    const product = quoteMap.get(sku);
    if (product) {
      product.winRate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
    }
  }

  return Array.from(quoteMap.values())
    .sort((a, b) => b.quoteCount - a.quoteCount);
}

function aggregateWinRates(projects: StoredProject[]): WinRateByCategory[] {
  const categoryMap = new Map<string, { total: number; won: number; lost: number; deferred: number }>();

  for (const project of projects) {
    const outcome = project.dealOutcome;
    if (!outcome) continue;

    // Determine category from project stage or product types
    const category = project.stage ?? "Unknown";

    const stats = categoryMap.get(category) ?? { total: 0, won: 0, lost: 0, deferred: 0 };
    stats.total += 1;
    if (outcome === "won") stats.won += 1;
    if (outcome === "lost") stats.lost += 1;
    if (outcome === "deferred") stats.deferred += 1;
    categoryMap.set(category, stats);
  }

  return Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      total: stats.total,
      won: stats.won,
      lost: stats.lost,
      deferred: stats.deferred,
      winRate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function aggregateCompetitorLosses(projects: StoredProject[]): CompetitorLossFrequency[] {
  const brandMap = new Map<string, { lossCount: number; winCount: number; whySnippets: string[] }>();

  for (const project of projects) {
    const outcome = project.dealOutcome;
    const why = project.dealOutcomeWhy ?? "";

    if (!outcome || !why) continue;

    // Extract brand names from "why" text
    const brands = extractBrandsFromText(why);

    for (const brand of brands) {
      const stats = brandMap.get(brand) ?? { lossCount: 0, winCount: 0, whySnippets: [] };
      if (outcome === "lost") stats.lossCount += 1;
      if (outcome === "won") stats.winCount += 1;
      if (why.length > 0 && stats.whySnippets.length < 5) {
        stats.whySnippets.push(why.slice(0, 100));
      }
      brandMap.set(brand, stats);
    }
  }

  return Array.from(brandMap.entries())
    .map(([brand, stats]) => ({
      brand,
      lossCount: stats.lossCount,
      winCount: stats.winCount,
      whySnippets: stats.whySnippets,
    }))
    .sort((a, b) => b.lossCount - a.lossCount);
}

function extractBrandsFromText(text: string): string[] {
  const brands = [
    "Crestron", "Extron", "AMX", "Kramer", "Q-SYS", "Logitech",
    "Barco", "AVPro Edge", "Blustream", "CYP", "Atlona", "Lightware",
    "Datapath", "Mersive", "BirdDog", "Poly", "Sony", "Just Add Power",
  ];

  return brands.filter((brand) =>
    text.toLowerCase().includes(brand.toLowerCase()),
  );
}

function calculateOverallWinRate(winRates: WinRateByCategory[]): number {
  const totalWon = winRates.reduce((sum, r) => sum + r.won, 0);
  const totalProjects = winRates.reduce((sum, r) => sum + r.total, 0);
  return totalProjects > 0 ? Math.round((totalWon / totalProjects) * 100) : 0;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Format a date string for display.
 */
export function formatAnalyticsDate(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a number for display (e.g., 1234 → "1.2k").
 */
export function formatAnalyticsNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return String(num);
}

/**
 * Clear all analytics data.
 */
export function clearAnalyticsData(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    }
  } catch {
    // Swallowed
  }
}
