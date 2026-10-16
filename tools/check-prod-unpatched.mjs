#!/usr/bin/env node
// Production dependency gate: unpatched advisories never enter the runtime tree.
//
// Why this gate exists in addition to tools/check-dependency-audit.mjs:
//   - The audit gate blocks on high/critical advisories, so a moderate advisory
//     on a PRODUCTION dependency could pass every CI check and only surface
//     later as a Dependabot alert on the default branch. That is exactly how
//     sprintf-js (CVE-2026-97058, GHSA-hp3w-g68c-fv3c, moderate) reached main:
//     through mammoth -> argparse@1.x, invisible to the high/critical audit
//     gate until Dependabot flagged it after the fact.
//   - `npm audit --omit=dev --json` reports the production (runtime) scope only,
//     and marks each finding with fixAvailable. The rule here:
//       denylisted package              -> fail (see PRODUCTION_DENYLIST below).
//       fixAvailable === false          -> fail: no upgrade path exists, so the
//                                          severity-based gates have no lever;
//                                          the only fix is dropping the
//                                          dependency or the path to it.
//       fixAvailable true or {batch..}  -> pass here (a fix exists; the
//                                          high/critical audit gate owns the
//                                          severity decision, Dependabot owns
//                                          the upgrade tracking).
//   - "Unpatched" for the whole registry: sprintf-js affected <= 1.1.3 with no
//     fixed release published at all (npm latest was 3.0.3), so any version of
//     it in the production tree is a regression of the argparse override
//     (tools/check-override-floors.mjs). The denylist pins that contract even
//     if the advisory database later changes shape.
//
// Dev toolchain advisories are deliberately NOT covered here: production deps
// only (the OVS build-time closure is guarded by tools/check-build-deps.mjs,
// dev high/critical by the audit gate with its exception file).
//
// Usage: node tools/check-prod-unpatched.mjs

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Packages whose entire published range is vulnerable per reviewed assessment.
// Each entry carries the advisory to reference back to. Never extend this list
// silently: adding a name means accepting that its production use can only be
// removed, not upgraded.
export const PRODUCTION_DENYLIST = [
  {
    package: "sprintf-js",
    advisory: "GHSA-hp3w-g68c-fv3c",
    reason: "CVE-2026-97058: no fixed release was ever published (affected <= 1.1.3). Removed from the production tree by forcing mammoth's argparse to ^2.0.1; reintroduction would undo that override.",
  },
];

const SCOPES = [
  { label: "root", cwd: projectRoot },
  // server/package.json declares only runtime dependencies, so its entire
  // lockfile is production scope.
  { label: "server", cwd: path.join(projectRoot, "server") },
];

// Pure decision so the fixture tests can exercise every branch without shelling
// out. `report` is the parsed JSON of one `npm audit --omit=dev --json` run.
// Returns the list of blocking findings ([] = pass).
export function evaluateAudit(report, denylist = PRODUCTION_DENYLIST) {
  const findings = [];
  for (const [name, vulnerability] of Object.entries(report?.vulnerabilities ?? {})) {
    const advisoryIds = (vulnerability.via ?? [])
      .filter((via) => typeof via === "object")
      .map((via) => ({ id: String(via.url ?? "").split("/").pop() || "(no advisory id resolved)", title: via.title ?? "" }));

    const denied = denylist.find((entry) => entry.package === name);
    if (denied) {
      findings.push(
        `${name} ${denied.advisory} - denylisted production dependency: ${denied.reason}`,
      );
      // The denylist already says everything; no per-advisory duplication.
      continue;
    }

    if (vulnerability.fixAvailable !== false) continue;

    if (advisoryIds.length === 0) {
      findings.push(`${name} (${vulnerability.severity ?? "unknown"}) - no fix available and no advisory id resolved for the finding.`);
      continue;
    }
    for (const advisory of advisoryIds) {
      findings.push(
        `${name} ${advisory.id}${advisory.title ? ` - ${advisory.title}` : ""} - no fix available: cannot be upgraded away, ` +
          `remove the production dependency or the dependency path that reaches it.`,
      );
    }
  }
  return findings;
}

async function runAuditForScope(scope, offline = false) {
  return new Promise((resolveAudit) => {
    // Same static-literal execSync rationale as tools/check-dependency-audit.mjs:
    // on Windows npm is a .cmd shim that recent Node refuses to spawn directly,
    // and the command is a fixed literal with no interpolated input.
    try {
      const stdout = execSync("npm audit --omit=dev --json", {
        cwd: scope.cwd,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
      resolveAudit(JSON.parse(stdout));
    } catch (error) {
      // npm audit exits non-zero when it finds anything. The report still comes
      // back on stdout; this tool decides what blocks.
      if (error.stdout) {
        try {
          resolveAudit(JSON.parse(error.stdout));
          return;
        } catch {
          throw new Error(`Could not parse npm audit output for the ${scope.label} scope.`);
        }
      }
      // Missing node_modules (fresh checkout without npm ci) or a real npm
      // failure must block rather than quietly pass.
      throw error;
    }
  });
}

async function main() {
  let findings = [];
  try {
    for (const scope of SCOPES) {
      const report = await runAuditForScope(scope);
      findings.push(...evaluateAudit(report).map((finding) => `[${scope.label}] ${finding}`));
    }
  } catch (error) {
    console.error(`[prod-unpatched] Check failed: ${error?.message ?? error}`);
    process.exit(1);
  }

  if (findings.length) {
    console.error(`\n[prod-unpatched] Check failed - the production dependency tree ships ${findings.length} unpatched finding(s):`);
    for (const entry of findings) console.error(`  - ${entry}`);
    console.error(
      "\nThese advisories have no fixed release to upgrade to, so npm audit suggestions do not apply.\n" +
        "The fix is removing the production dependency or the dependency path that reaches it.\n" +
        "When a denylisted package ships a fixed release upstream, update tools/check-prod-unpatched.mjs.",
    );
    process.exit(1);
  }
  console.log("[prod-unpatched] OK - production tree (root and server scopes) carries no unpatched advisory and no denylisted package.");
}

// Run as a CLI only when directly executed. Importing the module (as the tests
// do, for the exported decision function) must not trigger a live npm audit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}