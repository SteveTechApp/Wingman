import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  ledger: "data/governance/competitor-match-decisions.json",
  schema: "data/schemas/competitor-match-decision.schema.json",
  storage: "src/wingman2/lib/competitorMatchDecisionLedger.ts",
  storageTest: "src/wingman2/lib/competitorMatchDecisionLedger.test.ts",
  runtime: "src/wingman2/lib/governedCompareRuntime.ts",
  runtimeTest: "src/wingman2/lib/governedCompareRuntime.test.ts",
  comparePage: "src/wingman2/pages/ComparePageNew.advanced.tsx",
  orphanGuard: "tools/check-orphaned-modules.mjs",
};

const failures = [];
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

for (const relativePath of Object.values(files)) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Missing Compare Trust Layer file: ${relativePath}`);
  }
}

if (failures.length === 0) {
  try {
    const ledger = JSON.parse(read(files.ledger));

    if (ledger.version !== 1) {
      failures.push("Competitor match ledger version must be 1.");
    }

    if (!Array.isArray(ledger.decisions)) {
      failures.push("Competitor match ledger decisions must be an array.");
    } else if (ledger.decisions.length === 0) {
      failures.push(
        "Competitor match ledger is empty - run `npm run snapshot:competitor-decisions` to record the engine baseline.",
      );
    } else {
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

        // Machine baselines from the snapshot tool are pending-review by
        // design: they record the engine's current outcome for the drift gate
        // and are inert at runtime (only `approved` rows are promoted). Only
        // HUMAN decisions must carry the full approval contract.
        const isMachineBaseline = decision.reviewStatus === "pending-review";

        if (
          !isMachineBaseline &&
          decision.decisionType === "confirmed-equivalent" &&
          decision.reviewStatus !== "approved"
        ) {
          failures.push(
            `Confirmed equivalent is not approved: ${decision.competitorSku}`,
          );
        }

        if (
          !isMachineBaseline &&
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
  } catch (error) {
    failures.push(`Unable to parse competitor match ledger: ${error.message}`);
  }

  const comparePage = read(files.comparePage);
  const requiredRuntimeMarkers = [
    "readCompetitorMatchDecisionLedger",
    "resolveApprovedGovernedDecision",
    "applyGovernedCandidateOrder",
    "GovernedDecisionPanel",
    "data-wingman-governed-decision",
    "no-suitable-match",
  ];

  for (const marker of requiredRuntimeMarkers) {
    if (!comparePage.includes(marker)) {
      failures.push(`Live Compare page missing governed runtime marker: ${marker}`);
    }
  }

  const runtime = read(files.runtime);
  if (!runtime.includes("governedDecisionSuppressesCandidates")) {
    failures.push("Governed runtime does not implement no-match suppression.");
  }

  const orphanGuard = read(files.orphanGuard);
  if (
    orphanGuard.includes(
      '"src/wingman2/lib/competitorMatchDecisionLedger.ts"',
    )
  ) {
    failures.push(
      "Competitor match ledger is still allowlisted as an orphan instead of being live-wired.",
    );
  }
}

if (failures.length > 0) {
  console.error("[compare-trust-layer] Governance check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "[compare-trust-layer] Governed decision ledger and live Compare wiring passed.",
);