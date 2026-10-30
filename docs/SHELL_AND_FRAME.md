# Shell and page frame

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- The workspace is `display: grid` with `grid-template-rows: auto minmax(0,1fr)`,
  so the header row is the real header — which wraps to ~126px on a phone — while
  `--wm-topbar-height` still says 46px. Sizing `.wingman-app-main` as
  `calc(100vh - var(--wm-topbar-height))` under 980px therefore made the column
  80px taller than its own row, and the workspace clips: the last ~80px of a long
  page could not be scrolled to at all. That band held the end of Settings →
  Company's document defaults — Reset and the save confirmation — which is what
  the eight-field form made long enough to notice. The column fills its grid row
  (`height: auto`) instead, so the row measures the header rather than a variable
  guessing at it. Re-check a long page at 360×800 rather than a desktop width:
  the clipped band is invisible on a desktop.
- A page frame is 17px narrower than its host on every route, and that is
  `scrollbar-gutter: stable` on the app main reserving one scrollbar, not a
  missing padding. It keeps the layout from jumping between a short page and a
  scrolling  one, so do not "fix" the right gutter.
- The topbar names the page and then says what it is for: `activeLabel` in the
  label line and `activeSummary` in a line under it, both read from the route
  catalogue. The second line is what a rep reads without hovering, and it is the
  one that leaves easily, because nothing fails when it goes: the summary's rules
  are shared with `.wingman-section-help` and `small`, so an unwrapped class is
  not dead styling a gate would catch, and the only remaining place the sentence
  survived was the `title` attribute on the wrapper — reachable by a mouse and by
  nothing else. `check:app-page-style` holds both markers on the shell, which is
  how the missing one was found rather than assumed; the restoration is one span
  reading the value the nav tooltips already used, and the column the theme
  already declares for it (`grid`, 2px gap, 780px ellipsis) is what makes the two
  lines sit apart without a new rule. The dashboard route hides the pair
  (`visibility: hidden` on `.wingman-topbar-title`), so the home page's own hero
  is still the title it shows.

