#!/usr/bin/env node
/**
 * Guards the build stage's own wiring, for every gate it is trusted for.
 *
 * `check:init-order` asks the bundler whether a page load can run a module-scope
 * read before the chunk it takes from; `check:published-surface` asks whether a
 * build-written file in `dist/` names a source module, a build script or a path
 * from the machine that built it. Each is the only gate that answers its
 * question, and each is the kind of gate that goes quiet without failing: delete
 * its line from `verify:build`, or its step from the CI Build job, and every
 * other check still passes while the question stops being asked.
 *
 * This guard therefore lives outside the gates it guards, and away from the
 * chain it inspects: a self-check inside a gate cannot report its own removal,
 * and one inside `verify:build` disappears with the line it is meant to protect.
 * `verify:contract` is where the other wiring guards already sit
 * (`check:short-workflow-pages`, `check:project-sync`), and CI's Verify matrix
 * runs that stage whether or not the Build job still does its job.
 *
 * Two wirings are pinned for every entry in `BUILD_GATES`:
 *
 *   - `verify:build` must include the gate's script, read through
 *     `expandVerifyChain` so a step nested one stage deeper still counts;
 *   - the CI `build:` job must invoke it, either by name or through a script
 *     whose chain reaches it — which is what keeps a job that runs `verify:build`
 *     covered without naming the tool, as long as the stage above still holds it.
 *
 * The list is the only place a gate is named, and each entry carries what its
 * gate answers and why it belongs in this stage, so a gate that was unwired is
 * reported with the question that stopped being asked rather than only with the
 * line to restore. A third build-stage gate is an entry here.
 *
 * Usage: node tools/check-init-order-wiring.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expandVerifyChain } from "./verify-chain.mjs";

export const BUILD_STAGE = "verify:build";
export const CI_WORKFLOW = ".github/workflows/ci.yml";
export const CI_JOB = "build";

/**
 * The gates `verify:build` is trusted for, in one list.
 *
 * `question` is what the gate answers and `stage` is why it belongs in this
 * stage, both read into the failure a person sees; `afterBuild` is where the CI
 * step belongs, said in the words of that job. An entry is the whole wiring —
 * the script, the stage and the job step — so a new build-stage gate is added
 * here and nowhere else.
 */
export const BUILD_GATES = [
  {
    script: "check:init-order",
    question: "can a page load read an imported binding before the chunk it takes from evaluates?",
    stage:
      "the question is about the chunk graph the build just wrote, and a chunk-group change that reorders two chunks "
      + "is invisible to every other check.",
    afterBuild: "which is where the chunk groups it inspects are written",
  },
  {
    script: "check:published-surface",
    question: "does a build-written file in `dist/` name a source module, a build script or a path from the build machine?",
    stage:
      "the gate reads the artifacts the build just wrote, and everything in that directory is readable by anyone who asks "
      + "for it, so a path in one publishes the tree the bundle was made from.",
    afterBuild: "which is where the files it reads are written",
  },
];

const RUN_LINE = /^\s*(?:-\s+)?run:\s*(.*)$/;
const JOB_HEADER = /^\s{2}([A-Za-z0-9_-]+):\s*$/;
const NPM_RUN = /npm run ([a-zA-Z0-9:_-]+)/g;

function linesOf(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").split("\n");
}

/**
 * The commands a job runs, as text blocks.
 *
 * A `run:` line either carries its command or opens a block scalar (`|` or `>`)
 * whose body is indented past it — both shapes are read, because a job that
 * moved its steps into a multi-line script would otherwise look like a job that
 * runs nothing.
 */
export function jobRunCommands(jobLines) {
  const commands = [];
  for (let index = 0; index < jobLines.length; index += 1) {
    const match = jobLines[index].match(RUN_LINE);
    if (!match) continue;
    const inline = match[1].trim();
    if (inline && !/^[|>][+-]?$/.test(inline)) {
      commands.push(inline);
      continue;
    }
    const indent = jobLines[index].length - jobLines[index].trimStart().length;
    const body = [];
    for (let next = index + 1; next < jobLines.length; next += 1) {
      const line = jobLines[next];
      const lineIndent = line.length - line.trimStart().length;
      if (line.trim() !== "" && lineIndent <= indent) break;
      body.push(line.trim());
    }
    commands.push(body.join("\n"));
  }
  return commands;
}

