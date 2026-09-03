# Wingman documentation map

_Last updated: 2026-07-05_

## Current / authoritative

| Document | Purpose |
|---|---|
| `docs/PRE_PRODUCTION_REPORT.md` | **Live status source.** Executed gate results, ranked blockers, and the plan to production. |
| `docs/CURRENT_STATUS.md` | At-a-glance summary; points at the pre-production report. |
| `docs/launch-readiness-report.md` | Superseded gate list, kept so links resolve. |
| `docs/product-data-health.md` | Current product governance and data-risk summary. |
| `docs/OPERATIONS.md` | Operational runbook. |
| `docs/SUPABASE_SETUP.md` | Supabase setup guide, incl. the Supabase access rules (pagination invariant, file-db-only decisions). |
| `docs/LAUNCH_CHECKLIST.md` | Launch checklist; use with current status file. |
| `docs/LOAD_TESTING.md` | Load testing method. |

## Standards / guidance

| Document | Purpose |
|---|---|
| `docs/WINGMAN_PROPOSAL_SAFETY_STANDARD.md` | Proposal wording and safety standard. |
| `docs/wingman-sales-copy-style.md` | Sales copy tone and wording standard. |
| `docs/wingman-native-schematic-engine.md` | Schematic engine design direction. |

## Product governance

| Document | Purpose |
|---|---|
| `docs/product-story-coverage-backlog.md` | Product story coverage state. |
| `docs/wyrestorm-lifecycle-reconciliation.md` | Lifecycle reconciliation output. |
| `docs/wyrestorm-lifecycle-manual-decisions.md` | Manual lifecycle decisions. |
| `docs/wyrestorm-product-lifecycle.md` | Lifecycle mechanism. |
| `docs/product-story-cleanup/` | Product-story review and cleanup evidence. |

## Generated / review

| Document | Purpose |
|---|---|
| `docs/text-hygiene-report.md` | Generated hygiene scan report. Treat as generated evidence. |
| `docs/production-readiness-audit.md` | Historical/dated readiness audit unless refreshed. |

## Rule

When documents disagree, follow this order:

1. `docs/CURRENT_STATUS.md`
2. latest successful command output
3. current source/tests
4. current launch-readiness report
5. older audits/action plans
