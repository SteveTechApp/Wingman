# Wingman UI Simplification Audit

## Design principle

Wingman should show one of these at a time:

1. Ask
2. Capture
3. Choose
4. Review
5. Export

If a page shows several of these at once, it becomes visually heavy and difficult for a sales user to navigate.

## Pages that need reduction

### Discovery

Status: Highest priority.

Problem:
- Too many application cards and engineering sections visible at once.
- User sees the whole engineering canvas before they know what to answer.
- Progress/status panels and validation boxes compete with the actual task.

Recommended fix:
- Use a task hub plus modal wizard.
- One discovery route at a time.
- One question at a time.
- Captured answers and help text hidden behind expanders.

Implemented in this phase:
- DiscoveryPage replaced with a simplified discovery task hub.

### Product Finder

Problem:
- Should not show product catalogue/results until the user chooses a search path.
- Too many product/filter concepts are visible too early.

Recommended fix:
- First screen should ask:
  - Search by SKU
  - Search by source/display count
  - Search by product family
  - Search from Guided Discovery answers
  - Search by feature
- Results should appear only after the user acts.

### Proposal

Problem:
- Proposal page can feel like a dense document editor.
- BOM, governance, assumptions and feedback should not all compete visually.

Recommended fix:
- First choose proposal type:
  - Single SKU
  - Room solution
  - Multi-room
  - Competitor replacement
  - Good / Better / Best
- Then show preview.

### Sales Language

Status: Mostly reduced.

Recommended fix:
- Keep as one call situation, one question, one answer.
- Captured notes remain collapsed by default.

### Support

Status: Mostly reduced.

Recommended fix:
- Keep as a simple help router.
- Do not show readiness audits or development status on user-facing support.

### Compare

Problem:
- Competitor comparison can become too technical too quickly.

Recommended fix:
- First collect competitor brand/SKU.
- Then ask what the product role is.
- Then ask which features must be matched.
- Only then show WyreStorm fit.

### Video Wall

Problem:
- Video wall logic can become visually dense.

Recommended fix:
- Split into:
  - Wall type
  - Layout
  - Source behaviour
  - Processing route
  - Product recommendation

### Room Templates

Problem:
- Template cards are useful, but selected template details should open in a focused modal or separate page.

Recommended fix:
- Keep template cards visible.
- Open chosen template as a task panel with next action.