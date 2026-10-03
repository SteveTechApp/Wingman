// localStorage-backed storage for per-SKU discovery question notes.
// Captured on the Call Cards page, consumed by Discovery to pre-fill
// the room model so reps don't re-enter the same answers.

const STORAGE_KEY = "wingman.pcc.questionNotes";

export type CallCardQuestionNotes = Record<string, string[]>;

function safeGet(): CallCardQuestionNotes {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeSet(data: CallCardQuestionNotes): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable.
  }
}

/** Get the stored notes for a specific SKU (array of answer strings, one per question). */
export function getQuestionNotes(sku: string): string[] {
  const all = safeGet();
  return all[sku] || [];
}

/** Save notes for a specific SKU. */
export function saveQuestionNotes(sku: string, notes: string[]): void {
  const all = safeGet();
  all[sku] = notes;
  safeSet(all);
}

/** Collect all non-empty notes across all SKUs as a single text blob for Discovery. */
export function allNotesAsText(): string {
  const all = safeGet();
  const lines: string[] = [];
  for (const [sku, notes] of Object.entries(all)) {
    const filled = notes.filter((n) => n.trim());
    if (filled.length === 0) continue;
    lines.push(`[${sku}]`);
    for (const note of filled) {
      lines.push(`  - ${note.trim()}`);
    }
  }
  return lines.join("\n");
}

/** Get all SKUs that have at least one non-empty note. */
export function skusWithNotes(): string[] {
  const all = safeGet();
  return Object.entries(all)
    .filter(([, notes]) => notes.some((n) => n.trim()))
    .map(([sku]) => sku);
}
