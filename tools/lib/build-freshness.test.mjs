import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runTool } from "../test-spawn-guard.mjs";
import {
  assertFreshBuild,
  assessBuildFreshness,
  buildManifestPath,
  buildManifestPlugin,
  buildSummaryLines,
  collectBuildInputs,
  createBuildManifest,
  FAILURE_QUOTE_CHARS,
  FAILURE_QUOTE_LINES,
  FAILURE_TAIL_CHARS,
  FAILURE_TAIL_LINES,
  failedSummaryLines,
  gitRevision,
  readBuildManifest,
  refusedSummaryLines,
  writeBuildManifest,
} from "./build-freshness.mjs";

const roots = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

const WRITTEN_AT = new Date("2026-10-27T21:00:00Z");

/**
 * A throwaway project: the bundle's inputs, and optionally a build of them.
 *
 * Every source is stamped with the same moment, and that moment is never what the
 * gate reads — the tests below edit bytes and leave the timestamp where it was,
 * which is the case a file-time gate cannot see.
 */
function scratchProject({ build = false, manifest = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "wm-freshness-"));
  roots.push(root);

  mkdirSync(path.join(root, "src", "styles"), { recursive: true });
  mkdirSync(path.join(root, "public"), { recursive: true });
  writeFileSync(path.join(root, "index.html"), "<div id=\"root\"></div>");
  writeFileSync(path.join(root, "src", "styles", "app.css"), ".wm-card { color: red; }");
  writeFileSync(path.join(root, "public", "catalogue.json"), "{}");
  for (const file of ["index.html", "src/styles/app.css", "public/catalogue.json"]) {
    utimesSync(path.join(root, file), WRITTEN_AT, WRITTEN_AT);
  }

  if (build) {
    mkdirSync(path.join(root, "dist", "assets"), { recursive: true });
    writeFileSync(path.join(root, "dist", "index.html"), "<div id=\"root\"></div>");
    writeFileSync(path.join(root, "dist", "assets", "app-abc123.css"), ".wm-card{color:red}");
    // Vite copies public/ into dist/ preserving the source's own timestamp.
    writeFileSync(path.join(root, "dist", "catalogue.json"), "{}");
    for (const file of ["dist/index.html", "dist/assets/app-abc123.css", "dist/catalogue.json"]) {
      utimesSync(path.join(root, file), WRITTEN_AT, WRITTEN_AT);
    }
    if (manifest) writeBuildManifest(root);
  }
  return root;
}

describe("collectBuildInputs", () => {
  it("hashes every file the bundle is made from", () => {
    const root = scratchProject();
    const inputs = collectBuildInputs(root);
    const byPath = new Map(inputs.map((file) => [file.path, file.hash]));

    expect([...byPath.keys()]).toEqual(
      expect.arrayContaining(["index.html", "public/catalogue.json", "src/styles/app.css"]),
    );
    for (const hash of byPath.values()) expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never reads dist/, whose public copies keep the source's timestamp", () => {
    const root = scratchProject({ build: true });

    expect(collectBuildInputs(root).map((file) => file.path).filter((file) => file.startsWith("dist/"))).toEqual([]);
  });

  it("skips the env files the project does not have", () => {
    const root = scratchProject();

    expect(collectBuildInputs(root).some((file) => file.path.includes(".env"))).toBe(false);
  });
});

