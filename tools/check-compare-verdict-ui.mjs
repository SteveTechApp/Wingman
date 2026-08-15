import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "src", "wingman2", "pages", "ComparePageNew.advanced.tsx");
const source = fs.readFileSync(file, "utf8");

function fail(message) {
  console.error(`Compare verdict UI contract FAILED: ${message}`);
  process.exit(1);
}

const required = [
  'type Verdict = "GOOD MATCH" | "PARTIAL MATCH" | "VERIFY" | "ARCHITECTURE ALTERNATIVE" | "NO MATCH";',
  'match.decision.solutionType === "architecture-alternative"',
  '? "ARCHITECTURE ALTERNATIVE"',
  'match.decision.outcome === "VERIFY"',
  '? "VERIFY"',
  'candidate.verdict === "VERIFY"',
  'return "Evidence required";',
  'candidate.necessaryCoverage.failed > 0',
  'candidate.necessaryCoverage.unknown > 0',
  'candidate.necessaryCoverage.confirmed !== candidate.necessaryCoverage.total',
  'candidate.solutionType !== "direct-equivalent"',
];

for (const marker of required) {
  if (!source.includes(marker)) {
    fail(`missing required implementation marker: ${marker}`);
  }
}

/*
 * Detect only the ACTUAL old collapse implementation:
 *
 *   const verdict: Verdict =
 *     match.decision.outcome === "GOOD MATCH"
 *       ? "GOOD MATCH"
 *       : match.decision.outcome === "NO MATCH"
 *         ? "NO MATCH"
 *         : "PARTIAL MATCH";
 *
 * Do not use a broad regex here: the new correct mapping also ends in
 * PARTIAL MATCH after explicitly handling VERIFY.
 */
const oldCollapseBlock = `const verdict: Verdict =
    match.decision.outcome === "GOOD MATCH"
      ? "GOOD MATCH"
      : match.decision.outcome === "NO MATCH"
        ? "NO MATCH"
        : "PARTIAL MATCH";`;

if (source.includes(oldCollapseBlock)) {
  fail("the legacy VERIFY -> PARTIAL MATCH collapse block is still present");
}

/*
 * Ensure VERIFY is handled before the final PARTIAL MATCH fallback inside
 * the verdict mapping block.
 */
const verdictStart = source.indexOf("const verdict: Verdict =");
const verdictEnd = source.indexOf("return applyCompareEquivalenceGuards(", verdictStart);

if (verdictStart < 0 || verdictEnd < 0) {
  fail("could not locate the verdict mapping block");
}

const verdictBlock = source.slice(verdictStart, verdictEnd);
const verifyPos = verdictBlock.indexOf('match.decision.outcome === "VERIFY"');
const verifyValuePos = verdictBlock.indexOf('? "VERIFY"', verifyPos);
const partialFallbackPos = verdictBlock.lastIndexOf(': "PARTIAL MATCH";');

if (verifyPos < 0 || verifyValuePos < 0) {
  fail("VERIFY is not explicitly preserved in the verdict mapping");
}

if (partialFallbackPos < 0) {
  fail("expected PARTIAL MATCH fallback was not found");
}

if (verifyValuePos > partialFallbackPos) {
  fail("VERIFY handling appears after the PARTIAL MATCH fallback");
}

console.log("Compare verdict UI contract PASS");
console.log(" - VERIFY is preserved as a visible verdict");
console.log(" - architecture alternatives are promoted visibly");
console.log(" - PARTIAL MATCH remains the final known-difference fallback");
console.log(" - confirmed-equivalent requires complete necessary evidence");