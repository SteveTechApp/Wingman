# Discovery

The narrative behind the invariants in `AGENTS.md`: each rule in full, why it
exists, and the probe that proved it. A number quoted here records the run that
decided the rule; `reports/browser-readings.md` is the current measurement.

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
- The hand-off is `writeDiscoveryHandoff` plus the address `?interview=1`, and the
  page that composes both (`OpportunitiesPage`) reads that parameter on every
  render. It has to: the decision and the brief are the same route, so following
  it is a parameter change on a page that is already mounted, and the mount-time
  snapshot it used to take left the rep reading the decision with the address
  saying otherwise. Nothing about it writes the interface mode — a guided rep
  lands in the guided interview, and the expert view remains a mode they choose.
