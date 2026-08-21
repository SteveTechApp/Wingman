import { useEffect, useState } from "react";
import type { CompetitorSourceProduct } from "../data/competitorSourceFeeds";

/**
 * Reps can save/edit their own competitor product data directly from Compare
 * (manual entry, or starting from a live-lookup result) so the next compare
 * of the same competitor SKU gets a real match instead of "no suitable
 * WyreStorm match found". Stored per-browser (localStorage) so it works in
 * Local mode with no backend/sign-in required.
 *
 * Shaped to match CompetitorSourceProduct exactly so a saved spec can drop
 * straight into competitorSpecRegistry.ts's existing sourceProduct field
 * chain with no separate mapping logic.
 */
export type SavedCompetitorSpec = CompetitorSourceProduct & {
  id: string;
  notes: string;
  savedFrom: "manual" | "live-lookup";
  createdAt: string;
  updatedAt: string;
};

export type SavedCompetitorSpecInput = {
  manufacturer: string;
  sku: string;
  title: string;
  domain: CompetitorSourceProduct["domain"];
  role: CompetitorSourceProduct["role"];
  transport: string;
  maxResolution: string;
  chroma: string;
  inputCount?: number;
  outputCount?: number;
  notes: string;
  sourceUrl?: string;
  features?: Record<string, boolean>;
  savedFrom: "manual" | "live-lookup";
};

const STORAGE_KEY = "wingman.compare.saved-competitor-specs.v1";
const CHANGED_EVENT = "wingman:saved-competitor-specs-changed";

function squash(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function specKey(manufacturer: string, sku: string): string {
  return `${squash(manufacturer)}::${squash(sku)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return `wcs-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function readAll(): SavedCompetitorSpec[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedCompetitorSpec[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: SavedCompetitorSpec[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function getSavedCompetitorSpecs(): SavedCompetitorSpec[] {
  return readAll();
}

/** Reuses the same brand+sku normalisation as CompetitorSourceProduct lookups. */
export function findSavedCompetitorSpec(manufacturer: string, sku: string): SavedCompetitorSpec | null {
  const key = specKey(manufacturer, sku);
  if (!squash(sku)) return null;

  return readAll().find((record) => specKey(record.manufacturer, record.sku) === key) || null;
}

/** Upserts by manufacturer+sku so re-saving the same competitor SKU updates the existing record. */
export function saveCompetitorSpec(input: SavedCompetitorSpecInput): SavedCompetitorSpec {
  const key = specKey(input.manufacturer, input.sku);
  const existing = readAll().find((record) => specKey(record.manufacturer, record.sku) === key);
  const timestamp = nowIso();

  const record: SavedCompetitorSpec = {
    sourceName: "user-saved",
    sourceCollection: "Compare: saved by rep",
    manufacturer: input.manufacturer.trim(),
    sku: input.sku.trim(),
    title: input.title.trim() || input.sku.trim(),
    summary: input.notes.trim(),
    domain: input.domain,
    role: input.role,
    transport: input.transport.trim(),
    family: "",
    maxResolution: input.maxResolution.trim(),
    chroma: input.chroma.trim(),
    latency: "",
    performanceTier: "user-saved",
    inputCount: input.inputCount,
    outputCount: input.outputCount,
    features: input.features ?? existing?.features ?? {},
    sourceUrl: input.sourceUrl || "",
    evidence: input.notes.trim() ? [input.notes.trim()] : [],
    id: existing?.id || uid(),
    notes: input.notes.trim(),
    savedFrom: input.savedFrom,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  const next = [record, ...readAll().filter((item) => item.id !== record.id)];
  writeAll(next);
  return record;
}

export function deleteSavedCompetitorSpec(id: string) {
  writeAll(readAll().filter((record) => record.id !== id));
}

export function useSavedCompetitorSpecs() {
  const [records, setRecords] = useState<SavedCompetitorSpec[]>(() => readAll());

  useEffect(() => {
    function refresh() {
      setRecords(readAll());
    }

    window.addEventListener(CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return records;
}
