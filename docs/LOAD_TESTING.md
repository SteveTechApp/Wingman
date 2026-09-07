# Wingman Load Testing Guide

_Last measured: 2026-09-03 — file storage (local host) and Supabase-backed
(`supabase-tables`, hosted project) baselines recorded below._

Load tests run the **real API server** (`server/competitor-lookup-server.mjs`)
with **authenticated workspace sessions** and benchmark the flows a sales rep
actually hits. There are two tools:

| Tool | What it benchmarks | How |
|---|---|---|
| `tools/load-test.mjs` (`npm run load-test`) | Authenticated HTTP flows: project save/load, Compare, health; payload-limit behaviour | Boots the real server on a throwaway port + data dir, signs up one throwaway workspace per virtual user, fires concurrent requests, reports p50/p95/p99, error rate, throughput and payload sizes |
| `tools/proposal-export-load.test.mjs` (`npm run load-test:proposal-export`) | Proposal compilation/export | Proposal DOCX generation is **client-side** code (`src/wingman2/lib/proposalDocxExport.ts`); the benchmark times the real compile path (`buildProposalDocx` + `Packer.toBuffer`) in-process under vitest |

Supabase-backed synchronization is a property of the **server's storage mode**
(see "Supabase synchronization" below): boot the same harness-spawned server
with `--storage-mode supabase-tables` + `SUPABASE_*` credentials exported to
the harness (or point the harness at such a deployment with `--url`) and the
sync flow exercises the Supabase commit path. Every run prints the server's
configured/active storage mode so a file-mode result is never mistaken for a
Supabase result.

## Quick Start

```bash
# Standard benchmark: boots its own server, authenticated sessions, all flows
npm run load-test

# Quick validation (~5 concurrent, 20 requests per scenario)
npm run load-test -- --level smoke

# Proposal DOCX export compile benchmark (60 iterations)
npm run load-test:proposal-export

# Stress against the harness's own server with 8 workspace sessions
npm run load-test -- --level stress --users 8

# Supabase-backed run (harness's own server in supabase-tables mode):
# export SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY),
# then pass --storage-mode. The spawned server runs fail-closed so every 200
# means the snapshot commit landed in Supabase.
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SECRET_KEY=<service-role-key>
npm run load-test -- --storage-mode supabase-tables --timeout 30000

# Against an already-running deployment (staging); reuses one session cookie
# so the signup rate limit is not hit
node tools/load-test.mjs --url https://staging.example.com --users 2 --cookie "<wingman_session value>"

# Enforce the recorded budgets (CI-able gate) - exit 2 on violation
npm run load-test -- --level standard --strict

# Sweep leftover artifacts after a failed / --keep-db-data supabase run
# (no server, no signups - deletes by the loadtest markers, self-verifies zero)
npm run load-test:cleanup:dry-run   # preview what would be deleted
npm run load-test:cleanup           # delete + verify
```

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | *(own server)* | Target server. When omitted the harness boots `competitor-lookup-server.mjs` on port 8897 with a throwaway data dir (file storage). |
| `--level <level>` | `standard` | `smoke` / `standard` / `stress` / `spike` (concurrency + request presets below). |
| `--concurrency <n>` | level preset (10) | Concurrent requests per scenario. |
| `--requests <n>` | level preset (100) | Measured requests per scenario. |
| `--scenarios <list>` | all | Comma-separated: `health, project-list, project-save, compare, payload-413`. Two opt-in ids: `project-put` benchmarks the per-project revisioned PUT (ADR-0001 Phase 1, single-row guarded commit), and `hydrate-since` runs a **post-run benchmark** of the incremental-hydration payload after `project-save` rows exist (run it as `--scenarios project-save,hydrate-since`). |
| `--users <n>` | `3` | Virtual workspace sessions, each signed up via `/api/wingman/auth/signup`. Local runs raise the signup rate limit for the spawned server. |
| `--payload <preset>` | `standard` | Project corpus for `project-save`: `small` / `standard` / `large` (sizes below). |
| `--timeout <ms>` | `5000` | Per-request timeout. |
| `--cookie <value>` | — | Reuse an existing `wingman_session` cookie instead of signing up (staging runs). |
| `--strict` | off | Fail with exit code 2 when p95/p99/error-rate exceed the recorded budgets below. |
| `--keep-data` | off | Keep the throwaway data dir + server log after a passing run. Failures always keep them. |
| `--keep-db-data` | off | Keep a verified `supabase-tables` run's signups/workspaces/project rows in Supabase instead of deleting them. |
| `--cleanup-only` | off | **Cleanup mode** (no server, no signups): discover and delete leftover load-test artifacts from prior failed or `--keep-db-data` runs, keyed on the loadtest markers (`loadtest-*@example.com` users, `Load Test Co` workspaces, `load-u<N>-project-<K>` project ids), FK-safely and self-verified zero remain. Needs `SUPABASE_URL` + service-role key in the harness env. |
| `--dry-run` | off | With `--cleanup-only`: list what would be deleted without deleting anything. |
| `--storage-mode <m>` | `file` | Storage mode for the **spawned** server: `file` / `supabase` / `supabase-tables`. `supabase*` needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) in the harness env; ignored with `--url`. Remote modes spawn **fail-closed** so a failed remote write fails the request instead of silently falling back to the local file store. Spawned `supabase-tables` runs **auto-verify** afterwards that every workspace's rows persisted (direct PostgREST read-back, `tools/load-test-persistence.test.mjs`) and exit 1 on any mismatch — no manual read-back needed; a **verified** pass then **deletes the run's own rows** (signups, workspaces, project rows — self-verified zero remaining) so repeated runs never need manual DB cleanup. |
| `--help` | — | Show help. |

