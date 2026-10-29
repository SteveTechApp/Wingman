# Proposal output

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- `buildProposalHtml` in `src/wingman2/lib/proposalExport.ts` is the only
  printed/PDF surface: the PDF export opens it and calls `window.print`, and
  `check:proposal-output-parity` renders the same HTML to PDF. Page setup lives
  there in `@page` (A4, margins, `@top-left` running header, `@top-right`
  `counter(page)`/`counter(pages)`, reference and draft lines in the bottom
  margin). Chromium renders those margin boxes; the parity spec must keep
  `preferCSSPageSize: true` or Playwright's own margins replace the CSS margins.
- A document's detail level decides which sections print. `DOCUMENT_SECTIONS`
  (`documentSections.ts`) files every section of the document at the shallowest
  level that carries it, and `documentSectionPlan(detail)` is what a builder
  asks; the levels are a ladder whose cut is the document's own three layers, so
  an `Executive` document stops before the technical substantiation (the
  captured discovery transcript, the design trace, the architecture drawing and
  its cable schedule, the product pages and specification pages, the power
  budget) while still printing every section that states what is still open —
  leaving an open item out would present it as settled. `Standard` is the whole
  document every proposal printed before the level reached print, and
  `Technical` adds the evidence appendix (`buildDocumentAppendix`: why each line
  is in the design, where its product data was read, what is still open before
  order), which prints behind the rest of the document as its last content
  section. Both builders read the one table — the Word builder files every one
  of its sections through the plan, the printed builder asks about the sections
  a level can exclude — so a draft cannot print a section on screen and drop it
  from the quote. Adding a section means its id in the table (pinned by
  `documentSections.test.ts`, which also pins the two ends of the ladder) and a
  call site in the builders that print it.
  The level is the document personalisation's own setting, read as the document
  leaves (`templateDocumentDetail(templateId)` over
  `wingman-template-document-drafts-v1`) rather than when a page opened, so a
  rep who changes Detail in the personalisation drawer and then exports gets the
  document they asked for. A stored value that names no level is ignored rather
  than obeyed, and the plan falls back to the house level, because an unreadable
  level must not be able to empty a document that is already being issued. The
  default is `HOUSE_DOCUMENT_BRAND.detail` (`Standard`), which is why the parity
  evidence fixture and every document already stored print what they always
  did. The personalisation panel's own `Technical appendix` checkbox is gone —
  the level owns the appendix, and a control the level overrules reads as worse
  than no control — while its three sibling output-structure flags are still
  stored, and still read by nothing.
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
- A surveyed display run past the longest HDBaseT receiver's rating holds the
  export too. `displayRunBlockers` (`proposalExportValidation.ts`) raises one
  `display-run` blocker when the room records a run longer than
  `HDBT_DISPLAY_RUN_LIMIT_METRES` (the longest rating in
  `HDBT_DISPLAY_RECEIVERS`) *and* the schedule quotes one of those receivers; a
  room that dropped the line, or moved the link to fibre, has nothing to block.
  It reads the run through `surveyedDisplayRunMetres` (`hdbtDisplayReceiver.ts`)
  — the same `cableRun` / `longestRun` / Discovery `distance` chain the project
  record's panel prints, so the panel and the gate cannot name different figures
  — and both the template review page and the completion wizard pass it. The fix
  is the change that clears it: carry the link in measured spans (a mid-span
  repeater or a fibre extender pair, so the receiver serves a span within its
  rating) or shorten the run. The receiver's own reason says the same thing,
  which is why the gate exists: a sentence a rep can read past is not a stop.
  Both callers pass the run the receiver *serves* — `template.servedRunMetres`
  on the template page, `servedDisplayRunMetres(roomModel)` in the wizard —
  because that span, not the whole measurement, is what the rating is measured
  against.
- The template page applies that fix rather than describing it:
  `DisplayRunSpanFix` reads the blocker's run, and one click runs
  `displayRunSpanFix` (`displayRunFix.ts`), which schedules an
  `HDBT_MID_SPAN_REPEATER` set per interior seam and returns the span each
  receiver then serves. The page writes both halves in one handler — the rows
  through `mutateRows`, the span through `updateBrief({ servedRunMetres })` —
  because a schedule holding a repeater the gate does not know about would clear
  on screen and block the document, and a recorded span with no set would
  unblock a link nothing carries. `displayRunSpanPlan` owns the split (fewest
  equal spans inside `HDBT_DISPLAY_RUN_LIMIT_METRES`: 130 m → 2 × 65 m, one set;
  250 m → 3 × 84 m, two) and returns null for a run one receiver already
  reaches, so a short room is never offered a repeater. The measurement is never
  overwritten: the survey found 130 m and `servedRunMetres` records 65 m beside
  it, riding into the saved project's room model as `servedRun` (which
  `saveProjectAsRoomTemplate` and the custom-template codec carry back) and onto
  the project record's panel as `Run each receiver serves`. An existing set is
  left as the rep positioned it — the fix is idempotent — and an excluded line
  is not a scheduled one.
