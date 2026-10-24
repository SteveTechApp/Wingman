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
| `check:prod-unpatched` | CI Dependency Audit job | a PRODUCTION dependency (root and `server/` runtime scope) running an advisory with no available fix, or a denylisted package at any severity — the class that let moderate sprintf-js through to main | none — remove the dependency or the dependency path that reaches it; the denylist lives in `PRODUCTION_DENYLIST` inside `tools/check-prod-unpatched.mjs` |
| `check:override-floors` | `verify:build` + pre-commit fast lane | removing/lowering a load-bearing `overrides` floor or adding an unclaimed override | reviewed raise of the floor row inside the tool (advisory-driven only) |
| `check:size-budgets` | `verify:build` | a tracked artefact growing past its recorded byte limit | reviewed exception recorded in `tools/wingman-size-budgets.json` (see SIZE_BUDGETS.md) |
| `check:architecture-boundaries` | `verify:build` and CI Build | a new/growing oversized TS module or page, or a private cross-boundary feature import | none — split the module, shrink existing debt, or import a feature's public API |
| `check:style-drift-baseline` | `verify:visual` | new page-scoped CSS sections beyond the recorded baseline | reviewed exception recorded in `tools/wingman-style-drift-baseline.json` |
| `check:dead-css` | `verify:visual` | an unused CSS selector that is not in `tools/wingman-dead-css-baseline.json`, or a listed selector that is no longer dead | remove the rule (preferred; `npm run audit:dead-css:deletions` proposes the patch); a reviewed baseline update is the exception (`npm run audit:dead-css:baseline`) |
| `check:unstyled-classes` | `verify:visual` | a class name in markup that no stylesheet, inline export `<style>` block or Tailwind utility answers and that is not in `tools/wingman-unstyled-classes-baseline.json`, or a listed class that has gained a style | add the rule or remove the class (preferred); a reviewed baseline update is the exception (`npm run audit:unstyled-classes:baseline`) |
| `check:technical-data` | `verify:data` | governed-profile coverage falling below the recorded baseline | `npm run check:technical-data -- --update-baseline` only when coverage genuinely improved |
| `check:postgrest-reads` | `verify:build` | an unbounded Supabase/PostgREST full-table read in `server/` or `tools/` | none — add `.range()` pagination (see docs/SUPABASE_SETUP.md) |
| `check:export-validation-domains` | `verify:contract` | a registered export-validation domain (`EXPORT_VALIDATION_DOMAINS` in `proposalExportValidation.ts`) that no test proves by reading `.domain` off an entry the check produced, a check whose domain is not registered, a registered domain no check produces, or an allowance entry a test has since covered | add the test (preferred); a domain that genuinely cannot be proven yet is recorded with its reason in `tools/wingman-export-validation-domains.json`, and the gate refuses that entry once a test covers it |
| `check:audit-scopes` | `verify:contract` | an audit entry written with a `scope` that `AuditLogPanel`'s `AUDIT_SCOPES` does not list with a label and icon — a trail type that would print its raw stored key | add the scope to `AUDIT_SCOPES` and `SCOPE_CONFIG` in `src/wingman2/components/AuditLogPanel.tsx` (the typecheck asks for both); there is no allowance file |
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
