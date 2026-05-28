import fs from "node:fs";

const source = fs.readFileSync("src/wingman2/lib/productClassification.ts", "utf8");

const requiredTerms = [
  "distribution-amplifier",
  "signal-extender-kit",
  "avoip-encoder",
  "avoip-decoder",
  "matrix-switch",
  "presentation-switcher",
  "isWingmanProductEligibleForFinderNeed",
  "matchesCount",
];

const missing = requiredTerms.filter((term) => !source.includes(term));

if (missing.length) {
  console.error("Missing required classification terms:", missing.join(", "));
  process.exit(1);
}

console.log("Classification engine smoke test passed.");