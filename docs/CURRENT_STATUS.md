# Wingman current status

_Measured: 2026-09-08 · `main` @ `2f8f3a5c`_

| Signal | Current evidence |
|---|---|
| Build and quality | Full `npm run verify` passed through all five stages during the commit hook |
| Tests | 2,368 passing across 308 Vitest files |
| Product data | 315 WyreStorm and 354 competitor products across 28 competitor brands |
| Governed technical data | 133/133 active lead SKUs verified; 22 specifiable leads verified-with-warning and 1 review-required |
| Product stories | 137/137 active catalogue SKUs covered |
| Release posture | Late beta; suitable for a controlled internal pilot, not yet evidenced for v1.0 |

The engineering baseline is green. Remaining release risk is evidence and scale: real mobile
sales UAT, a production-like staging load run, offline reconnect evidence, large-workspace
performance, export-format semantic parity and journey-level observability remain open.

## Authoritative documents

- `docs/PRE_PRODUCTION_REPORT.md` — current evidence, risks and go/no-go position.
- `docs/DEVELOPMENT_MILESTONES.md` — roadmap and v1.0 criteria.
- `docs/superpowers/plans/2026-09-08-v1-release-evidence-sequence.md` — execution sequence.
- `docs/LAUNCH_CHECKLIST.md` — launch procedure.

Refresh this page only from executed commands. The primary local gate is `npm run verify`.
