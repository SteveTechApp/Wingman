# CI guard gates: what a dependency or data edit must satisfy

Every commit runs the full verify chain (`npm run verify` via the pre-commit
hook; the same chain split across the CI `Test` / `Verify (data | contract |
visual)` / `Build` jobs). Several of those stages are **guard gates** that
forbid a specific regression class rather than testing behaviour. When you
edit a dependency manifest, a lockfile, or product/governance data, the gate
list below is what decides whether your change can land — read the row for the
data you touched **before** opening the PR, so the first CI run is green.

The two dependency-gate tools also have their own header documentation
(`tools/check-build-deps.mjs`, `tools/check-override-floors.mjs`), and the
ratchet-style gates share the exception discipline recorded in
[`docs/SIZE_BUDGETS.md`](SIZE_BUDGETS.md). This file is the map.

## Gate summary

| Gate (npm script) | Verify lane / hook | Forbids | Exception path |
|---|---|---|---|
| `data:sources:check` | `verify:build` | editing a WyreStorm/competitor source without rebuilding the tracked `product-data-manifest.generated.json` (stale sha256, source/schema drift) | none — run `npm run data:sources:build` and commit the regenerated manifest |
| `check:data-sources` (successor, arch, closest-refs group) | `verify:data` | a `successor`/`closest_wyrestorm_*` reference that resolves to a discontinued or unknown product/architecture | none — edit the reference so it names a current active product |
| `check:governance-data` | `verify:data` | governed profile SKUs unknown to lifecycle; role-override visibility/recommendability contradicting lifecycle status; suppressing an active SKU | none — fix the governance JSON against `data-sources/wyrestorm/lifecycle.csv` |
| `check:generated-manifests` | `verify:data` | committed generated manifests drifting from their committed sources (hash-only commits, unrebuilt materialised blob) | none — run the listed generator and commit the regenerated file |
| `check:data-maintenance` | `verify:data` | the committed product data disagreeing with its own story: a canonical store under 250 records or holding duplicate SKU keys, a public index not aligned with that store or not generated from it, canonical products missing their maintenance-gate metadata, compare-ready coverage below the recorded floor, a maintenance queue missing either of its lists, a report that does not cover phases 1-6, or a data manifest the canonical source compiler did not write | a reviewed raise of `minimumCompareReady` in `tools/wingman-data-maintenance-baseline.json` when compare-readiness genuinely improved; everything else is fixed in the data files |
| `check:build-deps` / `check:build-deps:server` | `verify:build` | an OSV-open advisory in the build-time transitive closure (root and `server/` locks) | reviewed, **time-limited** exception in `tools/build-dep-exceptions.json` |
| `check:prod-unpatched` | CI Dependency Audit job | a PRODUCTION dependency (root and `server/` runtime scope) running an advisory with no available fix, or a denylisted package at any severity — the class that let moderate sprintf-js through to main | none — remove the dependency or the dependency path that reaches it; the denylist lives in `PRODUCTION_DENYLIST` inside `tools/check-prod-unpatched.mjs` |
| `check:override-floors` | `verify:build` + pre-commit fast lane | removing/lowering a load-bearing `overrides` floor or adding an unclaimed override | reviewed raise of the floor row inside the tool (advisory-driven only) |
| `check:published-surface` | `verify:build` | a build-written file in `dist/` that names a source module or a build script (`src/…​.ts`, `tools/…​.mjs`) or an absolute path from the machine that built it — everything in that directory is readable by anyone who asks, so a path in one publishes the tree the bundle was made from. Files copied verbatim from `public/` are skipped by hash, and a data citation (`data/…​.json#7`) is content rather than a build artefact | none — say the same thing without the path (a data note can name the gate it shares its thresholds with) or keep that text out of what the bundle imports, then rebuild: the gate reads the artifact, so a fixed source with a stale `dist/` still fails |
| `check:size-budgets` | `verify:build` | a tracked artefact growing past its recorded byte limit | reviewed exception recorded in `tools/wingman-size-budgets.json` (see SIZE_BUDGETS.md) |
| `check:architecture-boundaries` | `verify:build` and CI Build | a new/growing oversized TS module or page, or a private cross-boundary feature import | none — split the module, shrink existing debt, or import a feature's public API |
| `check:init-order` | `verify:build` and CI Build | a module-scope read of an imported binding that a page load can evaluate before the chunk it takes from — the class that took `/wingman/templates/<id>` down behind the error boundary on `Cannot read properties of undefined (reading 'aqua')` in a built app only | none — read the binding where it is used (inside the function or renderer that consumes it) instead of into a module-scope table, or move the reader out of the chunk cycle |
| `check:strict-verify-chains` | `verify:fast` (pre-commit hook, CI `Pre-commit lane ×2`) | a gate the normal stage runs but its strict twin does not — as an npm script, or as a `node tools/…` call on the stage's own line, which no script-name comparison can see — a strict stage `verify:strict` no longer composes, or a strict twin that has been deleted; the strict lane runs the strict stages *instead of* the normal ones, so a gate missing there is unasked rather than duplicated | none — add the gate (script or `node` line) to the strict chain (the seven scripts that were missing were added to `verify:contract:strict`), or restore the stage to `verify:strict`; a line both stages should keep, such as the data stage's revision notice, gets a script name both stages run (`notice:data-revision`) instead of an exemption |
| `check:ci-verify-stage` | `verify:fast` (pre-commit hook, CI `Pre-commit lane ×2`) | the CI `Verify (data / contract / visual)` job itself going away, losing a stage, or being gated off by a job-level `if:` the guard cannot prove true — the job that runs the wiring guards in those stages, so losing it silences all of them at once while the rest of the pipeline stays green, and a condition it cannot evaluate keeps the job in the file where it may be skipped without anything failing | none — restore the job and its stage matrix, or move those stages to a job the workflow still runs; for the condition, drop it (`if: true` and `if: always()` restate the default and pass) or gate the individual steps that need it |
| `check:verify-script-coverage` | `verify:fast` (pre-commit hook, CI `Pre-commit lane ×2`) | a `package.json` script reachable from neither `verify` nor `verify:strict` — a gate added, renamed or moved out of a stage while every remaining check stays green, which is what a rename does once its old `npm run` line goes with it; plus both halves of a stale declaration: a script declared outside that a stage now reaches, and an entry naming a script `package.json` no longer has | add the script to the stage that should ask it; a script that is deliberately outside the graph (a dev server, a writer, a report, a suite needing a browser or the live database) is declared in `tools/verify-script-exemptions.json` with what it is instead — one line per decision, not a `check:*` prefix a new gate would inherit — and wiring it later means deleting that line; the same guard reads the `tools/` file a script calls, so a tool no script, workflow or import reaches fails unless `tools/tool-reach-exemptions.json` says what it is instead |
| `check:init-order-wiring` | `verify:contract` | a build-stage gate going quiet — every gate in `BUILD_GATES` (`check:init-order`, `check:published-surface`) missing from the script map, from `verify:build`, or from the CI `build:` job (directly or through a stage whose chain reaches it) | none — restore the line; an unwired gate reports nothing, and the build stays green while its question goes unasked |
| `check:style-drift-baseline` | `verify:visual` | new page-scoped CSS sections beyond the recorded baseline | reviewed exception recorded in `tools/wingman-style-drift-baseline.json` |
| `check:dead-css` | `verify:visual` | an unused CSS selector that is not in `tools/wingman-dead-css-baseline.json`, or a listed selector that is no longer dead | remove the rule (preferred; `npm run audit:dead-css:deletions` proposes the patch); a reviewed baseline update is the exception (`npm run audit:dead-css:baseline`) |
| `check:unstyled-classes` | `verify:visual` | a class name in markup that no stylesheet, inline export `<style>` block or Tailwind utility answers and that is not in `tools/wingman-unstyled-classes-baseline.json`, or a listed class that has gained a style | add the rule or remove the class (preferred); a reviewed baseline update is the exception (`npm run audit:unstyled-classes:baseline`) |
| `check:technical-data` | `verify:data` | governed-profile coverage falling below the recorded baseline | `npm run check:technical-data -- --update-baseline` only when coverage genuinely improved |
| `check:postgrest-reads` | `verify:build` | an unbounded Supabase/PostgREST full-table read in `server/` or `tools/` | none — add `.range()` pagination (see docs/SUPABASE_SETUP.md) |
| `check:export-validation-domains` | `verify:contract` | a registered export-validation domain (`EXPORT_VALIDATION_DOMAINS` in `proposalExportValidation.ts`) that no test proves by reading `.domain` off an entry the check produced, a check whose domain is not registered, a registered domain no check produces, or an allowance entry a test has since covered | add the test (preferred); a domain that genuinely cannot be proven yet is recorded with its reason in `tools/wingman-export-validation-domains.json`, and the gate refuses that entry once a test covers it |
| `check:stored-records` | `verify:contract` | a field on a persisted record that nothing in the app reads — the record is every type reachable from a `setItem(key, JSON.stringify(value))` write, a `Record<string, unknown>` field is policed as the shape the codec reading it decodes into, and a field counts as read only when the compiler resolves a property access to it or shipped source names it in an access position — or a baseline entry that has gained a reader | give the field a reader or remove it (the codecs are allow-lists, so no migration is needed); a reviewed baseline update is the exception (`npm run audit:stored-records:baseline`) |
| `check:proposal-wizard` | `verify:contract` | a marker the proposal wizard's contract depends on missing from the file that must hold it: the five step names the entry hands to its split view, `computeProposalReadiness` and the project save the entry calls, the `Export formatted DOCX` / `Open Recommendations` exits, the rep/customer copy split in `proposalCopy.ts`, `CUSTOMER_COPY` in both export builders (with no `REP_COPY` reference or `[complete]`-style authoring prompt reaching them), the DOCX section markers, or the wizard's CSS hooks | none — a failure means the control moved, was renamed or was dropped, so move its assertion to the file that now renders it (the marker lists are per file, and moving a control between the entry and its view means moving its marker with it); the DOCX and CSS markers stay where they are |
| `check:audit-scopes` | `verify:contract` | an audit entry written with a `scope` that `AuditLogPanel`'s `AUDIT_SCOPES` does not list with a label and icon — a trail type that would print its raw stored key | add the scope to `AUDIT_SCOPES` and `SCOPE_CONFIG` in `src/wingman2/components/AuditLogPanel.tsx` (the typecheck asks for both); there is no allowance file |
| `check:pr-description` | `PR description` workflow | a description that reports failing checks the head no longer has, or lists open work this pull request has already done | none — edit the description (the workflow reruns on the edit), or annotate a genuinely open item with `<!-- keep-outstanding: reason -->` |
| `check:fixture-sku-lifecycle` | `verify:contract` | a test fixture or sample BOM quoting a discontinued or do-not-spec SKU as then-current equipment (a `sku` inside an object literal that also carries `qty`, `quantity`, `description` or `role`) | replace it with the active successor; an entry in `tools/wingman-fixture-sku-allowlist.json` covers a fixture that exists to prove retirement behaviour, and the gate fails an entry whose row no longer quotes that SKU |

