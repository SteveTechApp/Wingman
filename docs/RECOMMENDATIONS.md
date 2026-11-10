# Recommendations

The narrative behind the recommendation handoff invariants in `AGENTS.md`.

- Resolve is a working queue for moving the room design forward, not a second
  survey and not a place to type a note that only appears to clear a blocker.
  Each missing requirement is matched to the governed Discovery question that
  owns it. The action opens that question in the current room, where its answer
  updates the shared brief used by matching, the system design and the proposal.
- The queue puts answerable questions first and names how many can be answered
  in Discovery. The rep can recalculate after saving those answers. If a check
  does not have an available question in the current room path, the page sends
  the rep back to the room brief rather than presenting a misleading editor.
- Some checks require evidence Discovery cannot supply: a measured cable route,
  a confirmed network configuration, or product/compatibility validation. They
  remain open and state the site or technical follow-up needed. A generic note
  does not count as that evidence and cannot change quote readiness.
- The question map is deliberately tied to the governed question IDs and the
  current room's visible question set. When a recommendation reveals a genuine
  missing input that the applicable workflow never asks, add the question to
  Discovery's visibility rules and map the check to it; do not broaden the
  Resolve page into an independent source of room facts.
- Network-path Discovery appears for a contained single-room system when the
  source connection is network video or an AV-over-IP profile has been chosen.
  This allows a network dependency raised by matching to be answered from the
  same saved room record without asking every small local room about managed
  switching.
- The next action follows the state of the design: answer open Discovery checks,
  fill unresolved system roles, then validate the assembled design. A completed
  Resolve step can continue even when evidence-based site or technical checks
  remain visible for the validation and proposal stages.

The focused resolver and page contract are covered by
`recommendationResolution.test.ts`, `RecommendationsPage.resolution.test.tsx`
and `discoveryNetworkPath.test.ts`.