describe("buildSummaryLines", () => {
  // The lines GitHub renders under the Browser Smoke job, from the manifest the
  // walk just accepted: a run page answers "which commit passed" without anyone
  // opening a log of several hundred measurements.
  const BUNDLE = { builtAt: "2026-10-27T21:00:00.000Z", revision: "057813d2c983", inputs: 1483 };
  const summary = (bundle) => buildSummaryLines(bundle).join("\n");

  it("names the commit the build recorded, its time and its input count", () => {
    const text = summary(BUNDLE);

    expect(text).toContain("| Commit | `057813d2c983` |");
    expect(text).toContain("| Built | 2026-10-27T21:00:00.000Z |");
    expect(text).toContain("| Inputs | 1483 files, hash-checked against the tree |");
  });

  it("keeps the dirty suffix, and says what it means", () => {
    const text = summary({ ...BUNDLE, revision: "057813d2c983-dirty" });

    expect(text).toContain("`057813d2c983-dirty`");
    expect(text).toContain("`-dirty` says the commit does not hold all of what was measured");
    expect(text).not.toContain("comes from this build rather than from the checkout");
  });

  it("says a build with no commit at all has none, rather than printing an empty cell", () => {
    const text = summary({ ...BUNDLE, revision: null });

    expect(text).toContain("none — built where there is no `.git`");
    expect(text).not.toContain("``");
  });

  it("counts one input as a file", () => {
    expect(summary({ ...BUNDLE, inputs: 1 })).toContain("| Inputs | 1 file, hash-checked against the tree |");
  });

  it("is a table GitHub renders, not a paragraph", () => {
    const [heading, blank, header, rule, ...rows] = buildSummaryLines(BUNDLE);

    expect(heading).toBe("### Browser Smoke — the build this run measured");
    expect(blank).toBe("");
    expect(header).toBe("| | |");
    expect(rule).toBe("| --- | --- |");
    expect(rows.filter((line) => line.startsWith("| "))).toHaveLength(3);
  });
});

