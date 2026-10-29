import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * What the browser walk previews, and what proves the preview is that build.
 *
 * `vite preview` serves `dist/`, not the sources, so a stylesheet edited after
 * the last build is measured against the previous bundle — which is how the first
 * run of the hero assertion reported three columns at 1000px from a rule the tree
 * no longer had. The walk asks this module before it starts a preview: if any
 * file the bundle is made from holds bytes the build did not read, the walk stops
 * and says so instead of measuring. Nothing here builds anything; refusing is the
 * point.
 *
 * The record is a content-hash manifest the build writes *beside* its own output
 * (`.dist-build-manifest.json`), not inside it, and not a set of file times. The
 * deployed directory is copied whole: the Dockerfile's `COPY --from=builder
 * /app/dist` is what nginx serves, so a manifest inside `dist/` publishes the
 * repository's file list to anyone who asks for it. Beside the output it is still
 * one local file the walk can read and no server can reach. Times were this gate's
 * first version and they answer a different question: a `git checkout` of an
 * older branch, or a copy that preserves an mtime, leaves edited bytes looking
 * older than the build, and a build that read none of an edit can still carry a
 * newer timestamp. A hash makes "this build read this tree" a fact rather than an
 * inference, and it fails closed — a file the manifest does not list, a file it
 * lists that is gone, and a file whose bytes differ are all refusals.
 *
 * `BUILD_INPUT_PATHS` is the bundle's own input set — the entry document, the
 * source tree, the assets copied verbatim, the manifest whose dependencies the
 * bundle is made of, and the config that shapes it. The env files are listed
 * separately because Vite inlines their `VITE_*` values at build time: a `.env`
 * edited after the build leaves a bundle whose behaviour no source file reflects.
 * Only files Vite itself loads are listed, so `.env.example` and
 * `.env.production.example` never ask for a rebuild. `dist/` is never an input,
 * which is what lets Vite copy `public/` into it preserving each file's own
 * timestamp without this gate reading that copy back as a source.
 *
 * The manifest also records the commit the build was made at (`revision`, with
 * `-dirty` when the tree it read had tracked changes), because a failure pasted
 * into an issue needs a commit to open rather than only a timestamp: see
 * `gitRevision`.
 */
export const BUILD_INPUT_PATHS = ["index.html", "package.json", "public", "src", "vite.config.ts"];

export const BUILD_ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local"];

/**
 * Where a build writes the manifest naming the bytes it was made from.
 *
 * Beside the output directory, never in it. Everything inside `dist/` is the site:
 * `vite preview` serves it, and the image copies it into nginx's document root, so a
 * file there is published — and this file lists every path the bundle was built
 * from. The name keeps the output directory's own so two builds with different
 * `--outDir` values do not overwrite each other, and the leading dot keeps it out
 * of the way in a `ls`.
 */
export function buildManifestPath(root, outDir = "dist") {
  const resolvedOut = path.resolve(root, outDir);
  return path.join(root, `.${path.basename(resolvedOut)}-build-manifest.json`);
}

/** Every file under a path, as repository-relative paths, skipping symlinks. */
function collectFiles(root, relative, files) {
  const absolute = path.join(root, relative);
  let stat;
  try {
    stat = statSync(absolute);
  } catch {
    // A path the project does not have (an unused env file, a missing tree).
    return files;
  }

  if (stat.isDirectory()) {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.isDirectory() || entry.isFile()) {
        collectFiles(root, path.join(relative, entry.name), files);
      }
    }
    return files;
  }

  files.push(relative.split(path.sep).join("/"));
  return files;
}

function hashOf(absolute) {
  try {
    return createHash("sha256").update(readFileSync(absolute)).digest("hex");
  } catch {
    // A file that vanished between the listing and the read reads as changed
    // rather than crashing the gate: this module exists to answer one question
    // before anything else runs, so it must not become the thing that fails.
    return null;
  }
}

/** Every file the bundle is made from, as `{ path, hash }`, sorted by path. */
export function collectBuildInputs(root) {
  const files = [];
  for (const relative of [...BUILD_INPUT_PATHS, ...BUILD_ENV_FILES]) {
    collectFiles(root, relative, files);
  }
  return files
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({ path: file, hash: hashOf(path.join(root, file)) }));
}

/**
 * The commit a build was made from, so a pasted failure names one.
 *
 * A failure quoted into an issue or a review is read by someone who was not
 * there. The timestamp says when the bundle was built and the hashes say which
 * bytes it read; neither says which commit to open. `rev-parse` does.
 *
 * `git status` decides whether that commit is the whole story. A build from a
 * modified tree contains code the commit does not, so its failure would send a
 * reader to a commit that cannot reproduce it — hence `-dirty`. Untracked files
 * are excluded from that answer: they are already hashed as inputs, so a build
 * that read one is refused as stale rather than because the commit is wrong.
 *
 * A source archive and the image's build stage have no `.git`, and this answers
 * `null` there rather than failing: a build must not depend on being run from a
 * clone, and the manifest's hashes still prove what was measured.
 */
export function gitRevision(root = process.cwd()) {
  const run = (args) =>
    execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"], windowsHide: true })
      .toString()
      .trim();
  try {
    const revision = run(["rev-parse", "--short=12", "HEAD"]);
    if (!/^[0-9a-f]{7,40}$/.test(revision)) return null;
    return run(["status", "--porcelain", "--untracked-files=no"]) ? `${revision}-dirty` : revision;
  } catch {
    return null;
  }
}

/** What a build writes: the moment it finished, the commit it was made at, and the bytes it read. */
export function createBuildManifest(root) {
  return { builtAt: new Date().toISOString(), revision: gitRevision(root), inputs: collectBuildInputs(root) };
}

/**
 * Writes the manifest beside the bundle it describes, never inside it.
 *
 * Called from the build's own `closeBundle`, so the hashes are taken once the
 * bundle is complete: a file written while the bundler was still reading would
 * otherwise be recorded as read when it was only half there.
 */
export function writeBuildManifest(root, outDir = "dist") {
  const manifest = createBuildManifest(root);
  const target = buildManifestPath(root, outDir);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/** The manifest of the build in `outDir`, or null when there is none to read. */
export function readBuildManifest(root, outDir = "dist") {
  try {
    const manifest = JSON.parse(readFileSync(buildManifestPath(root, outDir), "utf8"));
    if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.inputs)) return null;
    return manifest;
  } catch {
    return null;
  }
}

/**
 * The Vite plugin every build runs, so the manifest cannot be forgotten.
 *
 * A `vite build` by hand writes one exactly as `npm run build` does, which is
 * what keeps the walk's question about the bundle rather than about the command
 * that made it. The plugin takes the root and output directory from the build's
 * own resolved config, so `--outDir` moves the manifest with the bundle.
 *
 * A build asked not to write its bundle writes no manifest either. The audits
 * that build the app in memory to read its chunks (`check:init-order`) go through
 * this same config with `write: false`, and a manifest from one of those would
 * describe a bundle that was never written: it would name the tree as read and
 * every later walk would call a stale `dist/` current, which is the false green
 * this record exists to prevent.
 */
export function buildManifestPlugin() {
  let root = process.cwd();
  let outDir = "dist";
  let writesBundle = true;
  return {
    name: "wingman-build-manifest",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
      writesBundle = config.build.write !== false;
    },
    closeBundle() {
      if (!writesBundle) return;
      writeBuildManifest(root, outDir);
    },
  };
}

/**
 * Whether a build is current, from the manifest it wrote and the bytes on disk.
 *
 * Three kinds of difference count: `edited` (the manifest recorded a hash and the
 * file's bytes no longer hash to it), `added` (a file the manifest never saw, so
 * the bundle cannot have read it) and `removed` (a file the bundle read that the
 * tree no longer has). All three mean the same thing to a walk — the bundle in
 * `dist/` was not made from this tree — so they are reported together rather than
 * ranked.
 */
export function assessBuildFreshness({ manifest, inputs }) {
  if (!manifest) {
    return { ok: false, reason: "no-manifest" };
  }

  const recorded = new Map(
    (manifest.inputs ?? []).filter((file) => file && typeof file.path === "string")
      .map((file) => [file.path, file.hash]),
  );
  const current = new Map(inputs.map((file) => [file.path, file.hash]));

  const changed = [];
  for (const [file, hash] of current) {
    if (!recorded.has(file)) changed.push({ path: file, kind: "added" });
    else if (recorded.get(file) !== hash) changed.push({ path: file, kind: "edited" });
  }
  for (const file of recorded.keys()) {
    if (!current.has(file)) changed.push({ path: file, kind: "removed" });
  }
  // The revision travels with both answers: a refusal is the other failure that
  // gets pasted, and "which commit does this correspond to" is the same question
  // there — the build is behind the tree, so its commit is the one the measured
  // bundle came from.
  const revision = typeof manifest.revision === "string" ? manifest.revision : null;
  if (!changed.length) {
    return { ok: true, builtAt: manifest.builtAt, revision, inputs: current.size };
  }

  changed.sort((left, right) => left.path.localeCompare(right.path));
  return { ok: false, reason: "stale-build", builtAt: manifest.builtAt, revision, changed };
}

/**
 * The build a run measured, as the lines a CI run page shows.
 *
 * A green Browser Smoke job says the built app renders, not which bytes it
 * rendered: the commit was in the log and nowhere a person looking at the run page
 * would see it, so reading "which commit passed this" meant opening the log of a
 * job whose output is hundreds of lines of measurements. The lines are Markdown
 * because that is what `$GITHUB_STEP_SUMMARY` renders, and every number in them is
 * the manifest's own — the commit the build recorded, the time it was written and
 * how many inputs it hash-checked — so the summary cannot drift from the build the
 * walk just accepted.
 *
 * A `-dirty` revision keeps the suffix and says what it means, because "which
 * commit" has a different answer there: the commit is where the build started, and
 * the tree it read held tracked changes on top of it.
 */
/**
 * How much of a failed assertion the run page quotes.
 *
 * Two ceilings rather than one because the two ways an assertion can be long are
 * different failures of the page: a Playwright diff is many short lines and a
 * whole-body comparison is a few enormous ones. Twenty-four lines is more than an
 * expectation needs — message, `Expected:`, `Received:` and a diff of a dozen
 * rows — and 1,200 characters is wider than the walk's longest own sentence, so a
 * message written for a rep still arrives whole. Probed with a 400-line body diff
 * and with a single 40,000-character line: the first quotes 24 lines and says it
 * withheld 376 more, the second quotes one cut line and says how many characters
 * stayed in the log.
 *
 * The tail has its own, smaller pair (`FAILURE_TAIL_LINES`, `FAILURE_TAIL_CHARS`),
 * because the two ends of a diff are read for different things: the head says where
 * the difference starts, and the last few lines say how it ended — Playwright's
 * `Call log` and the closing rows of a received body sit there, and a difference at
 * the end of a document is invisible to a head-only quote. Six lines is the `Call
 * log` and the row under it; 400 characters is wider than any of those lines.
 */
export const FAILURE_QUOTE_LINES = 24;
export const FAILURE_QUOTE_CHARS = 1200;
export const FAILURE_TAIL_LINES = 6;
export const FAILURE_TAIL_CHARS = 400;

/**
 * The head and tail of an assertion, with a sentence naming what sits between them.
 *
 * Lines are taken in order until a ceiling is reached, and the line that crosses
 * the character ceiling is cut rather than dropped — a diff whose first differing
 * line is a long one still shows where it started to differ. The tail is taken from
 * the other end, one line at a time and never reaching into a line the head already
 * quoted, so the two halves cannot repeat each other; a tail line too long for its
 * ceiling keeps its end rather than its start, since the end is the part nearest the
 * summary a reader is looking for.
 *
 * The withheld count is the message's own length minus what was quoted — both
 * halves, and both counts — so the sentence is arithmetic on the assertion rather
 * than an estimate of it, and nothing is said when everything fit. The sentence
 * stands between the halves, where the reader meets the gap, instead of after a tail
 * that would otherwise read as if it followed the head directly.
 */
function quoteFailure(message) {
  const lines = message.replace(/\r\n/g, "\n").split("\n");
  const total = lines.reduce((sum, line) => sum + line.length, 0);
  const head = [];
  let headChars = 0;
  let budget = FAILURE_QUOTE_CHARS;
  for (const line of lines.slice(0, FAILURE_QUOTE_LINES)) {
    if (budget <= 0) break;
    const take = Math.min(line.length, budget);
    head.push(take < line.length ? `${line.slice(0, take)}…` : line);
    headChars += take;
    budget -= take;
    if (take < line.length) break;
  }
  const tail = [];
  let tailChars = 0;
  let tailBudget = FAILURE_TAIL_CHARS;
  for (let index = lines.length - 1; index >= head.length && tail.length < FAILURE_TAIL_LINES; index -= 1) {
    if (tailBudget <= 0) break;
    const line = lines[index];
    const take = Math.min(line.length, tailBudget);
    tail.unshift(take < line.length ? `…${line.slice(line.length - take)}` : line);
    tailChars += take;
    tailBudget -= take;
    if (take < line.length) break;
  }
  const hiddenLines = lines.length - head.length - tail.length;
  const hiddenChars = total - headChars - tailChars;
  if (!hiddenLines && !hiddenChars) return [...head, ...tail];
  // Grouped, because the numbers this sentence reports are the large ones: a whole
  // document compared against itself runs to six figures, and `125855` beside
  // `1190` is a number a reader has to count digits on.
  const grouped = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const withheld = [
    hiddenLines ? `${grouped(hiddenLines)} more line${hiddenLines === 1 ? "" : "s"}` : "",
    hiddenChars ? `${grouped(hiddenChars)} more character${hiddenChars === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(" and ");
  return [...head, `…${withheld} withheld — the whole assertion is printed in the job log.`, ...tail];
}

