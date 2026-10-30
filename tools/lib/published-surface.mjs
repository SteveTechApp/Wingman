import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * What the built site publishes, and the paths that must not be in it.
 *
 * `dist/` is copied whole into nginx's document root, so every file in it is
 * readable by anyone who asks: a repository path in a bundle chunk, a comment, a
 * data string or an absolute path from the machine that built it publishes a map
 * of the tree — which files exist, where they live, and whose checkout produced
 * this artifact. The build manifest was moved out of `dist/` for exactly this
 * reason, and it is not the only file that can carry the same information: the
 * bundler keeps a comment that names two files, and an imported data file carries
 * its note into the chunk that imports it. Neither is visible in a review of the
 * rendered page, so the surface is asked directly.
 *
 * The scan covers **what the bundler wrote**. A file `dist/` holds because
 * `public/` was copied there is authored content: it is reviewed as content, it
 * ships by being in `public/`, and a documentation file naming the module it
 * documents is that document's job rather than a build artefact's accident. The
 * two are told apart by bytes rather than by a list — a copy is a file whose hash
 * equals `public/<path>`'s — so a file that was edited after being copied, or
 * written into `dist/` by anything else, is still asked the question. That is the
 * line a future artefact cannot cross silently.
 */

/**
 * The shapes of a repository path, asked of published text.
 *
 * The first pattern is a path to **code** — a directory of this repository and a
 * source extension after it (`tools/check-wyrestorm-technical-data.mjs`,
 * `src/wingman2/lib/governedConfirmationBacklog.ts`). That is the shape a build
 * writes: a module comment the minifier kept, a stack trace, a note saying which
 * module a table is shared with. It is what leaked here, from a governance JSON's
 * `note` that ended by naming the gate and the module that read it.
 *
 * A directory followed by a *data* file is deliberately not this pattern. Shipped
 * product data cites its own provenance — `data/product-intelligence-db.json#67`,
 * `src/competitor/competitors.json#7`, `docs/…#appendix` — and that citation is the
 * rep-facing record of where a claim came from, reviewed in the data file itself.
 * A gate that failed on it would be asking the data to stop saying where it came
 * from, and 241 such citations ship today: the rule would be unenforceable rather
 * than strict. It is also what keeps `public/private sessions` in a room template
 * from reading as a directory, and `src:`/`data`/`docs` as the ordinary words they
 * are.
 *
 * The absolute shapes are the other half of what only a build can produce: a path
 * from the machine that built the bundle, which names a person and a checkout
 * rather than the project. `wingman` on its own is deliberately not a pattern — it
 * is the product's name, it names API routes (`/api/wingman/...`) and storage
 * keys, and a check that failed on its own name would fail on the app.
 */
export const REPO_PATH_PATTERNS = [
  {
    id: "source-module",
    pattern: /(?<![\w/.-])(?:src|tools|server|scripts|e2e)\/[\w@./-]+\.(?:tsx?|jsx?|mjs|cjs|css|scss)(?![\w-])/g,
  },
  {
    id: "absolute-windows",
    // A drive letter at a word boundary, so `https://` is not read as one: the
    // `p:` there follows a letter, and a URL is not a path into the repository.
    pattern: /(?<![\w])[A-Za-z]:[\\/][\w@.\\/ -]{2,}/g,
  },
  {
    id: "absolute-posix",
    pattern: /\/(?:Users|home)\/[\w@.-]+\/[\w@.-]+/g,
  },
  {
    id: "file-url",
    pattern: /file:\/\/\/[\w@./-]+/g,
  },
];

/** Every file under the output directory, as output-relative paths, sorted. */
export function listPublishedFiles(root, outDir = "dist") {
  const base = path.resolve(root, outDir);
  if (!existsSync(base)) return null;

  const files = [];
  const walk = (directory, relative) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(directory, entry.name), next);
      else if (entry.isFile()) files.push(next);
    }
  };
  walk(base, "");
  return files.sort((left, right) => left.localeCompare(right));
}

function hashOf(absolute) {
  try {
    return createHash("sha256").update(readFileSync(absolute)).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Output files that are byte-for-byte copies of `public/`.
 *
 * These are the authored half of `dist/`: the site ships them because they are in
 * `public/`, and they are read as content. Everything else in the output was put
 * there by the bundler, and is what this check is about.
 */
export function authoredCopies(root, outDir = "dist", files = listPublishedFiles(root, outDir)) {
  const copies = new Set();
  const publicDir = path.resolve(root, "public");
  if (!existsSync(publicDir) || !files) return copies;

  for (const file of files) {
    const source = path.join(publicDir, file);
    if (!existsSync(source)) continue;
    const published = hashOf(path.join(path.resolve(root, outDir), file));
    if (published && published === hashOf(source)) copies.add(file);
  }
  return copies;
}

/**
 * Text that a reader could fetch, or null for a file that is not text.
 *
 * A PNG or a font is published too, but a byte sequence in one is not a sentence
 * a reader follows: the question here is what the page says about the repository.
 * The test is a NUL byte in the first block, which is what tells a binary from
 * UTF-8 without trusting the extension — a `.js` chunk is text and a `.png` is
 * not, whatever a build names them.
 */
function textOf(absolute) {
  let buffer;
  try {
    buffer = readFileSync(absolute);
  } catch {
    return null;
  }
  const probe = buffer.subarray(0, 8192);
  return probe.includes(0) ? null : buffer.toString("utf8");
}

function lineAndColumn(text, index) {
  let line = 1;
  let column = 1;
  for (let position = 0; position < index; position += 1) {
    if (text[position] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

/** The matched path with a little of what surrounds it, on one line. */
function snippet(text, index, length) {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

/**
 * Every repository path the bundler published, as
 * `{ file, line, column, kind, text, snippet }`.
 *
 * `checked` and `copies` are reported too, because a green run has to be able to
 * say what it looked at: a scan that quietly read nothing looks the same as a
 * clean one, and this gate's failure mode would then be that it stopped running.
 */
export function scanPublishedSurface(root, { outDir = "dist" } = {}) {
  const files = listPublishedFiles(root, outDir);
  if (!files) return null;

  const copies = authoredCopies(root, outDir, files);
  const base = path.resolve(root, outDir);
  const matches = [];
  let checked = 0;
  let binary = 0;

  for (const file of files) {
    if (copies.has(file)) continue;
    const text = textOf(path.join(base, file));
    if (text === null) {
      binary += 1;
      continue;
    }
    checked += 1;
    for (const { id, pattern } of REPO_PATH_PATTERNS) {
      pattern.lastIndex = 0;
      for (const found of text.matchAll(pattern)) {
        const { line, column } = lineAndColumn(text, found.index ?? 0);
        matches.push({
          file,
          line,
          column,
          kind: id,
          text: found[0],
          snippet: snippet(text, found.index ?? 0, found[0].length),
        });
      }
    }
  }

  return { files: files.length, checked, binary, copies: copies.size, matches };
}
