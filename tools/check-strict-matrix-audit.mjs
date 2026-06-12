import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const auditPath = resolve(repoRoot, "tools/audit-matrix-output-topology.mjs");

function fail(message) {
  console.error(`[strict-matrix-audit-check] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIncludes(source, marker) {
  assert(source.includes(marker), `Missing marker: ${marker}`);
}

assert(existsSync(auditPath), "Missing tools/audit-matrix-output-topology.mjs");

const source = readFileSync(auditPath, "utf8");

assertIncludes(source, "classifyProductDomain");
assertIncludes(source, "presentation_switcher_or_processor");
assertIncludes(source, "receiver_endpoint");
assertIncludes(source, "transmitter_endpoint");
assertIncludes(source, "extender_or_kvm");
assertIncludes(source, "matrix_card_or_module");
assertIncludes(source, "Only true matrix product domains are included");
assertIncludes(source, "MXV-0808-H2A");
assertIncludes(source, "MXV-0808-70-H2A");
assertIncludes(source, "MX-0808-KIT");
assertIncludes(source, "wingman-product-domain-classification-audit.csv");

console.log("[strict-matrix-audit-check] Strict matrix audit checks passed.");