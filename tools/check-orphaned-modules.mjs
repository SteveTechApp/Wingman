import { readFileSync } from "node:fs";
import { auditRuntimeReachability } from "./lib/runtime-reachability.mjs";

const policy = JSON.parse(readFileSync("tools/wingman-feature-surface-policy.json", "utf8"));
const audit = auditRuntimeReachability(process.cwd(), policy.retainedSourceReasons);
if (audit.missingEntry || audit.orphans.length || audit.staleRetentions.length) {
  if (audit.missingEntry) console.error("[orphaned-modules] Missing src/main.tsx.");
  for (const file of audit.orphans) console.error(`[orphaned-modules] Unclassified disconnected source: ${file}`);
  for (const file of audit.staleRetentions) console.error(`[orphaned-modules] Remove stale retention entry: ${file}`);
  console.error("Archive unused code after checking tool/test consumers, or document its retained purpose in the feature-surface policy.");
  process.exitCode = 1;
} else {
  console.log(`[orphaned-modules] ${audit.total} source modules: ${audit.reachable} reachable, ${audit.unreachable.length} explicitly retained support modules.`);
}
