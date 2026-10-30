import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MINIMUM_COMPARE_SUBJECTS,
  REQUIRED_COMPARE_SUBJECTS,
  compareOutputQualityFailures,
  compareSurfaceFiles,
} from "./audit-compare-output-quality.mjs";

/**
 * A throwaway root holding a Compare surface the audit can read. The filler
 * exists so the population clears the floor: the audit's own claim is that it
 * reads the surface, so a fixture smaller than the floor would fail for the
 * wrong reason.
 */
function fixtureRoot({ filler = MINIMUM_COMPARE_SUBJECTS - REQUIRED_COMPARE_SUBJECTS.length } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "compare-output-"));
  const write = (relativePath, text = "export const copy = \"strong fit areas\";\n") => {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  };

  for (const relativePath of REQUIRED_COMPARE_SUBJECTS) write(relativePath);
  for (let index = 0; index < filler; index += 1) {
    write(`src/wingman2/lib/compareFiller${index}.ts`);
  }
  return { root, write };
}

describe("compare output quality audit", () => {
  it("passes over a surface that reads enough of itself", () => {
    const { root } = fixtureRoot();

    expect(compareOutputQualityFailures({ root }).failures).toEqual([]);
  });

  it("fails when a subject it is about was renamed away", () => {
    // One filler past the floor, so removing the subject answers the rename
    // question alone instead of the population one as well.
    const { root } = fixtureRoot({
      filler: MINIMUM_COMPARE_SUBJECTS - REQUIRED_COMPARE_SUBJECTS.length + 1,
    });
    fs.rmSync(path.join(root, REQUIRED_COMPARE_SUBJECTS[1]));

    const { failures } = compareOutputQualityFailures({ root });

    // The old audit skipped a path it could not find, so a rename left four of
    // its six subjects unread and the run still printed `passed`.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(REQUIRED_COMPARE_SUBJECTS[1]);
    expect(failures[0]).toContain("point this audit at where that copy lives now");
  });

  it("fails when the surface it reads has shrunk under its floor", () => {
    const { root } = fixtureRoot({ filler: 1 });

    const { failures } = compareOutputQualityFailures({ root });

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(`under the floor of ${MINIMUM_COMPARE_SUBJECTS}`);
    expect(failures[0]).toContain("a smaller population is not a cleaner one");
  });

  it("names the file and line a banned phrase came back on", () => {
    const { root, write } = fixtureRoot();
    write(
      "src/wingman2/pages/compare/compareVerdictCopy.ts",
      "export const heading = \"Where it matches\";\n",
    );

    const { failures } = compareOutputQualityFailures({ root });

    expect(failures).toHaveLength(1);
    expect(failures[0]).toBe(
      'src/wingman2/pages/compare/compareVerdictCopy.ts:1 contains "Where it matches" — Use a specific heading such as Strong fit areas.',
    );
  });

  it("reads the surface rather than a list, and leaves its tests alone", () => {
    const { root, write } = fixtureRoot();
    write("src/wingman2/pages/compare/compareNewModule.tsx", "export const a = 1;\n");
    write("src/wingman2/pages/compare/compareNewModule.test.tsx", "// Where it matches\n");

    const files = compareSurfaceFiles(root);

    expect(files).toContain("src/wingman2/pages/compare/compareNewModule.tsx");
    // A test asserting the guard is not output copy, and reading it would make
    // the audit fail on its own spec.
    expect(files).not.toContain("src/wingman2/pages/compare/compareNewModule.test.tsx");
    expect(compareOutputQualityFailures({ root }).failures).toEqual([]);
  });
});
