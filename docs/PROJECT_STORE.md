# Project store

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

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
- A stored record carries only fields a surface reads. The codecs are
  allow-lists, so removing one needs no migration: an older document's value is
  simply not read back, and the next write drops it. A sweep of `projectTypes.ts`
  and the localStorage records took out `evidenceFoundation`,
  `structuredEvidence`, `visibleSections`, `supportedRoomTypes`,
  `intendedAudience`, `personalisationOptions` and the unused `ApprovalDecision`
  / `ApprovalAction` pair, all of which were declared (some also written) and
  read nowhere; `CrmWebhookHistoryEntry.errorMessage` was left because the send
  history is the only record of why a POST failed, so its missing reader was a
  surface gap rather than dead schema — and that gap is the one thing worth
  closing instead of deleting: `CrmSharePanel` now prints the stored reason under
  the entry it belongs to (`wm-crm-webhook-history-failure`, the full text in its
  `title`), so a failed send explains itself rather than only reading `ERR`. Each
  send is its own `wm-crm-webhook-history-item`, which owns the divider, because
  the row alone cannot carry a second line and keep its trailing border right.
  The same reasoning put `CrmWebhookHistoryEntry.payload` there: a failed send
  keeps the exact body it POSTed (its `generatedAt` and base64 brief included)
  and the row offers `crm-webhook-retry-<id>` in its status cell, which
  `resendHistoryEntry` sends verbatim to whatever endpoint is configured now —
  the CRM gets the snapshot the rep first tried, not a rebuild of a room that
  moved on. A send that landed keeps no payload, so only a failed row has the
  action; the retry records its own entry (`sendHistoryEntry` is the one place a
  row is made from an outcome) and leaves the original row's failure in place,
  because it is the record of what went wrong first. `sendHistoryEntry` and
  `resendHistoryEntry` are therefore the pair to change together, and a retry
  that fails again simply stores the payload on its new row.
  The history panel also offers the whole job as one action
  (`crm-webhook-retry-failed`), because a rep who replaced a broken endpoint
  had to click each red row back in. It asks `resendableProjectFailures`
  (`crmWebhook.ts`) which rows are its work, and that is the only place the
  question is answered: the history is one list across every room, so the panel
  resends this project's failures and leaves another room's alone, and a
  failure recorded before bodies were kept is excluded rather than queued as a
  guaranteed error — `bulkResendNote` prints the count that could not be
  retried, or those rows would keep reading as sends the action missed. The
  retries run in order, not in parallel, so a refusal is attributed to the send
  that met it and one endpoint never receives the batch at once; each still
  records its own row through `sendHistoryEntry` and leaves the failure it
  came from intact. One `retryingHistoryId` disables both the row actions and
  the batch, so the two cannot interleave. A retry that lands marks the row it
  came from (`CrmWebhookHistoryEntry.retriedAt`, written by
  `markWebhookHistoryRetried`), and that is the one row rewritten in place
  rather than appended: the body has been delivered, so the row prints `Resent`
  instead of its action and `resendableProjectFailures` excludes it, while the
  failure, its reason and its time stay as the record of what went wrong first.
  The delivered snapshot goes with the mark (`delete marked.payload`): it can
  never be sent again, and a payload carrying the base64 discovery brief is the
  largest thing a row holds, so an old failure a rep has already resolved should
  not keep crowding the browser's storage. Rows marked before that change still
  carry theirs, so boot cleans them: `sweepWebhookHistory` (`crmWebhook.ts`) is
  called from `main.tsx`'s install block and pinned by `check:runtime-wiring`,
  because leaving the cleanup to "the next time the rep opens the CRM panel"
  means the reps who never open it keep the biggest rows forever. It writes only
  when it changed something, so a clean browser pays one read per load and
  nothing else. It is one sweep rather than two because both jobs are storage no
  surface asks for: delivered bodies, and a history over the ceilings below —
  `recordWebhookHistory` is the only append path, so a build that kept only a row
  count leaves an oversized history that would otherwise wait for a rep to send
  again, and a browser that never sends keeps the space for as long as it lives.
  It reports what it did (`clearedPayloads`, `droppedRows`) and is silent on a
  store it cannot read or write, since boot runs before any surface exists to say
  so. A refused retry marks nothing — its
  own new row carries the payload and is the failure a rep would resend next, so
  a partly refused batch leaves both the original and the retry in the queue.
  The bulk note's skipped count is the failures that never stored a body, which
  `CrmSharePanel` reads as `!entry.payload && !entry.retriedAt`: a resent row has
  no body either now, but it is not a send the batch missed.
  The history is bounded by two ceilings, because a row count alone never bounded
  this store: a row's size is not fixed — a failure keeps the body it POSTed and
  that body carries the base64 brief — so three long captures weigh more than
  twenty short sends. `fitWebhookHistoryToBudget` (`crmWebhook.ts`) trims the
  serialized list to `CRM_WEBHOOK_HISTORY_BUDGET_BYTES` (512 KiB) from the oldest
  end, and `recordWebhookHistory` applies the 20-row count first, to pick which
  sends, then the budget, to fit them. The newest row is never dropped, even
  alone and over budget: it is the send the rep just made, and a history that
  omitted it would say nothing about the attempt that failed — so an oversized
  send stays as the whole list and the next one trims it. A drop is not silent:
  the boot sweep leaves the count in `wingman-crm-webhook-history-drops-v1`
  (`readWebhookHistoryDrops`) and `WebhookDropsNote` prints it
  (`crm-webhook-history-drops`), dismissed by `crm-webhook-history-drops-dismiss`
  or by clearing the history, which takes the rows the note counts with it. Only a
  count is stored — who each row was for is exactly what was given up — and it
  adds up across loads until the rep has read it, so two loads that each dropped a
  send say two rather than the last one. It is storage rather than a load-time
  interruption: no dialog, and nothing said twice.
  Two surfaces mount that component, because the note answers a question a rep
  asks in two places. `CrmSharePanel` prints it above the cURL preview, which is
  where the send list is; the project record's activity log mounts it above the
  audit trail, which is where a rep who never opens the CRM panel reviews what
  happened to their room — the panel's copy alone left the biggest rows sitting in
  the storage of exactly the browsers whose rep was never told. One wording
  (`droppedSendsNote`, `crmWebhook.ts`) names the browser's CRM send history rather
  than a list, because the record has no list on screen to name, and one
  dismissal settles both: the note's `Dismiss` calls the same
  `acknowledgeWebhookHistoryDrops`. The panel keeps a `dropsNoteKey` counter and
  remounts the component when its own `Clear history` settles the note with the
  rows it counts, since the note owns its own read. On the record the note is
  browser-wide storage rather than a project event, so it stands above the trail
  and says so; it is printed only where a sweep actually had to drop a row, which
  for a clean browser is never.
  Both mounts are held by a walk pass of its own, because the CRM passes above
  measure the panel and its rows rather than this note:
  `assertDroppedSendsNoteInProjectRecord` opens `?view=audit#project-activity`,
  seeds the count a boot sweep would have left
  (`wingman-crm-webhook-history-drops-v1`), reloads, and then reads the note back
  against the number the store holds rather than one it assumed, so a sweep that
  dropped a row of its own still passes. It then opens the record's handoff view and
  the panel's send preview and measures the panel's copy through the same
  `measureDroppedSendsNote` helper, so one component's two mounts are held by one
  set of rules at one set of widths and every failure names the mount it came from.
  Then it presses the panel's `Dismiss` and reads the other mount: one
  `acknowledgeWebhookHistoryDrops` removes the key both copies read, so the pass
  reads that key back and reopens the record to see its copy gone. That is the half
  no measurement can show — both copies can fit their boxes and still leave the
  record telling a rep about sends they dismissed — and each half names its own
  cause: withholding the acknowledgement fails with the key still holding
  `{"droppedRows":3}`, while skipping the key read leaves the reopened activity log
  printing the note.
  The reverse direction is walked too, because one direction proves nothing about
  the other: the count is written again (consumed by the check above, and an absent
  key reads as settled on both mounts, which is the state that would pass this half
  without asking anything), the record is reloaded, its own `Dismiss` is pressed,
  and the key is read back — then the handoff view is opened and the panel's copy is
  read on a fresh load, so a panel that had merely un-mounted its copy on the
  record's page cannot stand in for one that read a settled key. That is the
  dismissal the record's mount exists for: a rep who never opens the CRM panel is
  exactly whose storage the biggest rows sat in, and a count left standing in the
  panel would describe sends they had already read. The panel is asserted visible
  before its copy's absence, so a panel that had not painted cannot satisfy the
  empty count; probing it by writing the count back between the two readings stops
  the walk with "Dismissing the dropped-sends note in the record's activity log
  should settle the CRM panel's copy too, but the panel still prints it", which is
  the false green that reading a `toHaveCount(0)` without that ordering would give.
  The panel's copy is measured in that pass rather than an earlier one because the
  count is seeded there: a note standing in the panel while the CRM passes run
  would put a line into the boxes they measure. At 1280px and 360px the pass fails
  when a child leaves the note, when the note scrolls sideways, when it is wider
  than the box that clips it, when the wording is cut, when the line shape is the
  wrong one for the width, or when the sentence keeps under 60% of the note where
  the dismissal shares its line and under 80% where the note wraps: the count is the
  sentence, so a note that fits by shrinking it beside the icon and the action fits
  by hiding why it is on screen. Both mounts are measured at both widths, and the
  handoff stack gives the panel's copy nearly the page's width at 1280px, so the
  two land in the same two shapes rather than one standing in for the other — the
  boxes are in [the CRM send history](../reports/browser-readings.md#crm-send-history). Removing `flex-wrap: wrap` from `.wm-crm-webhook-drops` fails the walk at
  360px with 137px of 198px — 69% of the note — which is the count sharing the
  action's line instead of having one; scoping that rule to `.wm-crm-share-panel`
  fails only the panel's copy, "the CRM panel: … 69% of the note at 360px (135px of
  196px)", which is what shows the second reading is its own. A
  line is read by vertical overlap rather than by equal tops, because the dismissal
  is a taller box than the sentence beside it and sits centred on the row: equal
  tops read the desktop's single row as two lines, which is how the pass's first
  version failed at 1280px on a note that was laid out correctly. The note
  write is guarded on its own, since a store that refuses the note must not turn a
  trim that already happened into a sweep reporting nothing, and a browser that
  refuses it stays silent as before. The rows themselves stay gone — the panel's
  retry actions work from what the browser holds. Both ceilings are applied in one
  place, `withinHistoryCeilings` — count first, to pick the sends, then budget to
  fit them — so the write path and the boot sweep cannot obey different rules; a
  history written before the budget existed is therefore fitted by the next send
  or by the next load, whichever comes first.
  A write can still be refused — the history shares the origin with the project
  store — so `recordWebhookHistory` returns whether the row was stored instead of
  swallowing the refusal, and `CrmSharePanel` prints
  `crm-webhook-record-warning` (`historyRecordWarning`) when it was not. The two
  outcomes are said apart because they ask different things of the rep: a send
  the endpoint accepted has already gone, so the loss is that the list will not
  offer it again, while a send that failed has lost the only body a retry could
  post and has to be sent again by hand. Either way silence would read as a send
  that never happened, and that list is where a rep checks what reached the CRM.
  There is no second attempt at the write and no partial row: a refused record is
  reported, not retried with less of itself, so the list a rep reads is always
  either the whole row or nothing plus the warning.
  The way out of that state is the rep's to take: `CrmSharePanel` offers
  `Clear history` (`crm-webhook-clear-history`) in the history header, the one
  caller of `clearWebhookHistory`, and it asks first
  (`crm-webhook-clear-history-confirm`, with `Keep history` to back out) because
  what it drops is not only bytes — the bodies kept for the failures this room can
  still resend live nowhere else, so the confirmation and the note afterwards
  (`crm-webhook-clear-note`, no status role, since the record warning owns that
  announcement) both name how many of them went. Both print only while the
  history holds rows, and the warning gains its pointer to the action
  ("Clearing the send history gives that storage back.") under the same
  condition, so neither promises room a browser with an empty history cannot
  give — and the note clears any resend note with the rows that note described,
  rather than leaving a batch result standing over a list the batch was not run
  against. It clears every room's rows, which is why the confirmation says so.
  Clearing is not the only way out, because the ceilings above keep the newest
  send even when it alone is over budget: one oversized failure — a stored body
  carries the base64 brief — can be the whole history, and a rep who wants that
  row's space back should not have to lose the record of the sends the CRM
  accepted along with it. Every row therefore carries its own drop action
  (`crm-webhook-remove-<id>`), the store's one single-row delete
  (`removeWebhookHistoryEntry`): it arms and confirms on the same button, the way
  the gallery card's delete does, and while armed the item prints what that row
  costs (`crm-webhook-remove-note-<id>`, `historyRemovalNote`) — the body a retry
  could post, or only this browser's record of a send the CRM already has — which
  is the clear confirmation's distinction drawn at one row's scale. A dropped row
  is gone rather than marked, and that is what separates it from a resend: a
  delivered body is a finished attempt whose failure is still worth reading,
  while a dropped row is one the rep asked to be rid of. The list is re-read from
  the store after the write rather than filtered in the panel, so a refused
  rewrite leaves the row where a rep can see it is still recorded — and dropping
  the last row removes the key, because an empty history is the absent one. The
  panel carries `min-width: 0` (`.wm-crm-share-panel`) because it is a grid item
  in both mounts and a grid item's automatic minimum size is its content-based
  minimum: the send history is the widest thing in it — a project name is one
  nowrap line standing beside the row's controls — so on a phone the panel held
  its widest row's width (411px inside a 273px column) and the page host's own
  `overflow` clipped the row's trailing actions, the conversation expander among
  them and then the drop control beside it. Measured at 360px and 390px with a
  failed send, a failure that kept no body and a delivered one, the column now
  decides the panel's width and the panel no longer runs under the host's
  clipping edge. What that measurement then exposed is the row itself: the name
  is the cell that gives ground, and it gave all of it — 17px of a 224px row at
  390px and none at 360px, leaving a status dot, a code and a time to tell one
  send from another. So below 560px the row wraps
  (`.wm-crm-webhook-history-entry` at `flex-wrap: wrap`) with the name at
  `flex: 1 1 auto` and a `min-width` floor under it
  (`wm-crm-webhook-history-name`): the name takes the first line at full width
  and the status, time and controls flow to a second, which is the shape a long
  room name needs and the one-liner a short name keeps. It is the narrow case
  rather than the row's rule at every width because wrapping at 1366px breaks
  rows that fit (28px to 64px tall); at desktop the row is unchanged. The name
  carries its own `title` for the width it does truncate at. The current reading —
  every width, each row's wrapped line count, the content width the widest row
  came to — is [the CRM send history](../reports/browser-readings.md#crm-send-history).
  `assertCrmHistoryRows` in `tools/browser-smoke-check.mjs` holds that layout in
  a real browser, in the walk CI's Browser Smoke job runs: it seeds five
  sends — two of this room's, one belonging to another, one six-character name
  (`Huddle`), and one failure recorded before bodies were kept — all but the last
  keeping the body they POSTed, which is what puts the retry control on the row. It
  opens the handoff section by its address (`?view=handoff#project-handoff`, how a
  link into the record reaches this panel), expands a conversation, and at 1366px,
  560px, 390px and 360px fails when the panel is wider than the box that clips it,
  when the panel or a row scrolls sideways, when a row's control leaves the
  panel's content box, or when the name is squeezed under 32px. Seeded rows are the
  honest way to reach this state, as on the gallery card: the row under test is a
  failure an endpoint refused, and a preview build has no endpoint. 560px is read
  because it is where the row's own rule ends, and the pass holds the row's
  **shape** there rather than only the card that holds it: it counts the vertical
  bands the widest row's controls occupy — that is the failed send which kept its
  body, since it carries the retry control beside the drop action — and fails when
  a row is not one band at 1366px, or when the widest row is not at least two at
  560px and below. Which row that is comes off the page rather than from the top
  of the list: a row's demand is its name's own text plus the controls beside it,
  the name measured through a `Range` so a short name in a wide cell is not read
  as a wide one, and the largest demand is the row asked. It is asked once, at
  1366px where every row is a single line and the text's width is the whole of
  what it demands, and then followed by name at the narrower widths — below the
  wrap width the name cell hands every long name the same width, so re-asking
  there would let the seed's order settle a tie between rows that are equally
  wide. The seed's own comment says its order is the history's (newest first) and
  nothing the walk leans on, and the walk that took `rows[0]` did lean on it: it
  measured a different row the moment the seed moved one, and a shorter name or a
  missing retry control would have read as the widest row still holding one line.
  Probed by lengthening the last-seeded failure's name — the row with no body to
  resend, so position and content disagree — in both mounts: green, and both
  summary lines named that row (944px of content, three bands at 560px, 390px and
  360px) rather than the boardroom failure sitting first (609px), which is a
  reading no positional pick can produce. Counting where the controls sit rather
  than reading the
  computed `flex-wrap` is what makes it a reading of the page: the box checks stay
  green with the media query moved off 560px, because a nowrap row shrinks its name
  to the 8ch floor instead of wrapping, which is the regression the shape catches.
  The narrow case has a reading of its own, because the widest row cannot speak
  for it: a name no phone width holds will show three bands even under a rule that
  wrapped every row, so the short-named send is held to one line where the row has
  room for its controls (1366px and 560px) and to no more than two bands below that,
  where the dot, the status, the time and the three controls are wider than the row
  before the name is counted. It is seeded as a failure too, so the one-line row and
  the wrapped one carry the same controls and the name is the only difference
  between them.  The widest row is one line at 1366px and wraps at every narrower width in both
  mounts, while the short-named row holds one line where the row has room for its
  controls and two bands below that in the record — the wizard's wider panel holds
  it on one line at 390px. Each reading is printed in
  [the CRM send history](../reports/browser-readings.md#crm-send-history).
  Probing that reading by giving the
  name a 200px floor below 560px stops the walk at 560px — "the project record: the
  short-named send's row took 2 lines at 560px, where a 6-character name leaves room
  for the row and its controls on one line: the wrap is for names that need it, not
  for every row" — while the widest row's reading stayed as it was, which is what
  the two rows are for. Probing the widest row by moving that media query to 480px stops
  the walk at 560px — "the project record: the widest CRM history row stayed on
  one line at 560px, where the row wraps: the project name should take the first
  line and the status, time and controls the next" — while every box check in the
  same run passed. Removing
  `min-width: 0` fails the walk at 390px with the clipping message, which is the
  regression it exists for, and that failure prints the panel's own chain of
  boxes — width, scroll width, display, grid columns, and whether each hides its
  overflow — because "wider than the box that clips it" names two boxes and says
  nothing about which ancestor stopped giving it room.
  The panel's other mount is measured by the same rules, through the same
  open/expand/measure helpers, so only the mount itself can differ:
  `assertCrmHistoryRowsInResponseWizard` opens `/wingman/proposal` through
  `enterResponseWizard` — one helper for the state, because a step is entered the
  same way whatever a walk wants next: it writes `activeProjectId` the way the app
  writes it, reloads, and leaves the step to the caller — and then clicks the step
  rail's own `Review and export` label, because the wizard renders the panel in
  its last step and only once a project is active. It does not seed again — the
  send history is one list per browser, so the rows the record pass seeded are the
  list this mount reads, which is the fact the panel is built around. Every
  failure names its mount, because the two columns are not the same and a report
  that said only "the panel" would not say which one came apart.
  That second mount is where the panel was actually broken, and the record's walk
  could not see it: the wizard's step card is a grid used as a stacker with no
  column declared, so its single implicit `auto` track was sized by its widest
  child's max-content — 501.938px inside a card that is 368px on a phone — and
  every child, the CRM panel included, was laid out at ~500px, with the page
  host's own `overflow` cutting the right-hand ~130px off. The current reading is
  [the step cards](../reports/browser-readings.md#response-builder-step-cards),
  which is each of the five cards' content against its own box.
  `grid-template-columns: minmax(0, 1fr)` on that card is what makes it lay its
  content out at the width it has; removing it fails the wizard mount at 390px
  with the clipping message while the record mount still passes, which is why an
  unmeasured mount is worth measuring. The card is also one component with five
  bodies of content, so that declaration was only proved on the step the panel
  happened to sit on: `assertProposalStepCards` walks all five, each opened by the
  label on its own rail button and each confirmed by the `Step N of 5` its heading
  prints — five readings of one card would otherwise be green under five labels —
  and at 1366px, 560px, 390px and 360px fails when a rendered box leaves the
  card's content box, when the card scrolls sideways, or when the card is wider
  than the box that clips it. It is green today, and the measured reason is the
  interesting part: at 360px every step's card holds its content inside the narrow
  box, so the four steps other than the panel's already fit at phone width on their
  own — deleting the declaration alone still passes them,
  and what it protects is the step whose content outgrows the card, which the CRM history
  row is. That row only exists in a state, so the pass measures step 5 in it: the
  send view is opened and the first row's conversation expanded before each width
  is read, through the same two calls the record and wizard mounts use, and
  the card then reports what it held — `history.rows` and `history.open` off the
  subtree that was walked — so a card that never received the list fails with
  "held 0 CRM history rows" rather than reporting a fit for content that was not
  there. At 360px that widest reading is the same card and the same widest box,
  because the panel's own `min-width: 0` is what keeps the rows inside it; what
  differs is which content was laid out. 560px is the fourth
  reading because it is where the send-history row changes shape: the row's own
  rule is `@media (max-width: 560px)`, so that width is the last one at which the
  name takes the row's first line and the status, time and controls flow below it.
  At 560px every step's card holds its content the same way, step 5 included on the
  wrapped row, and the boxes at all four widths are
  [response builder step cards](../reports/browser-readings.md#response-builder-step-cards).
  Without it the wrapped row only
  ever met the card at phone widths, where the card itself is narrower than the
  row's content, and the one-line row only at 1366px — a rule moved to 480px would
  leave the pass green while the card was never laid out on the wrapped row at a
  width the app gives it. It bites the moment a step grows such content: a
  temporary `min-width: 900px` on step 2's requirements grid stopped the walk there
  at 1366px, and an escaping box is reported before the card's own scroll reading
  so the message names the child to change. Those rules and the state check live
  in `tools/lib/proposal-step-cards.mjs` — one reader, `readStepCard`, returning the
  verdict and the line a report prints, plus `stepCardTreeReport` for the box chain
  — with `proposal-step-cards.test.mjs` (16 readings) pinning them over boxes
  written as data: the escaping box named first, the count and the extra names, the
  child reported before the card's own scroll, the one-pixel scroll tolerance, the
  clipped tree's marks, the rows/open readings, the state asked before the boxes
  because a card that lost the list holds the boxes of content nobody saw, and the
  summary returned beside a failing verdict. The walk keeps what only a browser can
  take — the `page.evaluate` that produces the boxes and the five step labels — and
  asks the whole card in one call per width. The reader is the module's whole
  surface beside the box report, so a caller cannot check the card's boxes and skip
  the state, and the numbers printed beside a verdict are the numbers it was made
  from. A temporary `min-width: 420px` on the
  history entry, scoped to the step card, stopped step 5
  at 390px — "div.wm-crm-webhook-history-entry is 420px wide, 113px past the card's
  content box" — while steps 1 to 4 passed in the same run, because no rows render
  on them: the reading is about the state the step is measured in, not about the
  card in general. Three kinds of box are skipped rather
  than measured through — content inside a scroller, which is reached by
  scrolling rather than cut; a viewport-anchored box, which the card did not
  place; and content the browser is not rendering, because a closed `<details>`
  body keeps its computed `display` and a layout rect and only `checkVisibility`
  says it is off screen. That last one is not a shortcut: the pass's first run
  failed on step 5's collapsed `Optional team review` section, whose hidden body
  briefly reported a 0px box 774px past the card.
  Neither mount's walk drops a send, and every reading above is green over a
  history a rep could not take a row out of: `assertCrmHistoryRowDismissal`
  holds that, in both directions, because one store has two surfaces. The record
  drops one of its own sends on the row's own action — armed, then confirmed,
  the two clicks a rep makes — and the response builder is opened on a fresh
  load to read it gone; then the builder drops one and the record is reopened
  for it, and each mount is held to the row count the other one left
  ("both mounts printed 3 of the 5 seeded sends"). One direction proves nothing
  about the other: a mount that had merely stopped printing a row it kept in its
  own state would satisfy the first reading just as well, and the failure says
  which mount the row survived in. The two sends it drops are taken from the
  seeded list (`CRM_HISTORY_ROWS.at(-1)` and `[2]`) so a change to the seed
  cannot leave the pass naming a row that is not there, and neither is the
  widest row, which the layout readings above are about. The list is seeded
  again afterwards, because the step cards and the dropped-sends note that
  follow expect the history those passes were given. Probing the reverse reading
  by putting the seeded list back between the builder's drop and the record's
  reload stops the walk there with all five rows printed again, which is what
  shows that reading is a reading of the store rather than of a value the pass
  carried forward.
  What the row says before that second click is a reading of its own:
  `assertCrmHistoryRemovalNotes` opens the record's handoff panel on the seeded
  list and reads the text of `crm-webhook-remove-note-<id>` — the sentence
  `historyRemovalNote` builds — for all three shapes the note has, rather than only
  that a note appeared. The failure that kept its body needs the body and `cannot
  be sent again`, and must not read as a send the CRM accepted; the failure
  recorded before bodies were kept needs `record of the failure` and `stored no
  body`, and must not read as either of the other two, since it has no body to lose
  and no endpoint ever took it; the delivered row needs `record of the send` and
  `keeps what it accepted`, and must not mention a body at all. The three texts are
  also compared pairwise, so a row printing one sentence for every shape fails even
  if that sentence is one of the right ones — printing the right sentence for its
  own row is all each per-row check asks for, and it is not all a rep reads. All
  three rows come from the seed by their status and payload (`status === "error" &&
  payload`, `status === "error" && !payload`, `status === "success" &&
  !payload`) so a change to the seed cannot leave the pass arming a row that is not
  in the list, and nothing is dropped: each cost is put away by pressing Tab, which
  blurs the row and disarms it — the component's own `onBlur` — and the stored
  history is read back at five sends to prove arming is a preview rather than a
  step already taken. That last reading is the point of reading the note at all: a
  note behind a click that had already deleted the row would be a receipt. The
  third shape used to be out of reach, because no seeded row was it: that sentence
  — the one a rep with a history older than bodies is offered — was held by
  nothing. Seeding the row is what closed it, and the layout readings above still
hold over five — the widest row is one line at 1366px and wraps below it in both
mounts, the short-named row holds one line where the row has room for its controls
and wraps narrower, and the name floors and box checks pass on all five, the counts
being [the CRM send history](../reports/browser-readings.md#crm-send-history)'s
reading — and the new row is the oldest send, so it sits last — an order the widest reading does not depend
  on, since the row it asks is the one with the most content to fit. The reading
  bites: with the body branch returning the delivered sentence, the walk stops at
  "A failure that kept the body it POSTed must say that dropping it loses the only
  copy a resend could post, but the row said \"Dropping it removes this browser's
  record
  of the send. The CRM keeps what it accepted.\"" — a visibility check would
  have passed that build.
  Count property accesses, not names: a generic field like `notes` is mentioned
  everywhere, and a form that edits one through `value[key]` is a real reader.
- Deleting a store from the source does not delete it from a rep's browser, so the
  install block in `main.tsx` also runs `sweepRetiredStorage`
  (`src/wingman2/lib/retiredStorage.ts`). It is the same bargain as
  `sweepWebhookHistory`: only keys that are actually present are touched, so a
  clean browser pays one read per load and nothing else, and it is silent on a
  store the browser refuses rather than taking boot down with it. The list
  (`RETIRED_STORAGE_KEYS`) is the whole record of what is retired, because no
  shipped source names those keys any more — `wingman:video-wall-last-summary` is
  the first entry and the largest thing an old build left behind: the wall builder
  used to write a second copy of the summary the draft and the project already held
  on every save, so a browser from an older build holds a whole wall summary in a
  store with no reader, and the builder will never look at it again. Waiting for
  "the next time a rep opens the wall builder" is the failure the sweep exists to
  avoid — the reps whose browsers hold the biggest copies are the ones who would
  never open it. Nothing is migrated: a key is retired rather than renamed because
  nothing wants its contents. `check:runtime-wiring` pins the call and the key the
  module names, since a sweep with an emptied list would leave the copies with
  nothing left to find them. Measured, the sweep ships in the entry
  chunk (`dist/assets/wm-app-core-*.js`), not a lazy one, which is where a boot
  call has to be. `retiredStorage.test.ts` pins the behaviour: the key goes and is
  reported, the stores this build still reads (`wingman-project-store-v1`, the
  legacy installation rate card) are left byte for byte, a browser that never held
  it is read and never written (spied `removeItem` is not called), a second load
  reports nothing, and a store that throws is silent.
  What it takes back is reported, but never on the load that takes it. Boot runs
  before any surface exists, so the sweep leaves the size in
  `RETIRED_STORAGE_RECLAIM_KEY` (`wingman-retired-storage-reclaim-v1`) and the
  *next* load's `takeRetiredStorageReclaim()` lifts it out before that load's own
  sweep can add to it — the take is before the write, and that ordering is the
  whole mechanism: a load can only report space a *previous* load reclaimed, and
  the key is gone before the strip is on screen, so it prints once. The strip is
  `RetiredStorageNote` in `WingmanApp`, beside `OfflineBanner` and above the
  routes, because the sweep's work is the browser's rather than a room's; the
  root-level rule that stretches every `#root` child to a viewport exempts it the
  way it exempts the banner, or the strip would push the app down by a page. Bytes
  are counted the way the browser accounts for a `localStorage` entry —
  `(key.length + value.length) * 2`, UTF-16 — and the store carries the size and,
  when the send history gave some of it back, that share; which keys went, and
  when, is exactly what the sweep exists to forget, and `check:stored-records`
  counts both fields like any other. `formatStorageBytes` prints `812 B` / `59 KB`
  / `1.4 MB`.
  The report is shared, because boot gives space back from two places and a rep
  asking whether it came back is asking about their browser rather than about one
  store: `sweepWebhookHistory` calls the same `recordStorageReclaim` with the bytes
  its cleanup freed, so one strip names everything boot gave back instead of only
  the largest single source — and a browser whose only reclaimable storage was a
  send history is told about it rather than told nothing. `main.tsx` therefore
  takes before *both* sweeps, and `check:runtime-wiring` pins that order for each,
  along with the CRM module reporting through `recordStorageReclaim` (five checks:
  the take, both sweeps, the take before each, and the shared write). The
  history's share is measured from the two documents — the stored entry before and
  after its rewrite, in the same UTF-16 unit — because a row's cost is not its
  payload's length (the quoting and the other fields are bytes the browser really
  holds) and the total must not be a sum of different things; a sweep with nothing
  to clean writes nothing, so a clean browser stays read-only. The store's
  `webhookBytes` field is that share, written only when a history contributed, so a
  report left by an older build — and one only a retired copy filled — reads as the
  copy it was.
  `reclaimedStorageNote` has three sentences because the two sources cannot be
  promised the same thing. A retired copy is read by nothing, so that report says
  "Wingman took back 59 KB of browser storage an older build left behind. Nothing
  was lost: this build never reads it." — one sentence, because the size is the
  part a rep can check and "nothing was lost" is the part that stops "Wingman
  cleared storage" reading as their work going missing. The send history is the
  rep's own record and its cleanup gives up delivered bodies and the oldest sends
  over its size, so a report carrying only the history says "Wingman took back 148
  KB of browser storage from its CRM send history: the copies of sends the CRM had
  already received, and the oldest sends once the history passed its size. The CRM
  panel names any sends that went." A report carrying both names each share apart —
  "… on the last load: 59 KB in copies an older build left behind, and 148 KB from
  the CRM send history — … Nothing a project holds went with it, and the CRM panel
  names any sends that did." — because the rep comparing a number they watched grow
  deserves to know which store gave it back rather than a claim about a copy that
  was never the only thing involved. The write is guarded on its own, so a store
  that refuses the note cannot turn a removal that already happened into a sweep
  reporting nothing, and it adds up rather than overwrites, so two copies, or a
  copy and a history, waiting to be reported are one number. A clean browser is
  still read and not written. `Dismiss` calls
  `clearCarriedRetiredStorageReclaim`, so a remount in the same load does not print
  what the rep has already read. The current reading is
  [browser storage reclaim](../reports/browser-readings.md#browser-storage-reclaim),
  which is the two loads' outcome rather than one load's share.
  `assertRetiredStorageNote` in the browser walk holds the two-load handoff in a
  real build, because neither half's unit test can see it. It seeds both sources a
  sweep gives back — a retired wall summary copy the size of a real one
  (`x`.repeat(30_000) inside a summary shape), and a CRM send a resend already
  marked delivered that still holds the 20,000-character body it POSTed — reloads,
  and fails if the stripping load prints anything (the report is written after that
  load's take) while reading both stores back, so a copy left behind or a delivered
  body the sweep did not clear is its own failure; then reloads again and reads one
  strip naming the total and each share: "took back 99 KB of browser storage", "59
  KB in copies an older build left behind" and "40 KB from the CRM send history",
  with "Nothing a project holds went with it" and the report key gone; it presses
  Dismiss and reloads once more, so the absence on the third load is not just a
  dismissal. The copy's and the body's sizes are the total one strip prints and the
  share each store gave back, read in
  [browser storage reclaim](../reports/browser-readings.md#browser-storage-reclaim).
  Both are
  derived rather than assumed — the copy's from the string the walk wrote, the
  body's from the two documents the sweep left — so a sweep that measured a key's
  name instead of its contents, or one whose share did not add up to the total,
  fails on the number. The history is set rather than added to, so what the sweep
  has to clean is this pass's own seed rather than whatever the earlier CRM passes
  left. Probed by swapping the take with the sweep that follows it, which is the
  ordering the note rests on: the walk stops at the first reading with "The sweep's
  own load should not print the space it is still taking back", naming the load
  that reported space it had not given back yet; `main.tsx` was restored
  byte-identical (`cmp`) and the walk green again.
- The store's sync line under the project filter reads a team member's change
the way the gallery cards do. One folding rule serves both chips:
`changedLaneLabels` in `data/projectSyncConflict.ts` prints a couple of lane
labels and `+N more`, and `syncConflictChipLabel` wraps it for the store line —
`Team changed: Proposal, Requirements +1 more` for one room, `Team changed in 3
rooms: …` when several are in conflict, since the cards name each room's own
lanes. The card's badge calls the same helper, so the two readings cannot drift
into saying the same change differently. `ProjectStoreToolbar` takes those rooms
off the projects' stored `syncConflict` flags instead of the sync status,
because the badges it sits above are stored facts: a browser whose session ended
still holds both, and the line above a badged card cannot go quiet while the
card speaks (a conflict status with no badged room — the hydrate that kept this
copy — still prints its own sentence). That is also what lets the browser smoke
walk hold it: `check:browser` builds with project sync off, because the flag
comes from the developer's `.env` and a CI checkout has none, so no conflict
status ever renders there while the stored flags do. The chip wears the card's
`wm-projects-sync-conflict` class, whose rule is the wrapping one: `.wm-status`
is a single `nowrap` line at `max-content` with an ellipsized label, and at
360px the store line's lane label fits in 253px only by taking a second line. The
current reading is [the project gallery](../reports/browser-readings.md#project-gallery),
which is where those rows, the design names they carry and the characters of each
name that survive are printed.
`assertGalleryCardActions` in `tools/browser-smoke-check.mjs` measures the card's
own badge and action row at 1366px, 1151px, 1150px, 1024px, 390px and 360px, and
the store line's
chip at 1366px, 390px and 360px, so the two readings of one change are held at one
set:
at 360px the card's lane label and the line's own width are the pair
[the project gallery](../reports/browser-readings.md#project-gallery) prints, and
either fails when a label truncates — the lanes are its payload. Dropping the wrapping class
fails the walk with that message at 390px, which is the regression it exists for.
The card's design entries are the row's other bounded thing and they truncate by
design, with the whole name in the link's own title — but an entry can be given
so little room that it prints the verb and a letter, which is the same card with
the design's name gone. Below the width where the gallery is a single column it
therefore keeps `min-width: min(30ch, 100%)` (in `wingman-polish-navigation.css`,
under the projects route): 30 characters of its own label, the `Open template: `
verb plus about fifteen characters of the design name, capped at the row's own
width so a narrower row cannot be overflowed by it. `assertGalleryCardActions`
then counts the characters the ellipsis actually left visible — one at a time
through a Range, rather than trusting the rule to have applied — and fails when a
name falls under `SAVED_DESIGN_NAME_FLOOR` (`tools/lib/saved-design-names.mjs`, 20)
at every width it loads. That floor is the same number the guided Home strip's
saved-design link is held to, which is the point of the module: the two surfaces
print the design a room was saved as, so a floor stated per surface let one of them
allow a name the other would fail — the gallery held 12 and the strip held 24, and
the strip's number was a target the gallery card cannot reach at any width it is
measured. The shared floor is 20, under the tightest case either meets — the
counts it is argued from are
[the project gallery](../reports/browser-readings.md#project-gallery)'s reading,
never a copy of them here, so a floor cannot outlive the run that measured it. It
is not higher because the phone card has nothing to give, measured rather than
assumed: at 360px the entry is already the design line's whole width, so a
`min-width` of 60ch changed nothing there, and the widths where the
floor does bind are the ones that cannot pay for it (a 60ch floor takes the
short-name row from 2 bands to 3 at 561px and from 1 to 3 at 760px). A floor above
the narrow end's count would be a number that end cannot keep and a card line the
wide end spends. That number has to be a column's
before it can be a floor's witness, and it was not: the short-seeded row's designs
were 23 characters, a card printed all 23 of them at every width, and so the
walk's tightest line reported a fixture's length — the same 23, measured against
nothing. Those designs carry a room and a display size now (34 characters), which
is still short enough that the row's wrap is about the count of entries, and long
enough that the entry is clipped on the narrow cards, so the count beside the
tightest one is what a column agreed to show. It was 12 for as long as the
gallery's two-column band reached into the phone widths, where the design entry
was left less than a name and the floor was the only thing between a stub and a
card that fit — which is why the band moved rather than the number staying.
The reading bites: with a temporary 40px label on the entry and no floor, the walk
stopped at 390px with "reduced a design name to a stub … 0 of 79, 0 of 103, 0 of
101", and a row that squeezed the entry's own basis to 60px left it 207px with 17
characters of the name once the floor was back. Those counts are the probe that
set the rule, not a reading of today's layout: what each width kept is printed by
`designNameWidthClause` in `tools/lib/saved-design-names.mjs` — the longest-named
entry, its count and its card, with the runner-up beside it, because a pick chosen
by name length can head two widths from different cards, and two equal counts then
say nothing about either column. That runner-up is the sentence's claim that the
number is a column's, so the walk holds it as one: the pick's box and the
runner-up's have to agree within a character of the pick's own text
(`designNameWidthAgreementFailure`), because a pair further apart is one card's
width printed beside another's and the count beside the pick would read as a
column's budget while measuring one card. The counts themselves cannot be the
comparison — two different names never print the same number of characters, since
the same 359px entry held 40 characters of a 101-character name and 45 of a
92-character one at 1366px — and a runner-up whose name printed whole is not a
column reading at all, its link ending where its name ends, so a width with only
that beside it keeps the pick's count alone. What the boxes agreed on is in that
sentence too, and the run's numbers live in the sentence and
in `reports/browser-readings.md`, never in a copy here. A single width could not
stand for the measurement anyway, since a card given a line of its own is the
opposite reading from the widest two-column one. Every pick in this walk that
decides *which* seeded thing is measured now asks by content rather than by
position: the CRM row by its content width and the short send by its name, the
gallery state by the card's room label and the design entry by its label width
(or its longest name), the icon pair's span by its outer edges rather than its
first and last child, and the design the save notice names by the newest
`updatedAt` in the store rather than `stored[0]`. The indices that survive index
the walk's own seed constants — `CRM_HISTORY_ROWS.at(-1)`
and `[2]` choose two sends to drop, and those sends are then found on the page by
their ids — because any two rows answer that question, so which two is not a
reading. The recent strip's three roles are the same rule read off the page: the
stale card is the one whose flag row holds the action that settles it (`settles`,
from `[data-survey-reconfirm]`) and every other card is a cleared review, so the
seed list's order decides nothing. Probed by handing the measurement
`[...RECENT_ROOM_IDS].reverse()` — the order the cards are measured in, not the
order they are seeded or asserted in: with `cards[0]`/`cards[1]` as the roles the
walk stopped at 1366px with "The stale reading on
harbour-retail-signage-rollout should carry its chip and the action beside it …
the card showed 1" while every assertion above it — each chip found by its room's
data attribute — passed, and with the roles read from the page the same reversed
run was green, the summary naming the same three cards and the same 279px widest
reading. The pick itself is a reading too, and the newest one: `RecentProjects`
prints `projects.slice(0, 3)` while the gallery pass before it pushes its own rows
onto that same store, so which rooms the strip shows is the store's order rather
than `RECENT_ROOM_IDS`'s. The pass reads the cards first — the room by the id on the
card's survey flag, the name by the text its copy prints — and holds that pick to
the seeded three before any box is measured, because every reading below is about a
seeded survey review and a seeded design: an order that put another room first used
to reach for the seeded ids on cards that were not there and read whatever the
strip printed. Every failure names a card by its own text, and the summary pairs
each chip with the room the page put it on (`alternative on Northbridge Meeting
Room Refresh`) in the printed order, opening with the three names it measured.
Probed by reversing the store inside the seed: the walk stopped before the first
width with "The recent strip picked Riverside Briefing Room Fitout (no survey
reading to identify it), Kingsway Training Room Refresh (no survey reading to
identify it), Westbrook Classroom Standard, where this pass seeds Northbridge
Meeting Room Refresh, Harbour Retail Signage Rollout, Westbrook Classroom
Standard". A card with no survey flag is reported as unidentified rather than as a
repeated room — `repeated` counts only the ids that were found, or two unidentified
cards would read as one room printed twice, which the first probe run did. That
membership check is `readRecentStripPick` in `tools/lib/recent-strip-pick.mjs`, and the
walk is left with the page read and the sentence: the check is the part a refactor can
quietly change, because this checkout's seed leaves the store in the order the strip
prints, so a version that read the store's slice, or that dropped the seeded-room test,
stays green here while measuring another room's cards. `recent-strip-pick.test.mjs`
writes the card lists instead — the seeded three, the same three reordered (accepted:
order is not the promise, and the readings follow the cards' own text), an unseeded
room, two cards with no survey flag, one seeded room printed twice with the count still
matching, a strip that printed too few cards, one that printed too many, an empty
strip, a card whose text was renamed while its flag still names a seeded room, and an
id that merely starts with a seeded one's. Probed against the module twice: emptying
`strays` fails five of the ten readings (the unseeded room, the unidentified cards, the
longer strip, the renamed card and the prefix id) while the reordered and duplicate
ones stay green, and counting nulls as repeats fails only the unidentified-cards
reading. The module was restored byte-identical (`cmp`) after each, and the walk's
summary line was unchanged (`diff`) over the run that now calls it.
The saved design under each card's flags is read at the band's two widths, because
that link is the one cell on the card whose payload is a design's name and the one
a narrow column can spend. The pass seeds one design per recent room from
`RECENT_DESIGN_NAMES` into `wingman-custom-room-templates-v1` — the library
`assertGalleryCardActions` filled a moment earlier for these same three rooms — and
replaces that room's earlier rows rather than appending to them: a card listing two
designs would have the reading taken on whichever the store printed first, and the
replace is exactly what the wrong-name failure is for. The characters are counted
one at a time through a `Range`, because the link prints its whole name in the DOM
and ellipsises it in the box, so the text is the name whether a rep can read it or
not. The count is held to `SAVED_DESIGN_NAME_FLOOR` — the gallery card's number, not
one of the strip's own — which is far under what the band prints — the per-width counts and the band's two
columns are
[the guided Home recent strip](../reports/browser-readings.md#guided-home-recent-strip)'s
reading. The floor is a stub guard shared by
both surfaces rather than a target either is measured against, and the strip's
printed numbers are what say how much of a name the band really keeps. The name is
held to the store's own row as well as measured for its length, so the number
belongs to the design this pass wrote rather than to whatever a previous pass left
in the library. Below 1181px the link used to be measured for nothing — the strip
stacks the cards there and the column widens, so the band was said to be the whole
promise — which left a phone with no reading at all: a rule that squeezed the link
there passed silently, with every flag on the card still whole. It is read at every
width now, and the promise is a stylesheet rule as well as a reading:
`.wm-guided-recent-template` carries `min-width: min(30ch, 100%)` beside the gallery
card's entry floor, so the link can never be given less than 30 characters of its own
text or the cell that holds it, whichever is smaller (~185px against the ~256px phone
column and the ~316px band column, so the rule is inert at every width the strip is
laid out at today and exists so a later one cannot squeeze the link without the row
overflowing). Over the nine widths the strip prints far more than the floor asks at
every one of them — the per-width counts are
[the guided Home recent strip](../reports/browser-readings.md#guided-home-recent-strip)'s
reading — so the floor is far from biting, and those numbers are what say how much
of a name a column really keeps. The floor was probed against this surface on
its own, the way it was probed above the gallery's 23: the constant raised to 41 and
the gallery card's name check lifted, because otherwise the gallery's 23 stops the
run first and the strip is never reached. The walk then stopped at 1181px with "The
recent card for Northbridge Meeting Room Refresh printed 40 of 95 characters of its
saved design's name at 1181px (…), where a saved-design link has to keep at least 41
on either surface that prints one" — the band's 316px column, which is the strip's
own witness and not its phone block, where the same card prints 49 to 50. So the
shared floor's second surface is held by the band and the number beside it is 40;
the constant and the check were restored byte-identical (`cmp`) and the run came back
green. Probed with a temporary `min-width: 0;
max-width: 40px` on the link inside the 560px block: the walk stopped at 560px with
"The recent card for Northbridge Meeting Room Refresh printed 6 of 95 characters of
its saved design's name at 560px (…), where a saved-design link has to keep at least
12 on either surface that prints one". The stylesheet was restored byte-identical
(`cmp`) and the walk green again.
The two sentences that carry the strip's own claims — `recentDesignNameFailure` and
`recentDesignMissingFailure` — live in `recent-strip-rows.mjs` with their specs,
because a green walk prints none of them. The third claim, the one about how much of
a name a column kept, is the shared promise, so it and its sentence live in
`saved-design-names.mjs` and both surfaces report through it — a wording per surface
would let the same failure read as two different promises, and the walk takes
`surface` ("gallery card" / "recent card") so the sentence still names which column
came apart. `saved-design-names.test.mjs` pins the floor, the sentence, and that the
walk declares no floor of its own, which is the drift a green run cannot see.
The shared sentence is the one that fired when the floor was first set at 20, from
the other mount: the walk stopped in the gallery pass at 581px with "The gallery card
for Northbridge Meeting Room Refresh printed 14 of 79 characters of its saved design's
name at 581px (…), where a saved-design link has to keep at least 20 on either surface
that prints one", which is what said the strip's 24 could not be the shared number.
That 581px card is what the band change answers: the two-column band now stops at
761px, the same walk measures the entry at 23 characters or more, and the floor is
the 20 that first probe wanted.
Probed before the floor was shared, with a temporary `max-width: 60px` on
`.wm-guided-recent-template`, the walk stopped at 1366px with "printed 0 of 95
characters of its design's name at 1366px (…), where a card in the three-column band
has to keep at least 24" — the verb filled the line, which is why the count is
characters of the name rather than the link's width — and dropping the merge (`kept = library`) stopped it at "printed its
saved-design link as \"Northbridge Meeting Room Refresh — standard Teams room with
dual 86 in displays\" … where this pass saved the room as \"… east wing boardroom
with dual 86 in displays and Dante audio\"", the gallery's earlier save outranking
the seed because the store lists it first. Both files were restored byte-identical
(`cmp`) and the walk green again with the same six numbers.
What is
still positional is not a reading of the seed: the leading chip
is a card's first `wm-status-chip` by template, the hero's third child is what
`:has(> :nth-child(3))` gives a column, a Range's first rect is the start of the
text, and the error-boundary and loading lookups name their element by its test
id. The example the summary prints is the entry with the most name to
lose rather than the first one the store listed: with three designs the first is
whichever the seed wrote first, so the printed number followed the seed's order and
could name any of them as the row's worst case. Probed by reversing
`GALLERY_TEMPLATE_NAMES`: the new pick printed the same east-wing design in both
orders, while the old `designEntries[0]` printed the huddle-room design in the
reversed one — a different design read as the same claim, and green either way. The floor is the entry's at every width,
not the phone block's: it held there first because that is where a card is narrow
enough to squeeze the entry, and a rule added later could squeeze a two-column card
the same way. Lifting it out of the block changes nothing above it — the entries there are
already past 30 characters of label, and every row state reads the same bands at
760px and 1150px, which
[the project gallery](../reports/browser-readings.md#project-gallery) prints — so
it guards the band without rewriting the row the walk declares. At phone width a short-named entry is widened
to 207px and stops sharing its line with another action, which costs the row one
line (6 to 7 at 360px) and truncates nothing, since the name was never longer than
the floor. The short name's shared
line is the one promise in that pass with a band rather than a single reading —
the gallery is three columns above 1150px, two down to 761px and one at 760px and
below — so the heights are walked, not jumped: 1151px and 1150px are the pair
either side of the first change, 1024px is the tablet inside the two-column band,
and 761px / 760px are the pair either side of the second. Those last two are read
for different promises. 761px carries a column count and nothing else: it is the
last two-column width, so its card is ~370px, narrower than the three-column card
at 1151px, and holding it to the widest card's band count would ask a narrow card
for a wide card's rows — its design line there cannot hold a name plus the pair,
so the short name takes a line of its own. 760px carries a
band count as a **ceiling** on the widest card's (`shape: "atMost"`, where the
tablet is `"same"`): it is the top of the single-column block, where the card is
wider — wide enough that its entry shares Copy and Delete's line — so a row
needing *more* bands there is a rule inside that block spending a line, while a row
with fewer has simply been given room, which is why equality would fail a wider
card for a layout doing its job. Every marked width is still held to the widest
card's own numbers, read off the page at 1150px, never to one declared per width.
581px is measured as well, at its new one-column count, because it is the width the
old band ended at and where the entry printed 14 characters: a band that reached
back down there fails the count rather than leaving the stub to a promise no width
covers. Its card gives the short entry room beside the pair and the long names the
line they take, so it prints a name rather than a stub — the boxes are
[the project gallery](../reports/browser-readings.md#project-gallery)'s reading.
The band used to run down to 581px, and that is the width the floor was pinned to:
a ~250px card gave its entry 191px and 14 characters. It stops at 761px now, so the
narrowest two-column card is a ~370px one and the entry there takes its own line,
against the single-column card at 760px where it fits beside the pair. Both
breakpoints live in
`wingman-sales-workspace.css` (`@media(max-width:760px)` for the grid); the entry's
30-character floor in `wingman-polish-navigation.css` moved with the block it
describes. Probed before the band moved, by putting `flex-basis: 100%` on
`.wm-project-row-designs` inside the then-580px block: the no-design row went from
1 band at 1150px to 2 at 580px and the walk stopped with "Gallery card for
Riverside Briefing Room Fitout wrapped its action row over 2 lines at 580px, where
the widest card at 1150px has 1 …". On the tree today all five states read 5, 3,
1, 2 and 1 at 760px against 5, 3, 2, 3 and 1 at 1150px — the ceiling holds with
room to spare, and the single-short-name row needs fewer bands in the wider card
because the entry keeps the pair's line there.
The summary reports those counts as numbers rather than only as holds, and puts the
760px one beside the 1150px one: `<headline>: 1px left over at 360px, wrapped over 5
lines; bands by width: 5 at 1150px, the widest two-column card; 5 at 760px, the top
of the single-column block, where the wider card must not need more; 5 at 1024px, the
tablet inside the same band, held to that count`. Those two are the pair a reader
compares — the wider card must not need more lines than the widest two-column one —
and a clause that said only `where the wider card must not need more` left the
second number to be found further along the sentence, so the ceiling now prints its
own count where the comparison happens. The tablet's follows, because it is the same
number promised again (`shape: "same"`) rather than a second measurement. Each state
prints its clause from the one list the seeding and the measuring read, so a sixth
state adds a clause by existing. That sequence is not written as a sequence: the one
place the count slots are ordered is `BAND_COUNT_PROMISES`, keyed by the promise a
width carries (`rowShape` declares the number, `shape: "atMost"` is the ceiling,
`shape: "same"` promises it again) and each entry owns its wording, so the counts
print in the order a reader compares them and a promise the table does not know is a
failure — printing it last, or dropping it, is a summary that stops describing a width
the walk measures. The list used to be three hard-coded slots, which meant the
sentence carried a copy of the width list's shape that nothing held: `find` took one
`atMost` width, so a second ceiling would have vanished from the sentence, and moving
a `shape` marker to another width left the words on the old pixel value. Within one
promise the wider width prints first, so the order does not follow the order the widths
are listed in `GALLERY_CARD_VIEWPORTS` either.
The table and the order now live in `tools/lib/gallery-band-counts.mjs`, because the
sequence is the one part of this pass a green run cannot read: every box check and
every hold stays true while the sentence prints the counts in the order they were
measured. The walk keeps only the page read — `{ promise, width, lines }` per count,
taken from the width's own `rowShape`/`shape` marker — and hands it to
`readBandCountSequence`, which returns the ordered `counts`, the `unplaced` sources and
the table's `promises`; `bandCountsClause` prints the tail or `""`, and
`bandCountSequenceFailure` is the sentence for a promise with no slot. Probed,
while the ceiling sat at 580px, by removing the `atMost` entry: the walk stopped at
that width with "The gallery summary has no place for the band count at 580px
(atMost): every promise a measured width carries has to be one of `declares`,
`same` …", which is the guard the table is for and now the only way the walk
reaches it. The ceiling is at 760px today and the sentence names whichever width
carries the marker, because the sequence is read from the marker rather than from
a pixel value. The reorder probe moved to the spec, where it belongs:
`gallery-band-counts.test.mjs` (14 readings) pins the table's order, the wording that
belongs to a promise rather than a pixel value, a second `atMost` width surviving
(which the old `find` dropped), the wider width first within one promise, the phrase
following `atMost` to a different width, and the unplaced promise being named rather
than printed last. Swapping `atMost` above `declares` fails 8 of those 14 — including
the order reading, so the regression is caught without a browser — while the walk
stays green, which is exactly the gap the module closes. Both files were restored
byte-identical (`cmp`), the spec green again at 14, and the extraction left the
gallery clause byte-identical to the run before it (`diff`), 5 at 1150px, 5 at 580px
and 5 at 1024px for the widest row — the band ended at 580px then, and the ceiling
now prints at 760px.
It holds at 1150px (a 495px card, its 461px design line giving the entry 253px
beside the pair) and at 1024px (a 432px card, entry 253px), and it is *not*
promised at 1151px: that card is 323px wide, and its 287px design line cannot hold
a 245px name plus the pair, so the name takes a line of its own there. That is
why the condition is room rather than column count — the three-column card at the
change is narrower than any two-column one, so `columns > 1` demanded a shared
line the row could not give. Room is read as the design line's measured width
against the entry's unellipsized label plus the pair, both off the page.
The pair also found the row's real defect: at 1150px the old greedy row fit
Detail, Resume and the entry (43 + 109 + 253px) in 461px, put Copy on that line
and wrapped Delete alone to the left of the next, which is a pair a rep cannot
read. The row is now three items — `wm-project-row-links` (Detail, Resume) and
`wm-project-row-designs` (the entries plus `wm-project-row-icon-pair`) — so a
line break happens between groups and never through the pair, and the pair's
`margin-left: auto` ends it on the card's right edge whether it shares the design
line or closes one of its own. The pass reads leaves (`a, button`) rather than
row children, so the action count and line count still count what a rep presses.
A pair that does come apart is said in the bands the row was grouped into rather
than as a list of tops — `Copy on line 5, Delete on line 6` —
because those bands are already the vertical-overlap reading the row's shape is
held to, so naming them answers what `913px, 1071px` left the reader to work out:
whether the two boxes were on two lines at all, and which one had moved. The
actions in a band say what took the line, and each button is named by the verb its
label starts with, because the `aria-label` repeats the room the sentence already
names once. The band list is one formatter, `describeBands`, and every failure that
prints a gallery row's bands goes through it — the split and the two band counts —
so `line 5: Copy …` reads the same in all three, and a band holding one action is
what `alone` used to say in a wording of its own. Probed by stacking the pair
(`flex-direction: column` on `wm-project-row-icon-pair`): the walk stops at
"Gallery card for Northbridge Meeting Room Refresh put Copy and Delete on different
lines at 1366px: Copy on line 5, Delete on line 6. The row printed line 1: Detail,
Resume active; line 2: Northbridge … standard Teams room with …; line 3: … east wing
boardroom varia…; line 4: … huddle room starter with …; line 5: Copy Northbridge
Meeting Room Refresh; line 6: Delete Northbridge Meeting Room Refresh — the pair is
one item, so a break belongs between the design line's entries and the pair, never
through it", where the old message printed two tops and then named each button's
companions in a second wording.
Both live in `tools/lib/gallery-row-bands.mjs` — `describeBands` and
`copyAndDeleteSplitFailure` — and `gallery-row-bands.test.mjs` holds them, because a
wording that only prints on a broken row is a wording nothing green can keep: the
walk's run says these sentences only when the row breaks, so a refactor of either is
invisible to a green pass. The spec hands in a row's bands the way the walk groups
them (Detail and Resume on one line, a design entry, `Copy`, then `Delete`) and pins
the numbering and the list: 1-based, by the order the grouping produced; one line
number per band however many actions it holds; a single-action band printed with no
word about being alone; and nothing at all for a row with no bands. The split is held
to name both lines by the number the list uses — the number in `Copy on line 3` is
checked against the index of the band holding `Copy`, read back out of the
formatter's own output, so the sentence cannot send a reader to a different line of
the list under it — to embed `describeBands(bands)` verbatim, so the split and the
band counts cannot describe one row two ways, and to read `on no line of the row` for
a button whose label the bands do not hold rather than line `0`. Probed twice against
the module: numbering the bands from 0 fails four readings — the three numbering
specs and the split's own "prints the same band list" — and replacing the pair's
`Copy on line 3, Delete on line 4` with a bare "Copy and Delete" fails the three
that read the naming, with the rest green each time. The module was restored
byte-identical (`cmp`) after each.
The recent strip's and the send history's sentences took the same route for the same
reason: both passes print nothing while their pages hold, so every sentence either one
contains is met only by a reader whose build is already broken — the one part of a pass
that a refactor can change without changing a reading. `tools/lib/recent-strip-rows.mjs`
holds the strip's (`recentPickFailure`, `recentSqueezeFailure` with the two widths
either side of the chevron's return, `recentRoleFailure`, `recentRowShapeFailure`, the
two column-spread sentences, the short-chip sentence, the per-role flag counts and the
two line readings at the block's top) plus `describeRecentPick` and
`describeRecentCards`, the formatters those sentences share and the summary prints.
`tools/lib/crm-history-rows.mjs` holds the panel's: the clipped-panel sentence with the
chain of boxes under it, the row's name, the missing widest row, the split rows, the
unwrapped widest row, the short row's two, and the removal notes' seven — the mismatch,
the wrong shape, a delivered send mentioning a body, two shapes printing one sentence,
and a reading that left the history changed. What stays in the walk is the sentence that
is a label and a number (`The recent strip lost the card for X at 390px`, `a CRM history
row is 12px wider than the row's own box`), because there is no claim in it the loop
cannot already show. Both modules are spec'd without a browser
(`recent-strip-rows.test.mjs`, `crm-history-rows.test.mjs`), and the CRM spec pins the two
things every one of those sentences has to keep: its mount — `the project record` or
`the response wizard`, because the panel is a grid item in two different columns, and a
report that said only "the panel" would not say which mount came apart — and the row by
the name the page prints, since the widest row is picked by content rather than by
position. The extraction also closed a wording defect it made visible: quoting a cost
that already ends in a stop printed `"."`, so the three sentences that quote a row's
words add their own stop only when the text has none. Probed by rewording the
unidentified-card note, which fails the formatter and the pick failure and nothing else
(2 of 20), and by dropping `${mount}: ` from the row-name sentence, which fails that one
spec and nothing else (1 of 16); both modules were restored byte-identical (`cmp`), the
two specs are 36 readings, and `check:browser` was green over the walk that now calls
them.
Each width that states a column count is also held to it (3 at 1151px, 2 at
1150px and at 1024px), so a gallery that re-columns somewhere else fails with
that reading instead of quietly measuring two widths of the same layout. Probed by
forcing the gallery to three columns at 1024px: the walk stopped with "Gallery
card for Westbrook Classroom Standard gave its short design name a line of its own
at 1024px in a 3-column gallery: its design line has 396px for the 245px name and
the 71px pair", which is the tablet reading speaking rather than the 1366px one
repeated.
- The shapes that pass measures are one list, `GALLERY_ROW_STATES` in
  `tools/lib/gallery-row-states.mjs`, with the widths it measures them at beside
  it as `GALLERY_CARD_VIEWPORTS`; the seed, the per-width loop and the closing
  summary all read them, and the action row's rule in
  `wingman-polish-navigation.css` names the list rather than describing the shapes
  in prose of its own: a sixth state is an entry in that list, not a second block
  in the check plus a paragraph in the stylesheet. The data left the walk for the
  reason the plan for it did: what a state is, and at which widths each column
  count holds, is the thing the walk asserts rather than the assertion, and
  `gallery-row-states.test.mjs` holds the half a green run cannot read — one
  banner state and it is the widest row, one short name meant to share the pair's
  line, a state with no designs bringing the room it needs, and every breakpoint's
  two widths one pixel apart, because a breakpoint that moved out from between them
  would leave both halves reading one count with the check still green. An entry carries
  the room and the design names to seed, the `project` a state brings when the
  three starter rooms cannot supply its shape (the no-design row and the
  two-short-name row each need a room of their own), and the `headline` its
  summary clause starts from; the numbers in that clause are read off the page
  during the run, so no entry remembers a measurement that could drift from the
  one just taken. Every state is held by the same rules — the row fit and its
  trailing pair inside the card's content box, its own link count (a card
  carrying a different number is the wrong store state, whatever its boxes say),
  and every entry's visible characters — with `banner` and `sharesLine` added
  only on the states those two readings belong to. `rowLines` is the one reading
  every state carries: how many lines its action row wraps over at 1150px, the
  width where the card is as wide as a two-column card ever gets, and the count is
  read there by vertical overlap rather than by equal tops — Detail and Resume are
  one line whose boxes start a pixel apart, and a short name sharing Copy and
  Delete's line is centred on it and sits two pixels above — so the number is the
  one a rep would give the row. The boxes this pass measures cannot answer the
  question on their own: a row that gives a group a line of its own still keeps
  every action inside the card, still closes its right edge with the pair and still
  prints a design name, and what it has spent is a line of the card's height. 1150px
  is the only width that can be asked, because at 1151px or on a phone the same
  count could be the layout giving a narrower card its lines rather than the shape
  of the row; the viewport entry carries `rowShape` so the width says so. The widest
  row reads as Detail and Resume, then one band per long-named design, then Copy
  and Delete; one saved design takes fewer bands, the single short name is the one
  state whose count differs between the two widths the summary prints (its phone
  floor takes the pair's line at 360px), the two short names share the design line
  and the second shares the pair's, and the no-design row is one band. Each
  state's count at each width is
  [the project gallery](../reports/browser-readings.md#project-gallery)'s reading.
  A band-count failure names the bands by the line they sit on and the
  actions on them — `line 1: Detail, Resume active; line 2: Northbridge Meeting
  Room Refresh — standard Teams room with …; line 5: Copy …, Delete …` — rather
  than by each band's top pixel, which is a number the reader has to difference
  against its neighbours to learn which line moved. The design names behind those
  actions come from the link's accessible name, cut at 60 characters, because the
  visible label is ellipsized inside its pill and the three designs of one room
  share their first 33 characters: naming bands by the visible text printed three
  identical lines. Probed by declaring the widest row as 4: the walk stops with
  "Gallery card for Northbridge Meeting Room Refresh wrapped its action row over 5
  lines at 1150px, where the \"several\" row has 4 … It printed line 1: Detail,
  Resume active; line 2: Northbridge Meeting Room Refresh — standard Teams room
  with …; line 3: … east wing boardroom varia…; line 4: … huddle room starter with
  …; line 5: Copy Northbridge Meeting Room Refresh, Delete Northbridge Meeting Room
  Refresh.", so the reader is told which band took the extra line.
  The row's count is read at 1024px as well and compared with 1150px's, because
  the tablet's card is the same two-column band on a narrower card and the number
  declared on a state belongs to the widest one: a card that spends a line there
  keeps every box this pass checks — nothing escapes, no name is cut, the pair
  still closes the edge — and only the count says the row changed shape. All five
  states read the same count at both widths, which the section's bands-by-width
  sentence shows, so the comparison is an equality rather than a floor: a card in
  the band that wraps in
  fewer bands than the widest one needs is a rule scoped below 1150px, and the
  message names both counts, both card widths and the bands printed at 1024px.
  Probing it by giving `.wm-project-row-designs` a temporary `flex-basis: 100%`
  between 1000px and 1100px stops the walk at the no-design row — the one whose row
  fits on a single line at 1150px, since the long-named rows were already wrapping
  there — with "Gallery card for Riverside Briefing Room Fitout wrapped its action
  row over 2 lines at 1024px, where the widest two-column card at 1150px has 1 …
  At 1024px it printed line 1: Detail, Resume workflow; line 2: Copy Riverside
  Briefing Room Fitout, Delete Riverside Briefing Room Fitout", and every box
  reading in that run passed. That message prints 1024px's own bands, so the
  tablet says which line it spent as well as how many. The fifth entry is the row two
  short-named designs share, which the one-short-name row cannot speak for: with
  one entry the short name shares Copy and Delete's line wherever the row has
  room, while two of them have each other to share the design line with, and the
  entry's own link count is what says both are still on the card. Adding it was
  an entry and nothing else — the seed wrote both designs under the new room, the
  loop measured them at all six widths, and the summary printed its clause from
  the numbers it read rather than from a remembered count — and
  dropping that entry's `project` stops the walk with "The projects gallery
  should show Kingsway Training Room Refresh, the \"two-short\" row state", which
  is the card lookup naming the state rather than measuring a starter's row.
- `check:stored-records` (in `verify:contract`) holds that rule to the compiler
  instead of to a reader's memory. Nothing is registered: every
  `setItem(key, JSON.stringify(value))` in shipped source makes `value`'s type a
  root, every type reachable from a root is policed, and a field is read when the
  compiler resolves a property access, element access or destructure to it — or
  when shipped source names it in an access position (`.field`, `["field"]`).
  That second half is not a convenience: the codecs decode untyped JSON, so a
  codec's `record.field` resolves to an index signature rather than to the
  record's symbol, and without it every persisted mirror of a runtime type (most
  of `StoredDesignProposalRevision`, `StoredApplicationProposal`, the governed
  dependency rows) reads as dead. A write is not a read — `row.errorMessage =
  message`, or `field:` in an object literal, names the wire without consuming
  it. Adding a store needs no registration; adding a field that only gets
  written fails the gate. A store kept as a **table** is a root by its values
  rather than by its own shape: `Record<string, Draft>` has an index signature
  and no fields, so `expandStoredTypes` descends into the map's value type and
  the draft inside it becomes the record. That is the half the template document
  drafts needed — the write parses the store into a map, puts one draft in it and
  persists the whole table, so the type at the `setItem` call was the map and the
  draft was invisible until this existed. The helper also descends through a
  union and a collection, and drops a type with neither fields nor an index
  signature (`unknown`, a primitive, a function). The same question is asked of a
  field, not only of the write: `collectReachableFields` expands each field's type
  through `expandStoredTypes`, so a record holding `deviceEdits: Record<string,
  SurveyDeviceEdit>` stores the device edit's fields and they are policed like any
  other. Walking such a field as an object with no declared properties would police
  the map's own shape — which is nothing — and miss everything inside it, and the
  old split showed why that matters: the table written straight to storage was
  swept by hand while a table held in a record was never looked at. The sharper
  walk's first finding was `SurveyDeviceEdit.deviceId`, written by
  `setDeviceVerified` and read nowhere because the map key already is the device —
  the same duplicate key `templateId` was on a draft. The field went, and
  `stored-record-fields.test.mjs` pins the descent: a record with a `drafts:
  Record<string, Draft>` field reports the draft's unread `savedAt`, and walking
  the field unexpanded reports `[]` instead.
  A map of `unknown` is the one field no type can describe, so the gate follows
  the codec that reads it. `Record<string, unknown>` declares nothing to walk —
  the walk stops at the map and everything the entries are stored as is outside
  the gate — but the app never reads that blob as a blob: it hands it to a
  decoder (`wallStartingPointFromSummary(summary)`,
  `readQuickStartSeedRecord(state)`) that takes the loose map and returns a
  declared record. That decoder is the field's real schema, so its result is
  policed as what the store holds, attributed to the same stores the loose field
  was reached through. Found from the field, not from a register:
  `collectCodecReturnTypes` takes every read the gate already credits (a property
  access, an identifier resolving to the declaration, a local a pattern bound off
  it, or a shorthand property standing for one of those locals), finds the nearest
  enclosing call that read is a whole argument of, and keeps that call's return
  type when it has declared fields. The destructured case is the
  one that had to be followed rather than looked up: `const { roomModel } = brief`
  binds the property to a **local**, so `getSymbolAtLocation` on the name returns a
  variable whose declaration is the `BindingElement` — no stored field — and
  `decodeRoomModel(roomModel)` passes that local, not `brief.roomModel`. One helper
  answers both halves, `destructuredPropertyDeclarations` (the object's type, asked
  for the property the element names, with `{ x: raw }` naming in `propertyName`),
  and the compiler half and the codec half each resolve the binding through it. The
  compiler half is what keeps `const { x } = row` from reading as dead: the binding
  is credited to the property's own declaration, not to the local's. A loose map
  handed over inside an object literal — `decodeRoomModel({ roomModel })` — is
  the same read one wording down, and it needed its own lookup: a shorthand's
  **name** resolves to the property the literal creates (`getSymbolAtLocation`
  answers the `ShorthandPropertyAssignment`), so the binding the pattern made was
  one step away and the map decoded that way stayed opaque. `shorthandValueSymbol`
  takes it, with `getSymbolsInScope(shorthand, SymbolFlags.Variable)` and the
  shorthand's own name, and the result goes through the same
  `symbolBoundToThisField` the direct local does. Through the compiler rather than
  by matching a name in the file: a same-named local that was never taken off the
  field must stay uncredited, which is exactly what the fail-closed spec pins — a
  name-only version of the branch credited `{ roomModel }` at a call whose local was
  a fresh `{}`, and the walk failed with `['roomModel', 'depth']` where the map
  should have stayed opaque. A computed key
  (`{ [key]: value }`), a rest element (`{ ...rest }`) and a spread of the whole
  record (`{ ...brief }`) name no single property, so none credits anything —
  crediting one would make every field of a record read — and a codec reached only
  through one is still not found: the map stays opaque rather than being policed as
  something guessed, which is the same fail-closed rule the rest of the gate keeps.
  The shorthand spec is three tests on one store: the shape it decodes is policed
  (`depth`), the path names the codec, and both object-literal shapes that name no
  property leave `roomModel` unread. Disabling the branch alone fails the first two
  with `[]` for `['depth']`, which is what shows the reading is the branch's.
  Widening this found nothing new in the tree (1149 policed fields before and
  after), which is the point: the reads were there, and the gate was one binding
  short of seeing what they decoded.
  A map can also reach its codec through a helper instead of being handed over:
  `const roomModelOf = (brief) => brief.roomModel`, then
  `decodeRoomModel(roomModelOf(brief))`. The codec's argument is that call, and the
  helper's `return` is an argument of nothing, so the walk-up stopped inside the
  helper and the map stayed opaque through the shape such a helper is written in.
  The gate now registers **carriers** before it walks any read: a function
  (declaration, arrow or function expression) whose *every* returned value is this
  field's read — `return brief.roomModel`, a concise arrow body, or a local
  destructured off it. A call to a carrier, standing as a whole argument of another
  call, is then that call's codec. `every` rather than `some` is the fail-closed
  half: a helper that hands back a fresh map on one path may be the value the codec
  actually decodes, and crediting it would police a shape the field never had. The
  helper is resolved through the callee's declaration (`carrierNames` keyed by
  `declarationKey`), so `const roomModelOf = () => ({})` shadowing the real helper
  leaves the map opaque — the same rule the shorthand lookup keeps. Its name is a
  hop of its own — `Brief.roomModel → returned by roomModelOf → decoded by
  decodeRoomModel → Room.depth` — because the codec hop alone would leave the
  reader to find the function in between. Six specs on one store: the shape is
  policed, the path names both hops, a concise arrow around a destructured local is
  followed, a helper that never returns the field leaves `roomModel` unread, and
  either a mixed-path helper or a same-named local leaves `depth` unpoliced.
  Probed all three ways: disabling the call branch fails the three credit specs
  with `[]` for `['depth']`; `some` in place of `every` fails only the mixed-path
  spec, which then reports one unread field; matching the callee by name instead of
  by declaration fails only the shadowed one. This widening found nothing new in
  the tree either (1149 policed fields before and after): the reads were there, and
  no shipped call hands a loose map over this way yet.
  A helper is usually grouped on an object rather than declared free — `const
  briefHelpers = { roomModelOf: (brief) => brief.roomModel }` and then
  `decodeRoomModel(briefHelpers.roomModelOf(brief))` — and a carrier keyed only by
  the function's own declaration was never found under that shape: the call's
  callee resolves to the property that holds the arrow, not to the arrow.
  `helperName` names a helper held on an object by its property, `registerCarrier`
  registers the declaration **that name resolves to** rather than the function's
  own, and `registerCarriers` walks method declarations as well, so the shorthand
  `{ roomModelOf(brief) { return brief.roomModel } }` is registered by the same
  pass. Keying by declaration is what the grouping does not change: a same-named
  method on another object is a different declaration and stays uncarried, which
  is the rule the shadowed-local spec already kept. The `via` hop names the
  method rather than the object (`returned by roomModelOf`), because the codec hop
  beside it is what says which call was decoded. Five specs on one store: the
  shape a property-held arrow decodes is policed, the method shorthand is held to
  the same rules, the path names both hops, a method that builds a fresh map
  leaves the map opaque, and a same-named method on another object credits
  nothing. Probed both halves apart — dropping the property branch registers
  nothing and fails exactly the two property-held specs with `[]` for `['depth']`
  while the shorthand still passes, and dropping the method walk fails only the
  shorthand spec — so each shape is held by a reading of its own. This found
  nothing new in the tree either: 1149 policed fields, 0 unread, before and after.
  A factory written as a class arrives one shape further out — `new
  BriefFactory().roomModelOf(brief)`, or the helper kept as a class field
  (`class BriefFactory { roomModelOf = (brief) => brief.roomModel }`) and called
  as `factory.roomModelOf(brief)` — and the instance's method already resolved,
  because a call through an instance lands on the member the class declares. The
  field did not: the arrow is the **initialiser** of a `PropertyDeclaration`, not a
  variable, a `PropertyAssignment` or a method, so a helper-name lookup that knew
  only those three read the arrow as anonymous and registered nothing. The two
  halves that have to agree are the name and the declaration the name resolves to,
  and they were two parallel lists — which is exactly how one of them learned the
  field and the other did not. They are one function, `helperNameNode`, which
  returns the node as well as its text, so a shape can no longer be added to half
  the pair. Keying still settles the ambiguity the grouping does not: a same-named
  member on another class is a different declaration and stays uncarried. Five
  specs on one store — the instance's method is policed and names both hops, the
  class field is policed, an instance helper that builds a fresh map leaves the
  map opaque, and another class's same-named member credits nothing — and the
  field's spec bites alone: dropping `isPropertyDeclaration` from the node lookup
  fails that one with `[]` for `['depth']` while the instance's method still
  passes, which is what shows the field reading is not the method's. This found
  nothing new in the tree: 1149 policed fields, 0 unread, before and after.
  `stored-record-fields.test.mjs` pins both directions: the plain binding and the
  rename leave only the sibling unread, the computed key and the rest element credit
  neither field, the codec behind a destructured local is policed and names itself
  in the path, and a local of the same type that was never taken off the field
  leaves the map opaque.
  Its first run on this tree grew the policed fields from 1063 to 1150 (1149 once
  the one finding went) across 6 loose fields, and found exactly one real one:
  `ProductAssurance.active`, built
  by `getProductAssurance` and read nowhere (`specifiable: active` restated it at
  the same construction). The field went, so the baseline stays empty.
  A failure names the store the record came through — its storage key and the
  write that put it there — because a field's home is otherwise ambiguous: a draft
  in a table written straight to storage and a draft held inside a larger record
  read the same once their fields are collected. One store reads inline
  (`— reached through wingman-site-survey-edits
  (src/wingman2/lib/siteSurveyStorage.ts:64)`), and a shared record names **every**
  store it is reachable through, one per line under the count — `reached through
  10 stores:` and then the ten — because a count is not an address: the older line
  named the first store and said "and 7 more", so a reader whose field turned up in
  the fourth one went looking for it by hand. One per line rather than one long
  line, for the same reason the path prints hop by hop: `WallRequirements` is
  reachable through ten writes and a single line of them is a wall a reader skips.
  The duplicates are kept deliberately — `wingman-project-store-v1` appears twice
  because two writes persist it, and the write is half of what the line says, so
  collapsing them to a key would hide the second place to open. Measured on this
  tree, 782 of the 1149 policed fields are reached through more than three stores,
  so the list is the ordinary shape rather than the corner. Probed by adding a
  write-only `probeUnreadStores` to `WallRequirements`: exit 1 with the ten stores
  listed under `reached through 10 stores:`, and green again with the field
  removed. Nothing is elided: the only shortening left in a failure is the path,
  which keeps its first four and last three hops around `…`.
  The store says *where* a record is persisted and nothing about *how far inside it*
  a field sits, so the failure also prints the hops it was reached by —
  `StoredDiscoveryBrief.roomModel → decoded by buildSalesReadinessPackage →
  SalesReadinessPackage.assurance → DesignAssuranceLedger.products → array
  element → ProductAssurance.active` — as a second indented line, with the store
  list under it. A write-only field three maps and a codec deep reads exactly like one
  declared on the project without it, and the reader is left to search for the
  hole. The walk records the hop as it descends (`expandStoredTypes` is not reused
  there, because its flattened answer is what loses the hop) and keeps the
  **shortest** path found, whichever root it was walked from — a field reached two
  ways is still one field and is reported once. Shortest rather than first, because
  the first is only walk order: roots are the writes in source order, so a record
  written on its own (`Draft.savedAt`, one hop) but also held three hops inside an
  earlier store's record used to print the deep chain whenever that write came
  first. The replacement used to be guarded on the route naming its type, and the
  shallow route never does — a root's own fields are walked as the fallback label,
  so `named` is false there and the direct path was the one the guard rejected.
  Equal-length routes are both as direct, so the first stays; the label upgrade is
  a separate answer and still takes a name from a route whose path was dropped. `array element` and `map value` are the structural hops; `decoded by
  <callee>` is the codec hop from the loose-map half above, named because a
  failure saying only "map value" leaves the reader to find which of the functions
  reading that map typed the entry. A chain over eight hops keeps its first four
  and last three around `…`, so the line still ends at the field it is about. Roots are per **write**, not per type: one record stored under
  two keys used to keep only the first write, so the second store could never be
  named. Fields collapse to one entry per declaration, which is a correction as
  well as a prerequisite — a type met as itself and again as an inline shape was
  listed twice, once per label, so 1063 declarations were being reported as 1152
  entries, and 48 homes had two labels. The surviving label prefers a declared name
  over the fallback that names the record holding it, and `typeLabel` resolves a
  utility wrapper to what it wraps, or `Pick<WallRequirements, …>` would report
  `Pick.sourceCustom`. The store is deliberately not part of the baseline: the
  allowance is for a field, and a write moving file would otherwise read as new
  debt.
  The other half is the **keyed form**. A drawer edits its fields through
  `value[key]` over `keyof T`, which resolves to no property symbol and names no
  field in an access position, so `collectFormKeyNames` takes the name from where
  it is written: an element access keyed by a parameter makes that parameter's
  slot a source of names, and each call's string-literal argument in that slot
  names the field it edits. Only the keys actually passed count —
  `field("author", "Author")` reads `author`, while a field of the same record
  with no box of its own binds no argument and still fails. Without it the four
  boxed fields of `DocumentPersonalisation` that appear nowhere else
  (`projectReference`, `author`, `customerLogo`, `coverImage`) came back as unread
  the moment the drafts store became a root, which is the gate reporting its own
  blind spot rather than debt.
  A read is identified by `declarationKey` — the file and
  the offset within it — and not by the offset alone: offsets are measured from
  the start of their own file, so a set of bare numbers let a reader in one file
  excuse a field declared at the same offset in another. That collision is what
  hid the first fourteen entries listed below until the field beside them was
  removed and the offsets lined up: fixing the key is what makes the report
  answer the question it claims to.
  `tools/wingman-stored-records-baseline.json` only ratchets down: an entry that
  gains a reader fails until it is dropped with
  `npm run audit:stored-records:baseline`. The nineteen instances that predated
  the gate are gone rather than grandfathered: the write-only
  `ProposalVisualConnection` list and its `ProposalVisualAsset.connections`, the
  asset's `source.projectRevision`, `StoredProposalVerification`'s
  `baselineVersion` and `acknowledged`, `StoredApplicationProposal`'s
  `visualBriefs` (with the brief type it needed) and `deploymentConditions`,
  `CompareTechnicalFingerprint.distanceMetres`, the profile's `userRole`,
  `uiLanguage` and `captureLanguage` (the language preferences are their own
  store, `wingman-ui-language-v1`), the organisation document settings'
  `contactInformation`, `address`, `defaultCoverTreatment` and
  `defaultDiagramTreatment`, and the wall evidence's `recommendation.variant` and
  `evidenceCheckedAt`. The corrected read key then showed three more fields in
  the same two records, and `defaultTone` went with them.
  The last fourteen went the same way, and the file is empty today. Document
  ingest's `classLabel` (a display label nothing printed, so its `CLASS_LABELS`
  table and `classDisplayLabel` helper went with it), `ProductSetOpportunity`'s
  `productClasses`, the triage row's `defaultIncluded` (it restated
  `batchCompareEligible` at every construction) and the analysis's
  `extractedRowCount`, `accessoryDependencyCount` and `unknownReviewCount` (each
  a filter over `rows`, which are stored anyway);
  `TemplateApplicationProfile.environmentConstraints` (the preview draws
  `template.validationItems` itself) and `reviewNotes` (prose for
  `reviewStatus`); `CompetitorSourceProduct.performanceTier` (`sourceName`
  already carries the tier); the profile's `intelligenceMode`, a preference with
  no control and no reader.
  The organisation document settings were a reader gap, not dead fields:
  `defaultPersonalisation` applied the stored defaults by object spread, which
  the compiler cannot see, so `organisationLogo`, `primaryColour` and
  `secondaryColour` looked unread even though a spec pins that they seed a new
  document. Each is now read through the document field that takes it
  (`organisation.primaryColour ?? defaults.primaryColour`), and the one setting
  with no document counterpart and no print position (`organisationName`) went.
  Prefer that explicit read whenever a stored default is applied whole: a spread
  is exactly the shape that hides which defaults actually reach the page.
  The template document draft store (`wingman-template-document-drafts-v1`) was
  swept by hand, because at the time the gate could not reach it: the write
  parses the store into a `Record` map and puts the draft back into it, so the
  type the `setItem` call saw was the map's index signature, which
  `discoverStoredRecordTypes` skipped for having no properties to walk — the
  draft itself is a value inside a map, not the argument's own shape. Three
  fields went — `templateId`, `assumptions` and `updatedAt` — and no reader took
  any of them back: the map key already names the template, the assumptions a
  document carries are the definition's own list (`template.assumptions`, what
  the drawer prints and the proposal is built from), and no surface says when a
  draft was saved. The record is one declared shape now
  (`StoredTemplateDocumentDraft`), holding the personalisation alone, and
  `solutionTemplates.test.ts` pins both that and that a draft an older build
  wrote still reopens — the stored value is an allow-list, so a key nothing
  writes is simply not read. The gate reaches it now (`expandStoredTypes`), so
  the spec is the second opinion rather than the only one: adding a write-only
  `savedBy` to the draft fails `check:stored-records`, and a `DocumentPersonalisation`
  field with no box of its own fails beside it — the drawer's keyed form reads
  only the four keys it is handed. Both were probed on this tree and both were
  reverted.
  Those defaults now have the surface they were missing:
  `SolutionDocumentDefaults` (mounted in Settings → Company, and a component
  rather than page markup only because `ProfilePage.tsx` sits at its page-entry
  line ceiling) edits all eight fields the document takes and writes them
  through `saveOrganisationDocumentSettings`. It saves the whole table, so the
  form is the whole answer to what the next document looks like, and it opens on
  the stored values over `HOUSE_DOCUMENT_BRAND` — the same table
  `defaultPersonalisation` falls back to, so the boxes cannot promise a font or
  colour the built document would not use. Saving seeds a **new** document; a
  draft already being personalised keeps its own values, which is why the
  section says so — and names the drawer action that takes them — rather than
  rewriting `wingman-template-document-drafts-v1`.
  That is the default, not a wall: the template drawer's `Use document defaults`
  (`template-personalisation-brand-defaults`) applies the stored brand to the
  draft on screen through `applyOrganisationDocumentDefaults`, so a rep who set
  the organisation's brand after starting a document can take it without losing
  the words they wrote. Both callers read the same table `organisationDocumentBrand`
  — stored over `HOUSE_DOCUMENT_BRAND` — and the draft's title, customer, scope
  and summary text are the rep's own. Only six of the eight move there: the
  logo, both colours, font, footer and disclaimer. Audience and detail stay as
  the draft has them, because they are who that document is written for and how
  deep it goes, and the rep picks them for this customer in their own fieldset
  beside the content rather than the brand. Applying all eight reset a
  deliberately Technical draft to house `Customer`/`Standard` for a rep who only
  wanted the new colours and font. Settings still seeds all eight, because a new
  document has no earlier choice to overrule. `detail` is not a stored preference
  any more: it decides which sections print (see Proposal output), read as the
  document leaves through `templateDocumentDetail`. `audience` still reaches no
  printed page — `templateReviewProposal` takes the title, summary, footer,
  customer and site, and no export builder reads who the document was written
  for — so that select is its only surface.
  How much document a draft prints is `detail`'s decision alone, which is why the
  drawer's `Output structure` fieldset is gone with the three fields it edited.
  The switches named an optional-upgrades section, third-party equipment
  placeholders and an assumptions-and-risks section, and the document offers none
  of them as a shape a rep may drop: there is no upgrades section to print, the
  third-party lines are scope the customer supplies rather than rows a quotation
  may quietly omit, and the assumptions and open risks print at every level
  because a document that hides what is still open presents it as settled. Each
  switch would have had to invent a section or contradict one of those rules, so
  they are removed rather than wired to something that does not exist; the three
  fields went from `DocumentPersonalisation` with them, and a draft stored before
  that simply carries keys nothing reads.
  The same reasoning took `DEFAULT_DOCUMENT_SECTIONS` off
  `SolutionTemplateDefinition`: a template used to carry `documentBlueprint`, a
  list of sixteen display headings nothing rendered — the sections a document
  prints are `DOCUMENT_SECTIONS` in `documentSections.ts`, filed by detail level
  and read by both builders. Two descriptions of one document is how they drift,
  and this one had drifted already: it named an optional-upgrades section and a
  branded cover, neither of which the document offers, while omitting most of
  what it prints. Its only readers were `validatePublishedTemplate`'s non-empty
  check and a spec that pinned the list against its own copy, so the list, the
  field, that check and that spec went together; a template's shape is not a
  document's shape, and `documentSections.test.ts` is where the printed sections
  are held.
  The rest of that type was then audited the same way, because a required field
  is a claim that someone reads it. Fifteen went: `version`, `userExperience`,
  `discoveryPreset`, `productFamilyRules`, `requiredDependencies`,
  `optionalUpgrades`, `risks`, `qualificationQuestions`, `alternativeDesignPath`,
  `unsuitableWhen`, `visualAssets`, `validationRules`, `tags`, `createdBy` and
  `updatedAt`. `toSolutionTemplate` declared each of them, most were required
  non-empty by `validatePublishedTemplate`, and none was rendered, edited or read
  by anything: the converter filled them mechanically (design notes into
  dependencies, the first upgrade path into an alternative path, three fixed rule
  ids, a literal `2026-08-05`) and the gate then checked the emptiness of what it
  had just filled. `userExperience` is the clearest case — the drawer's
  Application brief prints the application profile's `userJourney`, so the
  definition's own sentence was a second answer to a question already answered.
  A `version` and a `qualificationQuestions` had one reader each, writing a
  draft's `templateVersion` and `unresolvedQuestions`, which no surface reads
  back, so those writes went with them. What is left is what a page prints or a
  document is built from (`id`, `status`, `title`, `market`, `application`,
  `purpose`, `customerStory`, `businessOutcomes`, `architectureDirection`,
  `proposalNarrative`, `assumptions`) plus the governed profile and BOM the
  publication gate inspects, and that gate's required list is now the printed
  fields alone. Audit the next field the same way: one whose only reader is a
  non-empty check is a gate on nothing, and it should go rather than be filled.
  The
  action replaced a `Reset to Brand Defaults` button that reloaded the page, which
  threw the draft away and never read what Settings stored.
  `Reset to house values` clears the record rather than writing
  `HOUSE_DOCUMENT_BRAND` into it (`clearOrganisationDocumentSettings`): a stored
  table that merely repeats the fallback would claim the organisation had chosen
  a brand it never set, and nothing reads the difference until the day one of
  the two tables moves.
  Keep the file empty rather than adding an allowance — a field of a persisted
  record needs a surface that reads it. Test fixtures are not records —
  a `setItem` in a spec would make every inline literal in it a "record" — so
  the scan skips them, and `src/__tests__` is outside the typecheck program, so
  a read asserted only there is not one.
