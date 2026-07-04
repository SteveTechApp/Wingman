import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const files = {
  rules: resolve(repoRoot, "src/wingman2/data/usbTierRules.ts"),
  validator: resolve(repoRoot, "src/wingman2/logic/usbPathValidator.ts"),
};

function fail(message) {
  console.error(`[usb-path-validator] ${message}`);
  process.exit(1);
}

function assertFile(path) {
  if (!existsSync(path)) {
    fail(`Missing required file: ${path}`);
  }
}

function assertIncludes(label, source, expected) {
  if (!source.includes(expected)) {
    fail(`${label} is missing required marker: ${expected}`);
  }
}

function assertSku(source, sku) {
  assertIncludes("USB tier rules", source, `sku: "${sku}"`);
}

assertFile(files.rules);
assertFile(files.validator);

const rules = readFileSync(files.rules, "utf8");
const validator = readFileSync(files.validator, "utf8");

assertIncludes("USB tier rules", rules, "export type UsbStandard");
assertIncludes("USB tier rules", rules, "export interface UsbTierRule");
assertIncludes("USB tier rules", rules, "export interface UsbProductUsbRule");
assertIncludes("USB tier rules", rules, "export const USB_GLOBAL_RULES");
assertIncludes("USB tier rules", rules, "export const USB_TIER_RULES");
assertIncludes("USB tier rules", rules, "maxStandardUsbTiers: 5");
assertIncludes("USB tier rules", rules, "testRecommendedAtTierCount: 5");
assertIncludes("USB tier rules", rules, "hdbtForcesUsb2: true");
assertIncludes("USB tier rules", rules, "productsNotListedDoNotSupportUsb: true");
assertIncludes("USB tier rules", rules, "export function normaliseUsbSku");
assertIncludes("USB tier rules", rules, "export function findUsbProductRule");

[
  "EX-60-USB2",
  "EX-80-KVM",
  "EX-100-USB3",
  "EX-40-KVM-5K",
  "EX-100-KVM",
  "SW-120-TX3",
  "RX3-100",
  "MX-0403-H3-MST",
  "MX-1007-HYB",
  "MX-0804-SCL",
  "MX-0808-SCL",
  "MX-0812-SCL",
  "NHD-500-TX",
  "NHD-500-DNT-TX",
  "NHD-510-TX",
  "NHD-500-IW-TX-V2",
  "NHD-USB-TRX",
  "NHD-600-TRX",
  "NHD-600-TRXF",
  "NHD-610-TX-V2",
  "SW-620-TX-W",
  "SW-640L-TX-W",
  "CAM-0402-NDI-BRG",
  "CAM-0402-BRG",
  "CAB-USBC-15",
  "CAB-UAOC-USBC-10",
].forEach((sku) => assertSku(rules, sku));

assertIncludes("USB validator", validator, "export function usbValidationIsRequired");
assertIncludes("USB validator", validator, "export function determineEffectiveUsbStandard");
assertIncludes("USB validator", validator, "export function validateUsbPath");
assertIncludes("USB validator", validator, "includesHdBaseT");
assertIncludes("USB validator", validator, 'return "USB 2.0";');
assertIncludes("USB validator", validator, "totalTiers > USB_GLOBAL_RULES.maxStandardUsbTiers");
assertIncludes("USB validator", validator, "totalTiers === USB_GLOBAL_RULES.testRecommendedAtTierCount");
assertIncludes("USB validator", validator, "downstreamHubLimit");
assertIncludes("USB validator", validator, "enhancedCascadingApplied");
assertIncludes("USB validator", validator, "technicalReviewRequired");
assertIncludes("USB validator", validator, "strictWyreStormUsbSupport");
assertIncludes("USB validator", validator, "recommendationImpact");

console.log("[usb-path-validator] USB tier rules and validator source checks passed.");