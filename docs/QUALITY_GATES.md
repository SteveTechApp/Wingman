# Quality gates and ratchets

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- `check:ci-verify-stage` guards the CI `Verify (data | contract | visual)` job
  itself, because that job is where most of the wiring guards run: deleting it,
  or dropping a stage from its matrix, silences every one of them at once and no
  guard inside those stages can report it — their runners leave with the job.
  That is why it lives in `verify:fast` (the pre-commit hook, and the same lane
  twice in CI's `Pre-commit lane ×2` job) instead of in `verify:contract`. It
  reads `.github/workflows/ci.yml`, requires the `verify:` job to exist, its
  stage matrix to name `data`, `contract` and `visual`, and each stage to be run
  by some step — by name or through a script whose chain reaches it, with the
  matrix placeholder substituted per stage, so the job's single run step, its
  stage taken from `${{ matrix.stage }}`, satisfies all three readings. It also
  reads the job's own `if:`, because a condition is the other way to keep the job
  written while stopping it from running: `if: false` is never true, and a
  condition on a variable nobody sets skips the whole gating stage without one red
  job, leaving a `verify:` job that still carries its matrix and steps and still
  reads as wired. Only the expressions restating the job's default pass — empty,
  `true`, `always()`, in or out of `${{ }}`; everything else is reported with its
  own text, the fail-closed rule the rest of the guards follow. A step's `if:` sits
  deeper and is not read, since it decides one step rather than whether the job is
  scheduled, and both YAML shapes (inline and a `|`/`>` block) are read so wrapping
  a long condition does not read as an unwiring. Probed on the real job with
  `if: vars.WINGMAN_ENABLE_VERIFY_GATES == 'true'` and then `if: false`: exit 1 with
  the condition quoted — "the `verify` job carries a job-level `if: …` … This guard
  cannot prove that condition true, so the job may be skipped … every guard in those
  stages goes unasked whenever it does not, with nothing red to say so" and "carries
  `if: false`, which is never true, so CI never schedules it" — and green again with
  the line removed. The two branches claim different things on purpose: a condition
  that is false whatever the event is can be called never true, while a variable, a
  secret or an event filter is decided by the repository and the run rather than by
  the text this guard reads, so its message says only that the job may be skipped. A
  spec pins that wording — "the job may be skipped" in, "never runs" out — because a
  message that overstated what it measured would teach a reader to discount the
  ones that do not. Reading the
  matrix rather than the steps alone is what catches a stage that is listed and
  never run, and reading both YAML list shapes keeps a reformat from reading as
  an unwiring. Probed by deleting the job from `ci.yml`: exit 1 with "has no
  `verify:` job … the wiring guards that live in those stages … stop being
  asked". It checks its own wiring too — a spec asserts the fast lane still
  reaches it — because a guard that is only invoked manually would be the same
  silence one level up.
- `check:strict-verify-chains` pins the strict twins against the stages they
  *replace*, because `verify:strict` runs `verify:build:strict`,
  `verify:data:strict` and `verify:contract:strict` instead of the normal
  stages (plus `verify:visual`, which has no twin) and never runs
  `verify:contract` on the way. A gate in the normal chain but not the strict
  one is therefore not duplicated in a strict run — it is missing from it, and
  the run is green while the deeper question is unasked. The guard requires
  every gate `verify:<stage>` reaches (including through a nested script) to be
  reached by `verify:<stage>:strict`, requires `verify:strict` to compose each
  twin, and requires `verify:visual` to still run. It lives in `verify:fast`, so
  the commit that drops the line is the one that fails. Its first run found
  seven contract gates the strict lane had never asked — `check:compare-core`,
  `check:discovery-locators`, `check:export-validation-domains`,
  `check:proposal-wizard`, `check:audit-scopes`, `check:init-order-wiring` and
  `check:stored-records` — and they were added to `verify:contract:strict`
  rather than waived. Each pair is compared twice, because a gate does not need a
  script name to be a gate: once over the scripts each stage reaches, and once
  over the tools each stage calls with `node` directly — the data stage used to
  open with `node tools/data-revision-status.mjs`, and a comparison of script
  names could not see that line at all. `collectDirectNodeTools` reads the stage's
  own body alongside its reachable scripts, so a tool reached either way counts,
  and it keeps the tool and drops its arguments: what makes a tool a gate is what
  it checks, so a strict twin that runs the same file with deeper flags is still
  asking. There is no exemption: that notice is `notice:data-revision`, a script
  both data stages run, because a notice is not a reason to stop comparing the
  gates beside it. While the exemption existed it was named in `NODE_NOTICES`,
  scoped to the data stage and held to a line the stage still ran; nothing has
  taken its place, so a tool printed on one stage's own line is now always a
  finding. The notice says where the paused acceptance suites are
  (`npm run test:catalogue`) without naming a lane, since both lanes print it —
  the sentence that pointed at `verify:data:strict` is what made it a thing to
  exempt. Probed both ways: with the notice dropped from `verify:data:strict`,
  exit 1 with "does not run 1 gate that `verify:data` runs:
  notice:data-revision" and "does not run 1 tool that `verify:data` calls with
  `node` directly: node tools/data-revision-status.mjs"; green with the line back.
- `check:verify-script-coverage` asks the question the two guards above cannot:
  not whether a named gate is wired, but whether anything runs the scripts that
  exist. Every `package.json` script is reached from `verify` or `verify:strict`
  through the `npm run` chains, or declared in
  `tools/verify-script-exemptions.json` with what it is instead. It reads both
  roots because `verify:strict` runs the strict twins in place of the normal
  stages, so a gate hanging off a normal stage alone is not asked by a strict run
  — the same asymmetry `check:strict-verify-chains` guards one level down, one
  level up. A rename is the failure it exists for, and the loud half is the half
  that does not need it: an old `npm run` line outliving its script fails on that
  line. The quiet half is the line going with the rename, which leaves the new
  name reached by nothing while every remaining check stays green. Declarations
  are per script, each with a reason, rather than a `check:*` prefix, because a
  prefix is what a new gate would inherit without anyone deciding it, and this
  repo's expectation is that the honest answer is the first one — a gate goes in
  the stage that should ask it, since an unwired gate reports nothing and its
  silence reads exactly like a pass. The declare-side is for scripts that are not
  gates to run on a checkout: a dev server or `postinstall`, a writer that moves
  the baseline a gate compares (`audit:*:baseline`), a read-only report, a
  Playwright walk that needs a served build, a check whose subject is a deployed
  database or a third party's page, and the older names of gates that are asked
  under their current one. Both directions ratchet, so the file cannot go stale
  quietly either: a declared script that a stage now reaches fails, and so does an
  entry naming a script `package.json` no longer has — that second reading is the
  rename again, with the new name orphaned in one finding and the old name still
  excused in the next. It lives in `verify:fast` (the pre-commit hook, CI's
  `Pre-commit lane ×2`) so the commit that adds the script is the one that fails,
  and a spec asserts the fast lane still reaches it, since a guard invoked only by
  hand is the same silence one level up. Measured on this tree: 127 of 270 scripts
  reached, 143 declared across the groups, and no group is a queue any more — the
  last one, eight `check:` scripts nothing decided when to run, is empty and each
  of those eight now sits in the stage that owns its question. A queue entry leaves
  by that first rule: `check:data-maintenance` was declared there and now runs at the end of
  `verify:data` and `verify:data:strict` — two lines for one decision, because
  `check:strict-verify-chains` asks the twin for every gate the normal stage runs —
  since what it judges is committed data and nothing else: the canonical store's
  size and duplicate SKU keys, the public index's alignment with that store and its
  generator, canonical products missing their maintenance-gate metadata, the
  maintenance queue's two lists, the report's six phases, and compare-ready coverage
  against `tools/wingman-data-maintenance-baseline.json`. Probed by dropping phase 6
  from `reports/wingman-data-maintenance-report.json`: `npm run verify:data` exits 1
  on `- Maintenance report does not cover phases 1-6.` as the stage's last step, and
  exits 0 with the file restored byte-identical (`cmp`), so the stage's verdict is
  the gate's finding rather than the file it was reading. `check:proposal-print-pagination`
  left the queue the same way, and it was the entry with a trap in it: the script
  named `tools/check-proposal-print-pagination.mjs`, which did not exist, so wiring
  it first would have failed on a missing module rather than on a finding. The tool
  is written now, and it is a browser reading rather than a marker search because
  nothing else can answer the question: `proposalPrintPaginationHtml()` ships a
  `<style>` and a `<script>` inside the exported proposal, and the script re-lays
  the priced schedule into page-sized chunks on `beforeprint`. jsdom reports every
  box as 0×0, so the chunking loop would put all sixty lines on one page and pass.
  The tool therefore runs `e2e/proposal-print-pagination-check.spec.ts` in Chromium
  with print media emulated, over a schedule the walk writes itself — a fixture on
  disk would make the gate depend on somebody having generated an export first,
  which is what keeps `proposal-print-pagination.spec.ts` (the same question asked
  of a real export a rep generated, and so a review walk rather than a gate) a
  review walk instead.
  The readings are the ones a rep loses sleep over: every line printed exactly once
  and in order, the header on every page, `break-before: page` on each chunk, no
  page taller than the printable area (measured against a 255mm ruler the walk
  builds the way the script does), a footer that agrees with the page's own last
  line rather than repeating the order total, the first page carrying the original
  heading and continuations saying `— continued`, the original hidden while the
  pages are shown with its lines still there, the document restored on `afterprint`
  so a second print is the same document, and a schedule with no lines or a table
  the export did not mark left alone rather than paginated. Two readings are ones
  the first version got wrong: the original heading and table are held by identity
  rather than by selector, because the first page repeats the heading and is
  inserted *before* it, so `querySelector("h2")` answers with the clone — a copy
  that is meant to be visible — and would have passed a document that hid nothing;
  and the per-page footer is checked against the last line's own running total and
  its `· N items`, so a footer copied from an earlier page fails even if the
  fixture's text moves. Measured: 60 lines over 4 pages (18 / 19 / 19 / 4), each
  673px wide, the tallest 937px of the 962px printable height.
  The chunks being page-sized is a claim about the layout, so the walk also prints
  the paginated document to a real PDF — `page.pdf()`, CDP's `printToPDF`, called
  after the walk dispatched `beforeprint` because it fires none of its own — and
  counts the pages the printer wrote. That count comes out of the file's bytes in
  `countPdfPages` (`tools/lib/pdf-pages.mjs`), which takes two readings of one file:
  the page tree's `/Count` (the number a reader lays its pages out from, and the
  root's rather than an inner node's) and the `/Type /Page` objects the tree points
  at. A file where they disagree is refused rather than read the friendlier way,
  since one file giving two answers means neither can be trusted; Chromium writes
  both plainly and in one revision — `/Count 4` beside four page objects for a
  four-chunk schedule — which is what makes a disagreement a defect rather than an
  artefact of how a writer lays out its cross-reference table. It is not pypdf: the
  same fact is available to Node, so neither the gate nor the review walk needs a
  runtime outside the browser, and `proposal-print-pagination.spec.ts` reads its
  real export with this reader too — its `pypdf` text extraction (and the bundled
  Python path that fed it) is gone, so no proposal-print test needs Python at all.
  The parity walk was the suite's last `pypdf` reader, and it asks for page text
  rather than a page count: `readPdfPages` (`tools/lib/pdf-text.mjs`) parses the
  PDF the walk just printed with `pdfjs-dist`'s legacy build — the dependency the
  ingest reader already uses, in its no-DOM form — and returns the words of each
  page, because the cover's document control block and the running furniture on
  the pages after it are readings about the pages they belong to rather than about
  one blob. It is given bytes with no worker, no eval and no fetch, since a test
  process parsing a printed document has no reason to want any of them, and it
  refuses a file whose head is not `%PDF-` by naming that head rather than letting
  a parser report a generic failure. `e2e/proposal-output-parity.spec.ts` no longer
  spawns a process at all, so the whole Playwright suite runs on the browser it
  starts and CI's `pip install pypdf` step is deleted rather than left as a
  prerequisite nothing uses.
  What the review walk reads instead is what makes the swap possible without
  losing the readings: the pages are the script's chunks, so the walk dispatches
  `beforeprint` and reads `.wm-schedule-print-page` — each page's last line, the
  header it repeats, the footer that agrees with that line, and every description
  whole on one page — and the PDF answers only how many sheets the printer wrote.
  Those counts are `pages.length + leadSheets`, not `pages.length`: the walk's lead
  is content above the schedule and the first chunk carries `break-before: page`,
  so a 210mm or 230mm lead takes a sheet of its own (the 0mm case takes none), and
  the lead is measured against the same 255mm ruler before that sheet is allowed
  for. Measured on a freshly generated export: 100 lines over 11 chunks, 11 printed
  pages at 0mm and 12 at 210mm and 230mm. Probed by raising the shipped script's
  ruler to 320mm so its chunks outgrow a sheet and regenerating the export, the
  walk stops at 0mm with "the printer wrote 13 PDF page(s) (page tree /Count) for
  the 9 page-sized chunk(s) the export's script built after a 0mm lead, which is
  the lead's 0 sheet plus those chunks … 4 chunk(s) ran onto another sheet", and at
  210mm with the same finding at 14 pages; the ruler was restored byte-identical
  and the export regenerated, and the three leads are green again. The fixture's
  selector had drifted with the export — the schedule is `table[data-priced-schedule]`
  (the attribute the shipped script paginates on) and not `table.wm-priced-schedule`,
  which is what the walk asked for and could no longer find — so the walk reads the
  attribute the export actually writes.
  The two counts have to be one number, and together they are what neither alone
  says: a chunk that fits the printable area and starts a new page is a PDF page, so
  N chunks are N printed pages exactly when the printer wrote N. Measured: 4 chunks
  and 4 PDF pages, 53,301 bytes. Probed in both directions, each reverting
  byte-identical: raising the script's ruler to 320mm so its chunks outgrow a sheet
  stopped the walk with "the printer wrote 5 PDF page(s) (page tree /Count) for the
  3 page-sized chunk(s) the script built … 2 chunk(s) ran onto another sheet", and
  dropping `break-before: page` while shrinking the ruler to 60mm stopped it with
  "the printer wrote 7 PDF page(s) … for the 31 page-sized chunk(s) … the printer
  wrote 24 fewer sheet(s) than there are chunks, so it merged chunks onto one sheet
  or dropped the content past a chunk's first". The tool refuses a report whose
  `printedPages` is absent or differs from `pages` as well, so a run that counted
  the chunks and never printed them cannot be quoted as a passed gate.
  `tools/lib/pdf-pages.test.mjs` pins the reader against hand-written files: the
  root's count rather than an inner node's, page objects when no tree declares a
  count, a `/Type /Pages` dictionary not counted as a page, and refusals for a
  disagreeing file, a non-PDF and a PDF with neither reading. The tool refuses a
  report that says fewer than three pages, because a schedule that fits one page is
  not a paginated one and the walk would then have asked nothing. It runs in
  `verify:visual`, beside `check:proposal-output-parity` — the same subject (the
  exported proposal) and the same prerequisite (Chromium) — and one line is the
  whole decision there, since `verify:visual` is the stage the strict lane runs
  without a deeper twin. Probed by breaking the shipped script three ways, each
  reverting byte-identical: raising the script's measuring ruler to 2550mm failed
  with "a 60-line priced schedule came out as 1 printed page(s), so the pagination
  never split it"; printing the order total as every page's footer failed with
  "every page printed the same footer (Schedule total: £600.00 · 60 items · Excl.
  tax), so a rep cannot tell how far down the schedule a page got"; and dropping
  `page.remove()` from `restore()` failed with "the paginated pages are still in
  the document after printing, so the rep is left reading a duplicate schedule".
  The coverage guard itself is probed three ways, each reverting green: renaming
  `check:stored-records`'s `npm run` line to a name package.json does not have
  failed the new name as an orphan; dropping it from
  both lanes named the gate as the orphan, since `verify:contract` and
  `verify:contract:strict` each reach it; and declaring a wired gate in the file
  failed with "declares 1 script that a verify stage already reaches".
  The same guard asks the same question one level down, of the `tools/` file a
  script calls: a script can be wired into a stage and still point at a tool
  nothing else names, and deleting the `npm run` line that called it is one edit
  that leaves the file sitting there and every check green. A tool file is reached
  by a script name, a workflow, an import position, or a root config that names it
  — `vitest.config.ts`'s `globalSetup` is a call site the import rule cannot see —
  and anything else is declared in `tools/tool-reach-exemptions.json` with what it
  is instead. The reading is narrower than a grep on purpose: a mention in prose
  is not a caller, which is why the sentence telling a reviewer to run the settle
  tool does not make that tool reached, and a spec naming a tool is the guard's
  subject rather than its caller. It records 56 decisions over 242 tool files
  today, and the two ratchets are the script half's: a declared file something
  starts calling fails, and a declaration for a file that is gone fails. The
  largest group is one-shot writers, and every group is now a decision rather
  than a queue: the eight check tools that sat in the last one — no stage asked
  them, and `check-app-page-style-consistency` was red besides — were wired into
  the stages that ask their questions, two into `verify:data`, four into
  `verify:contract` and two into `verify:visual`. A stage is the right answer for
  a gate, which is why the declaration lost its queue group rather than gaining a
  better reason.
