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
