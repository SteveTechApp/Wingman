import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AV_SYMBOLS } from "./lib/av-symbols.mjs";
import { assertStencilPackage, buildStencilParts, zipParts } from "./lib/visio-stencil.mjs";

/**
 * Build the Visio stencil an AV designer can open beside their own drawing.
 *
 *   node tools/build-visio-stencil.mjs
 *
 * Writes `stencils/wingman-av-symbols.vssx` — a real `.vssx`, not a zip renamed:
 * its document part is typed as a stencil's, so Visio opens it as a stencil rather
 * than as a drawing, and each symbol arrives as a master with its own glue points
 * and Shape Data fields.
 *
 * The file is checked before it is written, and the check is the only one possible
 * here: there is no Visio on this machine, so nothing can prove the package opens.
 * What `assertStencilPackage` can prove is the class of defect Visio answers with a
 * repair prompt — a part with no content type, a relationship to a part that is not
 * there, a master the page names but the index does not, a symbol that draws
 * nothing — plus a byte-for-byte round trip through the archive. First use is
 * therefore a real test: open it, and quote any prompt back.
 *
 * The build is deterministic down to the byte — fixed part timestamps, one
 * compression level — so rebuilding an unchanged symbol set produces an identical
 * file and a diff is a real change rather than a clock.
 */

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const outputPath = path.join(projectRoot, "stencils", "wingman-av-symbols.vssx");

/** Fixed so two builds of the same symbols are the same bytes. */
const BUILD_STAMP = new Date("2026-10-28T00:00:00Z");

const parts = buildStencilParts({
  masters: AV_SYMBOLS.map((symbol) => ({ ...symbol })),
  title: "Wingman AV symbols",
  description: "Schematic symbols for AV drawings: display, matrix switcher, ceiling speaker.",
  now: BUILD_STAMP,
});
const archive = zipParts(parts);

const problems = assertStencilPackage({ archive, masters: AV_SYMBOLS });
if (problems.length) {
  console.error(`[visio-stencil] The package does not hold together, so it was not written:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
} else {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, archive);
  const relative = path.relative(projectRoot, outputPath);
  console.log(
    `[visio-stencil] ${AV_SYMBOLS.length} masters (${AV_SYMBOLS.map((symbol) => symbol.name).join(", ")}) `
      + `written to ${relative}: ${parts.length} parts, ${archive.length} bytes. `
      + "Open it in Visio and quote any repair prompt back — nothing here can open it.",
  );
}
