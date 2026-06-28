import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  comparePage: "src/wingman2/pages/ComparePageNew.tsx",
  outputAudit: "tools/audit-compare-output-quality.mjs",
  knownProfiles: "src/wingman2/lib/knownCompareProfiles.ts",
  eligibilityTest: "src/wingman2/lib/compareEligibilityEngine.test.ts",
  behaviourTest: "src/wingman2/lib/competitorCompareBehaviour.test.ts",
  decisionTest: "src/wingman2/lib/competitorCompareDecision.test.ts"
};

const failures = [];

function readIfExists(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

const corpus = Object.values(files)
  .map(readIfExists)
  .join("\n\n");

const comparePage = readIfExists(files.comparePage);
const outputAudit = readIfExists(files.outputAudit);

function requireIn(source, marker, label) {
  if (!source.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function requireAny(source, markers, label) {
  if (!markers.some((marker) => source.includes(marker))) {
    failures.push(`${label} missing one of: ${markers.join(" | ")}`);
  }
}

function rejectIn(source, marker, label) {
  if (source.includes(marker)) {
    failures.push(`${label} still contains banned marker: ${marker}`);
  }
}

requireIn(comparePage, "Comparison evidence matrix", "ComparePageNew");
requireIn(comparePage, "Competitor product", "ComparePageNew");
requireIn(comparePage, "WyreStorm candidate", "ComparePageNew");
requireIn(comparePage, "Score explanation", "ComparePageNew");
requireIn(comparePage, "Important differences", "ComparePageNew");
requireIn(comparePage, "Check before quoting", "ComparePageNew");
requireIn(comparePage, "Why not 100%", "ComparePageNew");
requireIn(outputAudit, "Score explanation", "audit-compare-output-quality");

rejectIn(comparePage, "Where it matches", "ComparePageNew");
rejectIn(comparePage, "Where it does not match", "ComparePageNew");
rejectIn(comparePage, "Wrong-product avoidance", "ComparePageNew");
rejectIn(comparePage, "Next question:", "ComparePageNew");

requireAny(
  corpus,
  ["IP250UHD-TX", "IP250UHD", "Blustream"],
  "Compare scenario coverage for Blustream IP250UHD-TX encoder case"
);

requireAny(
  corpus,
  ["encoder", "transmitter", "TX"],
  "Compare scenario coverage for encoder/transmitter role"
);

requireAny(
  corpus,
  ["decoder", "receiver", "RX"],
  "Compare scenario coverage for decoder/receiver role"
);

requireAny(
  corpus,
  ["NHD-500", "NetworkHD 500"],
  "Compare scenario coverage for 1G NetworkHD 500"
);

requireAny(
  corpus,
  ["NHD-600", "SDVoE", "10G"],
  "Compare scenario coverage for 10G / SDVoE separation"
);

requireAny(
  corpus,
  ["4x4", "4 inputs by 4 outputs", "Matrix size 4 inputs by 4 outputs"],
  "Compare scenario coverage for 4x4 matrix I/O"
);

requireAny(
  corpus,
  ["mirrored", "Mirrored HDMI is not a fifth routed matrix output", "mirroredOutputCount"],
  "Compare scenario coverage for mirrored-output safety"
);

requireAny(
  corpus,
  ["blockedCandidatePatterns", "blocked", "blockers"],
  "Compare scenario coverage for blocked candidate handling"
);

if (failures.length) {
  console.error("[compare-output-scenarios] Check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("[compare-output-scenarios] Compare output scenario guard passed.");
