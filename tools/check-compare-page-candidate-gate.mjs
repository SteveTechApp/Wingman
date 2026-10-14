import { runBehaviouralChecks } from "./lib/run-behavioural-checks.mjs";

runBehaviouralChecks([
  "src/wingman2/pages/ComparePageNew.typedSkuHonesty.test.tsx",
  "src/wingman2/pages/ComparePageNew.governedHonesty.test.tsx",
  "src/wingman2/pages/ComparePageNew.governedCoverage.test.tsx",
]);
