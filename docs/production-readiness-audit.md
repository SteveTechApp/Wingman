# Wingman Production Readiness Audit

Date: 2026-04-18

## Verdict

Wingman is not production-ready.

The current `Wingman2` client is a strong routed application shell, but most revenue-path features remain presentation-first and are not yet backed by shared persisted state or live end-to-end workflow execution.

## What Is Ready

- Canonical client runtime is isolated to `src/wingman2`.
- Route inventory and feature inventory are centralized.
- Build, typecheck, lint, and route-manifest checks pass.
- Local API starts and serves health, product intelligence, workspace/auth, and agent endpoints.
- Product intelligence database exists and contains live records in `data/product-intelligence-db.json`.

## What Blocks Production

### Client workflow readiness

- Dashboard metrics are static.
- Projects uses seeded opportunity data.
- Discovery uses local component state only.
- Finder recommendations are static.
- Compare renders a static comparison and does not drive from live lookup results.
- Ingest selects files but does not extract or persist requirements.
- Proposal is a static preview rather than assembled output.
- Videowall has path selection but no sizing, topology, or BOM engine.

### Backend truth and drift

- Active server routes live in `server/routes/agents.mjs`, while a second unused agent router still exists in `server/server/routes/agents.mjs`.
- Some server catalog paths still reference archived `src/data` locations.
- Governance data still falls back because the archived source path is no longer canonical.

### Agent readiness

- `discovery`, `architect`, and `validate` are usable as heuristic pipeline steps.
- `proposal`, `guru`, and `competitor` are still scaffold endpoints in the active server.
- Separate Gemini-backed agent code exists but is not the active runtime truth.

### Verification gaps

- `verify` checks compilation and route-manifest completeness only.
- There are no integration tests, browser tests, or workflow assertions.
- The public product index can be regenerated as empty while build still passes.

## Production Readiness By Feature

| Feature | Status | Assessment |
| --- | --- | --- |
| Dashboard | Partial | Routed and usable as a launcher, but metrics are static. |
| Projects | Partial | UI exists, but no active persisted project workflow in the client. |
| Discovery | Partial | Guided UX exists, but no structured saved output. |
| Finder | Partial | Good shell, static shortlist. |
| Compare | Partial | Good shell, static comparison despite real backend surface. |
| Templates | Partial | Routed static room archetypes only. |
| Videowall | Partial | Interactive path selection only. |
| Sales Helper | Wired | Useful static guidance module. |
| Call Cards | Wired | Useful static call support module. |
| Ingest | Partial | File selection only. |
| Proposal | Partial | Static proposal preview only. |
| Support | Wired | Useful audit and escalation hub, but no real escalation workflow. |

## Highest-Priority Remediation Order

1. Establish a single canonical runtime data tree outside `src` and repoint server/build tools to it.
2. Fix product intelligence generation so client and server consume the same source of truth.
3. Remove or archive duplicate backend agent surfaces and name one runtime truth.
4. Add production-readiness checks to verification.
5. Wire the client revenue path to shared persisted state:
   discovery -> finder -> compare -> proposal -> project save.
6. Replace scaffold agent endpoints or remove them from the active product surface.
7. Add integration and browser tests for core workflows.

## First Remediation Pass

This remediation pass should:

- restore canonical catalog and governance data under `data/`
- repoint runtime code away from archived `src/data` paths
- fix public product index generation
- add a production-readiness verification check

