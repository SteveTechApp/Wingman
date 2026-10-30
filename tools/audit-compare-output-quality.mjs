import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Compare output-language guard.
 *
 * The population is the live Compare surface rather than a hand-list of files.
 * A hand-list goes quiet without failing: four of the six paths this audit once
 * named were renamed away, so it read two files and printed `passed` while the
 * copy it exists to catch could have lived anywhere in the other forty. Two
 * floors replace that silence — the page entry and the eligibility engine must
 * exist, and the sweep must read a population big enough to be the surface —
 * so a rename fails here and gets repointed instead of shrinking the subject.
 */

/** Files the audit is about; a missing one is a rename, not an empty subject. */
export const REQUIRED_COMPARE_SUBJECTS = [
  "src/wingman2/pages/ComparePageNew.advanced.tsx",
  "src/wingman2/lib/compareEligibilityEngine.ts",
];

/** Where the Compare surface lives, matched by name rather than listed. */
export const COMPARE_SURFACE_SOURCES = [
  {
    directory: "src/wingman2/pages",
    match: (name) => /^ComparePageNew.*\.tsx$/.test(name) && !/\.test\.tsx$/.test(name),
  },
  {
    directory: "src/wingman2/pages/compare",
    match: (name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name),
  },
  {
    directory: "src/wingman2/lib",
    match: (name) => /^compare.*\.ts$/.test(name) && !/\.test\.ts$/.test(name),
  },
];

/**
 * The smallest population that is still the surface. The sweep reads 48 files
 * today; a floor well under that catches the directory being renamed, which is
 * the failure that looks like a pass.
 */
export const MINIMUM_COMPARE_SUBJECTS = 10;

export const BANNED_PHRASES = [
  ["Where it matches", "Use a specific heading such as Strong fit areas."],
  ["Where it does not match", "Use Important differences or Commercial gap."],
  ["Other viable options", "Use Other related WyreStorm options only when genuinely related."],
  ["Wrong-product avoidance", "Internal engineering wording, not suitable for sales users."],
  ["Next question:", "Use Check before quoting."],
  [
    "network ready for the required bandwidth, switching and controller expectations",
    "Too vague for non-technical sales output.",
  ],
  [
    "keep the recommendation tied to the customer workflow",
    "Internal reasoning, not customer-safe comparison output.",
  ],
];

/** Every non-test file whose copy the audit reads, as repo-relative paths. */
export function compareSurfaceFiles(root) {
  const files = new Set(REQUIRED_COMPARE_SUBJECTS);
  for (const { directory, match } of COMPARE_SURFACE_SOURCES) {
    let names;
    try {
      names = fs.readdirSync(path.join(root, directory));
    } catch {
      continue;
    }
    for (const name of names) {
      if (match(name)) files.add(`${directory}/${name}`);
    }
  }
  return [...files].sort();
}

/**
 * The failures this audit reports, in reading order: the subjects it could not
 * read, then the population, then the copy. Empty means the surface is clean.
 */
export function compareOutputQualityFailures({ root = process.cwd() } = {}) {
  const failures = [];

  for (const relativePath of REQUIRED_COMPARE_SUBJECTS) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      failures.push(
        `${relativePath} is missing — point this audit at where that copy lives now rather than reading the rest of the surface alone.`,
      );
    }
  }

  const subjects = compareSurfaceFiles(root).filter((relativePath) =>
    fs.existsSync(path.join(root, relativePath)),
  );

  if (subjects.length < MINIMUM_COMPARE_SUBJECTS) {
    failures.push(
      `read only ${subjects.length} Compare subject(s), under the floor of ${MINIMUM_COMPARE_SUBJECTS} — the surface moved, and a smaller population is not a cleaner one.`,
    );
  }

  for (const relativePath of subjects) {
    const text = fs.readFileSync(path.join(root, relativePath), "utf8");
    for (const [phrase, reason] of BANNED_PHRASES) {
      const index = text.indexOf(phrase);
      if (index === -1) continue;
      const line = text.slice(0, index).split(/\r?\n/).length;
      failures.push(`${relativePath}:${line} contains "${phrase}" — ${reason}`);
    }
  }

  return { failures, subjects };
}

function main() {
  const { failures, subjects } = compareOutputQualityFailures({ root: process.cwd() });

  if (failures.length) {
    console.error("[compare-output-quality] Check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `[compare-output-quality] Live Compare output language guard passed over ${subjects.length} subject file(s); evidence rendering is covered by the governed render suites.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
