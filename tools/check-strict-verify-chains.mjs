#!/usr/bin/env node
/**
 * Guards the strict verify chains against the stages they replace.
 *
 * `npm run verify` runs five stages; `npm run verify:strict` runs the same
 * pipeline with a deeper version of three of them — `verify:build:strict`,
 * `verify:data:strict`, `verify:contract:strict` — instead of the normal ones.
 * `verify:strict` therefore does NOT run `verify:contract`: the strict stage is
 * the only contract lane that lane has.
 *
 * That is what makes a gate missing from a strict chain a silent loss rather
 * than a duplicate. The gate still runs on every commit and in CI, so nothing
 * looks wrong; the strict lane — the one a release uses to ask the deeper
 * question — simply stops asking it, and its green run says the opposite. Two
 * shapes of that loss are checked here:
 *
 *   - a gate the normal stage runs that the strict stage does not. Every gate
 *     the stage holds has to survive the deeper version, because the deeper
 *     version is what runs instead of it;
 *   - a strict stage the strict lane no longer composes at all — one deleted
 *     line in `verify:strict` and the whole category is unasked while the other
 *     stages keep the lane green.
 *
 * `verify:visual` has no strict twin, so the strict lane is held to still run it
 * as it is. `verify:fast`'s deeper form is inline in `verify:strict`
 * (`typecheck`, `lint`, `test:strict`) rather than a stage with a twin, so it is
 * not one of the pairs here.
 *
 * A gate does not have to have a script name to be a gate. `verify:data` once
 * opened with `node tools/data-revision-status.mjs`, and a comparison of npm
 * script names could not see that line at all — the stage would have been free to
 * stop asking a tool the strict twin never ran. So the pair is compared twice:
 * once over the scripts each stage reaches, and once over the tools each stage
 * calls with `node` directly. The tool is the identity there rather than its
 * arguments, so a strict twin may run the same file with deeper flags and still
 * count. There is no exemption: the notice that line printed is now
 * `notice:data-revision`, a script both data stages run, because a notice is not
 * a reason to stop comparing the four gates beside it.
 *
 * The guard is wired into `verify:fast`, which is what the pre-commit hook and
 * CI's `Pre-commit lane ×2` job run: a strict-lane wiring problem is caught on
 * the commit that introduces it, not on the release that trusts the lane.
 *
 * Usage: node tools/check-strict-verify-chains.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expandVerifyChain } from "./verify-chain.mjs";

export const GUARD_SCRIPT = "check:strict-verify-chains";
export const STRICT_LANE = "verify:strict";

/**
 * The stages whose deeper form replaces them in the strict lane.
 *
 * A stage is a pair because both scripts exist; `verify:visual` runs unchanged,
 * which is why it is held separately below.
 */
export const STRICT_STAGE_PAIRS = ["build", "data", "contract"];

/**
 * A direct `node <tool>` call, as the tool path it runs.
 *
 * Only the file is captured, not its arguments: what makes a tool a gate is what
 * it checks, and a strict twin that runs the same file with deeper flags is
 * still asking the same question.
 */
const NODE_TOOL = /\bnode\s+((?:\.\/)?[\w@./-]+\.(?:mjs|js|cjs))/g;

/**
 * Every tool a stage runs with `node`, through its own line or through a script
 * it reaches.
 *
 * The stage's own body is read alongside `expandVerifyChain`, because the chain
 * helper answers which scripts are reached and a bare `node tools/x.mjs` is not
 * one — a stage that opens with such a line is exactly that shape, which is what
 * the data stage's revision notice used to be. A tool reached through a nested
 * script is included too: the stage runs it either way, and a strict twin must
 * ask it either way.
 */
