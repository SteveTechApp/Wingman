/**
 * Storage keys this build writes nowhere and reads nowhere, and the boot sweep
 * that takes them back from a browser that still holds them.
 *
 * Deleting a store from the source does not delete it from a rep's browser: the
 * bytes sit in `localStorage` until something removes them, and nothing does —
 * the code that wrote them is gone, so no screen will ever touch that key again.
 * The largest of them is `wingman:video-wall-last-summary`: the wall builder used
 * to write a second copy of the summary the draft and the project already held on
 * every save, so an old build left a whole wall summary — its room, its equipment,
 * its brief — in a store nothing reads.
 *
 * The sweep therefore runs once per load from `main.tsx`, beside the CRM
 * send-history sweep, because both are storage no surface asks for. Waiting for
 * "the next time a rep opens the wall builder" is the failure this exists to
 * avoid: the builder never looks at this key again, and the reps whose browsers
 * hold the biggest copies are exactly the ones who would never open it.
 *
 * A list rather than a one-off removal, so the next retired store has one place to
 * be named. An entry is permanent: a browser can sit on an old build for months,
 * so a key stays named here long after this build stopped writing it, and the gate
 * that pins the wiring fails if the list is emptied while older builds are still
 * walking around. Removal is all it does — a retired key's contents are not
 * migrated into anything, because nothing wants them; that is what makes the key
 * retired rather than renamed.
 *
 * What it took back is carried to the next load rather than announced on the one
 * that took it. Boot runs before any surface exists to say so, which used to be
 * the reason nothing was said at all; but the numbers are the one part of a sweep
 * a rep can check — "did the space actually come back?" — and a copy nobody reads
 * is exactly the kind of thing a rep suspects is still sitting there. So the sweep
 * leaves the size it reclaimed in `RETIRED_STORAGE_RECLAIM_KEY`, the next load's
 * `takeRetiredStorageReclaim()` lifts it out of storage before that load's own
 * sweep can add to it, and a surface prints it once. That ordering is the whole
 * mechanism: the take happens before the write, so a load can only ever report the
 * space a *previous* load reclaimed, and the key is gone by the time the note is
 * on screen.
 *
 * The report is shared, because boot gives space back from more than one place and
 * a rep asking "did it come back?" is asking about the browser rather than about
 * one store. The CRM send-history sweep contributes the size its own cleanup freed
 * — see `recordStorageReclaim` — so one strip says everything boot gave back
 * rather than the largest single source, and a browser whose only reclaimable
 * storage was a CRM history is told about it instead of being told nothing.
 */
export const RETIRED_STORAGE_KEYS = ["wingman:video-wall-last-summary"] as const;

/**
 * Where the boot sweeps leave the size of what they took back, for the following
 * load.
 *
 * `bytes` is the whole of it, because one number is what a rep is shown: the size
 * is counted the way a browser counts it — a `localStorage` entry is a UTF-16
 * string, two bytes a character, and the key is stored with the value. Which keys
 * went and when is deliberately not kept, since the note names the space rather
 * than the copies and the sweep exists to forget those names; a field nothing
 * prints is a field this store does not carry.
 *
 * `webhookBytes` is the part of `bytes` that the CRM send-history sweep gave back,
 * and it is only there when that sweep contributed. The note needs the split
 * rather than the total alone, because the two promises are different: a retired
 * key is a copy no build reads, while the history is the rep's own record and the
 * rows over its ceilings are gone. A report written before that sweep contributed
 * carries no such field and reads as the copy an older build left behind, which is
 * exactly what it was.
 */
export const RETIRED_STORAGE_RECLAIM_KEY = "wingman-retired-storage-reclaim-v1";

/** What a previous load's boot sweeps took back, as the next load reads it. */
export type StorageReclaim = {
  /** The whole of it, both sweeps included. */
  bytes: number;
  /** The part of `bytes` the CRM send-history sweep gave back; 0 when none. */
  webhookBytes: number;
};

/**
 * The size of one stored entry, as `localStorage` accounts for it.
 *
 * Exported because the CRM sweep measures its own cleanup in this unit rather than
 * in the UTF-8 length its ceilings use: the two numbers end up added together in
 * one report, so they have to be counted the same way or the total would be a sum
 * of different things.
 */
