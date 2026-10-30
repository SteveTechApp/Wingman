import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  bindingShapes,
  collectChunkModuleScopeReads,
  findInitOrderHazards,
  sourceMapLookup,
  toChunkFacts,
} from "./lib/init-order.mjs";

/**
 * Init-order gate: a module-scope read of an imported binding that a page load
 * can evaluate before the chunk it takes from.
 *
 * The failure this exists for: `proposalDocxExport.ts` read the schematic palette
 * into two tables at module scope, the palette's chunk sits in a cycle, and the
 * bundler was free to run the reader first — so every load of
 * `/wingman/templates/<id>` died on `Cannot read properties of undefined (reading
 * 'aqua')` behind the error boundary, in a built app only. Four more of the same
 * class failed quietly, which is why they had sat there.
 *
 * Why this asks the bundler rather than the sources: which chunks exist, which
 * modules they hold and in what order they evaluate is the bundler's answer, and
 * an analysis written from the sources would be a second model of it that goes
 * stale the moment a chunk group moves. So the gate builds the app in memory with
 * the project's own config — the chunking is the thing under test, so it has to be
 * the chunking that ships — and reads the emitted code. The build writes nothing:
 * the artifact under this gate is the graph, not dist/.
 *
 * The precondition this rests on is `includeDependenciesRecursively: false` in
 * vite.config.ts: with the dependency walk on, one group's chunk takes another's
 * whole closure and the cycles this checks for mostly cannot form. The failure
 * message says so, because a reordering that stops reporting anything is the one
 * way this gate can go quietly green.
 *
 * The build is asked for source maps, which is not part of what ships: they change
 * neither the chunking nor the evaluation order, and without them a failure names
 * a position in a minified chunk instead of the file a person opens.
 *
 * Usage:
 *   node tools/check-init-order.mjs
 *   node tools/check-init-order.mjs --json
 */

export const ROUTE_MANIFEST = "src/wingman2/app/route-manifest.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

/** The chunks the app has already evaluated by the time any route chunk arrives. */
function eagerClosure(chunks, entryFile) {
  const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const evaluated = [];
  const seen = new Set();
  const walk = (fileName) => {
    if (seen.has(fileName)) return;
    seen.add(fileName);
    const chunk = byFileName.get(fileName);
    if (!chunk) return;
    for (const dependency of chunk.imports) walk(dependency);
    evaluated.push(fileName);
  };
  walk(entryFile);
  return evaluated;
}

/** What a chunk is for, in the wording the route manifest uses. */
function routeLabels(root) {
  const routes = JSON.parse(readFileSync(path.join(root, ROUTE_MANIFEST), "utf8"));
  const byPage = new Map();
  for (const route of routes) {
    if (!byPage.has(route.pageFile)) byPage.set(route.pageFile, []);
    byPage.get(route.pageFile).push(`${route.path} (${route.label})`);
  }
  return byPage;
}

function labelFor(chunk, root, byPage) {
  const facade = chunk.facadeModuleId;
  if (!facade) return chunk.fileName;
  const routes = byPage.get(path.basename(facade)) ?? [];
  if (!routes.length) return path.relative(root, facade).split(path.sep).join("/");
  // A shared page module serves several addresses; name the first and say how many
  // more read it, because the cycle is entered by that chunk either way.
  return routes.length === 1 ? routes[0] : `${routes[0]} +${routes.length - 1} more`;
}

/** The in-memory bundle: the chunk graph is the thing under test. */
async function buildBundle(root) {
  const { build } = await import("vite");
  const result = await build({
    root,
    configFile: path.join(root, "vite.config.ts"),
    logLevel: "error",
    build: { write: false, manifest: false, sourcemap: true },
  });
  const outputs = (Array.isArray(result) ? result.flatMap((entry) => entry.output) : result.output) ?? [];
  return {
    chunks: toChunkFacts(outputs),
    html: outputs.find((output) => output.type === "asset" && output.fileName === "index.html"),
  };
}

/** The module the entry document loads, which is where the app's own boot starts. */
function entryModuleOf(html) {
  const match = String(html?.source ?? "").match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
  if (!match) return null;
  return match[1].replace(/^\/+/, "");
}

/**
 * The file a finding is about, as a path from the project root.
 *
 * A source map names the file the bundler read, relative to the chunk's own
 * directory, so it is resolved there before being reported. A read the maps cannot
 * place is still reported, by its position in the chunk.
 */
function originalPosition(root, chunkFileName, read, lookup, sources) {
  const mapped = lookup(read.line, read.column);
  if (!mapped) return null;
  // The map writes its sources relative to the chunk's own folder, which walks
  // back out of it before entering the project (`../../src/...`), so the leading
  // steps are dropped: a read comes from a file the bundler read out of the tree
  // being scanned, and that is what makes the path rooted again.
  const resolved = path.posix
    .normalize(path.posix.join(path.posix.dirname(chunkFileName), mapped.source))
    .replace(/^(\.\.\/)+/, "");
  const absolute = path.resolve(root, resolved);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return null;
  const relative = path.relative(root, absolute).split(path.sep).join("/");

  // The name the read goes by where a person reads it, which the minifier has
  // replaced in the bundle. The position is the identifier's own, so the source
  // file says what it was called.
  let name = null;
  if (!sources.has(relative)) {
    try {
      sources.set(relative, readFileSync(absolute, "utf8").split(/\r?\n/));
    } catch {
      sources.set(relative, null);
    }
  }
  const line = sources.get(relative)?.[mapped.line - 1] ?? "";
  const rest = line.slice(Math.max(0, mapped.column - 1));
  name = /^[A-Za-z_$][\w$]*/.exec(rest)?.[0] ?? null;

  return { file: relative, line: mapped.line, column: mapped.column, name };
}

