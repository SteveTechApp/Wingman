# Wingman Production Readiness Assessment

Date: 2026-03-09

## Objective
Prepare Wingman for production-readiness by assessing core feature flows and tool routing, then implementing missing functionality in high-impact areas.

## Baseline Verification
- Typecheck: pass (`npm run typecheck`)
- Production build: pass (`npm run build`)
- Production gate: pass (`npm run gate`)
- Route integrity check: pass (`npm run check:routes`)
- Lint script currently fails because `eslint` is not installed in this workspace image.

## Feature and Tool Assessment

### 1) Navigation and Route Integrity
Findings:
- Multiple active UI paths referenced legacy routes not present in current `AppRoutes`.
- Resulting risk: broken navigation from tool cards, action strips, and older internal links.

Implemented:
- Added canonical + legacy alias routing in `src/AppRoutes.tsx`.
- Added missing `/app/projects/new` and `/app/projects/:id` routes.
- Added compatibility redirects for historical paths (`/app/toolhub`, `/app/catalogue`, `/app/tools/competitor`, `/app/tools/room`, `/app/tools/proposals`, `/app/tools/videowall`, `/app/survey-import`, etc.).
- Aligned route constants and tool models:
  - `src/core/wingman/routeMap.ts`
  - `src/features/tools/toolFeatureModel.ts`
  - `src/ui2/nav/MissionControlNav.tsx`
- Added automated route regression guard used by gate:
  - `tools/verify-routes.mjs`

### 2) First-Run Sales Journey
Findings:
- Sales action strip existed but was not integrated into Mission Control.
- Some action links pointed at non-existent routes.

Implemented:
- Wired `SalesActionStrip` into Mission Control page.
- Upgraded strip to use live active-project signals and readiness status.
- Corrected action destinations to canonical routes.

### 3) Guided Qualification Intake
Findings:
- Intake page captured free text only; no qualification gating.
- No structured required/recommended intake guidance persisted to project state.

Implemented:
- Extended `ImportIntakePage` with a guided qualification checklist (required/recommended/optional).
- Persisted checklist state in local storage.
- Upserted intake output into active project record and discovery notes.
- Added direct save path to Projects or continue path to Discovery.

### 4) Intake Intelligence and SKU Seeding
Findings:
- Import extraction and recommendation logic existed but was effectively disconnected from live workflows.
- A legacy `app/import/recommendWyrestorm.ts` file still contained stub recommendation logic.

Implemented:
- Wired live brief analysis into `ImportIntakePage`:
  - Extracts project signals (intent, room type, USB-C/BYOD, switching, resolution, distance hints).
  - Generates ranked WyreStorm SKU recommendations.
  - Infers recommended product families and suggested next tool.
- Added one-click "Apply analysis" actions that persist:
  - `discovery.recommendedFamilies`
  - `discovery.recommendedNextTool`
  - seeded `catalog.skus`
- Replaced legacy import stubs with pass-through modules to the primary import engine:
  - `src/app/import/extractRequirements.ts`
  - `src/app/import/recommendWyrestorm.ts`

### 5) Proposal Handoff Confidence
Findings:
- Proposal builder was mostly static and did not operate as a readiness gate.
- Handoff panel existed but was not integrated and lacked dynamic checks.

Implemented:
- Added commercial readiness evaluation engine:
  - `src/features/readiness/commercialReadiness.ts`
- Reworked Proposal Builder to:
  - Persist proposal draft sections per project.
  - Pull BOM totals from proposal store.
  - Compute dynamic readiness status and score.
  - Save proposal draft output back to active project metadata.
- Rebuilt handoff panel as a dynamic checklist view and integrated it:
  - `src/features/proposals/ProposalHandoffPanel.tsx`
  - `src/features/proposals/ProposalBuilderPage.tsx`

### 6) Project Overview and Deep-Linking
Findings:
- Project overview was wired to an older store path and could render fallback states incorrectly.

Implemented:
- Rebuilt `ProjectOverviewPage` to use `features/projects/projectStore`.
- Added support for route param and query-param loading.
- Wired competitor and video-wall workflows to deep-link into `/app/projects/:id`.

## Production Readiness Outcome
Current status: core flow is now production-stable for intake -> discovery -> tooling -> proposal handoff, with resilient routing, live readiness scoring, and persisted intake intelligence that carries into downstream tools.

## Remaining Risks / Follow-ups
1. Install and configure ESLint so `npm run lint` can be enforced in gate/CI.
2. Add targeted tests for intake intelligence persistence, readiness scoring, and project deep-link navigation.
3. Rationalize historical backup/rescue artifacts to reduce accidental import risk and repository noise.
4. Replace remaining inactive/stub service modules (`videoService`, legacy comparison/export stubs) or formally deprecate them.