export function buildSummaryLines(bundle) {
  const built = new Date(bundle.builtAt).toISOString();
  const revision = typeof bundle.revision === "string" && bundle.revision ? bundle.revision : null;
  const inputs = `${bundle.inputs} file${bundle.inputs === 1 ? "" : "s"}, hash-checked against the tree`;
  return [
    "### Browser Smoke — the build this run measured",
    "",
    "| | |",
    "| --- | --- |",
    `| Commit | ${revision ? `\`${revision}\`` : "none — built where there is no `.git`"} |`,
    `| Built | ${built} |`,
    `| Inputs | ${inputs} |`,
    "",
    revision?.endsWith("-dirty")
      ? "`-dirty` says the commit does not hold all of what was measured: the build read a tree with tracked changes on top of it."
      : "Every reading in this job comes from this build rather than from the checkout.",
  ];
}

/**
 * A failed walk, as the lines a CI run page shows.
 *
 * It is the accepted page plus the assertion: the same heading, the same table and
 * the same sentence under it, with the walk's own message quoted beneath a
 * sub-heading. A triager opening a red check asks the two things together — which
 * assertion went, and which build it was measured against — and the same sentence
 * against a different bundle is a different report, so they are one section rather
 * than a red heading stacked above the green heading the walk wrote before it
 * started. That page named the build twice, which is what made it read as two runs.
 *
 * Composing it from `buildSummaryLines` is what keeps the two pages the same at the
 * top: a build row added to one is on both, and the commit cannot be written one way
 * for a pass and another for a failure.
 *
 * The message is quoted line by line rather than put in the table, because a
 * Playwright expectation carries several lines and a message in a cell would lose
 * the half of it that says what was received.
 *
 * How much of it is quoted is capped (`FAILURE_QUOTE_LINES`,
 * `FAILURE_QUOTE_CHARS`), because one kind of failure has no natural end: an
 * expectation over a whole document prints the body it expected against the body it
 * received, which is tens of thousands of characters of text a reader scrolling the
 * run page has to pass before they find the sentence under it. The quote keeps both
 * ends — the walk's own message and the opening of what it expected and received,
 * which is where a difference starts, and then the last few lines
 * (`FAILURE_TAIL_LINES`, `FAILURE_TAIL_CHARS`), where Playwright's `Call log` and
 * the closing rows of a received body sit — and says between them how much it left
 * out and where the rest is. A tail is not a second helping of the head: a diff whose
 * only difference is at the end of a document is one a head-only quote never shows,
 * and the withheld sentence would be the only thing saying so. The log keeps the
 * whole assertion: the walk prints the error there before it writes this page, so
 * the page can send a reader to it rather than pretend the excerpt is everything.
 */
export function failedSummaryLines(bundle, failure) {
  const message = String(failure ?? "").trim();
  return [
    ...buildSummaryLines(bundle),
    "",
    "#### The walk assertion that failed",
    "",
    ...(message ? quoteFailure(message).map((line) => `> ${line}`) : ["> the walk stopped without a message"]),
  ];
}

/**
 * Refuses to let a caller measure a bundle the sources have moved past.
 *
 * Reads the tree under `root` itself rather than taking the answer from a build,
 * so the question stays "were these bytes read by the bundle in `dist/`" and not
 * "did the command that should have asked run recently".
 */
export function assertFreshBuild(root, { outDir = "dist" } = {}) {
  const manifest = readBuildManifest(root, outDir);
  if (!manifest) {
    if (!existsSync(path.join(root, outDir, "index.html"))) {
      throw refusal(
        `The browser walk previews the built app, and there is no build in ${outDir}/ (${outDir}/index.html is missing): ` +
          "run `npm run build` first.",
        { reason: "no-build" },
      );
    }
    throw refusal(
      `The browser walk previews the built app, and this build wrote no ${path.basename(buildManifestPath(root, outDir))} — ` +
        "so the walk cannot tell which sources it read, and measuring it could read the previous bundle instead of the tree:\n" +
        `  missing: ${path.relative(root, buildManifestPath(root, outDir))}\n` +
        "Run `npm run build` and start the walk again.",
      { reason: "no-manifest" },
    );
  }

  const assessment = assessBuildFreshness({ manifest, inputs: collectBuildInputs(root) });
  if (assessment.ok) return assessment;

  const built = new Date(assessment.builtAt).toISOString();
  const from = assessment.revision ? ` from ${assessment.revision}` : "";
  const [first, ...rest] = assessment.changed;
  const details = [
    `  ${first.kind}: ${first.path}`,
    ...rest.slice(0, 5).map((file) => `  ${file.kind}: ${file.path}`),
    ...(rest.length > 5 ? [`  and ${rest.length - 5} more`] : []),
  ].join("\n");
  const count = `${assessment.changed.length} input${assessment.changed.length === 1 ? "" : "s"}`;

  throw refusal(
    `The browser walk previews the built app, and this build did not read the tree it would be measured against — ` +
      `measuring it would read the previous bundle, not the sources:\n` +
      `${details}\n` +
      `Run \`npm run build\` and start the walk again (${count} changed since the build made at ${built}${from}).`,
    {
      reason: "stale-build",
      builtAt: assessment.builtAt,
      revision: assessment.revision,
      changed: assessment.changed,
    },
  );
}

