# Project record and site survey

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

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
