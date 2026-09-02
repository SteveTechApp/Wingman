// Session-scoped memory of which starting profile the salesperson chose for a
// quick-start room type ("room" = the room's own profile, "standard" = the
// application's standard defaults). Kept in sessionStorage so REPEAT visits in
// the same session skip the profile-confirmation step instead of re-asking —
// the room type selection becomes non-blocking without persisting the choice
// across sessions (a new project next week may want a different starting
// profile). Storage failures (private mode, quota) degrade to "no memory",
// i.e. the confirmation step reappears, which is the safe direction.
//
// The choice is remembered per room type AND per disagreement set: the storage
// key mixes in a hash of the question ids the two profiles disagreed on at the
// moment of the choice. If the default tables change so a different question
// set disagrees, the key no longer matches and the confirmation re-opens — the
// rep answers about the current disagreement instead of silently seeding a
// profile remembered against questions that no longer apply.

export type QuickStartProfileChoice = "room" | "standard" | "blend";

const STORAGE_KEY = "wingman-quickstart-profile-preference";

type PreferenceRecord = Record<string, QuickStartProfileChoice>;

// FNV-1a over the sorted ids: deterministic, order-independent, compact, and
// separator-safe (the ids are hashed as one joined stream, so id boundaries
// cannot blur into each other).
function disagreementKeyPart(questionIds: readonly string[]): string {
  const normalized = [...questionIds].sort().join("\u0000");
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(36);
}

// Storage key for one remembered choice: the room type plus a hash of the
// disagreement question ids. The "#" keeps new-format keys disjoint from any
// bare room-type keys left over in a session storage from earlier versions —
// those can never satisfy a lookup again, which is the intended direction.
export function quickStartProfileKey(
  roomType: string,
  disagreementQuestionIds: readonly string[],
): string {
  return `${roomType}#${disagreementKeyPart(disagreementQuestionIds)}`;
}

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

export function readQuickStartProfileChoice(
  roomType: string,
  disagreementQuestionIds: readonly string[],
): QuickStartProfileChoice | null {
  const choice = readRecord()[quickStartProfileKey(roomType, disagreementQuestionIds)];
  return choice === "room" || choice === "standard" || choice === "blend" ? choice : null;
}

export function rememberQuickStartProfileChoice(
  roomType: string,
  choice: QuickStartProfileChoice,
  disagreementQuestionIds: readonly string[],
): void {
  if (typeof window === "undefined") return;
  try {
    const record = readRecord();
    record[quickStartProfileKey(roomType, disagreementQuestionIds)] = choice;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // No memory available — the confirmation step will simply re-appear.
  }
}

// Removes a single remembered choice — the one matching this room type and
// disagreement set — so the confirmation step re-opens for it. Other room
// types' choices are untouched.
export function forgetQuickStartProfileChoice(
  roomType: string,
  disagreementQuestionIds: readonly string[],
): void {
  if (typeof window === "undefined") return;
  try {
    const record = readRecord();
    delete record[quickStartProfileKey(roomType, disagreementQuestionIds)];
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // No memory available — nothing to forget.
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