- The pre-commit hook runs the dead CSS autofix and gate, then the fast lane
  plus architecture boundaries. The full verify chain additionally enforces
  two debt-ratchets:
  size budgets (`tools/wingman-size-budgets.json`) and style-drift
  (`tools/wingman-style-drift-baseline.json`). Raising either requires the
  documented exception process in `docs/SIZE_BUDGETS.md`.
- `total:js` sums every emitted `.js`, so the lazy chunks are in the number too.
  The heavy on-demand libraries each have a job, and two facts about them are
  worth knowing before hunting bytes: `pdfjs-dist`'s legacy build bundles the
  core-js `Promise.withResolvers` polyfill the modern build requires, so
  swapping to `pdfjs-dist/build/pdf.mjs` is only a ~43 KB cut for browsers the
  app's Vite target still promises; and there are no duplicated npm packages
  across chunks and no byte-identical chunks (checked from the emitted source
  maps and hashes), so dedupe is not a lever here. Recharts was the one library
  with no such excuse — ~430 KB for one admin analytics view — and it is gone:
  `AnalyticsCharts.tsx` draws the six charts as SVG. Measure the drawing from
  its container (`ResizeObserver`, with the ref on the content wrapper rather
  than the card, or the SVG is the card's width and overruns its padding box by
  32px; a missing observer draws at the fallback width, which is how the spec
  renders it). A count axis takes whole steps (`countTicks`: 0, 3, 6, 9, 12, not
  0, 2.5, 5), because "2.5 opens" is not a count; a rate axis is fixed 0–100 by
  definition. `AnalyticsCharts.test.tsx` holds the shape readings — bars per
  category and series (grouped bars by their rounded corner, stacked segments by
  palette fill), the per-bar win-rate colouring, one donut slice per outcome,
  the tooltip markup and the empty state. The removal took `total:js` from
  7,570,695 to 7,134,175 bytes, and the limit now records the new size. The next
  cut was the other heavy on-demand library, and it went the same way: `mammoth`
  shipped 480 KB (its own JSZip and pako copies inside the browser bundle) to
  read the text of a `.docx` a rep drops on ingest, and a `.docx` is a zip whose
  `word/document.xml` a `DOMParser` reads — so `documentExtract` takes Word
  paragraphs through the same `JSZip` chunk the `.xlsx` path already loads. A
  Word element is `w:p` in the archive's own namespace, and a CSS type selector
  is answered differently by different DOMs — Chromium finds those paragraphs
  with `querySelectorAll("p")`, jsdom (where the spec runs) finds none and
  `closest("tc")` nothing — so the reading walks local names through
  `getElementsByTagNameNS("*", …)` and parents by `localName`, which both
  answer the same way. A paragraph is one line, a row is one
  tab-separated line, and a cell's paragraphs join with a space, because a
  spec table whose cells print as stray sentences is not readable in the ingest
  box; a cell holding a nested table keeps that table's own lines instead of a
  copy of them. `documentExtract.docx.test.ts` builds real archives for that
  (paragraphs, a table row, a multi-paragraph cell, an archive with no body),
  and `total:js` is 6,643,658 bytes now. What is left of that number is data (a
  758 KB competitor-spec table) and three libraries with jobs nothing smaller
  does: `pdfjs` for PDF text, `docx` for writing a proposal, `jszip` for both
  OOXML readings.
