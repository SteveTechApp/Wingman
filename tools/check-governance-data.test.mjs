import { describe, expect, it } from "vitest";
// Transient-spawn guard: same resource-pressure errno class as the proven
// build-canonical-only guard; the sandboxed gate command is deterministic, a
// retried spawn re-produces the same verdict, and a child that RAN and failed
// is never retried (a nonzero gate exit remains a real signal).
import { runTool } from "./test-spawn-guard.mjs";
import fs from "node:fs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import profilesData from "../data/governance/wyrestorm-technical-profiles.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(__dirname, "check-governance-data.mjs");

/**
 * Runs check-governance-data.mjs from a sandbox copy of the repo (the gate
 * reads fixed relative paths from cwd) with a mutated governed-profiles
 * file, and returns the CLI exit code. Mirrors the subprocess discipline of
 * tools/apply-governed-review-pass.refusal.test.mjs: a gate's red path must
 * be proven against the real process, not a mocked module.
 */
function runGateWithProfiles(profilesPayload) {
  const sandbox = mkdtempSync(path.join(tmpdir(), "governance-data-gate-"));
  try {
    for (const entry of ["data-sources/wyrestorm/lifecycle.csv", "data/wyrestorm-product-role-overrides.json", "data/wingman-product-role-overrides.json", "data/wingman-product-suppression-list.json"]) {
      const dest = path.join(sandbox, entry);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(__dirname, "..", entry), dest);
    }
    const dest = path.join(sandbox, "data/governance/wyrestorm-technical-profiles.json");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, JSON.stringify(profilesPayload, null, 2) + "\n");

    try {
      const stdout = runTool("node", [GATE], "check-governance-data", {
        cwd: sandbox,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, WINGMAN_GOVERNANCE_ROOT: sandbox },
      });
      return { code: 0, stdout };
    } catch (error) {
      // A retried-then-still-transient spawn failure must not be misread as a
      // gate exit of 1 (the refusal branch); rethrow it as the crash it is.
      if (error.status === undefined) throw error;
      return { code: error.status ?? 1, stdout: String(error.stdout ?? "") + String(error.stderr ?? "") };
    }
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

describe("governance-data gate: reviewer attribution section", () => {
  it("passes on the live tracked data (all attributions clean)", () => {
    const result = runGateWithProfiles(profilesData);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("206 attributed sign-offs clean");
  });

  it("fails the gate when a profile carries the bare constant", () => {
    const mutated = JSON.parse(JSON.stringify(profilesData));
    mutated.profiles[0].verifiedBy = "Steve";
    const result = runGateWithProfiles(mutated);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain("bare constant");
    expect(result.stdout).toContain(mutated.profiles[0].sku);
  });

  it("fails the gate on ANY bare first name, not just the historical constant", () => {
    // The generalisation pin: a future bare first name must fail the gate
    // exactly like the historical "Steve" did - the rule is a shape rule
    // (full names carry an internal space), not a one-name blocklist.
    const mutated = JSON.parse(JSON.stringify(profilesData));
    mutated.profiles[0].verifiedBy = "Alex";
    const result = runGateWithProfiles(mutated);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain("single bare word");
    expect(result.stdout).toContain(mutated.profiles[0].sku);
  });

  it("fails the gate on a placeholder attribution", () => {
    const mutated = JSON.parse(JSON.stringify(profilesData));
    mutated.profiles[0].verifiedBy = "admin-bulk";
    const result = runGateWithProfiles(mutated);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain("placeholder");
  });

  it("passes with the full reviewer name restored (mutation is curable)", () => {
    const mutated = JSON.parse(JSON.stringify(profilesData));
    mutated.profiles[0].verifiedBy = "Steve Goodwin";
    const result = runGateWithProfiles(mutated);
    expect(result.code).toBe(0);
  });
});
