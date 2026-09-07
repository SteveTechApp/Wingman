import type { StoredProject } from "./projectStore";

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function buildHydrationSinceManifest(projects: readonly StoredProject[]): Record<string, number> {
  return Object.fromEntries(projects.map((project) => [
    project.id,
    project.syncConflict ? 0 : Math.max(0, Number(project.syncRevision) || 0),
  ]));
}

const SUB_DOCUMENT_TIMESTAMP_KEYS = [
  ["discoveryBrief", "savedAt"],
  ["ingest", "updatedAt"],
  ["recommendationEvidence", "updatedAt"],
  ["proposal", "updatedAt"],
  ["workflow", "updatedAt"],
  ["videowall", "savedAt"],
] as const;

/** The append-mostly by-id union lanes the server merge also unions on sync. */
const HYDRATION_UNION_LANES = ["attachments", "comments", "shares", "auditTrail"] as const;

function hydrationTimestampOf(value: unknown, timestampKey: string): number {
  const record = objectRecord(value);
  const raw = record?.[timestampKey];
  return typeof raw === "string" ? Date.parse(raw) : Number.NaN;
}

/**
 * Client-side twin of the server's per-sub-document LWW decision
 * (pickMergeVersion). Later embedded edit timestamp wins; on equal/absent
 * timestamps the copy based on the fresher server revision wins; a full tie
 * keeps the LOCAL copy. The server can go one step further on a full tie
 * (smaller author id wins) because it keeps per-sub-document author metadata
 * (_merge) private from clients — the client's tie fallback is the §1.2a
 * guard that an equal-aged thin backend row never displaces richer local
 * content, and any genuine same-millisecond race reaching that tie is decided
 * deterministically by the server on the next sync.
 */
function pickHydrationVersion(
  localValue: unknown,
  backendValue: unknown,
  timestampKey: string,
  localBasis: number,
  backendBasis: number,
): { value: unknown; conflict: boolean } {
  if (backendValue === undefined) return { value: localValue, conflict: false };
  if (localValue === undefined) return { value: backendValue, conflict: false };

  const localTime = hydrationTimestampOf(localValue, timestampKey);
  const backendTime = hydrationTimestampOf(backendValue, timestampKey);
  const localValid = Number.isFinite(localTime);
  const backendValid = Number.isFinite(backendTime);

  if (localValid && backendValid && localTime !== backendTime) {
    return localTime > backendTime
      ? { value: localValue, conflict: true }
      : { value: backendValue, conflict: false };
  }
  if (localValid !== backendValid) {
    // Only one side carries a real embedded edit-time signal; trust it over
    // the coarse whole-project revision the client has to approximate basis
    // with, so a legacy local copy missing its stamp cannot displace an
    // accepted backend write (or vice versa).
    return localValid ? { value: localValue, conflict: false } : { value: backendValue, conflict: false };
  }
  if (backendBasis !== localBasis) {
    return backendBasis > localBasis
      ? { value: backendValue, conflict: false }
      : { value: localValue, conflict: true };
  }
  return { value: localValue, conflict: false };
}

/**
 * By-id union for the append-mostly lanes (attachments, comments, shares,
 * auditTrail), mirroring the server's mergeById on every accepted sync:
 * backend rows win an identical id (they are the accepted server copies),
 * local-only ids survive, and id-less local legacy entries are kept so the
 * union is never lossy on the client side.
 */
function unionHydrationLane(localValue: unknown, backendValue: unknown): unknown[] {
  const localItems = Array.isArray(localValue) ? localValue : [];
  const backendItems = Array.isArray(backendValue) ? backendValue : [];
  const result: unknown[] = [];
  const byId = new Map<string, unknown>();
  for (const item of localItems) {
    const record = objectRecord(item);
    const id = typeof record?.id === "string" ? record.id : "";
    if (!id) {
      result.push(item);
      continue;
    }
    byId.set(id, item);
    result.push(item);
  }
  for (const item of backendItems) {
    const record = objectRecord(item);
    const id = typeof record?.id === "string" ? record.id : "";
    if (!id) continue;
    if (byId.has(id)) {
      const previous = byId.get(id);
      const index = previous === undefined ? -1 : result.indexOf(previous);
      if (index >= 0) result[index] = item;
    } else {
      result.push(item);
    }
    byId.set(id, item);
  }
  return result;
}

/**
 * Id-keyed project collections merged per item with by-id last-writer-wins
 * (ADR-0001 §1.2i), mirroring the per-sub-document merge one level down: two
 * sessions adding their OWN items (or editing DIFFERENT items) of one
 * collection must both survive a sync instead of the whole array travelling
 * with the whole-project LWW winner (which dropped the other session's items
 * wholesale). Each entry names the item's identity key and the embedded
 * write-time key the client stamps on save. productSelections are keyed by
 * sku (their identity) rather than id. Kept identical to the server-side
 * mirror in server/wingman-app-store.mjs (cross-side parity coverage:
 * server/project-store-id-keyed-collections.parity.test.mjs).
 */
