# Projects and Responses visual refresh

Goal: Make projects recognisable by room context and response authoring feel like creating a customer document.

Design reference: two generated page concepts in this task. Projects uses a three-column room-photo gallery with a compact action footer. Responses uses a five-step rail, two-column fields and a white document preview. Keep existing navigation, dark editing surfaces and real project data.

Tokens: midnight #06131f, surface #10273a, aqua #25d8c9, paper #ffffff, text #eff7fc, muted #9db0bf. Existing UI sans for interface and strong 28–34px headings; Georgia for the illustrative document title. Gaps 16–24px, gallery imagery 16:8, radii 12px. The white paper preview is the primary contrasting element.

- Fix proposal CSS routing for responsePack without duplicating the old rule set.
- Replace the project table with accessible project articles, retaining ownership, status, conflict warnings, filtering, copy/delete and resume actions.
- Reuse local application imagery, clearly identify it as illustrative and provide a neutral fallback.
- Replace repeated response-sidebar prose with a cover preview driven by the live draft.
- Verify project actions, wizard steps, responsive layouts, production build and strict typecheck. Inspect screenshots at laptop and mobile widths.