export async function auditInitOrder({ root = projectRoot } = {}) {
  const { chunks, html } = await buildBundle(root);
  if (!chunks.length) {
    throw new Error("The in-memory build produced no chunks. The scan is broken, not the app.");
  }

  const entryFile = entryModuleOf(html);
  if (!entryFile) {
    throw new Error("The entry document has no module script: the chunk graph has no entry to start from.");
  }

  const eager = eagerClosure(chunks, entryFile);
  const byPage = routeLabels(root);
  const entries = [
    { fileName: entryFile, label: "the app's own boot", isBoot: true },
    ...chunks
      .filter((chunk) => chunk.isDynamicEntry && chunk.fileName !== entryFile)
      .map((chunk) => ({ fileName: chunk.fileName, label: labelFor(chunk, root, byPage) })),
  ];

  const collected = collectChunkModuleScopeReads({ chunks });
  const shapeOf = bindingShapes({ chunks });
  const reads = collected.reads.map((read) => ({ ...read, ...shapeOf(read) }));
  const { findings, stats } = findInitOrderHazards({ chunks, eager, entries, reads });

  const lookups = new Map(
    chunks
      .filter((chunk) => chunk.map)
      .map((chunk) => [chunk.fileName, sourceMapLookup(chunk.map)]),
  );
  const sources = new Map();
  const placed = findings.map((finding) => ({
    ...finding,
    original: originalPosition(root, finding.chunk, finding, lookups.get(finding.chunk) ?? (() => null), sources),
  }));

  return { findings: placed, stats: { ...stats, ...collected.stats }, reads, eager, entryFile, entries };
}

export async function runInitOrderGate({ root = projectRoot, log = console.log, error = console.error } = {}) {
  let audit;
  try {
    audit = await auditInitOrder({ root });
  } catch (caught) {
    error(`[init-order] ${caught instanceof Error ? caught.message : String(caught)}`);
    return 1;
  }

  const { findings, stats } = audit;

  if (process.argv.includes("--json")) {
    log(JSON.stringify({ findings, stats }, null, 2));
    return findings.length ? 1 : 0;
  }

  if (findings.length) {
    error(
      `[init-order] FAILED. ${findings.length} module-scope ${findings.length === 1 ? "read" : "reads"} of a binding ` +
        `that is still uninitialized when the read runs:`,
    );
    for (const finding of findings) {
      const where = finding.original
        ? `${finding.original.file}:${finding.original.line}:${finding.original.column}`
        : `${finding.chunk}:${finding.line}:${finding.column}`;
      const binding = finding.original?.name ?? finding.localName;
      error(`- ${where} reads \`${binding}\` from ${finding.importedFrom} (in the bundle: ${finding.snippet})`);
      error(
        `  ${describeKind(finding.kind)}; reached by ${finding.entries.slice(0, 3).join(", ")}` +
          `${finding.entries.length > 3 ? ` and ${finding.entries.length - 3} more entry loads` : ""}`,
      );
    }
    error(
      "[init-order] Read the binding where it is used — inside the function or renderer that consumes it — " +
        "rather than into a module-scope table, or move the reader out of the chunk cycle.",
    );
    return 1;
  }

  log(
    `[init-order] OK. ${stats.reads} module-scope reads of an import across ${stats.chunks} chunks, ` +
      `${stats.hoisted} of them taking a function the ESM instantiation step initializes, ${stats.considered} left ` +
      `to check over ${stats.entries} entry loads; none can run before the chunk it takes from.`,
  );
  if (stats.unreachableChunks.length) {
    log(
      `[init-order] ${stats.unreachableChunks.length} chunks are reachable from no entry ` +
        `(${stats.unreachableChunks.slice(0, 3).join(", ")}${stats.unreachableChunks.length > 3 ? ", …" : ""}); ` +
        `their reads are asked about by no entry load.`,
    );
  }
  return 0;
}

function describeKind(kind) {
  if (kind === "function" || kind === "namespace") return `the exporting chunk is still being evaluated`;
  if (kind === "const" || kind === "let" || kind === "class") {
    return `the exporting chunk has not run yet, so this binding is in the temporal dead zone`;
  }
  if (kind === "var") {
    return `the exporting chunk has not run yet, so this binding is \`undefined\` (the bundler writes it as a \`var\`)`;
  }
  return `the bundler writes this binding as a \`var\`, \`let\`, \`const\` or \`class\` and this scan could not find which, so it is treated as uninitialized`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runInitOrderGate());
}