/**
 * A refusal that carries what refused it.
 *
 * The message is for a person reading a console; the fields are for the run page,
 * which renders the same refusal as Markdown and must not re-derive it — a second
 * reading of the tree could disagree with the one that refused.
 */
function refusal(message, refusal_) {
  const error = new Error(message);
  error.refusal = refusal_;
  return error;
}

/**
 * How much of the changed-file excerpt the refused page prints, and from which end.
 *
 * Two ends rather than one limit, because the list is path-sorted and its ends say
 * different things: the head is whatever sorts first — the disagreement `.env`, an
 * `index.html` edit, and a run of `public/` additions — while the tail is what sorts
 * last, where a stale build's edited `src/` files and `vite.config.ts` sit. A
 * head-only ten therefore did to a broad change what a head-only assertion quote did
 * to a long diff: it showed where the difference started and stopped before the
 * file a rep opens the page to find. Four of the tail is enough for the edited
 * sources at the end of that order, and ten of the head still names the first
 * disagreement. A list that fits inside both ends is printed whole, and the page
 * says how many paths it left out rather than only how many moved.
 */
const REFUSAL_LIST_LIMIT = 10;
const REFUSAL_TAIL_LIMIT = 4;

/**
 * A refused build, as the lines a CI run page shows.
 *
 * A refusal is the run that needs the run page most: the job is red because it
 * measured nothing, and the sentence that says why sits in a log nobody opens
 * while triaging a red check. The two facts triage asks for are here — the commit
 * the refused bundle came from, and the files that moved since — with the files as
 * a list rather than the console's indented excerpt, because a run page can hold
 * them and a reader comparing them to their own diff needs the paths. Like a failed
 * assertion's quote, that list is bounded at both ends and says what it left out: a
 * path-sorted excerpt that runs long is one long run of `public/` additions away
 * from dropping the `src/` edit it exists to show, so the head and the tail are
 * printed with the withheld count between them.
 *
 * The other two refusals have no commit to name: a missing build and a build that
 * wrote no manifest are both the case where there is nothing to identify, so the
 * lines say that instead of printing an empty revision.
 */
