# AGENTS.md

Durable, non-obvious knowledge for working in this repo. Facts recoverable
from the code or docs are not repeated here.

## Worktree & dev workflow

- File tools resolve paths from the thread worktree (`.freebuff/worktrees/<id>/`);
  main-checkout paths error as "file does not exist". Edit in the worktree,
  then `cp` changed files to the main checkout (`C:/Users/steve/wingman`) and
  keep both byte-identical. Copying main→worktree after an edit silently
  discards the edit — diff the two files after any sync. The file tool also
  resolves `/tmp/...` to `C:\tmp\` on this Windows setup.
- Git Bash `kill` cannot terminate Windows-native node processes: the old
  server survives, the new one hits EADDRINUSE, and curl keeps hitting the
  STALE code — verification silently passes against old behavior. Kill with
  `powershell -Command "Stop-Process -Id <pid> -Force"` and confirm the port
  freed via netstat.
- `npm run dev` (via `tools/start-wingman-dev.mjs`) starts BOTH the UI (3000)
  and the API (8787) and aborts entirely if 8787 is already bound. The
  competitor-lookup server (`server/competitor-lookup-server.mjs`) often holds
  8787 already — to serve just the UI run `node node_modules/vite/bin/vite.js`
  from the main checkout.
- The local dev sign-in is scripted: `npm run check:dev-pair-sync` attaches to a
  running pair, clicks Settings → Workspace → `workspace-local-dev-sign-in` in a
  throwaway browser context and fails unless the Projects chip reads a synced
  workspace, so nothing is signed in on the developer's own browser. Loading any
  page seeds the starter examples into the legacy project store
  (`wingman-project-store-v1`) with the moment the page read them, and the
  sign-in migrates that store into the new workspace scope. A sample is not an
  edit: `isUntouchedStarterExample` in `data/projectHydrationMerge.ts` takes the
  workspace copy of a demo the browser has only ever held untouched sample text
  for, without a conflict, so a page-load stamp cannot outrank it; a sample
  someone renamed or put work into keeps the normal per-lane policy and still
  reports the change. The check drops that one legacy key before signing in so
  the scope starts empty, the way a rep's second machine does. A rename of the
  key only makes the drop a no-op: the run then reads the samples it migrated.
  `check:e2e-smoke` runs it against the pair that harness boots, so the merge is
  gated on every PR instead of checked when someone remembers to start a pair;
  run the script alone only when debugging it against your own `npm run dev`.
- On Windows, start preview servers with the PowerShell `Start-Process`
  recipe and stdout/stderr to DIFFERENT log files. `register_preview` with
  `replace: true` stops the previously registered server first.
- When a preview screenshot fails with "produced no frames" or the webview
  detaches, DOM-level verification via `preview_evaluate` still works — use it
  as the fallback instead of assuming the page is broken.

## Project store

- `createProjectLifecycleCommands`
  (`src/wingman2/features/projects/commands/projectLifecycle.ts`) returns the
  four ways a project is written, and each makes a different promise about the
  gallery order and about what the rep is reading. `replaceStoredProject`
  rewrites the row where it sits (a project this browser has not stored joins
  the end) and leaves `activeProjectId` alone, so an approval arriving from the
  queue cannot take the rep off their own project. `upsertStoredProject` is a
  save from the project itself — the rep choosing it — so the row goes to the
  front and becomes the active project: the one case where order and reading
  change together. `updateStoredProject` is an edit, so the row keeps its slot
  and becomes the reading; re-ranking the gallery on every edit is what a save
  does, not a change. `deleteStoredProject` closes the gap without re-ordering
  what is left and clears the reading only when the deleted row was the one
  being read. `projectCommands.test.ts` pins all four; add a spec there rather
  than trusting a new caller to state which promise it keeps.
- `updateStoredProject` declares `StoredProject | null` and finds its row with
  `findIndex`, then replaces it through `map`. The copy used to be collected in
  a variable assigned inside that `map` callback, and TypeScript does not narrow
  a value set by a callback, so the return read as `null` and a caller that
  checked it still could not read the project it had just updated. Keep the
  lookup and the declared type: an unknown id returns null without writing
  anything, and the written document and the returned copy stay the same object.

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

- `tsc --noEmit` with the default `tsconfig.json` only checks `src/main.tsx`
  — a false green. The real gate is `npx tsc --noEmit -p
  tsconfig.typecheck.json` (all of `wingman2/**`, strict).
- Server tests (`server/**/*.test.mjs`) import `@vitest/runner` and MUST run
  via `npx vitest run server/...`. Raw `node --test` on them fails with
  "Cannot read properties of undefined (reading 'config')" — misleading;
  it is a harness mismatch, not a test failure.
- To exercise authenticated API branches end-to-end, boot
  `server/competitor-lookup-server.mjs` from the WORKTREE on a test PORT: the
  file-mode store then writes only to the worktree's gitignored
  `data/runtime/`, keeping main's data clean. Sign up a throwaway workspace
  (`/api/wingman/auth/signup`) and reuse its session cookie.

## Quality gates & ratchets

- The pre-commit hook runs the dead CSS autofix and gate, then the fast lane
  plus architecture boundaries. The full verify chain additionally enforces
  two debt-ratchets:
  size budgets (`tools/wingman-size-budgets.json`) and style-drift
  (`tools/wingman-style-drift-baseline.json`). Raising either requires the
  documented exception process in `docs/SIZE_BUDGETS.md`.
- `check:style-drift-baseline` counts every CSS rule block whose selector
  matches page/compare patterns (e.g. `html[data-wingman-route="compare"] ...`)
  as one "pageSection" — adding N such rules raises the baseline by ~N.
- `check:dead-css` (in `verify:visual`) fails when an unmatchable selector is
  not in `tools/wingman-dead-css-baseline.json` **or** a listed selector is no
  longer dead: the file only ratchets down. Detection is shared with
  `tools/consolidate-dead-class-css.mjs` via `tools/lib/dead-css.mjs`, and the
  baseline file is excluded from the usage corpus so it cannot protect its own
  entries. The corpus is what git ships from the checkout — tracked files plus
  untracked ones no ignore rule covers — so an old component parked in
  `_backups/`, an abandoned worktree or a local export is not evidence that a
  class is live. Walking the tree instead is the fallback for a root that is not
  a checkout; it is also what made a red branch pass locally, because a stale
  copy of the retired page still named the class. Regenerate only after deleting
  dead rules (`npm run audit:dead-css:baseline`).
- `npm run autofix:dead-css` runs before the gate in the pre-commit hook. It
  only **splits** a mixed selector list (`.a, .b` → `.b`, live declarations
  copied byte-for-byte); a rule whose every branch is dead is left for a
  person because removing it deletes styling. Its baseline refresh
  (`--prune-stale` on the gate) drops allowances the split invalidated and
  never adopts a newly dead selector, so the gate after it still blocks new
  debt. The hook stages exactly the files the autofix reports, never the
  whole tree.
- Fully dead rules become a reviewable patch, not a silent edit:
  `npm run audit:dead-css:deletions` writes `reports/dead-css-proposal.diff`
  (and prints it) with the same file set the gate scans, retired baseline
  allowances included; `npm run apply:dead-css:deletions` applies that exact
  change and re-runs the gate, refusing when the patch is missing or no longer
  matches the tree (so deletions never happen off an unreviewed list). The
  patch is a plain `a/`…`b/` unified diff, so a partial acceptance works too:
  `git apply` the hunks you want, then re-run `npm run autofix:dead-css` to
  prune the allowances those deletions retired.
- Deadness is structural: a rule is dead when every comma branch has a
  compound whose classes are all unused. So `.wm-gone .wm-card` fails while
  `.wm-card` is still rendered — ancestor-only orphans are caught, not just
  rules whose every class is unused. Tokens inside `:is()`/`:not()`/attribute
  brackets are ignored (may still match), one live comma branch keeps the
  rule, and a compound of tag/attribute only is never dead. A dead branch
  inside a live comma list is reported on its own; the pruner splits it out
  (`.wm-btn, .wm-button` becomes `.wm-button`) instead of hiding it behind the
  live sibling. The allowlist is empty today; `node
  tools/consolidate-dead-class-css.mjs --all --apply` prunes the same file set
  the gate scans and drops emptied `@media` blocks.
- A class family counts as runtime-assembled only when source actually builds a
  class with it: the literal sits in a `className=`/`class=`/`classList`
  position, or in a declaration or function named for classes
  (`routeClassNames`, `compareDecisionButtonClass`), and is either the text just
  before a `${` or a quoted literal ending in `-` followed by `+`. Only the
  fragment built there is evidence; a shorter hyphen prefix of it, and any
  literal outside those positions, is a mention. The old "any word ending in a
  hyphen" rule let one incidental token exempt a whole stylesheet — `vw-` in a
  competitor-matching regex kept every `vw-*` rule alive, `compare-` came from
  a DOM id, `wingman-` from a download filename — which is why 95 rules had
  accumulated as invisible dead CSS. Before deleting a family, confirm the
  class is neither named in non-CSS source nor assembled in one of those
  positions; `collectDeadSelectors(root)` from `tools/lib/dead-css.mjs` gives
  the current answer, and the corpus includes tests, tools and `index.html`,
  so a class a spec still asserts counts as named. A `new RegExp(\`…\`)`
  template assembles nothing however its declaration is named: a pattern
  describes text the app matches (`^text-${families}-\\d+$`), so
  `normalize-wingman-page-visual-classes.mjs` was exempting the whole `text-`,
  `bg-` and `border-` families and hiding `bg-slate-950` on the glossary route.
  `collectDynamicFragments` skips every literal inside a `RegExp(…)` argument.
- `check:export-validation-domains` (in `verify:contract`) holds every domain
  of `validateProposalExport` to a test: `EXPORT_VALIDATION_DOMAINS` in
  `proposalExportValidation.ts` is the one runtime list, the blocker type
  derives from it, and a domain is proven only by a test statement that reads
  `.domain` off an entry the check produced (the statement is the unit, so a
  multi-line assertion counts and naming the word in a fixture does not). The
  gate also fails a check whose domain is unregistered and a registered domain
  no check produces, so a domain cannot be registered to look covered. A domain
  that genuinely cannot be proven yet is recorded with its reason in
  `tools/wingman-export-validation-domains.json` and prints as `UNPROVEN` on
  every run; the gate refuses that entry once a test covers it, so the file
  only ratchets down. The allowlist is empty today. `lifecycle` was the one
  entry until the check stopped reading technical-spec warnings (a bare SKU
  string read as an empty product, so it could never fire) and started reading
  the governed lifecycle record through `resolveProductLifecycle`: a
  discontinued, do-not-spec or admin-blocked SKU, or one a current product
  replaced, blocks the export, while a cable or an unlisted line is not a
  lifecycle failure.
- `check:fixture-sku-lifecycle` (in `verify:contract`) asks the lifecycle
  question about the fixtures proposals are tested against: an equipment line is
  an object literal carrying a `sku` plus `qty`, `quantity`, `description` or
  `role`, in a `*.test.*`/`*.spec.*` file or under a `fixtures` directory, and a
  discontinued or do-not-spec SKU in one fails. A bare mention is not a line —
  naming a retired SKU to prove the app rejects or remaps it is what those tests
  are for. Statuses resolve through `tools/lib/sku-lifecycle.mjs`, shared with
  `check:template-sku-lifecycle` and `check:lifecycle-successor-refs` so a
  `review` placeholder read through its active `-V2` form does not block; a
  fixture that exists to prove retirement behaviour is recorded with its reason
  in `tools/wingman-fixture-sku-allowlist.json`, and the gate fails an entry the
  fixture no longer needs, so the list only ratchets down.
- `check:unstyled-classes` is the inverse of `check:dead-css`: a class name in
  markup that no stylesheet answers fails unless it is in
  `tools/wingman-unstyled-classes-baseline.json`. `<style>` blocks inside export
  builders (the generated document's own sheet) count as stylesheets, and
  Tailwind utilities are decided by compiling them with the `tailwindcss`
  compiler rather than a hand-kept list — so adding a utility never needs a
  baseline update. Runtime-assembled names and test-file assertions are out of
  scope; detection lives in `tools/lib/unstyled-classes.mjs`. Markup and sheets
  are read through the same shipped-file corpus as `check:dead-css`
  (`tools/lib/shipped-source.mjs`), so a component or stylesheet parked in an
  ignored directory neither asks for a style nor answers one. A string literal
  that is an operand of `===`/`!==` inside a `className` expression is a value
  being tested, not a class (`mode === "guided" ? "is-active" : ""` renders
  only `is-active`), so the detector skips comparison operands. The baseline is
  empty; keep it that way rather than recording new debt.
- `npm run report:css-coverage` is the evidence side of the same question: it
  drives Chromium rule-usage tracking over every route in
  `src/wingman2/app/route-manifest.json` at 1440x1000 and 390x844 and writes
  `reports/css-coverage.{md,json}` (gitignored). It needs a dev server on port
  3000 and takes ~2 minutes. `:hover`/`:focus` rules cannot match a static
  load, so they are bucketed as interaction-only instead of unmatched, and
  Tailwind-expanded rules are marked generated. Pass routes without a leading
  slash (`--routes=wingman,wingman/compare`): Git Bash rewrites a `/...`
  argument into a Windows path before Node sees it.
- `npm run report:dead-css-triage` answers the question a cleanup asks next, per
  dead family (the text up to a class name's first hyphen): the rule text that
  is dead, the fragments source actually assembles with that prefix
  (`className=`/`classList`/a builder named for classes), and the places the
  prefix is only mentioned — a regex, an id or a filename, which is what a
  person re-reads before deleting. A family with no evidence is marked safe to
  remove, anything else is marked for review. It reads `tools/lib/dead-css.mjs`
  so its verdicts cannot drift from the gate, probes mentions at each dead
  name's longest hyphen prefix with near matches first (a live `wm-card` sibling
  must not bury `wm-card--tone`), writes `reports/dead-css-triage.{md,json}`,
  and always exits 0: it reports, the gate decides. The same scan prints the
  inverse list too: every accepted fragment with the class names no literal
  source writes and the selectors no literal source keeps, so an exemption can
  be audited against what it actually buys — a fragment no live rule needs is
  marked `unused` rather than silently widening the gate. A selector is credited
  to a fragment only when every class in it comes from assembly, so a literal
  sibling keeps its rule off the list. `assembledFragmentFor` in
  `tools/lib/dead-css.mjs` decides which fragment supplies a class (the gate and
  the report cannot name different keepers), and `createDeadSelectorTests` hands
  back the vocabulary and fragment set it decided with so the report needs no
  second corpus scan.
- An unmatched rule is only evidence, never permission: a selector that needs
  a state the sweep never enters (expanded, dialog, drag, print) is unmatched
  but live. Prune a rule only when its every class token is also absent from
  the app's own non-test source, and keep any rule whose class a tool, e2e spec
  or doc still names. `:not()`/`:is()`/`:where()`/`:has()` selectors stay out
  of a blanket prune: a class inside the argument is not what the rule needs,
  so `a:not(.wm-old)` would look removable while still matching every link.
- `check:pr-description` (the `PR description` workflow, deliberately not a
  `verify` stage, because it reads GitHub) holds a pull request's body to its
  own branch. A present-tense failure claim — "still failing", "checks are
  red", "not passing" — is stale once every completed check run on the head
  passes and at least one of them ran; in-flight runs are ignored because this
  gate is one of them, and a line about an earlier run, a fenced log or a quote
  is not a claim. An open item — an unticked `- [ ]` box, a bullet under a
  `Remaining`/`Still to do`/`TODO` heading, a line saying the work "still
  needs" doing — is stale once the branch closes it: the item names a file this
  pull request adds or changes, or it is a box on a non-draft pull request
  whose checks pass. Prose with no file evidence is left alone, so a note about
  work that lands later stays legal. There is no allowlist file: an item is
  kept with `<!-- keep-outstanding: reason -->` on its line or heading, and a
  body describing another branch's state opts out with
  `<!-- pr-description: skip -->`, both markers travelling with the
  description. The workflow is separate from `ci.yml` and also triggers on
  `edited`, so fixing a description re-runs a small job instead of the verify
  matrix. A fork pull request or an API failure skips with a note; an
  unreadable token fails instead of passing silently.
- `check:sales-facing-language` scans ALL source, including test comments and
  CSS comments, not just UI copy. Developer wording such as "demoted",
  "confusing", "has moved into", "workflow consolidated" fails
  `verify:contract` wherever it appears.
- `npm run build` compiles the tracked public assets without repairing source
  evidence. `build:prepare-data` explicitly regenerates catalogue artefacts;
  source repairs remain separate maintenance commands. Build runs WITHOUT the size-budget and
  style-drift ratchets — those only fire inside `verify:build` /
  `verify:visual`. Use plain `build` to verify compilation without ratchet
  noise.

## Discovery

- Every Discovery step body is one card language: the `.wm-room-wizard` panel,
  `.wm-brief-question` with its count on the title line, `.wm-brief-option`
  tick cards, `#root .wm-room-wizard-option` for a pressed button choice, and
  `.wm-expert-capture-count` for the answered total. The voice interview is a
  conversation rather than a form, so `.wm-guided-*` adds only the capture
  meter, the listen bar, the wording that was heard and the chips that settle
  it, and reuses the same option card for its manual answers. Two page-host
  rules outrank a plain class and have to be answered behind `#root`:
  headings are capped at `clamp(1rem,1.08vw,1.22rem) !important`, and every
  form control takes the host's dark fill and border, so the spoken-language
  `<select>` inside a chip declares its own (also `!important`) or it renders
  as a box inside the pill; a chip in a wrapping row needs `flex:0 0 auto` or
  it squeezes its own label into two lines.
- The programme-audio route is one question (`audio-route`) holding both ends:
  values prefixed `extract-` name where sound leaves the video path, `route-`
  name where it must arrive. `deriveDiscoveryAudioDesign`
  (`discoveryAudioDesign.ts`) splits them by prefix and writes `route` — an
  optional field, because designs saved before the question existed carry only
  a direction and a signal path, and `readDiscoveryAudioDesign` has to keep
  loading them. The route travels as its own line: the brief's `audioRoute`,
  the system design's room-audio evidence, `technicalFacts` in the proposal
  (before the signal path it explains) and the audio summary panel. A USB-audio
  or recording destination adds its own `requiredScope` entry, a Dante
  destination turns on the `network` scope the audio inventory alone would miss,
  and a half-recorded route becomes a `validation` question rather than a
  default. Adding a destination means adding its phrase to
  `DESTINATION_PHRASES` and its scope in that function, not a second question.
  The design also keeps the answer as values (`extraction`, `destinations`),
  because a surface that has to act on the route cannot parse the sentence: the
  room schematic does (`audioRouteSchematic.ts`), so a recorded route draws the
  de-embed point and one node per destination instead of only warning that audio
  needs designing. `wireAudioRoute` anchors each leg on a real device — the
  matrix/switcher, each source's own output or a display — and lands a
  display-speakers destination on the display already on the drawing; a route
  recorded with only one end draws nothing and keeps the warning, which is why
  the function reports whether it drew. `AUDIO_ROUTE_DESTINATIONS` is the
  diagram's own short label for each value, the one table to extend with a new
  destination (a spec fails when a recorded value has no entry), and a node it
  creates carries `metadata.audioRouteDestination` so both visual builders name
  it for what it is rather than drawing two "Audio system — by others" boxes.

## Video wall

- The handoff-required survey cells are enclosure and termination, not mount:
  `wallSurveyGaps` in `src/wingman2/lib/wallSurvey.ts` is the single check over
  `requirements.linkDetails`, and `wallSurveyGapText` names the short links.
  Both builder views render the alert before the save actions, guided mode can
  record the cells through the same transport table, and
  `wallDesignEvidence` stores the result as `survey { linkCount, gaps, text }`
  so the saved design carries the shortfall rather than implying a finished
  survey. `wallSurveyGapHeadline` and `wallSurveyGapLinkList` are the same
  sentence split, so the guided result can show the count inline and fold the
  link names into a disclosure without inventing different wording. That alert
  is hidden on the transport pass itself, where the empty cells are the
  subject.
- The focused view starts from a wall, not a room: `wallStartPresets`
  (`videowallDecision.ts`) are whole briefs (wall type, array, sources,
  layout, transport, panel size) named for what the wall does, and
  `wallStartPresetGroups` folds them into LCD/LED/projection for the shared
  `VideowallStartPresets` picker. The picker is a list of rows, not a grid of
  tiles: the wall's own drawing leads (`WallPresetGlyph` in
  `VideowallStartPresetRow.tsx`, drawn from `wallVisualLayout` so a 2 × 2 wall,
  an LED ribbon and a projector pair are told apart before the name is read),
  the name sits over the brief, and `wallStartPresetFacts` (size, windows,
  lead) fills three grid columns of its own, because twenty bordered cards of
  equal size read as twenty decisions while a value that starts at the same x
  on every row can be compared down the list — every wall and every fact is
  still on the page. The facts are chips there, and the glyph repeats what they
  say, so it stays `aria-hidden`. Each family carries its count on its band. The
  families and rows are the same component in both readings: the guided
  wizard's start step mounts the picker with `showFilter={false}`, because its
  next four questions are the narrowing, and with `shortlist`, which shows the
  curated walls — `wallStartPresetShortlistKeys` in `videowallDecision.ts`,
  one per job a rep starts from with every family represented, resolved
  through the shipped presets so a renamed brief drops out instead of drawing
  an empty row — plus any wall this browser saved, and folds the rest behind
  `Show all N walls` — `aria-expanded` on that action,
  `videowall-preset-show-all` as its id. It is a named list rather than "the
  first of each family", which is only the order of the brief list, and
  `wallStartPresetShortlistCoverage` keeps it honest (no unknown key, at least
  one wall per family, fewer than half the catalogue). A rep whose rooms repeat
  a different few pins them (`wallPinnedPresets.ts`): a pin is a key on a
  curated card, not a copy of its brief, stored per browser beside the draft, and
  it only reorders rows — the pinned walls lead their family band with
  `Pinned · ` on the facts line and stay on screen while the list is folded, so
  `foldedPresets` keeps a pinned key even after the curated set moves on. The
  pin control rides outside the row button like the saved wall's remove action,
  `pinned` and `pinnable` are passed down to the row, and only the shortlist
  reading offers it: the expert reading's order is the catalogue's, so a pin
  there would reorder nothing. A pin still loses to a saved wall's place at the
  head of its family, because that wall is the rep's own brief
  (`wallStartPresetGroupsWithSaved` takes the already-ordered bands). Twenty rows in front of the
  first question is a catalogue, so the guided step's heading line carries
  `Answer the questions instead` (`.vw-wizard-job-head`) and a phone rep
  reaches the four questions without scrolling the walls; the expert reading
  keeps the whole list and its filters, and the band keeps counting the family
  rather than the row under it.
  Each preset's `leadsTo` is read from the decision
  engine at import, so a wall cannot advertise an architecture its answers no
  longer reach, and `videowall-preset-<key>` is the walkthrough id. A test fails
  on a preset that names a market vertical, because the same wall has to be
  quotable for any customer. Adding a preset means adding it to the brief list
  only — the groups, facts and row all derive from it. The two
  custom LED walls are the placement pair: `led-floating-windows` (floating,
  4K30 sources) reaches NHD-150-RX, and `led-fixed-windows` (16 fixed X/Y
  windows) reaches NHD-600-TRX. Each option's own blockers point at the other
  — the 150 rejects a recalled fixed layout and the 600 rejects floating
  windows — so the picker must not offer a preset that answers both ways.
- The shell re-sizes every button in the page host — 28px tall,
  `.2rem`/`.55rem` padding, `.78rem` text — and that page-wide control rule
  outranks a plain class. The wizard's own controls (`vw-wizard-nav`,
  `vw-wizard-answer-list`, `vw-wizard-stages`) and its option and chip cards
  therefore declare their size behind `#root`: without it a step action, a
  Change button and a review-stage tab came back as 28-32px strips inside cards
  carrying 14-16px of padding. The stage rail is shared by both readings, so a
  fix there lands in both.
- A rep's own wall joins that picker: `wallStartingPoints.ts` saves the current
  answers to localStorage, one wall per brief keyed by a stable hash of the
  brief with the survey fields (`measuredRuns`, `linkDetails`, `surveyReview`)
  stripped, so another room's measurements never ride along and re-saving a wall
  moves its row to the front instead of duplicating it. The save and load paths
  both run `wallStartingPointBrief` — the one shape rule — or a wall's key would
  change between saving and the next visit; a stored entry that fails the
  builder's own validation is dropped. `wallStartPresetGroupsWithSaved` places
  the saved wall first in its family with `Saved ·` on the facts line; the
  remove action sits outside the row button (a control cannot nest in a button)
  and `wallStartPresetFrom` derives family and `leadsTo` for saved and shipped
  walls alike. The save action and the picker share one snapshot
  (`useWallStartingPoints` in `data/wallStartingPoints.ts` over
  `subscribeWallStartingPoints`), which is why a saved wall is already beside
  the shipped ones when the rep returns to the start; writes publish a new
  cached array so `useSyncExternalStore` sees a stable identity otherwise. The
  guided result's `Save as starting point` and the expert start panel write the
  same store, capped at six walls.
- The picker also narrows on the facts its rows print: `wallStartPresetFilter.ts`
  filters windows, sources and a transport bucket, and every chip value comes
  from the walls themselves so no chip is a dead end. A per-panel wall counts as
  the pictures it shows (`columns × rows`), not the brief's `windows: 1`.
  `WallStartPreset.transport` is read from the engine's recommended family in
  `wallStartPresetFrom`, never typed onto a brief, so a chip cannot contradict
  the `leadsTo` the wall advertises. A count is a floor, not an equality:
  windows and sources read as "at least this many" (a nine-window wall can show
  four) and the transport chip is the connection the site offers, so it keeps
  the walls at or below it — an exact match hid every other wall and left a rep
  looking at one wall. The copy under the chips says so, because a chip that
  keeps larger walls has to admit it — and it is written only once a chip is
  set, so the default state is three rows of chips and a wall count rather than
  a paragraph about rules nobody has applied. The chips stay open above the
  walls (a narrowing nobody can see is one nobody uses) with the count and
  Clear filters on the line above them. Filtering hides rows only: families
  keep their order, a family with no match folds away, and an empty result says
  so with its own Clear filters. The filter is local view state, not part of the
  brief or the saved starting point.
- A design remembers the card it started on: `wallStartingPointOrigin.ts` holds
  `{ key, label, brief }`, written by the builder's card pick (and only by it —
  a handoff, a shared link and Start again leave the design without one),
  `pickPreset` calling `wallStartingPointOrigin` and `restart` clearing it. The
  origin is page state, not a design answer (the saved wall carries it — see
  below), and a handoff or a shared link arrives without one. The
  card's answers are stored with it as the same brief `wallStartingPointBrief`
  produces, so drift is measured against the card rather than against the
  rep's memory of it, and `normalizeWallStartingPointOrigin` drops a rotted
  entry instead of measuring against a wall that never existed. The picker marks
  that wall on its key: `data-started="true"` on the row, an aqua inset edge on
  its left (see the videowall stylesheet) and a `Started here · ` prefix on the
  facts line. It is deliberately not `aria-pressed`: pressed means the answers
  still match the wall exactly, and a rep coming back to the start is asking
  which wall this design came from, which a changed answer does not undo. A
  saved wall is marked the same way, reading `Started here · Saved · ` because
  both facts are true. Drift is per
  answer, not per model field (`driftFields`), because a rep changed "the
  layout", not `layout` plus `windows` plus `customMode`; the field table is the
  only place to add an answer, and it quotes the builder's own words. The
  survey fields are not answers — measuring a cable never adds a change.
  `WallStartingPointOriginNote` is the one panel, rendered in the expert start
  panel under the picker (the builder passes `startingPoint` into
  `VideowallExpertReview`, which hands the key on to the picker): the card
  in a lead line, one sentence with the count, and the changed answers behind a
  disclosure with the card's value struck through. Its count is deliberately no
  live region — the save confirmation owns the status role, and two of them made
  `getByRole("status")` ambiguous. No origin, no panel: a wall answered from
  scratch is its own starting point. The saved wall carries it too:
  `wallDesignEvidence` stores `startingPoint` in the summary, so the project
  record and the proposal can say where the design began after the builder is
  gone (a handoff, a shared link and Start again save `null`), and
  `restoreVideowallDraft` returns it so a redesign on a later visit saves the
  card it kept rather than erasing it.
  `wallStartingPointFromSummary` reads it back off the stored summary — pass
  `project.videowall.summary` / `videoWall.summary`, not the wrapper, or the
  record silently disappears — and `wallStartingPointRecordText` is the one
  sentence all three surfaces print (`Started from <card>. N answers changed:
  Sources: 3 → 4.`), with `No answers changed from the card.` when nothing
  moved. `WallTransportReview` prints it at the top of the project's Wall
  transport panel as `data-wall-starting-point="<card key>"`, and both proposal
  exports print it in the Display Schedule beside the elevation, so an adjusted
  wall cannot be presented as the card the customer was shown. It is a record,
  not a warning: nothing blocks on drift, and a wall with no card prints no line.
