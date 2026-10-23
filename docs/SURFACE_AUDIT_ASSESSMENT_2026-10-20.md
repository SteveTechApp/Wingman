# Surface audit assessment — 20 October 2026

The three supplied reports identify maintenance debt and measurement limitations, but do not establish broken routes or justify bulk CSS removal.

| Report | Assessment | Action |
|---|---|---|
| Feature surface | All 29 routes passed. The six unfinished markers were ordinary prose, Spanish/Portuguese translations and a wizard state value. | Replaced the broad case-insensitive match with explicit marker/placeholder detection and regression fixtures. Regenerated report: zero unfinished markers, zero unreachable candidates. |
| Style drift | Repeated literals are real maintenance debt. Counts alone do not establish incorrect rendering; export/SVG colours and page scoping may be intentional. | Consolidated repeated video-wall colours into local named variables. Literal count fell from 139 to 52, retaining original values and selectors. No baseline was raised. |
| CSS coverage | 4,413 unmatched rules are unobserved in the measured route loads, not proven unused. Generated and interaction styles also need separate treatment. | Added an explicit limitation to the report generator and re-rendered the existing measurements. No CSS was deleted on this evidence. |

## Evidence for keeping unobserved rules

- `DiagramViewport.tsx` renders `.wm-diagram-controls`.
- `ProjectScopeSchedule.tsx` renders `.wm-design-schedule` and its child classes.
- `ProjectWorkflowNavigator.tsx` renders `.wm-project-records` inside a disclosure.
- The video-wall wizard renders multiple question/result states; a route-load snapshot cannot cover them all.

## Verification

- Marker regression tests: 2 passed, covering all six reported false positives and eight genuine marker/placeholder examples.
- Coverage report tests: 6 passed.
- Feature surface audit and its orphaned-module gate: passed.
- Style drift baseline gate: passed. Current totals: 1,778 hex literals, 1,834 rgb/rgba literals, 50 inline styles, 251 arbitrary Tailwind values, 2,341 page sections, zero legacy pills.
- Production build and Tailwind output check: passed. Build emitted two chunk-size review warnings.
- CSS edit was restricted to literal-to-variable substitutions and declarations; original literal values were retained. No visual/browser regression sweep was performed.
- Changed files synchronized from the worktree to main and checked for byte equality.

The supplied style report had 1,861 hex literals. The current main checkout had newer concurrent edits, so the attributable reduction for this task is the 87 video-wall literals, not the difference between historical and current repository totals.

## Remaining work, ordered by value

1. Extend coverage to populated project records/schedules, diagram expansion, template list view, video-wall results and failure states. Validate authentication and route readiness before collecting usage. Retain the existing report as route-load evidence; its measurements were not rerun here.
2. Review statically impossible selectors against the source and dynamic class construction before deleting individual rules. A missing match in this report is insufficient.
3. Consolidate route-overrides and workflow-theme colours incrementally, grouped by component and semantic role, with browser verification. Those two files account for most reported drift. A wholesale token or selector rewrite is not supported by the supplied evidence.

These follow-ups remain open; this change does not claim to eliminate all style debt or provide complete interaction coverage.
