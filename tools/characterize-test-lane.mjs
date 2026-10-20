import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function classifyRuns(first, second) {
  if (!Number.isInteger(first) || !Number.isInteger(second)) return "incomplete";
  if (first === 0 && second === 0) return "passed";
  if ((first === 0) !== (second === 0)) return "flake";
  return "failed-both";
}

export function characterize(lane, run = spawnSync) {
  const scripts = { crash: "test:crash-atomicity", precommit: "precommit:check" };
  if (!scripts[lane]) throw new Error(`Unknown lane: ${lane}`);
  const directory = path.resolve("data/runtime/flake-characterization", lane);
  fs.mkdirSync(directory, { recursive: true });
  const codes = [];
  const tails = [];
  for (const pass of [1, 2]) {
    const log = path.join(directory, `pass-${pass}.log`);
    const fd = fs.openSync(log, "w");
    let result;
    try {
      result = run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", scripts[lane]], {
        stdio: ["ignore", fd, fd], shell: process.platform === "win32", windowsHide: true,
      });
    } finally { fs.closeSync(fd); }
    codes.push(result.status);
    if (result.error) fs.appendFileSync(log, `\n${result.error.message}\n`);
    tails.push(fs.readFileSync(log, "utf8").split(/\r?\n/).slice(-60).join("\n"));
  }
  const classification = classifyRuns(...codes);
  const summary = `## ${lane} lane ×2: ${classification}\n\n| Pass | Exit |\n| --- | --- |\n| 1 | ${codes[0] ?? "not completed"} |\n| 2 | ${codes[1] ?? "not completed"} |\n`;
  const body = summary + tails.map((tail, index) => `\n### Pass ${index + 1} log tail\n\n\`\`\`text\n${tail.replaceAll("```", "~~~")}\n\`\`\`\n`).join("");
  fs.writeFileSync(path.join(directory, "incident.md"), body);
  fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify({ lane, codes, classification }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `classification=${classification}\n`);
  console.log(body);
  return classification === "passed" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = characterize(process.argv[2] || "crash");
