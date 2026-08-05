# Wingman Size Budgets

A ratchet that stops the frontend bundle and the largest source files from
growing while the incremental refactoring programme reduces them. It does **not**
demand improvement — it only forbids regression. Existing debt is allowed to sit
at its recorded limit; any change that grows a tracked artefact past that limit
fails the build with an actionable message.

- **Definitions (what and how to measure):** `tools/lib/wingman-size-budgets.mjs`
- **CLI runner:** `tools/check-size-budgets.mjs`
- **Recorded limits (the numbers):** `tools/wingman-size-budgets.json`
- **Unit tests:** `tools/lib/wingman-size-budgets.test.mjs`

## Why the budgets exist

Wingman ships a Compare engine chunk over 1 MB, a competitor registry near
700 KB, and page components thousands of lines long. The refactor shrinks these,
but nothing prevents them from quietly re-inflating between pull requests. The
ratchet makes any growth visible and blocking, so a reviewer sees it before it
merges rather than discovering it months later.

## What is measured

| Budget id | Artefact | Kind |
|---|---|---|
| `chunk:compare-engine` | `wm-compare-engine-*.js` production chunk | emitted JS |
| `chunk:competitor-registry` | `wm-competitor-registry-*.js` production chunk | emitted JS |
| `chunk:project-workflow` | `wm-project-workflow-*.js` production chunk | emitted JS |
| `total:js` | every emitted `.js` file | emitted JS |
| `total:css` | every emitted `.css` file | emitted CSS |
| `source:compare-advanced` | `src/wingman2/pages/ComparePageNew.advanced.tsx` | source file |
| `source:discovery-page` | `src/wingman2/pages/DiscoveryPage.tsx` | source file |
| `source:product-call-cards` | `src/wingman2/pages/ProductCallCardsPage.tsx` | source file |
| `source:project-detail` | `src/wingman2/pages/ProjectDetailPage.tsx` | source file |
| `source:style-stack-css` | `src/wingman2/styles/wingman-style-stack.css` | source file |

Production chunks are matched by their **stable named-group prefix** (from
`vite.config.ts`), not by the hashed filename, so a new build hash never breaks
the check. Sizes are raw (unminified-on-disk) bytes — the same number the build
reporter prints — reported in KB.

### Tolerance

`tolerancePct` in the baseline JSON (default `1`) widens each limit slightly so
trivial, environment-dependent minification noise between a local machine and CI
does not fail a build. A real regression clears the tolerance; a rounding wobble
does not.

## Running it

```
npm run check:size-budgets     # enforce — used by CI and by `npm run verify`
npm run audit:size-budgets      # report only, never fails (local inspection)
```

Both need a build present (`npm run build` first); `check:size-budgets` runs
automatically as part of `npm run verify` (inside `verify:build`) and as a
dedicated step in the CI `build` job after the application is built.

## Updating the budgets

The limits are meant to travel **downward**.

- **Lowering a limit** (the normal case): after a PR removes weight from a
  tracked artefact, lower its number in `tools/wingman-size-budgets.json` to the
  new measured value so the reduction is locked in. Do this by hand for a single
  artefact, or regenerate every limit from a fresh build:

  ```
  npm run build
  node tools/check-size-budgets.mjs --update-baseline
  ```

  Regenerating rewrites **all** limits to the current build — only commit the
  reductions you intend; never let it silently raise a limit.

- **Raising a limit** (the exception): only when a deliberate, reviewed decision
  adds weight that cannot reasonably be avoided (for example a required feature
  with no lighter option). A limit increase must:
  1. be its own clearly-described change, not smuggled into unrelated work;
  2. state in the PR description *why* the growth is unavoidable and what was
     tried to avoid it;
  3. be reviewed as an explicit exception — the reviewer is approving the
     regression, not just the feature.

Never raise a limit merely to make a red build green. That defeats the ratchet.

## Adding a new tracked artefact

Add an entry to `TRACKED_ENTRIES` in `tools/lib/wingman-size-budgets.mjs`
(with a stable `id`, `label`, and `remediation`), then record its limit:

```
npm run build
node tools/check-size-budgets.mjs --update-baseline
```

A tracked entry with no recorded limit fails the check rather than passing
silently, so a new artefact cannot slip through unbudgeted.