### Load levels

| Level | Concurrency | Requests/scenario | Purpose |
|-------|-------------|-------------------|---------|
| Smoke | 5 | 20 | Quick validation after harness or server changes |
| Standard | 10 | 100 | Default baseline; the numbers below are standard-level |
| Stress | 50 | 500 | Capacity testing |
| Spike | 100 | 1000 | Peak load testing |

### Exit codes

- `0` — every scenario passed (100% success, over-cap probe rejected as expected)
- `1` — request failures, harness/server error, or probe did not behave
- `2` — `--strict`: recorded budgets exceeded

## Benchmark flows

| Scenario | Request | Session | What it measures |
|----------|---------|---------|------------------|
| `health` | `GET /api/health` / `GET /api/ready` (round-robin) | no | Public health + readiness probes |
| `project-list` | `GET /api/wingman/projects` | yes | **Project load**: workspace project list from the backend store |
| `project-save` | `POST /api/wingman/projects/sync` | yes | **Project save**: full workspace sync POST (mirrors what `projectStore.ts` sends — `{ activeProjectId, projects[] }` with discovery brief, selections, compare runs, proposal + versions, requirements, evidence, audit trail) |
| `project-put` (opt-in) | `PUT /api/wingman/projects/:id` | yes | **Per-project revisioned save** (ADR-0001 Phase 1 §1.2l): one project document per request against the per-project route, so supabase-tables mode exercises the migration-015 single-row guarded commit (row-revision CAS + audit + register advance) instead of the whole-snapshot sync POST. Compare it with `project-save` on the same run to isolate the store-lock queue and whole-DB RPC cost. Not in the default loop so recorded whole-store baselines stay comparable. |
| `compare` | `POST /api/wingman/competitor-lookup` | yes | **Compare**: the endpoint the Compare page calls, exercised with a deterministic known competitor (`Crestron DM-NVX-350`) |
| `payload-413` | `POST /api/wingman/projects/sync` (2 MiB body) | yes | Payload-limit probe: an over-cap body must be rejected, never 500 |
| `hydrate-since` (post-run) | `GET /api/wingman/projects` ± `X-Wingman-Since` | yes | **Incremental-hydration payload saving** (ADR-0001 §1.2k): full reload GET vs a since GET whose manifest is current (0 rows expected) vs one with exactly one stale revision (1 row expected). Reports mean bytes and latency per request kind. Runs after the scenario loop, not inside it. |

Each scenario fires 4 unmeasured warm-up requests first so one-off cold starts
(competitor catalog load, first store read) do not skew p95/p99 at small
request counts — except `project-put` and `payload-413`, which skip warm-up
(project-put accumulates one persisted row per PUT, so an unmeasured warm-up
row would break the exact rows == successes attribution; payload-413 is a
contract probe).

### Project-save corpus presets

| Preset | Projects | Measured request body | Contents |
|--------|----------|------------------------|----------|
| `small` | 1 | 13.6 KB | Brief + selections only |
| `standard` | 4 | 326.2 KB | Brief, selections, compare runs, proposal + versions, BOM, evidence, audit trail |
| `large` | 10 | 815.3 KB | Standard corpus plus proposal visual assets with inline SVG data URLs |

The default HTTP JSON body cap is 1 MiB (`WINGMAN_MAX_JSON_BODY_BYTES`,
413-contract pinned by `server/competitor-lookup.413.test.mjs`), so all three
presets fit by construction. An over-cap sync body is rejected by the server
with HTTP **400 "Invalid JSON body."** — the project-sync handler maps the
oversized-body parse failure to 400, while the competitor JSON routes return
413 for the same condition. Both are payload-limit rejections; the harness's
`payload-413` probe accepts either and never expects 500.

## Proposal export (client-side compile)

Proposal DOCX export runs in the rep's browser: `ProposalCompletionWizard` and
`TemplateReviewPage` call `exportProposalDocx`, which serialises
`buildProposalDocx(...)` with `Packer.toBuffer`. There is no server endpoint to
load-test, so the compile path itself is benchmarked:

```bash
npm run load-test:proposal-export        # 60 iterations
LOAD_ITERATIONS=120 npm run load-test:proposal-export   # override count
```

Under plain `npm test` the same file runs with 8 iterations as a regression
sanity check. The benchmark reports p50/p95/p99 compile+serialize latency,
exports/second and the serialized DOCX size.

## Supabase synchronization

The project-sync flow commits through the server's store (`writeDb` → whole-DB
snapshot). The storage mode decides where that commit lands:

- **file** — local JSON under `WINGMAN_DATA_DIR` (the harness default; fastest,
  used for repeatable local baselines).
- **supabase** / **supabase-tables** — every sync commits the snapshot to
  Supabase (single-row or the atomic snapshot tables via migration 009's
  `wingman_snapshot_commit` RPC).

Benchmark it with the harness's own spawned server:

```bash
# --storage-mode supabase-tables (or supabase) on the harness's own server:
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SECRET_KEY=<service-role-key>
node tools/load-test.mjs --level standard --storage-mode supabase-tables --timeout 30000 --users 3
```

