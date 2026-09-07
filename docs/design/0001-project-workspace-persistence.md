# ADR-0001 · Project / workspace-scoped persistence

- **Status:** Proposed (decision requested — closes open P1-3)
- **Date:** 2026-09-03
- **Deciders:** Architecture review; roadmap milestone A5 / workstream B1
- **Supersedes:** the undecided storage model behind `src/wingman2/data/projectStore.ts`
- **Related:** `docs/PRE_PRODUCTION_REPORT.md` §P1-3, `docs/DEVELOPMENT_MILESTONES.md` workstream B (B1–B3), milestone A5

## Decision (recommended)

Adopt **server-authoritative with a local cache** as the target architecture for
project/workspace data: the deployment backend becomes the explicit system of
record for the full project document (the full-document round trip already
works — §1.2 — what is missing is schema ownership, a per-project sync
granularity, and the migration), the browser holds a per-(workspace, user)
cache that keeps the app usable offline, and a write queue + explicit
per-project sync replaces the current whole-store last-writer-wins upload. Do **not** adopt local-first (device-authoritative
with an operation log / CRDT merge) at this stage; revisit only if real sales-rep
UAT makes multi-day offline editing on shared projects a hard requirement.

This ADR is a design record, not an implementation. The recommendation is
written so Phase 0 (contract tests that pin today's behaviour) can start before
any schema work.

---

## 1. Context: what `projectStore.ts` does today (measured 2026-09-03)

All line references are to `main` at the time of writing and will drift; the
function names are the stable anchor.

### 1.1 Client side

- One `localStorage` key, `wingman-project-store-v1`, holds **one JSON document
  containing every project, every proposal draft, the active project id, and
  the sync status** (`PROJECT_STORE_KEY`, `ProjectStoreSnapshot`). There is no
  per-workspace, per-user, or per-project namespace.
- Every read is a synchronous `JSON.parse` + full defensive re-normalisation of
  **all** projects (`readProjectStore` → `safeStore` → `normalizeStoredProject`
  and one normaliser per sub-document: discovery brief, proposal, compare runs,
  requirements, visual assets, audit trail, …). Every write re-normalises the
  whole store again and `JSON.stringify`s it (`writeProjectStore`), then
  broadcasts an in-tab `CustomEvent` and relies on the browser `storage` event
  for other tabs (`useProjectStore`).
- 30+ production modules (plus the test suite) call `readProjectStore()` /
  `getCurrentWorkflowProject()` directly — e.g. `DashboardPage`, `AppShell`,
  `DiscoveryPage`, `ProductPitchPage`, `ProductCallCardsPage`,
  `ComparePageNew.advanced.tsx`, `analyticsDashboard.ts`,
  `feedbackInformedGuidance.ts`, `quoteSafetyDashboard.ts`, `workflowHandoff.ts`,
  `useCompareHistoryView`. Cost of the read is O(all projects × all fields) per
  call, on every relevant render.
- A project is a fat document: discovery brief + conversation, ingest analyses,
  up to 10 compare runs, proposal + version history, BOM rows, requirements,
  recommendation evidence + feedback, workflow state, videowall summary, audit
  trail, and `visualAssets` whose `render` can embed SVG and PNG **data URLs**
  (default canvas 1600×900). One project can reach hundreds of KB; a handful of
  PNG-backed visuals can exceed a megabyte alone.
- Backend sync is **build-time gated** on
  `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC` and, when enabled, sends the
  **entire store** — every project plus `activeProjectId` — to
  `POST /api/wingman/projects/sync`, debounced 600 ms
  (`scheduleBackendProjectSync`). Hydration is one `GET /api/wingman/projects`
  per page load (`hydrateProjectStoreFromBackendOnce`), with a per-session
  fallback to local-only after any 401 ("Local changes are preserved").
- The sync response body is **ignored**: only the sync status is updated
  (`setProjectSyncStatus`). The client never reconciles against what the server
  actually stored.
- Cross-device identity is ad hoc: the sync token is read from six different
  storage keys or a cookie; there is no workspace id on the cached data, so
  signing into a second workspace in the same browser merges against the first
  workspace's local-only projects.
- `proposalDrafts` never sync; neither do the ~35 other modules that write
  browser storage directly (discovery snapshot/brief keys, `proposalWizard`
  per-project keys, custom room templates, site-survey edits, saved competitor
  specs, CRM webhook config, … — §P1-3 counts 36 files touching browser
  storage).

### 1.2 Server side

- Storage is per-workspace: `db.projectsByWorkspace[workspaceId]` behind
  `server/wingman-app-store.mjs`, committed as one whole-DB snapshot to either a
  file (`data/runtime/…` in dev/test) or Supabase (`supabase-tables` snapshot
  tables) under `withStoreLock`. The snapshot commit shares a hard
  **8,388,608-byte ceiling** with the SQL trigger that guards it (migration 009
  + `wingman-app-store.payload-limit.test.mjs`).
- The HTTP layer caps JSON bodies at **1 MiB by default**
  (`WINGMAN_MAX_JSON_BODY_BYTES`, `parseJsonBody` → 413, exercised by
  `competitor-lookup.413.test.mjs`). The sync POST goes through this path, so
  today the whole workspace's project corpus must fit under ~1 MiB in one
  request.
- Auth is workspace-scoped with roles and permissions (`canEditProjects`,
  read-only role handling, 401/403 on the sync handlers).
- **The server's project sanitizer is a normaliser, not an allowlist**
  (corrected by the Phase 0 E2E, 2026-09-03 — an early reading mistook it for
  an allowlist). `sanitizeProject` returns `{ ...source, … }`: it *spreads*
  the whole incoming project — so the work product (`discoveryBrief`, `ingest`,
  `productSelections`, `compareRuns`, `proposal`, `proposalVersions`,
  `requirements`, `recommendationEvidence`, `feedback`, `workflow`, `videowall`,
  `visualAssets`, …) **is** stored — and overrides the known fields
  (id/workspaceId/ownerId/name/customer/site/roomName/stage/status/notes/
  timestamps), the four by-id lists (attachments, comments, shares, auditTrail),
  and `recommendationGovernance`/`customerSummary` with explicit shapes.
- Server merge on `/sync` is **last-writer-wins per project**: object spread of
  the incoming project over the existing one, with by-id union-merge only for
  the four list kinds above (`mergeWorkspaceProjects`, `mergeById`). Any
  project absent from the incoming payload is treated as deleted
  (`deletedIds`).

### 1.2a Phase 0 verification (2026-09-03, `server/project-store-hydration.e2e.test.mjs`)

The reload-after-sync sequence is now pinned by a backend-mode E2E that boots
 the real server and drives the real client module (`projectStore.ts`) against
 it. Findings:

1. **The plain reload hazard is REFUTED as described.** Because the server
   stores the full document (spread semantics), a reload after a successful
   sync replaces the local copy with an *equally rich* backend copy — nothing
   is lost. Equal timestamps are safe *because* the round trip is full.
2. **The hazard is LIVE in its data-shape form.** When an equal-aged backend
   row is genuinely THIN (legacy rows, or any future refactor that projects
   the server copy down to a subset), hydration replaced the richer local
   document with the thin row and persisted the loss. The E2E reproduced this
   by thinning the file-store row directly.
3. **Client hardening applied (2026-09-03):** hydration now prefers the local
   project when timestamps are EQUAL (`hydrateProjectStoreFromBackendOnce`),
   so a reload can never swap richer local content for an equal-aged thin
   backend row. Strictly-newer server content (comments, shares, role changes
   stamp new `updatedAt` values) still wins. All three E2E cases pass.
   (Superseded for per-project decisions by the per-sub-document hydration
   merge in §1.2f, which keeps the equal-tie local preference inside each
   mergeable unit.)

### 1.2b Phase B3 verification (2026-09-03, `server/project-store-two-session-merge.e2e.test.mjs`)

Two sessions in one workspace (owner + invited sales member) hold divergent
 copies of the same project and edit DIFFERENT sub-documents (discovery brief
 vs proposal). Findings:

1. **The whole-project spread merge silently dropped one edit in BOTH sync
   orders** — the later sync's stale copy of the other session's sub-document
   overwrote it (reproduced by the E2E before the fix).
2. **Server merge hardened:** `mergeWorkspaceProjects` now merges the six
   single-value sub-documents the client saves whole and stamps with an
   embedded timestamp (`discoveryBrief.savedAt`, `ingest.updatedAt`,
   `recommendationEvidence.updatedAt`, `proposal.updatedAt`, `workflow.updatedAt`,
   `videowall.savedAt`) by last-writer-wins per sub-document; project-level
   fields stay whole-project LWW, and the by-id list unions (attachments,
   comments, shares, auditTrail) are unchanged. Disjoint concurrent edits now
   both survive in either sync order (E2E asserts both orders converge).
3. **Scope boundary at the time:** id-keyed lists the client owns
   (`compareRuns`, `proposalVersions`, `requirements`, `productSelections`,
   `visualAssets`) remained by-id unions (closed by §1.2i), and
   same-sub-document conflicts were still whole-sub-document LWW by embedded
   timestamp (arrival order on exact ties) — the latter is closed by the
   revision counters in §1.2d.

### 1.2d Phase 2 verification — per-project revision counters (2026-09-03)

`mergeWorkspaceProjects` now tracks a **per-project revision counter**
(`syncRevision`, server-owned, bumped on every accepted write, returned to the
client) and the client echoes it back as `baseRevision` on every sync
(`projectStore.ts` stores the server's `syncRevision` and POSTs it; the sync
response writes it back so the loop is self-sustaining). The merge resolves
EVERY same-field (same mergeable sub-document) conflict by a deterministic
total order instead of by arrival order:

1. later embedded edit timestamp wins (the edit the user made later);
2. on equal/absent timestamps, the version based on the fresher revision wins
   (a stale client's write cannot take the tie);
3. on an equal basis too, the smaller author id wins — so two syncs of the
   same-millisecond edit converge to the SAME winner in either order;
4. a fully identical tie keeps the stored copy (re-sync is a no-op).

The server-side decision metadata (`_merge` on the stored copy) is server-owned
and stripped from every client response (clients only see `syncRevision`).
Verified by `server/project-store-two-session-merge.e2e.test.mjs` (now 5
cases): the pre-existing disjoint-sub-document orders, plus (a) a same-field
collision with ONE shared timestamp — both orders converge to the same whole
edit, which the old "keep the stored copy" rule got wrong; (b) a same-field
collision with distinct edit times — the later edit wins in both orders; and
(c) the baseRevision round trip bumps the counter per accepted sync (1→2→3).

The whole-store POST granularity is unchanged — this lands the *revision
semantics* of Phase 2. The `since=` incremental PULL later landed on the
same whole-store endpoint (§1.2k); per-project PUSH granularity (separate
routes per project instead of the whole-store POST) remains Phase 2/1
follow-on alongside cache namespacing.

### 1.2e Phase B3 stress variant — 200 interleaved overlapping saves
(2026-09-03, `server/project-store-two-session-stress.e2e.test.mjs`)

The single-collision suites prove one brief-vs-proposal or one same-field
collision converges; real usage is two reps syncing CONTINUOUSLY from
divergent copies, every save carrying stale everything. This E2E drives 100
rounds x 2 syncs (200 overlapping saves, alternating first mover, port 8873):
A owns the `discoveryBrief` lane, B the `proposal` lane (strictly increasing
embedded timestamps per round), a SHARED same-field lane
(`recommendationEvidence`) flips between A and B each round so the stale
partner copy must lose by (edit time, revision basis), and BOTH sessions
append distinct `attachments` every round so the by-id union must never drop
or duplicate an item. After EVERY one of the 200 responses the merged project
must hold the newest version of every lane (never an older copy, never a mix,
never a dropped attachment), both sessions' fresh reads must converge
byte-identical, and the counter must equal 1 baseline + 200 accepted syncs.

**Result: green — no edit silently dropped across the whole interleaving.**
This is the strongest end-to-end evidence so far that the per-sub-document
merge + revision counters hold under sustained multi-session divergence,not just single collisions; the arrival-order class of loss is closed at the
current whole-store sync granularity. Remaining for Phase 3 (unchanged) at
that point: id-keyed collections (requirements, proposalVersions, compareRuns,
productSelections, visualAssets) still merged by whole-array union — closed
2026-09-03 by §1.2i — and the server still cannot order two genuinely
simultaneous same-field writes beyond the deterministic (edit time, revision
basis, author id) total order.

### 1.2f Hydration now merges with the same per-sub-document policy
(2026-09-03, `server/project-store-hydration.e2e.test.mjs` cases 4-5)

Reload hydration (`hydrateProjectStoreFromBackendOnce`) previously resolved
LOCAL-vs-BACKEND copies by whole-project `updatedAt`: local strictly newer →
keep local, equal → keep local (§1.2a), else adopt the backend project
wholesale. That left two silent-loss shapes on the CLIENT side that the
server merge already closed in §1.2b/§1.2d:

1. **Offline-then-reload.** A sub-document edited offline (never synced) was
   dropped whenever a DIFFERENT sub-document had advanced on the backend
   (another session's later edit makes the whole backend project newer, so
   hydration replaced the local copy wholesale before the queued sync could
   push the offline edit). E2E case 4 reproduced the loss under the old logic
   (offline brief `40 → expected 55`) and is green after the fix.
2. **Two-tab.** A reloading tab stayed blind to the other tab's newer
   sub-document whenever the whole-project timestamps TIED (the reloading
   tab's own last edit is usually also the server's last whole-project
   change), so whole-project LWW kept the stale local copy indefinitely —
   sync responses only ever adopt the revision, never content. E2E case 5
   reproduced the stale brief under the old logic and is green after the fix.

Fix: `mergeProjectVersionsForHydration` (exported from `projectStore.ts`)
applies the SAME policy as the server's `mergeWorkspaceProjects` to each
local/backend pair — the six timestamped sub-documents resolve per embedded
timestamp (`SUB_DOCUMENT_TIMESTAMP_KEYS`, identical to the server's),
project-level fields resolve by the same (updatedAt, revision basis) chain
with the winner overriding and the loser gap-filling, and
attachments/comments/shares/auditTrail union by id (backend wins an identical
id, local-only ids survive). The one asymmetry: the server keeps per-sub-
document author/basis metadata (`_merge`) private, so a FULL tie on the
client keeps the local copy (§1.2a's thin-row guard) instead of comparing
author ids; a genuine same-millisecond same-field race reaching that tie is
resolved deterministically by the server on the next sync. The merged copy
adopts the backend's `syncRevision` whenever backend content is adopted, so
the next sync echoes the freshest basis the merged content is based on.

`conflict` semantics are unchanged in spirit — it fires when local content
was preserved over a genuinely different backend value (the old "local
project was newer" flag, now per mergeable unit). The §1.2a thin-row defense
is subsumed (absent backend sub-documents keep the local value without
flagging). Client unit tests pin the pure merge (offline, two-tab, thin-row,
plain-reload no-op, backend-newer, by-id union); both new E2E cases were
verified to FAIL against the pre-fix whole-project logic before the merge
landed.

### 1.2g Stage/status row-vocabulary canonicalisation (2026-09-03)

The supabase-tables commit used to copy each project document's stage/status
VERBATIM into the CHECK-constrained `wingman_projects` row columns, so a real
client project in `"Proposal Builder"` stage or `"recommended"` status (the
client's own `ProjectStage`/`StatusVariant`) failed every commit with a
Postgres 23514 — and because `wingman_snapshot_commit` reconciles the WHOLE
workspace in one transaction, one such project broke every sync in the
workspace (the load-run finding in §1.2c item 2).

Fix: `server/project-row-vocabulary.mjs` canonicalises the row columns at
snapshot-payload build time (`canonicalStageForRow`/`canonicalStatusForRow`,
wired into `writeDbToSupabaseTables`):

- stage — the canonical list is a coarse account lifecycle; the client stages
  are workflow routes inside it. `Competitor Compare`/`Recommendations` →
  `Design`, `Proposal Builder`/`Templates` → `Proposal`, plus the legacy
  `Finder` → `Design`; canonical values pass through, unknown values fall back
  to the column default. The mapping is TOTAL — an unrecognised value can
  never reach the constrained column (one bad row would fail the whole
  workspace's commit).
- status — `recommended` → `Commercial Ready`, `caution` → `In Progress`,
  `alternative` → `Draft`; canonical values (e.g. `Commercial Ready`, which
  the server's own mark-ready gate writes into documents) pass through.

The canonicalisation is strictly ONE-WAY relational enrichment: the client
strings stay untouched inside the row `payload` JSONB and every read rebuilds
documents from that payload, so the client round-trips its own vocabulary and
never sees the canonical values. Coverage: unit tests pin the full mapping and
its totality (`server/project-row-vocabulary.test.mjs`); the hydration E2E now
boots a second real server in `supabase-tables` mode against a stateful fake
PostgREST and syncs REAL client projects (`"Proposal Builder"`/`"recommended"`
and `"Competitor Compare"`/`"caution"`), asserting the committed rows carry
CHECK-safe values while the payload blob and the client's post-hydration view
keep the original strings (case 6, `server/project-store-hydration.e2e.test.mjs`;
verified red against the verbatim row copy). The load harness corpus also speaks
the real client vocabulary again, so a supabase-tables load run is a live
regression test against real CHECK constraints — verified live 2026-09-03: a
single-user smoke `project-save` run against the hosted `.env` Supabase project
committed 4/4 project rows with canonical `Proposal`/`Commercial Ready` columns
while the payload blobs kept `"Proposal Builder"`/`"recommended"`, with zero
23514 CHECK violations in any run log. (The same session's multi-user smoke
also exposed the whole-snapshot commit's cross-instance read-modify-write race
— concurrent commits reconciling over each other's reads and deleting each
other's rows; that hazard is fixed by the migration-013 generation guard,
§1.2h.) The canonical vocabulary itself is now defined in one place —
`docs/PROJECT_LIFECYCLE_DICTIONARY.md`, enforced on every provisioning route
by migration 014's named `wingman_projects_stage_check` /
`wingman_projects_status_check` constraints (the mirrored Supabase GitHub
migration set had created `wingman_projects` without the CHECKs, so a
constraint-less environment would have accepted verbatim client values
silently; §1.2g's canonicalisation code would still have written canonical
rows, but the database backstop would have been missing there).

### 1.2h Cross-instance generation guard for the whole-snapshot commit (migration 013, 2026-09-03)

Migration 009 made `wingman_snapshot_commit` atomic, and the in-process store
lock (`withStoreLock`) serializes every read-merge-commit cycle WITHIN one
server — but each server process owns its own lock. Two instances sharing one
Supabase project can both read the same row state, both merge their own save
against it, and the second whole-snapshot commit then RECONCILES the first
instance's freshly written rows away as "stale": two overlapping saves both
report HTTP 200 and one edit is silently gone. §1.2g's multi-user smoke run
observed exactly this class of failure (intermittent owner-FK failures when
concurrent commits delete rows the other writer's snapshot did not contain).

Fix — migration 013, in both migration trees:

- a **generation register** (`wingman_db_generation`, single `global` row)
  whose `generation` increases by exactly 1 on every successful commit;
- `wingman_snapshot_commit(payload, expected_generation)` CLAIMS the
  generation the snapshot was read at before writing anything (a guarded
  single-row update whose row lock serializes concurrent claims across
  instances); a claim against a moved register REFUSES with
  `{ committed: false, stale: true, current_generation }` before touching a
  table — a refused commit is a pure no-op that never bumps the register. The
  old one-argument signature is dropped so a pre-013 caller fails loudly at
  PostgREST instead of committing unguarded;
- the store reads the register FIRST, before the eight snapshot tables: a
  commit landing after our register read can only move the generation AHEAD
  of the snapshot being assembled, so the guard can under-accept (a needless
  retry) but never over-accept a stale snapshot;
- the sync handler retries on a stale refusal (bounded, default 5,
  `WINGMAN_SNAPSHOT_RETRY_ATTEMPTS`): it re-reads the CURRENT snapshot (which
  contains the winner's rows), re-merges the client payload, and re-commits.
  Other mutating handlers surface the refusal as a 503 — a stale refusal
  never falls back to the local file store, even in fail-open mode, because
  that would fork the database.

Evidence: a new two-process E2E
(`server/project-store-two-process-race.e2e.test.mjs`) boots TWO real servers
against one stateful fake PostgREST that models the register + CAS, holds both
servers' commits at a gate until both have provably finished reading (the exact
interleaving that loses rows unguarded), then releases: both syncs return 200,
exactly one commit is refused stale and retried, and BOTH projects, users,
workspaces and sessions survive — verified red with the fake's CAS disabled
(the survivor's reconcile deletes the other writer's rows). The SQL was
validated on real PostgreSQL (local portable stack): a current commit succeeds
and bumps, a stale commit refuses and touches nothing, a null generation is
rejected, and the superset of the existing E2Es' fakes now model 013
semantics. Applied live to the hosted project and exercised by an attributable
`supabase-tables` load smoke: exit 0, 3/3 owners verified persisted and
self-cleaned; the measured per-save cost of the guard is the extra ~90 ms
register read (p50 5.01 s vs the 5.28 s recorded pre-013 baseline —no material change). Row-level/per-project sync (Phase 2) still removes the
queue multiplier and the whole-DB RPC cost this guard makes safe.

### 1.2i By-id last-writer-wins for the id-keyed work-product collections
(2026-09-03, parity: `server/project-store-id-keyed-collections.parity.test.mjs`)

The per-sub-document merge of §1.2b/§1.2f resolves six SINGLE-VALUE sub-
documents; the id-keyed ARRAYS (`compareRuns`, `proposalVersions`,
`requirements`, `productSelections`, `visualAssets`) still travelled whole
with the project-level LWW winner, so two sessions editing DIFFERENT items
of one collection lost one session's items wholesale on the next sync — the
same gap §1.2b closed, one level down.

Fix on BOTH sides, byte-identical logic:

- **The pure merge.** `mergeIdKeyedCollectionItems(stored, editor, { idKey,
  timeKey, editorIsFresh })` — items in both sets resolve per item by
  embedded write time (`pickCollectionItemVersion`: later time wins; a timed
  save beats an untimed legacy copy; equal/absent times fall back to a total
  content order so the outcome never depends on arrival order), editor-only
  items are always added (offline additions survive), and stored-only items
  are dropped ONLY when the editor is fresh (`editorIsFresh`, its omission is
  then a deliberate removal) — a stale editor whose payload predates the
  stored copy may simply never have seen the item, so it is kept. Without
  that guard a by-id union would resurrect every removal the whole-array LWW
  used to honour.
- **Server sync merge.** `mergeWorkspaceProjects` now runs the merge per
  collection with `editorIsFresh = payload.baseRevision >= stored row's
  syncRevision` — the exact freshness predicate the client basis and the row
  revision compare everywhere else in this ADR.
- **Client hydration.** `mergeProjectVersionsForHydration` merges the same
  collections with the same pair orientation (stored = BACKEND copy, editor =
  LOCAL copy) and the same freshness test (local basis >= backend basis), so
  a reload and the next sync of the same local copy resolve the same pair
  identically; a local item preserved over a differing backend item for the
  same key counts as a conflict, like the sub-document lanes. Both flows
  delete an emptied collection key rather than storing `[]`.

Collection keying: `compareRuns`/`proposalVersions`/`requirements`/
`visualAssets` by item `id`; `productSelections` by `sku` (their identity).
Write-time keys: `createdAt` (compareRuns), `savedAt` (proposalVersions),
`updatedAt` (requirements, visualAssets), `addedAt` (productSelections) —
the stamps the client save functions already embed.

Parity coverage: the shared corpus (~70 frozen (stored, editor, freshness,
keys) pairs spanning union, LWW both directions, equal-time content ties,
no-op re-syncs, fresh removals, stale keeps, legacy untimed items, id-less
items, undefined collections) feeds BOTH implementations and requires
identical arrays and identical per-item decisions; workflow-level cases drive
`mergeProjectVersionsForHydration(local, backend)` and require its merged
collections to equal the server merge helpers' output for the same pair
(both sessions' additions survive, same-item concurrent edits converge,
fresh removal honored vs stale keep, conflict flags). The known residual:
a stale payload can still RE-ADD an item a fresher writer removed (it never
saw the deletion) — both sides behave alike, and per-item tombstones would
be the Phase-3 fix. Existing two-session merge/stress and hydration E2Es
stay green, the stress suite now drives a SHARED `requirements` lane
both sessions edit every round: per-response it asserts the syncing
session's own items always survive and `req-shared` is always the newest
parity owner's whole version, and at every round boundary the EXACT union
of everything both sessions have ever synced (verified red against the old
whole-array behavior, which lost the losing session's items permanently).
The single-collision suite (`project-store-two-session-merge.e2e.test.mjs`)
now runs concurrent COLLECTION edits across all five collections in both
sync orders too: disjoint items from both sessions must union, and a
same-item collision must resolve to one WHOLE item version with both sync
orders converging to the same winner — later embedded edit time wins, and
an exact time tie resolves by the deterministic total content order (all
four cases verified red with the per-item merge disabled).
`server/project-store-two-session-collections.e2e.test.mjs` (port 8886)
covers the COMPOSED case the single-collision suite splits apart: both
sessions edit the requirements AND productSelections lanes of ONE project
between the same two syncs (shared-item rewrites plus each session's own
items), in both sync orders — the union, whole-version and order-
convergence invariants must hold for both lanes in the same
mergeWorkspaceProjects call, a same-millisecond tie must resolve both
lanes deterministically, and a fresh sync's removal in one lane must
compose with an addition in the other (freshness is per lane, not per
project).
The per-response union is deliberately not asserted for freshness-guarded
lanes: a divergent session whose basis ties the row revision has never
adopted the row's content (projectStore.ts adopts only syncRevision on sync
responses), so its fresh omission is indistinguishable from a removal and
the round's first mover can transiently drop the other session's items —
benign churn the stale second sync always restores. Adopting sync-response
content on the client would strengthen this to per-response union.

### 1.2j Sync conflicts are surfaced per project with the changed lanes (2026-09-03)

Follow-on from §1.2f/§1.2i: a divergent session whose local edits are not yet
committed sees a sync response whose `syncRevision` exceeds its own
`baseRevision` — exactly the moment a team member's concurrent edits have been
merged into the row under a copy of the document the local tab does not have.
That condition was previously invisible: the store adopted the revision and the
UI showed plain green "Saved", so a rep could keep typing over a colleague's
changes and resolve nothing.

The sync-response handler now computes, per returned project, the set of
changed lanes between the doc the tab just sent and the doc that came back
(the same canonical lane comparison used for the per-sub-document and by-id
merges; JSON-round-trip semantics so a solo sync round trip diffes clean).
When `syncRevision` exceeds the sent `baseRevision`:

- the project is marked `syncConflict` — `{ fields, detectedAt }` persisted on
  the stored project (never sent in the sync payload) — and the global
  `syncStatus` is set to the `conflict` state with a human message naming the
  project;
- the conflict clears automatically once the tab has adopted the member's
  version and its next sync round-trips clean (revision equal, no changed
  lanes), so the UI never asks the rep to dismiss state manually;
- the row still keeps the server's merged content and the monotonic revision
  — the conflict is a surface signal, not a merge-policy change; a solo sync
  with no concurrent member edit never flags.

Surfaces: ProjectsPage rows show a "Team changed" badge (amber, naming up to
three lanes) next to the sync chip; ProjectDetailPage shows an amber banner
"A team member changed X since your last sync. Reload the page to review their
latest changes before continuing." Lanes render through `projectLaneLabel`, the
single label vocabulary shared with the store.

Verification: unit tests for the pure lane-diff helper (undefined-key JSON
semantics, id-keyed lane comparisons) and the persistence round trip;
ProjectsPage/ProjectDetailPage render tests for the badge and banner;
`server/project-store-sync-conflict.e2e.test.mjs` (port 8883) boots the real
server and drives the real client module — a member edit landing between two
syncs flags the conflict with exactly the changed lane, a solo sync does not
flag, and hydration adopting the member's version followed by a clean sync
clears it. Full server suite green at 31 files / 203 tests.

### 1.2k Hydration pulls incrementally (`since=revision`, 2026-09-03)

Hydration (`GET /api/wingman/projects` → `hydrateProjectStoreFromBackendOnce`)
used to download EVERY workspace project on every reload and merge each
against the local copy. The per-project revision counters made the pull
incremental without weakening the merge policy:

- The client sends an `X-Wingman-Since` manifest ({ projectId: lastSeen-
  revision }). The server (`selectProjectsForSince`) returns a row UNLESS it
  can prove the client's copy is current with it — row syncRevision exactly
  equal to the reported revision, meaning no write touched that row since the
  client saw it. Everything else returns: rows another member moved, rows new
  to the client, legacy rows without a revision (currency unprovable), and
  entries reported as 0.
- The 0-entry is what keeps the pull safe for the §1.2j conflict path: a
  syncConflict-flagged local copy has a REPORTED revision ahead of its
  CONTENT basis (a sync response advanced the number without adopting the
  row's content), so reporting the real revision would skip the row forever
  and the conflict would never reconcile. `buildHydrationSinceManifest`
  reports 0 for flagged projects (and never-synced locals), forcing the row
  back. Skipping is therefore only ever an optimization over content the
  client already holds.
- A since-pull is READ-ONLY: it reports what changed and never performs the
  whole-DB snapshot commit a plain GET performs to persist its throttled
  last-seen touch. In supabase-tables mode that is the difference between a
  reload costing the full read+commit cycle and costing just the reads.

Verification: `selectProjectsForSince` unit tests (equality skip is the ONLY
skip; moved/unknown/forced-0/legacy/ahead rows all return, malformed values
degrade to always-return) and `buildHydrationSinceManifest` unit tests;
`server/project-store-incremental-hydration.e2e.test.mjs` (port 8884) drives
the REAL server + module — an exact manifest returns zero rows and the
no-change reload keeps both local copies, a member edit returns only the
changed project (untouched projects keep their copies byte-for-byte), a
malformed manifest 400s, and the since GET provably never writes (file-mode
db `updatedAt` moves on a full GET and is frozen across since GETs). The
pre-existing hydration and sync-conflict E2Es now exercise the incremental
path end-to-end (17 tests green), proving the offline/two-tab/reconcile cases
still hold when a reload only fetches deltas.

Measured payload saving under supabase-tables (harness `--scenarios
project-save,hydrate-since`, hosted project, standard corpus of 4 projects):
a no-change reload downloads **258 B instead of 366.0 KB** (~99.9% less) and
answers ~2.7× faster (340 ms vs 906 ms mean) because the pull skips the
snapshot commit; a one-project-moved reload downloads 91.7 KB. Recorded in
docs/LOAD_TESTING.md with the reproduction command. Known residual: a
revision-equal row is skipped even when an UNTRACKED project-level lane
(not in the §1.2j conflict lanes) diverges without a flag — the merge policy
does not arbitrate untracked lanes today, and the divergence converges on the
next sync push either way.

### 1.2l Phase 1 per-project revisioned sync (`PUT/GET /api/wingman/projects/:id`, migration 015, 2026-09-03)

Phase 1's server half — the per-project routes and the guarded single-row
commit — is implemented and validated on the zero-network stack:

- **Routes.** `PUT /api/wingman/projects/:id` commits ONE project document
  (the same per-project entry shape the sync POST carries: the client
  document plus `baseRevision`); `GET /api/wingman/projects/:id` reads one
  row and — like the §1.2k since-pull — is purely read-only (never touches
  the store file / never triggers a snapshot commit). Both coexist with the
  whole-store endpoints; client migration to per-project push remains Phase 2
  ("per-project push granularity"), now with a live endpoint to migrate to.
- **Migration 015 (`wingman_project_put`).** One atomic single-row upsert.
  The row's OWN `payload->>'syncRevision'` is the concurrency guard: the
  guarded UPDATE matches the revision the caller read at and bumps it by one,
  so overlapping per-project commits from different server instances
  serialize on the row instead of the whole-store generation register — a
  stale writer is refused (`committed:false, stale:true, current_revision`)
  before writing anything, and a concurrent insert of a new row is caught by
  the primary-key conflict and refused the same way. A successful commit
  ADVANCES the migration-013 register in the same transaction (unconditionally
  — no claim), so any whole-snapshot commit whose read predates the row write
  refuses and re-reads instead of reconciling the fresh row away. The audit
  row (scope projects, action sync) lands in the same transaction. Row
  columns are built by the SAME serializers as the whole-snapshot commit
  (`projectRowForCommit`/`auditEventRowForCommit`, canonical stage/status via
  §1.2g) so the two write paths cannot drift.
- **Merge-on-stale, not drop-on-stale.** The handler merges the incoming
  document against the CURRENT row with the same `mergeWorkspaceProjects`
  sub-document LWW the sync POST uses, then commits guarded by the revision
  it read; a refused commit triggers a bounded re-read/re-merge/retry (the
  row-level analogue of the §1.2h stale retry). In file / single-row supabase
  modes the merged row is applied in memory and written through the store's
  regular path.

Verification: `server/project-store-per-project-sync.e2e.test.mjs` (port
8885, real server, owner + sales member + read-only customer member) — PUT
creates at revision 1 and GET returns it read-only (file mtime frozen); a
stale PUT (owner based on revision 1 while a member already landed revision
2) preserves BOTH edits at revision 3, never a silent drop; sequential saves
advance 1→2→3 deterministically; 401 without a session, 403 for the
customer-role member, 404 for an unknown project, 400 for a URL/body id
mismatch and a missing baseRevision. The RPC's guarded semantics were proven
directly against real Postgres on the local stack (create at expected 0 →
revision 1 / register 0→1; concurrent create at expected 0 → refused, register
UNCHANGED; guarded update at expected 1 → revision 2 / register 1→2; stale
update → refused, register unchanged) and the single-row write is exercised
end-to-end by the harness `project-put` scenario under supabase-tables.

Measured on the zero-network stack (standard, 3 users, concurrency 10, 100
requests, dated `WINGMAN_STORE_PROFILE` attribution re-run in
docs/LOAD_TESTING.md): per-project PUT p50 **415.61 ms** vs whole-store sync
POST 871.88 ms on the same stack — **−52%** — with a 4× smaller wire payload
(81.6 KB vs 326.4 KB per request). Per-save stage reductions, quantified from
the profile: the whole-snapshot serialization (8.6 ms p50) and
`wingman_snapshot_commit` RPC (43.9 ms p50) no longer run on a save — the
write is ONE guarded row at the single-row RPC's **8.8 ms p50** (−80% vs the
whole-DB RPC alone); the store-lock queue wait drops −51% p50 (750.9 → 365.7
ms) and the lock run −44% p50 (78.2 → 43.6 ms), so 10 concurrent writers
drain ~2× faster (18.8 vs 12.1 req/s). Residual, measured not assumed:
project-put p95/p99 stay within ~15% of the whole-store run because every PUT
still runs the whole-store read under the one global lock — and that read
GROWS with the row count (the projects-table read went 11.2 → 27.9 ms p50 as
this create-per-request scenario accumulated ~100 × ~80 KB rows), the
whole-store read's O(row count × payload) scaling exposed once the write path
stops masking it. Scoping the per-project path's read to auth + one row
(dropping the whole-store read and its queue place) is the remaining lever.

### 1.2c Supabase-tables backend-mode findings (2026-09-03, first attributable load run)

Getting a load harness to commit against REAL Supabase (`supabase-tables`,
`tools/load-test.mjs --storage-mode supabase-tables`) exposed defects no test
had caught — all server tests exercise an in-process fake PostgREST, and the
snapshot-commit SQL had never run against a real database:

1. **`wingman_snapshot_commit` / `wingman_ledger_commit` (migrations 009/011/
   012) failed with Postgres 42702** on every call: bare `payload` references
   in SQL were ambiguous between the PL/pgSQL argument and the `payload`
   columns of the tables the statements insert into. Fixed with
   `#variable_conflict use_variable` in both migration sets (byte-identical
   pairs) and re-applied to the live project via
   `tools/apply-wingman-migrations.mjs`; no-op RPC calls now return 200.
2. **The row columns are NOT the document.** `wingman_projects.stage/status`
   are CHECK-constrained to a canonical vocabulary
   (`Discovery|Design|Proposal|Deployment|Support` ×
   `Draft|In Progress|Commercial Ready|Archived`) while the sync handler
   writes `payload.stage/status` verbatim — a real client project in stage
   `"Proposal Builder"` (the client's own `ProjectStage`) fails every
   supabase-tables commit. The rich payload blob carries the client
   vocabulary fine; the constrained row columns are now canonicalised
   server-side (`server/project-row-vocabulary.mjs`, §1.2g).
3. **Silent file-store fallback masks remote failure:** with
   `WINGMAN_STORAGE_FAIL_CLOSED=false` (the `.env` default) a failed Supabase
   read/write falls back to local file storage and the request still returns
   200 — a load run's first "100% success" persisted ZERO project rows to
   Supabase (they went to a throwaway data dir). Load runs must force
   fail-closed and verify persisted rows.
4. **`wingman_projects.id` is a global primary key across all workspaces** —
   nothing scopes it per workspace, so two workspaces syncing projects with
   colliding ids silently contend for one row (the harness now namespaces its
   corpus ids; real clients rely on unique id generation).

These are the concrete costs the whole-DB snapshot sync pays in production
storage: per-request commit latency grows with total DB size (~10 s at ~4 MB
of rich project docs on a SAME-REGION link — the project is West Europe
(London), the dev machine England; raw RTT ~11 ms, so the seconds are
server-side commit/read cost, not WAN — measured 2026-09-03, see
`docs/LOAD_TESTING.md`), which is the measured payload-scaling argument for
Phase 1's per-project revisioned sync.

Profiled server-side (2026-09-03, `WINGMAN_STORE_PROFILE=1`, see
`docs/LOAD_TESTING.md` "Server-side stage attribution"): each save's ACTIVE
cost is only ~1 s — parallel 8-table reads ~0.25 s (per-table 161–238 ms,
all one page at this scale), snapshot serialization ~0.007 s (~1.17 MB
payload), and the `wingman_snapshot_commit` RPC ~0.74 s — and the remaining
~9 s of the 10 s p50 is the **store-lock queue**: one global mutex
serializes every read-modify-write, so p50 latency grows linearly with
concurrency × ~1 s lock holds. The RPC is the dominant active cost;
per-project revisioned sync (Phase 1) removes both the queue multiplier and
the whole-DB commit.

The zero-network number (2026-09-03): the portable stack is now the checked-in
`tools/local-supabase-stack.mjs` (embedded PostgreSQL 18.4 + PostgREST
v12.2.12 + a `/rest/v1` gateway proxy; migrations 001–015 applied, pg_cron
stripped — `npm run load-test:local-supabase:all` installs, migrates, runs
the standard baseline and tears down). With migration 013's generation
register live it measured the `wingman_snapshot_commit` RPC (register CAS
claim included) at **~40 ms p50** on a ~1 MB snapshot — so the hosted RPC's
other ~700 ms is payload UPLOAD bandwidth over the hosted link
(~1.2 MB/commit ≈ 13 Mbps effective), not SQL. The table reads (register
included) drop to ~11 ms total (3–11 ms per table), serialization is
unchanged (~8 ms), and end-to-end stays queue-dominated even locally
(732 ms wait on 76 ms holds at concurrency 10 → 832 ms p50 vs 10.47 s
hosted). Full numbers and the reproduction command in
`docs/LOAD_TESTING.md` "Zero-network SQL commit baseline".

### 1.3 Consequences that fall out of 1.1 + 1.2

1. **Reload-after-sync thinning — resolved by the Phase 0 E2E (§1.2a).** The
   plain scenario (full-document round trip, equal `updatedAt` on reload) does
   not thin; the data-shape variant (equal-aged THIN backend row) did, and the
   client now prefers local on equal timestamps. Since §1.2f, hydration no
   longer resolves whole-project at all: the E2E
   (`server/project-store-hydration.e2e.test.mjs`) drives the real client
   against the real server across five cases (strictly-newer local, plain
   reload, equal-aged thin row, offline-then-reload, two-tab tie) and the
   per-sub-document merge (§1.2f) keeps them green. PRE_PRODUCTION_REPORT
   §P1-3 flagged the conflict path as untested; the strictly-newer case now
   has a test too.
2. **Payload ceiling vs whole-store sync.** One 1 MiB POST must carry every
   project. A workspace with a few visual-asset-heavy projects will exceed it;
   the over-cap body is rejected (400 on the sync handler, 413 on the
   competitor JSON routes — measured by the load harness and the 413 suite), the
   client shows `state: "error"` with "Local changes were preserved" —
   survivable, but the workspace then silently stops syncing.
3. **Two-session same-project edits were lost (B3, mostly resolved).**
   Whole-project LWW on the server meant a later sync's stale copy overwrote
   the earlier session's sub-document edit wholesale. Fixed 2026-09-03 for the
   timestamped single-value sub-documents (§1.2b); remaining: id-keyed lists
   (`compareRuns`, `proposalVersions`, `requirements`, `productSelections`,
   `visualAssets`) and same-sub-document conflicts, plus two-tab whole-store
   LWW in the browser.
4. **No cross-device or cross-workspace story.** Cache is one browser-global
   key with no workspace/user namespace, and the sync is gated on a build-time
   flag that defaults off (per-browser storage remains the default). Rich
   content *does* survive server-side when the flag is on (full-document
   round trip, §1.2), so P1-3's exit criterion ("project created on machine A
   is visible on machine B after login") is achievable once the flag is on in
   production and the schema/migration work lands.
5. **A repeatable failure mode to avoid:** `lib/siteSurveySync.ts` polls and
   pushes to `/api/wingman/site-survey/sync`, but **no server route registers
   that path** (verified by whole-repo search 2026-09-03). The client loop can
   never reach `synced`. Any new sync loop must ship its server half in the
   same change and be covered by a server test.
6. **What is worth preserving:** the defensive normalize-on-read pipeline;
   `isDemo`-preserving reset; the `storage` + custom-event cross-tab broadcast;
   the sync-status state machine (`local | syncing | synced | error | conflict`)
   already surfaced in the Projects page; server-side audit events; and the
   per-workspace auth/permission model on the server.

---

## 2. Decision drivers and non-goals

Drivers (weighted, most important first):

- **D1 — Durability / cross-device.** A sales rep's project history must not
  live in one browser profile. Named accounts and workspaces already exist
  server-side (auth, roles, comments, shares, approvals) — the data model
  should match the product's existing server truth.
- **D2 — Scaling under current budgets.** Sync must stay under the 1 MiB HTTP
  body cap and the 8 MiB snapshot ceiling *by construction* (per-document
  payloads), and page reads must stop being O(whole store).
- **D3 — No silent loss.** Neither edit is lost when two tabs (or two devices)
  edit the same project; refreshes never thin data.
- **D4 — Governance.** Quote-safety sign-off, audit trails, manager review and
  customer-facing comment/share flows are server concepts; the storage model
  must keep a server-side copy of the evidence these flows read.
- **D5 — Migration.** Pilot users have local-only data today; there must be a
  dated, tested one-time "upload my projects" path (P1-3 instruction 3).
- **D6 — Bounded change to callers.** 30+ production modules use the current
  synchronous store API. B2 will later move callers behind commands/queries;
  B1 must not require touching all of them at once.

Non-goals for B1: multi-user real-time collaboration on one open project;
CRDT infrastructure; replacing the ~35 non-project browser-storage modules
(that is B2/B4 territory); visual-asset binary storage redesign beyond moving
data URLs out of the JSON document.

---

## 3. Candidate architectures

### Option A — Server-authoritative with local cache (recommended)

The deployment backend is the system of record for complete project documents,
scoped to a workspace. The browser keeps a per-(workspace, user) cache used for
instant reads and offline edits; a queue replays edits when connectivity or a
session returns.

What changes versus today, mapped onto the code:

| Today (`projectStore.ts` + server) | Option A |
|---|---|
| One browser-global `localStorage` key for the whole store | Cache namespaced per `workspaceId + userId`; small project-list index stays in `localStorage`, heavyweight payloads (visual data URLs) move out of the JSON document |
| Whole-store sync POST (≤ 1 MiB budget), debounced 600 ms | Per-project-document push with revision, plus incremental pull (`since=…`) — granularity modelled on the intended `siteSurveySync.ts` shape but with a real server endpoint in the same change |
| POST response body ignored | Response (or a follow-up GET) is the reconciliation source; client converges to server state unless a queued local edit is newer |
| Server stores the full document already (`sanitizeProject` spreads the source, §1.2) but schema ownership is implicit — nothing validates/versions the work-product shape | Server makes the full-document schema explicit (versioned per-project rows/shard under the existing snapshot engine), keeping the 8 MiB ceiling by never committing the whole corpus in one write |
| Per-project LWW merge on server | Per-project **revision** + `updatedAt` — **revision counters landed 2026-09-03 (§1.2d)**; by-id union-merge extended to the id-bearing sub-documents (compare runs, proposal versions, requirements, audit entries), scalar fields LWW, visible `conflict` status (state already exists) |
| Hydration merge: whole-project LWW with local tie preference (§1.2a) | Per-sub-document LWW on hydration, mirroring the server merge — landed 2026-09-03 (§1.2f: six timestamped sub-documents by embedded time, by-id list unions, revision-basis tie-break, local kept on full tie); delete is an explicit tombstone op, never "absent from payload" |
| Local-only fallback on 401 | Same UX but formalised: offline queue with `pendingChanges` count, replayed on reconnect (mirrors the survey badge pattern, with a server that exists) |

Client API surface stays put for Phase 1–2: `readProjectStore` /
`writeProjectStore` / `useProjectStore` / events keep their signatures; the
substrate and the sync engine change underneath. That satisfies D6.

### Option B — Local-first (device-authoritative with sync)

The browser is the source of truth; edits are recorded as an append-only
operation log (or per-field mergeable state), and the server is a replication
target. Options typically build on IndexedDB + an op-log/CRDT layer.

What it would require here:

- An async IndexedDB substrate — but 30+ modules and derived selectors
  (`getCurrentWorkflowProject`, quote-safety dashboards) call the store
  **synchronously** today; making the substrate async is a sweeping change or a
  blocking cache-coherence hack.
- An op-log / per-field merge strategy for every sub-document type. The
  documents are not flat: ordered lists (compare runs capped at 10, proposal
  versions, requirement records, discovery conversation rows, audit entries
  with severities), free-form nested objects (room model, videowall summary),
  and derived governance state (quote-safety status computed from evidence).
  Each needs its own merge rule; LWW-per-project (what exists) is not local-first.
- Server flows that presuppose server truth — comments/shares/approvals,
  workspace roles, read-only roles, audit events — would either fork into a
  second authority or force local-first only for the rep-owned document and a
  different model for everything else, i.e. two systems of record.
- There is no existing CRDT/op-log infrastructure anywhere in the repo, and the
  one prior attempt at a sync loop (`siteSurveySync.ts`) was written
  server-poll-shaped, not local-first — so Option B is greenfield on the
  hardest axis (merge semantics) while the product's review flows already
  assume server truth.

### Option C — Status quo (rejected baseline)

Keep the single `localStorage` document, the build-time flag (off by default),
whole-store LWW, and no server-side schema ownership. Documented against §1.3:
fails D1–D4 and leaves P1-3's exit criterion unmet in practice; kept in this
ADR only as the reference point for the cost/benefit table.

---

## 4. Evaluation

| Criterion | A · Server-authoritative + cache | B · Local-first | C · Status quo |
|---|---|---|---|
| D1 cross-device durability (P1-3 exit criterion) | **Yes** — full document already round-trips; flag defaults off and schema ownership is implicit, so the work is migration + explicit schema | Yes in principle, but replication target must be schema'd anyway | No — gated off by default, no schema ownership |
| D3 refresh safety (reload after sync) | **Yes** — E2E green (§1.2a/§1.2f): plain reload safe, equal-aged thin rows defended, and offline-then-reload preserves the offline edit while adopting the backend's newer content | Yes, by construction | No — whole-project LWW drops offline edits once the backend advances |
| D3 two-tab same-project edits (B3) | **Yes** — disjoint sub-documents merge per embedded timestamp on the server (§1.2b), same-field conflicts resolve deterministically by (edit time, revision basis, author) in either sync order (§1.2d), and reloading tabs now converge too: hydration merges per sub-document (§1.2f) so a tab never stays blind to the other tab's newer sub-document on a whole-time tie; id-bearing collections remain Phase 3 | Requires full op-log/merge design; largest surface | No — whole-project LWW both sides |
| D2 payload ceilings (1 MiB / 8 MiB) | Per-document sync fits by construction | Same need, plus a bigger log | Whole-store POST breaks first |
| D2 read scaling | Substrate change under stable API; B2 follows | Async substrate breaks the synchronous API | Degrades as store grows |
| Offline tolerance | Reads cached; queue replays writes (A-with-queue) | Strongest — multi-day offline editing is native | Reads only |
| Fit with existing server truth (comments/shares/approvals, roles, audit) | **Yes** — one authority | Two authorities or split model | Works, but nothing owns the document schema server-side |
| Migration for pilot local data (D5) | One-time upload action, same shape as sync | Op-log import + server replay semantics | N/A (nothing to migrate to) |
| Effort / risk | Medium-large; largest single risk is schema + migration, both well-bounded and testable against existing snapshot engine | Large; greenfield merge semantics + async substrate + server schema anyway | None — but debt compounds and P1-3 stays open |
| Closest existing precedent in repo | `siteSurveySync` polling shape + current sync-status UI (with the missing server half supplied) | None | — |

Net: Option A meets every driver with bounded, individually testable phases and
keeps one system of record. Option B buys multi-day offline editing the product
has not yet demonstrated it needs (UAT criterion is offline *edit/reconnect/
reconciliation tests*, not offline-first) at the price of greenfield merge
semantics and a second truth model. If UAT later demands long offline sessions,
the correct response is to deepen Option A's write queue (A-with-queue), not to
relitigate the authority model.

**ADR-0001 decision: Option A.**

---

## 5. Consequences

Accepted positive consequences:

- Closes P1-3's open decision and exit criterion; the roadmap's "strongest first
  investment" (B1) becomes executable, and B3 (two-tab reconciliation,
  rollback, dataset sizes) gets a defined target to test against.
- Project, Discovery, Compare and Proposal reads/writes converge on one storage
  substrate with server backup, which is the prerequisite for B2 (commands and
  queries) and C1 (one canonical proposal artifact serialised from the stored
  document).
- Server-side governance flows (approvals, comment audience filtering,
  quote-safety evidence, audit) read the same document the rep edits; making
  the full-document schema explicit (§1.2 normaliser, not allowlist) removes
  the current implicit-shape risk by construction.

Accepted negative consequences and mitigations:

- Online dependency for cross-device consistency — mitigated by the per-workspace
  cache + write queue; single-device use never needs the network (matches
  today's local mode).
- Server schema ownership moves from implicit (spread-everything) to an
  explicit versioned document shape — mitigated by versioned shape,
  normalise-on-read (already the client pattern, mirrored server-side), and a
  snapshot ceiling per project document well under the shared 8 MiB commit
  budget.
- Sync writes stay whole-project until sub-document merge lands — mitigated by
  sequencing: revision + per-project granularity first (fixes ceilings and
  refresh safety), sub-document merge second (fixes two-tab), each with its own
  tests.
- The ~35 non-project browser-storage modules stay outside B1 — recorded as
  B2/B4 debt, not silently included.

---

## 6. Phased implementation plan (for the B1 workstream)

- **Phase 0 — Pin today's behaviour with contract tests.** Done 2026-09-03 for
  the reload hazard: `server/project-store-hydration.e2e.test.mjs` boots the
  real server and drives the real client module through three cases
  (strictly-newer local preserved; plain reload after sync; equal-aged thin
  backend row). Verdict + client hardening recorded in §1.2a. Still open from
  Phase 0: whole-store POST over the 1 MiB body cap, the 401 fallback, and the
  server-half check that any new client sync loop has a registered route (the
  `siteSurveySync` lesson, §1.3.5).
- **Phase 1 — Make the full document an explicit, versioned server concern.**
  Done 2026-09-03 (§1.2l): per-project routes `GET/PUT
  /api/wingman/projects/:id` now sit alongside the whole-store endpoints, the
  PUT committing ONE row through migration-015 `wingman_project_put` — the
  row's own revision is the concurrency guard, a successful commit advances
  the §1.2h generation register so whole-snapshot writes cannot reconcile the
  row away, and a stale PUT re-merges against the current row instead of
  dropping the concurrent edit. The document shape stays versioned by the
  §1.2 normaliser + the §1.2g canonical row vocabulary. Remaining for
  Phase 1-to-2 handoff: client migration to per-project PUSH granularity
  (listed under Phase 2 below), which is what narrows the store read + lock
  hold to one row.
- **Phase 2 — Client substrate and granular sync.** Started 2026-09-03:
  the per-project **revision semantics** landed — `syncRevision`/`baseRevision`
  round trip (§1.2d), deterministic same-field LWW — and  reload hydration became an incremental `since=` pull that downloads only
  moved rows and never rewrites the store (§1.2k, `X-Wingman-Since`); the
  server half of per-project PUSH granularity (the Phase 1 routes of §1.2l)
  is live. Remaining: namespace
  the cache by workspace+user; move `visualAssets` data URLs out of the JSON
  document; per-project push granularity; explicit deletes;
  surface queued offline edits with a pending count; the one-time "upload my
  local projects" migration action (D5).
- **Phase 3 — Reconciliation semantics + scale evidence.** Started 2026-09-03:
  the timestamped single-value sub-documents are merged server-side (§1.2b)
  and same-sub-document conflicts resolve deterministically via the revision
  counters (§1.2d) — both covered by the two-session E2E in both sync orders.
  Remaining: per-item tombstones for id-keyed collection removals
  (the stale-payload resurrection residual of §1.2i) and large-workspace
  benchmarks feeding the A2/A3 p95/p99/payload budgets in
  `docs/LOAD_TESTING.md`.

**Exit criteria (each needs a dated artefact):**

1. A project created on machine A is visible on machine B after login — with
   its discovery brief, compare runs, proposal and visual assets intact
   (P1-3 exit criterion).
2. The reload-after-sync E2E (`server/project-store-hydration.e2e.test.mjs`) is
   green in backend mode across all five cases (§1.2a/§1.2f) — the plain
   hazard is refuted by test, the equal-aged thin-row variant is closed by the
   client tie preference, offline-then-reload and two-tab ties merge per
   sub-document (§1.2f), and the fence stays in the suite.
3. Two sessions editing different sub-documents of the same project preserve
   both edits in either sync order (B3 — green since 2026-09-03, §1.2b), and
   same-field concurrent edits resolve to the same winner in either sync order
   via the per-project revision counters (green since 2026-09-03, §1.2d); the
   remaining B3 item (id-bearing collections) has dated tests before it counts
   as closed. No sync payload exceeds the 1 MiB HTTP / 8 MiB snapshot budgets
   at benchmark sizes (A3).
4. Every `wingman2` sync loop in `src/` has a server route and a server test.

---

## 7. References

- `src/wingman2/data/projectStore.ts` — current client store (keys, read/write,
  hydration merge, sync scheduling, `useProjectStore`).
- `server/wingman-app-store.mjs` — workspace state, `sanitizeProject`
  (spread normaliser, §1.2), `mergeWorkspaceProjects`, sync/auth handlers,
  snapshot storage.
- `server/project-store-hydration.e2e.test.mjs` — Phase 0 E2E: reload after a
  successful backend sync, driven against the real server with the real client
  module (§1.2a).
- `server/project-store-two-session-merge.e2e.test.mjs` — Phase B3/2 E2E: two
  sessions editing one project — disjoint sub-documents in both sync orders
  (§1.2b) and same-field collisions resolving deterministically via the
  revision counters (§1.2d).
- `server/project-store-per-project-sync.e2e.test.mjs` — Phase 1 E2E: per-
  project PUT/GET against the real server (create/revision, read-only GET,
  stale-PUT merge preservation, auth/role/validation gates) (§1.2l).
- `server/migrations/015_per_project_guarded_commit.sql` (+ mirrored
  `supabase/migrations/20260903_per_project_guarded_commit.sql`) —
  `wingman_project_put`: guarded single-row project upsert whose CAS is the
  row's own revision, register advance + audit row in the same transaction
  (§1.2l).
- `server/competitor-lookup-server.mjs` + `server/routes/agents.mjs` — JSON body
  cap (`WINGMAN_MAX_JSON_BODY_BYTES`, 1 MiB default).
- `server/wingman-app-store.payload-limit.test.mjs` + `server/migrations/009_atomic_snapshot_commit.sql`
  (+ `supabase/migrations/20260902_atomic_snapshot_commit.sql`) — shared 8 MiB
  snapshot ceiling.
- `src/wingman2/lib/siteSurveySync.ts` — client-only sync loop whose server
  endpoint is not registered (§1.3.5).
- `docs/PRE_PRODUCTION_REPORT.md` §P1-3 — the original finding this ADR
  resolves; `docs/DEVELOPMENT_MILESTONES.md` — B1–B3 and A5 rows; §7 of this
  file's roadmap rewrite lists the v1.0 criteria this decision feeds.
