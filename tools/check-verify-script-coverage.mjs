#!/usr/bin/env node
/**
 * Guards the verify graph against a script nothing runs.
 *
 * `npm run verify` and `npm run verify:strict` are the two ways this repo asks
 * its questions, and a gate is only a gate while one of them reaches it. The
 * quiet failure is not a red build: it is a script that was added, renamed or
 * moved out of a stage while every remaining check stayed green, so the tree
 * reads as verified and the question is simply never asked. A rename is the
 * commoner shape — changing `check:stored-records` to something new and dropping
 * the old `npm run` line leaves the old name in the chain (npm fails loudly) or
 * takes the line with it (nothing fails at all).
 *
 * So the rule is whole: every script in `package.json` is either reached from
 * `verify` or `verify:strict` through the `npm run` chains, or it is declared in
 * `tools/verify-script-exemptions.json` with what it is instead — a writer, a
 * local server, a suite that needs a browser, a check that needs the live
 * database. The declaration is per script and per reason rather than a prefix
 * exemption (`check:*` is exempt), because a prefix is what a new gate would
 * inherit without anyone deciding it.
 *
 * The exemptions ratchet in both directions, like this repo's other baselines: a
 * script that is declared outside and then wired into a stage fails, because the
 * entry now says a gate is unrun while it runs; and an entry naming a script
 * `package.json` no longer has fails, because that is exactly the rename this
 * guard exists for — the old name stays in the file, the new script is orphaned,
 * and the two lines have to be read together.
 *
 * The guard is wired into `verify:fast`, the lane the pre-commit hook and CI's
 * `Pre-commit lane ×2` job run, so a script that lands outside the graph is
 * caught on the commit that adds it rather than when someone later wonders
 * whether a check still runs.
 *
 * Usage: node tools/check-verify-script-coverage.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expandVerifyChain } from "./verify-chain.mjs";

export const GUARD_SCRIPT = "check:verify-script-coverage";

/**
 * The two entry points a script may hang off.
 *
 * Both, not one: `verify:strict` runs the strict twins instead of `verify:build`,
 * `verify:data` and `verify:contract`, so a gate the normal lane reaches only
 * through a normal stage is a gate a strict run does not ask.
 */
export const VERIFY_ROOTS = ["verify", "verify:strict"];

/** Where a script says what it is instead of being in a verify stage. */
export const EXEMPTIONS_FILE = "tools/verify-script-exemptions.json";

/**
 * Where a tool says what it is instead of being reachable.
 *
 * The same question as the script half, asked one level down. A script can be
 * wired into a stage and still run a tool nothing else names, so a `tools/` file
 * that no script, workflow or import reaches is a question nobody asks — and it
 * is the shape that grows quietly, because deleting a `npm run` line is one edit
 * and the file it called just sits there.
 */
export const TOOL_EXEMPTIONS_FILE = "tools/tool-reach-exemptions.json";

/** Where a tool file lives, and the trees whose imports count as reaching it. */
export const TOOL_DIRECTORY = "tools";
export const TOOL_READERS = ["src", "tools", "server", "e2e"];
export const READER_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

/** A tool file's name: not a test (the runner glob reaches those), not a lib. */
export function isToolFile(name) {
  return name.endsWith(".mjs") && !name.endsWith(".test.mjs");
}

/**
 * Every script a verify entry point runs, transitively, including the entry
 * itself: a root is reached by being the thing a person types.
 */
export function reachableFromVerify(scripts) {
  const reached = new Set();
  for (const root of VERIFY_ROOTS) {
    if (!scripts?.[root]) continue;
    reached.add(root);
    for (const script of expandVerifyChain(scripts, root)) reached.add(script);
  }
  return reached;
}

/**
 * The declared-outside entries, as `{ reason, scripts }` groups.
 *
 * A malformed file is reported rather than thrown at, because the guard's answer
 * to a bad exemptions file is the same as its answer to an orphan: say what is
 * wrong and stop. Anything that is not an array of groups reads as no groups,
 * which turns every script outside the graph into an orphan — the failing
 * direction.
 */
function exemptionGroups(exemptions) {
  const groups = exemptions?.outside;
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((group) => group && typeof group === "object")
    .map((group) => ({
      reason: typeof group.reason === "string" ? group.reason.trim() : "",
      scripts: Array.isArray(group.scripts)
        ? group.scripts.filter((script) => typeof script === "string")
        : [],
    }));
}

