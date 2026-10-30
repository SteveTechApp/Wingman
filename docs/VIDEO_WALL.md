# Video wall

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- The guided wizard's first step leads with the LED brief, not the wall list:
  canvas pixels, pixel pitch and the cabinet array in
  `pages/videowall/VideowallLedBrief.tsx`, with the common walls under them.
  Those three are the customer's facts and a preset answers all three already,
  so a rep starting an LED design should not begin from a wall someone else
  answered. The array is the design's own `columns` × `rows`, which
  `displaySchedule.ts` already prints as cabinets for an LED wall, so the brief
  invents no second way to describe the same wall; the read-out under it is what
  makes the three answers one wall, since canvas × pitch is the millimetres a
  rep quotes. The draft is local — typing a canvas width does not turn the
  design on screen into an LED wall — and only `Start the LED brief` writes,
  as a clean LED design rather than the LCD wall this browser last held. It
  lands on the connection question, not the size step: the brief already
  answered the size, so the next question is the one the canvas cannot answer —
  who scales it. `wallEntry`'s shared intro sentence says the new beginning
  (`Start from the LED brief or a common wall, then record the survey.`)
  because the four surfaces that print it describe how a design begins, and the
  picker is no longer the first thing a rep meets there.
  `VideowallWizard.test.tsx` holds the brief above the wall list, the patch it
  writes (with the sources and windows collapsed to one feed) and the step it
  opens, and holds a canvas with no pixels to a disabled start. The current
  reading — the card's box against the brief's, the read-out under it, and the
  wall count it clears — is
  [the guided wall start step](../reports/browser-readings.md#guided-wall-start-step).
- Four surfaces name the wall workflow — both readings of Home, the Templates
  page header and the builder page the entry opens onto — so the entry's name and
  the sentence saying how a design begins live once, in `lib/wallEntry.ts`
  (`WALL_ENTRY_NAME`, `WALL_ENTRY_INTRO`). They had drifted: the focused entry
  named a starting preset, the unguided Home card promised "answer four
  questions" — the wizard's narrowing step, not the screen the builder opens on
  — the Templates header named a builder and said nothing about the start, and
  the page a rep arrived on said "Video wall builder" while the card they
  followed said "Video wall designer". The unguided card keeps its
  own second sentence (that Wingman narrows the field to one recommendation),
  because that card is the one with room for the promise; the beginning it opens
  with is the shared one. A header action has no space for a sentence, so the
  Templates link carries it as its `title`, the way another compact surface
  hands over prose it cannot show. Add a surface by printing these two
  strings — not by writing another wording.
  The route's manifest entry is the pair of fields that legitimately differ, and
  the reason each one differs is written beside the name: `label` prints
  `WALL_ENTRY_NAME` in the page chrome (`.wingman-topbar-page-label`, the
  neighbourhood label beside the sidebar), so the name a rep followed is still on
  screen on arrival, while `navLabel` keeps the short form `Video Wall` the way
  every route's nav row shortens its page name (`Families`, `Compare`,
  `Catalogue`) — nothing renders it today, because the wall route is not in
  `consolidatedPrimaryNavKeys`. The guided reading of the builder keeps
  `Guided video wall wizard`, because that kicker names the mode and never
  appears beside the expert one: each reading renders its own header, so a rep
  sees one kicker or the other and never a page naming itself twice. Every
  instruction that sends a rep to this page from inside a project prints the
  entry's name too, in the sentence form `WALL_ENTRY_SENTENCE_NAME` ("the Video
  wall designer") so the article sales copy needs does not become a second
  casing to keep in step: the starting points the Discovery route offers,
  Discovery's wall handoff card, the survey photo review and the transport panel
  in the project record, the install cells the proposal and the template review
  both mount, and the validator's `survey-install-detail` fix line. They said `builder` — the page's working name in code, which no rep
  has ever read — and a rep who follows an instruction has to arrive at the
  thing it named. One link into the page keeps its own words, and that is settled
  rather than left open: Discovery's journey strip says `Open Video Wall`
  (`features/navigation/featureJourney.ts`) because the strip is a list of
  destinations and names the route rather than the way the manifest's `label`
  prints, and the page's chrome still prints that label on arrival. The strip's
  own rule lives in that module, in two classes. Three words name the route —
  `Discovery` for the Opportunities route, `Product Workspace` for the Products
  route, `Video Wall` for this one — and two name the work, because those entries
  offer what the rep gets rather than a page title: `product detail` is what the
  Product Positioning page's entries say (its `label` is `Product Positioning`,
  its eyebrow `Products / Positioning`), the same phrase `recommendations` offers
  to the Products route; `response` is what the Responses page's own nav row
  already says (`Build response`), singular, because the customer receives a
  response whatever the route is filed under. So
  `features/navigation/featureJourney.test.ts` holds all five against the
  manifest, and holds the two work words to a second fact — neither of the
  manifest's names for the route — which a route word need not satisfy (`Video
  Wall` is the wall route's own `navLabel`). That way the names answer the
  question here instead of living on as an aside in one route's rationale, which
  is where they were read before. `wallEntry`
  points at that rule beside the wall page's own naming rules, and the spec below
  rejects the one change that would undo its entry.
  `src/__tests__/wallEntryInstructions.test.ts` holds the rule to the source:
  the surfaces above print the shared sentence and none of them may write `wall
  builder` (the template review's validation panel is scanned for that without
  being required to print it, since it only decides whether the fix line or the
  cells stand), the manifest `label` a rep reads on arrival is asserted to
  be the same name, because renaming the entry would break every instruction at
  once, and the strip's entry is asserted to print the route's short name and
  never `WALL_ENTRY_NAME`, so aligning it fails instead of being a judgement
  call. Every half bites: reverting one link to the old words fails it, and so
  does naming the strip's entry the page's way.
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
  fix there lands in both. The generic button texture in
  `wingman-route-overrides.css` — the rule that paints the dark 145deg gradient
  under `html[data-wingman-route] .wingman-page-host` — has to keep excluding
  the primary classes on both of its branches. Its `button[type="button"]`
  branch carries four `:not()` terms, which is what gives it enough specificity
  to beat the primary rule below it, so a primary button that still matched
  there lost its cyan fill and kept `color: #031317`: Settings' `Save document
  defaults` and the page's own Save read as greyed-out text on a dark pill,
  while the same class looked right on Templates, whose route rules win
  instead. Add a new primary-shaped class to both branches' exclusion lists, not
  just to the primary rule.
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
  over a list of whole walls named something the block was not. The
  questions are `<details>` rows (`videowall-step-<n>`) whose summary carries the
  question and the answer in use (`wallWizardAnswers`, shared with the guided
  result), so the brief reads without opening anything and the answers stop
  competing with the wall; opening a row is the controls that step always
  rendered. `VideowallOptionsList` is reference rather than a choice, so it
  opens from a summary naming `decision.considered` and `decision.viableCount`.
- The guided questions run wall type, size, connection, windows, sources and
  must-haves, and the connection is asked where a rep settles it in the room:
  after the wall's size has decided the canvas and before the window layout,
  because a window count only means something once the wall is known to take one
  composed picture. `wallFeeding.ts` owns that question, and its models are the
  application the decision engine already reads rather than a field beside it:
  one canvas with the panels tiling it is `lcd-loop`, a feed per panel is
  `lcd-direct` with the independent layout, a feed per group is `lcd-grouped`,
  and a blend is a projection wall with more than one projector. The screen
  therefore confirms a build as often as it chooses one, and it cannot disagree
  with the recommendation. A model the design has no room for is left out
  rather than offered as a control that writes nothing: an LED canvas here is
  one processor input, and `wallFeedingPanelNote` says what a cabinet-by-
  cabinet feed actually is. Choosing a composed model drops an independent
  layout with it, the rule the wall-type question already keeps, and a wall
  already built that way writes nothing. The feed path — scaling matrix switch,
  AVoIP decoder, NHD-150-RX, NHD-600-TRX, NHD-500 for a custom canvas, or a feed
  per panel — writes the transport the location question already reads, so each
  path changes the recommendation instead of only advising; `wallFeedPathKeyFor`
  reads it back from the design (1GbE with one window is a plain decoder, with
  more it is the 150 series) and `wallFeedingChecks` falls back to a path the
  chosen model offers, since a per-panel wall cannot be fed by the 600 series.
  Each choice prints what it commits the rep to, and the blend's line puts the
  work on the content — authored at the blended resolution with its overlap,
  like any single source across a non-standard aspect ratio — not only on the
  projectors. Steps are addressed by name inside the wizard (`STEP`, built from
  `wallWizardSteps`), so inserting a question renumbers no literal, and the
  answer joins `wallWizardAnswers` between the size and the layout, which is
  what both readings print for it.
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
  without opening it, and the sentence ends in a `Continue in the video wall
  designer` link (`WALL_ENTRY_SENTENCE_NAME`, so the record and the page it
  opens name one thing): the rep reading it is the one who can save that work, so it resumes the
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