Everything below expands the non-obvious rows a dependency or data edit will
actually hit. "None" under exception path means the fix is to make the data
consistent, not to widen the gate.

## Reference-resolution guards (a data edit's first stop)

`npm run check:data-sources` is one script that runs five tools; the three
reference guards are:

- **`tools/check-lifecycle-successor-refs.mjs`** — every `successor` value in
  `data-sources/wyrestorm/lifecycle.csv` must name a CURRENT, ACTIVE SKU
  (present in the lifecycle table, not discontinued/do-not-spec, not the row's
  own SKU). A remap to a discontinued product would steer a quoting rep at a
  product that cannot be quoted.
- **`tools/check-closest-wyrestorm-refs.mjs`** — competitor rows'
  `closest_wyrestorm_sku_or_family` must resolve to a current active product.
- **`tools/check-closest-wyrestorm-arch-refs.mjs`** — competitor rows'
  `closest_wyrestorm_architecture` prose may only reference WyreStorm
  architecture families that still sell (`ProductFamilyPage` familyGuides'
  current generations with active lifecycle SKUs); an embedded retired SKU
  token fails too.

All three are hard rules with **no exception mechanism**: the fix is editing
the CSV/prose so the reference resolves to an active product, then running
`npm run data:sources:build` to regenerate the canonical outputs and manifest.