/**
 * What is wrong with the script graph, as sentences a person can act on.
 *
 * `scripts` is `package.json`'s `scripts` map and `exemptions` the parsed
 * declarations file, so the judgement is made from two objects and a test needs
 * no checkout.
 */
export function collectVerifyScriptCoverageProblems({ scripts, exemptions }) {
  const problems = [];
  const names = Object.keys(scripts ?? {});
  if (!names.length) {
    problems.push("package.json has no scripts, so there is no verify graph to read.");
    return problems;
  }
  for (const root of VERIFY_ROOTS) {
    if (!scripts?.[root]) {
      problems.push(
        `package.json has no \`${root}\` script, so the entry point this guard reads the graph from does not exist. ` +
          "Restore it, or change VERIFY_ROOTS with it — a graph with no root reaches nothing, and this guard would " +
          "otherwise report every gate in the repo as orphaned.",
      );
    }
  }

  const groups = exemptionGroups(exemptions);
  const declared = new Map();
  for (const group of groups) {
    if (!group.reason) {
      problems.push(
        `An entry in ${EXEMPTIONS_FILE} lists ${group.scripts.length} script${group.scripts.length === 1 ? "" : "s"} ` +
          `(${group.scripts.join(", ") || "none"}) with no reason. The reason is the declaration: it says what the ` +
          "script is instead of a gate, which is the difference between a decision and a gate nobody wired.",
      );
    }
    for (const script of group.scripts) {
      if (declared.has(script)) {
        problems.push(
          `${EXEMPTIONS_FILE} declares \`${script}\` twice (also under "${declared.get(script)}"). One script is one ` +
            "decision; two entries read as two reasons for the same silence.",
        );
        continue;
      }
      declared.set(script, group.reason);
    }
  }

  const reached = reachableFromVerify(scripts);
  const orphans = names.filter((name) => !reached.has(name) && !declared.has(name)).sort();
  if (orphans.length) {
    const count = `${orphans.length} script${orphans.length === 1 ? "" : "s"}`;
    problems.push(
      `${count} in package.json ${orphans.length === 1 ? "is" : "are"} reachable from no verify stage ` +
        `(${VERIFY_ROOTS.map((root) => `\`${root}\``).join(" or ")} reaches ${reached.size} of ${names.length}) ` +
        `and declared outside them: ${orphans.join(", ")}. A gate nothing reaches is not a gate — a line dropped ` +
        "from a stage during a rename leaves the tree green and the question unasked. Add the script to the stage " +
        `that should ask it, or declare it in ${EXEMPTIONS_FILE} with what it is instead.`,
    );
  }

  const unknown = [...declared.keys()].filter((script) => !scripts?.[script]).sort();
  if (unknown.length) {
    problems.push(
      `${EXEMPTIONS_FILE} declares ${unknown.length} script${unknown.length === 1 ? "" : "s"} package.json no longer ` +
        `has: ${unknown.join(", ")}. A rename that leaves the old name here is the quiet half of the failure — ` +
        "the new script is orphaned above and this line keeps excusing the one that is gone. Point the entry at " +
        "the new name, or drop it.",
    );
  }

  const wired = [...declared.keys()].filter((script) => scripts?.[script] && reached.has(script)).sort();
  if (wired.length) {
    problems.push(
      `${EXEMPTIONS_FILE} declares ${wired.length} script${wired.length === 1 ? "" : "s"} that a verify stage ` +
        `already reaches: ${wired.join(", ")}. The entry says a gate is unrun while the pipeline runs it, so the ` +
        "next person reads a decision this repo did not make — drop the entry.",
    );
  }

  return problems;
}

/**
 * The declared-outside tool entries, as `{ reason, files }` groups.
 *
 * Same shape and same failure direction as the script half: anything unreadable
 * reads as no groups, which turns every unreached tool into an orphan.
 */
function toolExemptionGroups(exemptions) {
  const groups = exemptions?.tools;
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((group) => group && typeof group === "object")
    .map((group) => ({
      reason: typeof group.reason === "string" ? group.reason.trim() : "",
      files: Array.isArray(group.files) ? group.files.filter((file) => typeof file === "string") : [],
    }));
}

/** Every tool file the checkout holds, by name. */
export function listToolFiles(projectRoot) {
  const directory = path.join(projectRoot, TOOL_DIRECTORY);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(isToolFile).sort();
}

/**
 * What reaches each tool file: a script, a workflow, or an import.
 *
 * An import is matched in an import position rather than as a bare mention, so a
 * comment naming a tool does not count as reaching it — the same distinction the
 * dead-CSS reading makes between assembly and a string in passing prose.
 */
export function toolReferences(projectRoot) {
  const referenced = new Map();
  const note = (file, where) => {
    if (!referenced.has(file)) referenced.set(file, where);
  };

  const scripts = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")).scripts ?? {};
  const tools = listToolFiles(projectRoot);
  for (const [name, command] of Object.entries(scripts)) {
    for (const tool of tools) {
      if (String(command).includes(`${TOOL_DIRECTORY}/${tool}`)) note(tool, `script \`${name}\``);
    }
  }

  const workflows = path.join(projectRoot, ".github", "workflows");
  if (fs.existsSync(workflows)) {
    for (const file of fs.readdirSync(workflows)) {
      const text = fs.readFileSync(path.join(workflows, file), "utf8");
      for (const tool of tools) {
        if (text.includes(`${TOOL_DIRECTORY}/${tool}`)) note(tool, `.github/workflows/${file}`);
      }
    }
  }

  const walk = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
        continue;
      }
      if (!READER_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) continue;
      const text = fs.readFileSync(full, "utf8");
      const relative = path.relative(projectRoot, full).split(path.sep).join("/");
      for (const tool of tools) {
        if (relative === `${TOOL_DIRECTORY}/${tool}`) continue;
        const escaped = tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // A test naming a tool is the guard's subject, not its caller: counting
        // it would let every tool look reached by the spec that reads it.
        if (/\.test\.[cm]?[jt]sx?$/.test(relative)) continue;
        const imported = new RegExp(`(?:from|import)\\s*\\(?\\s*["'][^"']*${escaped}["']`).test(text);
        if (imported) note(tool, relative);
      }
    }
  };
  for (const reader of TOOL_READERS) walk(path.join(projectRoot, reader));

  // A config names its setup file rather than importing it, so the root's own
  // configs are read by what they name: `globalSetup: "./tools/x.mjs"` is a call
  // site the import rule cannot see.
  for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.config\.[cm]?[jt]s$/.test(entry.name)) continue;
    const text = fs.readFileSync(path.join(projectRoot, entry.name), "utf8");
    for (const tool of tools) {
      const escaped = tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`["'][^"']*${escaped}["']`).test(text)) note(tool, entry.name);
    }
  }

  return referenced;
}