- The brief list has to reach the whole option catalogue, not just the popular
  walls: `assessVideowallOptions(defaultWallRequirements)` is the product list,
  and a test fails when a catalogued option is the recommendation for no shipped
  preset. Each LCD card is a distinct architecture (local matrix, dedicated wall
  processor, 500-series encoders, 150 multiview, 500 + multiview stage, 600
  SDVoE), which is why there is a card per option rather than one per wall shape.
  An array used on a card belongs in `videowallPanelPresets` too, or the guided
  size step shows no selected chip for the wall the rep just picked.
- Both readings show the whole tested field, not just the recommendation and one
  alternative: `VideowallOptionsList` is always open under the verdict, with a
  range key above the rows. A rep is choosing between WyreStorm ranges before
  part numbers — `wallProductRanges` (`wallRanges.ts`) says what the 100, 500
  and 600 series and a local HDMI rack each answer, every row repeats its own
  range's sentence, and `wallRangesInPlay` keys only the ranges the catalogue
  covers. `wallOptionRangeKey` files an id by what it transports: the 500 +
  multiview stage stays 500, while `NHD-0401-MV` is a local HDMI multiviewer, so
  an NHD- SKU is not the test for a networked design. A design's builds
  are chips on its row (`wallVariants.ts`): the 500 as the full or Lite (-E)
  pair, the 600 on copper or fibre. A build keeps the design's id and swaps only
  its schedule SKUs plus one check, so `wallOptionWithVariant` is where the
  quoted parts change and `wallVariantFor` is the one rule that drops an id the
  design does not offer. The builder owns `variantId` (state, not the brief),
  passes the built option downstream so the verdict's equipment and checks
  follow it, names the build on the verdict, and clears it when the design or an
  answer changes — a build belongs to the answers it was chosen for. It rides in
  the draft and the saved summary as `selectedVariantId` (null on the catalogue
  build), never in a link: a link's `?pick=` still names a design.