Remote spawns run **fail-closed** (`WINGMAN_STORAGE_FAIL_CLOSED=true`), so a
request only returns 200 after the snapshot committed to Supabase — a failed
remote write fails the request instead of silently falling back to the local
file store (the app-store falls back to file mode when a Supabase read/write
fails and fail-closed is off; the `.env` default is `false`).

Spawned `supabase-tables` runs are also **auto-verified** (2026-09-03): after
the scenarios finish, the harness reads the run's `wingman_projects` rows
STRAIGHT from PostgREST (service-role key, bypassing the app server) and
asserts each workspace that saved holds exactly one full corpus — the right
row count, ids, owner and workspace, plus the client-vocabulary `payload`
(`"Proposal Builder"`/`"recommended"`) sitting in CHECK-safe row columns. Any
mismatch — zero rows from a silent local fallback, a partial commit, a
vocabulary loss — prints per-owner failures and exits 1, so a recorded
baseline is attributable without a manual read-back. A **verified** pass then
**auto-cleans**: the harness deletes the signups, workspaces and project rows
it created (direct PostgREST deletes in FK-safe order — children before
workspaces before their owner users, whose `owner_user_id` is `ON DELETE
RESTRICT` — followed by a zero-remaining re-read of every run-owned table) and
exits 1 if any row survives, so repeated runs never need manual DB cleanup;
`--keep-db-data` opts out. Cleanup runs for spawned `supabase-tables` runs
that signed up their own sessions (never with `--cookie`, and never against an
external `--url`). Runs against an external `--url` cannot be auto-verified
(no direct store access from the harness); read those rows back manually. To
point at a deployment already running in that mode instead:

```bash
node tools/load-test.mjs --url https://staging.example.com --users 2 --cookie "<wingman_session>"
```

Every run prints `Storage mode (server /api/wingman/health): configured=…
  active=…` so results are attributable. Supabase runs add network + commit
  latency to every `project-save` request; record them separately from the
  file-mode baselines below.

## Measured baselines (2026-09-03)

All runs: harness-spawned server, **file storage**, 3 virtual users, `standard`
project-save payload, local Windows dev machine; results are repeatability
references, not capacity claims. Runs at three concurrency levels are recorded
separately so the effect of the store lock is visible.

### Standard level (10 concurrent, 100 requests/scenario)

| Scenario | Success | p50 | p95 | p99 | Throughput | Payload/req |
|----------|---------|-----|-----|-----|------------|-------------|
| `health` | 100% | 3.15 ms | 6.65 ms | 7.19 ms | 2760 req/s | 0 B |
| `project-list` | 100% | 11.85 ms | 12.41 ms | 12.53 ms | 848 req/s | 0 B |
| `project-save` | 100% | 151.14 ms | 155.61 ms | 160.07 ms | 65 req/s | 326.2 KB |
| `compare` | 100% | 34.54 ms | 36.35 ms | 36.74 ms | 291 req/s | 0 B |
| `payload-413` probe | rejected ×3 | ~20 ms per rejection | | | | 2 MiB body |

### Stress and spike levels (50 and 100 concurrent)

| Scenario | Level | Success | p50 | p95 | p99 | Throughput | Payload/req |
|----------|-------|---------|-----|-----|-----|------------|-------------|
| `health` | stress | 100% | 15.35 ms | 30.88 ms | 32.80 ms | 2874 req/s | 0 B |
| `health` | spike | 100% | 19.18 ms | 57.30 ms | 59.56 ms | 3899 req/s | 0 B |
| `project-list` | stress | 100% | 58.74 ms | 64.99 ms | 65.47 ms | 850 req/s | 0 B |
| `project-list` | spike | 100% | 105.49 ms | 108.92 ms | 109.79 ms | 947 req/s | 0 B |
| `project-save` | stress | 100% | 783.34 ms | 815.07 ms | 829.03 ms | 63.5 req/s | 326.2 KB |
| `project-save` | spike | 100% | 1570 ms | 1630 ms | 1640 ms | 63.4 req/s | 326.2 KB |
| `compare` | stress | 100% | 188.10 ms | 196.47 ms | 199.60 ms | 264 req/s | 0 B |
| `compare` | spike | 100% | 398.62 ms | 405.72 ms | 408.36 ms | 249 req/s | 0 B |
| `payload-413` probe | both | rejected ×3 each | ~18-20 ms per rejection | | | | 2 MiB body |

Proposal export compile (60 iterations): p50 **26.6 ms**, p95 **34.6 ms**,
p99 **86.3 ms**, ~35 exports/s, DOCX payload **18.8 KB**.

Notes on the numbers:

- `project-save` is dominated by the server's whole-store commit: every sync
  re-reads, re-normalises and rewrites the workspace's project set under the
  store lock. Throughput is **flat across concurrency** (65 → 63.5 → 63.4 req/s
  at 10 / 50 / 100 concurrent) while latency scales linearly with queued
  concurrency (p50 151 ms → 783 ms → 1.57 s) — the write path is fully
  serialised, and the throughput ceiling for a 326 KB corpus is ~64 req/s.
  This is the payload-scaling argument for per-project sync (see
  `docs/design/0001-project-workspace-persistence.md` §1.3).
- `project-list` shows the same flat ceiling (~850-950 req/s):
  `GET /api/wingman/projects` re-normalises and re-commits the store
  (`writeDb`) under the same lock, so its cost is close to a write.
- `health` and `compare` scale with concurrency; `compare` p95 rises with load
  (36 ms → 196 ms → 406 ms) as the catalog lookup contends for CPU.
