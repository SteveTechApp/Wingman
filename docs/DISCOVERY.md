# Discovery

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

- An unanswered room scale is absent from the stored room model, even though
  the Finder need draft uses empty strings for dimensions that are present but
  unanswered. The cross-field audit treats both missing and empty scale or
  display values as unanswered; otherwise an empty label is a defined string
  with no scale rule and gets reported as invalid data.

- A rep can begin with a blank custom AV design before choosing a market. That
  path stores a custom room context but writes no market or suggested
  application, so no market template or application inference pre-fills the
  design. Market and environment context are optional references; the user's
  room facts and requirements remain authoritative. The market-selected
  template path remains available as an optional starting pattern.
- When the rep maps a custom room, the shared topology records named sources,
  processing devices, destinations and infrastructure at actual positions.
  Devices can declare input/output interfaces with connector, carried service
  and confirmation state. Each route segment can select a declared source
  output and receiving input and records services, transport, route length,
  basis, status and notes. Missing interfaces, unconnected endpoints, unknown
  services, unknown transport and unconfirmed distances remain visible review
  items. The rep records each intended physical source-to-destination pairing
  and required service; each declared source and destination unit must appear
  in at least one pairing, while no all-to-all routing is assumed. Every
  required service must traverse a directed sequence of route segments using
  the selected physical units. Older saved topology records without unit
  indices remain readable as unit 1, and incomplete rooms with devices but no
  routes remain saved. The review does not claim compatibility solely because
  two devices are connected.
- When selected, the market and environment frame the questions that follow.
  The Education · Lecture theatre path starts with a large-room scale and a
  clearly labelled estimate of 100 seats, while preserving an occupancy the
  rep already entered. It never guesses physical dimensions: L/W/H remain open
  for measurement, and the note asks the rep to confirm capacity and record
  those measurements. Changing market clears only unchanged inferred values;
  a capacity or scale the rep edited remains theirs.

- The essential brief, guided room walk and expert workspace capture room size
  through the same three numeric fields: length, width and height in metres.
  Seating and layout stay in their own note, so they cannot be mistaken for a
  dimension by a later reader. `RoomDimensionsFields.tsx` owns those controls
  and `roomDimensionsSummary` is the single text boundary into the existing
  `roomDimensions` brief field; older saved answers under `room-dimensions`
  remain readable until the rep edits the new fields. The focused brief exposes
  the site condition fields in a collapsed optional group under Room & site;
  Expert keeps them together in its Environment section. Site & construction
  keeps building construction, room structure/support, floor type, ceiling
  type, wall surfaces, overhead access and containment as separate survey answers.
  The brief carries each answer into `roomModel.siteConditions` and names each
  unanswered condition for follow-up rather than treating one general site note
  as proof of the others.

- The quick room ladder asks video direction on every path, including after
  purpose and scale already identify one room type. This captures a call, a
  one-way live stream out, or neither as a design fact rather than assuming a
  decided room has no capture requirement. Live stream out adds a programme
  feed and encoder requirement; two follow-ups capture what the feed carries
  and whether it goes to a public platform, private network audience or both.
  Site checks cover source, HDMI format, HDCP and wired-network capacity.
  NHD-300-TX remains available as an encoder option; Discovery still qualifies
  the actual source, platform and network before it becomes a system selection.

- Focused view starts the same full governed Discovery question set as Expert,
  but walks the rep through it one question at a time. Each answer updates the
  shared brief and the generated system topology as the room takes shape. For a
  multi-camera path, NDI selects CAM-210-NDI-PTZ sources, NHD-128-NDI-TRX as the
  bridge into virtual NetworkHD sources, and NHD-150-RX as the display decoder;
  non-NDI selects CAM-420-PTZ sources with CAM-0402-BRG. A live-stream-out answer
  adds NHD-300-TX with checks for the HDMI feed, format, HDCP, platform and wired
  upload path. These generated SKU rows are refreshed if the rep changes those
  answers, while user-selected and confirmed equipment stays in the design.

