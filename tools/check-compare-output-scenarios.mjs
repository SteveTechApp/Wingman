import { runBehaviouralChecks } from "./lib/run-behavioural-checks.mjs";

runBehaviouralChecks([
  "src/wingman2/lib/compareSpecEngine.distributionRightSizing.test.ts",
  "src/wingman2/lib/competitorCompareDecision.failClosed.test.ts",
  "src/wingman2/lib/networkHdAvoipRoleGate.test.ts",
  "src/wingman2/pages/ComparePageNew.governedHonesty.test.tsx",
]);