- `check:style-drift-baseline` counts every CSS rule block whose selector
  matches page/compare patterns (e.g. `html[data-wingman-route="compare"] ...`)
  as one "pageSection" — adding N such rules raises the baseline by ~N.
- `check:route-stylesheet-order` holds the split that gave each page a stylesheet
  of its own to the equivalence lib in `tools/lib/style-order-equivalence.mjs`,
  so a move answers for itself instead of being called harmless by inspection.
  It asks the question per page rather than over the whole stack: each page's own
  file is read against the rules `wingman-route-overrides.css` still holds for
  that same page, with the page's file first and then last, which is the one move
  the split actually made. The first of those two is not a reconstruction of the
  old file — where a moved block sat among the leftovers is no longer in the tree
  — it is the arrangement in which the leftovers win, so every pair reported is one
  whose winner the file placement alone decides, and the page's copy wins only
  because its file loads last. Both sides are filtered to the page's own route keys
  (`html[data-wingman-route="…"]` values and `.wm-route-<segment>` classes), and
  that filter is the scope of the check rather than a claim about the cascade: a
  page rule against a shared rule no route scopes is a different question with a
  different owner, and the summary says which pairs were read instead of letting a
  green run imply the rest was cleared. Reading the whole stack as one move is
  what makes the unscoped population swamp the answer — thousands of pairs whose
  only relation is a design-system class two components share — while the split's
  own move is the page, where the population is hundreds of pairs rather than
  thousands and most page files never tie with their leftovers at all. The gate
  prints the totals it read, so the numbers are its output rather than a figure
  copied into this sentence.