## Fixture lifecycle gate (what a test may quote as equipment)

`npm run check:fixture-sku-lifecycle` asks the same lifecycle question about the
test fixtures and sample BOMs that the template gate asks about customer-facing
room templates. An equipment line is an object literal carrying a `sku` and at
least one equipment field (`qty`, `quantity`, `description`, `role`) in any file
under `src/`, `e2e/` or `server/` that is a `*.test.*`/`*.spec.*` file or lives
under a `fixtures` directory. A bare mention such as
`expect(sku).toBe("SYN-TOUCH10")` is not a line: naming a retired SKU to prove
the app rejects or remaps it is what those tests are for.

Statuses resolve through `tools/lib/sku-lifecycle.mjs` (shared with
`check-template-sku-lifecycle` and `check-lifecycle-successor-refs`), so a
fixture quoting a `review` placeholder that the app serves through its `-V2`
form is judged by the active row rather than blocked.

`tools/wingman-fixture-sku-allowlist.json` is the only exception path, and it is
for retirement coverage: a fixture whose subject is the retirement itself (a
selector that must drop the old panel, an export gate that must block a dead
SKU). Each entry names the file, the SKU and the behaviour it proves, and the
gate fails any entry the fixture no longer needs, so the list only shrinks.

## Generated-manifest drift gates

