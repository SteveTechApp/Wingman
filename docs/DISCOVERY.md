# Discovery

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- An unanswered room scale is absent from the stored room model, even though
  the Finder need draft uses empty strings for dimensions that are present but
  unanswered. The cross-field audit treats both missing and empty scale or
  display values as unanswered; otherwise an empty label is a defined string
  with no scale rule and gets reported as invalid data.

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
- The market/environment choice is the room-type input for Essential capture.
  Selecting a different environment replaces its suggested application and
  fills unanswered smart defaults once for the rep to adjust; a saved deliberate
  blank stays blank when the brief is reopened. Those answers drive the visible
  question set. All capture modes omit the duplicate application selector; the
  market/environment control or, when there is no environment, the compact
  room-type summary is the correction path.
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
- Guided Discovery decides the room (`roomBrief.ts`) before it offers a design,
  and the surface that holds it (`RoomBriefWizard.tsx`) has no ladder of its own
  — it renders whichever question `nextRoomBriefQuestion` returns, so the method
  exists once. The engine keeps the set of room types the answers still allow
  (`survivingArchetypes`) and scores each unasked question by the size of the
  smallest group its answers would leave (`splitScore`), because a question whose
  answers all point at the same room has already been answered by the room; ties
  break on the order a person would ask them in. An answer never empties the set:
  where two answers contradict each other the later one wins, so a rep who says
  "partition" and then "one presenter" gets a divided teaching space instead of an
  error, and `unresolved` names the room types the decision could still have been
  so the rep knows what to ask next. Ten archetypes are reachable by a path a rep
  could walk, and `roomBrief.test.ts` walks each one from its purpose rather than
  by id, because a room resolved by id passes on a field no surface reads.
  The decision is deliberately not a bill of materials: a BOM chosen from four
  answers is a guess wearing a schedule, so the products still come from the
  catalogue or the wall builder afterwards. The library is reached with
  `?market=<vertical>` from both of the brief's links, and `TemplatesPage` reads
  it once to open on that market; an unknown value is ignored, so the rail's
  pressed market is always one it can show. The market is the one setup fact
  that changes no room type — it changes what a rep talks about and which
  designs are worth reading first — which is why it is carried rather than
  branched on.
  The first screen keeps that short decision in a readable column: purpose and
  occupancy are distinct grouped questions, and each answer is a full clickable
  card with a visible selected state. A full-width row of bare radio labels made
  long purpose answers wrap unpredictably and scattered the choices across the
  available page; the card grid gives each answer a stable target and reflows
  from four columns to one as the viewport narrows.
- The hand-off is `writeDiscoveryHandoff` plus the address `?interview=1`, and the
  page that composes both (`OpportunitiesPage`) reads that parameter on every
  render. It has to: the decision and the brief are the same route, so following
  it is a parameter change on a page that is already mounted, and the mount-time
  snapshot it used to take left the rep reading the decision with the address
  saying otherwise. Nothing about it writes the interface mode — a guided rep
  lands in the guided interview, and the expert view remains a mode they choose.

- The guided walk is a room, not a list of questions. Its section is the unit a
  rep captures and reports on, so the walk prints the section it is in, how many
  of that section's questions are answered, and a rail of the other sections to
  jump to — the same `DISCOVERY_SECTIONS` list the expert view draws. That list
  moved out of `DiscoveryExpertBuilder.tsx` into `discoverySections.ts` when the
  walk started reading it: two surfaces grouping one room two ways is how a rep
  learns that "Sources" means one thing in one view and something else in the
  other. A question is filed by what it is about (`discoverySectionFor`), so a
  new question is filed once and neither reading needs a second table.

  The order now follows the design conversation a systems designer needs:
  room brief; environment and installation; displays and cameras; audio;
  switching and signal distribution; room and AV control; lighting; commissioning
  and handover; then equipment and review. The environment includes site access,
  wall/floor/ceiling construction, power, containment and first-fix cabling.
  Source and output positions, estimated distances, video resolution and USB
  generation belong with switching because they decide how signals can travel.
  Camera types, counts and destinations sit beside displays; microphone and
  programme-audio routes sit in Audio. Lighting stays separate from general
  building notes because daylight, blinds, dimming and control integration
  change screen visibility and room operation. Commissioning records functional
  tests, customer acceptance, training, as-built documents and who owns the
  handover.

  Essential view covers those same product decisions with customer-level
  language, while the detail view retains the design vocabulary and structured
  topology. Building and installation facts keep their notes plus a separate
  responsibility value: "Not known" means a site check is owed, while "By
  others" names work another party owns. These states must not be mistaken for a
  confirmed technical answer. The commissioning question offers the same clear
  unknown and ownership choices, and Essential view labels pre-filled values as
  suggestions to review.

  The forward action is unconditional. It used to render only when
  `wmDiscoveryHasAnswer` was true for the question on screen, which made the
  end of the walk reachable only by answering — and the questions a customer
  cannot answer at the table are exactly the ones a capture has to be able to
  leave open. Skipping records nothing, the summary already counts what was left
  open, and the "Skip for now" chip in the controls row means the same thing, so
  there is one skip and it is not repeated under the options. The last question
  keeps the wording `Next question` and says where continuing goes, because the
  tests pin that name and a renamed button would be a second way to describe one
  action.