export function storageEntryBytes(key: string, value: string) {
  return (key.length + value.length) * 2;
}

/** The size of one stored entry, in this module's own reads. */
const entryBytes = storageEntryBytes;

/**
 * The size a previous load left, or `null` when it left none.
 *
 * Read defensively: this is storage written by another build, so anything that is
 * not a positive size is not a report. A half-written entry is treated as absent
 * rather than repaired, because a note about space nobody measured is worse than
 * no note.
 */
function readStoredReclaim(): StorageReclaim | null {
  try {
    const raw = window.localStorage.getItem(RETIRED_STORAGE_RECLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { bytes?: unknown; webhookBytes?: unknown } | null;
    const bytes = parsed?.bytes;
    if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
    const webhook = parsed?.webhookBytes;
    // A part larger than its own total is a hand-edited or half-written report;
    // clamping it keeps the note's arithmetic honest instead of printing a send
    // history that gave back more than boot did.
    const webhookBytes = typeof webhook === "number" && Number.isFinite(webhook) && webhook > 0
      ? Math.min(webhook, bytes)
      : 0;
    return { bytes, webhookBytes };
  } catch {
    return null;
  }
}

/**
 * Add one sweep's reclaimed size to the report the next load prints.
 *
 * The one write into `RETIRED_STORAGE_RECLAIM_KEY`, called by both boot sweeps, so
 * the two numbers cannot be counted differently or land in different reports — a
 * rep sees one strip naming everything boot gave back rather than the largest
 * single source. It accumulates rather than overwrites, so two retired keys, a CRM
 * cleanup and a write left over from a load whose take never ran all add up.
 *
 * The write is guarded on its own: a store that refuses the note must not turn a
 * removal that already happened into a sweep reporting nothing. A call with
 * nothing to add writes nothing, so a clean browser stays read-only.
 *
 * `webhookBytes` says how much of `bytes` came from the CRM send-history sweep, and
 * only that part is kept apart: the note promises different things about a copy no
 * build reads and about the rep's own send record, so it has to know which of the
 * two the space came from.
 */
export function recordStorageReclaim(bytes: number, webhookBytes = 0): void {
  if (typeof window === "undefined") return;
  const added = Math.max(0, Math.round(bytes));
  if (added <= 0) return;
  const fromHistory = Math.min(added, Math.max(0, Math.round(webhookBytes)));

  try {
    const pending = readStoredReclaim();
    const total = (pending?.bytes ?? 0) + added;
    const webhook = (pending?.webhookBytes ?? 0) + fromHistory;
    const report: { bytes: number; webhookBytes?: number } = { bytes: total };
    // Absent rather than zero, for the same reason the report showed only a size
    // before this sweep contributed: a field the note never prints is not stored.
    if (webhook > 0) report.webhookBytes = webhook;
    window.localStorage.setItem(RETIRED_STORAGE_RECLAIM_KEY, JSON.stringify(report));
  } catch {
    /* The removal happened; only the note about it is lost. */
  }
}

/**
 * Take back the space a retired store is holding, and report what it removed.
 *
 * Only keys that are actually there are touched, so a browser that never held one
 * pays one read per load and nothing else — the same bargain the CRM send-history
 * sweep makes. Reading and removing are guarded separately per key: a store the
 * browser refuses throws on both, and a sweep that let that escape would take the
 * whole app's boot with it, while one that reported a key it could not see would
 * claim to have reclaimed space it left behind.
 *
 * The size goes to the shared reclaim report for the next load — through
 * `recordStorageReclaim`, so it adds to whatever the CRM sweep gave back rather
 * than replacing it — and only when something was actually removed: a clean browser
 * is read and not written, so the sweep stays as cheap as it was.
 */
export function sweepRetiredStorage(): { removed: string[]; reclaimedBytes: number } {
  const removed: string[] = [];
  let reclaimedBytes = 0;
  if (typeof window === "undefined") return { removed, reclaimedBytes };
  for (const key of RETIRED_STORAGE_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) continue;
      window.localStorage.removeItem(key);
      removed.push(key);
      reclaimedBytes += entryBytes(key, value);
    } catch {
      /* A store this browser refuses stays as it is; the next load asks again. */
    }
  }
  if (reclaimedBytes > 0) recordStorageReclaim(reclaimedBytes);
  return { removed, reclaimedBytes };
}