export const ID_KEYED_COLLECTION_MERGE_KEYS: Record<string, { idKey: string; timeKey: string }> = {
  compareRuns: { idKey: "id", timeKey: "createdAt" },
  proposalVersions: { idKey: "id", timeKey: "savedAt" },
  requirements: { idKey: "id", timeKey: "updatedAt" },
  productSelections: { idKey: "sku", timeKey: "addedAt" },
  visualAssets: { idKey: "id", timeKey: "updatedAt" },
};

/** JSON deep clone, matching the server's cloneJson (both sides must derive
 *  the same tie-break serialization). */
function deepCloneJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value ?? {})) as unknown;
  } catch {
    return value;
  }
}

function embeddedWriteTimeOf(value: unknown, timeKey: string): number {
  // Mirrors the server's Date.parse(storedItem?.[timeKey] ?? "") coercion
  // exactly (Date.parse ToStrings its argument), so both sides agree on which
  // items carry a real embedded write time.
  const record = objectRecord(value);
  const raw = record?.[timeKey];
  if (raw === undefined || raw === null) return Number.NaN;
  return Date.parse(String(raw));
}

/**
 * Deterministic per-item LWW between the STORED and the EDITOR copy of one
 * collection item (pure client twin of the server's
 * pickCollectionItemVersion, both sides identical):
 *
 *   1. the item with the later embedded write time wins;
 *   2. when only one side carries a real time, that side wins (a timed save
 *      is a real save; a legacy untimed copy cannot displace it);
 *   3. equal/absent times fall back to a total content order (lexicographic
 *      JSON) so the outcome never depends on which sync arrived first or on
 *      per-item author bookkeeping the client cannot carry. An identical
 *      re-sync (equal serialization) keeps the stored copy - a no-op.
 */
export function pickCollectionItemVersion(
  storedItem: unknown,
  editorItem: unknown,
  timeKey: string,
): { value: unknown; editorWon: boolean } {
  if (editorItem === undefined) return { value: storedItem, editorWon: false };
  if (storedItem === undefined) return { value: editorItem, editorWon: false };

  const storedTime = embeddedWriteTimeOf(storedItem, timeKey);
  const editorTime = embeddedWriteTimeOf(editorItem, timeKey);
  const storedValid = Number.isFinite(storedTime);
  const editorValid = Number.isFinite(editorTime);

  if (storedValid && editorValid && editorTime !== storedTime) {
    return editorTime > storedTime
      ? { value: editorItem, editorWon: true }
      : { value: storedItem, editorWon: false };
  }
  if (storedValid !== editorValid) {
    return editorValid ? { value: editorItem, editorWon: true } : { value: storedItem, editorWon: false };
  }

  const storedJson = JSON.stringify(storedItem);
  const editorJson = JSON.stringify(editorItem);
  if (editorJson === storedJson) return { value: storedItem, editorWon: false };
  return editorJson < storedJson
    ? { value: editorItem, editorWon: true }
    : { value: storedItem, editorWon: false };
}

/**
 * Merges one id-keyed collection between the STORED set and the EDITOR's set
 * (pure client twin of the server's mergeIdKeyedCollectionItems, both sides
 * identical):
 *
 *   - items in both sets resolve per item (pickCollectionItemVersion);
 *   - items only the EDITOR has are added (a new item or an offline addition
 *     must survive a sync - the same non-lossy rule as the append-mostly
 *     by-id lanes);
 *   - items only the STORED set has are dropped ONLY when the editor is at
 *     least as fresh as the stored document (editorIsFresh): a fresh editor's
 *     omission is a deliberate removal, while a stale editor (whose base
 *     predates the stored copy) may simply never have seen the item, so it is
 *     kept. Without this guard a by-id union would resurrect every removal
 *     the whole-array LWW used to honour.
 *
 * `onPick` observes each stored-key resolution for conflict accounting on the
 * hydration side; it never changes the merged output, so the two sides keep
 * producing identical results.
 */