describe("failedSummaryLines", () => {
  // The red run's page. It is the accepted page plus the assertion — one section
  // naming the build once, with the failure under it — because the walk writes the
  // build's table before it starts and replaces it on failure. Two sections meant
  // the page named the build twice and read as a green run with a red one below it.
  const BUNDLE = { builtAt: "2026-10-27T21:00:00.000Z", revision: "057813d2c983", inputs: 1483 };
  const page = (bundle, failure) => failedSummaryLines(bundle, failure).join("\n");
  const FAILURE =
    "Gallery card for Northbridge Meeting Room Refresh wrapped its action row over 5 lines at 1150px, " +
    "where the \"several\" row has 4: It printed Detail, Resume active at 913px.";

  it("names the build once, with the assertion under that same section", () => {
    const lines = failedSummaryLines(BUNDLE, FAILURE);
    const text = lines.join("\n");

    // One heading and one commit row: the section written before the walk is taken
    // back rather than left above this one, so a red page reads as a single run.
    expect(lines.filter((line) => line.startsWith("### ")))
      .toEqual(["### Browser Smoke — the build this run measured"]);
    expect(lines.filter((line) => line.startsWith("| Commit |"))).toHaveLength(1);
    expect(text).toContain("| Commit | `057813d2c983` |");
    expect(text).toContain("| Built | 2026-10-27T21:00:00.000Z |");
    expect(text).toContain("| Inputs | 1483 files, hash-checked against the tree |");
    // Predominantly under the table it belongs to, not above the build it was
    // measured against.
    expect(lines.indexOf("#### The walk assertion that failed"))
      .toBeGreaterThan(lines.indexOf("| Inputs | 1483 files, hash-checked against the tree |"));
    expect(text).toContain(`> ${FAILURE}`);
  });

  it("is the accepted page's own section with the assertion appended", () => {
    // Composed rather than rewritten: a row added to the passing page is on the
    // failing one too, and one build cannot be described two ways.
    const accepted = buildSummaryLines(BUNDLE);

    expect(failedSummaryLines(BUNDLE, FAILURE).slice(0, accepted.length)).toEqual(accepted);
  });

  it("prints the assertion's own words, so the page and the log cannot disagree", () => {
    expect(page(BUNDLE, FAILURE)).toContain(`> ${FAILURE}`);
  });

  it("caps a whole-body diff at the quote's ceilings and says what it withheld", () => {
    // The failure this exists for: an expectation over a whole document prints the
    // body it expected against the body it received, so the run page would be
    // thousands of lines of body text with the finding somewhere above it.
    const body = Array.from({ length: 400 }, (_, index) => `  “Room ${index}” is the approved copy for this page.`);
    const diff = ["Text content of the exported proposal did not match", "", "Expected: |-", ...body, "Received: |-", ...body];
    const lines = failedSummaryLines(BUNDLE, diff.join("\n"));
    const quoted = lines.filter((line) => line.startsWith("> "));
    const note = quoted.find((line) => line.includes("withheld")) ?? "";

    // Room for the finding and where the difference starts, and a few lines for how
    // it ended, and no more.
    expect(quoted.length).toBeLessThanOrEqual(FAILURE_QUOTE_LINES + FAILURE_TAIL_LINES + 1);
    const accepted = buildSummaryLines(BUNDLE).join("\n").length;
    expect(lines.join("\n").length - accepted).toBeLessThan(FAILURE_QUOTE_CHARS + FAILURE_TAIL_CHARS + 400);
    expect(lines.join("\n")).not.toContain("Room 200");
    expect(quoted[0]).toBe("> Text content of the exported proposal did not match");
    expect(quoted.slice(0, 4)).toContain("> Expected: |-");
    // The page says how much it did not quote, and where the rest is, rather than
    // ending a diff as if that were all of it.
    expect(note).toMatch(/^> …[\d,]+ more lines and [\d,]+ more characters withheld — the whole assertion is printed in the job log\.$/);
    // Grouped, because these are the six-figure numbers a body diff reports.
    expect(note).toMatch(/…\d{1,3}(,\d{3})* more lines and \d{1,3}(,\d{3})+ more characters/);
  });

  it("quotes the assertion's last lines as well, where a diff says how it ended", () => {
    // A body diff whose only difference is at the end reads as identical in a
    // head-only quote: the finding above it plus 24 opening lines, then a sentence
    // saying something was withheld. The tail is the half that shows the end.
    const body = Array.from({ length: 400 }, (_, index) => `  “Room ${index}” is the approved copy for this page.`);
    const diff = [
      "Text content of the exported proposal did not match",
      "",
      "Expected: |-",
      ...body,
      "Received: |-",
      ...body,
      "",
      "Call log:",
      "  - Expect \"toHaveText\" with timeout 5000ms",
      "Footer block missing from the received page",
    ];
    const lines = failedSummaryLines(BUNDLE, diff.join("\n"));
    const quoted = lines.filter((line) => line.startsWith("> "));
    const noteAt = quoted.findIndex((line) => line.includes("withheld"));

    // The withheld sentence stands between the two halves, so the tail cannot read
    // as if it followed the head directly.
    expect(noteAt).toBeGreaterThan(0);
    const tail = quoted.slice(noteAt + 1);
    expect(tail.length).toBeLessThanOrEqual(FAILURE_TAIL_LINES);
    expect(tail.slice(-3)).toEqual([
      "> Call log:",
      ">   - Expect \"toHaveText\" with timeout 5000ms",
      "> Footer block missing from the received page",
    ]);
    // The head is still where it started, and the tail did not reach back into it.
    expect(quoted[0]).toBe("> Text content of the exported proposal did not match");
    expect(quoted.filter((line) => line === "> Call log:")).toHaveLength(1);
  });

  it("keeps the tail inside its own two ceilings", () => {
    // Six lines and 400 characters is the Call log and the rows under it; a diff
    // ending in one enormous line keeps that line's end, not its start.
    const body = Array.from({ length: 40 }, (_, index) => `  row ${index}`);
    const long = `  received footer: ${"y".repeat(5_000)}`;
    const lines = failedSummaryLines(BUNDLE, ["did not match", ...body, long].join("\n"));
    const quoted = lines.filter((line) => line.startsWith("> "));
    const tail = quoted.slice(quoted.findIndex((line) => line.includes("withheld")) + 1);

    expect(tail).toHaveLength(1);
    expect(tail[0].length).toBeLessThanOrEqual(FAILURE_TAIL_CHARS + "> …".length);
    // The end of the line, not its start: the sentence naming the line is what the
    // head's cut line would have shown.
    expect(tail[0]).toMatch(/^> …y+$/);
  });

  it("cuts one enormous line instead of letting it fill the page", () => {
    const line = `Expected: ${"x".repeat(40_000)}`;
    const text = page(BUNDLE, line);
    const quoted = text.split("\n").filter((entry) => entry.startsWith("> "));

    expect(quoted).toHaveLength(2);
    expect(quoted[0].length).toBe(FAILURE_QUOTE_CHARS + "> …".length);
    expect(quoted[0].endsWith("…")).toBe(true);
    expect(quoted[1]).toMatch(/more characters withheld/);
  });

  it("quotes a short assertion whole and says nothing about withholding", () => {
    expect(page(BUNDLE, FAILURE)).not.toContain("withheld");
  });

  it("quotes every line of a multi-line expectation", () => {
    // A Playwright expectation carries what it expected and what it received on
    // their own lines; a message put in a table cell would lose the half that says
    // what the page actually did.
    const text = page(BUNDLE, "Expected: 5 lines\nReceived: 6 lines");

    expect(text).toContain("> Expected: 5 lines");
    expect(text).toContain("> Received: 6 lines");
  });

  it("says a walk stopped without a message rather than quoting nothing", () => {
    expect(page(BUNDLE, "   ")).toContain("> the walk stopped without a message");
    expect(page(BUNDLE, undefined)).toContain("> the walk stopped without a message");
  });

  it("keeps the dirty suffix, and says what it means", () => {
    const text = page({ ...BUNDLE, revision: "057813d2c983-dirty" }, FAILURE);

    expect(text).toContain("`057813d2c983-dirty`");
    expect(text).toContain("`-dirty` says the commit does not hold all of what was measured");
    expect(text).not.toContain("comes from this build rather than from the checkout");
  });

  it("says a build with no commit at all has none, rather than printing an empty cell", () => {
    const text = page({ ...BUNDLE, revision: null }, FAILURE);

    expect(text).toContain("none — built where there is no `.git`");
    expect(text).not.toContain("``");
  });
});

