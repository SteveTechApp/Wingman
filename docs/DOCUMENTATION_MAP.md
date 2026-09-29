# Wingman documentation map

_Last updated: 2026-09-17_

## Current / authoritative

| Document | Purpose |
|---|---|
| `docs/release-evidence/release-evidence-manifest.json` | **Release-status source.** Criterion state, evidence provenance, owner, and closure condition. |
| `docs/PRE_PRODUCTION_REPORT.md` | Generated release matrix plus retained risk and go/no-go narrative. |
| `docs/CURRENT_STATUS.md` | Generated at-a-glance release matrix plus engineering context. |
| `docs/V1_RELEASE_EVIDENCE.md` | Generated criterion matrix and release-authority policy. |
| `docs/DEVELOPMENT_MILESTONES.md` | Development roadmap to v1.0: measured state, recommended goals, release criteria. |
| `docs/launch-readiness-report.md` | Superseded gate list, kept so links resolve. |
| `docs/product-data-health.md` | Current product governance and data-risk summary. |
| `docs/OPERATIONS.md` | Operational runbook. |
| `docs/RENDER_STANDUP_RUNBOOK.md` | Exact-clicks Render stand-up: Supabase provisioning, Blueprint launch, secrets, staging acceptance checks, and uptime monitoring wiring. |
| `docs/SUPABASE_SETUP.md` | Supabase setup guide, incl. the Supabase access rules (pagination invariant, file-db-only decisions) and the nightly RLS job runbook (sentinel seeds, secret setup, red-run triage). |
| `docs/SUPABASE_SECRET_DRILL.md` | Secrets-configuration drill runbook: diagnose Supabase secret misconfiguration via the diagnostic workflow without a failing push. |
| `docs/LAUNCH_CHECKLIST.md` | Launch checklist; use with current status file. |
| `docs/LAUNCH_DECISION_BRIEF.md` | Decision brief for the five launch decisions (hosting, database, auth scope, API keys, audience) with grounded recommendations. |
| `docs/LAUNCH_DECISIONS_CHECKLIST.md` | One-page tick-through of the five launch decisions for the go/no-go meeting, pre-filled with the recommended answers. |
| `docs/LOAD_TESTING.md` | Load testing method. |
| `docs/MOBILE_UAT_PLAN.md` | Real-device mobile UAT plan that closes the `mobile-sales-uat` criterion, with the required evidence pack. |
| `docs/MOBILE_UAT_RESULT_TEMPLATE.md` | Fill-in session result template (becomes the evidence pack's `uat-summary.md`). |
| `docs/OFFLINE_RECONNECT_UAT_PLAN.md` | Airplane-mode offline/reconnect UAT protocol that closes the `offline-reconnect-uat` criterion: offline persistence, duplicate/replay, conflict preservation and resolution drills, with the evidence pack and result template. |

## Standards / guidance

| Document | Purpose |
|---|---|
| `docs/WINGMAN_PROPOSAL_SAFETY_STANDARD.md` | Proposal wording and safety standard. |
| `docs/PROJECT_LIFECYCLE_DICTIONARY.md` | Canonical `wingman_projects` stage/status vocabulary (data dictionary): lifecycle, client `ProjectStage`/`StatusVariant` mapping, one-way enrichment rule, extension procedure. Enforced by migration 014. |
| `docs/wingman-sales-copy-style.md` | Sales copy tone and wording standard. |
| `docs/wingman-native-schematic-engine.md` | Schematic engine design direction. |
| `docs/design/0001-project-workspace-persistence.md` | ADR-0001: B1 storage-model decision — server-authoritative with local cache vs local-first, with phases and exit criteria (closes P1-3). |
| `docs/CI_GUARD_GATES.md` | Verify-chain guard gates: what a dependency, lockfile, or product/governance-data edit must satisfy (reference-resolution, generated-manifest, build-deps, override-floor, governance-data, and ratchet gates), with the exception path for each. |

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

Release-criterion state is generated from the evidence manifest. For other facts, follow this order:

1. latest successful command output
2. current source/tests
3. current launch-readiness report
4. older audits/action plans
