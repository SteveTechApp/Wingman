import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAvStencil, STENCIL_PATH } from "./lib/av-stencil.mjs";
import { assertStencilPackage } from "./lib/visio-stencil.mjs";

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
 * file and a diff is a real change rather than a clock. That is what lets
 * `check:visio-stencil` hold the committed file to a fresh build of the same
 * definition in `lib/av-stencil.mjs`.
 *
 * There is deliberately no `npm` script for the build itself: `package.json` is an
 * input to the browser walk's fresh-build gate, so a script would refuse a `dist/`
 * that is still current.
 */

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const outputPath = path.join(projectRoot, STENCIL_PATH);

const { parts, archive, masters } = buildAvStencil();

const problems = assertStencilPackage({ archive, masters });
if (problems.length) {
  console.error(`[visio-stencil] The package does not hold together, so it was not written:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
} else {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, archive);
  console.log(
    `[visio-stencil] ${masters.length} masters (${masters.map((symbol) => symbol.name).join(", ")}) `
      + `written to ${STENCIL_PATH}: ${parts.length} parts, ${archive.length} bytes. `
      + `Open it in Visio and quote any repair prompt back — nothing here can open it. `
      + "The file is tracked, so commit it.",
  );
}