/**
 * What this load was handed: the sweep report a previous load left.
 *
 * Held in the module rather than read off storage again, and that is the point of
 * the function. `main.tsx` calls this before its own sweep runs, so the value it
 * holds belongs to an earlier load: the sweep's write lands in storage after the
 * take, where only the *next* load will find it. A surface that read storage
 * instead would print the reclamation it is still in the middle of.
 */
let carriedReclaim: StorageReclaim | null = null;

/**
 * Lift the previous load's report out of storage, once per load.
 *
 * Removing it here is what makes the note once: the key is gone before any screen
 * mounts, so a reload cannot print the same reclamation again, and a rep who
 * dismisses it is dismissing the only copy. A store the browser refuses leaves the
 * value unread rather than taking boot down with it.
 */
export function takeRetiredStorageReclaim(): StorageReclaim | null {
  if (typeof window === "undefined") return null;
  const stored = readStoredReclaim();
  if (!stored) return null;
  try {
    window.localStorage.removeItem(RETIRED_STORAGE_RECLAIM_KEY);
  } catch {
    /* Unreachable in practice: reading it succeeded a line above. */
  }
  carriedReclaim = stored;
  return stored;
}

/** The size this load was handed, for the surface that prints it. */
export function carriedRetiredStorageReclaim(): StorageReclaim | null {
  return carriedReclaim;
}

/**
 * The surface that printed it has been read, so a remount in this load stays quiet.
 *
 * The report is already out of storage by the time it is on screen, so this is the
 * last copy: a surface that remounted — or a rep who dismissed the strip and then
 * navigated somewhere that mounts a second one — would otherwise reprint a
 * reclamation they have already read.
 */
export function clearCarriedRetiredStorageReclaim(): void {
  carriedReclaim = null;
}

/**
 * A size a rep can read, in the units a browser's own storage screen uses.
 *
 * Whole bytes under a kilobyte, whole kilobytes under a megabyte and one decimal
 * above it: a wall summary lands in the kilobytes and a browser holding several
 * old copies lands in the megabytes, and neither reads as `1423360`.
 */
export function formatStorageBytes(bytes: number): string {
  const size = Math.max(0, Math.round(bytes));
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * What a rep is told about the space a load took back.
 *
 * One sentence, because the note is a strip at the top of the page rather than a
 * screen: the size is the part they can check, and the reassurance is the part that
 * stops "Wingman cleared storage" reading as data going missing. The copies are
 * named as an older build's rather than by key, since a key is a code name and the
 * list of them is exactly what the sweep exists to forget.
 *
 * Which sentence depends on where the space came from, because the two sources
 * cannot be promised the same thing. A retired key is a copy nothing reads, so
 * nothing was lost; the CRM send history is the rep's own record, and its cleanup
 * gives up delivered bodies and the oldest sends over its size, which the CRM panel
 * already names. So a report carrying only the history says where the space came
 * from and points at that panel, and one carrying both says each part apart — the
 * rep comparing a number they watched grow deserves to know which store gave it
 * back rather than a claim about a copy that was never the only thing involved.
 */
export function reclaimedStorageNote(bytes: number, webhookBytes = 0): string {
  const size = Math.max(0, Math.round(bytes));
  const fromHistory = Math.min(Math.max(0, Math.round(webhookBytes)), size);
  if (fromHistory <= 0) {
    return `Wingman took back ${formatStorageBytes(size)} of browser storage an older build left behind. Nothing was lost: this build never reads it.`;
  }
  const fromRetired = size - fromHistory;
  if (fromRetired <= 0) {
    return `Wingman took back ${formatStorageBytes(size)} of browser storage from its CRM send history: the copies of sends the CRM had already received, and the oldest sends once the history passed its size. The CRM panel names any sends that went.`;
  }
  return `Wingman took back ${formatStorageBytes(size)} of browser storage on the last load: ${formatStorageBytes(fromRetired)} in copies an older build left behind, and ${formatStorageBytes(fromHistory)} from the CRM send history — the copies of sends the CRM had already received and the oldest sends once the history passed its size. Nothing a project holds went with it, and the CRM panel names any sends that did.`;
}
