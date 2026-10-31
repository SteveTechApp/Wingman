import { AV_SYMBOLS } from "./av-symbols.mjs";
import { buildStencilParts, zipParts } from "./visio-stencil.mjs";

/**
 * The stencil as it ships: where it goes, what it says about itself, and the one
 * build both the writer and the freshness gate run.
 *
 * The gate that holds the committed file to a fresh build can only be right if it
 * builds what the writer builds. Restating the title, the description or the build
 * stamp beside it would leave two definitions of one file, and the failure mode is
 * silent in the worst direction: a changed description would leave the gate red
 * against a stencil that is perfectly current, which is how a gate starts being
 * ignored. So the definition lives here and `tools/build-visio-stencil.mjs` is a
 * writer around it.
 *
 * `now` is fixed rather than the clock's: fixed part timestamps plus one
 * compression level are what make two builds of the same symbols the same bytes,
 * which is the whole premise of a byte comparison.
 */

export const STENCIL_PATH = "stencils/wingman-av-symbols.vssx";

export const STENCIL_TITLE = "Wingman AV symbols";

export const STENCIL_DESCRIPTION = "Schematic symbols for AV drawings: display, matrix switcher, ceiling speaker.";

/** Fixed so two builds of the same symbols are the same bytes. */
export const STENCIL_BUILD_STAMP = new Date("2026-10-28T00:00:00Z");

/** Every part of the shipping stencil, and the archive they make up. */
export function buildAvStencil({ masters = AV_SYMBOLS, now = STENCIL_BUILD_STAMP } = {}) {
  const parts = buildStencilParts({
    // Copied per build: the builder reads the catalog but never writes to it.
    masters: masters.map((symbol) => ({ ...symbol })),
    title: STENCIL_TITLE,
    description: STENCIL_DESCRIPTION,
    now,
  });
  return { parts, archive: zipParts(parts), masters };
}

/** The command that produces `STENCIL_PATH`, quoted by anything that reports it stale. */
export const STENCIL_BUILD_COMMAND = "node tools/build-visio-stencil.mjs";
