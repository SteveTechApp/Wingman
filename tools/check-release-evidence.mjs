import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DAY_MS = 86_400_000;

function evaluateCriterion(criterion, now) {
  if (criterion?.claimedStatus === "blocked") {
    return { id: criterion.id, state: "blocked", reasons: ["external_evidence_not_supplied"] };
  }
  const reasons = [];
  const artifactPath = typeof criterion?.artifactPath === "string" ? criterion.artifactPath.trim() : "";
  if (!artifactPath || !existsSync(resolve(artifactPath))) reasons.push("artifact_missing");
  const measuredAt = new Date(criterion?.measuredAt ?? "");
  if (!Number.isFinite(measuredAt.getTime())) reasons.push("measurement_date_missing");
  else if (Number.isFinite(Number(criterion?.expiresAfterDays)) && now.getTime() - measuredAt.getTime() > Number(criterion.expiresAfterDays) * DAY_MS) reasons.push("evidence_expired");
  if (!criterion?.approver?.name?.trim?.() || !criterion?.approver?.role?.trim?.()) reasons.push("approver_missing");
  const metrics = criterion?.metrics;
  const budgets = criterion?.budgets;
  if (metrics && budgets) {
    if (Number(metrics.p95Ms) > Number(budgets.maxP95Ms)) reasons.push("p95_budget_unmet");
    if (Number(metrics.p99Ms) > Number(budgets.maxP99Ms)) reasons.push("p99_budget_unmet");
    if (Number(metrics.errorRate) > Number(budgets.maxErrorRate)) reasons.push("error_budget_unmet");
  }
  return { id: criterion?.id, state: reasons.length ? "blocked" : "pass", reasons };
}

export function checkReleaseEvidence(manifest, now = new Date()) {
  const criteria = Array.isArray(manifest?.criteria) ? manifest.criteria.map((criterion) => evaluateCriterion(criterion, now)) : [];
  const passCount = criteria.filter((criterion) => criterion.state === "pass").length;
  const state = criteria.length > 0 && passCount === criteria.length ? "pass" : passCount > 0 ? "partial" : "blocked";
  return { state, criteria };
}

function runCli() {
  const manifestPath = resolve(process.argv[2] || "docs/release-evidence/release-evidence-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const result = checkReleaseEvidence(manifest, new Date());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