- Against the recorded budgets, the spike run's `project-save` p95 (1.63 s)
  exceeds the 1500 ms p95 budget while p99 stays under 4 s — `--strict` flags
  it, as intended. Budgets are recorded for standard concurrency; do not loosen
  them for spike runs, which exist to expose exactly this kind of queuing.
- `compare` includes a small warm-up; the p95 above is steady-state catalog
  lookup, not the one-off cold catalog load.
- All three project-save presets fit under the 1 MiB HTTP cap; `large`
  (815 KB) leaves ~20% headroom before the request cap becomes the binding
  constraint.

### Supabase-backed baseline (2026-09-03, `supabase-tables`)

Run: harness-spawned server on port 8897 with `--storage-mode supabase-tables
--timeout 30000 --users 3`, standard level (10 concurrent, 100
requests/scenario), **fail-closed** (every 200 = the atomic snapshot commit
landed in Supabase), against the hosted Supabase project configured in `.env`
(`SUPABASE_URL`/`SUPABASE_SECRET_KEY` exported to the harness). The project is
**West Europe (London)** and the dev machine is in **England** — the run was
same-region all along (see the re-run below for the network-floor
measurements). The live DB held only the pre-existing seed data (2 users / 2
workspaces / 2 projects / 203 audit rows) at run start; the run's 3 signups +
12 project rows were **auto-verified persisted** by the harness itself (4
projects per new workspace in one atomically committed corpus, correct
`owner_id` foreign keys, seeds untouched) — a Supabase result was never
mistaken for a silent file-store fallback.

Measured environment component: median PostgREST round-trip from this Windows
dev machine to the hosted project was **73 ms** (5 samples, 64–187 ms).

**Same-region re-run & WAN-vs-server-side attribution (2026-09-03).** The
numbers above were recorded against a project in the SAME region as the
machine, so they were never cross-region WAN latency. Verified on the re-run:

- Network floor to `pekimeegunhhbbgohrdg.supabase.co` from this machine:
  raw TCP connect **~11 ms** (10-43 ms over 5 samples), TCP+TLS handshake
  **25-36 ms**, one full unauthenticated PostgREST HEAD **~120 ms** (the last
  is dominated by PostgREST's own processing, not the link).
- The re-run reproduces the table above within noise — same command,
  same cleaned DB state (2/2/2/203): `health` p50 11.00 ms,
  `project-list` p50 4.02 s, `project-save` p50 10.71 s, `compare` p50
  2.58 s; 100% attributable, rows verified persisted, DB cleaned back to
  2/2/2/203 afterwards.
- Attribution: each request does ~8 full-table READS (issued in parallel,
  so ~1-2 serial network round trips) plus one snapshot-commit RPC — a few
  tens of milliseconds of network per request at ~11 ms RTT. The seconds of
  p50 latency are therefore **server-side**: the reads' payload transfer and
  PostgREST/Postgres processing plus the whole-DB commit and re-normalisation
  under the store lock. The earlier "73 ms median per hop" figure is likewise
  mostly PostgREST request processing on top of an ~11 ms link. The exact
  split is measured below ("Server-side stage attribution").
- Zero-network real-SQL runs are now reproducible with
  `tools/local-supabase-stack.mjs` (embedded Postgres 18.4 + PostgREST 12.2.12
  + the `/rest/v1` gateway proxy + migrations 001–015, no admin, no Docker);
  see the "Zero-network SQL commit baseline" section for the one-shot command
  and the measured stage split.

**Server-side stage attribution (2026-09-03, `WINGMAN_STORE_PROFILE=1`).**
The store ships an env-gated profiler that splits every remote-storage
request's server-side cost into per-stage timings; it is a no-op when unset
and writes `storage.profile.*` events to the server log (which the harness
captures in its kept data dir). Reproduce with:

```bash
# plus SUPABASE_URL / service-role key exported; run against the hosted project
export WINGMAN_STORE_PROFILE=1
node tools/load-test.mjs --level smoke --scenarios project-save \
  --storage-mode supabase-tables --timeout 30000 --keep-data
# then aggregate the storage.profile.* lines from <data-dir>/server.log
```

Measured on a smoke run (3 users, concurrency 5, standard corpus, DB at
2/2/2/203 plus the run's own rows, same-region ~11 ms link) — every
`project-save` performs ONE store-lock cycle (read → merge → snapshot write):

| Stage | p50 | p95 | p99 | Share of lock run |
|-------|-----|-----|-----|-------------------|
| End-to-end (harness p50) | 5.28 s | — | — | — |
| Store-lock **queue wait** | 3982 ms | 4414 ms | 4549 ms | — |
| Store-lock **run** (active work) | 993 ms | 1204 ms | 1225 ms | 100% |
| └ 8 table reads (parallel) | 247 ms | 411 ms | 704 ms | 25% |
| └ snapshot serialization | 7 ms | 10 ms | 10 ms | 0.7% |
| └ `wingman_snapshot_commit` RPC | 739 ms | 941 ms | 947 ms | 74% |

Per-table read p50s (all single-page at this scale): users 161, workspaces
224, members 176, invitations 211, sessions 194, projects 238, audit 215,
telemetry 192 ms — issued in **parallel**, so the stage total (~247 ms) is
the slowest table, not the sum. The commit payload is ~1.17 MB p50 (14
projects, ~217 audit events) and serializing it is ~7 ms.

What this says about the ~10 s standard baseline: the ACTIVE server cost per
save is only ~1 s (RPC 0.74 s + reads 0.25 s + serialization 0.007 s). The
remaining seconds are the **store-lock queue**: one global mutex serializes
every read-modify-write, so p50 latency grows linearly with concurrency ×
~1 s lock holds (5 concurrent → ~4.0 s wait; 10 concurrent → ~9 s wait,
matching the 10.47–10.71 s standard numbers). The dominant *active* cost is
the whole-DB `wingman_snapshot_commit` transaction; per-project revisioned
sync (ADR-0001 Phase 1) removes both the queue multiplier (shorter lock
holds → higher throughput) and the whole-DB commit.

Hardening note: the harness derives "this was a supabase-tables run" from its
own spawn config, not only from the server's health report — a transient
store-read failure at boot 503s `/api/wingman/health` (mode reads as
"unknown"), and before this fix that silently disabled both auto-verification
and auto-cleanup for the run (unit-tested in
`tools/load-test-persistence.test.mjs`).

| Scenario | Success | p50 | p95 | p99 | Throughput | Payload/req |
|----------|---------|-----|-----|-----|------------|-------------|
| `health` | 100% | 10.82 ms | 287.62 ms | 324.48 ms | 86.0 req/s | 0 B |
| `project-list` | 100% | 3.61 s | 3.89 s | 3.90 s | 2.74 req/s | 0 B |
| `project-save` | 100% | 10.47 s | 10.95 s | 11.00 s | 0.96 req/s | 326.3 KB |
| `compare` | 100% | 2.35 s | 2.61 s | 2.69 s | 4.13 req/s | 0 B |
| `payload-413` probe | rejected ×3 | ~480 ms per rejection | | | | 2 MiB body |

Notes on the Supabase numbers — read them as the cost of the **current
whole-DB snapshot sync architecture on a same-region link**, not as a
capacity claim:

- Every sync and project-list request performs ~8 parallel full-table reads
  plus one whole-DB atomic commit RPC (`wingman_snapshot_commit`); the reads
  are issued in parallel but each still transfers the table contents and is
  processed by PostgREST/Postgres (~73 ms median end-to-end per hop on an
  ~11 ms link — see the attribution above), all serialized by the server's
  store lock — of which the measured split is ~1 s active work per save and
  the rest queue wait ("Server-side stage attribution" above). At 10
  concurrent, `project-save` sustains ~1 req/s at a
  ~10.5 s p50 — roughly **70× the file-mode p95**
  (155.61 ms) for the same corpus, and the p95/p99 are not budget
  violations of the file-mode budgets below: Supabase runs are recorded
  separately and must not tighten or loosen the CI budgets.
- `project-save` latency grows with the **whole database size**, because every
  commit uploads and reconciles every row: with 5 workspaces and 14 projects
  in the DB the commit payload was already ~4 MB (12 rich project docs); an
  earlier run against a DB holding 12 workspaces measured p50 ~9.9 s.
  This is direct, measured evidence for the per-project sync design in
  `docs/design/0001-project-workspace-persistence.md` (ADR-0001).
- Three real defects surfaced while getting this run attributable, all fixed
  or recorded:
  1. **`wingman_snapshot_commit` / `wingman_ledger_commit` (migrations 009,
     011, 012) failed on real Postgres with `42702`** — every bare `payload`
     reference in SQL was ambiguous with the `payload` columns of the tables
     they insert into (the functions' SQL had never executed against a real
     database: server tests use an in-process fake PostgREST). Fixed with
     `#variable_conflict use_variable` in both migration sets (kept
     byte-identical) and re-applied to the live project via
     `tools/apply-wingman-migrations.mjs`.
  2. **Client stage/status vocabulary vs the DB CHECK constraints** —
     `wingman_projects.stage/status` are CHECK-constrained to a canonical
     vocabulary (`Discovery|Design|Proposal|Deployment|Support` ×
     `Draft|In Progress|Commercial Ready|Archived`), and the sync handler
     used to write `payload.stage/status` verbatim, so a real client project
     in `"Proposal Builder"` stage (a client `ProjectStage`) failed every
     supabase-tables commit. File mode has no constraints and masked this.
     The server now canonicalises the constrained row columns at snapshot
     build time (`server/project-row-vocabulary.mjs`, ADR-0001 §1.2g) while
     the payload blob keeps the client strings, so the corpus speaks the REAL
     client vocabulary again (`"Proposal Builder"`/`"recommended"`) — a
     supabase-tables run is a live regression test of the canonicalisation
     against real CHECK constraints, and the hydration E2E's supabase-tables
     case pins it against a fake PostgREST.
  3. **Silent file-store fallback**: with `WINGMAN_STORAGE_FAIL_CLOSED=false`
     (the `.env` default), a failed Supabase read/write falls back to local
     file storage and the request still returns 200 — an early run's
     "100% success" was partly fallback writes to a throwaway data dir that
     was then deleted (zero project rows survived in Supabase). The harness
     forces fail-closed on remote storage modes AND the harness now
     auto-verifies persisted rows after every spawned `supabase-tables` run
     (see "auto-verified" above): a run whose 200s left no rows exits 1
     instead of recording a baseline.
- The harness corpus ids are `load-u<namespace>-project-<slot>` where
  `<namespace>` = a random per-run offset + the request index.
  `wingman_projects.id` is a **global** primary key across all workspaces
  AND all runs: identical ids from two workspaces collide on the second
  workspace's sync (file mode scopes project state per workspace and never
  noticed), and two back-to-back runs that re-stamp the same ids make a
  whole-DB commit fail live with `ON CONFLICT DO UPDATE command cannot
  affect row a second time` (one payload, duplicate id). The per-run offset
  keeps every run's id space disjoint even when the previous run's rows were
  left in place. Real clients stamp unique ids; nothing yet enforces it at
  the schema level.

**Incremental-hydration payload baseline (2026-09-03, `supabase-tables`).**
Reload hydration used to download the ENTIRE workspace project list and merge
it locally. With per-project revision counters the client now sends an
`X-Wingman-Since` manifest of the revisions its local copies are based on
(`GET /api/wingman/projects`), and the server returns only the rows that
moved past those revisions (or are new to the client); a since-pull is also
READ-ONLY — unlike the full GET it never performs the snapshot commit that
persists its last-seen touch. Run the benchmark with the harness (post-run,
after `project-save` rows exist):

```bash
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SECRET_KEY=<service-role-key>
node tools/load-test.mjs --level smoke --users 3 --timeout 20000 \
  --scenarios project-save,hydrate-since --storage-mode supabase-tables
```

Measured 2026-09-03 against the same hosted project (same-region, DB cleaned
to register 133 / 0 rows before the run; the run's own rows were
auto-verified 3/3 workspaces × 4/4 projects and self-deleted afterwards — 51
rows, 0 remaining). Standard corpus (4 projects/workspace, ~326 KB per sync):

| Reload request | Mean response | Mean latency |
|----------------|---------------|--------------|
| Full GET (no `since`) | **366.0 KB** | 906 ms |
| Since GET, nothing changed (0 rows) | **258 B** | 340 ms |
| Since GET, exactly one project moved (1 row) | **91.7 KB** | 361 ms |

A no-change reload downloads **99.9% less** (366.0 KB → 258 B) and answers
~2.7× faster even at smoke concurrency, because the since pull skips the
whole-DB snapshot commit the full GET performs. `project-save` on the same
run: p50 4.63 s / p95 5.07 s, 100%, 326.4 KB — unchanged from the post-013
baselines, confirming the incremental pull adds no write-path overhead. The
remaining full-GET cost is the store's 8-table read + commit cycle, which is
the same whole-DB cost the sync path pays; per-project row reads (Phase 1)
are the next lever.

**Zero-network SQL commit baseline (2026-09-03, reproducible local stack).**
To measure the real SQL commit cost with no WAN — and to run the SAME
supabase-tables storage path the app uses in production against a real
Postgres — the ad-hoc portable stack is now a checked-in tool:
**`tools/local-supabase-stack.mjs`** (`npm run load-test:local-supabase`). It
installs, migrates, runs the standard baseline, and tears down on demand —
no admin rights, no network:

```bash
# one-shot: install-if-needed + start + standard baseline + teardown
npm run load-test:local-supabase:all
# or split into steps + a custom level
node tools/local-supabase-stack.mjs install   # fetch PostgREST into the cache
node tools/local-supabase-stack.mjs start     # initdb + roles/grants + migrations + launch
node tools/local-supabase-stack.mjs baseline --level smoke
node tools/local-supabase-stack.mjs stop      # graceful teardown
node tools/local-supabase-stack.mjs clean     # stop + delete the whole state dir
```

What the tool reproduces (all the things the one-off assembly had to get
right): **embedded PostgreSQL 18.4** (zonky binaries via the
`embedded-postgres` npm devDependency — initdb/start on a scratch data dir
under `data/runtime/local-supabase/`, gitignored), **PostgREST v12.2.12**
(downloaded from the GitHub release; the Windows exe dynamically links
libpq/ICU, so the tool copies the embedded Postgres client DLLs next to it —
the v16.x exe does not load on this machine), a gateway proxy that strips
supabase-js's hard-coded `/rest/v1` prefix onto bare PostgREST (Supabase's
gateway does this; a bare PostgREST serves at `/` and 404s `/rest/v1`),
**migrations 001–015 applied verbatim** except the pg_cron block of 003
(pg_cron is Supabase-managed and absent on vanilla PG; per-file transactions
+ an applied-migrations marker so re-runs are no-ops), the
`anon`/`authenticated`/`service_role` roles and the schema/table/function
grants Supabase applies by default, and — because supabase-js ALWAYS sends
`Authorization: Bearer <key>` and PostgREST refuses to validate without a
secret — a shared HS256 `jwt-secret` with the "service role key" being a real
signed JWT carrying the `service_role` claim, so RLS policies scoped
`TO service_role` behave exactly like the hosted project. The harness's own
auto-verification + auto-cleanup work unchanged against the local stack
(through the proxy), so a baseline is attributable and leaves zero rows.