Two gates keep the tracked generated manifests honest, because a manifest that
records only hashes (or no hashes at all) can be committed stale:

- **`data:sources:check`** (in `verify:build`) re-reads the current sources and
  fails when `data/catalog/product-data-manifest.generated.json` carries a
  stale sha256 or a missing/extra source. A source edit without a rebuild is
  the classic failure — fix by running `npm run data:sources:build`.
- **`check:generated-manifests`** (in `verify:data`) additionally regenerates
  `data/catalog/product-technology-profiles.generated.json` in memory and
  byte-compares the records — this blob carries no embedded hashes, so only
  regeneration can reveal drift. Fix by running
  `node tools/audit-product-technology-normalization.mjs` and committing both
  the regenerated manifest and its governance audit file.

The regeneration logic is deterministic by contract
(`tools/lib/product-technology-profiles.mjs`); if either gate goes red, the
committed manifest and the committed sources disagree — never "fix" a red run
by hand-editing hashes.

## Dependency gates

### `check:build-deps` / `check:build-deps:server` (verify:build)

Audits the **build-time transitive closure** (root manifest's
devDependencies; the `server/` lock's runtime closure) against the OSV
advisory database — the surface `npm audit` does not cover on its own terms.
A dependency edit that pulls an OSV-open advisory into the installed tree goes
red here.

Exceptions live in `tools/build-dep-exceptions.json`, one entry per advisory,
each with a written justification and an **expiry**. The check fails when an
exception expires — and already 14 days before it does — so renewals happen
ahead of the deadline, never because of a red build. Adding a dependency is
fine; silencing a finding without assessing it is not.

### `check:override-floors` (verify:build + pre-commit fast lane)

The `overrides` block in `package.json` (and `server/package.json`) pins
advisory floors (browserslist ^4.28.8, postcss-selector-parser ^6.1.4,
fast-uri ^3.1.7; `qs` ^6.16.0 in the server manifest). The gate fails if a
floor is **removed or lowered**, if the committed lockfile still records a
version under the floor, or if an override is added without a floor row
claiming it. `npm install` never removes an override, but a hand edit or a
resolve-from-scratch lockfile regeneration can — hence the pre-commit fast
lane that runs this gate whenever a commit stages `package.json` /
`package-lock.json`.

A floor may only be **raised** (or a new floor added) with an advisory-driven
rationale in the change — never to make a red build green.

## Governance-data gate

`check:governance-data` (verify:data) validates the three governance reference
files against `lifecycle.csv`:

1. every governed technical-profile SKU resolves to a lifecycle row (orphaned
   profiles never attach to a product);
2. `wyrestorm-product-role-overrides.json`: default catalog visibility is only
   legal for active/review lifecycle statuses;
3. `wingman-product-role-overrides.json`: recommendation eligibility requires
   an active/review match (or a family prefix with active members);
4. `wingman-product-suppression-list.json` must not suppress a lifecycle-active
   SKU;
5. governed profiles carry no bare-constant or placeholder `verifiedBy` — a
   confirmation is attributed to the reviewer of record's full, byte-consistent
   name (the 2026-08-16 "Steve" → "Steve Goodwin" re-signature is the
   regression class; rule in `tools/lib/reviewer-attribution.mjs`).

No exception path — reconcile the governance JSON with lifecycle, then re-run
the gate (and `check:generated-manifests`, since governed profiles feed the
technology-profiles materialisation).

## Pull request description gate

`npm run check:pr-description` — the `PR description` workflow
(`.github/workflows/pr-description.yml`), not a `verify` stage, because it reads
GitHub's check runs and changed files — fails a pull request whose description
no longer describes the branch it is attached to. The workflow triggers on
`edited` as well as pushes, since editing the body is the fix, and it is small
enough that a sentence change does not re-run the verify matrix.

Two claims are checked and nothing else:

- **A failure claim** (`still failing`, `checks are red`, `not passing`, a
  count of failing checks) is stale once every completed check run on the head
  passes and at least one of them ran. Runs still in flight are ignored — this
  gate is one of them — and a head with nothing completed yet is not judged. A
  line about a previous run ("failed before this change", "used to fail", "no
  failing tests"), a fenced log block or a quoted line is not a claim.
- **An outstanding claim** — an unticked `- [ ]` box, a bullet under a
  `Remaining` / `Still to do` / `TODO` heading, or a line saying the work
  "still needs" doing — is stale when the branch has closed it: the item names
  a file this pull request adds or changes (a bare filename counts only when
  exactly one changed file carries it), or the item is a checklist box on a
  non-draft pull request whose latest checks pass. Prose about work that lands
  in a later pull request is left alone, because it names no file the branch
  touched.

There is no allowlist file. A genuinely open item is kept by annotating its own
line, or the heading above it, with `<!-- keep-outstanding: reason -->`; a
description that deliberately reports another branch's state opts out with
`<!-- pr-description: skip -->`. Both markers travel with the description, so
the reason sits beside the item a reviewer is pointed at.

The gate never guesses about a read it could not perform: a fork pull request
or an API failure skips with a note instead of blocking a merge, while an
unreadable token fails loudly rather than passing silently.

## Bundling gate

`check:init-order` (verify:build, and its own step in the CI `Build` job) asks
the bundler whether a page load can run a module-scope read before the chunk it
takes from. It **builds the app in memory** with `vite.config.ts` — the chunk
groups are the thing under test, so they have to be the groups that ship — and
then reads the emitted chunks: which module-scope reads of an imported binding
survive the tree-shake, which chunk each takes its binding from, and what kind
of binding that is.

Why the emitted code rather than the sources: a statement the bundler dropped
cannot fail, and the statement that does run is written in the names the chunk
imports. The build is asked for source maps so a failure names the file and line
a person opens; maps change neither the chunking nor the evaluation order.

The question is asked **once per entry load** (the app's own boot plus every
dynamic entry chunk), because the same cycle is safe or fatal depending on where
it is entered: a chunk that reads a binding out of a chunk the entry reached
*through* can only run after it, which is why the palette crash appeared on one
route and not on the pages that load the same two chunks in the other order.

One thing is initialized before any chunk body runs: a **function declaration**,
which ESM hoists and initializes at instantiation. `var` is `undefined` until
the exporting chunk evaluates and `let`/`const`/`class` are in the temporal dead
zone, so only those are failures; a binding the scan cannot find is treated as
uninitialized, because a scan that cannot see a declaration is not evidence that
it is safe. There is no allowance file: the fix is to read the binding where it
is used, or to move the reader out of the cycle.

The gate rests on `includeDependenciesRecursively: false` in `vite.config.ts`:
with the dependency walk on, one chunk group takes another's whole closure and
these cycles mostly cannot form. A reordering that stops reporting anything is
therefore worth a look before it is believed.

`check:init-order-wiring` (`verify:contract`) guards the gates' own wiring, and
it lives outside them and outside the stage they are in: a self-check inside
`check:init-order` cannot report its own removal, and one inside `verify:build`
disappears with the line it protects. It holds one list, `BUILD_GATES`, of the
gates `verify:build` is trusted for — `check:init-order` and
`check:published-surface` — and for each one reads `package.json` through
`expandVerifyChain` (`verify:build` still reaches it) and the `build:` job out of
`.github/workflows/ci.yml` (the job invokes it, by name or through a script whose
chain reaches it, which is what keeps a job that runs `npm run verify:build`
covered). Both halves of a stage-name invocation are pinned per gate: dropping a
gate from `verify:build` while the job still runs the stage fails both readings
for that gate, and the other gate's readings stay green. Each entry carries what
its gate answers and why it belongs in the stage, so a failure names the question
that stopped being asked; a gate whose script is gone is reported once, since the
stage and job readings would restate the deletion.

## CI stage gate

`check:ci-verify-stage` guards the CI `Verify (data / contract / visual)` job,
which is where most of the other rows in this table run. Deleting the job, or
dropping a stage from its matrix, is the one regression no guard inside those
stages can report: their runners go with them, and every remaining job stays
green while the questions stop being asked. That is why this one is wired into
`verify:fast` — the pre-commit hook, and the same lane run twice in CI's
`Pre-commit lane ×2` job — rather than into the stage it inspects.

It reads `.github/workflows/ci.yml` and asserts the job still exists, that its
stage matrix names `data`, `contract` and `visual`, and that some step actually
runs `verify:<stage>` for each: by name, or through a script whose chain reaches
it. The matrix placeholder is substituted per stage, so the job's single run
step — its stage taken from `${{ matrix.stage }}` — covers all three readings; a
matrix entry with no step fails for that stage, and a matrix stage with no
matching `verify:` script in `package.json` fails too. Both YAML matrix shapes
(the flow list the job uses and a block list) are read, so reformatting the
list is not read as a job that runs nothing.

It also reads the job's own `if:`, because a condition is the other way to keep
the job written while stopping it from running: `if: false` is never true, and a
condition on a repository variable nobody sets skips the whole gating stage
without a single red job. A job-level `if:` this guard cannot prove true is
reported with its own text, and only the expressions that restate the job's
default — an empty value, `true`, `always()`, in or out of `${{ }}` — are
accepted; a step's `if:` sits deeper and is left alone, since it decides one step
rather than whether the job is scheduled. Both YAML shapes (inline and a `|`/`>`
block) are read here too.

The report says the job **may be skipped**, not that it never runs. The condition
is decided by the repository and the run — a variable that is set today runs the
job today — and this guard reads the workflow text, so only a condition that is
false whatever the event is (`if: false` and its ilk) is called never true.

## Strict-chain gate

`verify:strict` composes `verify:build:strict`, `verify:data:strict` and
`verify:contract:strict` **in place of** the normal stages, and runs
`verify:visual` unchanged. It does not run `verify:contract` on the way, so a
gate that exists only in the normal chain is not duplicated in a strict run — it
is missing from it, and the run stays green while the deeper question goes
unasked.

`check:strict-verify-chains` (in `verify:fast`) holds three facts:

- every gate `verify:<stage>` reaches is also reached by `verify:<stage>:strict`,
  for the `build`, `data` and `contract` pairs — including gates reached one
  script deeper, since a nested gate is still asked by the stage, and including
  the tools the stage calls with `node` on its own line, which no comparison of
  script names can see (a tool is read by its file, so deeper flags are the same
  gate). Nothing is exempt: the data stage's revision notice is
  `notice:data-revision`, a script both data stages run — its copy says where the
  paused suites are (`npm run test:catalogue`) rather than naming a lane, since a
  notice printed by both lanes has no single one to point at;
- `verify:strict` composes each strict twin, so a whole category cannot be
  dropped from the lane with one deleted line;
- `verify:visual`, which has no deeper twin, still runs there.

Its first run found seven contract gates the strict lane had never asked —
`check:compare-core`, `check:discovery-locators`,
`check:export-validation-domains`, `check:proposal-wizard`, `check:audit-scopes`,
`check:init-order-wiring` and `check:stored-records` — and they were added to
`verify:contract:strict` rather than allowed. The build and data pairs already
satisfied the rule; `verify:build:strict` is the build chain plus nothing, and
`verify:data:strict` is a superset of `verify:data`'s npm scripts.

## Script coverage gate

`npm run verify` and `npm run verify:strict` are the two ways this repo asks its
questions, and a gate is a gate only while one of them reaches it. The quiet
failure is not a red build: it is a script that was added, renamed or moved out
of a stage while every remaining check stayed green. A rename is the commoner
shape — point `check:stored-records` at a new name and either the old `npm run`
line outlives the script (npm fails on it, which is the loud half) or it goes
with the rename, and nothing fails at all.

`check:verify-script-coverage` (in `verify:fast`, so on the commit that adds the
script) reads the whole graph rather than one gate. Every script in
`package.json` is reached from `verify` or `verify:strict` through the `npm run`
chains, or declared in `tools/verify-script-exemptions.json` with what it is
instead. Both roots are read because `verify:strict` runs the strict twins *in
place of* the normal stages, so a gate hanging off a normal stage alone is a gate
a strict run never asks — the same asymmetry `check:strict-verify-chains` guards
one level down.

The declarations ratchet in both directions, like this repo's other baselines. A
declared script that a stage now reaches fails, because the entry says a gate is
unrun while the pipeline runs it; an entry naming a script `package.json` no
longer has fails, because that is the rename itself — the new name is orphaned in
one reading and still excused under the old one in the other, and the two lines
have to move together. Declarations are per script with a reason rather than a
prefix, since a `check:*` exemption is exactly what a new gate would inherit
without anyone deciding it.

The same guard asks the same question one level down, where the failure is
cheaper to make and quieter to keep: a script is wired into a stage and the tool
it calls is the thing nobody else names. Deleting the `npm run` line that used to
call a tool leaves the file on disk and the tree green, because nothing fails on a
file that is merely not executed. So a tool under `tools/` is reached by a script
name, a workflow, an import position, or a root config naming it — `globalSetup`
in `vitest.config.ts` is a call site the import rule cannot see — and anything
else is declared in `tools/tool-reach-exemptions.json` with what it is instead.
Import position rather than mention, because a sentence telling a reviewer to run
a tool is not a caller; and a spec naming a tool is the guard's subject rather
than its caller, so a helper its own spec imports is declared as one. The same
two ratchets apply: a declared tool that something starts calling fails, and a
declaration for a file that is gone fails.

The honest answer is usually the first one: a gate goes in the stage that should
ask it. A declaration is for a script that is not a gate to run on a checkout — a
dev server, a writer that moves the baseline a gate compares, a read-only report,
a suite that needs a browser and a served build, a check whose subject is a
deployed database or a third party's page. One group of ten `check:` scripts is
declared that way today because nothing yet decides when they should run; that
group is a queue to work through, and adding one to a stage means deleting its
line.

## Ratchet gates and where exceptions are recorded

`check:size-budgets`, `check:style-drift-baseline`, and
`check:technical-data`'s coverage floor are **ratchets**: they forbid
regression and only move one way under review. The exception discipline for
all of them — what may be raised, what the PR must state, and every approved
exception so far — is documented in [`docs/SIZE_BUDGETS.md`](SIZE_BUDGETS.md).
New page CSS, bundle growth, and coverage-floor changes go there first.

`check:architecture-boundaries` keeps new files on the strict 1,200-line
production and 400-line page limits. Existing migration entries receive 2%
headroom capped at 25 lines, preventing small refactor churn from blocking CI
without permitting substantial growth. New allowlist keys remain rejected.

`check:style-drift-baseline` allows 5% variation for nonzero aggregate metrics.
Metrics whose baseline is zero remain strict so retired visual patterns cannot
return.

`check:dead-css` is an allowlist ratchet with **no tolerance**. Every unused
selector currently accepted in `src/wingman2` CSS is listed in
`tools/wingman-dead-css-baseline.json`. A new dead selector fails the run, and
a baseline entry whose rule has been deleted also fails, so the file cannot
accumulate stale allowances. The fix is to remove the dead rule — or, for
deliberately accepted debt, a reviewed `npm run audit:dead-css:baseline`
regeneration. Detection is shared with `tools/consolidate-dead-class-css.mjs`
(`tools/lib/dead-css.mjs`) and is structural: a selector is dead when every
comma branch contains a compound whose classes are all unused, so a rule scoped
by an ancestor class that is gone still fails while its descendant class isin use, and a dead branch inside a live list is reported on its own. A class
family is treated as runtime-assembled only where source builds a class with
it — a `className=`/`class=`/`classList` position, or a declaration or function
named for classes — so a prefix mentioned in a regex, a comment, a DOM id or a
download filename keeps nothing; known third-party prefixes are always live,
and the baseline file itself is never counted as evidence that a class is used. The allowlist is currently empty; `node
tools/consolidate-dead-class-css.mjs --all --apply` prunes every stylesheet the
gate scans.

The pre-commit hook runs `npm run autofix:dead-css` before this gate. The
autofix splits a mixed selector list (`.a, .b` becomes `.b`, with the live
declaration block copied byte-for-byte) but never removes a rule whose every
branch is dead — deleting styling stays a person's decision. Its baseline
refresh (`--prune-stale` on the gate) drops only the allowances the split just
invalidated and never adopts a newly dead selector, so the gate that follows
still blocks new debt. The hook stages exactly the files the autofix reports,
so an unrelated working-tree edit stays unstaged.

Fully dead rules can be removed as a reviewed patch instead of by hand.
`npm run audit:dead-css:deletions` writes
`reports/dead-css-proposal.diff` (and prints it) with the same stylesheet set
the gate scans, including the baseline allowances the deletions retire;
`npm run apply:dead-css:deletions` applies that exact change and re-runs the
gate; it refuses when the patch is missing or no longer matches the tree, so a
rule is never deleted off an unreviewed list. The patch is an ordinary
`a/`…`b/` unified diff, so a committer can also
`git apply` the hunks they want and then re-run `npm run autofix:dead-css` to
prune the allowances those deletions retired. The default `autofix:dead-css`
run still never deletes a rule.

`check:unstyled-classes` is the inverse ratchet and keeps the same discipline.
Both sides are read from `src/wingman2`: a class passes when a project
stylesheet declares it, when a `<style>` block inside an export builder styles
the document it generates, or when the Tailwind compiler generates a rule for
it — utilities are decided by compiling them, so there is no second class
vocabulary to maintain. `group`/`peer` markers pass as behaviour hooks. Names
assembled at runtime (`wm-card--${tone}`) and class names asserted in test
files are out of scope, since neither ships as a literal class. Accepted
entries live in `tools/wingman-unstyled-classes-baseline.json`: a new unstyled
class fails, and an entry that has gained a style also fails, so the file
cannot keep stale allowances. Clear entries by adding the rule or removing the
class, then regenerate with `npm run audit:unstyled-classes:baseline`.
Detection lives in `tools/lib/unstyled-classes.mjs`.

`npm run report:dead-css-triage` is the reading step between "a family is
dead" and deleting it. It groups every unmatchable selector by class family
(the text up to a class name's first hyphen) and prints the evidence the gate
used: the rule text that is dead, the assembled fragments source actually
builds with that prefix, and the places the prefix is merely mentioned (a
regex, a DOM id, a download filename, a comment). A family with no evidence is
marked safe to remove; one with any is marked for review, because a mention is
exactly what a person has to read before deleting. Mentions are probed at each
dead name's longest hyphen prefix, with near matches first, so a live sibling
does not bury the place that matters. It writes `reports/dead-css-triage.md`
and `.json`, reads `tools/lib/dead-css.mjs` rather than re-deriving the rule,
and always exits 0 — it reports, the gate decides.

The report's other half is the same scan inverted: every accepted assembly
fragment, with the class names no literal source writes and the selectors no
literal source keeps. That is what an exemption buys, so a reader can check the
builder that justifies it instead of trusting a filename's absence from the dead
list; a fragment no live rule needs is marked `unused`, which is the exemption
to narrow. A selector is credited only when every class in it comes from
assembly — a literal sibling already keeps it — and `assembledFragmentFor`
decides which fragment supplies a class, so the report and the gate cannot
disagree about the keeper.

`npm run report:css-coverage` supplies the evidence both CSS gates act on. It
loads every route in `src/wingman2/app/route-manifest.json` in Chromium at a
desktop and a phone viewport, reads the renderer's rule-usage report, and
writes `reports/css-coverage.md` plus the full `reports/css-coverage.json`. A
rule is listed when no measured load matched it, which is the candidate list a
`check:dead-css` cleanup starts from; `:hover`/`:focus` rules are split out as
interaction-only because a static load never triggers them, and rules the
Tailwind expansion produced are marked `(generated)`. The report needs a dev
server on port 3000 and is not part of the verify chain — it measures, the
gates enforce.