/**
 * What is wrong with the tool graph, as sentences a person can act on.
 *
 * `referenced` is name → the thing that reaches it, so a passing run can say who
 * calls a tool rather than only that somebody does.
 */
export function collectToolReachProblems({ toolFiles, referenced, exemptions }) {
  const problems = [];
  const groups = toolExemptionGroups(exemptions);
  const declared = new Map();

  for (const group of groups) {
    if (!group.reason) {
      problems.push(
        `An entry in ${TOOL_EXEMPTIONS_FILE} lists ${group.files.length} tool file${group.files.length === 1 ? "" : "s"} ` +
          `(${group.files.join(", ") || "none"}) with no reason. The reason is the declaration: it says what the ` +
          "file is instead of a gate, which is the difference between a decision and a tool nobody calls.",
      );
    }
    for (const file of group.files) {
      if (declared.has(file)) {
        problems.push(
          `${TOOL_EXEMPTIONS_FILE} declares \`${file}\` twice (also under "${declared.get(file)}"). One tool is one ` +
            "decision; two entries read as two reasons for the same silence.",
        );
        continue;
      }
      declared.set(file, group.reason);
    }
  }

  const orphans = toolFiles.filter((file) => !referenced.has(file) && !declared.has(file)).sort();
  if (orphans.length) {
    const count = `${orphans.length} tool file${orphans.length === 1 ? "" : "s"}`;
    problems.push(
      `${count} under ${TOOL_DIRECTORY}/ ${orphans.length === 1 ? "is" : "are"} reached by no script, no workflow and no ` +
        `import: ${orphans.join(", ")}. A tool nothing calls is a question nobody asks — deleting the \`npm run\` ` +
        "line that used to call it leaves the file sitting there and the tree green. Wire it into the script that " +
        `should ask it, delete it, or declare it in ${TOOL_EXEMPTIONS_FILE} with what it is instead.`,
    );
  }

  const unknown = [...declared.keys()].filter((file) => !toolFiles.includes(file)).sort();
  if (unknown.length) {
    problems.push(
      `${TOOL_EXEMPTIONS_FILE} declares ${unknown.length} file${unknown.length === 1 ? "" : "s"} that ${TOOL_DIRECTORY}/ ` +
        `no longer has: ${unknown.join(", ")}. A declaration for a file that is gone is a line excusing a question ` +
        "nobody can ask — point it at the file that replaced it, or drop it.",
    );
  }

  const wired = [...declared.keys()].filter((file) => toolFiles.includes(file) && referenced.has(file)).sort();
  if (wired.length) {
    problems.push(
      `${TOOL_EXEMPTIONS_FILE} declares ${wired.length} file${wired.length === 1 ? "" : "s"} something already ` +
        `reaches (${wired.map((file) => `${file} ← ${referenced.get(file)}`).join("; ")}). The entry says a tool is ` +
        "uncalled while the tree calls it, so the next reader trusts a decision this repo did not make — drop the entry.",
    );
  }

  return problems;
}

