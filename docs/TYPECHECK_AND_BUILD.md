# Typecheck, tests and chunk init order

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

## Typecheck & tests

- Tailwind v4 runs through `@tailwindcss/vite`. A nested worktree can discover
  an ancestor's untracked `postcss.config.js` containing the retired v3
  `tailwindcss` PostCSS plugin. Keep Vite's inline empty PostCSS configuration
  to stop that search; do not revive the relic or use it to configure v4.
  API and HTML responses can succeed while CSS compilation fails: the dev-pair
  health check must fetch the layout CSS route with `?direct`.
- Capture-region IDs use `discovery-<region>` (for example
  `discovery-essential-capture`, `discovery-expert-builder`, and
  `discovery-room-wizard`). Actions use `discovery-<verb>-<object>`; repeated
  choices append stable model IDs, never display labels. Browser walkthroughs
  use these test IDs; copy assertions belong in dedicated content tests.

- `tsc --noEmit` with the default `tsconfig.json` only checks the import
  closure of `src/main.tsx`, so it is a false green for everything it does not
  reach. The real gate is `npx tsc --noEmit -p tsconfig.typecheck.json` (all of
  `wingman2/**`, strict).
  The two configs must agree about `noImplicitAny`, because the editor reads the
  default one while CI reads the gate: the gate carried
  `"noImplicitAny": false` until the 34 errors it hid were fixed, so the config
  every developer's editor trusts was red while the gate was green. Those 34
  were one untyped values bag, not 34 mistakes — `ProposalCompletionWizardView`
  takes `Record<string, any>`, so the field components it renders and every
  callback it hands to a bag value were `any`, and each callback parameter
  became an implicit `any` (33 sites) — plus one `string` index into
  `Partial<Record<SchematicTransportKind, number>>` in
  `schematicConstraintValidator.ts`, now read through a membership-checked
  lookup. The view imports `InputField`/`TextAreaField` from
  `ProposalWizardFields` instead of receiving them as values, and names a type at
  each callback it passes to a bag value (`SalesReadinessPackage["assurance"]
  ["blockers"][number]`, `InstallationSchedule["lines"][number]`,
  `ExportValidationResult["blockers"][number]`, `ProposalWizardDraft`,
  `number`), which is checked at the use site even though the bag is not. The
  bag itself is still worth closing — a new read from it is unchecked until
  someone names a type at the site that uses it — but the waiver is what made
  that invisible, so do not put it back to silence a new error.
- Server tests (`server/**/*.test.mjs`) import `@vitest/runner` and MUST run
  via `npx vitest run server/...`. Raw `node --test` on them fails with
  "Cannot read properties of undefined (reading 'config')" — misleading;
  it is a harness mismatch, not a test failure.
- To exercise authenticated API branches end-to-end, boot
  `server/competitor-lookup-server.mjs` from the WORKTREE on a test PORT: the
  file-mode store then writes only to the worktree's gitignored
  `data/runtime/`, keeping main's data clean. Sign up a throwaway workspace
  (`/api/wingman/auth/signup`) and reuse its session cookie.

## Chunk init order

- `check:init-order` (`verify:build`, and its own step in the CI `Build` job)
  asks the bundler whether a page load can run a module-scope read before the
  chunk it takes from. It builds the app **in memory** with `vite.config.ts` —
  the chunk groups are the thing under test, so they have to be the groups that
  ship — and reads the emitted chunks: which module-scope reads of an imported
  binding survive the tree-shake, which chunk each binding comes from, and what
  kind of binding it is. The emitted code and not the sources because a
  statement the bundler dropped cannot fail; an earlier source-level shape of
  this audit was a second model of the bundler and reported reads that no longer
  existed. The build is asked for source maps so a failure names the file and
  line a person opens (`src/wingman2/lib/proposalDocxExport.ts:54:31`), which
  changes neither the chunking nor the evaluation order.
- One thing is initialized before any chunk body runs: a **function declaration**,
  which ESM hoists and initializes at instantiation. `var` is `undefined` until
  the exporting chunk evaluates and `let`/`const`/`class` sit in the temporal dead
  zone. That distinction is the difference between a working app and a false
  alarm: the legacy project store reads `createDesignProjectCommands` into a
  module-scope binding (`projectStore.ts`, in `wm-project-core`, which imports
  `productAssurance` and is imported back by it), and it has always worked — the
  read takes a hoisted function. The palette crash was a `const` table. A binding
  the scan cannot find is treated as uninitialized, so the gate fails closed.
- The question is asked **once per entry load** — the app's own boot plus every
  dynamic entry chunk, labelled with the route address where a page module serves
  one — because the same cycle is safe or fatal depending on where it is entered:
  the reader is only in trouble when the entry reaches it *through* the definer,
  so the palette crash fired on `/wingman/templates/<id>` and not on the pages
  that load those two chunks in the other order. Measured on this tree: 435
  reads, 38 of them taking a hoisted function, 397 checked over 42 entry loads,
  about 3 seconds. It bites (adding a module-scope `SCHEMATIC_COLORS` read to
  `proposalDocxExport.ts` fails it, exit 1, and removing it goes green), and the
  model is pinned without a bundle by `tools/lib/init-order.test.mjs`, which the
  fast lane runs because vitest includes `tools/**/*.test.mjs`.
- The gate rests on `includeDependenciesRecursively: false` in `vite.config.ts`:
  with the dependency walk on, one chunk group takes another's whole closure and
  these cycles mostly cannot form, so a reordering that stops reporting anything
  is worth a look before it is believed. Two traps of the same kind live in the
  tool: `ts.createSourceFile` must be given `setParentNodes: true`, or every
  value-position test sees no parent and the scan reports zero reads and green;
  and `forEachChild` swallows a visitor's exception, so a throw inside the walk
  reads as "no reads here". Both were live bugs whose symptom was a passing run.
- The build stage's gates are guarded from outside them, because these are the
  kind of gates that go quiet without failing: `check:init-order-wiring`
  (`verify:contract`) holds a list, `BUILD_GATES`, of the gates `verify:build` is
  trusted for — `check:init-order` and `check:published-surface` — and fails for
  any of them that leaves `package.json`, stops being reachable from
  `verify:build`, or drops out of the CI `build:` job. The job half is read by
  name or through a script whose chain reaches the gate, so a job running
  `npm run verify:build` is covered while that stage still holds the gate and
  fails beside it when it does not. It lives in contract rather than build
  because a self-check inside the stage it inspects disappears with the line it
  protects, which is also why it is a separate script instead of a clause inside
  the gates. The list is the only place a gate is named, and each entry carries
  what its gate answers and why it belongs in that stage, so the failure names
  the question that stopped being asked rather than only the line to restore; a
  third build-stage gate is an entry, not a second block in the guard. It reads a
  job's `run:` commands in both YAML shapes (inline and `run: |`), so moving the
  step into a multi-line block does not read as a job that runs nothing.
  Dropping `check:published-surface` from `verify:build` fails with "package.json
  `verify:build` does not include `check:published-surface` … the gate reads the
  artifacts the build just wrote, and everything in that directory is readable by
  anyone who asks for it", and removing only its CI step fails with the `build`
  job sentence while `check:init-order` stays green in the same run — which is
  what the list buys: one gate's removal is reported, not the whole stage's. A
  gate whose script is gone is reported once, because the stage and job readings
  would only restate the deletion, and the stage and the job themselves are
  reported once each since they hold every gate.
