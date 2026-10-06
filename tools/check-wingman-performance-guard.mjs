import { runBehaviouralChecks } from "./lib/run-behavioural-checks.mjs";

// Emitted JS/CSS budgets are enforced by check:size-budgets. Exercise the
// runtime loading contracts here instead of checking a tiny CSS entry file.
runBehaviouralChecks([
  "src/wingman2/lib/productIntelligenceIndexCache.test.ts",
  "src/wingman2/pages/ComparePageNew.idleLoading.test.tsx",
]);
