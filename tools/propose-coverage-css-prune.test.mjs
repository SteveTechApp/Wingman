import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { coveragePruneProposal } from "./propose-coverage-css-prune.mjs";

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

it("requires coverage plus absent classes, preserving source, docs, generated and pseudo rules", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coverage-prune-"));
  roots.push(root);
  const file = "src/wingman2/styles/test.css";
  const selectors = [".gone", ".live", ".documented", ".generated", ".old .live", ".pseudo:not(.other)", ".not-measured"];
  const files = {
    [file]: selectors.map((selector) => `${selector} { color: red; }`).join("\n"),
    "src/wingman2/view.tsx": 'const classes = "live";',
    "docs/example.md": "The documented class remains supported.",
    "reports/css-coverage.json": JSON.stringify({ unmatched: selectors.slice(0, -1).map((selector) => ({ file, selector, generated: selector === ".generated" })) }),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  const proposal = coveragePruneProposal({ root });
  expect(proposal.removed.map((entry) => entry.selector)).toEqual([".gone"]);
  expect(fs.readFileSync(path.join(root, file), "utf8")).toBe(files[file]);
  expect(fs.readFileSync(path.join(root, "reports/coverage-css-prune.diff"), "utf8")).toContain("unused classes: gone");
});