- `.wm-polish-hero` is a two-column grid (icon, copy), so a header written with
  three children puts its third — the action row — in the icon column. Settings'
  header is that shape, and `wingman-reference-global.css` declares the template
  once more with `!important` from 1024px, which is what beat the three-column
  rule for it: the Save / Print / Reset row stacked in a 49px strip at desktop and
  squeezed there on a phone, where "Print this page" broke across three lines at
  360px and Reset spilled out of the row. The grid now places that third child
  itself, in the one shared place a hero's template belongs:
  `.wm-polish-hero:has(> :nth-child(3))` is three columns from 981px, with a
  matching `:has()` companion beside the reference layer's `!important` template
  at 1024px (an important rule can only be outranked by another one, which is why
  the companion lives in that media block rather than in the page sheets), and
  below 981px `.wm-polish-hero > :nth-child(n + 3)` spans `1 / -1` so the row
  takes a line under the icon and copy. No page header states a hero template any
  more: the per-page `!important` and the tripled-class three-column rules that
  stood in for this are gone, and the only shape that enters the path is the
  three-child hero — the hub pages and Sales Helper mount icon + copy only, with
  their cards in a sibling section, so the template switch cannot reach them.
  A page still owns its row's internals, and Settings' `flex: 0 0 auto` buttons
  are what make a wrapping row move whole buttons rather than compressing one
  into a stack of words; the 360px row is then 340px wide with all three on one
  line. The current readings for the two headers are
  [the Settings hero](../reports/browser-readings.md#settings-hero) and
  [the Sales Helper hero](../reports/browser-readings.md#sales-helper-hero), which are
  where the columns, the row's box and the page host around it are printed.
  `assertHeroActionRow` in `tools/browser-smoke-check.mjs` holds the
  placement on every walk, at 360, 980, 1000, 1024 and 1280px: the three actions
  stay on one line with every button inside the header's own content box, and the
  row takes a line of its own at 360 and 980 with the header's whole width, while
  1000, 1024 and 1280 give it a third column. It reads the grid's own columns as
  well as the row's box,
  because a two-column hero puts the third child under the icon, where a 49px
  strip is too narrow for the buttons and they wrap — the one arrangement that
  measures as a row in the wrong place rather than a row that vanished. 1000px is
  measured because it is the only width the shared rule covers alone: above 1023px
  the reference layer's companion supplies the column and below 981px the row has
  its own line, so a walk at the named breakpoints would not notice the shared
  rule going missing. Re-adding a per-page two-column override fails it at 1000px
  ("The Settings hero's action row stacked its buttons at 1000px: Save at 218px,
  Print this page at 254px, Reset at 290px"), and so does dropping that rule,
  which is the regression it exists for — re-run by removing the `:has()` rule
  from the polish sheet and leaving the 1024px companion, which still fails at
  1000px with that sentence, since between 981px and 1023px that rule is the only
  thing giving the row a column. It measures through `vite preview`, so a stylesheet
  edit has to be built (`npm run build`) before the walk, or every width reads the
  previous bundle and a removed rule still looks green — which is how the first
  run of this check reported three columns at 1000px. The walk no longer leaves
  that to the person running it: `assertFreshBuild` (`tools/lib/build-freshness.mjs`,
  called before a preview is started) stops the run when the build in `dist/` did
  not  read the tree it would be measured against, naming the files and saying to
  run `npm run build`, so a stale run refuses in under a second instead of
  measuring.
  It answers that question with a **content-hash manifest the build writes**
  (`.dist-build-manifest.json`: `builtAt` plus a sha256 per input), not with file
  times. It is written *beside* `dist/`, never inside it, because everything in
  that directory is the site: the Dockerfile's `COPY --from=builder /app/dist` is
  what nginx serves, so a manifest in there publishes every path the bundle was
  built from. `buildManifestPath` names it after the output directory
  (`.client-build-manifest.json` for `--outDir dist/client`) so two builds do not
  overwrite each other and both stay outside what a server can reach; a spec in
  `build-freshness.test.mjs` pins that. Times were the first version and they answer a different question: a
  `git checkout` of an older branch or a copy that preserves an mtime leaves
  edited bytes looking older than the build, and a build that read none of an
  edit can still carry a newer timestamp — so an edit is caught here that a
  timestamp gate passes. `buildManifestPlugin` in the same module is registered
  in `vite.config.ts` and writes the manifest from its own `closeBundle`, so any
  `vite build` produces one, not just `npm run build`; it takes root and `outDir`
  from the resolved config, and it writes **nothing** when the build was asked not
  to write its bundle (`write: false`), because `check:init-order` builds the app
  in memory through that same config and a manifest from it would call a stale
  `dist/` current — the exact false green this record exists to prevent.
  Three differences refuse: `edited` (recorded hash no longer matches the bytes),
  `added` (a file the manifest never saw, so the bundle cannot have read it) and
  `removed` (a file it read that the tree no longer has). They are reported
  together, sorted by path, because they mean one thing to a walk. The input set
  is `index.html`, `package.json`, `public/`, `src/` and `vite.config.ts` plus the
  four env files Vite inlines into the bundle (`BUILD_INPUT_PATHS`,
  `BUILD_ENV_FILES`; `.env.example` is not one of them), and `dist/` is never one:
  Vite copies `public/` in preserving each file's own timestamp, so an August
  catalogue copy sits in today's build and reading it back would refuse forever.
  A green run opens by printing the build it read and how many inputs hashed to
  what it recorded, and a failure closes by naming the same build — `The failure
  above was measured against the build at 4f1a9c2e7b31, written
  2026-10-28T09:49:48.437Z from 1480 hashed inputs.` A pasted failure otherwise says
  what broke and not which bundle produced it, and two bundles disagree for that
  reason alone.
  The commit also goes on the CI run page, because the log is where nobody looks
  for it: a green Browser Smoke job said the built app renders, and "which build
  rendered" was several hundred measurement lines down. The walk appends
  `buildSummaryLines(bundle)` to `$GITHUB_STEP_SUMMARY` — a Markdown table of the
  manifest's own commit, `builtAt` and input count, with a `-dirty` suffix kept and
  its meaning spelled out, and "none — built where there is no `.git`" when the
  build recorded no revision — and it does so *before* the walk starts, since a red
  run is exactly when someone asks which build broke. Outside CI the variable is
  unset and nothing happens; a summary that cannot be written is printed as a
  warning and stepped over, because the file is a convenience and the walk's
  verdict must not turn on a runner letting it write there. `buildSummaryLines`
  lives in `lib/build-freshness.mjs` and is specced there (revision, dirty,
  no-revision, singular input, table shape), so the table cannot drift from the
  manifest the walk just accepted.
  A refused run writes the same page and a different answer, because a red check is
  read there before anyone opens the log holding the reason. `assertFreshBuild`
  attaches a `refusal` field to the error it throws —
  `{ reason: "stale-build", builtAt, revision, changed }`, or the reason alone for
  `no-build` / `no-manifest` — and the walk renders it through
  `refusedSummaryLines` before `process.exit(1)`, so the page describes the build
  the walk refused rather than reading the tree again, which could disagree with the
  reading that refused. It names the commit the refused bundle came from, its time,
  `N inputs changed since this build was made` and the files as a Markdown list
  (``- `edited` src/main.tsx``), bounded at both ends — the first ten and the last
  four, with `…N more withheld — the console prints every path that moved.` between
  them: a reader comparing them to their own diff needs the paths, and the console's
  indented excerpt is for reading in order. The two ends are the argument the failed
  assertion's quote makes, over a path-sorted list: a stale build whose `public/`
  data moved sorts every one of those additions before the edited `src/` file the
  page is opened to find, so a head-only ten showed where the difference started and
  stopped before the file that mattered. An excerpt that fits inside both ends is
  printed whole and says nothing about withholding. The two preconditions with nothing to name say
  so instead of printing an empty commit — ``none — there is no build in `dist/` to
  name``, ``none — the build in `dist/` wrote no manifest`` — and a `-dirty` build
  keeps its suffix and says the tree it read already had tracked changes on top of
  that commit, the one refusal where the listed files are later still. Refusal
  writes go through the same `writeRunSummary` as the accepted table, so an unset
  variable and an unwritable file behave identically on both. Probed by corrupting
  one recorded hash in `.dist-build-manifest.json`: the walk exited 1 with
  `edited: .env` in the log and the page holding the commit, `1 input changed since
  this build was made` and that one list item; the manifest was then restored and
  `assertFreshBuild` read the tree as current again. `build-freshness.test.mjs` pins
  both shapes, the two-ended excerpt (a 31-path change whose `src/` edit sorts last
  is still printed, with the withheld sentence between the halves, and a 14-path one
  is printed whole), the dirty wording and that the refusal's fields are what the
  page renders.
  A walk that starts and then fails replaces that section rather than adding one
  beside it. The accepted build's table is written before the walk, so a failed page
  used to hold two sections — two `###` headings and two `| Commit |` rows, the first
  reading as a green run's and the second repeating it — which named the build twice
  and made a red run read as two runs stapled together. `failedSummaryLines(bundle,
  message)` is now `buildSummaryLines(bundle)` with the assertion appended, so the
  two pages share one heading, table and sentence *by construction*: a row added to
  the passing page is on the failing one, and one manifest cannot describe the run as
  green against one commit and red against another. The walk's own message follows
  under `#### The walk assertion that failed`, quoted line by line — quoted rather
  than put in a table cell because a Playwright expectation carries what it expected
  and what it received on their own lines, and a cell would drop the half that says
  what the page did; the message is `error.message` rather than `error.stack`, so the
  page names the finding instead of pasting a call log. A walk that stopped with no
  message says so rather than quoting nothing, and the `-dirty` suffix keeps its
  meaning here too. The merge is the writer's half as well as the renderer's:
  `recordBuildOnRunSummary` keeps the exact text it appended and the failure path
  passes it to `writeRunSummary` as `replaces`, which removes that text from the page
  and appends the merged section in its place. It is matched as the text this run
  wrote rather than by heading, so another step's section is never touched; a page
  this run did not write, or one a later step rewrote, no longer contains it and is
  appended to instead. Probed both ways with a deliberately wrong expectation at the
  start of the walk and `GITHUB_STEP_SUMMARY` pointed at a file: with the
  replacement the page held one `###` heading, one
  `| Commit | 057813d2c983-dirty |` row and `#### The walk assertion that failed`
  under it, while the same run appending only (`replaces: null`, which is the
  pre-merge page) held two headings and the commit twice. With the wrong expectation
  removed, the green page still writes the accepted table alone — one heading, one
  commit row — so the merge changed only the red page. `build-freshness.test.mjs`
  pins the composition (the failed lines begin with the accepted lines) and that the
  failed page holds one `###` heading and one commit row.
  Quoted, but not unbounded. A whole-body comparison prints the document it expected
  against the one it received, and the page was quoting every line of it — thousands
  of characters of body text between the finding and the sentence a triager came
  for. The quote stops at `FAILURE_QUOTE_LINES` (24 lines) or `FAILURE_QUOTE_CHARS`
  (1,200 characters), whichever comes first, cutting the line that crosses the
  character ceiling rather than dropping it so a diff still shows where it began to
  differ, and one blockquote line names what stayed behind: `…778 more lines and
  37,119 more characters withheld — the whole assertion is printed in the job log.`
  Both counts are arithmetic on the assertion — its line count and length minus what
  was quoted — grouped so a six-figure number is readable, and nothing is said when
  everything fit: 1,200 characters is wider than the longest sentence the walk
  writes, so a rep-facing message still arrives whole and only a document comparison
  is cut.
  The tail is quoted too, and it is not a second helping of the head: the two ends
  answer different questions. The head shows where a difference starts; the last
  lines show how it ended — Playwright's `Call log` and the closing rows of a
  received body sit there, and a diff whose only difference is at the end of a
  document (a missing footer, a closing block that never printed) is one a head-only
  quote never shows, leaving the withheld sentence as the only evidence there is
  anything to see. `FAILURE_TAIL_LINES` (6) and `FAILURE_TAIL_CHARS` (400) are
  deliberately smaller than the head's ceilings, because six lines is the `Call log`
  and the row under it. It is taken from the end one line at a time and stops at
  `head.length`, so the two halves cannot quote the same line twice, and a tail line
  over its ceiling keeps its **end** with a leading ellipsis — the end is the part
  nearest the summary a reader is looking for, while the head's cut line keeps its
  start. The withheld sentence stands between the halves, where the reader meets the
  gap, rather than after a tail that would otherwise read as if it followed the head
  directly, and both counts are net of both halves.
  Measured on an 808-line, 39,157-character body diff that ends with a `Call log` and
  a footer line: the page is 1,730 characters — 1,462 over the accepted page — and
  quotes 31 lines: the 24 of the head, the withheld sentence, and the 6 of the tail
  (`“Room 398” …`, `“Room 399” …`, the empty line, `Call log:`, the `Expect` line and
  the footer). A single 40,000-character line still quotes one cut line and the
  sentence, because the head's partial line is the only line there is and the tail
  may not reach into it. The log is where the whole assertion lives, because the
  failure path prints `error` there before it writes the page, so the page sends a
  reader to it instead of pretending the excerpt is everything.
  `build-freshness.test.mjs` pins both pairs of ceilings, the withheld sentence
  (grouped) and its position between the halves, the tail's own numbers, a short
  assertion's silence about withholding, and the single giant line. Probed by
  dropping the tail from the returned lines: "quotes the assertion's last lines as
  well, where a diff says how it ended" fails with `expected [] to deeply equal [
  '> Call log:', …(2) ]` and the ceilings test with `expected [] to have a length
  of 1`, while every other test in the file stays green — the two readings are about
  the tail rather than about the quote in general.
  The manifest also records the commit (`revision`, from `gitRevision`), because a
  bundle's timestamp and hashes say what it read and when, while a pasted failure
  needs a commit to open. It is the **build's** revision, not the checkout's: a
  clone that has moved on since still measured that commit, and the line names the
  one the measured bytes came from. A build from a tree with tracked changes gets
  `-dirty`, since that commit holds only part of what was measured and its failure
  would not reproduce there; untracked files do not mark it, as they are already
  hashed as inputs and a build that read one is refused as stale instead. A build
  with no `.git` (the image's build stage, a source archive, `git` absent) records
  `null` and the sentence falls back to the timestamp rather than failing the
  build. Both failure paths name it — the identity line after an assertion and the
  stale-build refusal, `… changed since the build made at <time> from <revision>.)`
  — because a refusal is the other failure that gets pasted. The walk prints the
  error itself instead of rethrowing, because only that puts the line after it:
  Playwright's expectation errors carry their own stack plus a `matcherResult`
  object Node appends when printing, so a line written into the message lands in
  the middle of that block, and one written before the throw sits above a paste
  that starts at the error. A file touched without being changed still passes,
  since the bytes are the question. A missing manifest is its own refusal (rebuild) and
  is said apart from a missing `dist/`, because "there is no build" and "this
  build cannot say what it read" are fixed by the same command but are not the
  same state. `tools/lib/build-freshness.test.mjs` pins all of it without a
  bundle: a current build passes, an edit that kept the file's timestamp is
  caught, an added and a removed file are caught, every difference is reported,
  a missing `dist/` and a build that wrote no manifest each refuse, the plugin
  writes for a real build and not for an in-memory one, and a copied `public/`
  file inside `dist/` is not read as an input. CI builds in the same Browser
  Smoke job immediately before this walk, so the gate costs a PR nothing.
  The other half of that reason is `check:published-surface`
  (`tools/check-published-surface.mjs`, in `verify:build` and its strict twin):
  everything in `dist/` is readable by anyone who asks, so a build-written file
  that names a **source module or a build script** fails — a chunk comment the
  minifier kept, a note an imported JSON carried in with it. That is the same
  class as the manifest's file list, and the first run of the gate found the note
  on this tree: `data/governance/profile-confirmation-aging.json`'s `note` ended
  "Shared by tools/check-wyrestorm-technical-data.mjs and
  src/wingman2/lib/governedConfirmationBacklog.ts", which the bundled chunk
  published verbatim; it now names the gate and the dashboard rather than their
  files. The gate's own boundary is worth knowing before widening it. A directory
  followed by a *data* file is not asked about: shipped product data cites its own
  provenance (`data/product-intelligence-db.json#67`,
  `src/competitor/competitors.json#7`, `docs/…#appendix` — 241 such citations
  today), and a gate that failed on them would be asking the data to stop saying
  where it came from rather than asking the build to stop publishing the tree. The
  same rule keeps `public/private sessions` in a room template from reading as a
  directory and `https://` from reading as a Windows path (the drive letter needs
  a word boundary before it). Absolute paths and `file:///` are asked of every
  build-written file, because only a build environment can produce one. Files
  `public/` was copied into are skipped **by hash**, not by a list: they ship by
  being authored and are reviewed as content, while a file that diverged from its
  `public/` source is build output and is read whole. Binary files (a NUL byte in
  the first block) are published and not read, since a byte sequence is not a
  sentence a reader follows. A failure names the file, line and column and the
  path, and the output has to be rebuilt before it can pass — the gate reads the
  artifact, so a fixed source with a stale `dist/` is still a leaking artifact.
  `tools/lib/published-surface.test.mjs` pins it without a bundle: a chunk comment
  naming a gate fails, a data citation and a `public/private` sentence do not, an
  absolute Windows path and a POSIX home path are caught while `https://` is not,
  a copied `public/` file is skipped and its edited twin is read, a binary is
  counted rather than searched, and a missing `dist/` refuses instead of scanning
  nothing.
  Check this one at both ends too: the desktop stack is invisible at 360 and the phone
  squeeze is invisible at 1280.
  `assertHeroHeaders` is what the walk runs, and it measures both hero shapes:
  `assertHeroActionRow` for the header that carries the row today, and
  `assertTwoChildHero` for the headers that mount icon + copy only, at the same
  five widths and through one `measureHeroBoxes` read. The rules are written over
  a header's boxes rather than over one page's sheet — no child leaves the content
  box the padding defines, the copy sits beside the icon and not in its column,
  the header hides none of its own content, the header itself never running past
  the page host that clips it — so the row a page grows later is a row
  the walk already reads, measured for the buttons staying on one line and for the
  row landing in a column of its own or on a line of its own. Sales Helper is the
  two-child hero a walk can load: `/wingman/call-coach` renders it (the
  `salesHelper` and `callCards` routes both redirect there) and reads as the same
  two-column grid, its icon and copy columns printed at every width in
  [the Sales Helper hero](../reports/browser-readings.md#sales-helper-hero). The
  per-width third-column contract is asserted only for the hero the walk
  knows the sheet for — Settings — while another hero passes the layout-independent
  half, because what a page's own sheet does with its header is that page's
  business and the promise the row makes is where it lands. Every one of those
  failures names the surface and the page it was loaded on — "The Settings hero on
  /wingman/settings stacked the buttons of its action row at 360px: Save at 259px,
  Print this page at 259px, Reset at 259px", "The Sales Helper hero on
  /wingman/call-coach lets child … run … past its own content box … at 360px" —
  because both passes run the same rules and a log that said only "the hero" would
  not say which header came apart, or on which address. Both messages come from one phrase builder, `heroMeasuredOn`, so the
  reading that names a surface and the one that names a route are one reading
  rather than two styles of report; how the route reaches it is below. The
  hub pages mount the same two-child hero, `HubPage` in
  `pages/NavigationHubPages.tsx`, and no route renders it, so there is no hub
  header for a walk to visit; the list in `HERO_TWO_CHILD_SURFACES` is where it
  joins the day a route mounts it. The two-child pass was proved against a row
  rather  than trusted: a temporary third child on Sales Helper's hero made the
  walk stop at 360px with "The Sales Helper hero on /wingman/call-coach stacked the
  buttons of its action row at 360px: Start the call at 1039px, Resume the call at
  1098px", which is the button half of the rule firing through
  `assertTwoChildHero`; the row half of that branch — a third child landing beside
  the copy — is not reachable without a header that lays one out that way.

  The rules are not in the walk. `measureHeroBoxes` has to be a `page.evaluate` — the
  numbers only exist in a laid-out page — but the arithmetic over them, the sentence
  each failure prints and the per-width table all live in
  `tools/lib/hero-header-layout.mjs`: `heroContainmentFailure` returns the first thing
  a header owes its children that it does not do (or `null`),
  `readHeroActionRow` returns `{ present, failure }` so whether a third child exists is
  a reading rather than an exception, and `HERO_VIEWPORTS` is the table that says what
  `expectsColumn` is at each width. The walk keeps the selector, the widths, the
  summary line and `assertHeroHeader`, which throws what the lib returns — one call for
  the pair of rules, so the three call sites cannot ask one and forget the other.
  `tools/lib/hero-header-layout.test.mjs` pins both rules against written boxes: a
  header wider than its host and one starting before it, a copy in the icon column, a
  header hiding its own content, a header with no ancestor that clips it, one and
  several escaped children (widest named with its box, the rest without), a third child
  in the strip beside the copy, buttons stacked and a row wrapped inside a container
  whose own top never moves, both halves of the per-width contract, and the table's own
  band — 1,000 and above is the only width the shared rule covers alone. That is the
  half a green walk cannot reach: it reads three surfaces that all fit. The split was
  held to have changed nothing rather than assumed: the removed functions were
  extracted from the file as it stood and run beside the new readings over 4,000
  generated headers at four option sets — 16,000 containment and 16,000 action-row
  readings — with no differing message and no differing verdict, the clean cases
  included, where both answer `null`.

  The header's own box is the other half of that reading, and the half its children
  cannot see: `measureHeroBoxes` also returns the nearest ancestor that hides its
  overflow, and `heroContainmentFailure` fails when the header starts before
  that host or ends past it, printing both boxes. A child can sit neatly inside its
  header while the header itself is wider than the page draws it — the shape a
  max-content column or a `width: min(…)` hero takes when it outgrows its page —
  and a header past the host's edge is drawn nowhere. Both headers' boxes at each
  width are in [the Settings hero](../reports/browser-readings.md#settings-hero)
  and [the Sales Helper hero](../reports/browser-readings.md#sales-helper-hero),
  where Sales Helper's header reads the same inside its host at every width, so
  the rule is green by a margin rather than by a rounding. It bites on its own: a
  temporary `.wm-polish-hero { width: calc(100% + 80px) }` stopped the walk at
  360px with "The Settings hero on /wingman/settings is 420px wide at 360px and
  runs 70px past the page host that clips it (div.wingman-page-host.wm-app-page-
  frame (hidden), 360px, 0-360px)" while every child was still inside the header —
  the split that makes this a rule of its own rather than a restatement of the
  child reading. That failure names the route as well as the surface, through
  `heroMeasuredOn`: a hero that outgrows its page is a defect of one address, the
  two named passes ("Settings", "Sales Helper") used to leave the page to the
  caller's memory, and the manifest sweep already calls each hero by its route,
  so the route is appended only where the name does not carry it rather than
  printed twice.

  The phrase is one function because the readings split by accident: the two
  failures about the page host went through `heroMeasuredOn` while the child,
  copy, scroll and action-row messages named only the surface, so "lets child 2
  leave its own content box" — the reading a rep's clipped header usually is —
  left the reader to find which of the app's heroes did it. Every message in
  `heroContainmentFailure` and `readHeroActionRow` is said through that phrase now,
  which is why the action-row reading takes a `route` it did not before and all
  three callers pass theirs: Settings' own `HERO_ROUTE`, a
  two-child surface's `path`, and the manifest sweep's `route.path`. Probed on
  the real page rather than read off the source: forcing the stacked branch to
  fire printed "The Settings hero on /wingman/settings stacked the buttons of its
  action row at 360px: Save at 259px, Print this page at 259px, Reset at
  259px". The sweep's own names already carry the path, which is the one case
  the phrase leaves alone.

  The child that leaves the content box is named as one child, not as a row of
  them: the failure prints the widest escaper with its own box and its overrun,
  and names the others without boxes. Before that it printed every escaper as
  `child 1 (10-64px), child 2 (73-350px)` against the content box, which is a
  subtraction the reader has to do before knowing which child to change — and a
  header whose children have all been pushed out is one defect seen three times,
  not three defects. `past` is the overrun on whichever side is worse
  (`max(content.left - left, right - content.right)`), the filter is `> 1` to match
  the tolerance the rule already kept, and the sort is widest first, so the child
  printed is the one to fix. Each child carries what it is as well as its words:
  `node` is the tag and first two classes, built by the same `nodeName` helper the
  clipping host's name comes from, and `label` is `innerText` with whitespace
  collapsed and cut at 40 characters with a `…`. `innerText` rather than
  `textContent` because a child holding the action row has no text of its own and
  its `textContent` runs the labels together into `SavePrint this pageReset`,
  which names nothing; the icon's is `span.wm-polish-hero-icon` with no words at
  all, which is why the element is part of the name. Probed on the real page by
  giving the Settings hero's icon a −46px left margin and its action row −30px at
  phone widths, which stopped the walk at 360px with "The Settings hero on
  /wingman/settings lets child 1 (span.wm-polish-hero-icon) run 46px past its own
  content box (10-350px) at 360px, the widest of 2 children that leave it (child 3
  (\"Save Print this page Reset\", div.wm-settings-hero-actions.wm-action-row))" —
  the widest first, the other named without a box. A single escaper is that same
  sentence without the trailing clause. The probe was a left-side overrun because
  that is the only kind these heroes can make: their horizontal padding is 0 (0 in
  the shared `.wm-polish-hero` rule, 0 in the Settings one too), so the content box
  is the header's own box and a child past its right edge is caught one reading
  earlier as the header hiding its own content.

  The gallery card's Copy/Delete failure is the same sentence for the same reason:
  the pair shares the row's last line, so a pair pushed out of the card's content
  box is one defect seen twice, and it used to print `Copy (86-134px inside
  86-447px), Delete (…)` for the reader to subtract. `galleryActionRowFailure` now
  filters on `max(content.left - left, right - content.right) > 1`, sorts widest
  first, and prints that button's own overrun and the content box; the other is
  named without a box. The labels are quoted because they are the buttons'
  aria-labels rather than short words — `"Delete Northbridge Meeting Room
  Refresh"` inside a failure would otherwise read as prose, and the room is
  already named at the start of the sentence. Probed by insetting the content box
  200px in that comparison, which stopped the walk at 1366px with "Gallery card for
  Northbridge Meeting Room Refresh lets \"Delete Northbridge Meeting Room
  Refresh\" run 199px past its own content box (86-447px) at 1366px, the widest of
  2 controls that leave it (\"Copy Northbridge Meeting Room Refresh\"): Copy and
  Delete have to close the row inside the card." A single escaper drops the
  trailing clause, as it does for the hero.