/** Read the tree's own scripts, tools and declarations, and return the problems. */
export function checkVerifyScriptCoverage(projectRoot) {
  const scripts = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")).scripts ?? {};
  const exemptionsPath = path.join(projectRoot, EXEMPTIONS_FILE);
  const exemptions = fs.existsSync(exemptionsPath)
    ? JSON.parse(fs.readFileSync(exemptionsPath, "utf8"))
    : null;
  const toolExemptionsPath = path.join(projectRoot, TOOL_EXEMPTIONS_FILE);
  const toolExemptions = fs.existsSync(toolExemptionsPath)
    ? JSON.parse(fs.readFileSync(toolExemptionsPath, "utf8"))
    : null;

  return [
    ...collectVerifyScriptCoverageProblems({ scripts, exemptions }),
    ...collectToolReachProblems({
      toolFiles: listToolFiles(projectRoot),
      referenced: toolReferences(projectRoot),
      exemptions: toolExemptions,
    }),
  ];
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let problems;
  let scripts;
  let exemptions;
  let toolExemptions;
  let tools;
  let referenced;
  try {
    scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {};
    const exemptionsPath = path.join(root, EXEMPTIONS_FILE);
    exemptions = fs.existsSync(exemptionsPath)
      ? JSON.parse(fs.readFileSync(exemptionsPath, "utf8"))
      : null;
    const toolExemptionsPath = path.join(root, TOOL_EXEMPTIONS_FILE);
    toolExemptions = fs.existsSync(toolExemptionsPath)
      ? JSON.parse(fs.readFileSync(toolExemptionsPath, "utf8"))
      : null;
    tools = listToolFiles(root);
    referenced = toolReferences(root);
    problems = [
      ...collectVerifyScriptCoverageProblems({ scripts, exemptions }),
      ...collectToolReachProblems({ toolFiles: tools, referenced, exemptions: toolExemptions }),
    ];
  } catch (caught) {
    console.error(`[verify-script-coverage] ${caught instanceof Error ? caught.message : String(caught)}`);
    process.exit(1);
  }
  if (problems.length) {
    console.error("[verify-script-coverage] Check failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      "\nEvery script is either asked by a verify stage or declared outside it with a reason, and every tool under " +
        "tools/ is either called by something or declared with what it is instead; neither is silent.",
    );
    process.exit(1);
  }
  const reached = reachableFromVerify(scripts);
  const outside = namesOutsideVerify(scripts, exemptions);
  const declaredTools = toolExemptionGroups(toolExemptions).flatMap((group) => group.files);
  console.log(
    `[verify-script-coverage] OK — ${reached.size} of package.json's ${Object.keys(scripts).length} scripts are ` +
      `reached from ${VERIFY_ROOTS.map((root) => `\`${root}\``).join(" or ")}; the ${outside} outside it are ` +
      `declared in ${EXEMPTIONS_FILE}, each with what it is instead. ${tools.length - declaredTools.length} of ` +
      `${tools.length} tool files under ${TOOL_DIRECTORY}/ are called by a script, a workflow or an import; the ` +
      `${declaredTools.length} that are not are declared in ${TOOL_EXEMPTIONS_FILE}.`,
  );
}

/** How many scripts are declared outside the graph rather than reached by it. */
function namesOutsideVerify(scripts, exemptions) {
  const reached = reachableFromVerify(scripts);
  const declared = new Set(exemptionGroups(exemptions).flatMap((group) => group.scripts));
  return Object.keys(scripts).filter((name) => !reached.has(name) && declared.has(name)).length;
}