export function refusedSummaryLines(refusal_) {
  const header = ["### Browser Smoke — refused to measure this build", ""];
  if (refusal_.reason === "no-build") {
    return [
      ...header,
      "| | |",
      "| --- | --- |",
      "| Commit | none — there is no build in `dist/` to name |",
      "| Refused | `dist/index.html` is missing, so there is nothing to measure |",
      "",
      "Run `npm run build` and start the walk again.",
    ];
  }
  if (refusal_.reason === "no-manifest") {
    return [
      ...header,
      "| | |",
      "| --- | --- |",
      "| Commit | none — the build in `dist/` wrote no manifest |",
      "| Refused | the build recorded none of the sources it read |",
      "",
      "A bundle with no manifest could have been made from any tree, so measuring it would report rules the current sources may not have. Run `npm run build` and start the walk again.",
    ];
  }

  const built = new Date(refusal_.builtAt).toISOString();
  const revision = typeof refusal_.revision === "string" && refusal_.revision ? refusal_.revision : null;
  const changed = refusal_.changed ?? [];
  const count = `${changed.length} input${changed.length === 1 ? "" : "s"}`;
  const fits = changed.length <= REFUSAL_LIST_LIMIT + REFUSAL_TAIL_LIMIT;
  const listed = fits ? changed : changed.slice(0, REFUSAL_LIST_LIMIT);
  const tailed = fits ? [] : changed.slice(-REFUSAL_TAIL_LIMIT);
  const withheld = changed.length - listed.length - tailed.length;
  return [
    ...header,
    "| | |",
    "| --- | --- |",
    `| Commit | ${revision ? `\`${revision}\`` : "none — built where there is no `.git`"} |`,
    `| Built | ${built} |`,
    `| Refused | ${count} changed since this build was made |`,
    "",
    "Files that moved since the build:",
    "",
    ...listed.map((file) => `- \`${file.kind}\` ${file.path}`),
    ...(withheld > 0
      ? ["", `…${withheld} more withheld — the console prints every path that moved.`, ""]
      : []),
    ...tailed.map((file) => `- \`${file.kind}\` ${file.path}`),
    "",
    revision?.endsWith("-dirty")
      ? "The `-dirty` suffix says where the build started: the tree it read already held tracked changes on top of that commit, and the files above are later still."
      : "The walk measures `dist/`, so a build behind the tree would be measured in its previous form. Run `npm run build` and start the walk again.",
  ];
}
