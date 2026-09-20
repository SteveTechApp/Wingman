# Wingman current status

Wingman remains a late-beta product suitable for a controlled authenticated internal pilot. A
v1.0 production label requires dated external evidence; local automated success does not close
human, staging, or production-observation criteria.

<!-- release-evidence:start -->
## Release evidence status

_Generated from `docs/release-evidence/release-evidence-manifest.json` · Measured: not measured · Commit: not recorded_

| Criterion | Status | Artifact | Owner | Closure condition |
|---|---|---|---|---|
| Mobile sales representative UAT | **Blocked** | Evidence not supplied | Sales lead + release owner | Attach a dated, signed result from the agreed phones and tablets. |
| Offline edit and reconnect UAT | **Blocked** | Evidence not supplied | Engineering + mobile tester | Attach dated real-device evidence covering reconnect, duplicate update, and conflict resolution. |
| Production-like authenticated load | **Blocked** | Evidence not supplied | Infrastructure + performance owner | Attach authenticated staging measurements with p95, p99, and error rate. |
| Production journey observation window | **Blocked** | Evidence not supplied | Operations + product analytics | Attach a dated operational export after a representative production observation window. |
<!-- release-evidence:end -->

## Engineering context

Per-project push, lightweight catalogue delivery and the canonical Design Project decision graph
are implemented. Proposal semantic parity across screen, DOCX and PDF is protected by an automated
gate. These engineering results remain useful context, but are intentionally separate from the
release-evidence criteria above.

## Authoritative documents

- `docs/release-evidence/release-evidence-manifest.json` — single source for criterion status and ownership.
- `docs/PRE_PRODUCTION_REPORT.md` — risks and go/no-go narrative.
- `docs/DEVELOPMENT_MILESTONES.md` — roadmap and v1.0 criteria.
- `docs/V1_RELEASE_EVIDENCE.md` — generated criterion-by-criterion evidence matrix.
- `docs/LAUNCH_CHECKLIST.md` — launch procedure.

Refresh generated status with `npm run generate:release-docs`; verify it with
`npm run check:release-docs`. Update measured dates and commits only when the manifest references
the corresponding evidence.
