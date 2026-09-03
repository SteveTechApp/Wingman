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
| `check:build-deps` / `check:build-deps:server` | `verify:build` | an OSV-open advisory in the build-time transitive closure (root and `server/` locks) | reviewed, **time-limited** exception in `tools/build-dep-exceptions.json` |
| `check:override-floors` | `verify:build` + pre-commit fast lane | removing/lowering a load-bearing `overrides` floor or adding an unclaimed override | reviewed raise of the floor row inside the tool (advisory-driven only) |
| `check:size-budgets` | `verify:build` | a tracked artefact growing past its recorded byte limit | reviewed exception recorded in `tools/wingman-size-budgets.json` (see SIZE_BUDGETS.md) |
| `check:style-drift-baseline` | `verify:visual` | new page-scoped CSS sections beyond the recorded baseline | reviewed exception recorded in `tools/wingman-style-drift-baseline.json` |
| `check:technical-data` | `verify:data` | governed-profile coverage falling below the recorded baseline | `npm run check:technical-data -- --update-baseline` only when coverage genuinely improved |
| `check:postgrest-reads` | `verify:build` | an unbounded Supabase/PostgREST full-table read in `server/` or `tools/` | none — add `.range()` pagination (see docs/SUPABASE_SETUP.md) |

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
   SKU.

No exception path — reconcile the governance JSON with lifecycle, then re-run
the gate (and `check:generated-manifests`, since governed profiles feed the
technology-profiles materialisation).

## Ratchet gates and where exceptions are recorded

`check:size-budgets`, `check:style-drift-baseline`, and
`check:technical-data`'s coverage floor are **ratchets**: they forbid
regression and only move one way under review. The exception discipline for
all of them — what may be raised, what the PR must state, and every approved
exception so far — is documented in [`docs/SIZE_BUDGETS.md`](SIZE_BUDGETS.md).
New page CSS, bundle growth, and coverage-floor changes go there first.
