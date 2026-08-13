Fix the two orphaned modules currently reported by:

npm run check:orphaned-modules

Reported modules:

- src/wingman2/lib/productDataQuality.ts
- src/wingman2/lib/scenarioValidation.ts

Do not delete them blindly.

Required changes:

1. productDataQuality.ts
   - Inspect its exports.
   - Wire it into DataManagerPage.tsx or the relevant Data Manager runtime.
   - Use it to calculate/display the Data Quality summary that the Product Data Manager specification already requires.
   - Reuse existing Data Manager records.
   - Do not create mock data.
   - Keep the page compact.
   - If a Data Quality summary already exists, make it consume productDataQuality.ts rather than duplicate logic.

2. scenarioValidation.ts
   - Inspect whether there is a live scenario-validation runtime already available.
   - If it can be safely connected to an existing admin/readiness/test page without expanding scope, connect it.
   - Otherwise add ONLY:
     src/wingman2/lib/scenarioValidation.ts
     to KNOWN_DYNAMIC_ALLOWLIST in tools/check-orphaned-modules.mjs
   - Add a one-line reason explaining that it is intentionally retained as the reusable behavioural scenario harness used by scenario tests and future recommendation-readiness integration.
   - Do not allowlist productDataQuality.ts; that module should be live through the Data Manager.

3. Do not:
   - switch branches
   - commit
   - push
   - modify .git
   - remove tests
   - weaken the orphaned-module check
   - broadly allowlist directories
   - change unrelated application behaviour

4. Run:
   npm run typecheck
   npm test
   npm run build
   npm run verify

5. Fix any failures introduced by this work.

6. Finish with a concise summary of:
   - files changed
   - how productDataQuality is used live
   - whether scenarioValidation was wired live or allowlisted
   - verify result
