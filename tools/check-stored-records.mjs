import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";
import {
  collectAccessNames,
  collectFormKeyNames,
  collectReachableFields,
  collectReadSymbols,
  compareStoredRecordFields,
  createProjectProgram,
  discoverStoredRecordTypes,
  fieldKey,
  relativePath,
  sourceCorpus,
  unreadFields,
} from "./lib/stored-record-fields.mjs";

/**
 * Stored-record field gate.
 *
 * A persisted record carries only fields a surface reads. The codecs are
 * allow-lists, so a field nothing reads is still written, still synced and
 * still carried through every future schema change — for no one. Removing one
 * needs no migration (an older document's value is simply not read back), which
 * is exactly why they accumulate quietly until someone sweeps them by hand.
 *
 * Nothing is registered here. Every `setItem(key, JSON.stringify(value))` in
 * shipped source makes `value`'s type a root, every type reachable from a root
 * is policed, and a declared field that neither the compiler nor an
 * access-position name reaches is reported. A new store is therefore covered
 * the moment it is written, and a field added deep inside `StoredProject`'s
 * proposal is covered without anyone remembering the check exists. A store kept
 * as a table (`Record<string, Draft>`) is a root by its values, a map of
 * `unknown` is policed as the shape the codec reading it decodes into, and a key
 * a form binds into `value[key]` counts as the read it is — see the collectors in
 * `lib/stored-record-fields.mjs`.
 *
 * A failure names the store each record was reached through — its storage key and
 * the write that put it there, and every one of them when a shared record is
 * reachable through several — because the same output otherwise leaves a field's
 * home ambiguous: a draft in a table written straight to storage and a draft inside
 * a larger record look identical once their fields are collected, and only the
 * store says which one to open. It names the path as well, hop by hop
 * (`StoredProject.proposal → map value → decoded by … → array element → Draft.savedAt`),
 * because the store says where a record lives and nothing about where the field
 * sits inside it: a write-only field three maps and a codec deep reads exactly like
 * one declared on the project. The store is not part of the baseline: it is an
 * allowance for a *field*, and a write moving to another file would then read as
 * new debt.
 *
 * The baseline holds the instances that predate the gate, so it fails on
 * additions only, and the file ratchets down: an accepted field that gains a
 * reader is stale and must be dropped.
 *
 * Usage:
 *   node tools/check-stored-records.mjs                     # verify
 *   node tools/check-stored-records.mjs --update-baseline    # after clearing debt
 */

export const STORED_RECORD_BASELINE = "tools/wingman-stored-records-baseline.json";

/**
 * How a failure names the stores a field was reached through.
 *
 * One store is named whole on the bullet's own line, because that is the answer.
 * A shared record is reachable through several — a project topology through
 * eight — and there the set is the answer, not a sample of it: the first store
 * plus "and 7 more" said how many places to open without saying which, and a
 * reader whose field turns up in the fourth one had to find it themselves. Every
 * store is named, one per line under a count, because eight of them at ~60
 * characters apiece is a wall on a single line and a wall is what a reader
 * skips — the same reason the path prints hop by hop instead of as a sentence.
 */
export function reachedThrough(stores, { ownLine = false } = {}) {
  if (!stores?.length) return "";
  // A field with a path already prints two indented lines under the bullet, so the
  // store joins them rather than trailing a chain that is itself long.
  if (stores.length === 1) {
    return ownLine ? `\n    reached through ${stores[0]}` : ` — reached through ${stores[0]}`;
  }
  const each = stores.map((store) => `\n      ${store}`).join("");
  return `\n    reached through ${stores.length} stores:${each}`;
}

/**
 * How the field was reached inside the record, as the hops a person can follow.
 *
 * The stores above answer "where is this persisted"; this answers "how is it
 * stored", which is the half a reader needs to decide what removing the field
 * touches: a field three maps and a codec deep reads exactly like one declared on
 * the project until the path says otherwise. The middle is elided rather than
 * truncated, so a long path still ends at the field it is about.
 */
