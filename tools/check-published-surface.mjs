import { pathToFileURL } from "node:url";
import { scanPublishedSurface } from "./lib/published-surface.mjs";

/**
 * Published-surface gate.
 *
 * Everything in the output directory is readable by anyone who asks for it: the
 * image copies `dist/` into nginx's document root and `vite preview` serves the
 * same files, so a chunk that names `tools/check-wyrestorm-technical-data.mjs` or
 * `src/wingman2/lib/governedConfirmationBacklog.ts` publishes the tree the bundle
 * was made from — which files exist, where they live, and whose checkout produced
 * the artifact. The build manifest was moved beside `dist/` for this reason, and
 * it is not the only file that can carry the same information: the note that
 * leaked here was an imported governance JSON's `note`, carried into the chunk
 * that imports it, and neither is visible in a review of the rendered page.
 *
 * So the output is asked directly. A build-written file naming a source module or
 * a build script, or an absolute path from the machine that built it, fails; the
 * files `public/` was copied into are content and are skipped by hash, because
 * they ship by being authored and are reviewed where they live. See
 * `lib/published-surface.mjs` for what the patterns are and what they are not.
 *
 * Usage:
 *   node tools/check-published-surface.mjs
 */

export function runPublishedSurfaceGate({ root = process.cwd(), outDir = "dist", log = console.log, error = console.error } = {}) {
  let scan;
  try {
    scan = scanPublishedSurface(root, { outDir });
  } catch (caught) {
    error(`[published-surface] ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }

  if (!scan) {
    error(
      `[published-surface] No build in ${outDir}/. This gate reads what the site publishes, so it needs one: ` +
        "run `npm run build`.",
    );
    return 1;
  }

  if (scan.matches.length) {
    const count = `${scan.matches.length} repository path${scan.matches.length === 1 ? "" : "s"}`;
    error(`[published-surface] FAILED. ${count} published in the build output:`);
    for (const match of scan.matches) {
      error(`- ${outDir}/${match.file}:${match.line}:${match.column}  ${match.kind}`);
      error(`  ${match.snippet}`);
    }
    error(
      "[published-surface] Everything in this directory is readable by anyone who asks for it, so a source module or a " +
        "build script named here is a map of the repository. Say the same thing without the path — a data note can name " +
        "the gate it shares its thresholds with rather than the file — or keep that text out of what the bundle imports.",
    );
    return 1;
  }

  const copies = `${scan.copies} copied from public/ (authored content)`;
  const binary = scan.binary ? `, ${scan.binary} binary` : "";
  log(
    `[published-surface] OK. ${scan.checked} build-written file${scan.checked === 1 ? "" : "s"} of ${scan.files} in ` +
      `${outDir}/ name no repository paths; ${copies}${binary} not scanned.`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runPublishedSurfaceGate());
}
