import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const modelPath = resolve(repoRoot, "src/wingman2/logic/matrixOutputModel.ts");

function fail(message) {
  console.error(`[matrix-output-model] ${message}`);
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

assert(existsSync(modelPath), "Missing src/wingman2/logic/matrixOutputModel.ts");

const source = readFileSync(modelPath, "utf8");

assertIncludes(source, "routedInputCount");
assertIncludes(source, "routedOutputCount");
assertIncludes(source, "mirroredOutputCount");
assertIncludes(source, "loopOutputCount");
assertIncludes(source, "localMonitorOutputCount");
assertIncludes(source, "auxOutputCount");
assertIncludes(source, "countsTowardMatrixSize");
assertIncludes(source, "mirrored_parallel_output");
assertIncludes(source, "loop_output");
assertIncludes(source, "Do not add mirrored HDMI outputs to routed output count");
assertIncludes(source, "Do not add loop outputs to routed output count");

const mirroredIndex = source.indexOf("mirrored_parallel_output");
const loopIndex = source.indexOf("loop_output");
const routedIndex = source.indexOf("routed_matrix_output");

assert(routedIndex >= 0, "Missing routed_matrix_output role.");
assert(mirroredIndex >= 0, "Missing mirrored output role.");
assert(loopIndex >= 0, "Missing loop output role.");

console.log("[matrix-output-model] Matrix output model guard checks passed.");