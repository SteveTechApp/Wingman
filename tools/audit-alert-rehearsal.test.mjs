import { expect, it } from "vitest";
import { runToolBare } from "./test-spawn-guard.mjs";

it("exits 2 with unresolved OSV details and never reports a clean survey", () => {
  const result = runToolBare(process.execPath, ["tools/audit-alert-findings.mjs", "--fixture", "tools/fixtures/incomplete-osv.json"], "incomplete-osv", { encoding: "utf8" });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(2);
  expect(result.stderr).toContain("Incomplete OSV assessment for root/build: rehearsal-package@1.0.0 (GHSA-unresolved)");
  expect(result.stdout).not.toContain("No actionable findings");
});

it("runs the collector CLI end to end and fails with the advisory table", () => {
  const result = runToolBare(process.execPath, ["tools/audit-alert-findings.mjs", "--fixture", "tools/fixtures/new-advisory.json", "--summary", "--annotations"], "alert-rehearsal", { encoding: "utf8" });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("REHEARSAL");
  expect(result.stdout).toContain("::error::New dependency advisory GHSA-rehe-arsa-l001");
  expect(result.stdout).toContain("| rehearsal-package | [GHSA-rehe-arsa-l001]");
  expect(result.stdout).toContain("| high (transitive) | root/prod | **none** |");
});
