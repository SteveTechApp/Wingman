import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const classifierPath = resolve(repoRoot, "src/wingman2/logic/productClassifier.ts");

function fail(message) {
  console.error(`[product-classification] ${message}`);
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

if (!existsSync(classifierPath)) {
  fail("Missing src/wingman2/logic/productClassifier.ts");
}

const source = readFileSync(classifierPath, "utf8");

assertIncludes(source, "export function classifySkuPackage");
assertIncludes(source, "export function gateDirectEquivalence");
assertIncludes(source, 'sku.endsWith("-KIT")');
assertIncludes(source, '"tx_rx_kit"');
assertIncludes(source, '"matrix_with_rx_kit"');
assertIncludes(source, '"NHD-CTL"');
assertIncludes(source, '"never_lead"');
assertIncludes(source, '"request_only"');
assertIncludes(source, '"NO_MATCH_RELATED"');
assertIncludes(source, "Requested product is a complete TX/RX kit");
assertIncludes(source, "Requested product is a matrix kit with receivers");

const kitIndex = source.indexOf('sku.endsWith("-KIT")');
const trxIndex = source.indexOf('sku.endsWith("-TRX")');
const txIndex = source.indexOf("TRANSMITTER_SUFFIX_PATTERN.test");
const rxIndex = source.indexOf("RECEIVER_SUFFIX_PATTERN.test");

assert(kitIndex >= 0, "KIT rule not found.");
assert(trxIndex >= 0, "TRX rule not found.");
assert(txIndex >= 0, "TX suffix rule not found.");
assert(rxIndex >= 0, "RX suffix rule not found.");
assert(kitIndex < trxIndex, "KIT rule must be evaluated before TRX suffix rule.");
assert(kitIndex < txIndex, "KIT rule must be evaluated before TX suffix rule.");
assert(kitIndex < rxIndex, "KIT rule must be evaluated before RX suffix rule.");

console.log("[product-classification] Classification guard checks passed.");