describe("refusedSummaryLines", () => {
  // The red run's page. "The build is behind the tree" in a log nobody opens while
  // triaging a failed check answers neither of the questions that check raises:
  // which commit the refused bundle came from, and what moved since.
  const STALE = {
    reason: "stale-build",
    builtAt: "2026-10-27T21:00:00.000Z",
    revision: "057813d2c983",
    changed: [
      { path: "public/catalogue.json", kind: "removed" },
      { path: "src/main.tsx", kind: "added" },
      { path: "src/styles/app.css", kind: "edited" },
    ],
  };
  const page = (refusal) => refusedSummaryLines(refusal).join("\n");

  it("names the commit it refused and every file that moved, with how it moved", () => {
    const text = page(STALE);

    expect(text).toContain("### Browser Smoke — refused to measure this build");
    expect(text).toContain("| Commit | `057813d2c983` |");
    expect(text).toContain("| Built | 2026-10-27T21:00:00.000Z |");
    expect(text).toContain("| Refused | 3 inputs changed since this build was made |");
    expect(text).toContain("- `edited` src/styles/app.css");
    expect(text).toContain("- `added` src/main.tsx");
    expect(text).toContain("- `removed` public/catalogue.json");
  });

  it("keeps the files a list rather than the console's indented excerpt", () => {
    // The log prints them as `  edited: path` lines to be read in order; a run page
    // can render a list, where the path is the payload and the kind is beside it.
    expect(refusedSummaryLines(STALE).filter((line) => line.startsWith("- "))).toHaveLength(3);
  });

  it("caps a long excerpt at both ends instead of burying the paths that sort last", () => {
    // A broad `public/` change is what a stale build looks like when data moved: the
    // excerpt is path-sorted, so every one of those paths precedes the edited `src/`
    // file the page is opened to find. A head-only ten printed the additions and
    // stopped, which is the defect a head-only assertion quote had.
    const changed = [
      ...Array.from({ length: 30 }, (_, index) => ({
        path: `public/catalogue/p${String(index).padStart(2, "0")}.json`,
        kind: "added",
      })),
      { path: "src/styles/app.css", kind: "edited" },
    ];
    const lines = refusedSummaryLines({ ...STALE, changed });
    const bullets = lines.filter((line) => line.startsWith("- "));
    const withheldAt = lines.findIndex((line) => line.includes("withheld"));

    expect(bullets).toHaveLength(14);
    expect(bullets).toContain("- `edited` src/styles/app.css");
    expect(lines).toContain("…17 more withheld — the console prints every path that moved.");
    expect(lines).toContain("| Refused | 31 inputs changed since this build was made |");
    // Between the halves, where a reader meets the gap: after the last head path and
    // before the first of the tail, so the tail cannot read as if it followed the
    // head directly.
    expect(withheldAt).toBeGreaterThan(lines.lastIndexOf("- `added` public/catalogue/p09.json"));
    expect(withheldAt).toBeLessThan(lines.indexOf("- `added` public/catalogue/p27.json"));
  });

  it("prints an excerpt that fits inside both ends whole, with nothing withheld", () => {
    const changed = Array.from({ length: 14 }, (_, index) => ({ path: `src/f${index}.ts`, kind: "added" }));
    const lines = refusedSummaryLines({ ...STALE, changed });

    expect(lines.filter((line) => line.startsWith("- "))).toHaveLength(14);
    expect(lines.join("\n")).not.toContain("withheld");
    expect(lines).toContain("| Refused | 14 inputs changed since this build was made |");
  });

  it("says a dirty build started before the changes it lists", () => {
    const text = page({ ...STALE, revision: "057813d2c983-dirty" });

    expect(text).toContain("`057813d2c983-dirty`");
    expect(text).toContain("The `-dirty` suffix says where the build started");
    expect(text).not.toContain("Run `npm run build` and start the walk again.");
  });

  it("says there was no build to name, rather than printing an empty commit", () => {
    const missing = page({ reason: "no-build" });
    const manifestless = page({ reason: "no-manifest" });

    expect(missing).toContain("none — there is no build in `dist/` to name");
    expect(manifestless).toContain("none — the build in `dist/` wrote no manifest");
    for (const text of [missing, manifestless]) {
      expect(text).not.toContain("``");
      expect(text).not.toContain("Files that moved since the build");
    }
  });

  it("renders what the console refused, not a second reading of the tree", () => {
    const root = buildAt("abcdef123456");
    writeFileSync(path.join(root, "src", "styles", "app.css"), ".wm-card { color: blue; }");
    let caught;
    try {
      assertFreshBuild(root);
    } catch (error) {
      caught = error;
    }
    const text = page(caught.refusal);

    expect(text).toContain("`abcdef123456`");
    expect(text).toContain("- `edited` src/styles/app.css");
    for (const file of caught.refusal.changed) expect(caught.message).toContain(file.path);
  });

  it("carries the precondition that refused, so the page can say it", () => {
    const root = scratchProject();
    let caught;
    try {
      assertFreshBuild(root);
    } catch (error) {
      caught = error;
    }

    expect(caught.refusal).toEqual({ reason: "no-build" });
  });
});