- `tools/wingman-route-stylesheet-order-baseline.json` is the reviewed answer, and
  its unit is the page: one reason per stylesheet saying why that page's rules may
  load after what the shared file kept, with the pairs it decides pinned beneath
  it. Pinning by identity is what makes the file fail both ways — a pair that is
  not pinned as often as it occurs, and a pinned pair that has stopped occurring —
  so the split can only ever re-decide what a person read. The identity is the
  property, its importance, the specificity both rules share, the conditions they
  live under and both selectors, never a declared value and never a line number:
  editing a value must not unpin a pair, while the same selectors meeting under a
  width are a different decision, which is why the equivalence lib's conflict now
  carries the media chain each side lives under. One selector pair can meet in more
  than one place (two rules with the same selectors, or a repeated block), so the
  baseline matches counts rather than a set and a repeated line means "this pair
  happens this often".
- A pair whose two subjects share no token is the tail of that list, and the
  ranking is a reading order rather than a judgement: nothing in the text says
  whether `.wm-glossary-term` and `.wm-glossary-toolbar` can be one element. The
  rendered page says it, so those pairs are settled by measurement instead of
  pinned as a decision. `tools/settle-route-order-pairs.mjs` opens each route in a
  browser at two widths — 1366 and 390, because a page can mount a region only
  inside a breakpoint — and for every pair asks whether any element matches both
  selectors. A pair with no such element cannot re-decide a declaration, so it
  moves out of the page's `pairs` and into its `settled` list, with one
  `settledEvidence` line per page naming the build, the widths and the page that
  were asked. The settled list carries the same multiplicity the pinned list does:
  a pair the reading finds twice is settled twice, or one entry would stand in for
  the other. The CSS gate still holds the bookkeeping and cannot open a page, so it
  fails when a settled pair is also pinned (one pair, two answers), when a page
  settles pairs without an evidence line, and when a settled entry has stopped
  occurring; the tool is what proves the claim, and it is also the re-proof — with
  no flag it compares the page against the settled entries and fails if one of them
  now reaches an element, so a page that starts mounting that region brings its
  pair back into `pairs` instead of silently outgrowing the measurement. Re-run it
  when a route's markup changes; like the other measurements in this repo it is a
  run, not a number quoted into prose.