- A projection screen can be several projectors: `WallRequirements.projectors`
  (bounded by `MAX_WALL_PROJECTORS`) is read through `wallProjectorCount`, and
  the units sit side by side carrying one canvas, a slice each. The canvas is as
  wide as the images together, `wallPhysicalSize` sizes the screen from the same
  images, and each projector gets its own transport link (`Projector 1`,
  `Projector 2`) and its own display-schedule row with the slice it carries — a
  composed design with one output is blocked rather than advertised, because it
  cannot give a pair their own halves. The `projector-pair` preset is that
  wall: two 86 in projectors, one 32:9 canvas, two sources switched into a local
  matrix that splits the selected picture across two outputs, so the card reads
  `Local matrix`. Its copy says the blend overlap is confirmed at survey; the
  model records a measured one and never assumes a blend region. One screen
  carrying several images has to draw as several images:
  `wallVisualLayout.projectorSlices` splits the wall at
  `WallRequirements.projectorSplits` (equal fractions until a rep moves one) with
  a `P1`/`P2` label, and both renderers — `wallElevationSvg`
  for the proposal, the worksheet and the DOCX raster, and `VideowallVisual` for
  the builder — draw the same amber dashed seam on every interior boundary with
  each image's chip in its own top corner. The seam is drawn after the windows,
  so a composed window crossing the split still shows where one image ends. A
  slice list is empty for a single projector, an LED canvas and an LCD array, so
  the drawing never invents a surface boundary; add the print parts to the
  `print-color-adjust` list in `proposalExport.ts` when you name a new one.
- A measured overlap replaces that seam with the band the images share.
  `WallRequirements.blendOverlapMm` is read through `wallBlendOverlapMm` (bounded
  by `MAX_BLEND_OVERLAP_MM`, and 0 unless `wallProjectorCount` says the screen is
  divided), and becomes `wallVisualLayout.projectorBlends` — one entry per
  interior boundary, centred on it because each image runs half the overlap past
  the point where they meet, capped at a fifth of the narrower of the two images
  so a mistyped figure cannot swallow the slice it is drawn in. Both renderers draw the same band and
  label it (`60 mm blend`) in place of the seam, and `normalizeWallDesignMetadata`
  drops a stored overlap once the wall is one image, like the rest of the design
  metadata. Nothing derives an overlap: an unmeasured screen keeps the seam and
  says so, and `VideowallSizeFields` is where the rep records one. The figure is a
  site measurement, so  `wallStartingPointBrief` and the link's `SURVEY_KEYS`
  leave it out — neither a starting point nor a shared address carries another
  room's blend.
- The seam is the control for an unequal pair. `WallRequirements.projectorSplits`
  holds one boundary per interior edge as a fraction of the screen width, read
  through `wallProjectorSplits`: it falls back to the equal split, keeps every
  image at `MIN_PROJECTOR_IMAGE_SHARE`, and rounds to four decimals because the
  wall, a saved card and a link token all compare these fractions for equality.
  A value that is not a fraction at all (a hand-edited link) falls back to the
  equal split rather than being pinned to an edge. `VideowallVisual` draws the
  handle on each boundary — a `slider` named for the two projectors it separates,
  dragged with the pointer and nudged with the arrow keys (5% with shift) — and
  writes the whole array through `onRequirementsChange`, so the print path and
  the builder read one boundary. It is a design answer, not a survey figure: it
  rides in the brief, a saved starting point and a link, unlike the survey
  fields. An equal split is stored as nothing (`normalizeWallDesignMetadata`
  drops it), so a symmetric wall's link stays as short as it was. The drawing
  says the shares it is drawing (`imageSharesLabel`, `42% / 58%`) in the meta
  line and in the printed caption, because a seam a rep moved has to be legible
  to the person reading the proposal; `VideowallSizeFields` points at the
  control from the projector step.
- The guided result is read one pass at a time, not as one long page:
  `wallReviewStages` in `videowallWizard.ts` is the order (design, wall,
  transport), `wallReviewStageStatuses` is the one-line status under each
  name, and `VideowallWizard` renders only the selected pass. The save actions
  sit in the command bar above the pass so they never need scrolling, the
  transport table belongs to its own pass rather than the size step, and the
  survey alert's button jumps to it. Adding a pass means adding it to the lib
  list (with its status) so the wizard and its tests see the same order. The
  expert builder reads the same passes: `VideowallExpertReview` renders the
  shared `VideowallReviewStages` rail and one pass at a time, so its questions,
  elevation and transport table no longer stack into one page, and both views
  show the same per-stage status lines. Move the shared review chrome there,
  not into either view, or the two readings drift apart; the expert component
  also keeps the page entry under the 400-line architecture budget.
- The expert design pass is read in the order a rep decides, each level quieter
  than the one above it: the wall, then `VideowallVerdict`, then
  `Adjust the answers`, then the designs tested against it. Its heading is
  `The wall` because the picker under it sets every answer — a size question set
  over a list of whole walls named something the block was not. The four
  questions are `<details>` rows (`videowall-step-<n>`) whose summary carries the
  question and the answer in use (`wallWizardAnswers`, shared with the guided
  result), so the brief reads without opening anything and the answers stop
  competing with the wall; opening a row is the controls that step always
  rendered. `VideowallOptionsList` is reference rather than a choice, so it
  opens from a summary naming `decision.considered` and `decision.viableCount`.
