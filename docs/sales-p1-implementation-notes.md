# Wingman Sales P1 Uplift

Generated: 2026-03-02 19:40:05

## Goal
Implements the audit P1 layer with low-risk, additive changes:
- Guided first-run action strip
- Plain-English sales language map
- Confidence status model
- Proposal handoff checklist panel

## Route Inference
- Route file: C:\Users\steve\wingman\src\AppRoutes.tsx
- Intake: /survey-import
- Competitor: /tools/competitor
- Wizard: /templates
- Proposal: /tools/proposal
- Guru: /tools/guru

## Files Changed
- C:\Users\steve\wingman\src\data\sales-starter-journeys.json
- C:\Users\steve\wingman\src\data\sales-language-map.json
- C:\Users\steve\wingman\src\data\sales-readiness-model.json
- C:\Users\steve\wingman\src\features\dashboard\SalesActionStrip.tsx
- C:\Users\steve\wingman\src\features\dashboard\DashboardPage.tsx
- C:\Users\steve\wingman\src\features\proposals\ProposalHandoffPanel.tsx
- C:\Users\steve\wingman\src\features\proposals\ProposalBuilderPage.tsx

## Skipped / Manual Check
- None

## Manual Validation
1. Open the dashboard and confirm the new sales action strip appears at the top.
2. Click each action card and confirm the inferred route is correct.
3. Open the proposal/quote page and confirm the handoff panel appears at the top.
4. Run typecheck and dev server.

## Note
This pass is intentionally additive. It avoids large layout rewrites and focuses on guiding sales users into the right flow.
