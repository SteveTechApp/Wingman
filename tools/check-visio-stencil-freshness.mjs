#!/usr/bin/env node
// Holds the committed Visio stencil to a fresh build of the symbol catalogue.
//
// `stencils/wingman-av-symbols.vssx` is tracked, and the build behind it is
// deterministic down to the byte, so the file and the catalogue can only disagree
// one way round: someone edited `tools/lib/av-symbols.mjs` — a symbol's geometry, a
// Shape Data field, an icon — without rebuilding, or rebuilt without committing.
// Both read as a stencil a designer drops onto a drawing, and the drawing is where
// the drift shows up, months later, in a job already quoted.
//
// The comparison is bytes against bytes, not a symbol-by-symbol reading, because
// the build's determinism is what the whole claim rests on: if two builds of one
// catalogue were not identical, a diff would mean nothing and this gate could not
// tell a changed symbol from a changed clock. On a mismatch the message names the
// parts that differ — which master moved — rather than a byte offset, because the
// useful question is "which symbol changed", not "where".
//
// Wire-in: `npm run check:visio-stencil` (verify:data and its strict twin).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAvStencil, STENCIL_BUILD_COMMAND, STENCIL_PATH } from "./lib/av-stencil.mjs";
import { readZip } from "./lib/visio-stencil.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");

/** How many part names a drift message lists before it says "and N more". */
const NAMED_PARTS = 8;

const list = (names) => {
  const shown = names.slice(0, NAMED_PARTS).join(", ");
  return names.length > NAMED_PARTS ? `${shown} and ${names.length - NAMED_PARTS} more` : shown;
};

/** Which parts of two packages differ. `null` when either is not a readable package. */
function partDrift(committed, fresh) {
  let committedParts;
  let freshParts;
  try {
    committedParts = readZip(committed);
    freshParts = readZip(fresh);
  } catch {
    return null;
  }
  const changed = [];
  const added = [];
  for (const [name, data] of freshParts) {
    const before = committedParts.get(name);
    if (before === undefined) added.push(name);
    else if (!before.equals(data)) changed.push(name);
  }
  const removed = [...committedParts.keys()].filter((name) => !freshParts.has(name));
  return { changed, added, removed };
}

/**
 * Pure core: the committed bytes against the bytes the catalogue builds now.
 *
 * `committed` is the file's contents, or `null` when it is not in the tree.
 * Returns the failure lines, or nothing when the file matches.
 */
export function stencilDriftErrors({
  committed,
  fresh,
  stencilPath = STENCIL_PATH,
  buildCommand = STENCIL_BUILD_COMMAND,
} = {}) {
  if (!committed) {
    return [
      `${stencilPath} is not in the tree. The stencil is a tracked artifact, so build it and commit it: ${buildCommand}`,
    ];
  }
  if (committed.equals(fresh)) return [];

  const lines = [
    `${stencilPath} no longer matches a fresh build from the symbol catalogue `
      + `(committed ${committed.length} bytes, fresh ${fresh.length} bytes)`,
  ];
  const drift = partDrift(committed, fresh);
  if (!drift) {
    lines.push("  the committed file does not read as an OPC package, so no part of it can be trusted");
  } else {
    if (drift.changed.length) lines.push(`  changed: ${list(drift.changed)}`);
    if (drift.added.length) lines.push(`  only in the fresh build: ${list(drift.added)}`);
    if (drift.removed.length) lines.push(`  only in the committed file: ${list(drift.removed)}`);
    // Named last because it is the one part a person looks for: a master part is
    // one symbol, and `masters.xml` is the index that lists them.
    const masters = [...drift.changed, ...drift.added].filter((name) => /^visio\/masters\/master\d+\.xml$/.test(name));
    if (masters.length) lines.push(`  symbols that changed: ${list(masters)}`);
  }
  lines.push(`  rebuild and commit it: ${buildCommand}`);
  return [lines.join("\n")];
}

/** Read the committed stencil, build the catalogue again, compare. */
export function checkVisioStencilFreshness(rootDir = REPO_ROOT) {
  let committed = null;
  try {
    committed = readFileSync(path.join(rootDir, STENCIL_PATH));
  } catch {
    committed = null;
  }
  return stencilDriftErrors({ committed, fresh: buildAvStencil().archive });
}

// CLI ----------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkVisioStencilFreshness();
  if (errors.length) {
    for (const error of errors) console.error(`[visio-stencil] ${error}`);
    console.error("[visio-stencil] FAIL - the committed stencil is not what the symbol catalogue builds.");
    process.exit(1);
  }
  console.log(`[visio-stencil] OK - ${STENCIL_PATH} is byte-identical to a fresh build from the symbol catalogue.`);
}