describe("assessBuildFreshness", () => {
  it("has nothing to compare when the build wrote no manifest", () => {
    expect(assessBuildFreshness({ manifest: null, inputs: [] })).toEqual({ ok: false, reason: "no-manifest" });
  });

  it("passes a build whose inputs still hash to what it recorded", () => {
    const root = scratchProject({ build: true });
    const assessment = assessBuildFreshness({
      manifest: readBuildManifest(root),
      inputs: collectBuildInputs(root),
    });

    expect(assessment.ok).toBe(true);
    expect(assessment.inputs).toBe(collectBuildInputs(root).length);
  });

  it("catches an edit whose timestamp the file kept", () => {
    const root = scratchProject({ build: true });
    const edited = path.join(root, "src", "styles", "app.css");
    const before = statSync(edited).mtimeMs;
    writeFileSync(edited, ".wm-card { color: blue; }");
    utimesSync(edited, new Date(before), new Date(before));

    const assessment = assessBuildFreshness({
      manifest: readBuildManifest(root),
      inputs: collectBuildInputs(root),
    });

    expect(assessment).toMatchObject({ ok: false, reason: "stale-build" });
    expect(assessment.changed).toEqual([{ path: "src/styles/app.css", kind: "edited" }]);
  });

  it("catches a file the build never read", () => {
    const root = scratchProject({ build: true });
    writeFileSync(path.join(root, "src", "styles", "extra.css"), ".wm-card { color: green; }");

    const assessment = assessBuildFreshness({
      manifest: readBuildManifest(root),
      inputs: collectBuildInputs(root),
    });

    expect(assessment.changed).toEqual([{ path: "src/styles/extra.css", kind: "added" }]);
  });

  it("catches a file the tree no longer has", () => {
    const root = scratchProject({ build: true });
    unlinkSync(path.join(root, "public", "catalogue.json"));

    const assessment = assessBuildFreshness({
      manifest: readBuildManifest(root),
      inputs: collectBuildInputs(root),
    });

    expect(assessment.changed).toEqual([{ path: "public/catalogue.json", kind: "removed" }]);
  });

  it("reports every difference rather than the first one", () => {
    const root = scratchProject({ build: true });
    writeFileSync(path.join(root, "index.html"), "<div id=\"app\"></div>");
    writeFileSync(path.join(root, "src", "styles", "extra.css"), ".wm-card { color: green; }");

    const assessment = assessBuildFreshness({
      manifest: readBuildManifest(root),
      inputs: collectBuildInputs(root),
    });

    expect(assessment.changed.map((file) => `${file.kind}:${file.path}`)).toEqual([
      "edited:index.html",
      "added:src/styles/extra.css",
    ]);
  });
});

