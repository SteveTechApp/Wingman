import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const checks = [
  {
    file: "src/wingman2/lib/avDecisionEvidence.ts",
    markers: [
      "buildAvDecisionEvidence",
      "NetworkHD families must not be mixed",
      "SW-510-TX cannot feed NetworkHD receivers",
      "NHD-128-NDI-TRX",
      "multiple visible source windows on a single output canvas",
      "Do not default a video wall to AV-over-IP",
      "AV decision score",
      "matrix-input-capacity-exceeded",
      "USB 3.x requirement conflicts with USB 2.0 product evidence",
      "Controller-only product selected as core AV path",
      "NetworkHD 600-class design needs 10GbE validation",
      "For transceiver products, do not assume one unit covers both ends",
    ],
  },
  {
    file: "src/wingman2/lib/recommendationEvidence.ts",
    markers: [
      'import { buildAvDecisionEvidence } from "./avDecisionEvidence";',
      "const avDecision = buildAvDecisionEvidence",
      "decisionBlockerCount",
      "...avDecision.quoteChecks",
      "...avDecision.evidence",
      "...avDecision.requiredDependencies",
    ],
  },
];

const errors = [];

for (const check of checks) {
  const source = readFileSync(path.join(root, check.file), "utf8");

  for (const marker of check.markers) {
    if (!source.includes(marker)) {
      errors.push(check.file + " is missing marker: " + marker);
    }
  }
}

if (errors.length) {
  console.error("[av-decision-evidence] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[av-decision-evidence] Verified AV decision validation layer, recommendation evidence wiring, and critical AV safety rules.");
