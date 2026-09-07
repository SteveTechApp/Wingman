# Wingman Project stage/status data dictionary

_Authoritative vocabulary for `wingman_projects.stage` and `wingman_projects.status`. Last updated 2026-09-03._

## Purpose

Every Wingman project exists in two forms that speak two different vocabularies:

- the **project document** (the object the client stores and syncs, and the JSON blob
  inside the `wingman_projects.payload` column) speaks the client vocabulary:
  `ProjectStage` (`Discovery | Competitor Compare | Proposal Builder | Recommendations |
  Templates | Support`) and `StatusVariant` (`recommended | caution | alternative`);
- the **relational row columns** `wingman_projects.stage` and `wingman_projects.status`
  are CHECK-constrained to a canonical account lifecycle vocabulary (named constraints
  `wingman_projects_stage_check` / `wingman_projects_status_check`, enforced on every
  provisioning route by migration 014 — see below).

This dictionary is the single definition of the canonical vocabulary, the lifecycle each
canonical value belongs to, and the total mapping from client values to canonical values.
Future flows (server code, migrations, analytics, reporting) must consume and emit the
canonical vocabulary in row columns and the client vocabulary inside `payload` — never a
third vocabulary. If a flow needs a new value, extend the vocabulary through the procedure
in [Extending the vocabulary](#extending-the-vocabulary), which keeps the CHECK constraint,
the code maps, the tests, and this file in one change.

The mapping is enforced at snapshot build time by `server/project-row-vocabulary.mjs`
(`canonicalStageForRow` / `canonicalStatusForRow`), wired into `writeDbToSupabaseTables` in
`server/wingman-app-store.mjs`. See ADR-0001 §1.2g for the incident that created it.

## Canonical row vocabulary (relational columns)

### Canonical stage lifecycle

The canonical stage is a coarse account lifecycle:

```
Discovery → Design → Proposal → Deployment → Support
```

| Canonical stage | Meaning for analytics and row-level reporting |
|---|---|
| `Discovery` | The account need is being captured (requirements, scope, room model). |
| `Design` | The solution is being selected and designed (matching, compare, recommendations). |
| `Proposal` | The priced proposal and BOM are being produced. |
| `Deployment` | The project moved to implementation/deployment. |
| `Support` | The account is in the post-sale support phase. |

The arrow is an analytic convention, not a state machine: the column has no transition
gate, and a row may legitimately be written at any of the five values at any time (for
example a legacy project seeded directly at `Deployment`). Consumers that need an exact
sequence should order by the list order above, never by string sort.

### Canonical status lifecycle

The canonical status is a commercial readiness lifecycle:

```
Draft → In Progress → Commercial Ready → Archived
```

| Canonical status | Meaning for analytics and row-level reporting |
|---|---|
| `Draft` | Work exists but is not being actively progressed toward a quote. |
| `In Progress` | The work is actively being progressed (flagged, still being worked). |
| `Commercial Ready` | The work is ready to ship as a commercial proposal. |
| `Archived` | The project is closed/retired and no longer active. |

`Commercial Ready` is written into documents by the server's own mark-ready gate, so
canonical status values pass through the client mapping untouched (see below).

## Client vocabulary → canonical mapping

The client stage is a workflow route; the client status is a recommendation-quality
axis. The mapping below is **total**: every value a document can carry resolves to a
canonical value, and an unrecognised value falls back to the column default rather than
ever risking a CHECK violation — one bad row would fail the whole workspace's
single-transaction commit.

### ProjectStage → canonical stage

| Client `ProjectStage` | Canonical `stage` | Rationale |
|---|---|---|
| `Discovery` | `Discovery` | Same concept. |
| `Competitor Compare` | `Design` | Choosing the solution is a design-phase activity. |
| `Recommendations` | `Design` | Choosing the solution is a design-phase activity. |
| `Proposal Builder` | `Proposal` | Producing the priced proposal. |
| `Templates` | `Proposal` | Template adaptation also produces the proposal/BOM. |
| `Support` | `Support` | Same concept. |
| `Finder` (legacy alias) | `Design` | Pre-rebrand name for `Recommendations`; the client normaliser maps it to `Recommendations` before sync. |
| `Discovery`/`Design`/`Proposal`/`Deployment`/`Support` (canonical strings appearing in a document) | the same canonical value | Canonical values pass through untouched (e.g. documents the server itself wrote). |
| anything else | `Discovery` (column default) | Total mapping fallback; never reaches the CHECK with an invalid value. |

### StatusVariant → canonical status

| Client `StatusVariant` | Canonical `status` | Rationale |
|---|---|---|
| `recommended` | `Commercial Ready` | The recommendation is ready to ship. |
| `caution` | `In Progress` | Flagged, still being worked. |
| `alternative` | `Draft` | Not yet the recommended path. |
| `Draft`/`In Progress`/`Commercial Ready`/`Archived` (canonical strings appearing in a document) | the same canonical value | Canonical values pass through untouched. |
| anything else | `Draft` (column default) | Total mapping fallback. |

## The one-way enrichment rule

The mapping is **strictly one-way relational enrichment**:

- The constrained row columns carry only canonical values.
- The client's original strings are never overwritten: the full document travels
  verbatim inside the `payload` JSONB, and every read rebuilds documents from that
  payload (`readDbFromSupabaseTables`). The client therefore always round-trips its own
  `ProjectStage`/`StatusVariant` strings and never sees the canonical values.
- Analytics and reporting must aggregate on the canonical **row columns**; anything that
  needs the client's workflow-route view must read `payload.stage`/`payload.status` and,
  if it must compare or join on them, convert with the tables above — never assume the
  client strings satisfy the row CHECK constraint.

## Where the vocabulary is enforced

| Layer | Location |
|---|---|
| DDL (canonical values + CHECK) | Migration 014 (`server/migrations/014_project_stage_status_dictionary.sql` and the byte-identical `supabase/migrations/20260903_project_stage_status_dictionary.sql`) carries the migration-time data dictionary and enforces the named `wingman_projects_stage_check` / `wingman_projects_status_check` constraints on BOTH provisioning routes. Migration 001 (`server/migrations/001_initial_schema.sql`) created the same inline checks for the server route from the start. |
| Server mapping code | `server/project-row-vocabulary.mjs` (`CANONICAL_PROJECT_STAGES`, `CANONICAL_PROJECT_STATUSES`, `canonicalStageForRow`, `canonicalStatusForRow`). |
| Write path wiring | `writeDbToSupabaseTables` in `server/wingman-app-store.mjs` (row building calls the canonicalisers; the `payload` blob keeps client strings). |
| Unit tests | `server/project-row-vocabulary.test.mjs` pins the full mapping and its totality. |
| End-to-end | `server/project-store-hydration.e2e.test.mjs` case 6 syncs real client projects in `supabase-tables` mode and asserts CHECK-safe row columns with the client vocabulary intact after hydration. |
| Live regression | The load harness corpus (`tools/load-test.mjs`) speaks the real client vocabulary, so a `supabase-tables` load run against real Postgres is a live CHECK-constraint regression test (verified live 2026-09-03, ADR-0001 §1.2g). |

## Provisioning-route alignment (why migration 014 exists)

The two migration sets are applied by different routes: the operator runbook applies
`server/migrations/` (which created the stage/status CHECKs inline in migration 001),
while the Supabase GitHub integration applies `supabase/migrations/` (whose base table
files created `wingman_projects` without the CHECKs). Before migration 014, an
environment provisioned from the Supabase set would silently accept verbatim client
values in the canonical columns — the same failure the hosted project hit before
§1.2g, but without the loud 23514 that made it visible. Migration 014 adds the named
constraints idempotently on both routes: already-constrained environments are a no-op;
constraint-less environments gain the backstop. If 014 fails validation, rows outside
the canonical vocabulary exist in that database (written before the constraint) and
must be canonicalised or removed first.

## Extending the vocabulary

Any new stage or status touches four places, and the change must keep them in lockstep:

1. **DDL** — a new migration that widens the `CHECK` on `wingman_projects.stage` /
   `wingman_projects.status` (both `server/migrations/` and the dated mirror in
   `supabase/migrations/`, byte-identical) and updates the migration-time dictionary
   header in migration 014 if the lifecycle prose changes.
2. **Server mapping** — `CANONICAL_PROJECT_STAGES` / `CANONICAL_PROJECT_STATUSES` and the
   `*_TO_CANONICAL` maps in `server/project-row-vocabulary.mjs`, including any new client
   value that should resolve to it.
3. **Client type** — the `ProjectStage` / `StatusVariant` unions in `src/wingman2`
   (`data/projectStore.ts` / `types.ts`) when the new value is client-visible.
4. **Tests and this file** — extend `server/project-row-vocabulary.test.mjs` (the mapping
   must stay total), and keep the tables above current.

A value that exists only server-side (for analytics) still needs steps 1, 2 and 4; it does
not need a client union member because canonical values pass through the mapping and the
client never renders row columns directly.