/** The lines of a top-level job, from its header to the next job's. */
export function jobRegion(ciText, jobName) {
  const lines = linesOf(ciText);
  const start = lines.findIndex((line) => {
    const match = line.match(JOB_HEADER);
    return match ? match[1] === jobName : false;
  });
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (JOB_HEADER.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end);
}

/**
 * Every script a command reaches, including the command itself.
 *
 * Exported because the CI stage guard asks the same question of the same `run:`
 * lines: a step that names a stage directly and one that reaches it through
 * another script are both "running" that stage, and two readers of that would
 * drift the day one of them learned a new shape.
 */
export function scriptsReached(command, scripts) {
  const reached = new Set();
  for (const match of command.matchAll(NPM_RUN)) {
    const script = match[1];
    reached.add(script);
    for (const nested of expandVerifyChain(scripts, script)) reached.add(nested);
  }
  return reached;
}

/**
 * What is wrong with the build stage's wiring, as sentences a person can act on.
 *
 * `scripts` is `package.json`'s `scripts` map and `ci` the workflow text, so the
 * whole judgement is made from two strings and a test needs neither a checkout
 * nor a build. The stage and the job are each reported once, because they hold
 * every gate in the list; a gate is reported through its own entry, so a
 * deletion says which question stopped being asked.
 */
export function collectBuildStageWiringProblems({ scripts, ci }) {
  const problems = [];

  const job = jobRegion(ci, CI_JOB);
  if (!job) {
    problems.push(`${CI_WORKFLOW} has no \`${CI_JOB}:\` job, so nothing builds the app in CI before the stages run.`);
  }

  if (!scripts?.[BUILD_STAGE]) {
    problems.push(`package.json has no \`${BUILD_STAGE}\` script, so the build stage these gates belong to is gone.`);
  }

  const holdsStage = Boolean(scripts?.[BUILD_STAGE]);
  const reachedInCi = job ? jobRunCommands(job) : null;

  for (const gate of BUILD_GATES) {
    // A gate whose script is gone is reported once: the stage line cannot list a
    // script that no longer exists, so the stage and job readings would only
    // restate a deletion the first sentence already names.
    if (!scripts?.[gate.script]) {
      problems.push(
        `package.json has no \`${gate.script}\` script. The question it answers — ${gate.question} — has no other gate `
        + "in this repo.",
      );
      continue;
    }

    if (holdsStage && !expandVerifyChain(scripts, BUILD_STAGE).has(gate.script)) {
      problems.push(
        `package.json \`${BUILD_STAGE}\` does not include \`${gate.script}\`. It belongs in the build stage: ${gate.stage}`,
      );
    }

    if (reachedInCi && !reachedInCi.some((command) => scriptsReached(command, scripts).has(gate.script))) {
      problems.push(
        `${CI_WORKFLOW}: the \`${CI_JOB}\` job no longer runs \`${gate.script}\` — neither by name nor through a `
        + `script that reaches it. Add a step (\`run: npm run ${gate.script}\`) after the build, ${gate.afterBuild}.`,
      );
    }
  }

  return problems;
}

/** Read the tree's own wiring and return the problems, if any. */
export function checkBuildStageWiring(projectRoot) {
  const scripts = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")).scripts ?? {};
  const ci = fs.readFileSync(path.join(projectRoot, CI_WORKFLOW), "utf8");
  return collectBuildStageWiringProblems({ scripts, ci });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let problems;
  try {
    problems = checkBuildStageWiring(root);
  } catch (caught) {
    console.error(`[build-stage-wiring] ${caught instanceof Error ? caught.message : String(caught)}`);
    process.exit(1);
  }
  if (problems.length) {
    console.error("[build-stage-wiring] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nThe build gates exist to be wired; unwired, each answers nothing.");
    process.exit(1);
  }
  const gates = BUILD_GATES.map((gate) => `\`${gate.script}\``).join(" and ");
  console.log(
    `[build-stage-wiring] OK — \`${BUILD_STAGE}\` includes ${gates} and the CI \`${CI_JOB}\` job runs each after the build.`,
  );
}