export function reachedBy(path) {
  if (!path?.length) return "";
  const hops = path.length > 8 ? [...path.slice(0, 4), "…", ...path.slice(-3)] : path;
  return `\n    reached by ${hops.join(" → ")}`;
}

export function auditStoredRecords({ root = process.cwd() } = {}) {
  const context = createProjectProgram(root);

  const roots = discoverStoredRecordTypes(context);
  if (!roots.length) {
    throw new Error("No storage writes found. The persistence scan is broken, not the records.");
  }

  const fields = collectReachableFields({ ...context, roots });
  const reads = collectReadSymbols(context);
  // A keyed form (`value[key]`) resolves to no property symbol and names no
  // field in an access position, so the keys it is handed are their own source
  // of names — otherwise every field of a record edited through one reads dead.
  const accessNames = new Set([
    ...collectAccessNames(sourceCorpus(context), { exclude: new Set() }),
    ...collectFormKeyNames(context),
  ]);
  const unread = unreadFields({ fields, reads, accessNames });

  return { root, roots, fields, unread };
}

export function runStoredRecordGate({ root = process.cwd(), updateBaseline = false, log = console.log, error = console.error } = {}) {
  let audit;
  try {
    audit = auditStoredRecords({ root });
  } catch (caught) {
    error(`[stored-records] ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }

  const baselinePath = path.join(root, STORED_RECORD_BASELINE);

  if (updateBaseline) {
    atomicWriteJsonSync(baselinePath, {
      updatedAt: new Date().toISOString(),
      rule: "Fields of a persisted record that nothing in the app reads, recorded so the gate fails on new ones only. Regenerate with `node tools/check-stored-records.mjs --update-baseline` after giving a field a reader or removing it; the gate fails an entry that has gained one.",
      unreadFields: audit.unread.map(({ file, type, field }) => ({ file, type, field })),
    });
    log(
      `[stored-records] Baseline updated: ${relativePath(root, baselinePath)} (${audit.unread.length} unread field${audit.unread.length === 1 ? "" : "s"})`,
    );
    return 0;
  }

  if (!fs.existsSync(baselinePath)) {
    error(`[stored-records] Missing baseline: ${STORED_RECORD_BASELINE}`);
    error("[stored-records] Run: node tools/check-stored-records.mjs --update-baseline");
    return 1;
  }

  let baselineFile;
  try {
    baselineFile = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (caught) {
    error(`[stored-records] Baseline is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }
  if (!Array.isArray(baselineFile.unreadFields)) {
    error(`[stored-records] ${STORED_RECORD_BASELINE} has no unreadFields array.`);
    return 1;
  }

  const { added, stale } = compareStoredRecordFields({ unread: audit.unread, baseline: baselineFile.unreadFields });
  let failed = false;

  if (added.length) {
    failed = true;
    error("[stored-records] FAILED. Persisted fields nothing in the app reads:");
    for (const entry of added) {
      const path = reachedBy(entry.path);
      error(`- ${entry.file}:${entry.line} ${entry.type}.${entry.field}${path}${reachedThrough(entry.stores, { ownLine: path !== "" })}`);
    }
    error("[stored-records] Give the field a reader, or remove it — the codecs are allow-lists, so no migration is needed.");
  }

  if (stale.length) {
    failed = true;
    error("[stored-records] FAILED. Baseline entries that are no longer unread:");
    for (const entry of stale) error(`- ${entry.file} ${entry.type}.${entry.field}`);
    error("[stored-records] Drop the stale allowance: node tools/check-stored-records.mjs --update-baseline");
  }

  if (failed) return 1;

  const unreadKeys = new Set(audit.unread.map(fieldKey));
  const recordFiles = new Set(audit.fields.map((field) => field.file)).size;
  log(
    `[stored-records] OK. ${audit.fields.length} fields across ${recordFiles} files, ${audit.roots.length} storage writes; ${unreadKeys.size} known unread, no additions.`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runStoredRecordGate({ updateBaseline: process.argv.includes("--update-baseline") }));
}
