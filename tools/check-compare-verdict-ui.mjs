import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pageEntry = path.join(root, "src", "wingman2", "pages", "ComparePageNew.advanced.tsx");
// The verdict mapping is being emptied into `pages/compare/` block by block, so
// the behaviour markers below are read from the page entry plus every non-test
// module it renders from. Reading only the entry would pass a build whose mapping
// merely changed file.
const compareModuleDir = "src/wingman2/pages/compare";
const compareModules = fs
  .readdirSync(path.join(root, compareModuleDir))
  .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
  .sort()
  .map((name) => path.join(root, compareModuleDir, name));

/**
 * The two things this contract is about now live in their own files.
 *
 * The union moved to the pipeline module, and the mapping that decides which
 * member a candidate gets moved to the normalisation module. Neither is in the
 * page, and asking the page for either is how this check came to fail on a
 * correct tree: the marker it wanted was a one-line union the page never held,
 * and the ordering it measured was taken from whichever `const verdict: Verdict`
 * came first in a concatenation of every module.
 */
const UNION_HOME = path.join(root, "src", "wingman2", "lib", "compareVerdictPipeline.ts");
const MAPPING_HOME = path.join(root, compareModuleDir, "compareMatchNormalisation.ts");

const VERDICT_MEMBERS = [
  "GOOD MATCH",
  "PARTIAL MATCH",
  "VERIFY",
  "ARCHITECTURE ALTERNATIVE",
  "NO MATCH",
];

const source = [pageEntry, ...compareModules].map((entry) => fs.readFileSync(entry, "utf8")).join("\n\n");

function fail(message) {
  console.error(`Compare verdict UI contract FAILED: ${message}`);
  process.exit(1);
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

/**
 * The union as a set of members, not as a line of text.
 *
 * The members are the contract: adding a verdict a surface does not render, or
 * dropping one the mapping can produce, is the failure worth catching. Where the
 * union is line-broken and which order its members sit in are formatting, and a
 * marker that pinned the formatting is a marker that fails when a prettier run
 * touches the file and passes when a member is added on a new line.
 */
function readVerdictUnion() {
  const text = fs.readFileSync(UNION_HOME, "utf8");
  const declared = /export type Verdict =([\s\S]*?);/.exec(text);
  if (!declared) {
    fail(`${relative(UNION_HOME)} no longer declares \`export type Verdict\`.`);
  }

  return [...declared[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const members = readVerdictUnion();
const unexpected = members.filter((member) => !VERDICT_MEMBERS.includes(member));
const missing = VERDICT_MEMBERS.filter((member) => !members.includes(member));

if (unexpected.length) {
  fail(`\`Verdict\` in ${relative(UNION_HOME)} names ${unexpected.join(", ")}, which no surface is written to render.`);
}
if (missing.length) {
  fail(`\`Verdict\` in ${relative(UNION_HOME)} no longer names ${missing.join(", ")}, which the verdict mapping can still produce.`);
}

// One home. A second `type Verdict` in the page or a compare module is a copy that
// can drift from the union the pipeline exports, which is the failure this whole
// contract exists to prevent — and it would also make every marker below pass
// against a type the candidates are not actually typed by.
for (const entry of [pageEntry, ...compareModules]) {
  const text = fs.readFileSync(entry, "utf8");
  if (/^\s*(?:export\s+)?(?:type\s+Verdict\s*=|interface\s+Verdict\b)/m.test(text)) {
    fail(`${relative(entry)} declares its own \`Verdict\`; the union lives in ${relative(UNION_HOME)}.`);
  }
}

const required = [
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
 * Ensure VERIFY is handled before the final PARTIAL MATCH fallback inside the
 * verdict mapping block — the one in the module that owns the mapping, found by
 * that module's own anchors rather than by position in a concatenation.
 */
const mapping = fs.readFileSync(MAPPING_HOME, "utf8");
const verdictStart = mapping.indexOf("const verdict: Verdict =");
const verdictEnd = mapping.indexOf("return applyCompareEquivalenceGuards(", verdictStart);

if (verdictStart < 0 || verdictEnd < 0) {
  fail(`could not locate the verdict mapping block in ${relative(MAPPING_HOME)}`);
}

const verdictBlock = mapping.slice(verdictStart, verdictEnd);
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
console.log(` - \`Verdict\` is the ${VERDICT_MEMBERS.length} members declared in ${relative(UNION_HOME)}, and nowhere else`);
console.log(` - ${relative(MAPPING_HOME)} maps VERIFY before the PARTIAL MATCH fallback`);
console.log(" - VERIFY is preserved as a visible verdict");
console.log(" - architecture alternatives are promoted visibly");
console.log(" - PARTIAL MATCH remains the final known-difference fallback");
console.log(" - confirmed-equivalent requires complete necessary evidence");