- The project record offers the same fix, because the record is where a rep
  notices the block; sending them back to the template for it is asking them to
  walk to the other surface for a decision they have already made.
  `displayRunProjectFix` (`displayRunFix.ts`) is the write for a saved room: the
  set joins the list the room's schedule LIVES in — `productSelections` when it
  has any, else the products on its saved response, because a project authored
  in the proposal builder leaves the selections empty and writing the set into
  an empty list would make that list the schedule and drop every other line —
  `servedRun` lands on the room model (the figure `servedDisplayRunMetres` hands
  the completion wizard's gate), and the `Display receiver:` note is restated
  over the span, or the record would print a reason still asking for a repeater
  its schedule already carries. `displayRunRecord` reads the same two lists in
  the same order, which is the order the wizard builds its BOM from, so the
  panel and the gate name one schedule. Both surfaces apply it through
  `updateStoredProject` against the STORED copy rather than the one on screen,
  so a second tab's edit is carried instead of overwritten — `DisplayRunReview`
  and the completion wizard's export gate, where the action sits under the
  `display-run` blocker and the blockers list opens itself while a fix is
  available (a folded action is one nobody takes). The wizard is where a
  proposal-built room's schedule is measured, so that is the surface it can be
  fixed from; a room carrying unrelated governed dependency placeholders still
  shows its other blockers, and this run's entry is the one that clears.
  `displayRunSpanFixText` and `DISPLAY_RUN_SPAN_FIX_ACTION` are the one sentence
  and the one button name both surfaces print, and `hdbtSpannedRunReason`
  (`hdbtDisplayReceiver.ts`) is the one span sentence the brief, the template
  rows and a fixed record all carry. The offer turns on the span the receiver
  serves (not the measurement), needs a quoted receiver because the gate blocks
  nothing without one, and is withheld when the planned span is still past the
  quoted part's own rating: scheduling a set that leaves a 35 m receiver on a
  65 m span would be the reason asserting a fit the room does not have, so that
  rep has to change the receiver instead.
- A template's copy carries the design, not the room it was measured in.
  `duplicateCustomRoomTemplate` and `saveRoomTemplateCopy`
  (`customRoomTemplates.ts`) both spread the template record, so the surveyed
  run, the span the receiver serves, the Discovery answers a new room is
  pre-filled from and the room topology travel with the design. The run has to:
  it is what chose the quoted receiver, so a copy without it would quote a part
  for no stated reason and ask again for a measurement the design already
  answered. Site evidence cannot follow it — a template records no wall, photo
  review or measured runs, and `normalizeTemplate` reads stored entries through
  an allow-list, so an older or hand-edited entry cannot pass one into a copy.
  A placeholder row is the opposite case (see the dependency-prompt rule): a
  question this room raised is not scope the next one should quote.
- A governed dependency prompt holds the export too, and the gate answers it
  rather than sending the rep to another page for it.
  `buildGovernedDependencies` emits `TBC-` lines for questions no catalogue part
  answers (which TX/RX pairing, whether the installed cable is certified),
  `governedDependencyToBomRow` turns each into a `Validate` BOM row, and
  `validateProposalExport` blocks on any `TBC-` row as
  `chain-tbc-dependencies`. Recording one is a scope decision, not a part
  choice: `dependencyUnquotedProject` (`dependencyScope.ts`) adds the SKU to
  `StoredProject.unquotedDependencySkus`; `buildSalesReadinessPackage` leaves
  that prompt out of the BOM while keeping it in `governedDependencies`, which
  is the document's own Dependency list, where the question belongs; and the
  codec upper-cases and de-duplicates the list so a reload reads the decision
  back. Only prompts are ever dropped — a stored list naming an exact
  dependency takes no equipment out of the room, and `dependencyUnquotedProject`
  returns null for one. `pendingDependencyPrompts` is what the gate offers, read
  from the package's dependencies rather than from its rows, because a row that
  was removed is not evidence of the decision; `DependencyScopeFixes` renders
  one button per prompt, since one room can leave the network to the customer's
  IT and still choose its own endpoints, and the wizard mounts it under the
  `chain-tbc-dependencies` blocker with the list opening itself while one is
  outstanding. The action writes through `updateStoredProject` against the
  stored copy, like the display-run fix. It deliberately does not say who
  supplies the dependency: half of these prompts are WyreStorm-side choices, so
  a "supplied by others" line would print a claim the rep may not be able to
  make.
  A template is a starting point for a different room, so the question does not
  travel as scope and does not reach a template's export gate. `templateSchedule`
  (`customRoomTemplates.ts`) is the one rule and every path that makes a new
  template goes through it: `saveProjectAsRoomTemplate` (whose `projectBomRows`
  still copies a project's proposal rows), `saveRoomTemplateCopy` from the
  template page, and `duplicateCustomRoomTemplate` from the library. It keeps the
  named parts, takes the `TBC-` rows out, and names each dependency in the new
  template's `validationItems` — which the proposal prints as an unverified
  assumption — skipping one the list already names in a longer sentence, so
  copying a copy does not say it twice. Only prompts move this way: an exact
  dependency names a part, and dropping it would take equipment out of the room.
  A save is a projection, so the project, template or stored record it came from
  keeps its own response untouched; the stored template's page is where its
  prompt is answered.
  A stored template can still carry a placeholder — one saved before that rule,
  or a hand-edited store — and then that page holds the document, so it can
  answer it. `templateDependencyPrompts` reads the page's rows and
  `templateDependencyRecord` clears one where that document prints it: the row
  keeps its place but leaves the schedule (status `excluded`, qty 0, the rule
  `templateBomRows` filters on) and the dependency joins the same
  `validationItems`, so the question survives the click instead of being deleted
  from the read. Both are page state handed to the template's save paths, and
  the same `DependencyScopeFixes` list renders them under
  `DEPENDENCY_PROMPT_BLOCKER_ID` (`proposalExportValidation.ts`, the one name for
  that blocker) — a template has no `unquotedDependencySkus` store, so it names
  the dependency in `validationItems` rather than in a governed dependency list.
  A template's lineage is named only where it resolves. `sourceProjectId` and
  `sourceTemplateId` record where a stored design came from;
  `createCustomTemplateEditHandoff` carries the second so editing a copy does not
  forget the design it was made from, and `templateLineageRecord`
  (`templateLineage.ts`) turns both into the one line under the template page's
  summary (`TemplateLineageNote`): `Saved from <project>` linked to that
  project's record, `Copied from <design>` linked to that template. Each half is
  shown only while this browser still holds the record, so a deleted source
  leaves no name with nowhere to go; losing one half does not hide the other, and
  a template is never read as its own source. The project id's other reader is
  the templates library, which filters by it: `templateSourceProjects` offers
  only projects the store still holds, so every chip has a result and a deleted
  source is not an unnamed row — its designs still list under their market;
  `templateMatchesSourceProject` is the predicate, and a design saved from no
  project is nobody's. A chosen source searches the whole library rather than the
  market on screen, because the question is what came from this room and not what
  came from this room in this market: the rail shows no pressed market while a
  source is set, and choosing a market clears the source.
  The project record offers the same decision, because the record is where a rep
  reads a saved room before sending it. `projectDependencyPrompts` reads the
  response's own `governedDependencies` and `TBC-` BOM rows rather than
  rebuilding the package — a save older than the dependency list still carries
  the placeholder row, and a project with no saved response has nothing open —
  and `DependencyScopeReview` renders it as the `project-dependencies` panel in
  the record's Requirements section. `DependencyScopeFixes` is the one list both
  surfaces mount, over the same `DependencyPrompt` rows, so one of them cannot
  offer a decision the other would not; a row prints the question the document
  carries when the save recorded one.
  The lineage reads both ways. `templatesSavedFromProject` (`templateLineage.ts`)
  answers the project record's question — which stored designs name this room —
  and `ProjectTemplateLineage` prints it above the record's panels: one sentence
  with the count, then `Open template: <name>` per design, because a room can
  produce more than one design — its own template and the copies made from it.
  That wording is printed, not hidden behind an `sr-only` verb as it once was, and
  it is the action menu's, the gallery row's and Home's, so one fact reads one way
  wherever a rep meets it. It reads
  the stored templates rather than remembering the click, so the fact survives a
  reload and a design saved from this room on an earlier visit still appears; a
  template deleted from the library stops being listed (a link to it would land
  nowhere) and a room nobody has saved prints nothing. That is why the record
  keeps no `savedTemplatePath`: the note is the record, not the confirmation. The
  projects gallery answers the same question before a record is
  opened, and it answers with the links: the card's action row carries one
  `Open template: <name>` per saved design, read from the same
  `templatesSavedFromProject` filter, so a deleted template stops being listed on
  the card exactly when it stops being listed on the record. The card carries no
  chip counting those designs. It used to, and the chip was the same answer a
  second time — the row named each design already, above the Copy and Delete
  buttons a phone has to keep on the card — so it went the way of the focused
  strip's count, and `ProjectTemplateChip` is now Home's alone. The page reads
  the store once with `useCustomRoomTemplates` and passes the array down, so a
  card does not subscribe per row.
  Home mounts the chip only on its unguided Recent Projects card (its topline,
  beside the survey chips, outside the project link): that card opens each saved
  design from its action menu, so until the menu is opened the chip is the only
  reading that says the room has been saved: `Saved as a template` or `Saved as N
  templates`, with the design names in its tooltip and accessible name and a link
  to the first one the record lists. Its variant is a named constant rather than
  a literal inside `statusChipClassName(...)`, because `check:unstyled-classes`
  reads a string in that position as a class name. The focused strip's card prints
  the links themselves instead — one `Open template: <name>` per design
  (`wm-guided-recent-template`) — and no chip, because a rep working in Focused
  view is the one least likely to open the projects page, so that card has to
  offer the action rather than count it, and a chip over those links would name
  the designs printed directly beneath it. The rule for a new surface is that
  one: print the chip where the designs are not already links on screen, and
  print the links where they are. Each surface reads the templates once and
  passes the array down, for the same reason the gallery does. The link is a
  `Link` for the menu's
  reason (it navigates, possibly into another tab) and it carries `position:
  relative; z-index: 2` because the card's destination is the overlay beneath
  its content; the label truncates so a long design name cannot widen the strip.
  What it truncates is decided at phone width: `Open template: ` is its own span
  (`wm-guided-recent-template-verb`) and the <=560px block hides it, because a
  256px column spends the whole line on a verb twice over and two designs end up
  reading the same — measured at 360px, the name shows 42 of 83 characters with
  the verb gone and about 15 with it. The link's `aria-label` keeps the verb in
  its accessible name at every width and its `title` holds the whole name, which
  is the only disclosure left once the line does clip on a laptop.
  The short flags the card can carry — the survey chip and the re-confirm action
  — sit in one `wm-guided-recent-flags` wrapper, which stacks them on a wide card
  and lets the <=560px block put them on a line. They
  are readings, not sentences, and one per line made a room with a stale survey
  into rows of chips on the phone the strip is most used from — the designs the
  room was saved as are not one of them, since each prints below as its own link.
  `flex-wrap` is what keeps that from crowding — a chip takes its content width,
  so a long survey reading moves whole onto its own line instead of squeezing its
  neighbours. It does not give the chip somewhere to go once it is wider than the
  column, though, and a 360px card showed it: a stale survey reading
  (`Survey reviewed · 4 months ago · re-confirm`, 276px) came out at 265px with its
  label ellipsised — the half that says what the reading is, gone — and overhung
  the 256px column by 9px into the gap where the card's chevron sits. The <=382px
  block therefore drops that chevron (`wm-guided-recent-arrow`; the whole card is
  one hit area) and gives its 28px to the copy column: the widest stale reading
  (279px at 11 months) and a cleared one (249px for 12 rows) then print whole at
  360, and the re-confirm action follows on its own line. The `Open template:
  <name>` links stay out of that row on purpose: the name is the payload, and
  pairing two designs on one line truncates exactly the name a rep is choosing
  between. The current reading — the widths the strip holds, each card's copy
  column against the reading it prints, and how many characters of every saved
  design's name survived — is
  [the guided Home recent strip](../reports/browser-readings.md#guided-home-recent-strip).
  `assertGuidedRecentFlags` in `tools/browser-smoke-check.mjs` holds that from
  1366px down to 360px: it seeds a clean review 335 days old — the widest reading
  a card carries — on the first room the strip prints and a review that cleared
  two of four rows on the second, then fails when the flag row stops wrapping,
  when a flag or the row leaves the card's content box, or when a flag clips its
  own box, the label read past its box the way the gallery banner's is. A review
  is seeded rather than photographed because the flag only exists after someone
  applied a photo review and a preview build has no photo to read, and the store's
  order is what puts those two rooms in the strip. Two rules in that block are
  read: the single-column template, and the chevron's own `display`. With only
  `grid-template-columns: minmax(0, 1fr)` removed the walk fails at 360px, the
  stale chip ellipsising its label while the row still fits its column, and with
  the chevron kept inside the band it fails with "kept its chevron at 381px". The
  second reading is the one that stops a width passing by luck: a card that kept
  the chevron at the band's edge could still fit its reading there, and the pass
  would report a rule it never met.
  That row was then swept one pixel at a time from 360 to 560, with the pass's
  own seeded cards and its own invariants: it holds at all 201 widths, and it is
  tightest at 381px — the first width where the chevron returns, where the copy
  column drops from 304px to 277px, the narrowest in the band, and caps the
  widest reading 2px under its own 279px, the label showing 1px of that (inside
  the walk's tolerance, with none of it to spare). With the chevron the column is
  `width - 104`, so that reading needs 383px and up for the chevron to stay and
  print it whole — the block covered 360-380, which left its boundary 2px early
  for what it protects.  It covers 360-382 now, so the chevron returns at 383 and
  the column holds the widest reading with nothing to spare: the tightest width in
  the app. Both sides of that edge are measured. 383px is the width
  the chevron comes back at, so that is where the pass reads the chevron's own
  `display`, requires each card's own reading to fit inside that card's copy
  column, and prints how much room each had, and 1px over is allowed, the walk's
  own tolerance, so a
  fallback font's pixel does not fail a correctly laid-out card while a 2px squeeze
  does. That fit is not only asked at 383px: every card's slack is read at every
  width the walk loads, because the cards' columns are not the same width. 381px is one pixel inside the band, where the column has
  room to spare; it is held because a rule that never gave up the
  chevron would still fit the reading there and only the chevron reading catches
  it, which is the one thing 383 cannot tell. 360 and 390 stay for the same
  reason they were chosen: this app
  names `Geist Variable`, `Geist` and `Inter` in `--wm-font` with no `@font-face`
  and no webfont link in the tree, so a chip measured to the pixel here is not
  that number on the ubuntu runner the Browser Smoke job uses, and the margin the
  report prints at 360 and 390 is what makes those two holdable on both — which
  is also why 383's reading is a floor with a pixel of slack rather than an
  equality. Probing it by moving the block to `max-width: 383px`, so the chevron
  returns a pixel late, stops the walk at 383px with "The recent card dropped its
  chevron at 383px, where there is room for both" — the width is read, not
  assumed.
  The two edges used to be the whole of the column reading, with the widths
  between them worked out instead: while the chevron showed, the column was
  `width - 104`, so 383px was said to be the tightest of the band and the top of
  the phone block the widest (456px) without either being measured. Arithmetic
  about the stylesheet is not a reading of the page — a `max-width` on the copy, a
  wider gap between the card's cells, a chip that grew with its own label would
  each narrow the column in the middle of the band and leave both edges green. So
  the column is now measured at every width the walk loads, and 390px, 560px and
  561px are there for  the interior and for both sides of the band's top, where the column is read
  rather than worked out — the 109px between 560px and 561px is the status chip
  and its gap coming back into the card's first grid column. 390px is the phone
  width the
  strip is most often read at, and its number is what would show a rule scoped to
  the ordinary phone range rather than to either edge. 1181px and 1180px are there
  for the other edge the strip has, the one between three cards across and one per
  row, where the widest reading's spare room and each card's copy column are
  printed: the three single-column cards differ by the chips again, each now as
  wide as the strip.
  Each card is judged against its own column, and the summary reports the strip's
  widest reading rather than one card's. The column is what that card's grid keeps
  after its leading status chip, its chevron and the two gaps between them, and the
  three cards do not carry the same chip: the columns diverge where the chip is the
  card's leading cell, and the widths that give the chip a row of its own hold all
  three at the same column — every one of those columns is printed in
  [the guided Home recent strip](../reports/browser-readings.md#guided-home-recent-strip).
  The pass used to
  reduce the pair to the card with the least slack and record only that card's
  numbers, which held the tighter reading and left the other card's compared with
  nothing: with 233px and 286px columns at 390px, the tightest card is the one
  carrying the 231px reading, and the 279px reading on the wider card is described
  nowhere — so the number a reader checks a squeeze against was the wrong card's,
  and a divergence between the columns could leave a wide reading unverified. Now
  every card's slack is read against its own column at every width, and the printed
  line names the strip's widest reading, its room beside the tightest column met,
  and all three cards' columns and slacks at each width measured — the figures are
  in [the guided Home recent strip](../reports/browser-readings.md#guided-home-recent-strip). Probed by narrowing one card's copy column to 260px at 390px, where the
  walk fails there — "The recent card's flag row is 8px wider than its column at
  390px"; the row reading speaks first for a flag that overflows, and the per-card
  slack is the same failure said with the card, its reading and the shortfall. The
  other direction is probed by narrowing the second card to 233px instead, where
  nothing overflows: the walk stays green and the printed line still names the
  279px reading as the strip's widest, with 233px holding the 231px one at 2px to
  spare beside 286px holding the 279px one at 7px.
  That divergence is seeded rather than inherited, because a per-card reading is
  only worth making while the columns actually differ. The ship-time columns came
  from the starter rooms' statuses (347px and 367px at 561px); the walk now writes
  each card's leading status chip in the same pass that seeds the survey reviews
  and reads the labels back before measuring — `alternative` on the stale card,
  `recommended` on the cleared card beside it and `caution` on the third, all three
  the strip prints (`projects.slice(0, 3)`). Every one of the three is a status its
  room did not arrive with (the starters held recommended, alternative and
  recommended), so a chip that fell back to its starter is a duplicate the pass can
  see rather than a value it happens to expect, and the three are held pairwise
  distinct as well — a strip repeating a chip is the pass measuring one column more
  than once while the summary calls it three.
  The order is part of the seed, because the store allows exactly three statuses and
  two label lengths: `caution` is four characters shorter than `alternative` and
  `recommended`, so the short chip is the only one here that moves a column. It is
  the third card that wears it. That is the card the strip was extended for, and
  wearing it is what makes the strip's spread that card's: it wore `recommended`
  when the walk was first written — its own starter's status, and the same width as
  the stale card's chip — so the divergence came from two cards, and putting `caution`
  on the third is what leaves the widest column on the card whose chip the walk most
  recently wrote. The reading that holds it is the ordering, not only the spread:
  where the chip is a cell, the card wearing the short chip keeps the widest copy
  column, at least 8px wider than each of the two wearing an eleven-character label
  — measured 385px against 367px at 561px and 1014px against 996px at 1180px, the
  same 18px the divergence floor was derived from. A max-to-min spread cannot say
  that on its own: `recommended` and `alternative` differ in glyphs as well as
  `caution` does, so the two long columns are already 20px apart and the spread stays
  green when the short chip's column stops being the widest. The strip has two
  shapes, and the divergence is held to what each gives the chip rather than to
  "above the phone block": in the single-column band between the phone block and the
  stack the chip is the card's leading grid cell, so the seeded labels have to leave
  the columns at least 8px apart — measured 38px at 561px and 38px at 1180px — and
  wherever the chip takes a row of its own (`grid-column: 1 / -1`: 560px and below,
  and the three-column band) the columns have to match, which they do at 456px and
  378px. Probed by seeding two cards with one status: the walk stops before any
  width is measured with "The recent cards lead with alternative, recommended,
  alternative: each card's chip has to differ from the other two …", which is the
  reading that makes the seed a shape the strip shows rather than a list the pass
  expects.
  The three-column band only exists because of that, and the reading is what
  produced it: with the chip in the row, a third of the strip could not hold the
  widest reading beside it, and the walk stopped at the first width it measured in
  the band with "The recent card's flag row is 49px wider than its column at
  1181px" while every card's boxes at that width had already passed — the card
  clips rather than overflows, so the row was the only thing that said so.
  `@media (min-width: 1181px)` giving the chip the phone block's own row is what
  closed it (378px of copy at 1366px holding the 277px reading, 316px at 1181px
  holding it with 39px to spare), and the block stands after the card's base rule:
  one placed before it has the same specificity and loses the cascade, which is how
  the 49px failure was reached in the first place.
  The row itself is read as well, because one row is what the third card was
  printed for — a breakpoint moved to another width leaves every box green, each
  card still fitting the column it is given, and only the number of rows says the
  third sat alone under the first two. 1366px and 1181px have to be one row (read
  by card tops), 1180px and the phone widths one card per row. Probed by stacking
  the strip at 1400px instead of 1180px: the walk stops at 1366px with "The recent
  strip laid its 3 cards out over 3 rows at 1366px (card tops
  northbridge-meeting-room-refresh 836px, harbour-retail-signage-rollout 1068px,
  westbrook-classroom-standard 1221px), where the strip prints them as one row",
  and the card boxes at that width had passed before it, which is the false green
  the reading exists for. Seeding the same chip on every card still stops the walk
  at the divergence reading instead, with the three seeded labels quoted in the
  message, and giving the chip a fixed 80px track in the single-column band stops it
  there with the chips still differing and the columns equal; every other reading in
  those runs stayed green — a starter room edited to its neighbour's status can no
  longer leave the pass measuring one column twice and printing it as two.
  The top itself is a shape reading rather than a width, because the width alone
  cannot say what the block buys: at 560px the stale card's chip and the
  re-confirm action share one line and at 561px each has its own, since the row is
  the stacked grid again. Lines are counted by vertical overlap, not equal tops —
  the action is a taller box centred on the chip's row, and equal tops would read
  one line as two. Probing it with a `max-width: 380px` on the copy inside the
  phone block — enough for either flag, not for both — stops the walk at 560px
  with "The recent card's chip and its re-confirm action took 2 lines at 560px, the
  top of the block that lets them share one", while every other reading in that
  pass stayed green: each flag still fitted its own box and the row still fitted
  its column, which is why the pair splitting had to be its own reading. Moving
  that block to `max-width: 561px` stops it at 561px with "the flag row is still
  flex/wrap at 561px, above the block that lets the flags share a line", so the
  other side of the top is read too.
  The strip of next tools under every page's content (`FeatureJourneyStrip`, a
  `<details>` a rep opens from `More tools`) is held the same way, because an entry
  is a flex row whose copy column — the label over its reason — is the item that
  gives ground: it fits by squeezing the sentence (`Review the selected SKU in…`)
  or by pushing the chevron out of the entry, where the strip's border clips it.
  `assertOpenedFeatureJourney` opens that strip on the projects page, requires it
  to have started closed, and fails when the strip or its entry grid scrolls
  sideways, when an entry is wider than its own box, when the label, the reason or
  the chevron leaves the column, or when the label or reason clips its own text.
  The projects page is the one measured because its strip is the tightest the app
  prints: the page keeps its own inset, so its entries and copy column are narrower
  than the same strip's on the templates, ingest and recommendations pages at every
  width — a pass on one of those would report room this row does not have. Every
  measured width prints the same labels and reasons whole, over more lines where
  the column is narrow.
  Neither end is the narrowest column, so measuring only 1366 and 360 asked the
  rules where the row is loosest: the grid is `repeat(auto-fit, minmax(210px,
  1fr))`, so the smallest entry is the one just before an extra 210px track fits,
  and where that falls is set by the page's inset and the shell's sidebar rather
  than by a breakpoint anyone wrote down. The pass therefore sweeps every pixel
  from 360px to 1366px — 1007 reads of the strip's own widths, then the box rules
  at the width it points to — and the narrowest copy column it meets sits between
  the ends, because the entries give ground until the next 210px track would fit.
  That width is measured by the same rules as the two ends; a tie keeps the
  narrowest width of the plateau, and a sweep that lands on 360 or 1366 measures
  that end once. The sweep reads only what it compares — the strip, the entries and
  the copy columns — because it runs at every width, while the containment and
  truncation readings stay at the three widths that are measured. Probing it by
  inverting the comparison prints the widest column instead (212px at 376px), which
  is what says the sweep reads the page at each width rather than returning one
  value; and probing the rules by making the reason `nowrap` with an ellipsis still
  stops the walk at 360px with `The journey strip cut the reason under "Start
  Discovery" at 360px, so the entry fits by dropping the sentence that says why to
  use it.` The current reading is
  [the journey strip](../reports/browser-readings.md#journey-strip), where the
  narrowest column the sweep met and the three measured widths print.
  Both Home readings filter the same `templatesSavedFromProject`, so a deleted
  design stops being offered on either.
- The focused home has one primary action. Its hero's `Choose a room template`
  owns that treatment, and the video wall entry below it is `wm-guided-wall-entry`
  — a card with a glyph, its name and what it starts from, not a second aqua
  button. `.wm-polish-shell` on that page is `display: grid`, so a bare
  `inline-flex` link child stretches to the full column and reads as a banner;
  the card's `justify-self: start` plus `width: min(560px, 100%)` is what keeps
  it sized on a laptop and inside a phone (342px at 390px wide). Do not reuse
  `wm-guided-primary-action` outside the hero: two primary buttons on one page
  leave the rep no ranking to read.
  Every surface that offers a saved design prints the same link,
  `OpenTemplateLink` (`components/OpenTemplateLink.tsx`): the wording
  (`Open template: <name>`), the destination and the accessible name are that
  component's, and a caller only decides how the link looks where it sits
  (`className`, `labelClassName`, `verbClassName`, `icon`, `trailing`, `title`).
  Six surfaces print it — Home's recent card, the gallery action row, the project
  action menu, the lineage strip, the record's save confirmation and the template
  review page's save notice — and they had drifted: the confirmation printed a
  bare name where the others said the verb, one accessible name kept a verb its
  visible label drops at phone width, and the review page's notice printed a verb
  and no name at all — two designs saved from two rooms then offered two links
  reading the same, which is the failure a link's own wording is there to prevent.
  The verb is also the accessible name's, so a surface that hides it for space
  still announces what the name opens. Adding a surface means printing this
  component, not writing a seventh wording, and `OpenTemplateLink.test.tsx` pins
  the three facts so a change to one of them fails once instead of six times.
  The four that read the design back out of the template library cannot serve the
  two confirmations, because the design those name was written by the click that
  shows them and the library is another route. So `useTemplateProposal`'s
  `onSavedTemplate` hands the page the object `saveRoomTemplateCopy` returned
  rather than a path, and the page keeps that (`savedTemplate`) instead of a
  `savedTemplatePath` it would have to read a name back out of — the record's
  confirmation carries its `PageNotice` template for the same reason. The `Saved`
  chip beside the title reads that same value, so the two agree about whether this
  visit wrote anything. Naming the design also makes that notice longer than the
  phone row it sits in, so `.wm-template-save-notice` wraps: the sentence keeps a
  line of its own at 360px and the link takes the next, which is one line on a
  laptop, where nothing wraps. Sharing one line
  instead left the sentence an 88px column of four lines with the name wedged
  beside it — measured both widths before keeping the wrap. The current reading is
  [the template save notice](../reports/browser-readings.md#template-save-notice),
  which is the notice's box and its line count at both ends.
  `assertTemplateSaveNotice` in `tools/browser-smoke-check.mjs` holds that at both
  ends, in the state a rep reaches by clicking both of the page's saves: both
  sentences and both links, over the line count the report prints at each end. It
  clicks rather than seeds, because both saves are the page's own
  buttons writing the browser's store and no endpoint is involved; it reads the
  name it expects back out of `wingman-custom-room-templates-v1` after the click,
  so what it asserts is that the notice names the design this visit wrote. It then
  fails when any child's box leaves the notice's content box, when the notice's
  scrollWidth exceeds its width (it has to wrap rather than grow), when the named
  link's label was cut, or when the row did not wrap at 360px at all. Both halves
  were proved to bite: `nowrap` on the notice at phone width fails at 360px naming
  the three children that left ("Room design saved as a project." (286-463px
  outside 34-326px)…), and a bare `Open template` in place of the component fails
  "The notice's link should name the design the save wrote".
- The template review page did not render in a built app at all, and only a build
  showed it. `proposalDocxExport.ts` read the schematic palette into two tables at
  module scope (`TRANSPORT_COLORS` and `NODE_COLORS`), and that module sits in a
  cycle across chunks (`wm-room-design` → `wm-room-catalogue` →
  `wm-project-workflow` → `wm-proposal-generation` → `wm-room-design`), so the
  bundler can run it before `schematicVisualPalette` has initialized: every load of
  `/wingman/templates/<id>` died on `Cannot read properties of undefined (reading
  'aqua')` behind the error boundary, while the dev server, which loads one module
  at a time, rendered the page. Both tables are now built inside
  `createNativeSchematicDataUrl`, where the palette has answered — a module-scope
  read of an imported binding is exactly what a cycle can catch uninitialized, and
  moving the read into the function that uses it does not depend on which chunk
  wins. Those two were the only `.aqua` reads in that route's chunk graph. The
  chunk cycle itself is left alone: it follows the source's own barrel imports, and
  unpicking it is a job of its own. `check:browser` opens that route now, so a page
  that dies this way fails a walk instead of waiting for a rep to find it.
  That read was not alone, and the audit is worth repeating after a bundling
  change. Walking the built app for the whole class — source maps for the module
  → chunk map, then, from each entry, the emitted import order (the app boots
  from the HTML entry, so a route chunk only evaluates the chunks it has not
  already loaded) and every module-scope read of an imported binding — found
  seven more across six route entries: Compare's `decideComparison` alias, the
  `defaultDependencies` object in `runGovernedCompare.ts`, the reason prefix in
  `displayRunRecord.ts`, and the four-part `TEMPLATE_MARKET_STORIES` table in
  `templateMarketStories.ts`. Only the palette threw; the rest fail quietly,
  which is why they had sat there: `{...undefined}` is `{}` (an empty story
  table), a prefix reads `undefined: ` and stops matching the notes it is meant
  to find, and an undefined `runPipeline` throws only when a rep runs a compare.
  Each now reads where it is used — the palette inside its renderer, the compare
  default built by a function, `decideComparison` forwarded rather than aliased,
  the story table assembled on first ask, the reason prefix built inside
  `displayRunRecord` — and the same model then reports none of the remaining 174
  module-scope reads running before its definer on any of the 45 route entry
  loads. The precondition is the bundler's own setting, not a src cycle:
  `includeDependenciesRecursively: false` in `vite.config.ts` is what lets one
  group's chunk import another's that imports the first back. The current reading is
  [routes and shell](../reports/browser-readings.md#routes-and-shell), which is every
  address that rendered a page and the successor each redirect landed on.
  The pass that asks the same question of every route is
  `assertManifestRoutesRender` in `tools/browser-smoke-check.mjs`. It reads
  `src/wingman2/app/route-manifest.json` — the list itself, not a copy of it, so
  a new route is covered the day it lands — loads each `path` cold in the built
  app, and fails the walk naming the route when one dies. A route counts as
  rendered only when its `route-loading-fallback` has gone, `#root` is not
  empty, and neither the app's `app-error-boundary` nor the data router's
  default error element is on screen, because a chunk that never loads looks
  like neither a crash nor a page. A mounted shell is not a rendered page
  either: `AppShell` draws its topbar, navigation and page host for every address
  under `/wingman`, so `#root` having children proves the layout mounted and says
  nothing about the outlet inside it. The page host
  (`[data-wingman-visual-root]`) is therefore read after the load, and a route
  whose host holds no page — the journey strip under it is the shell's own and is
  not counted — fails by name with "rendered the shell with an empty outlet … the
  manifest or the router names an address this build does not own". That is the
  shape an address the router does not really own leaves behind: a splat whose
  remaining segment its page does not recognise, or a page that returns nothing
  for the param it was handed, keeps every box a rep sees around the page and
  loses only the page, which is also the only part a child count above it cannot
  see. Probed by making `TermsPage` return `null` in a production build: exit 1 at
  `/wingman/terms` with that sentence, and the other 34 addresses still green in
  the same run. It walks every route through to the end
  instead of stopping at the first failure, so one run reports all of them, and
  it says where each load ends up: seven manifest paths land on the page that
  replaced them and `/wingman/videowall` writes its own query state. Seeding one
  render failure into `TemplatesPage` fails it with `/wingman/templates
  (Templates) died behind the error boundary: <message>` — the regression it
  exists for. The parameterised shapes are not manifest entries, so the sweep
  reads them off the router instead: `registeredParameterisedRoutes` scans
  `src/wingman2/app/routes.tsx` for `path:` literals carrying a `:param` and fills
  each param from `SAMPLE_ROUTE_PARAMS` — the seeded room, the design
  `TEMPLATE_REVIEW_ROUTE` names, the first product family — or, for a param with
  no sample, from the param's own name, so registering a detail route is what puts
  it in the sweep. Both shapes no walk had ever loaded until then
  (`templates/:templateId/edit`, `product-families/:familyId`) joined it without an
  address being written anywhere. It fails closed twice: finding no shapes at all
  is a moved or renamed router rather than a router with no detail pages, and a
  shape written by interpolation cannot be turned into an address without
  executing the module. A splat (`product-call-cards/*`) is read too, because
  the manifest lists the base path and the page a rep deep-links to lives under
  it: the `*` is filled from `SPLAT_ROUTE_SAMPLES`, whose entry is a **list** of
  addresses — one sweep per fill, in order — and a splat with no sample is visited
  as `/sample` so a new one is never skipped for want of a literal here. The card
  carries two: `MX-0404-HDMI`, a SKU the seeded catalogue holds, so the first
  address opens a card rather than the card page's not-found state, and
  `MX-0404-HDMI/select`, a page *under* that card. The second is what holds the
  route to being a splat: one address loads one segment, and a page that reads its
  address by taking the last segment is only exercised at the depth a rep can
  deep-link to — a page that assumed a single segment hangs, blanks or dies on the
  deeper one, and the card address alone never asks. `select` is the segment the
  page already reads for itself (`getSkuFromPath` treats a trailing `select` as
  "no card chosen"), so the deeper address lands on the choose-a-product view
  rather than on the not-found state. Both render in the built app, and the pass
  summary prints each shape once per address, so the two are told apart by path.
  That shape
  is written as a `path:` literal in `routes.tsx` for this reading — it used to
  be built from the catalogue row's `segment`, and an interpolated template is
  exactly what the reader above throws on, so the sweep went back to loading
  only the base path the manifest already covers. Probed by registering
  `projects/:projectId/history`: the next walk listed five shapes and loaded
  `/wingman/projects/northbridge-meeting-room-refresh/history`, and pointing the
  reader at a file with no shapes failed the walk with the no-shapes message.
  The whole walk, sweep included, runs in about two and a half minutes.
  The same question is asked without a browser by `check:routes`
  (`tools/route-smoke-check.mjs`), because the walk only runs in CI's Browser Smoke
  job while `verify:contract` runs on every PR. That tool used to hold the manifest
  to itself — key, path and page file present, the page file on disk, a feature audit
  row per key — and none of that says an address is served: a page retired from the
  router keeps all four, so the audit stayed green while the address fell through the
  catch-all in `WingmanApp.tsx` (`path: "*"` → `/wingman/dashboard` → `/wingman`) and
  rendered Home. It now reads the router's own table: the `path:` literals in
  `routes.tsx` (an index entry serves `/wingman`, a splat its base as well as the
  addresses under it), plus, when the file spreads `...routeCatalog`, every manifest
  route whose key is in neither of the lists that filter skips — the
  `route.key !== "…"` literals and the `consolidatedRedirectKeys` set, both read from
  the router rather than restated in the tool. 41 addresses today, with all 29
  manifest paths among them. Ownership is held by address rather than by key, so a
  manifest entry whose `path` and `segment` disagree fails too. Probed by adding
  `"terms"` to `consolidatedRedirectKeys` — nothing else serves it, and the audit
  stopped with "No route serves /wingman/terms (terms): … falls through to the
  catch-all (path: \"*\" in WingmanApp.tsx, which sends a rep to /wingman/dashboard)".
  An address nothing owns is read as well, and that is what makes it a check rather
  than a table: `/wingman/route-smoke-nothing-owns` has to come back unserved.
  Probed by matching the table by prefix instead of by address — the way a splat's
  base would own everything under it — which left every manifest route passing and
  failed on that probe alone, and by registering a `path: "*"` inside the shell,
  which fails outright: with a splat in the table a manifest route and an address
  nothing owns render the same page, so ownership stops being readable at all.
  The reading itself lives in `tools/lib/route-ownership.mjs` — `readRouteOwnership`
  returns `servedAddresses`, the two skip-lists it read, `catchAll` and a `problems`
  list of the reading's own doubts — and the script keeps the manifest's half, because
  running the script proves the reading on one tree while a refactor is exactly what
  can change what it means there without changing that tree. `route-ownership.test.mjs`
  therefore writes a router source per shape instead: an index entry, a `path:`
  literal, a splat credited at its base rather than at everything under it, and
  `...routeCatalog` under a `.filter` naming `dashboard` and `callCards`, with
  `consolidatedRedirectKeys` holding `documents` and `support`. Four readings are
  pinned: a catalogue route is credited through the spread; a key either skip-list
  names is not, with both lists asserted as the sets the reading produced rather than
  as strings it happened to see; a skip-list rewritten as `new Set(consolidatedRedirectRoutes)`
  is reported as unreadable **and** credits no catalogue key, which is
  the failure that would otherwise read every page as served; and the sentinel address
  is absent while a bare `path: "*"` inside the shell is reported as the splat it is
  (`shellSplats`), since that is what the sentinel would look served from. `catchAll`
  and `normaliseAddress` are held there too, because the script's failure messages are
  built from both. Probed three ways against the module: ignoring the skip-lists
  (`if (false) continue;`) fails only "leaves a route out when either skip-list names
  its key"; dropping the spread's credit (`if (false) {`) fails only "credits a
  catalogue route the spread serves"; and crediting the sentinel fails the unowned
  probe plus the three other readings that assert `problems`, while the rest of the
  file stays green — so each spec is about its own reading rather than about the table
  in general. The module was restored byte-identical (`cmp`) after each and
  `check:routes` still reports the same 41 addresses with all 29 manifest paths among
  them.
  The other route audit took the same shape for the same reason. What
  `audit-wingman-route-registry-direct.mjs` answers — routes.tsx's lazy table, the
  catalogue's literal `/wingman` paths, the Product Call Cards ownership verdict, the
  `/wingman` links no route table serves, and the orphan `ComparePage` — is
  `readRouteRegistryDirect` in `tools/lib/route-registry-direct.mjs`, which takes the
  tree as data (`sourceFiles` as `{ path, text }`, repo-relative and forward-slashed,
  plus `routeManifest`, `route-manifest.json` already parsed) and touches neither the
  filesystem nor the console. The script keeps the walk over `src`, the reading of each
  file, the manifest and the printing; its report is byte-identical to the one it
  printed before the split apart from the link section, which is the one reading the
  split went on to change. Two facts are data rather than a decision: `missingRoutesFile` is a flag, not a
  throw and not an empty reading — the canonical page, a legacy directory, the old
  ComparePage and the catalogue are all facts of the tree, and the reporter stops on the
  flag before printing any of them, where an early return of zeros would have reported a
  checkout with no canonical page and no ComparePage; and
  `productCallCards.ownershipOk` is the verdict the exit code is built from, so the
  printer never restates it.
  The link scan is held to the app's two route tables, not to whichever catalogue names
  a path, because a catalogue row is not a route and cannot say whether an address is
  served. `declaredAddresses` is `route-manifest.json`'s own list — 29 paths here, in
  the order it declares them — and `routerAddresses` is every `path:` literal in
  `routes.tsx` (21 rows here, the root and the shell's `*` held apart), each rooted. Both
  are read because neither is complete: the manifest does not carry
  `projects/:projectId`, `product-call-cards/*`, `admin/data-manager` or the rows the
  router redirects on purpose (`dashboard`, `profile`, `finder`), so holding a link to
  the manifest alone reports 90 links — every one of them an address the app serves —
  where the two tables together leave 8. The catalogue used to be the authority and is
  now only a column of the report: `routeCatalog.ts` builds from the manifest instead of
  declaring literals, so the old scan knew the root and nothing else, and its section
  printed nothing while every project link in the tree was listed.
  What makes the reading worth having is the difference it draws. A parameter serves
  exactly one segment and a splat everything below its own base, so
  `/wingman/projects/harbour-retail` is served by `projects/:projectId` and
  `/wingman/projects-extra` is not a child of anything: matching segment by segment is
  the whole point, because a string-prefix test credits that link (probed) and the old
  scan's prefix rule was the reason a page nothing serves could read as served. A
  link's query and fragment are folded away before it is compared — the router matches
  the pathname — and the reporter prints the address it compared in `(as …)` when the
  two differ, so a stale link carrying `?view=audit#project-activity` names the page to
  change rather than the state. Skipped: a literal containing `${` (the address is not in
  the text), one naming a file (`/wingman/data.json` is a fetch, not a route), and a bare
  `*` in either table, since honouring it would serve the whole tree. On this tree the
  two that remain are both in test files, and the one that mattered was
  `/wingman/products/catalog`: the Catalogue Browser lives at `/wingman/catalog-browser`,
  and four specs — `CatalogBrowserPage.paging`, `.fetchError` and both renders in
  `.adminEdit` — linked the address before the rename, which is exactly what the report
  is for: it named the four rather than burying them among ninety working links, and
  they now hold the served address.
  The section is an exit code now, and turning it into one is what separated the four
  that were left. Two of them were not decisions: `/wingman/approvals` was the address
  the ApprovalQueue spec launched its page at while the app serves
  `/wingman/approval-queue` — the Catalogue Browser mistake again, in a render path
  rather than a link — and `/wingman/proposals` was a fixture `resumeTo` no route ever
  served. Both now hold the served address, so the fact that a spec claimed to be
  testing an address the app does not have is a failure rather than a paragraph. The two
  that could be explained are recorded with their reasons in
  `tools/wingman-stale-route-links-baseline.json`: `routeCatalog.test.ts`'s unknown path,
  which must not resolve, and a site-survey fixture's stored `resumeTo`, which no surface
  follows — the survey is a section of the project record, so there is no page for a
  room to resume to.
  The baseline is what makes the section a verdict. `compareStaleLinks` (same module)
  reads the run's own links against it and reports three failures, each named by the
  reporter: a link no entry covers (file, line and address, one line per occurrence, so
  a file that uses the same unserved address twice names both places to change); an
  entry whose link the tree no longer holds, because the list only ratchets down and an
  allowance kept after a fix is a note that the file is still suspect; and an entry that
  does not say what the address is for, since a decision without a sentence is one the
  next reader cannot review — which is also why `--update-baseline`, the only writer,
  writes from the run's own reading (`mergeStaleLinkBaseline`, carrying each surviving
  reason by key) and leaves a new entry's reason empty: the gate then reports it, so
  updating the baseline is a list of sentences to write rather than a quiet run. An
  entry is the file and the address as it was compared, never a line, so editing above a
  recorded link does not report the same decision as new work, and one entry covers
  every occurrence of that pair in that file.
  The list also remembers when it grew, because a count says how much the allowance
  permits and not what the rise consists of. Each entry carries `addedAt`, the date it
  entered the list, and `addedBy`, the write that added it; `updatedAt` and `writeSeq` are
  the date and the count of the write that last changed the list, rather than of the write
  that last touched the file: a write that adds nothing leaves both alone, which is what
  an unchanged `--update-baseline` run was read to do — the file's `2026-10-29` survived
  the rewrite. The reporter prints that write's entries as `(added <date> by write <n>)`
  on their own rows and says how many on the allowance line — "last updated 2026-10-29 by
  write 2 (1 entry added by that write)" — so a rise is the files it came from rather
  than one more than last week. The write, not the date, is what identifies them, because
  a date is a day: the first version compared `addedAt` against `updatedAt`, and a second
  addition the same afternoon joined the first — a temporary `/wingman/nope-not-a-route`
  export reported "3 entries added by that write" with all three marked when one was that
  write's. `writeSeq` moves when the list does and `addedBy` is stamped from it, so two
  writes on one day stay two writes; the same probe after an unchanged rewrite read back
  as `write 2 (1 entry added by that write)` with one row marked and the two entries of
  the same day left out, and the tree and baseline were then restored byte-identical
  (`sha256`). An entry that arrived without a date stays undated instead of being stamped
  with today, or a hand-written decision would read as this week's work; one that arrived
  without a write stays without one for the same reason — a file written before the
  record kept writes names the one write that made it, and does not re-attribute the
  entries it already held to that write.
  The list's age is printed beside its date, because an entry is a sentence written about
  a page and a page can move on while the sentence stays: `updatedAt` more than
  `STALE_LINK_ALLOWANCE_REVIEW_DAYS` (90) old makes the run warn — "the stale-link
  allowance is 154 day(s) old, last changed 2026-05-28 (the run warns past 90)" — and
  leaves the exit code alone. It is a warning rather than a fourth failure because a list
  that has not moved is the list working, and the three failures already answer whether an
  entry covers anything or says anything; what an old date adds is that nobody has read
  the reasons since. The note prints under the allowance line rather than inside the
  `--update-baseline` step, because that section is what a refresh run also prints: a
  write that changes nothing leaves the old date in place and the warning with it, while
  one that changes something has already dated the list today and says nothing, so the
  first is the run that is told. Undated, absent and unreadable dates warn about nothing —
  no date is not an old date, and the allowance line says "with no updatedAt recorded"
  for the undated file — a date after today is not old either, and both halves of the age
  are read as UTC days so a timezone cannot move the boundary. Probed by setting the
  file's `updatedAt` to `2026-05-28` and running `--update-baseline`: exit 0, nothing
  rewritten, the 154-day warning printed under the allowance line, and the file restored
  byte-identical (`sha256sum`) with the run quiet again. `route-registry-direct.test.mjs`
  holds the boundary (exactly 90 days is still quiet, the 91st warns), the UTC reading, a
  future date, and every date that is not one.
  Measured, the section's own gate was
  probed in both directions: a temporary
  `export const probeStaleLink = "/wingman/wall-builder-legacy"` appended to
  `ProjectsPage.tsx` stopped the run with "FAILED. 1 stale /wingman link(s) no decision
  covers: - src/wingman2/pages/ProjectsPage.tsx:185  /wingman/wall-builder-legacy" (exit
  1), and pointing the negative case at `/wingman/projects` instead stopped it with "1
  recorded allowance(s) this tree no longer needs: - src/wingman2/app/routeCatalog.test.ts
  — /wingman/not-a-feature"; the two files were restored byte-identical (`cmp`) and the
  run was green again. The policy prose in the file comes from
  `STALE_LINK_BASELINE_POLICY`, so a reader meets the rule before the list, and
  `route-registry-direct.test.mjs` holds both halves: the three failures (a covered link
  accepted while the ones beside it are not, a link moved to another line, a second
  occurrence of a pinned pair, a vanished entry, a blank and a whitespace-only reason, a
  malformed entry that must not excuse anything) and the merge (reasons by key, a
  vanished entry dropped, one entry per pair) — plus, since the file is data and nothing
  in it can notice the code dropping a check, that the prose still promises those three.
  The reporter fails the run on a manifest it cannot read
  (`Missing: src/wingman2/app/route-manifest.json`, exit 1), because an unreadable table
  would list every link in the tree as stale and report a broken tree rather than a
  broken read; the baseline is read the same way, so a file that is there and cannot be
  parsed is a failed read, while an absent one reads as no decisions made yet — that is
  what lets `--update-baseline` create it. `route-registry-direct.test.mjs` writes a tree per shape: a `fromNamedExport`
  table and a bare `lazy` that both resolve `.tsx`, a directory import that resolves to
  `index.tsx`, an import nothing resolves, a legacy directory beside the canonical
  page, a neighbour file whose path merely shares its prefix, a catalogue with literal
  paths, and the same tree with routes.tsx removed. The link wall is written out of both
  tables deliberately: a manifest path, the root, an undeclared path, a `.json` fetch, a
  `${}` address, a declared path with a trailing slash and one with a query, an address
  below the parameter row, one below the splat, `projects-extra` (which starts like a
  child and is not one), an asset literal beside the prefix, `dashboard` (which only the
  router registers) and `/wingman/proposals` (which neither does). Probed by dropping the
  `/index` suffixes, which stops the two table specs while the rest stay green; by
  dropping the `${` skip, which fails the link spec and the missing-router spec; by
  matching on a string prefix again, which credits `projects-extra` and the two-segment
  tail under the parameter row and loses two links from the missing-router spec; and by
  holding links to the manifest alone, which fails four specs — the link wall, the
  catalogue inversion (`dashboard` stops being served), the parameter/splat spec and the
  missing-router spec — while `declaredAddresses` stays green, so each spec is about its
  own reading. Three specs are new with the two-table reading: the inversion (a path only
  the catalogue names is reported, and the catalogue's own literal with it), the
  parameter/splat depth rules, and the fail-closed case where neither table declares
  anything and only the shell's own address is vouched for. The module was restored
  byte-identical (`cmp`) after each probe.
  The same room's design also rides in `ProjectActionMenu`: given `projectId`
  and the stored `templates` it filters `templatesSavedFromProject` itself, so
  the dashboard card passes the array it already read instead of subscribing per
  row, and it lists one `Open template: <name>` per design beside Edit and Copy
  (before Delete, which stays last). Those entries are `Link`s, not buttons,
  because they navigate — and because a rep can open one in another tab; the
  panel's stylesheet styles `a` alongside `button` for that reason, or the one
  navigation entry would have read as an unvisited link in a list of actions.
  Only the room's own templates are listed, so the menu cannot offer a design
  the chip does not name, and a room nobody has saved keeps its menu at three
  actions. The projects gallery card has an action row rather than that menu, so
  the same entry is a `Link` there (`Open template: <name>`, the menu's wording,
  one per design) sitting between Resume and the icon actions, because Copy and
  Delete are the pair that closes the row's right edge and they have to be last
  on the last line. Both surfaces filter the same
  `templatesSavedFromProject` from the array the page read. That row wraps and
  its `Open template` pill shrinks: `min-width: max-content` on
  `.wm-project-row-actions` made the row as wide as every action together, so the
  gallery's own `flex-wrap: wrap` never took effect and a room with two saved
  designs ran its second entry — and Copy and Delete after it — past a 418px card
  that then clipped them. The row now takes the card's width, and the entry keeps
  its label in `wm-project-template-link-label` so a design name longer than a
  narrow column truncates with the full name in its `title` rather than widening
  the row. `assertGalleryCardActions` in `tools/browser-smoke-check.mjs` holds
  that layout in a real browser: it seeds three long-named designs for one room
  into `wingman-custom-room-templates-v1`, opens the gallery on the All tab (the
  default tab is this browser's own rooms, so the card under test may not be on
  screen), and at 1366px, 1024px, 390px and 360px fails when any action's box
  crosses the card's edge or the card or its action row scrolls wider than it is. It names
  every action that left, so a failure says which entry escaped rather than only
  that something did. Copy and Delete are held a second time on top of that,
  against the card's content box rather than its border and on one line together,
  because the card pads 18px: an action that drifts into that padding reads as
  inside a border-box check while a rep can see it sitting off the card's own edge,
  which is the band a wrapped row's last child lands in. Both halves are proved to
  bite — a row widened 14px into the padding fails at 360px ("Gallery card icon
  actions left the card at 360px: Delete Northbridge Meeting Room Refresh
  (287-319px inside 54-306px)") while the border-box check stays silent, and icon
  buttons too wide to share a line fail with "put Copy and Delete on different
  lines at 360px". Closing the row's right edge is held too, and that is the half
  a wrapped row loses on its own: a design name longer than the card takes a line
  of its own — it is the widest thing in the row — so the old
  `a:nth-of-type(2) { margin-right: auto }` (the second link pushing everything
  after it right) only worked while the links and the buttons shared a line. With
  three seeded designs it left Copy and Delete at the start of the next line,
  289px short of the card's edge at 1366px and 180px short at 360px, so the row's
  right edge was set by whatever wrapped above them. That auto margin sits on the
  last line's first button now (`button:nth-last-of-type(2) { margin-left: auto }`
  in `wingman-sales-workspace.css`), which closes the edge at every width — 1px
  closed at 360px too, as [the project gallery](../reports/browser-readings.md#project-gallery)
  prints — and leaves a card with no designs
  exactly as it was, since the gap lands after Resume either way. Dropping the
  rule fails the walk at 1366px with "Gallery card left Copy and Delete 289px
  short of the card's content edge at 1366px".
  The row is measured in two states in that one pass: the room the walk seeds
  three designs for, and `SINGLE_DESIGN_ROOM_ID`
  (`harbour-retail-signage-rollout`, one of the gallery's own starter examples),
  which it leaves with exactly one — the state a single Save as template
  reaches, and the only row whose wrap cannot be blamed on a list of designs.
  One copy of the rules holds both (`galleryActionRowFailure`), so a wrapped row's
  last line is read the same way whichever row it is, and each failure names the
  room it was measuring while the count it expects — Detail, Resume, one link per
  design, Copy, Delete — keeps a row caught mid-render from reading as a shorter
  one. At 360px the three-design row wraps over more lines than the one-design
  row, and both pairs end 1px inside the card's content edge, which is the
  subpixel rounding the check allows for; the counts are the ones
  [the project gallery](../reports/browser-readings.md#project-gallery) prints.
  Each reading is printed with the line
  count it was taken over, because "the pair closes the right edge" is only about
  the wrapped case: a row that fitted on one line would satisfy it for the wrong
  reason. The same walk puts a sync conflict on that room, so the one card
  under test carries both the flag and the designs: the project store is written
  and `wingman:project-store-updated` published, rather than the page reloaded,
  because a reload runs the seeder over the store the walk just changed. It seeds
  three lanes (`proposal`, `requirements`, `videowall`) because the banner prints
  two lane labels and `+1 more` — the longest form of it a rep sees. That banner
  is a chip, and the chip's shared rule is one ellipsized line (`white-space:nowrap`
  with `width:max-content`), which is what a chip reporting a state wants and what
  this one cannot use: the lanes are its whole payload, and bounding it to the
  card's name column (`max-w-full`) only chose between the two ways of hiding them
  — unbounded it ran 16px into the card's padding at 390px, flush against the card
  edge and one longer lane label away from the card's own `overflow: hidden`, and
  bounded it fit by being cut ("Team changed: Proposal, Requi…") with the whole
  sentence in a `title` a phone never shows. It wraps now
  (`wm-projects-sync-conflict`: `width:auto` with `white-space:normal` against the
  shared rule, `max-width:100%`, and `flex:none` on an icon that is top-aligned so
  a two-line chip still starts its warning on the icon's line). The name column is
  the card's full width at phone widths, and two lane labels plus `+1 more` is at
  most a second line, so nothing below it moves. The walk fails on the truncation
  rather than on geometry (`scrollWidth > clientWidth` of the chip's label),
  because an ellipsized chip fits every box measured here — that is the state this
  decision exists to end, so a later `nowrap` cannot pass unnoticed. Seeded
  records are the honest way to reach those states: save-as-template republishes
  the room's own design, so clicking it twice cannot produce several on one card,
  and a sync conflict only arrives from a server merge. The wrap rule is this
  chip's alone: `ProjectStoreToolbar` renders the same conflict sentence from
  `syncConflictStatusMessage` and was not measured here, so it still answers to
  the shared one-line chip rule.
- The project record reviews requirements but does not edit them. Its
  Requirements panel prints one line and `Edit in Discovery`, and the inline
  editor that `updateRequirement` / `saveRequirements` served is gone; those
  helpers and the page's `saveProjectRequirementsToProject` import went with it.
  The panel then lists the saved rows through `ProjectRequirementList`
  (`pages/project/`): a count line from `requirementReadiness` (`3 requirements:
  1 confirmed · 1 needs review · 1 not confirmed.`), then one row per stored
  record with the label over the answer it recorded and the status chip on the
  right. The chip's title carries the record's `whyItMatters`, so a rep reading a
  red row learns what depends on the answer there instead of reopening Discovery
  to ask the same question. Nothing in the list is an input — the panel is a
  reading of what the saved questions produced, and changing an answer means
  leaving for the question that records it rather than editing the row.
  The rows follow the record, not only the page: the panel holds them in state so
  an answer this page saves is on screen at once, and that state is re-seated from
  `getProjectRequirementRecords(project)` when the record's rows change —
  Discovery in another tab, a teammate's save or a sync reaches it without a
  reload. `ProjectDetailPage.test.tsx` mocks a store that cannot re-render under
  a write, so this is pinned against the real one in
  `ProjectDetailPage.requirementSync.test.tsx`. The re-seat is keyed on the rows
  alone, and the page's transient state is keyed on the room instead: the
  confirmation line, the delete prompt and the blocker walk restart on
  `project.id`, because a write to *this* room — a deal outcome recorded in
  another panel, a proposal save — is not a move to another project, and one
  effect for both closed the sentence the action had just printed.
  A room's settled answers are the bulk of that list, so the panel offers one
  reading of the shortfall above the rows: `project-requirement-filter` is a
  `role="group"` of two pressed buttons (`project-requirement-filter-all`,
  `project-requirement-filter-attention`) reading `All N` and
  `Needs attention N`, where the shortfall is the rows whose status is not
  `confirmed` — needs review or no answer recorded, which is the same pair
  `needsAttention` selects. It filters the rows and nothing else: the count line
  stays the whole list's, so the two numbers cannot disagree, and the filtered
  reading adds `project-requirement-filter-note` saying how much of the list is
  on screen. `All N` restores the rows and drops the note. The filter is offered
  only when its two readings differ — a room whose answers are all settled has no
  shortfall to read, and a room where *every* answer needs attention would show
  the same rows either way, so both keep the plain list rather than a control
  that looks like it narrows and does not. `canFilter` is that one question
  (`shortfall > 0 && shortfall < readiness.total`) and the rows follow it, which
  also means a filtered reading is never empty: it implies a shortfall, so it
  has a row. The page keeps its rows in state, so the list re-renders rather than
  remounts when a blocker is answered in the Next Step panel; a shortfall that
  empties underneath the rep returns them to the whole list instead of leaving
  an empty list and no control to leave it by;
  `ProjectDetailPage.test.tsx` pins both readings, the all-need-attention end and
  that recovery, and
  the list's `aria-label` follows the one on screen so a screen reader is not
  told it is reading the shortfall while every row is out.
  A row a response cannot rely on also carries one action of its own —
  `project-requirement-question-<requirement id>`, reading `Edit in Discovery`
  with an `aria-label` naming the row, because the panel's own action uses the
  same words and two links reading alike are interchangeable. It opens the
  question that records that answer rather than the top of the walk: the table
  is `requirementQuestionId` (`lib/projectRequirements.ts`), written as question
  ids in strings because the project record is eager and `discoveryQuestions` is
  the lazy Discovery chunk — `projectRequirements.test.ts` holds those ids
  against `canonicalDiscoveryQuestions`, so a renamed question fails a spec
  instead of leaving a link that lands nowhere. A confirmed row carries no link,
  and neither does a row no question owns (`architecture` is Wingman's own
  reading of the answers; the `document-*` rows came from Document Ingest). The
  address is `discoveryQuestionUrl(questionId, projectId)`
  (`lib/discoveryResume.ts`, the row-level sibling of `discoveryResumeUrl`), and
  it carries the project: Discovery with no `projectId` reads this browser's own
  discovery snapshot, so the rep would land on the right question of whichever
  room this browser touched last.
  `?edit=<question id>` is the whole contract behind those links, and it lands on
  the question it names — for every surface that writes one (the requirement rows,
  the proposal wizard's checks, the conversation trail), not only the project
  record. The market / environment lead-in used to come first for a room with no
  environment recorded, which meant a rep who clicked one row was asked which
  market and which environment before reaching the answer they clicked: the
  lead-in is how a room is positioned for the walk, not one of the answers a row
  link asked for. `namedQuestionOnScreen` is the one rule — the lead-in stands
  aside only while the named question is in the list the page will render, so a
  stale or renamed id, and the page-level `budget` id that is not in the question
  set, still open the lead-in rather than dropping the rep at the top of the
  builder with nothing selected. Nothing is skipped for good: `showMarketContext`
  is derived from the saved answers on every render, so the room still has no
  environment recorded and the next entry that names no question (the resume
  link, the dashboard card, the record's own Reopen) puts the lead-in back in
  front of the walk. `discoveryStageStates.test.tsx` pins both halves — an edit
  link opening its section with no lead-in, and the lead-in kept for a question
  the saved answers hide. `?interview=1` is the other way in, and it resumes at
  the first open question rather than at one the caller names.
  That lead-in is also why the record states where the room sits rather than
  leaving it to be inferred. `projectPositioning` (`lib/projectPositioning.ts`)
  reads the two labels the lead-in saved (`roomModel.market` /
  `roomModel.environment`) and which of them is missing, and
  `projectPositioningLine` writes the pair as the one line the record prints:
  `Market: Corporate · Environment: Meeting room`. A half the lead-in never
  recorded says `not recorded` in its own slot rather than dropping out of the
  line, so a positioned room and a note about a gap are one shape to read and a
  rep comparing two records is comparing one sentence. That line is a record-level
  fact and prints on every record; `ProjectPositioningNote` (`pages/project/`,
  mounted under the sync banner) is that line, and, while either half is missing,
  the note around it: `No market or environment recorded`, or `No environment
  recorded` naming the half that is saved, because a template preset sets the
  market and leaves the space and "no environment" alone would send a rep into
  the brief to find out what the market was. The note adds the explanation and a
  link to `discoveryResumeUrl(project.id)` — the same entry the page's other
  actions use, and one that lands on the lead-in while the space is unrecorded —
  rather than a question id, because no Discovery question records either label.
  A label reads as recorded when it exists, including `Other / not sure`: the
  lead-in accepted that answer, so the note reports only what a rep can still
  supply. It is a record-level surface rather than a `ProjectRequirementList` row
  for the same reason it exists: the rows are the answers the questions produced,
  and market and environment are asked before the set — a row would be one the
  questions do not own and would move the readiness count for them. The page's
  test pins the both-missing note, the half-recorded one, and the positioned line
  (`data-project-positioning-missing` empty and no `aria-label="Market and
  environment"` region); the component's own `data-testid` is
  `project-positioning`.
  Do not reintroduce a second editing path here: Discovery owns the answers, and
  a page writing requirement rows itself would be a surface the questions do not
  know about. The readiness and workflow checks follow that contract now — they
  assert `Edit in Discovery` and `discoveryResumeUrl(project.id)` on the page
  instead of a marker string, so the gates describe the route rather than a
  removed component.
  Save as template itself keeps to one design per room:
  `saveProjectAsRoomTemplate` reuses the record a previous save wrote
  (`projectRoomTemplate` matches `sourceProjectId`, skipping any copy because
  a copy carries `sourceTemplateId`), so a second click republishes that template
  — same id, same `createdAt`, same name the rep gave it — instead of minting a
  duplicate under an identical name. A store an earlier build already left with
  two records is not cleaned up on the rep's behalf: the oldest is the one that
  updates, and the other keeps its place in the library until the rep deletes
  it. That lookup is exported because it is also the answer to "did this add or
  replace": the project record asks it before saving, so the confirmation says
  `Saved a new custom room template` the first time and `Updated this room's
  existing template: <name>` after, from the same call that decides which record
  is republished. The page's confirmations render as one `role="status"` line
  under the hero action that produced them (`project-detail-message`), which is
  also where `say` writes that nothing used to show. The line is a `PageNotice`
  rather than a string because a save carries the record it wrote: a template
  save passes the object `saveProjectAsRoomTemplate` returned, so the
  confirmation links `Open template: <name>` (`project-detail-message-template`)
  to the id that was actually republished instead of assuming the project's own
  id, and reuses `wm-project-template-lineage__link` so the name wraps like the
  lineage strip's rows rather than becoming a centred pill. The link is the
  notice's,
  not the page's: every other `say(...)` call drops it, so a saved requirement or
  a renamed project cannot keep offering a template it never touched, and the
  record's own lineage panel is the list of every design that room produced.
  It is a strip of rows, not a button: the name is the row, so a long project's
  name wraps at the card's left edge with the arrow at the end of the last line.
  The verb is printed here as it is on the lineage strip, the action menu, the
  gallery row and Home: a sentence next to the link saying a template was saved
  does not stand in for the action's own wording, because the wording is what a
  rep learns to look for across those four surfaces — a `sr-only` verb left the
  one link that follows a save reading as a bare name. Do not put
  the name back inside `.wm-ui-button` — that finish centres its text, so one long
  name became a four-line centred pill that pushed the summary down the phone
  screen. The strip sets its own 12/14px padding for the same reason: the page's
  18px left the name a line narrower than it needed.
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
  is not a save and the panel can point back at the video wall designer. The wizard
  passes its own `projectId` rather than relying on the active project. The
  cells themselves are `WallSurveyGapFixes`, shared with the template review
  page's survey warning, which records into `savedTemplateWall(...).projectId`:
  both surfaces offer the same rows and copy, and the template page renders the
  cells in place of the warning's "record it in the video wall designer" fix
  line, because it can take the cells itself. That warning's list is a column grid, so
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