- The verdict answers before it argues: `VideowallVerdict` puts the signal-path
  sentence under the summary of the design it recommends, keeps `Why this meets
  the need` as one column, and closes `Confirm before ordering` behind
  `vw-builder-checks-details` with its count on the line. Those checks are
  worked through at ordering time, so six of them open beside the reasons made
  the decision a reading exercise; the folded line still says how many there
  are, and the manufacturer references and their research date travel with
  them.
- Which pass was on screen is view state, not design evidence: `wallReviewPass.ts`
  keeps it in localStorage beside the wall draft, and `VideoWallPage` owns it so
  both readings render the same pass and a click writes it once. Saving,
  reloading or coming back from the proposal therefore reopens the same pass,
  while a handoff, a preset pick or Start again returns to the design. Reloading
  the guided view only lands on the pass because
  `restoreVideowallDraft(...).restored` reopens the result for a saved wall; an
  empty builder still starts at the presets.
- The same pass also rides in the URL as `?pass=<stage>`: the page keeps the
  address bar on the pass being read with a `replace` navigation, so a reload
  restores it without storage and copying the address shares the reading. A
  link's pass outranks the stored one (and a handoff still opens the design);
  the opening pass is dropped from the address rather than written, and a value
  that names no stage is ignored and cleaned away. Because the rail belongs to
  the expert reading, a link naming a pass opens that view once even where the
  device last chose the focused one — the switch is one-shot, so the rep can go
  back to Focused view without the link pulling them out again.
- The address also names the wall: `?wall=<token>` (`wallLink.ts`) is written on
  every answer change with the same `replace` navigation as the pass, so a
  copied builder link opens the sender's design instead of whatever the
  recipient was last editing. The token is the starting-point brief
  (`wallStartingPointBrief`: answers only, survey stripped) diffed against
  `defaultWallRequirements`, JSON'd, base64url'd under a `1.` version, with the
  keys sorted so the same wall always encodes the same way. The default wall is
  written too — a link that dropped it is exactly how a shared pass came to open
  someone else's draft. `wallLinkBrief` reads a token back through
  `startingPointRequirements`, so a hand-edited or later-version token is
  ignored rather than half-applied; `restoreVideowallDraft(handoff, shared)`
  ranks a handoff above a link (a fresh handoff arrives in the visit that
  replaced the address) and a link above the project and local draft. A link
  makes `restored` true, so the focused view opens the result rather than the
  preset picker, and both readings print `videowall-shared-wall` saying the wall
  arrived with the link. That banner is `wallSharedLinkNote(requirements)`, and
  it names the wall it describes — the array and `wallPhysicalSize(...).basis` —
  because a rep opening someone else's answers needs to know what they are in
  front of, and the phrase has to be the one the copy confirmation and the
  pasted line quote or the same wall reads two ways. The handoff banners are
  held to the same rule: `wallHandoffDisplay(requirements)` is that same array
  and `basis` phrase inside `wallHandoffNote(handoff, requirements)`, the one
  sentence both readings print, so a wall that arrived from another room's
  Discovery answers or from a template reads like one that arrived in a link
  instead of only saying where it came from. A Discovery handoff also names the
  room the answers were captured for: `discoveryVideoWallHandoff(answers,
  projectName)` carries it on `VideoWallHandoff.projectName` (from the saved
  project, else the draft — a capture nobody named carries none rather than
  "Unnamed discovery"), and `wallHandoffOrigin(handoff)` composes the recorded
  phrase, `Discovery: LCD wall, single canvas (Boardroom wall)`. The banner and
  the saved wall's evidence `origin` both read that one function, and the label
  keeps naming only the wall behaviour. The focused reading shows that note
  in its `videowall-wizard-result`, not on a capture step: a handoff opens the
  wizard at its result, so a note under step one is a note nobody reads.
  Measured runs, install cells
  and the photo review are never in a link: they belong to one room.
- The builder says which copy of the wall is current without being asked. The
  autosave hook returns the stamp it wrote (`rememberVideowallDraft` returns it,
  `storedVideowallDraftUpdatedAt` reads it back for the first paint) and
  `wallDraftStatus({ draftSavedAt, projectSavedAt })` compares it with the active
  project's `videowall.savedAt`: a newer draft prints one line naming both facts
  (a reload is safe, the project copy is behind), an absent project wall says so
  instead, and a draft at or behind the save prints nothing. Equal is not behind
  because saving writes the draft and the project together. It is a note rather
  than a live region — the save confirmation owns `role="status"` — and
  `WallDraftStatusNote` reads the project time itself so the page entry stays
  under its 400-line allowance. Both readings mount it beside the shared-link
  note, which answers the same question.
  The project's Wall transport panel prints the same sentence above the saved
  wall's links, so a rep reading the record knows the builder holds newer work
  without opening it, and the sentence ends in a `Continue in the wall builder`
  link: the rep reading it is the one who can save that work, so it resumes the
  design instead of starting one. That link names its project
  (`wallResumeUrl` writes `?project=<id>`) rather than pointing at the bare
  builder, because a bare link reopens whichever draft in this browser was
  edited last: `restoreVideowallDraft(handoff, shared, scopedProjectId)` honours
  the scope — a draft whose `projectId` names another project is that project's
  work however new it is — and only when the scope names the project the builder
  is reading anyway, so a stale or hand-edited id borrows nobody's copy. The
  saved survey's photo review offers the same scoped link from the project
  record, so finishing a survey cannot reopen another room's draft. The
  remaining bare builder addresses (`Copy link`, the dashboard card) still open
  whatever this browser holds, which is what "the wall I was editing" means.
  That panel
  asks about one named project, so it passes
  `projectId` and `draftProjectId` and the rule stays silent unless the draft
  names that same project — another project's wall in progress is not this one
  falling behind, and a draft that names nobody cannot be claimed. The owner is
  written by `rememberVideowallDraft` (the active project at the time of the
  edit) and read through `storedVideowallDraft`, so the builder's own note, which
  passes no project id, keeps comparing the draft with whatever project is
  active.
