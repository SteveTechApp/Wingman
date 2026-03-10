import { postDeploymentTelemetry } from "@/app/api/wingmanDeploymentClient";

export type RuntimeErrorEntry = {
  id: string;
  kind: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: string;
};

const STORAGE_KEY = "wm_runtime_errors_v1";
const MAX_ENTRIES = 20;
let installed = false;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMessage(value: unknown): string {
  if (value instanceof Error) return value.message || "Unknown error";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readEntries(): RuntimeErrorEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RuntimeErrorEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: RuntimeErrorEntry[]): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
  }
}

function appendEntry(entry: RuntimeErrorEntry): void {
  const current = readEntries();
  writeEntries([entry, ...current]);
  void postDeploymentTelemetry({
    id: entry.id,
    kind: entry.kind,
    message: entry.message,
    stack: entry.stack,
    source: entry.source,
    line: entry.line,
    column: entry.column,
    timestamp: entry.timestamp,
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getRecentRuntimeErrors(): RuntimeErrorEntry[] {
  return readEntries();
}

export function clearRecentRuntimeErrors(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function installRuntimeErrorReporting(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    const entry: RuntimeErrorEntry = {
      id: makeId(),
      kind: "error",
      message: normalizeMessage(event.error ?? event.message),
      stack: event.error instanceof Error ? event.error.stack : undefined,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      timestamp: nowIso(),
    };

    appendEntry(entry);
    console.error("[runtime-error]", entry);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const entry: RuntimeErrorEntry = {
      id: makeId(),
      kind: "unhandledrejection",
      message: normalizeMessage(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: nowIso(),
    };

    appendEntry(entry);
    console.error("[unhandled-rejection]", entry);
  });
}