Standard baseline measured 2026-09-03 on a fresh data dir (migrations
001–015 applied, so the migration-013 generation register and the migration-015
single-row project commit are both live), same
command shape as the hosted runs (3 users, concurrency 10, 100
requests/scenario, 326.4 KB corpus):

| Scenario | Success | p50 | p95 | p99 | Throughput | Payload/req |
|----------|---------|-----|-----|-----|------------|-------------|
| `health` | 100% | 5.22 ms | 9.66 ms | 9.72 ms | 1717 req/s | 0 B |
| `project-list` | 100% | 59.03 ms | 86.72 ms | 88.87 ms | 154.6 req/s | 0 B |
| `project-save` | 100% | 829.03 ms | 912.08 ms | 928.73 ms | 12.9 req/s | 326.4 KB |
| `compare` | 100% | 161.90 ms | 187.36 ms | 199.52 ms | 59.3 req/s | 0 B |
| `payload-413` probe | rejected ×3 | | | | | 2 MiB body |

100% attributable: the harness auto-verified 3/3 workspaces × 4/4 persisted
project rows and self-cleaned 131 rows afterwards; the tool tore the stack
down on exit. These numbers supersede the earlier hand-assembled run (which
predated migration 013 and measured project-save p50 550 ms): migration
013 adds the generation-register read and the register CAS claim inside the
commit, which is the difference. Zero-network stage split from the same stack
(`project-save`-only standard run with `WINGMAN_STORE_PROFILE=1` exported:
`node tools/local-supabase-stack.mjs all --level standard --scenarios
project-save --keep-data`), hosted p50 from the stage-attribution table above
for contrast:

