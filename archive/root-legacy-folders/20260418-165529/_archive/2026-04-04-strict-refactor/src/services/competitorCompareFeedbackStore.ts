export type CompetitorCompareFeedbackType =
  | "no-match"
  | "ambiguous"
  | "manual-save"
  | "manual-delete"
  | "live-verified";

export type CompetitorCompareFeedbackEvent = {
  id: string;
  type: CompetitorCompareFeedbackType;
  brand: string;
  query: string;
  competitorSku?: string;
  wyrestormSku?: string;
  createdAt: string;
};

export type CompetitorCompareFeedbackSummary = {
  total: number;
  noMatch: number;
  ambiguous: number;
  manualSave: number;
  manualDelete: number;
  liveVerified: number;
};

const STORAGE_KEY = "wm_competitor_compare_feedback_v1";

function nowIso(): string {
  return new Date().toISOString();
}

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function readStorage(): CompetitorCompareFeedbackEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompetitorCompareFeedbackEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(events: CompetitorCompareFeedbackEvent[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
  }
}

export function logCompetitorCompareFeedback(
  input: Omit<CompetitorCompareFeedbackEvent, "id" | "createdAt">,
): void {
  const events = readStorage();
  const next: CompetitorCompareFeedbackEvent = {
    id: `${normalizeId(input.type)}::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    brand: tidy(input.brand),
    query: tidy(input.query),
    competitorSku: tidy(input.competitorSku) || undefined,
    wyrestormSku: tidy(input.wyrestormSku) || undefined,
    createdAt: nowIso(),
  };

  const last = events[0];
  const duplicate =
    last &&
    last.type === next.type &&
    normalizeId(last.brand) === normalizeId(next.brand) &&
    normalizeId(last.query) === normalizeId(next.query) &&
    normalizeId(last.competitorSku) === normalizeId(next.competitorSku) &&
    normalizeId(last.wyrestormSku) === normalizeId(next.wyrestormSku);

  if (duplicate) return;

  writeStorage([next, ...events].slice(0, 200));
}

export function getCompetitorCompareFeedbackSummary(): CompetitorCompareFeedbackSummary {
  const events = readStorage();
  return {
    total: events.length,
    noMatch: events.filter((event) => event.type === "no-match").length,
    ambiguous: events.filter((event) => event.type === "ambiguous").length,
    manualSave: events.filter((event) => event.type === "manual-save").length,
    manualDelete: events.filter((event) => event.type === "manual-delete").length,
    liveVerified: events.filter((event) => event.type === "live-verified").length,
  };
}
