import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A file the repository ships twice is one asset with two addresses: the bytes are
 * paid for twice, and a change made to one copy leaves the other saying something
 * else. Which surface suffers depends on where the copy sits — a served photograph
 * is two things to review, a diagram in `docs/` drifts from the one the app
 * renders, a fixture proves something about data its test never reads — so the
 * question is asked of every tracked file that is data or a document rather than of
 * one directory.
 *
 * The population comes from the git index, not from the working tree, because the
 * tree holds copies by design: `data/runtime/` a release-verification unpack of the
 * whole repository, `dist/` a copy of `public/`. Walking the tree would report each
 * source file as a duplicate of its own build output and drown the question the
 * guard is asking.
 *
 * Code is out of scope. A module or a stylesheet is imported or compiled by name, so
 * a second copy of one is a different defect — an import pointing at the wrong
 * module — and the module graph is where that is caught.
 */
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|css|scss|ps1|psm1|sh|py|bat|cmd)$/i;

/**
 * The file-mode store is written by the API while it runs, and the tracked seed of
 * each store is an empty `{}`: three of them are one document until somebody uses
 * the pair, and they will differ the moment somebody does. Their content is what a
 * developer's machine has done, not an asset the repository ships.
 */
const RUNTIME_STATE = /^data\/backend\//;

/**
 * The schema is kept in two trees because it is applied two ways: `server/migrations/`
 * by the operator runbook, `supabase/migrations/` by the GitHub integration. Both
 * copies of a statement have to be the same statement, so a pair is permitted across
 * those two trees and only as a pair — one file each side. This is a rule rather than
 * a list of the pairs that happen to match today, because the list would grow an entry
 * per migration and a guard that has to be extended to stay green stops being read.
 * That the two sets still *mean* the same thing is `check:migration-parity`'s
 * question; this only asks whether the bytes are shared.
 */
const MIRRORED_TREES: ReadonlyArray<readonly [tree: string, mirror: string]> = [
  ["server/migrations/", "supabase/migrations/"],
];

/**
 * The compare and recommendations empty states render identically, so Playwright's
 * two baselines hold the same pixels. `e2e/visual-regression.spec.ts` names both
 * files, so neither can be dropped; the entry fails on the day they differ, which is
 * the day one of those pages changed.
 */
const REVIEWED_COPIES: ReadonlyArray<{ files: string[]; because: string }> = [
  {
    files: [
      "e2e/__screenshots__/visual-regression.spec.ts/compare-empty.png",
      "e2e/__screenshots__/visual-regression.spec.ts/recommendations-empty.png",
    ],
    because: "both are the empty-state baseline, and the two empty states are one rendering",
  },
];

const ROOT = process.cwd();

function trackedAssets(): string[] {
  let listing: string;
  try {
    listing = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString();
  } catch (caught) {
    throw new Error(
      `[asset-duplicates] This guard asks the git index for the files the repository tracks, so it needs a checkout: ${
        caught instanceof Error ? caught.message : String(caught)
      }`,
    );
  }
  return listing
    .split("\0")
    .filter(Boolean)
    .filter((file) => !SOURCE_FILE.test(file) && !RUNTIME_STATE.test(file))
    // An index entry outlives the file when a deletion has not been staged yet, and
    // a file that is not there holds no bytes to compare. A copy becomes visible on
    // the run after it is staged, which is still before it is committed.
    .filter((file) => existsSync(path.join(ROOT, file)));
}

function filesSharingBytes(files: string[]): string[][] {
  const byDigest = new Map<string, string[]>();
  for (const file of files) {
    const digest = createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex");
    byDigest.set(digest, [...(byDigest.get(digest) ?? []), file]);
  }
  return [...byDigest.values()]
    .filter((group) => group.length > 1)
    .map((group) => [...group].sort())
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function permittedByMirror(group: string[]): boolean {
  if (group.length !== 2) return false;
  return MIRRORED_TREES.some(([tree, mirror]) => {
    const [first, second] = group;
    return (first.startsWith(tree) && second.startsWith(mirror)) || (first.startsWith(mirror) && second.startsWith(tree));
  });
}

const key = (group: string[]) => group.join(" | ");

describe("tracked assets", () => {
  it("stores no data or document twice beyond what the repository records", () => {
    // A floor, not a count: the repository tracks hundreds of these files, and an
    // index read that came back short would otherwise report a clean sweep. The
    // guard exists for the copy nobody notices, so it must not go quiet.
    const assets = trackedAssets();
    expect(assets.length).toBeGreaterThan(700);

    const shared = filesSharingBytes(assets);
    const recorded = new Map(REVIEWED_COPIES.map((copy) => [key([...copy.files].sort()), copy.because]));

    expect(
      shared.filter((group) => !permittedByMirror(group) && !recorded.has(key(group))),
      `Two tracked files hold the same bytes, so the repository ships one asset twice and a change to one leaves the other stale. Delete the copy and point its callers at the file that stays, or record the pair here with the reason the duplication is deliberate.`,
    ).toEqual([]);

    expect(
      REVIEWED_COPIES.filter((copy) => !shared.some((group) => key(group) === key([...copy.files].sort()))).map((copy) => copy.files),
      "A recorded copy is no longer byte-identical, so the reason kept here has outlived the duplication it explains. Take the pair out in the same change that made the files differ.",
    ).toEqual([]);
  });
});