| Stage | Local p50 (zero network) | Hosted p50 (same-region) |
|-------|--------------------------|--------------------------|
| 9 table reads incl. register (parallel) | 11.0 ms | 247 ms (8 tables) |
| snapshot serialization (~1 MB) | 8.5 ms | 7 ms |
| `wingman_snapshot_commit` RPC (+013 CAS claim) | **40.5 ms** | 739 ms |
| Store-lock run (active work) | 75.6 ms | 993 ms |
| Store-lock queue wait | 732.2 ms | 3982 ms |
| End-to-end p50 | 831.7 ms | 5.28 s (smoke) / 10.47 s (standard) |

Read: the **real SQL commit cost of the whole-DB snapshot at ~1 MB is ~40 ms
p50** — the single `wingman_snapshot_commit` transaction (register claim
included) plus PostgREST on the local machine. The hosted RPC's other ~700 ms
is **payload upload bandwidth** (~1.2 MB body per commit over the ~11 ms link
≈ ~13 Mbps effective uplink), not SQL; the hosted read delta (~235 ms) is
likewise the 8 table-body transfers (per-table reads drop from 177–238 ms
hosted to 3–11 ms local, with the register adding one ~3 ms read), and
serialization is the same CPU either way (~7–9 ms). End-to-end stays
**store-lock-queue dominated even at zero network**: at concurrency 10 the
p50 wait is ~732 ms stacked on ~76 ms holds — the ~13× p50 reduction
(10.47 s → 0.83 s) is the queue multiplier applied to a 13×-smaller lock
hold. Per-project revisioned sync (ADR-0001 Phase 1) is what removes both
terms.

Runs against Supabase leave identifiable artifacts in the target project
(`loadtest-*@example.com` users, workspaces named `Load Test Co`, project ids
`load-u<N>-project-<K>`). A verified spawned `supabase-tables` run now deletes
its own artifacts (signups, workspaces, project rows — self-verified zero
remaining), so only **failed** runs or `--keep-db-data` runs leave rows behind.
Those leftovers no longer need manual SQL: `--cleanup-only` finds them by the
same markers (users by their `loadtest-%@example.com` email, workspaces by
name `Load Test Co` or their marker owner, project rows by the `load-u<N>`
id pattern **across all workspaces** — so a `--cookie` run that wrote a corpus
into a real workspace is cleaned without touching that workspace or its other
rows) and deletes them in the same FK-safe order the post-run cleanup uses,
self-verifying zero remain:

```bash
# preview first (lists users/workspaces/projects and the scoped deletes)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node tools/load-test.mjs --cleanup-only --dry-run
# then delete + self-verify
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node tools/load-test.mjs --cleanup-only
# or via npm (creds still come from the env)
npm run load-test:cleanup:dry-run
npm run load-test:cleanup
```

**Per-project revisioned sync baseline (2026-09-03, ADR-0001 Phase 1).**
Phase 1 adds the per-project write path the zero-network section above calls
for: `PUT /api/wingman/projects/:id` (+ `GET`) alongside the whole-store sync
POST until clients migrate, committing ONE project row through migration-015
`wingman_project_put` — a guarded single-row upsert whose CAS is the row's OWN
`payload->>'syncRevision'` (read at N → matched write at N+1, refused with
`current_revision` otherwise), which advances the migration-013 generation
register in the same transaction so a concurrent whole-snapshot commit whose
read predates the row write refuses instead of reconciling it away. Merge
semantics are the same `mergeWorkspaceProjects` the sync POST uses, so a stale
PUT re-reads the row, re-merges, and retries (bounded) instead of ever
dropping a concurrent member's edit. The harness scenario is opt-in
(`--scenarios project-put`; NOT in the default loop so recorded whole-store
baselines stay comparable) and auto-verifies one persisted row per successful
PUT under supabase-tables, mirroring the project-save verification.

**Attribution re-run (2026-09-03, `WINGMAN_STORE_PROFILE=1`, same stack).**
Both write paths were re-measured back-to-back on the same zero-network stack
(zero rows, register reset; standard level, 3 users, concurrency 10, 100
requests/scenario, per-scenario attributable runs):

| Scenario | Success | p50 | p95 | p99 | Throughput | Payload/req |
|----------|---------|-----|-----|-----|------------|-------------|
| `project-save` (whole-store POST) | 100% | 871.88 ms | 960.22 ms | 970.60 ms | 12.1 req/s | 326.4 KB |
| `project-put` (per-project PUT) | 100% | 415.61 ms | 827.04 ms | 869.07 ms | 18.8 req/s | 81.6 KB |

