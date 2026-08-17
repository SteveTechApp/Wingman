/**
 * Routed I/O and matrix-size evidence, as data.
 *
 * The authority lives in data/governance/routed-io-evidence.json (one entry per
 * matrix/switcher/splitter SKU, reviewed evidence strings included). This
 * module is the single implementation shared by the generator
 * (tools/build-product-data-sources.mjs) and the check-only validator
 * (tools/repair-routed-io-evidence.mjs), so the emitted data matches the
 * authority by construction: whatever the validator compares a record against
 * is exactly what the generator writes onto it.
 *
 * The fields are deliberately emitted onto every downstream artifact (canonical
 * store, competitor catalog, public index, server-seeded runtime state) rather
 * than re-derived per consumer, so a regeneration can never silently drop the
 * evidence again.
 */

import fs from "node:fs";
import path from "node:path";

export const ROUTED_IO_EVIDENCE_FILE =
  process.env.WINGMAN_ROUTED_IO_EVIDENCE_FILE ??
  path.join(process.cwd(), "data", "governance", "routed-io-evidence.json");

/** Keys the validator pins. matrixSize and the physical/mirrored counts are
 * included so the gate also enforces the derived values the generator emits,
 * not only the raw routed counts (the historical gap that let the old repair
 * tool write fields its own check ignored). */
export const EVIDENCE_COMPARED_KEYS = [
  "inputs",
  "outputs",
  "inputCount",
  "outputCount",
  "videoInputs",
  "videoOutputs",
  "matrixInputs",
  "matrixOutputs",
  "routedInputs",
  "routedOutputs",
  "routedInputCount",
  "routedOutputCount",
  "matrixSize",
  "matrixSizeEvidence",
  "ioEvidenceStatus",
  "quoteSafety",
  "physicalOutputs",
  "physicalOutputCount",
  "mirroredOutputs",
  "mirroredOutputCount",
  "physicalVideoOutputCount",
];

const NUMERIC_INPUT_FIELDS = ["inputs", "inputCount", "videoInputs", "matrixInputs"];
const NUMERIC_OUTPUT_FIELDS = ["outputs", "outputCount", "videoOutputs", "matrixOutputs"];

export function loadRoutedIoEvidence() {
  return JSON.parse(fs.readFileSync(ROUTED_IO_EVIDENCE_FILE, "utf8"));
}

function getNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function preservePhysicalCount(record, fieldName, routedValue, evidenceKey) {
  const currentValue = getNumber(record[fieldName]);
  if (currentValue === null) return;
  if (currentValue <= routedValue) return;
  if (typeof record[evidenceKey] === "undefined") {
    record[evidenceKey] = currentValue;
  }
}

function patchNumericField(record, fieldName, value) {
  const currentValue = getNumber(record[fieldName]);
  if (currentValue === null) return false;
  if (currentValue === value) return false;
  record[fieldName] = value;
  return true;
}

/** Applies an authority entry onto a record (mutates and returns it). This is
 * the exact state the generator emits and the validator expects. */
export function applyRoutedIoEvidence(record, evidence) {
  preservePhysicalCount(record, "outputs", evidence.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "outputCount", evidence.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "videoOutputs", evidence.routedOutputs, "physicalVideoOutputCount");

  for (const fieldName of NUMERIC_INPUT_FIELDS) {
    patchNumericField(record, fieldName, evidence.routedInputs);
  }
  for (const fieldName of NUMERIC_OUTPUT_FIELDS) {
    patchNumericField(record, fieldName, evidence.routedOutputs);
  }

  record.routedInputs = evidence.routedInputs;
  record.routedOutputs = evidence.routedOutputs;
  record.routedInputCount = evidence.routedInputs;
  record.routedOutputCount = evidence.routedOutputs;
  record.matrixInputs = evidence.routedInputs;
  record.matrixOutputs = evidence.routedOutputs;
  record.matrixSize = `${evidence.routedInputs}x${evidence.routedOutputs}`;
  record.matrixSizeEvidence = evidence.matrixSizeEvidence;
  record.ioEvidenceStatus = evidence.ioEvidenceStatus;
  record.quoteSafety = evidence.quoteSafety;

  if (typeof evidence.physicalOutputs === "number") {
    record.physicalOutputs = evidence.physicalOutputs;
    record.physicalOutputCount = evidence.physicalOutputs;
  }
  if (typeof evidence.mirroredOutputs === "number") {
    record.mirroredOutputs = evidence.mirroredOutputs;
    record.mirroredOutputCount = evidence.mirroredOutputs;
  }

  return record;
}

/** Returns the list of { key, actual, expected } disagreements between a
 * record and the authority entry, using the same apply logic the generator
 * runs (on a copy, so the caller's record is never touched). */
export function evidenceMismatches(record, evidence) {
  const expected = applyRoutedIoEvidence({ ...record }, evidence);
  const mismatches = [];

  for (const key of EVIDENCE_COMPARED_KEYS) {
    const actual = record[key];
    const want = expected[key];
    if (actual === undefined && want === undefined) continue;
    // A port-array representation on the same key (e.g. the server runtime
    // model's `mirroredOutputs` list) is a different shape from the scalar
    // evidence count. The count is still enforced through its paired count
    // field (mirroredOutputCount), so an array here is not evidence drift.
    if (Array.isArray(actual) && !Array.isArray(want)) continue;
    if (JSON.stringify(actual) !== JSON.stringify(want)) {
      mismatches.push({ key, actual, expected: want });
    }
  }

  return mismatches;
}