- Source discovery is a sequence of distinct decisions: fixed room equipment,
  user-provided devices or network video; then the actual source families and
  their quantities, ownership, connectors and positions; then who selects
  content, where they do it, and whether displays or zones route independently.
  The room position editor includes the central communications rack, local rack,
  cupboard, lectern, table, display wall, network and remote rooms/buildings.
  Source type, location and control needs travel into the saved room model and
  proposal requirements. A control need remains an unresolved functional
  requirement until the interface and product are selected; an answer alone
  cannot create a guessed control SKU.

- The room connection editor keeps transport, services, route length status,
  length in metres and the measurement basis on each connection. A rep can leave
  a route unknown or estimated, or mark it measured/confirmed with its value;
  reach checks and the proposal use that same stored route. Without those inputs,
  a generated planning distance could be mistaken for a measured installation
  length and a gate could block a design without giving the rep a way to clear it.

- Display discovery distinguishes the primary screen arrangement (flat panels,
  projector(s), LCD wall or LED wall), the total video feed endpoint count, and
  repeater screen count and purpose. The existing total count remains because a
  wall processor or blended projector canvas may use one feed even when it has
  many physical panels, while repeaters add endpoints. Overflow and room-wide
  visibility choices are part of the display-behaviour question and appear only
  when repeaters are selected or their count is still unconfirmed, so rooms
  without them do not get another question. The room model and proposal facts
  carry these fields separately; `display-behaviour` still records mirrored,
  independent, wall-processor and multiview behaviour.

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
  When the rep chooses `audio-by-others`, that same answer instead exposes a
  single-choice video-system handoff: embedded audio, balanced analogue,
  digital, or not confirmed. The room zones, listening experience, acoustics,
  microphone interfaces and audio processing questions disappear because a
  separate designer owns them. `deriveDiscoveryAudioDesign` records that
  boundary and the selected feed, adds no room-audio equipment allowances, and
  leaves only an unresolved handoff as a validation item. The topology builder
  must not invent microphones, a DSP or a speakerphone for that branch. Keep the
  standard in-scope route and this handoff branch on the same `audio-route`
  answer so the rep does not have to repeat room audio ownership in another
  form. The standard route shows extraction and destination choices only; the
  four switcher-feed choices appear only in the by-others handoff. Its prompt is
  selected from that narrowed answer set, never from the mere presence of those
  values in the canonical question catalogue.
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
- The brief, guided walk and expert workspace all pass through
  `compileDiscoveryBrief`, so the decision is stored once on
  `StoredDiscoveryBrief.roomDecision` for the next stage to read. Its room type,
  reasoned requirements, site checks, assumptions and changes-if are proposal
  inputs; the room model still carries the detailed L/W/H, construction,
  structure, floor, ceiling, containment, topology and equipment schedule. If
  the captured facts do not identify the market, purpose or occupancy needed by
  the shared resolver, no decision is fabricated and the proposal retains the
  unresolved Discovery questions.
- Room scale constrains the decision: a medium or larger room cannot resolve to
  the small huddle archetype. A single-screen, video-conferencing room has its
  own meeting-room decision so the proposal does not invent a second display to
  make the room sound more sophisticated.
  A small presentation room that does not join remote calls remains eligible for
  the huddle decision; the no-call answer must not route it to an all-hands room.
- Choosing a market environment that maps to an application already answers
  Discovery's opportunity question. `DiscoveryPage.tsx` keeps that value in the
  room record but removes the duplicate from both Basic and Expert survey lists;
  the selected application also drives `getVisibleDiscoveryQuestions`, which
  hides question groups that cannot apply and tailors the prompts that remain.
  If the rep changes to an environment mapped to another application,
  `changeDiscoveryApplication` clears the old technical answers before the new
  question set appears. An environment without a mapping leaves opportunity
  open for the rep to decide. The market label alone does not rule out technical
  choices, so it must not narrow signal, network, audio or control answers.
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