describe("the plugin every build runs", () => {
  it("writes the manifest of the bundle it just wrote", () => {
    const root = scratchProject();
    const plugin = buildManifestPlugin();
    plugin.configResolved({ root, build: { outDir: "dist", write: true } });
    plugin.closeBundle();

    expect(readBuildManifest(root).inputs.map((file) => file.path)).toContain("src/styles/app.css");
  });

  it("writes nothing for a build asked not to write its bundle", () => {
    const root = scratchProject();
    const plugin = buildManifestPlugin();
    // `check:init-order` builds in memory through this same config: a manifest
    // from it would call a stale dist/ current.
    plugin.configResolved({ root, build: { outDir: "dist", write: false } });
    plugin.closeBundle();

    expect(readBuildManifest(root)).toBeNull();
  });
});

describe("the manifest a build writes", () => {
  it("records when it finished and the hash of every input", () => {
    const root = scratchProject({ build: true });
    const manifest = readBuildManifest(root);

    expect(manifest.inputs.map((file) => file.path)).toContain("src/styles/app.css");
    expect(Number.isNaN(Date.parse(manifest.builtAt))).toBe(false);
  });

  it("reads nothing from a file it cannot parse", () => {
    const root = scratchProject({ build: true });
    writeFileSync(buildManifestPath(root), "{ not json");

    expect(readBuildManifest(root)).toBeNull();
  });

  it("writes the manifest outside the directory a deployment copies", () => {
    // The image copies dist/ into nginx's document root, so a manifest in there
    // publishes the paths the bundle was built from to anyone who requests it.
    const root = scratchProject({ build: true });

    expect(existsSync(path.join(root, "dist", "build-manifest.json"))).toBe(false);
    expect(existsSync(buildManifestPath(root))).toBe(true);
    expect(path.relative(path.join(root, "dist"), buildManifestPath(root)).startsWith("..")).toBe(true);
  });

  it("keeps its own name per output directory, still outside it", () => {
    const root = scratchProject();

    expect(buildManifestPath(root, "dist/client")).toBe(path.join(root, ".client-build-manifest.json"));
  });

  it("returns null when the build wrote none", () => {
    expect(readBuildManifest(scratchProject())).toBeNull();
  });
});

/**
 * A git command in a scratch project, with an identity so a commit needs no config.
 *
 * Through the shared transient-spawn guard, because this spec spawns a real CLI:
 * a libuv resource-pressure failure under the pre-commit suite's parallel load
 * would otherwise read as a git failure and be rerun by hand.
 */
function git(root, args) {
  return runTool("git", args, "build-freshness", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Build Freshness",
      GIT_AUTHOR_EMAIL: "freshness@example.com",
      GIT_COMMITTER_NAME: "Build Freshness",
      GIT_COMMITTER_EMAIL: "freshness@example.com",
    },
  }).trim();
}

/** A scratch project committed to a repository of its own. */
function committedProject() {
  const root = scratchProject({ build: true });
  git(root, ["init"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "the tree the build read"]);
  return root;
}

/** A build of a scratch project whose manifest names `revision`. */
function buildAt(revision) {
  const root = scratchProject({ build: true });
  writeFileSync(
    buildManifestPath(root),
    JSON.stringify({ ...readBuildManifest(root), revision }, null, 2),
  );
  return root;
}