- The browser walk asks that question too, on every run, because a reading that
  is only re-taken when someone remembers to re-take it is a reading that goes
  stale between runs. Both callers go through
  `tools/lib/route-order-settlement.mjs` — one place that builds the answers,
  navigates the two widths and decides what a count means — so the tool that
  writes the baseline and the pass that re-proves it cannot ask it two ways. The
  walk's pass also names a pair nobody has answered for and says which answer it
  is: an element matching both is a decision owed in `pairs`, no element matching
  is a settlement waiting to be written. That is the case the CSS gate can only
  report as "not reviewed", and asking the page turns it into which of the two
  the reviewer owes. What the last run measured is
  [the route stylesheet order](../reports/browser-readings.md#route-stylesheet-order)
  reading; the counts in this sentence are the run that decided the rule, not a
  promise about today's pages.
- The gate checks the two readings it depends on rather than assuming them: that
  `wingman-route-overrides.css` loads before every page stylesheet, because the
  comparison calls the page files "after the split" and an inverted import order
  would have the baseline arguing about a move the app no longer makes; and that
  both arrangements hold the same rules, because a rule that is neither added nor
  removed is the only one a move can re-decide, and a count that disagrees means
  the two readings saw different text. Failures are reported in the lib's ranking —
  subjects sharing a class token, then an element name, then nothing visible — so a
  reviewer reads the pairs that probably are one element first, and every
  unreviewed pair is still listed: the ranking is a reading order, not permission
  to drop the tail. It lives in `verify:visual`, which has no strict twin, so
  `verify:strict` still runs it as it is.
- `check:route-scope-liveness` (in `verify:visual`) is the route-scope
  counterpart of the dead-CSS gate, because neither existing reading can see
  this debt: a `.wm-route-<segment>` family is assembled at runtime, so every
  member of it is exempt from the class reading, and an attribute selector is
  not a class at all. It reads every stylesheet the app loads
  (`GOVERNED_MAIN_CSS_IMPORTS`) and asks one question per value: does any page
  write it? The two spellings are two vocabularies rather than one fact written
  twice — `html[data-wingman-route="<key>"]` takes the `WingmanRouteKey`
  members, `.wm-route-<segment>` takes the manifest segments, and 14 of the 29
  routes differ (`callCoach`/`call-coach`, `profile`/`settings`,
  `analyticsDashboard`/`analytics`). So both live sets are read from the writers
  and never from a list that looks like the right shape:
  `tools/lib/route-scope-liveness.mjs` parses the union, the manifest, and the two
  literals `AppShell` writes for the admin page, which is not a catalogue route
  and is live in both spellings. A value in one set is never admitted to the
  other by inference, because that is the one mistake that turns the check off
  while it still reports a number: `data-wingman-route="call-coach"` matches
  nothing even though `call-coach` is a live segment, and `.wm-route-callCoach`
  matches nothing even though `callCoach` is a live key. The prune tool
  (`tools/consolidate-route-overrides.mjs`) asks the same lib, so the removal and
  the gate cannot disagree about which scope is live.
- `tools/wingman-route-scope-liveness-baseline.json` holds the dead values the
  tree keeps, one entry per value with the count of rules that name it and the
  story behind it. The count is pinned, so a pinned scope that spreads has to be
  read again; an entry whose rules are gone has to come down; and a value with no
  entry fails. It is a delegation of a cleanup rather than a way past a red run:
  the gate names the file and one selector for every value it reports. It lists
  nothing today — the retired `visual-studio` route and the planner-era class
  scopes it once pinned were deleted on 2026-10-30 (see
  `docs/SIZE_BUDGETS.md`) — and the empty file is the point: the next retired
  route has to be argued into it rather than inherited.
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
