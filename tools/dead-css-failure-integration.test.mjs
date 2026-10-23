import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import YAML from "js-yaml";

const roots = [];
const sourceRoot = process.cwd();
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dead-css-hook-"));
  roots.push(root);
  const copied = [".githooks/pre-commit", "tools/autofix-dead-css.mjs", "tools/check-wingman-dead-css-baseline.mjs", "tools/lib/dead-css.mjs", "tools/lib/atomic-json-writer.mjs"];
  for (const file of copied) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(sourceRoot, file), path.join(root, file));
  }
  fs.mkdirSync(path.join(root, "src/wingman2"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/wingman2/theme.css"), ".fixture-obsolete { color: red; }\n");
  fs.writeFileSync(path.join(root, "tools/wingman-dead-css-baseline.json"), JSON.stringify({ deadSelectors: [] }));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: {
    "check:dead-css": "node tools/check-wingman-dead-css-baseline.mjs",
    "precommit:check": "node -e \"throw new Error('Later checks must not run')\"",
  } }));
  execFileSync("git", ["init", "-q"], { cwd: root, stdio: "pipe" });
  return root;
}

it("the actual precommit hook blocks new dead rules and prints an applicable proposal", () => {
  const root = fixture();
  const bash = process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:/Program Files", "Git/bin/bash.exe") : "bash";
  const run = spawnSync(bash, [".githooks/pre-commit"], { cwd: root, encoding: "utf8", timeout: 20000 });
  expect(run.error).toBeUndefined();
  expect(run.status, run.stderr).toBe(1);
  expect(run.stdout).toContain("Commit blocked (dead CSS gate failed)");
  expect(run.stdout).toContain("-.fixture-obsolete { color: red; }");
  expect(run.stdout).not.toContain("Later checks must not run");
  expect(fs.readFileSync(path.join(root, "src/wingman2/theme.css"), "utf8")).toContain(".fixture-obsolete");
  execFileSync("git", ["apply", "--check", "reports/dead-css-proposal.diff"], { cwd: root, stdio: "pipe" });
}, 30000);

it("the CI failure artifact paths resolve to files produced by its real command", () => {
  const root = fixture();
  const ci = YAML.load(fs.readFileSync(path.join(sourceRoot, ".github/workflows/ci.yml"), "utf8"));
  const steps = ci.jobs.verify.steps;
  const generate = steps.find((step) => step.name === "Generate dead CSS review proposal on failure");
  const upload = steps.find((step) => step.name === "Attach dead CSS deletion proposal");
  expect(generate.if).toBe("failure() && matrix.stage == 'visual'");
  expect(upload.if).toBe(generate.if);
  expect(steps.indexOf(upload)).toBeGreaterThan(steps.indexOf(generate));
  expect(upload.uses).toMatch(/^actions\/upload-artifact@/);
  const [command, ...args] = generate.run.split(" ");
  expect(command).toBe("node");
  execFileSync(process.execPath, args, { cwd: root, stdio: "pipe" });
  for (const file of upload.with.path.trim().split(/\r?\n/)) expect(fs.statSync(path.join(root, file.trim())).size).toBeGreaterThan(0);
  execFileSync("git", ["apply", "--check", "reports/dead-css-proposal.diff"], { cwd: root, stdio: "pipe" });
});