describe("the commit a build was made at", () => {
  it("records the commit the tree is checked out at", () => {
    const root = committedProject();

    expect(gitRevision(root)).toBe(git(root, ["rev-parse", "--short=12", "HEAD"]));
  });

  it("marks a tree with tracked changes, because that commit holds only part of it", () => {
    const root = committedProject();
    writeFileSync(path.join(root, "src", "styles", "app.css"), ".wm-card { color: blue; }");

    expect(gitRevision(root)).toBe(`${git(root, ["rev-parse", "--short=12", "HEAD"])}-dirty`);
  });

  it("stays clean for an untracked file, which the hashes already cover", () => {
    const root = committedProject();
    writeFileSync(path.join(root, "src", "styles", "untracked.css"), ".wm-card { color: green; }");

    expect(gitRevision(root)).toBe(git(root, ["rev-parse", "--short=12", "HEAD"]));
  });

  it("answers null where there is no repository to ask", () => {
    // An image's build stage and a source archive have no `.git`; a build must not
    // depend on being run from a clone.
    expect(gitRevision(scratchProject())).toBeNull();
  });

  it("is written into the manifest of the build", () => {
    const root = committedProject();
    const manifest = createBuildManifest(root);

    expect(manifest.revision).toBe(git(root, ["rev-parse", "--short=12", "HEAD"]));
  });
});

describe("assertFreshBuild", () => {
  it("reads the tree and lets a current build through", () => {
    const root = scratchProject({ build: true });
    const fresh = assertFreshBuild(root);

    expect(fresh.ok).toBe(true);
    expect(fresh.inputs).toBeGreaterThan(0);
  });

  it("refuses an edit the build never read, naming the file and the command", () => {
    const root = scratchProject({ build: true });
    const edited = path.join(root, "src", "styles", "app.css");
    const before = statSync(edited).mtimeMs;
    writeFileSync(edited, ".wm-card { color: blue; }");
    utimesSync(edited, new Date(before), new Date(before));

    expect(() => assertFreshBuild(root)).toThrow(/src\/styles\/app\.css/);
    expect(() => assertFreshBuild(root)).toThrow(/edited: src\/styles\/app\.css/);
    expect(() => assertFreshBuild(root)).toThrow(/npm run build/);
  });

  it("accepts a file whose timestamp moved but whose bytes did not", () => {
    const root = scratchProject({ build: true });
    const touched = path.join(root, "src", "styles", "app.css");
    utimesSync(touched, new Date("2026-10-28T09:00:00Z"), new Date("2026-10-28T09:00:00Z"));

    expect(() => assertFreshBuild(root)).not.toThrow();
  });

  it("refuses when there is no build at all", () => {
    const root = scratchProject();

    expect(() => assertFreshBuild(root)).toThrow(/there is no build in dist\//);
    expect(() => assertFreshBuild(root)).toThrow(/npm run build/);
  });

  it("refuses a build that wrote no manifest, even though dist/ is there", () => {
    const root = scratchProject({ build: true, manifest: false });

    expect(() => assertFreshBuild(root)).toThrow(/wrote no \.dist-build-manifest\.json/);
    expect(() => assertFreshBuild(root)).toThrow(/npm run build/);
  });

  it("names the commit the stale build was made at", () => {
    // The other pasted failure: "the build is behind the tree" still has to say
    // which commit the measured bundle came from.
    const root = buildAt("abcdef123456");
    writeFileSync(path.join(root, "src", "styles", "app.css"), ".wm-card { color: blue; }");

    expect(() => assertFreshBuild(root)).toThrow(/from abcdef123456/);
  });

  it("hands the refusal to the run page, which does not re-read the tree", () => {
    const root = buildAt("abcdef123456");
    writeFileSync(path.join(root, "src", "styles", "app.css"), ".wm-card { color: blue; }");
    let caught;
    try {
      assertFreshBuild(root);
    } catch (error) {
      caught = error;
    }

    expect(caught.refusal).toMatchObject({ reason: "stale-build", revision: "abcdef123456" });
    expect(caught.refusal.changed).toEqual([{ path: "src/styles/app.css", kind: "edited" }]);
  });
});

describe("the revision on both freshness answers", () => {
  const revision = "abcdef123456";

  it("travels with a current build", () => {
    const root = buildAt(revision);
    const assessment = assertFreshBuild(root);

    expect(assessment).toMatchObject({ ok: true, revision });
  });

  it("travels with a stale one, because that refusal is pasted too", () => {
    const root = buildAt(revision);
    writeFileSync(path.join(root, "index.html"), "<div id=\"app\"></div>");

    expect(assessBuildFreshness({
      manifest: readBuildManifest(root),
      inputs: collectBuildInputs(root),
    })).toMatchObject({ ok: false, reason: "stale-build", revision });
  });

  it("is null for a manifest an older build wrote", () => {
    const root = scratchProject({ build: true });

    expect(assertFreshBuild(root).revision).toBeNull();
  });
});
