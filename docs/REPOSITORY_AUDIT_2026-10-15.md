# Repository review and archive — 15 October 2026

## Scope and outcome

Reviewed the repository at `11772717` (cleanup PR #258), then applied the archive and validation fixes described here. Inventory: 1,949 tracked paths, 1,112 JS/TS source and tooling files, 29 approved routes. Static import tracing covered frontend and backend entrypoints; manual review focused on disconnected features, schematic validation, workflow handoffs, API permission/body/fetch boundaries, CI gates and dependency policy. This is a repository-wide structural audit with targeted manual code review, not a claim that every line or deployed environment has been independently verified.

The active tree loses **38 files / 2,009,433 bytes**. No approved route, product document, migration or catalogue source is removed. This reduces maintenance/search noise and checkout size; the disconnected UI was already outside the production bundle, so no runtime speed improvement is claimed. Git history size is unchanged.

## Findings

| Priority | Finding and evidence | Disposition |
| --- | --- | --- |
| P2 | HDBaseT endpoint validation used `!fromIsTx && !toIsRx`, suppressing the compatibility warning when just one endpoint had the wrong role. Reproduced with source→display and switcher→source connections. | Fixed to warn for either unsupported role. Two new regression cases failed before the fix; all four role combinations pass afterward. Existing heuristic still prompts confirmation, rather than claiming SKU-level port certification. |
| P2 | The unused-module gate scanned only `lib` and `data`, missing disconnected components/pages. Its regex resolver did not support `@/` aliases. Tests could remain green for UI never rendered in production. | Replaced with TypeScript import resolution over all frontend TS/TSX. Tests cover aliases, multiline imports, barrels, lazy imports, disconnected cycles, test-only importers and stale retention exceptions. The required visual CI gate now runs this check. |
| P2 | Workflow guards referenced `RequirementsAccordion` and the retired Discovery question screen. The workflow check failed on four stale markers; the topology check passed against an unreachable editor. | Updated guards to inspect the current expert builder, project→Discovery link and template-review→Discovery handoff. No placeholder markers added to application code. |
| P2 | The optional Product Pitch catalogue test looked for the Expert-only Technical Overview tab without a mode provider, so it always rendered Focused view. | Reproduced the failure, then used the real Expert mode provider in that test. All 43 catalogue tests now pass; production UI unchanged. |
| P2 | Default `verify:data` prints a revision-mode notice; ten catalogue acceptance suites are excluded from the default test run (`tools/catalogue-acceptance-tests.mjs`). A green standard pipeline therefore does not certify current product facts. | Retained revision policy; catalogue acceptance was also exercised separately for this audit. See validation results below. Restore strict data acceptance as a separate governed-data milestone. |
| P2 | Root dependency audit reports a moderate `sprintf-js` advisory propagated through `argparse`/`mammoth`; GitHub Dependabot alert #86 remains open at review time. Eight high-severity toolchain entries are covered by the existing `braces` exception expiring 6 November 2026. | Recorded, not hidden. The dependency gate passes under its existing policy; the server audit reports zero advisories. Concurrent dependency edits in the main checkout are preserved for their own validation. Do not use a blind `npm audit fix --force` downgrade. |
| P3 | `tsconfig.typecheck.json` enables `strict` but explicitly disables `noImplicitAny`. Passing typecheck is weaker than full strict mode; broad string indexing can therefore escape checking. | Documented follow-up: introduce a measured implicit-any baseline before enabling the flag. No global compiler relaxation or unrelated typing rewrite in this cleanup. |

## Useful disconnected code retained

All 12 retained modules have individual reasons in `tools/wingman-feature-surface-policy.json`. They remain in the active tree deliberately; their existence is not evidence that users can reach those features today.

| Code / feature | Why keep it | Recommended use |
| --- | --- | --- |
| `TemplateCompletionChecklist.tsx` and `lib/templateCompletionChecklist.ts` | Completeness presentation plus CLI coverage scorecard and tests. | Add a completeness panel to template review after a deliberate UX decision. |
| `AVSignalFlowDiagram.tsx` | Lightweight optional signal-flow presentation, guarded by the visual-support check. | Reuse for a compact overview where the full schematic is unnecessary. |
| `RoomSchematicDiagram.tsx` | Product-level schematic with cheat-sheet/topology regression coverage. | Keep for product-sheet/export presentation; avoid building another full diagram editor. |
| `GuruCallNotesInterpreter.tsx` | Reusable free-text and voice-note interpretation. | Evaluate integration with Call Coach; do not expose a duplicate conversation workflow automatically. |
| `logic/matrixOutputModel.ts` | Routed/mirrored/loop output separation, checked by a dedicated reference-model guard. | Compare against the live topology model before consolidation; its guard does not certify live comparison behaviour. |
| `scenarioValidation.ts` | Recommendation scenario test harness. | Retain as test infrastructure. |
| `competitorMatchDecisionSnapshot.ts` | Snapshot generation and decision regression tooling. | Retain as data governance infrastructure. |
| `templateRealismAuditEntry.ts` | Loaded through a tool-generated bundle. | Retain despite no static route importer. |
| Both `lib/testHelpers` modules | Full-product fixtures and governed-coverage injection. | Retain; removing them would weaken evidence-loss tests. |
| `discoveryCrossFieldRules.ts` | Shared auditors for defaults and saved-project consistency tests. | Retain as validation support, not a disconnected page. |

## Archived material

- Fourteen superseded UI/test files: the old Discovery question/location/summary/completion presentation, old requirements accordion/input, and unused template concept overview. Current replacements are `DiscoveryExpertBuilder`, `DiscoveryRoomWizard`, `DiscoveryRoomLocations`, `TemplateReviewPage`, and the project link back to Discovery. Domain models and shared data remain active.
- `tools/check-discovery-reference-layout.mjs`: uninvoked historical layout snapshot guard, already failing on an old CSS marker.
- All 23 files under `docs/repo-audit/`: August inventory/CSV/layout snapshots, with no external references found. Current audit replaces their role; original evidence remains recoverable.

Recovery source: **`codex/archive-pre-audit-20261015`**, pushed before removal. Exact immutable commit and per-file SHA-256/byte counts are in [the archive manifest](REPOSITORY_ARCHIVE_2026-10-15.json).

```powershell
git fetch origin codex/archive-pre-audit-20261015
git restore --source origin/codex/archive-pre-audit-20261015 -- path/from/manifest
```

Restore related tests with a component, review its imports against the current architecture, and remove/update its retention exception if it becomes routed. Do not restore the whole archive over current files.

## Material deliberately not archived

- Catalogue JSON, evidence, media and 44 product-document files: runtime URL/manifest and maintenance consumers are not equivalent to TS imports. The data-source audit scanned 563 data-like files and found **zero safe archive candidates**. Its 489 potentially unreferenced files and 678 repeated SKU definitions are heuristic review candidates, not deletion permission or proof of duplicate runtime records.
- All 16 migration files, deployment configuration, API routes and release evidence: absence of frontend imports is not proof that external callers or operations do not need them.
- CSS: dynamic classes and shared styling require rendered coverage before pruning. The style budgets were not raised.
- Compatibility API endpoints: preserve contract-tested external interfaces even when no frontend caller exists.
- Existing archive branches, ignored runtime state, local dependencies and build outputs: no destructive disk cleanup performed.

## Security and operational review limits

Inspected the central permission gate, request-size limit, fetch URL/redirect guards and optional CSRF guard. Existing API, fetch-target and workflow regressions remain enabled. Source search found no `eval`, `new Function`, `dangerouslySetInnerHTML` or shell execution calls in active frontend/backend non-test source. This is a limited pattern check, not a security certification.

CSRF enforcement remains explicitly disabled by default; production cookie defaults are restrictive, but deployment settings and browser interoperability require separate staging validation before changing enforcement. Conditional live-database CI jobs were skipped; no production database, secrets, external network service or remote deployment was changed or penetration-tested.

## Validation results

- Baseline PR #258: 2,795 tests passed, one skipped; all required GitHub checks passed and the PR merged.
- New focused regressions: 18 tests passed (14 schematic constraints, four import-reachability cases).
- Optional catalogue acceptance: all 43 tests across ten files pass after repairing the Expert-view test setup. Strict data scripts and live deployment checks are separate from this result.
- Frontend reachability after cleanup: **402 modules, 390 reachable, 12 documented support modules, zero unclassified orphans**. All 29 approved routes remain.
- Updated workflow/topology/markup guards pass; full visual verification passes, including proposal output parity.
- Build verification, architecture and size budgets passed on the pre-archive baseline; final post-change gates are recorded with the audit PR.
- Dependency policy gate passes with the pre-existing exceptions and moderate advisory noted above; raw `npm audit` is not clean.

Required CI passing is an engineering merge gate, not full catalogue or production-readiness approval.