- `Copy link` in the builder's action bar copies that address instead of asking a
  rep to think of the address bar: `wallShareSearch` composes the three rules
  that own a half — `wallLinkSearch`, `wallReviewPassSearch`, `wallPickSearch`
  — so the link carries the wall, the pass and the rep's chosen design and
  keeps every unrelated parameter. The clipboard gets `wallShareClipboard`: one
  line naming the project the wall belongs to (or "New video wall" before it has
  one), the display the design is built on, the review panel the link opens and
  the absolute address, so a paste into chat explains itself instead of arriving
  as a bare URL. The display phrase is `wallPhysicalSize(...).basis` — the same
  one the proposal's mounting line quotes — so an LCD array says "55 in panels",
  an LED canvas its pixel pitch and a projector pair the image each one throws;
  the helper reads the wall's own `panelDiagonalInches`, so the sentence names
  the size the design carries rather than a house default. The confirmation
  in the builder is `wallShareNote` — the array, the source count, the same
  `basis` display phrase the pasted line quotes (so the confirmation and the
  clipboard cannot name the wall differently) and the pass
  named in prose (`wallSharePassName`, which strips the rail's article), the
  chosen design when there is one, plus the fact that the survey stays with the
  room. A browser that refuses the clipboard says so (`WALL_SHARE_COPY_FAILED`)
  rather than looking as though the link copied. Both readings mount the action,
  so a rep in the focused result can share without switching views. Each review
  pass carries it too: `VideowallReviewNav` takes `onCopy`/`copyLabel`, and the
  expert review names the action for the pass on screen (`Copy link to the
  transport and survey pass`) because three buttons all reading "Copy link" are
  interchangeable to a screen reader. The builder owns the pass as state,
  remembers it (`rememberWallReviewPass`) and writes the wall, the pass and the
  pick into the address with one `wallShareSearch` replace navigation, so the
  pass action, a reload and a pasted address all open the same reading. A link
  naming a pass opens the rail once even where the device last chose the focused
  view, and `restoreVideowallDraft(handoff, shared)` ranks a handoff above a
  link and a link above the project and local draft — opening the recipient's
  own draft instead is what the link exists to prevent.
- A rep who reads the field and picks another architecture is sending that
  wall, so the choice rides in the link as `?pick=<option id>`
  (`wallPick.ts`) — beside the answers, never inside them. The token stays the
  brief (what the wall has to do) while the pick says which catalogue design
  answers it, so a recipient's own catalogue decides whether the id still
  names a design: `wallPickedOption` is the one rule for honouring a pick, and
  it drops one these answers do not reach (unknown id, or a design with
  blockers) rather than opening a wall the picker would refuse. The
  recommendation is the absence of a pick, not an id, so choosing Wingman's own
  design again clears the param and the link keeps following the catalogue.
  A link's pick outranks the draft's stored selection, because the sender chose
  it; changing any answer clears both, since the choice belongs to the answers
  that were on screen when it was made.
- A saved wall records its owner: `StoredVideowallSummary.projectId` (rewritten
  when a project is copied) and `templateId` when the design started from a
  room template. `saveVideowallToProject` writes both — taking the template from
  the builder's handoff (`VideoWallHandoff.templateId`), else the wall's
  previous save, else the project's room model — and the codec preserves them.
  The project codec backfills both on load from the record's own facts (project
  id, and the room model's `sourceTemplateId`) when a wall predates the fields,
  and never overwrites a recorded value. `savedTemplateWall` therefore reads
  the recorded `templateId` only — there is no room-model fallback left to
  guess with — and orders by the wall's own `savedAt`; that is the wall a
  template's proposal export quotes.
- The elevation stands the wall on its mounting height. `mountingHeightMm` on
  `WallRequirements` (default `DEFAULT_MOUNTING_HEIGHT_MM`, 900 mm) lifts the
  wall's bottom edge off the floor and `wallElevationGeometry` dimensions the
  gap as `mounting-height`; 0 is a floor-standing wall and draws no gap. The
  floor level is measured from the wall's bottom edge, not the frame bottom —
  a filled source's crop overhang reaches below the wall — so the width
  dimensions and the scale figure both sit below the floor, and the
  wall-height dimension's lane carries the mounting span because the two
  never overlap.
- A composed window plan can be mistaken for the wall's own tiling: four
  windows on a 3 × 3 array cover 1.5 panels each, and filled window blocks read
  as a 2 × 2 wall. So the array stays the drawing's subject — the window tint is
  light and dashed (content, not a screen), the panel seam is drawn over the
  windows at the gutter width (`bezel`), and panel numbers are bright with a
  dark halo. `wallVisualLayout` says the array in words too: `arrayLabel`
  carries the panel count and `canvasCaption` names the panels the windows are
  composed across. The builder, its previews and the printed elevation all read
  the same layout, so `wallElevationSvg` makes the same three choices.  The drawing's two type sizes are explained by one list, `wallElevationKey`
  (small numbers are panels, large numbers the source each window carries): the
  builder renders it as the `vw-wall-key` chips under the elevation, the printed
  proposal HTML as `data-wall-key-list` chips between the drawing and its
  caption, the survey worksheet (`wallSurveyWorksheet.ts`) as the same
  `data-wall-key-list` row in the sheet's own styles inside its figure, and Word
  as a `Drawing key:` line after the image. The sheet is the copy a surveyor
  reads away from the screen, so it cannot be the one printout that leaves its
  two type sizes unexplained. The list drops the
  panel entry whenever the drawing draws no panel numbers (a canvas, a screen or
  an array over twelve), so no output promises a number it does not draw; change
  the wording or the condition there, never in one consumer.
- `application: "lcd-grouped"` drives the displays on `displayFeeds` outputs,
  each driving one display or a looped group of them: the third LCD answer
  between `lcd-direct` (a feed per panel) and `lcd-loop` (one canvas).
  `wallDisplayFeeds` starts from whole rows (a loop follows the physical rows),
  merges neighbouring rows for fewer feeds and splits a row down its columns
  for more, so every group stays rectangular and its slice of the canvas is a
  real crop; unset falls back to one feed per row. Transport quotes one
  `feed-<n>` head-end link per feed plus `display-<panel>` loop hops inside it,
  which is why the display schedule prints one row per feed and looks its cable
  up by link id instead of row position. `wallCanvasPlan` sizes the canvas on
  the largest feed, not the array, because one feed has to fit one output.
- A run over its limit is marked on the elevation where the cable lands: the
  panel that link feeds, or the whole surface when the wall is one canvas, drawn
  with its measured run and limit. `VideowallVisual` reads them from
  `wallTransportPlan(requirements).allLinks`, so the drawing and the transport
  table cannot disagree, and only `limit` links are marked — a link exactly on
  its limit is a warning, not a breach. A source run is off the wall, so it is
  named in the meta line only. The tag stays inside the cell it marks (its type
  shrinks on a dense array) and sits below the panel number's corner.
- The transport table fixes an over-limit run where it reports it. The status
  cell of every `limit` row carries a one-tap cable change —
  `applyWallTransportFix(requirements, link.id)` behind
  `onRequirementsChange` — so a rep does not leave the table to make the design
  fit. Every fix the design can cost is fibre: an HDMI-to-fibre extender for a
  passive run, a 10GbE optical link where the cable was already Ethernet, and
  extra regenerated segments past one fibre span. `wallTransportFixLabel` is the
  one wording, read by that button and by `ProposalWallGate`, so the surface that
  blocks the export and the one that clears it name the same action. The fix
  changes the cable only: the measured run stays exactly the length the rep
  surveyed, which is why the requirement must reach the table (`requirements`)
  and a design whose caller cannot keep the change gets no button.
- The proposal's mapping pair carries `wallMappingRecommendation`: the captured
  window count decides fit (several windows must keep every feed whole) or
  fill (one window runs to the wall's edge). Its printed costs come from
  `wallMappingCosts`, so the recommendation, the two drawings and the warning
  cannot disagree about the pixels, and both exports compute it from the wall
  requirements rather than from the preview asset.
- The mapping warning's one-tap fixes live in `wallMappingFixes`
  (`wallElevation.ts`) and only an LED canvas qualifies: its shape is
  programmed pixels, while an LCD array's shape is its panels and a projector's
  is its screen. The canvas snap trims the edge the fitted source never
  reaches (never adds cabinets); the source snap sets `sourceCustom` to the
  canvas size and leaves the wall untouched. A fix is offered only if it leaves
  `wallElevationOverlay` null, so a rounding step cannot return a "fixed"
  design that still mismatches.
- The worksheet photo reader takes a batch. `readWallSurveyPhotos` runs each
  photo through the same single-photo check, merges rows with the later photo
  winning a duplicate link, and unions the unread ids into one list to type; a
  failed photo is named without discarding the rest, and only a batch where
  every photo fails rejects.

## Proposal output

- `buildProposalHtml` in `src/wingman2/lib/proposalExport.ts` is the only
  printed/PDF surface: the PDF export opens it and calls `window.print`, and
  `check:proposal-output-parity` renders the same HTML to PDF. Page setup lives
  there in `@page` (A4, margins, `@top-left` running header, `@top-right`
  `counter(page)`/`counter(pages)`, reference and draft lines in the bottom
  margin). Chromium renders those margin boxes; the parity spec must keep
  `preferCSSPageSize: true` or Playwright's own margins replace the CSS margins.
- Proposal copy has two layers in `src/wingman2/lib/proposalCopy.ts`: `REP_COPY`
  is authoring guidance (the `[complete]` scope prompts the wizard seeds into a
  draft), `CUSTOMER_COPY` is what may print. Export builders read only the
  customer layer and run free-text fields through `customerCopyText`, which
  drops rep-only lines and substitutes the customer wording when nothing else
  is left — the wizard writes the prompts into `externalScope`, so a stored
  draft can otherwise carry them straight into the document.
  `check:proposal-wizard` fails if either export builder names `REP_COPY` or
  carries a rep marker, so new guidance has to be added to the rep layer.
  The wizard's own markers are split with the component: the entry
  (`ProposalCompletionWizard.tsx`) is asserted for composing
  `ProposalCompletionWizardView` and for the five step names it hands over, and
  the view for `Export formatted DOCX` and `Open Recommendations`, which moved
  with the markup. Moving a control between the two means moving its marker, or
  the gate fails naming the file that no longer holds it.
  A standing printed sentence belongs to `CUSTOMER_COPY` too, not to the builder
  that renders it: the comparison notice is
  `CUSTOMER_COPY.competitorExclusion`, and `check:workflow` holds the constant
  in `proposalExport.ts` plus the sentence once in `proposalCopy.ts`. Assert the
  constant from a content test, not the prose, so rewording the notice is a
  one-line change in the copy layer.
- An over-limit wall cable run blocks the proposal export. `wallTransportBlockers`
  (`proposalExportValidation.ts`) turns each over-limit link into a blocker that
  names the link, the measured run and the limit, with the cable change that
  clears it; a link sitting exactly on its limit stays a warning. The rule reads
  the saved answers through `wallTransportRequirements`
  (`videowallTransport.ts`), so a summary without columns, rows, sources or the
  source location has no costable run and is never blocked for one — the display
  schedule uses the same helper, so its printed flags and the gate cannot
  disagree. `validateProposalExport` adds them when it is given
  `wallRequirements` (both the wizard and the template review pass the saved
  wall), and `exportProposalHtml` / `exportProposalPdf` / `exportProposalDocx`
  assert before building, so a caller that skips the readiness panel still
  cannot issue a document whose own schedule lists the breach.
- An unfinished wall survey is a completeness warning, not a blocker:
  `wallSurveyCompletenessWarnings` (`proposalExportValidation.ts`) turns the
  handoff gaps (`wallSurveyGaps`, enclosure and termination only) into one
  `survey` warning naming the short links, so it lands in the proposal's Export
  Validation list and the wall panel while the document still issues. It reads
  the saved wall through `wallTransportRequirements`, so a summary with no
  costable link list never warns, and a recorded mount is not an enclosure or a
  termination. The template review path gets it through the same
  `validateProposalExport` call.
- That warning can be cleared from the proposal itself: `ProposalWallGate`
  offers a cell per missing enclosure/termination and hands them to
  `recordWallInstallDetail` (`discoveryCommands.ts`), which merges only the typed
  cells into the saved wall's `requirements.linkDetails` (a link keeps an
  enclosure the survey already recorded), moves the wall's `savedAt` because the
  design changed, and appends a `wall-survey-detail` audit entry. It returns
  null when nothing changed or the project has no saved wall, so a repeat click
  is not a save and the panel can point back at the wall builder. The wizard
  passes its own `projectId` rather than relying on the active project. The
  cells themselves are `WallSurveyGapFixes`, shared with the template review
  page's survey warning, which records into `savedTemplateWall(...).projectId`:
  both surfaces offer the same rows and copy, and the template page renders the
  cells in place of the warning's "record it in the wall builder" fix line,
  because it can take the cells itself. That warning's list is a column grid, so
  the block carries `col-span-full` to sit under the whole warning.
- The survey's per-link install detail is also priced scope. `buildInstallationSchedule`
  (`installationSchedule.ts`) groups `requirements.linkDetails` by what was
  written — casing and spacing folded — into one line per item with a quantity
  of the links needing it, plus the link labels; the same back box on four
  panels is one line, not four. Lines are ordered enclosure, mount,
  termination, and the id a rate is filed under is
  `install-<category>-<slugged detail>`: rename the survey text and the rate is
  a new line, which is why the id, not the label, keys
  `ProposalWizardDraft.installationUnitPrices`. Nothing derives a rate; an
  unpriced line prints TBC and holds the total exactly as an unpriced
  equipment row does, so `installationTotals(...).complete` feeds the wizard's
  `commercialPricingComplete` and the readiness list asks for every equipment
  and installation rate. A summary with no costable link list has no
  installation scope at all (`buildInstallationSchedule` returns null) rather
  than an empty table.
- The Word `Equipment and Pricing` section prints that priced table after the
  equipment total, beside the same section's `Services and Commercial
  Allowances`; the HTML/PDF customer copy prints the scope by item but no
  prices, matching its equipment schedule, which carries none either.
- The installation table's column names are one list:
  `INSTALLATION_TABLE_COLUMN_LABELS` in `installationSchedule.ts`, read through
  `installationTableHeaders([...])`, which is where the unpriced customer copy,
  the priced customer copy, the Word quote and the rep's pricing panel print
  their headings from. A heading typed in each builder is how one column came to
  read "Site survey detail" in one document and "Survey detail" in the other. A
  table that prints two columns in one cell names them as a group
  (`["detail", "links"]` reads "Survey detail / Links") rather than inventing a
  wording, and Word's widths are keyed by the column, not the label, so renaming
  a heading cannot silently fall back to the default width. The equipment tables
  keep their own headings — their price column is `Unit price`, not
  `Unit rate` — because they are a different schedule.
- A template-driven proposal is priced on the template review page, not in the
  wizard: `templateProposalPricing.ts` keeps the two rate maps (equipment by SKU,
  installation by line id) under a storage key per template, and
  `templatePricingDraft` puts them on the template's wizard defaults before
  `exportProposalDocx` runs. Both routes therefore hand the document builder one
  draft shape. The template's quantities stay in the room schedule, so
  `ProposalBomPricing` renders its quantity column as text when no
  `onQuantityChange` is passed. The `wm-proposal-bom-*` rules also cover the
  templates route because that shared panel is mounted there. Before issue the
  page has to name the commercial holes, not only count them:
  `templatePricingSummary.unpricedLines` carries one entry per rate key (a SKU
  or an installation line's own `installationLineLabel`), deduped because two
  rows sharing a SKU share one price cell, and both the readiness block and the
  export summary read that list — the readiness block shows four of each kind
  (installation lines must not be pushed out by a long equipment schedule) plus
  a count of the rest pointing at Pricing, and `unpricedText` names three per
  schedule before "and N more" so a long schedule stays one sentence. Unpriced lines never block the export;
  the document prints TBC and holds the total, which is why the page says so
  beside the lines instead of disabling the button.
- The template Proposal tab is a staged pre-issue walk, not one long page:
  `templatePreIssue.ts` owns the four stages (blockers, unpriced lines,
  assumptions, issue), each stage's status line, the stage the tab opens on
  (the first with work, in that order) and the command bar's one sentence.
  `TemplateProposalPanel` renders one stage at a time — the others stay mounted
  with `hidden`, so their inputs are still there for the stage that shows them —
  and the actions sit in the command bar above the walk so the document can
  leave from any stage. Only a blocker disables them: an unpriced line prints
  TBC and holds the total, not the button. Survey warnings and their cells are
  the assumptions stage's, so a test that records those cells clicks
  `template-preissue-assumptions` first; change the order, the statuses or the
  bar's wording in the lib, never in the panel's markup.
- The walk remembers where the rep left it: `templatePreIssuePass.ts` keeps the
  last stage per template in localStorage, so leaving the Proposal tab (which
  unmounts the walk) and coming back reopens that reading instead of the first
  stage with work. The remembered stage outranks that rule even once its stage
  has cleared — the rep chose the reading, and an empty stage says so in its own
  line — while a value that names no stage of the walk falls back to
  `templatePreIssueInitialStage` through `templatePreIssueResumeStage`. Opening
  the walk writes nothing; only a move does, and the rail and the Back/Continue
  buttons share one `chooseStage`. The panel is a thin wrapper that keys the walk
  by `template.id`, so switching templates in place opens the other template's
  own remembered stage rather than inheriting the previous one. It is view state
  and stays out of the template; tests that move the walk clear
  `localStorage` first. The reading also rides in the address as
  `?stage=<stage>` (`templatePreIssueStageSearch`), written with a replace
  navigation on each move so a rep can send the walk they are looking at. A
  link's stage outranks the stored one, and the template page's first-render tab
  follows the param, so a shared address lands on the Proposal tab rather than
  Room design; leaving that tab drops the param, because an address naming a
  stage nobody can see is one a reload would jump back to. A param that names
  no stage of the walk is ignored and the stored stage or the opening stage
  applies. The rail's own Copy link action (`TemplatePreIssueShare`) composes
  that address from the stage the rail is showing rather than reading the bar,
  because the opening stage is never written into it: opening the walk is not a
  choice, but sending the reading is.
- Installation rates start from one saved rate card, not from the last
  proposal. The card lives on the signed-in rep's workspace, not in the browser:
  `data/installationRateCard.ts` reads and writes `/api/wingman/workspace/rate-card`
  (served by `server/workspace-rate-card.mjs`, a side-car store keyed
  `workspaceId:userId` like the site survey sync), so the baseline follows a rep
  to another machine while two reps in one workspace keep their own. A browser
  card written before the move is uploaded on the first successful workspace
  read and the old key dropped; the workspace card wins if it already has rates.
  Both pricing surfaces (the wizard's Commercial step and the template review
  page) read the shared store through `useInstallationRateCard` and seed absent
  lines with `seedInstallationRates`, so only this job's exceptions have to be
  typed — a card arrives asynchronously, so seeding happens when it lands, keyed
  on its `updatedAt` so a save from the same page is not re-applied. The
  template page loads its draft before applying the card (`TemplateReviewPage`
  declares the load effect first), because a card already cached in the session
  is ready on the first render and the load would otherwise replace the draft the
  card had just seeded. Seeding
  fills only keys the draft does not have — a cleared cell is a deliberate
  unpriced line and is not refilled — and a save merges on the server so a blank
  cell cannot erase a baseline another proposal still needs. A read or write
  that fails keeps the last card and puts the reason in `rateCardError`, which
  the panel shows in place of the "save these rates once" promise.
  `installationRateCardNote` says which card and currency the numbers came from;
  a currency mismatch is stated, never silently converted. A line still holding
  the card's rate is marked `From rate card` with a one-tap `Clear`:
  `installationRateIsSeeded` is derived from the card and the cell rather than
  stored, because the seed copies the card's text — a typed-over rate stops
  matching and a cleared cell is the deliberate unpriced line, so the mark and
  the one-tap clear survive a reload without a provenance field on the draft.
  That survival depends on storage keeping the empty cell: the wizard draft is
  written as typed, and `priceMap` in `templateProposalPricing.ts` keeps an
  emptied cell as `""` for the same reason — a normalizer that dropped the key
  would make the line look untouched, and the next visit's seed would quietly
  reprice it from the card with no hint to explain why.
  Clearing is reversible: `installationRateCardHint` returns the card's number
  for an unpriced line that the card still rates, and the panel shows it beside
  the empty cell with a one-tap `Use` that writes the card's text back. The hint
  is not a price — nothing prints or counts as priced until it is used, which is
  why the readiness list still names the line while the hint is showing. When the
  card's currency is not the proposal's, `installationRateCardHintText` appends it
  (`120 GBP`) and the `Use` title says so, because using the hint is what puts the
  number on the quote; only the number reaches the rate cell. Clearing several
  lines is one action, not several: `installationRateCardRestorations` returns the
  cleared card-rated lines as one map and the panel hands it back through
  `onRestoreRates`, which both pricing surfaces merge into their draft in a single
  write — restoring line by line would read the same draft each time and keep only
  the last. A line typed for the proposal is never in that map, and the action
  disappears once nothing is left to fill. The card is not a
  draft: overrides stay on the proposal (`installationUnitPrices`), which is why
  the panel takes the card and the save action rather than writing storage
  itself. The template review page's "Still to price" block
  (`TemplateProposalUnpriced`) carries that one tap for the page: a rep told which
  lines print as TBC fills the ones the card rates without going down to the
  table, and the pricing table below it is handed no `onRestoreRates`, so the
  page has one restore action rather than two buttons with one name
  (`template-readiness-restore-card-rates`). The wizard keeps its own on the
  Commercial step's table and on the readiness checklist, which are separate
  steps rendered one at a time, so each screen still offers exactly one.
  `TemplateReviewPage` and `TemplateProposalPanel`
  hand the block the same map and the same write, so a tap in either place fills
  the same cells. The same restore also sits on the wizard's readiness checklist, in
  `ProposalReadinessList`: `PROPOSAL_PRICING_GAP` is the exported wording of the
  item that reports unpriced lines, so the fix is attached to the sentence the
  rep is reading rather than matched by hand in the view, and it computes its map
  from the card and the draft exactly as the panel does — an unpriced equipment
  SKU is not the card's to fill, so the item stays put after the tap. The
  checklist lives in that component so the wizard page entry stays inside its
  line-count allowance. It also tells two kinds of unpriced line apart: a cell
  the draft has no entry for is a line nobody reached, while a cell that is
  present and empty is a decision, and `installationRateCardClearedLines` names
  those. `installationRateCardExceptionText` says so under the item's own
  sentence (`data-readiness-exception="deliberately-unpriced"`), because a
  cleared line read as forgotten work is what gets priced back in by the next
  person. The count of what one tap would clear sits beside the shortfall for
  the same reason it is on the button: `installationRateCardRestoreText` writes
  it under the gap sentence (`data-readiness-restore-count`), because a rep
  choosing between the card and their own numbers decides before pressing the
  control, not from its label. The mark is an annotation, not a gate: the
  restore action stays, since a deliberate exception is still reversible. A present-but-empty cell is what
  carries that meaning everywhere — `seedInstallationRates` refills only absent
  keys, and the wizard and template review drafts keep an emptied cell as `""`
  rather than dropping the key. A seeded or restored rate from a card written in another
  currency is an export warning, not a blocker:
  `installationRateCurrencyWarnings` (`proposalExportValidation.ts`) reads
  `installationRateCardCurrencyMismatches` over the schedule's own line ids, so
  only a line still holding the card's text is named — a rate typed for this
  proposal, or a cleared one that prints as TBC, is not. It reaches the gate
  through `validateProposalExport`'s `pricing` argument, which both pricing
  surfaces pass, and it names the lines, the card's currency and the proposal's
  plus the two ways to clear it. The cell itself carries the same fact while
  the mismatch stands: the seeded rate reads `From rate card`, and the line under
  it — `installationRateCardCurrencyMismatchText`, rendered in
  `wm-installation-currency-mismatch` — names both ends ("Currency mismatch: card
  rate in GBP, proposal in USD"), with a title and the row's
  `data-currency-mismatch` saying the same. Both currencies are in the visible
  text, not only the tooltip, because a rep sent to the table by the gate's
  sentence has to find the cell that sentence is about. The panel's injected
  headings, note and actions carry their written hooks (`wm-installation-rate-card`,
  `wm-installation-rate-card-actions`, `wm-installation-seeded`), so the sheet's
  own rules style them instead of reading as dead CSS.
- Equipment pricing has one rule, `bomPricingTotals` / `unitPriceValue` in
  `proposalPricing.ts`, read by the Word equipment table and the template review
  panel alike. An unanswered cell ("", spaces) is unpriced, not a zero price, so
  the panel cannot call a line priced that the document still prints as TBC.
- Printed schedules repeat their `thead` on every page via
  `display: table-header-group`, so a long equipment or cable table stays
  labelled; body rows stay unbreakable.
- The display schedule's mass and mounting clearance come from the same
  `wallPhysicalSize` that sizes the panels: mass is panel (or LED canvas) area ×
  a stated planning mass, and the opening is the wall plus a 100 mm service
  margin each side. A projection screen keeps the derived opening but reports
  no mass, because mass follows its surface, not its outline. Change the
  constants in `wallPhysicalSize.ts`, never the schedule strings, and let the
  DOCX `fittedWidths` share the table width when a column is added. The cable
  column's key prints under the schedule in both exports from
  `WALL_SURVEY_COLUMN_KEY` (`data-wall-cable-key` in the HTML, the private
  `cableKeyParagraph` in Word), only when the transport column is there, so the
  customer never meets an allowance or a limit with no legend.
- Word rows are built through the private `tableRow` helper in
  `proposalDocxExport.ts`, which always sets `cantSplit`: a bare
  `new TableRow` would let Word cut a cell in half across a page. The printed
  sheet gets the same guarantee from the print rule on `tr, td, th`, so a
  schedule behaves the same in both outputs.
- The Word export already carries its own running header, page-number footer
  and `tableHeader` rows, so page setup belongs to the HTML builder, not the
  DOCX.

## Compare feature

- `CompareConfidenceTier` (tones from `compareVerdictTier`) is the single
  source of truth for verdict tone. Surfaces must derive color/emphasis from
  the chip's tone (CSS via `:has(.compare-confidence-tier--X)`), never from
  the status class: "Evidence pending" pairs with status class `no-match`
  but must stay amber.
- The verdict-lead status class lives on the SECTION; the banner is the header
  element inside it. CSS matching both needs a descendant selector
  (`.compare-verdict-lead--X .compare-verdict-lead__banner`), not a compound.
- Compare/verdict styling lives in `wingman-workflow-theme.css` scoped under
  `html[data-wingman-route="compare"]`.
- The page entry is being emptied into `src/wingman2/pages/compare/` the way the
  proposal wizard was: pure logic leaves, React stays. `compareProductTaxonomy`
  owns the tag vocabulary and its class/role/transport inference,
  `compareProfileSignals` the small profile predicates both layers ask,
  `compareCompetitorFacts` the fact sheet built from a competitor profile,
  `compareComparisonFacts` the port/feature comparison and core fact table,
  `compareCandidateScoring` the scored-candidate shape (score, verdict, matched
  lines, gaps, blockers, dependencies) behind `scoreProduct` and
  `applyCompareEquivalenceGuards`, `compareCandidateBuilders` the two
  catalogue shortcuts that answer a brief directly — the AVoIP endpoint pair and
  the 18Gbps 8x8 HDBaseT matrix — and `compareRunLookup` the run/lookup
  orchestration: the competitor SKU catalogue and its suggestions, whether a
  typed SKU is held locally or needs research, the plan for one live lookup and
  what a settled or thrown one means, the state a run starts and a reset leaves,
  and the reviewed live result as a candidate and a merged fact sheet. The page
  keeps every `useState` and the effect that issues the request (the sequence
  guard is a ref there), and applies what those functions return. `compareTypes`
  holds the shapes the modules share, so a rule can be imported without pulling
  the page in.
  Nothing re-exports through the page: a consumer imports the module that owns
  the rule, and the one test that read `assessCompetitorConnectorCoverage` off
  the page now reads it from `compareComparisonFacts`. The builders take the
  WyreStorm lookup as an argument (`WyrestormProductLookup`) because the page
  swaps its catalogue for the real one after load and keeps owning that mutable
  list; their test passes its own lookup to pin the SKUs each shortcut means and
  to prove a brief that is not an 18Gbps 8x8 HDBaseT matrix stands down without
  touching the catalogue.

## Backend API (`server/`)

- `resolveMatch` / `liveLookup` return HTTP 200 with `{ok:false, error}` when
  no match is found — no-match is a business outcome, not a 400. The
  permission gate (401) fires before handler status logic, so handler changes
  never affect the 401 contract.
- `/api/compare/match` and `/api/compare/analyze` are dead endpoints (no
  callers in `src/`); they use the standard `{ok:true, ...}` / `{ok:false,
  error}` envelope and remain protected by API contract tests. The historical
  Express-style `createCompareRoutes` export has been retired.
- `resolveMatch` rarely returns the `ok:false` branch in practice: unknown
  models still resolve `ok:true` via synthetic fallback. Force the failure
  branch by importing `resolveCompetitorMatch` directly with empty
  manufacturer/model.
- `parseJsonBody` enforces `MAX_JSON_BODY_BYTES` (413); a CSRF double-submit
  guard exists but is inert until `WINGMAN_CSRF_ENFORCE=true`.
- A development server holds a real workspace session instead of a browser-side
  stand-in. `POST /api/wingman/auth/dev-session`
  (`handleWingmanAuthDevSessionPost`) creates one fixed local owner
  (`dev@wingman.local`, workspace `Wingman Local`) in the API's own store and
  answers with the ordinary `wingman_session` cookie, so dev project sync runs
  through the real endpoints and lands in `data/runtime`. It refuses a
  production process, a process whose storage mode is not `file` (a dev server
  pointed at a shared database must not seed an account into it) and a request
  that did not arrive from this machine, so the permission is the
  environment's, never the request's. Settings → Workspace offers
  `workspace-local-dev-sign-in` only under `import.meta.env.DEV`; choosing it
  writes `wingman:development-workspace`, and `restoreDevelopmentWorkspace`
  (`main.tsx`, before the first project hydrate) restores the session on a
  later load whose cookie has expired. A browser that never chose it — a
  Playwright spec, the e2e smoke check — is left signed out, which is why the
  choice is remembered rather than made on every load. Signing out forgets it,
  or a reload would sign the rep back in. Nothing fakes a session in the
  browser any more: the `installWingmanLocalSessionFallback` fetch shim is
  gone, and `.env.example` ships
  `VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=true` so a fresh checkout that
  copies it to `.env` syncs in dev; the dev workspace above is the way in, and
  a browser that has not chosen it keeps the local-mode message. A production
  build keeps the flag in `.env.production.example`, and the local (untracked)
  `.env` can still set it either way.
- `/api/wingman/agents/wall-survey-scan` reads a photographed measurement
  worksheet. It requires `links` (the printed rows) as well as the image, so a
  transcription can only name links the design has; the client re-checks that
  and reports unread rows by id instead of clearing runs. It needs
  `GEMINI_API_KEY` (mock mode is explicit-only) and returns an empty scan with
  confidence 0 when the model call fails, rather than invented metres. The
  builder's development switch (`videowall-survey-photo-mock`, rendered only
  when `import.meta.env.DEV`) sends `mock: true`, and the agent answers it with
  the same `deriveWallSurveyScan` sample, whose summary says the development
  sample was asked for rather than blaming a missing key. That permission is
  the server's `NODE_ENV`, never the request alone: `getAgentConfig().requestMock`
  is false in production and the agent refuses so a deployed server can never
  let a browser swap a transcription for sample data.
- `/api/wingman/agents/vision-context` — the site-photo reader — carries the
  same switch: `SiteSurveyPhotoCapture` renders `site-survey-photo-mock` only
  when `import.meta.env.DEV`, and `analyzeSiteSurveyPhoto(file, { mock })`
  threads it into BOTH reads it makes (the attachment context and the
  structured site-survey extraction), or a walkthrough would mix a sample with
  a model. The agent answers `deriveVisionContext({ requested: true })` on a
  development server and refuses in production with the wall reader's rule. Its
  sample is shaped like a real answer — attachment kind, observations,
  locations, equipment, cables and the room notes — because the checklist
  reviews and applies it, not just prints it; the unrequested fallback stays
  the empty "unclear" context, which is what an explicit
  `WINGMAN_AGENT_FORCE_MOCK` server still answers (that mode wins over the
  switch, as it does for the worksheet reader).
- A worksheet photo never changes the design by itself. `parseWallSurveyScan`
  returns every usable row as a reading with its own confidence and reader
  note, and the panel applies only the ids a rep leaves accepted; a rejected
  row keeps both its recorded run and its install detail. Confidence tones
  (high ≥ 80%, medium ≥ 50%) describe reading legibility, not transport risk.
  A rep corrects a doubtful row in the list itself: `editWallSurveyScan` builds
  the applied scan from the read one plus the typed cells, so an emptied run box
  drops that row's value (the design keeps its own run) rather than clearing it,
  and a corrected install cell replaces only that field. The read scan is left
  untouched for the record, which keeps a corrected row's read run as
  `readMetres` beside the one that landed. A link with no run in the reading
  still needs a row when the rep has one: the review list gives every unread
  link — and every link the sheet left blank — its own run and install cells
  (the third argument to `editWallSurveyScan`), in separate groups so a blank
  cell is not mistaken for a failed read. One apply settles the read rows and
  the typed ones without leaving the list; a blank row left empty keeps the
  design's own run. A typed row is marked `typed` and carries no confidence; it
  leaves its list only once its run lands, and a typed row for a link the photo
  did read is a correction rather than a second reading of that link. A link the
  photo saw at all (even with no run) is not repeated as a typed row — its read
  row is where the run is typed.
  Applying the rows also writes `WallRequirements.surveyReview`
  (`wallSurveyReview.ts`): every offered row with the run it was read at, its
  confidence and the rep's `accepted`/`rejected` decision, plus `reviewedAt`,
  `photoCount` and the transcription confidence. It travels with the design
  (draft, saved summary, project copy) rather than the panel, so the saved wall
  can account for a cleared row the design does not carry. The builder passes
  `wallSurveyReviewAuditNote(review)` as `saveVideowallToProject`'s
  `reviewNote`; the command appends a `wall-survey-review` audit entry when no
  entry carries that note, so a re-save adds none and a later review with the
  same counts still adds one. The review stores the hand-typed runs the apply
  bar flagged as `flags` — `{ id, label, metres, allowanceMetres }`, not the
  warning sentence — handed in through `wallSurveyReviewFrom`'s last argument,
  so the entry quotes `1 typed run outside the printed allowance (Panel 1: 20 m
  against ≈5 m)` beside the counts. `wallSurveyReviewFlagText` is the one
  wording the bar, the status and the trail print; the note names three and
  counts the rest, and `normalizeWallSurveyReview` keeps a flag only while its
  accepted row survives, so a rotted draft cannot quote a run the design
  dropped. A paper sheet is recorded the same way: the
  transport panel hands `wallSurveySheetAuditNote(sheet, plan)` to the builder
  (named runs, plus any cleared links and install lines, and the import stamp so
  a re-import is a second event), the builder keeps the notes until the design
  saves, and `saveVideowallToProject` writes them as `wall-survey-sheet` entries
  — deduped by action and detail, so re-saving passes them again harmlessly.
  `VideowallTransport` reports each import through its `onSheetImported`
  callback, which is how the builder receives those notes. Those entries are
  read back by `wallSurveySheetImports` (`wallSurvey.ts`), which sits beside
  `wallSurveySheetAuditNote` so the note's wording has one owner, and
  `WallSurveySheetImports` prints each import's runs — one `appliedRunText` line
  per link, plus the import stamp — beside the photo review on the project's
  Requirements panels, so a rep checking a length does not have to open
  Activity. A sheet that carried only install detail says so instead of drawing
  an empty list, and a project with no imported sheet renders no panel. Waiting for the save
  is deliberate: the trail describes runs the project now holds, and a sheet
  imported into a wall nobody saved must not leave an entry claiming them. Picking a card or Start again drops the pending notes, because
  they name the previous wall's links. Every wall entry carries
  `scope: "videowall"`, which `AuditLogPanel`'s `SCOPE_CONFIG` labels `Video
  wall` with the nav's own `Monitor` icon, so the label lives there and not on
  the entry. The map is keyed by `AUDIT_SCOPES`, the one list of scopes the app
  writes — recommendation, bill of materials, the decision-integrity scopes
  (`declining` reads `Scope conflict`, `unsettled` reads `Open decision`) and
  design projects included — so a new scope fails the typecheck until it has a
  name and an icon, and a test renders every entry on it. `check:audit-scopes`
  (`verify:contract`) closes the other half: it reads `AUDIT_SCOPES` from the
  panel and fails any `scope: "…"` written on an audit entry (an object that
  also names an action and an actor) that the list does not label, so a trail
  type cannot ship as a raw key even when the typecheck is not the tool
  running. The scan reads literals only, so the runtime fallback stays for two
  cases it cannot see: stored data written by a version that did not know a key,
  and a scope a variable supplies.
  The note is built in the lazy builder route on
  purpose: importing the review model from the command layer pulls it into the
  eager chunk and breaks the `initial:js` budget. A discarded reading records
  nothing; `normalizeWallSurveyReview` drops rows with no id or decision so a
  rotted draft cannot invent one. The project record reads the same rows
  through `wallSurveyReviewFromSummary`, which resolves the stored wrapper and
  plain requirements alike; `WallSurveyPhotoReview` mounts that read-only table
  in the project detail's Requirements section and renders nothing when the
  design carries no usable review. That table marks the runs a flag names: the
  row whose hand-typed length fell far from its link's printed allowance prints
  the same numbers the trail does (`wallSurveyReviewFlagMeasure`), under the run
  it belongs to, so a reader sees which number was in doubt without matching a
  note back to a link. A review is also a list-level flag with two
  states. `projectSurveyClearedFlag` (`wallSurveyReview.ts`) reads the saved wall
  and counts the rejected rows, and `projectSurveyReviewedFlag` states the
  opposite fact for a review that kept every row — same saved review, same
  sentence shape, no count, because nothing was cleared. Both are rendered by
  `SurveyReviewChip` on the projects page, the expert dashboard (in the project
  topline beside the status chip) and the focused dashboard's recent cards: the
  cleared state is warning-toned, the clean review is neutral and unstyled by
  the chip's own `[data-survey-review="reviewed"]` rule, which drops the fill
  and border weight so a clean review is visible without reading as an alarm —
  and without being indistinguishable from a wall nobody surveyed. A design
  with no applied review still renders nothing. The projects list can narrow to
  the flags that still mean work: `projectSurveyNeedsAttention` is the one rule
  (cleared rows, or a clean review past `SURVEY_REVIEW_STALE_DAYS`) behind the
  "Survey needs attention" toggle, which narrows whatever the ownership tabs and
  search have already chosen rather than being a fourth tab, counts within that
  same ownership scope, and says so — with a way back — when the filter empties
  the list. A project nobody has surveyed is not in that count: the filter
  answers which surveys need a rep, not which rooms lack one. Both states print how long ago
  the review happened: `wallSurveyReviewAge` says it in words ("today", "3
  weeks ago", "last year") and calls it stale at `SURVEY_REVIEW_STALE_DAYS` (90),
  one threshold every list reads, so a survey cannot look current on one surface
  and old on another. The age is a separate `wm-status-chip-age` span beside the
  state, not inside its label — the label is what the state was decided as, and
  tests match it exactly. Past the threshold a clean review trades its tick for a
  clock and takes a dashed edge (`data-survey-review-age="stale"`) rather than
  the cleared state's amber: an old survey is a prompt to re-confirm the room, not
  an alarm about a cleared row. A hairline alone disappears on a card at a glance,
  so the clean stale chip also takes the app's slate wash (`wm-safety-badge--stale`
  is the same treatment) and its age span reads `5 months ago · re-confirm` — the
  wash is scoped to `data-survey-review="reviewed"` so an old chip that cleared
  rows keeps the amber alarm, and only the clean state borrows the follow-up word.
  The exact stamp stays in the title, which also says what to do about a stale one. The chip is itself the way in:
  it links to `?view=confirm#wall-survey-review` and sets that project active,
  so the rows it counts are one click from the list. Its class list comes from
  `statusChipClassName` (`StatusChip.tsx`) because a chip-shaped link has to
  answer to the chip's own tokens; the variants are module constants rather
  than a literal inside the class expression, which `check:unstyled-classes`
  would read as an unanswered class. Being a link, the chip cannot sit inside
  another one: the focused dashboard's recent card keeps its own destination as a
  `wm-guided-recent-hit` overlay and raises the chip above it, while the projects
  card and the expert dashboard's topline already place the chip outside theirs.
  The chip lands on the row it counted: `WallSurveyClearedFlag.rowId` carries the
  first cleared row's bare id and the address is
  `?view=confirm#wall-survey-review-row-<id>`, so a list link opens the review at
  the decision instead of at the table it is somewhere inside. A clean review has
  no cleared row and links to the panel. The Activity timeline renders the same
  address rather than its own scroll: `AuditEntryLinks` composes
  `projectAnchorHref(project.id, anchor, row)` from `wallSurveyClearedLink`
  (the panel plus its first cleared row) and `wallSurveyReviewFlagLinks` (one per
  flagged run, labelled with the clause the entry prints, `Panel 1: 20 m
  against ≈5 m`), so an entry's way in is an ordinary `?view=confirm#<panel>-row-<row>`
  link like the ones the chips copy. `useProjectAnchorJump` is the page's one
  reader of that hash — it opens the section, scrolls the row and focuses the
  panel — which is why there is no bespoke scroll hook to keep in step with it:
  the timeline, a survey chip and a pasted address all land the same way. A
  doubt the trail records can therefore be checked against the recorded decision
  instead of taken on trust; a flag whose row the rep cleared has no link,
  because that number never landed. Only the newest `wall-survey-review` entry is decorated — the
  project keeps one review, so an older entry has no rows of its own to open —
  and a review that kept every row offers no link at all. `AuditLogPanel` stays
  presentational: `entryAction` lets the page decide which entries have
  somewhere to go.
- The transport trail is joined to the wall's links the same way. A wall entry
  names links by the wall's own label, never by id — the sheet note prints
  `Panel 1: 4 m`, the review's flag clause `Panel 1: 20 m against ≈5 m`, and
  `recordWallInstallDetail` resolves the ids it recorded through the transport
  plan, naming three before `and N more` — because a label is what the reader
  finds on the drawing and in the table. `wallTransportReviewEntryLinks`
  (`wallTransportReview.ts`) takes the plan the page builds from the saved wall
  (`wallTransportRequirements` → `wallTransportPlan`), so the trail only links
  what the transport table also lists: a sheet entry lends the run clause it
  prints, an install-detail or review entry lends the link name, and a name the
  saved plan no longer has (the sheet was imported again, or the design changed)
  is left unlinked rather than pointing at a row that does not say it. The
  destination is the `WallTransportReview` panel, registered as
  `wall-transport-review` in `projectAnchors` so `projectAnchorHref` can build
  an address for the panel and its rows; the entry's link names
  `wall-transport-review-row-<link>`, which `useProjectAnchorJump` opens,
  scrolls to and focuses, giving a review or install-detail entry a place to
  land even when no survey row was flagged. The
  panel keeps one row per physical link (`wallSurveyRows`, never a folded
  group) — that is what makes a row a jump target — and is read-only: the runs
  are the builder's, and this is what a rep checks a quoted allowance and limit
  against.
- The Projects navigation entry carries that count, so a rep sees there is
  survey work before opening the list. `projectsNeedingSurveyAttention`
  (`wallSurveyReview.ts`) filters the shell's projects through the same
  `projectSurveyNeedsAttention` rule the cards use, and `AppShell` renders the
  number as a `wingman-nav-attention` pill only for the projects route and only
  above zero — no badge is the answer for a settled list, and a project nobody
  has surveyed is not in the count. The number rides in the link's own
  `aria-label` ("2 surveys need attention") while the pill is `aria-hidden`, so
  a screen reader hears the work once instead of twice. The shell reads the
  stored projects through `useProjectStore`, which hydrates once per session, so
  the badge follows a saved wall without the navigation fetching its own copy.
  That rule is imported on demand inside an effect rather than at the top of
  `AppShell`: the shell is on every route, and a static import would put the
  review model in the eager chunk. The cost is that the badge paints a tick
  after the navigation, so a test that reads it has to settle the import first.
- A stale clean survey is renewed where it is flagged. `projectSurveyReconfirmDue`
  is the stale half of `projectSurveyNeedsAttention` — a reading that kept every
  row and is past `SURVEY_REVIEW_STALE_DAYS` — and `SurveyReconfirmAction` is the
  one tap that renews it, mounted beside the chip on every card that raises the
  doubt: the projects list, the dashboard's recent-project card and the focused
  dashboard's card. It renders nothing for any other state, so a card cannot
  offer a renewal it has no date for. The action calls
  `reconfirmWallSurveyReview`, which stamps `surveyReview.reviewedAt` with today
  and appends a `wall-survey-reconfirm` audit entry; the rows, the runs they
  applied and the design stay as they were, and `videowall.savedAt` does not
  move, because the wall was not re-saved. The card re-reads the project from the
  store afterwards, so the chip beside the action turns current ("today",
  `data-survey-review-age="fresh"`) and the action removes itself — that loop,
  not the save alone, is what the dashboard test pins. Because the chip is a
  link, the action is a sibling and never inside it; the focused card's own hit
  area is an overlay link, so `wm-guided-recent-reconfirm` carries the same
  raise as the chip there. A review that cleared rows is work, not a date to
  renew, so it gets no action, and a second press at the same stamp is not a
  save. The command does not judge staleness itself — importing the review model
  into the command layer would pull it into the eager chunk — so the card decides
  when to offer the action and the command only checks the review's shape.
- The project page's address is one contract: `?view=<section>` names the
  section on screen, `#<anchor>` names a panel inside it. `projectAnchors.ts`
  owns both halves — the anchor table and `projectAnchorHref` — so a link (the
  survey flag included) builds its address from that registry instead of
  spelling out a section, and `useProjectAnchorJump` reads the hash back, opens
  the section the panel lives in and lands on the panel (or the row the hash
  names). The section list is derived, not kept beside the table:
  `projectSectionsFrom` takes one section per `section` its panels name, in
  first-panel order, labelled by that panel's `sectionLabel` (falling back to
  the panel's own name where the two readings agree), and `projectDetailSections`
  is that derivation. The section's *id type* is derived too:
  `ProjectSectionId` is the union of the `section` values those entries name,
  which is what makes a section conditional safe — `useWorkflowPage` is generic
  over its page ids, so the page reads `?view=` back as `ProjectSectionId`, and
  an `activeSection === "…"` branch naming a section no panel renders is a type
  error rather than a screen a reader never reaches. Read the id off the
  registry, never a hand-typed literal; a hand-edited address can still carry
  any string, so the reader keeps the first section when the value names none.
  A new panel therefore brings its section with it, and the navigator reads
  `projectDetailSections` itself rather than being handed a list — there is no
  second list to forget. Renaming a section means editing the
  `sectionLabel` of the panel that opens it, because that is where a rep's word
  for it lives. Every section has a panel anchor, so a section link
  lands on the section's own panel rather than whatever is listed first;
  `projectSectionAnchor` is that default, and the survey review is the second
  anchor in Requirements. A hash may also name one row of a panel —
  `#<panel>-row-<row id>` — which `projectAnchorTargetFromHash` resolves against
  the registered panel, so a row never needs its own registry entry while the
  row id format lives in one place (`anchorIds.ts`, which the survey review's
  table rows are named with too). `useProjectAnchorJump` scrolls that row into
  view and focuses the panel, because a table row cannot hold focus, and falls
  back to the panel when the row has gone since the link was copied. An anchor
  is a panel's `anchorId`, which makes it a labelled region with
  `tabIndex={-1}`: that is what gives `scrollIntoView` and `focus` somewhere to
  land, and the hidden `wm-project-detail-anchor` spans this replaced are gone,
  so an anchor must never go back to being an invisible element. Panels render
  through `ProjectPanel` (`pages/project/ProjectPanel.tsx`) rather than
  `SectionCard` directly: it hands the card the registry anchor as its
  `anchorId` and derives the panel's own `CopyPanelLink` from that same id, so a
  panel cannot ship with an address and no way to share it, and a panel the
  registry does not name (the worksheet-import list) gets an ordinary card with
  no action. The landing restores the reading as well as the place: opening the
  section writes `?view=`, so the navigator chip for the landed panel reads
  `aria-current="page"`, and the panel itself takes focus — both hold for a
  hash-only address and for one whose query names a different section. A hash
  the page does not render is ignored rather than guessed at (it may belong to
  another route), and the landing looks for the panel again for a moment
  because it can arrive with the project's own data. `useWorkflowPage` writes the section with the hash kept,
  so switching sections does not strip the panel from the address; the reader
  drops the hash once they leave that section's panel, because an address that
  names a panel nobody can see is one a reload would jump back to. Each section
  chip in `ProjectWorkflowNavigator` also carries `CopyPanelLink` in its compact
  form: the section's own anchor is its address, so the link and the action
  cannot disagree about where the section starts. It sits beside the link, never
  inside it (a button cannot live in a link), copies an absolute address and
  does not navigate — sharing a section is not reading it. The caller passes
  `label` to name the section in the accessible name, because the panel names
  the registry already uses would otherwise collide with the chips.
- A hand-entered run is checked against that link's printed allowance before
  it lands: `runAllowanceGap` (`videowallTransport.ts`) is the rule — twice or
  half the allowance with a 3 m minimum gap, so a 2 m rack allowance does not
  nag at 4 m while 20 m against a 5 m wall run does — and `runAllowanceWarning`
  is that answer in the sheet's words. It never blocks the value,
  because a real survey may legitimately differ. The transport table itself
  reads the same gap through `measuredRunWarning`, under the measured-run cell
  it concerns (`data-measured-run-warning`, described by the input), so a far
  run is visible where it was typed and after a sheet imported it; its sentence
  names the measurement instead of a printed row, because the table's allowance
  is the design's estimate. Change the thresholds in `runAllowanceGap`, never in
  one surface's wording. In the photo review it is
  shown under the cell that will apply it — the typed rows and a scanned run the
  rep types over — and the reader's own untouched value is left to its
  confidence; the one list is `flaggedTypedRuns` (`wallSurveyScan.ts`), which
  the rows, the apply bar and the note after it all read, so the count can't
  disagree. The bar summarises every flagged row before the commit — the count
  and each row's run against its printed allowance (`1 typed run outside the
  printed allowance — Panel 1: 20 m against ≈5 m`) — and the post-apply status
  names the same rows in the same words, through `flaggedTypedRunText` /
  `flaggedTypedRunsText`, so the record of what landed carries the numbers the
  rep reviewed rather than only their count. That status is a list of clauses,
  not one string: the flagged names are their own clause so each can be a
  button that unfolds the stored review (`details.open`), scrolls to its
  `tr[data-survey-review-row]` and marks it `data-highlighted`, with the review
  panel taking focus because a table row cannot. A name is only a button when
  the stored review still holds that row, so the sentence never offers a jump
  that lands nowhere, and a prose status keeps its own full stop instead of
  gaining a second one.  Every applied run is named too,
  not just counted: the status after an apply is the shared `appliedRunText`
  list — one line per link (`Source 1: 4.5 m`), a corrected row marked
  `(corrected)`, a row that landed only for its install cell named without a
  run — because the bar listed those rows and a count cannot answer which two.
  `appliedRunsText` joins the same lines for the sheet's trail. A row the rep
  cleared is not in the list, because its run will not land; what did not land
  keeps one compact line beside the list (`1 rejected · still to type:
  display-1`), never a second sentence of counts. The list is a real `<ul>`
  (`videowall-survey-landed`, one `data-landed-link` per row) so a wall with a
  dozen links reads back line by line, and any other status message replaces it.
- The CSV import runs the same rule through `flaggedSurveyRuns`
  (`wallSurvey.ts`) and holds the whole sheet when any run is far from its
  allowance: the rows are listed with the run and the allowance, the status says
  nothing has been applied, and only `Import the sheet anyway` merges the runs
  and install detail, which then names the flagged links in the status. A sheet
  whose runs are all near their allowances still applies in one step, so the
  gate costs nothing on a careful survey; discarding the held sheet leaves the
  design unchanged.
- The worksheet's per-link install line (enclosure, mount, termination) is
  free text on `WallRequirements.linkDetails`, keyed by transport link id like
  `measuredRuns`. It round-trips through the CSV sheet and the photo scan; the
  CSV import reads the run at column 5 and the install cells after it, so a
  six-cell sheet exported before the columns existed leaves saved detail alone
  instead of blanking it. A folded transport row writes one install value to
  every member link. The proposal prints an Installation Detail table from the
  same map beside the display schedule, listing only links with a recorded
  value and the count left to confirm; the Word and screen exports build it
  from one `DisplaySchedule.install` model so both quote the same links.
- The worksheet also explains its own number columns, because the surveyor
  reads it with the builder closed: `columnKeyMarkup`
  (`data-wall-column-key`, one `data-column-key="allowance|limit|in-design"`
  entry each) prints between the writing note and the table's header row, so
  allowance reads as the length a blank box falls back to, limit as what the
  cable and transport carry, and in-design as the run the saved design already
  holds for reference only. `WALL_SURVEY_COLUMN_KEY` (`wallSurvey.ts`) is the
  one list of those words: the sheet renders it with its own capture hint
  (`sheet`, the "blank box keeps it" sentence), `wallSurveyCsv` writes the same
  three lines as `#` rows under the header — read past by
  `parseWallSurveyCsv`, so an exported sheet still imports — and the printed
  proposal prints them under the display schedule's cable column whenever that
  column shows. The words live with the number model rather than in the
  builder's help; a column renamed is renamed there, never on one surface.