export function collectDirectNodeTools(scripts, entry) {
  const tools = new Set();
  const bodies = [entry, ...expandVerifyChain(scripts, entry)].map((name) => String(scripts?.[name] ?? ""));
  for (const body of bodies) {
    for (const match of body.matchAll(NODE_TOOL)) tools.add(match[1].replace(/^\.\//, ""));
  }
  return tools;
}

/** The stage the strict lane runs without a deeper twin. */
export const SHARED_STAGE = "visual";

/**
 * What is wrong with the strict chains, as sentences a person can act on.
 *
 * `scripts` is `package.json`'s `scripts` map, so the judgement is made from one
 * object and a test needs no checkout.
 */
export function collectStrictChainProblems({ scripts }) {
  const problems = [];
  const lane = expandVerifyChain(scripts, STRICT_LANE);
  if (!lane.size) {
    problems.push(
      `package.json has no \`${STRICT_LANE}\` script, so the deeper lane this guard is about does not exist. ` +
        "Restore it, or delete this guard with it — a strict chain nothing composes is a stage nobody runs.",
    );
    return problems;
  }

  for (const stage of STRICT_STAGE_PAIRS) {
    const normal = `verify:${stage}`;
    const strict = `${normal}:strict`;

    if (!scripts?.[normal]) {
      problems.push(`package.json has no \`${normal}\` script, so there is no normal ${stage} stage to hold the strict one to.`);
      continue;
    }
    if (!scripts?.[strict]) {
      problems.push(
        `package.json has no \`${strict}\` script, and \`${STRICT_LANE}\` runs the strict stages instead of the normal ones — ` +
          `so the ${stage} gates have no lane at all in a strict run.`,
      );
      continue;
    }

    // Every gate the normal stage holds, including the ones it reaches through
    // another script: a gate nested one step deeper is still asked by the stage.
    const strictChain = expandVerifyChain(scripts, strict);
    const missing = [...expandVerifyChain(scripts, normal)]
      .filter((script) => script !== normal && !strictChain.has(script))
      .sort();
    if (missing.length) {
      const count = `${missing.length} gate${missing.length === 1 ? "" : "s"}`;
      problems.push(
        `\`${strict}\` does not run ${count} that \`${normal}\` runs: ${missing.join(", ")}. ` +
          `\`${STRICT_LANE}\` composes \`${strict}\` in place of \`${normal}\`, so a gate that lives only in the normal ` +
          "chain stops being asked exactly when the deeper run is trusted.",
      );
    }

    // The gates that are not script names: a stage's own `node tools/x.mjs` line,
    // and any such line in a script it reaches. Nothing is exempt, so a stage that
    // wants a line in only one of the pair has to say why by giving it a script
    // name both stages can run.
    const strictTools = collectDirectNodeTools(scripts, strict);
    const missingTools = [...collectDirectNodeTools(scripts, normal)]
      .filter((tool) => !strictTools.has(tool))
      .sort();
    if (missingTools.length) {
      const count = `${missingTools.length} tool${missingTools.length === 1 ? "" : "s"}`;
      problems.push(
        `\`${strict}\` does not run ${count} that \`${normal}\` calls with \`node\` directly: ` +
          `${missingTools.map((tool) => `node ${tool}`).join(", ")}. A tool named on the stage's own line is not an npm ` +
          `script, so a comparison of script names cannot see it — and \`${STRICT_LANE}\` composes \`${strict}\` in place of ` +
          `\`${normal}\`, so a line that lives only in the normal stage stops being asked exactly when the deeper run is ` +
          "trusted. Give the tool a script name both stages run, or add it to the strict stage.",
      );
    }

    if (!lane.has(strict)) {
      problems.push(
        `\`${STRICT_LANE}\` no longer runs \`${strict}\`, so every ${stage} gate is unasked in a strict run while the ` +
          "rest of the lane stays green. The strict stage is what replaces the normal one; compose it.",
      );
    }
  }

  if (scripts?.[`verify:${SHARED_STAGE}`] && !lane.has(`verify:${SHARED_STAGE}`)) {
    problems.push(
      `\`${STRICT_LANE}\` no longer runs \`verify:${SHARED_STAGE}\` — the ${SHARED_STAGE} stage has no deeper twin, so ` +
        "that line is the only place a strict run asks those gates.",
    );
  }

  return problems;
}

/** Read the tree's own chains and return the problems, if any. */
export function checkStrictVerifyChains(projectRoot) {
  const scripts = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")).scripts ?? {};
  return collectStrictChainProblems({ scripts });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let problems;
  try {
    problems = checkStrictVerifyChains(root);
  } catch (caught) {
    console.error(`[strict-verify-chains] ${caught instanceof Error ? caught.message : String(caught)}`);
    process.exit(1);
  }
  if (problems.length) {
    console.error("[strict-verify-chains] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nThe strict lane replaces the normal stages; it cannot be the narrower of the two.");
    process.exit(1);
  }
  console.log(
    `[strict-verify-chains] OK — ${STRICT_STAGE_PAIRS.map((stage) => `verify:${stage}:strict`).join(", ")} each run ` +
      "every gate and direct `node` tool their normal stage runs, " +
      `\`${STRICT_LANE}\` composes all three, and verify:${SHARED_STAGE} still runs.`,
  );
}
