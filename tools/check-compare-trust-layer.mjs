import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ledgerPath = path.join(
  root,
  "data/governance/competitor-match-decisions.json",
);
const schemaPath = path.join(
  root,
  "data/schemas/competitor-match-decision.schema.json",
);
const runtimePath = path.join(
  root,
  "src/wingman2/lib/competitorMatchDecisionLedger.ts",
);
const testPath = path.join(
  root,
  "src/wingman2/lib/competitorMatchDecisionLedger.test.ts",
);

const failures = [];

for (const filePath of [ledgerPath, schemaPath, runtimePath, testPath]) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing Compare Trust Layer file: ${path.relative(root, filePath)}`);
  }
}

if (fs.existsSync(ledgerPath)) {
  try {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

    if (ledger.version !== 1) {
      failures.push("Competitor match ledger version must be 1.");
    }

    if (!Array.isArray(ledger.decisions)) {
      failures.push("Competitor match ledger decisions must be an array.");
    }
    else {
      const identities = new Set();

      for (const decision of ledger.decisions) {
        const identity = [
          String(decision.competitorManufacturer || "").trim().toLowerCase(),
          String(decision.competitorSku || "").trim().toUpperCase(),
          String(decision.wyrestormSku || "").trim().toUpperCase(),
        ].join("::");

        if (identities.has(identity)) {
          failures.push(`Duplicate governed match decision: ${identity}`);
        }
        identities.add(identity);

        if (
          decision.decisionType === "confirmed-equivalent" &&
          decision.reviewStatus !== "approved"
        ) {
          failures.push(
            `Confirmed equivalent is not approved: ${decision.competitorSku}`,
          );
        }

        if (
          decision.decisionType === "confirmed-equivalent" &&
          (!decision.reviewer ||
            !decision.reviewedAt ||
            !Array.isArray(decision.evidence) ||
            decision.evidence.length === 0)
        ) {
          failures.push(
            `Confirmed equivalent lacks review evidence: ${decision.competitorSku}`,
          );
        }

        if (
          decision.decisionType === "no-suitable-match" &&
          decision.wyrestormSku
        ) {
          failures.push(
            `No-match decision includes a WyreStorm SKU: ${decision.competitorSku}`,
          );
        }
      }
    }
  }
  catch (error) {
    failures.push(`Unable to parse competitor match ledger: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error("[compare-trust-layer] Governance check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("[compare-trust-layer] Governed decision ledger check passed.");