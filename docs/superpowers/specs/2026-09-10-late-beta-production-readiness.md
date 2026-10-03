# Wingman Late-Beta Production-Readiness Spec

**Source:** Independent assessment supplied by the user on 2026-09-10, tested against GitHub `main` at commit `d4a5c07`.

## Objective

Move Wingman from a credible late-beta internal sales/pre-sales tool toward a dependable v1.0 candidate by closing the eight concrete findings below without weakening its existing fail-closed, evidence-led behaviour.

## Baseline

- Full verification passed.
- TypeScript, lint, build, and size gates passed.
- 2,374 automated tests passed and 1 skipped.
- 194 additional feature-focused tests passed.
- 19 authenticated API tests passed.
- 314 WyreStorm products; all 133 governed lead products have verified profiles.
- 354 competitor products across 28 brands.
- 55 templates.

## Required workstreams, in priority order

1. Correct analogue-audio ports incorrectly labelled `RJ45 / Ethernet` for `AMP-2120`, `COM-MIC-HUB`, and `NHD-600-E-TXRX`; widen semantic validation beyond the current narrow `5-pin balanced audio` wording.
2. Separate local patch lengths from infrastructure and endpoint-route lengths so a 70 m building route cannot create a generic local HDMI extender or warning.
3. Add blind requirement-to-BOM acceptance scenarios that begin with customer requirements and independently assert selected architecture, products, quantities, dependencies, exclusions, and quote-safety state.
4. Resolve the three source/display-ratio warnings for Retail Multi-Zone Signage, Science/STEM Teaching Lab, and Clinic/Pharmacy Waiting templates with explicit intentional shared-content assumptions.
5. Rebuild genuine Windows browser regression coverage for key workflows and responsive states.
6. Complete mobile/tablet UAT and multi-device offline/reconnect validation with reproducible evidence.
7. Visually compare screen, DOCX, and PDF proposal outputs and gate material content drift.
8. Standardise terminology so interface scope, discovery depth, and voice interview are three clearly named, non-overlapping concepts.

## Global acceptance criteria

- The authoritative governed data and all generated/public derivatives agree.
- Customer-facing technical surfaces never label Phoenix/Euroblock/TRS analogue audio as Ethernet/RJ45.
- Requirement-derived recommendations are tested without seeding a preferred product candidate.
- Existing quote-safety, lifecycle, data-governance, size-budget, style-drift, and sales-language ratchets remain green.
- The real typecheck command is `npm run typecheck` (`tsconfig.typecheck.json`).
- Server Vitest suites run through `npx vitest run`, never raw `node --test`.
- Windows preview processes are terminated with `Stop-Process -Id <pid> -Force`, and stdout/stderr use separate log files.
- Worktree and main-checkout copies must remain byte-identical after any worktree-based execution.