100% attributable both ways: project-save verified 3/3 workspaces × 4/4 rows
(one corpus each) and project-put verified each workspace holds exactly one
row per successful PUT (34/33/33 rows, ids unique per request); each run
self-cleaned to zero rows afterwards. Per-stage server-side split from the
same two runs (percentiles over the per-request `storage.profile.*` events):

| Stage (p50 / p95) | project-save (whole-store) | project-put (per-project) |
|-------------------|---------------------------|---------------------------|
| Store-lock queue wait | 750.9 / 863.8 ms | 365.7 / 731.6 ms |
| Store-lock run (active work) | 78.2 / 111.3 ms | 43.6 / 88.2 ms |
| └ Whole-store read (`read_total`) | 11.4 / 22.8 ms | 28.1 / 62.0 ms |
| └ `projects` table read | 11.2 / 17.3 ms | 27.9 / 61.8 ms |
| └ snapshot serialization | 8.6 / 21.3 ms | — (0.2 ms, signups only) |
| └ `wingman_snapshot_commit` RPC | 43.9 / 64.9 ms | — (0 writes) |
| └ `wingman_project_put` RPC | — | **8.8 / 11.5 ms** |

Quantified reduction against the whole-store baseline, per project save:

- **Whole-DB write terms: gone.** Snapshot serialization (8.6 ms p50) and the
  `wingman_snapshot_commit` RPC (43.9 ms p50, register CAS included) no longer
  run on a save — the only whole-snapshot writes in the put run were the three
  signups. The write is now ONE guarded row commit at 8.8 ms p50 (−80% vs the
  whole-DB RPC alone).
- **Store-lock queue: −51% p50** (750.9 → 365.7 ms) and **lock run −44% p50**
  (78.2 → 43.6 ms) — shorter holds from dropping the serialize + whole-DB RPC
  terms, so 10 concurrent writers drain ~2× faster (18.8 vs 12.1 req/s).
- **End-to-end p50: −52%** (871.88 → 415.61 ms); wire payload −75% (326.4 →
  81.6 KB per request, 366.0 → 90.1 KB response).

One effect cuts the other way and is measured, not assumed: the whole-store
read under the lock grew in the put run (11.4 → 28.1 ms p50) because this
scenario CREATES a fresh project per request, so ~100 × ~80 KB rows
accumulate and every subsequent read re-downloads the whole projects table
(the per-table split shows it is the `projects` read — 11.2 ms save vs 27.9 ms
put p50 — while every other table stays 3–5 ms in both runs). That is the
whole-store read's O(row count × payload) scaling, exposed by the write path
that no longer masks it; an update-heavy rep workload (row count flat) keeps
that read at the ~11 ms baseline. Tail percentiles (p95/p99) stay within ~15%
of the whole-store run for the same reason: the queue term still dominates
because every PUT runs the whole-store read under the one global lock. Scoping
the per-project path's read to auth + one row — dropping the whole-store read
and its place in the queue — is the remaining lever (ADR-0001 Phase 2
"per-project push granularity"), and the `project-put` scenario above is the
benchmark that will show it disappear.

The RPC's guarded semantics were also proven directly against the stack's
Postgres: create at expected 0 → committed revision 1 / register 0→1;
concurrent-create at expected 0 → refused `stale` with `current_revision` 1
and the register UNCHANGED; guarded update at expected 1 → revision 2 /
register 1→2; stale update at expected 1 → refused, register unchanged.

## Budgets (recorded 2026-09-03)

These are the initial recorded budgets for the CI-able gate. They carry
headroom over the measured baselines above until more environments (staging,
Supabase-backed, CI) contribute dated results — tighten them from evidence,
never loosen to make a red run pass.

| Scenario | p95 budget | p99 budget | Max error rate |
|----------|------------|------------|----------------|
| `health` | 150 ms | 300 ms | 0% |
| `project-list` | 750 ms | 1500 ms | 0% |
| `project-save` | 1500 ms | 4000 ms | 0% |
| `compare` | 2000 ms | 6000 ms | 0% |

Enforce with `--strict` (exit code 2 on violation). The budgets live in two
places that must stay in sync: this table and the `STRICT_BUDGETS` map in
`tools/load-test.mjs`. The proposal-export sanity threshold (p95 < 10 s,
p99 < 15 s) is intentionally loose; the dated budget for that flow is the
measured line above.

### CI

Load timing is environment-sensitive, so these runs belong on the **nightly /
scheduled** schedule (or staging), not the per-PR verify chain:

```yaml
# Example nightly job
- name: Standard load test with budgets
  run: |
    npm run load-test -- --level standard --strict
    npm run load-test:proposal-export
```

## Troubleshooting

- **Server already on the port** — the harness's own server uses port 8897
  (registry: 413 test 8876, agents 8877/8878, unread-tail 8879, e2e-smoke
  8892, docx-check 8893, stranded-loop 8894, contract check 8898, workflow
  check 8899). Override with the `LOAD_TEST_API_PORT` env var.
- **Signup rate-limited against an external server** — the default limit is 8
  signups/IP/window (`WINGMAN_AUTH_RATE_LIMIT_MAX_REQUESTS`). Reuse one session
  with `--cookie`, or raise the limit on a server you control.
- **Failures** — logs are kept automatically: the server log path is printed
  (`<temp>/wingman-load-test-*/server.log`), and `--keep-data` preserves a
  passing run's data dir.
- **Non-deterministic p95 on small runs** — raise `--requests` or use a level
  preset; warm-up absorbs one-off cold starts, not OS noise.
