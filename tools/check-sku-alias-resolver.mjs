import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const aliasPath = resolve(repoRoot, "src/wingman2/lib/skuAliasResolver.ts");
const profilePath = resolve(repoRoot, "src/wingman2/lib/knownCompareProfiles.ts");
const auditPath = resolve(repoRoot, "tools/audit-matrix-output-topology.mjs");

function fail(message) {
  console.error(`[sku-alias-resolver] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

assert(existsSync(aliasPath), "Missing src/wingman2/lib/skuAliasResolver.ts");
assert(existsSync(profilePath), "Missing src/wingman2/lib/knownCompareProfiles.ts");

const alias = readFileSync(aliasPath, "utf8");
const profile = readFileSync(profilePath, "utf8");
const audit = existsSync(auditPath) ? readFileSync(auditPath, "utf8") : "";

assertIncludes(alias, "resolveWyrestormSkuAlias", "alias resolver");
assertIncludes(alias, "skuAliasMatches", "alias resolver");
assertIncludes(alias, "MXV-0808-H2A-V3", "alias resolver");
assertIncludes(alias, "MXV-0808-H2A-70-V3", "alias resolver");
assertIncludes(alias, "MXV-0808-H2A-KIT", "alias resolver");
assertIncludes(alias, "MX-0808-KIT-V2", "alias resolver");

assertIncludes(profile, "resolveWyrestormSkuAlias", "known compare profiles");
assertIncludes(profile, "skuAliasMatches", "known compare profiles");
assertIncludes(profile, 'sku: "MXV-0808-H2A-V3"', "known compare profiles");
assertIncludes(profile, 'sku: "MXV-0808-H2A-70-V3"', "known compare profiles");
assertIncludes(profile, 'sku: "MXV-0808-H2A-KIT"', "known compare profiles");
assertIncludes(profile, 'sku: "MX-0808-KIT-V2"', "known compare profiles");

if (audit) {
  assertIncludes(audit, "MXV-0808-H2A-V3", "strict matrix audit");
  assertIncludes(audit, "MXV-0808-H2A-70-V3", "strict matrix audit");
  assertIncludes(audit, "MXV-0808-H2A-KIT", "strict matrix audit");
  assertIncludes(audit, "MX-0808-KIT-V2", "strict matrix audit");
}

console.log("[sku-alias-resolver] Canonical SKU alias checks passed.");