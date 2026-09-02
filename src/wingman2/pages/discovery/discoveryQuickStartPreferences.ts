// Session-scoped memory of which starting profile the salesperson chose for a
// quick-start room type ("room" = the room's own profile, "standard" = the
// application's standard defaults). Kept in sessionStorage so REPEAT visits in
// the same session skip the profile-confirmation step instead of re-asking —
// the room type selection becomes non-blocking without persisting the choice
// across sessions (a new project next week may want a different starting
// profile). Storage failures (private mode, quota) degrade to "no memory",
// i.e. the confirmation step reappears, which is the safe direction.

export type QuickStartProfileChoice = "room" | "standard" | "blend";

const STORAGE_KEY = "wingman-quickstart-profile-preference";

type PreferenceRecord = Record<string, QuickStartProfileChoice>;

function readRecord(): PreferenceRecord {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as PreferenceRecord)
      : {};
  } catch {
    return {};
  }
}

export function readQuickStartProfileChoice(roomType: string): QuickStartProfileChoice | null {
  const choice = readRecord()[roomType];
  return choice === "room" || choice === "standard" || choice === "blend" ? choice : null;
}

export function rememberQuickStartProfileChoice(roomType: string, choice: QuickStartProfileChoice): void {
  if (typeof window === "undefined") return;
  try {
    const record = readRecord();
    record[roomType] = choice;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // No memory available — the confirmation step will simply re-appear.
  }
}

export function clearQuickStartProfileChoices(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — same safe degradation.
  }
}