export function mergeIdKeyedCollectionItems(
  storedItems: unknown,
  editorItems: unknown,
  options: {
    idKey: string;
    timeKey: string;
    editorIsFresh: boolean;
    onPick?: (key: string, pick: { value: unknown; editorWon: boolean }) => void;
  },
): unknown[] {
  const { idKey, timeKey, editorIsFresh, onPick } = options;
  const storedArray = Array.isArray(storedItems) ? storedItems : [];
  const editorArray = Array.isArray(editorItems) ? editorItems : [];

  const storedMap = new Map<string, unknown>();
  const storedOrder: string[] = [];
  for (const item of storedArray) {
    const record = objectRecord(item);
    const key = record?.[idKey];
    if (key === undefined || key === null || String(key) === "") continue;
    const normalizedKey = String(key);
    if (!storedMap.has(normalizedKey)) storedOrder.push(normalizedKey);
    storedMap.set(normalizedKey, deepCloneJson(item));
  }

  const editorKeys = new Set<string>();
  for (const item of editorArray) {
    const record = objectRecord(item);
    const key = record?.[idKey];
    if (key === undefined || key === null || String(key) === "") continue;
    editorKeys.add(String(key));
  }

  const result: unknown[] = [];
  const resultKeys = new Set<string>();
  for (const key of storedOrder) {
    if (!editorKeys.has(key) && editorIsFresh) continue; // fresh editor removed it
    const editorItem = editorArray.find((item) => String(objectRecord(item)?.[idKey]) === key);
    const picked = pickCollectionItemVersion(storedMap.get(key), editorItem, timeKey);
    onPick?.(key, picked);
    result.push(picked.value);
    resultKeys.add(key);
  }
  for (const item of editorArray) {
    const record = objectRecord(item);
    const key = record?.[idKey];
    if (key === undefined || key === null || String(key) === "") continue;
    const normalizedKey = String(key);
    if (resultKeys.has(normalizedKey)) continue;
    result.push(deepCloneJson(item));
    resultKeys.add(normalizedKey);
  }
  return result;
}

/**
 * Merges one LOCAL project with the BACKEND copy of the same project during
 * reload hydration using the SAME per-sub-document policy as the server merge
 * (ADR-0001 §1.2f): project-level fields resolve by (updatedAt, revision
 * basis) with the winner's fields overriding and the loser's gap-filling; the
 * six timestamped sub-documents resolve per embedded timestamp, so a brief
 * edited offline and a proposal edited by another session BOTH survive a
 * reload; the append-mostly lanes union by id. `conflict` is true when a
 * local value was preserved over a genuinely different backend value (the
 * whole-project equivalent of the old "local project was newer" flag).
 */
export function mergeProjectVersionsForHydration(local: StoredProject, backend: StoredProject): {
  project: StoredProject;
  conflict: boolean;
} {
  const localBasis = Math.max(0, Number(local.syncRevision) || 0);
  const backendBasis = Math.max(0, Number(backend.syncRevision) || 0);

  const fieldsPick = pickHydrationVersion(local, backend, "updatedAt", localBasis, backendBasis);
  const localRecord = local as unknown as Record<string, unknown>;
  const backendRecord = backend as unknown as Record<string, unknown>;
  const combined: Record<string, unknown> = {
    ...(fieldsPick.value === backend ? localRecord : backendRecord),
    ...(fieldsPick.value as unknown as Record<string, unknown>),
  };
  // baseRevision/_merge are protocol fields; the server never returns them and
  // the local store must never adopt them from a stale payload.
  delete combined.baseRevision;
  delete combined._merge;
  let conflict = fieldsPick.conflict;

  for (const [subDocumentKey, timestampKey] of SUB_DOCUMENT_TIMESTAMP_KEYS) {
    const pick = pickHydrationVersion(
      localRecord[subDocumentKey],
      backendRecord[subDocumentKey],
      timestampKey,
      localBasis,
      backendBasis,
    );
    if (pick.value === undefined) delete combined[subDocumentKey];
    else combined[subDocumentKey] = pick.value;
    conflict = conflict || pick.conflict;
  }

  for (const lane of HYDRATION_UNION_LANES) {
    const union = unionHydrationLane(localRecord[lane], backendRecord[lane]);
    if (union.length > 0) combined[lane] = union;
    else delete combined[lane];
  }

  // The id-keyed work-product collections merge per item by embedded write
  // time with the SAME by-id LWW policy as the server's sync merge
  // (ADR-0001 §1.2i), so a compare run / proposal version / requirement /
  // product selection / visual asset edited in another session (or offline)
  // survives a reload. The BACKEND copy is the stored set and the LOCAL copy
  // is the editor: backend-only items are dropped only when the local copy is
  // at least as fresh as the backend row (the local omission is then a
  // deliberate removal, not a copy that never saw the item - the exact rule
  // the server applies when this same project syncs, where the roles of the
  // stored row and this payload are reversed). Local-only items always
  // survive, and a local item preserved over a differing backend item for the
  // same key counts as a conflict, like the sub-document lanes.
  for (const [collectionKey, { idKey, timeKey }] of Object.entries(ID_KEYED_COLLECTION_MERGE_KEYS)) {
    const mergedItems = mergeIdKeyedCollectionItems(backendRecord[collectionKey], localRecord[collectionKey], {
      idKey,
      timeKey,
      editorIsFresh: localBasis >= backendBasis,
      onPick: (_key, pick) => {
        if (pick.editorWon) conflict = true;
      },
    });
    if (mergedItems.length > 0) combined[collectionKey] = mergedItems;
    else delete combined[collectionKey];
  }

  return { project: combined as unknown as StoredProject, conflict };
}
