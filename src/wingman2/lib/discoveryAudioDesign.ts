type Answers = Record<string, string | string[]>;
export type DiscoveryAudioScope = { key: string; description: string; notes: string };
export type DiscoveryAudioDesign = {
  direction: string; basis: string; signalPath: string; zoning: string;
  /**
   * The programme-audio path the rep recorded: what the sound is taken from
   * and where it must arrive. Optional because designs saved before the route
   * question existed carry only the direction and signal path.
   */
  route?: string;
  /**
   * The same route as the values the rep chose, so a surface that has to act on
   * it — the room schematic draws the paths — reads the answer rather than
   * parsing the sentence. Both are optional: a design saved before the answer
   * was kept carries only the sentence.
   */
  extraction?: string;
  destinations?: string[];
  requiredScope: DiscoveryAudioScope[]; validation: string[];
};
const values = (answers: Answers, key: string): string[] => Array.isArray(answers[key]) ? answers[key] as string[] : answers[key] ? [answers[key] as string] : [];

// The two halves of the audio-route answer, in the room's own words. The values
// carry their axis in the prefix so one question can record both ends without a
// second answer shape: `extract-` where sound leaves the video path, `route-`
// where it has to arrive.
export const DISCOVERY_AUDIO_EXTRACTION_PHRASES: Record<string, string> = {
  "extract-at-source": "the source device",
  "extract-at-switcher": "the matrix, switcher or wall processor",
  "extract-at-display": "the display or projector output",
};
export const DISCOVERY_AUDIO_DESTINATION_PHRASES: Record<string, string> = {
  "route-to-room-amplifier": "the room amplifier, DSP or loudspeakers",
  "route-to-uc-host": "the UC host over USB audio",
  "route-to-recorder": "the recorder or stream",
  "route-to-dante": "the Dante / AES67 audio network",
  "route-to-display-speakers": "the display's own speakers",
};
function phraseList(values: string[], phrases: Record<string, string>): string {
  const named = values.map((value) => phrases[value]).filter(Boolean);
  return named.length > 1 ? `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}` : named[0] ?? "";
}
export function discoveryHasAudio(answers: Answers): boolean {
  const purpose = values(answers, "uc-purpose");
  return purpose.some((v) => ["video-conferencing", "conferencing-recording", "microphones-only", "recording-streaming"].includes(v))
    || values(answers, "audio").some((v) => !["no-room-audio", "unknown-audio"].includes(v));
}

export function deriveDiscoveryAudioDesign(answers: Answers, notes: Record<string, string> = {}): DiscoveryAudioDesign | undefined {
  if (!discoveryHasAudio(answers)) return undefined;
  const has = (key: string, value: string) => values(answers, key).includes(value);
  const uc = has("uc-purpose", "video-conferencing") || has("uc-purpose", "conferencing-recording");
  const zones = has("audio-zones", "independent-audio-zones") || has("audio-zones", "combinable-audio-zones");
  const combine = has("audio-zones", "combinable-audio-zones");
  const deep = has("room-acoustics", "deep-tiered-room"), reflective = has("room-acoustics", "reflective-room");
  const live = has("audio-programme", "live-performance"), cinema = has("audio-programme", "surround-cinema");
  const full = live || cinema || has("audio-programme", "full-range-programme");
  const split = has("audio-programme", "separate-speech-programme") || has("audio", "separate-programme-voice");
  const line = has("audio", "distributed-70v-100v") || (!full && (zones || has("audio-programme", "speech-background")));
  const routeValues = values(answers, "audio-route");
  const extraction = routeValues.filter((value) => value.startsWith("extract-"));
  const destinations = routeValues.filter((value) => value.startsWith("route-"));
  const dante = has("audio", "dante-network-audio") || has("uc-microphone-connection", "dante-microphone-path") || destinations.includes("route-to-dante");
  const integrated = uc && has("uc-audio-processing", "direct-integrated-audio") && !zones && !deep && !split;
  const requiredScope: DiscoveryAudioScope[] = [];
  const add = (key: string, description: string, scope: string) => requiredScope.push({ key, description, notes: scope });
  let direction: string;
  if (cinema) {
    direction = "A surround loudspeaker system and AV receiver/processor match the explicit cinema requirement.";
    add("cinema", "Complete surround system, amplification and subwoofer allowance", "Confirm channel layout, speaker locations, impedance, bass management and HDMI/audio formats. Include all speakers, mounting, cabling, amplification and powered subwoofer provision in the measured package.");
  } else if (deep && live) {
    direction = "A specialist modular array study is appropriate for live performance over the stated deep or tiered audience area.";
    add("arrays", "Specialist flown or ground-stacked modular array system", "The supplier must schedule array modules, matched amplification/processing, fills, any required subwoofers, signal/power distribution, rated frames or rigging, structural/stability checks and commissioning. Determine module count and stack/flying arrangement by acoustic prediction; no generic WyreStorm amp is assumed to drive this system.");
  } else if (deep && reflective && !full) {
    direction = "Powered digitally steerable columns are a likely speech-coverage approach for the reflective, deep or tiered room.";
    add("columns", "Digitally steerable column assemblies and coverage design", "Specify column count/height, integrated amplification and beam-steering DSP, compatible analogue/Dante input, local mains, control/data, approved mounting and any modelled fills. Compare ordinary distributed speakers if survey results show a treated room would support them.");
  } else if (integrated) {
    direction = "A verified integrated conferencing device may cover this single listening area without external amplification.";
    add("integrated", "Integrated room audio compatibility and coverage allowance", "Use the selected bar/speakerphone where pickup and playback coverage are proven. Supply a compatible device only if the WyreStorm selection does not already provide it; avoid duplicate microphones, speakers or AEC processing.");
  } else {
    direction = split ? "Separate programme loudspeakers and distributed voice reinforcement need distinct amplifier/DSP circuits."
      : line ? "Zoned 70/100V speakers are a practical starting point for speech and background programme."
        : full ? "A correctly sized programme loudspeaker system should deliver the requested music/film range."
          : "A modest room loudspeaker pair or verified integrated playback system may meet this local requirement.";
    add("speakers", split ? "Programme speakers plus separate 70/100V speech speakers" : line ? "70/100V ceiling or surface loudspeaker circuits" : "Room programme loudspeakers and mounting", "Confirm coverage positions and quantities by survey; include brackets/backcans, safety fixings, cable circuits and appropriate environmental ratings. Full-range/subwoofer output is required only where the listening brief calls for it.");
    add("amplification", "Amplifier channels matched to each speaker circuit", "Schedule independent channels for every audio zone. Sum transformer taps per 70/100V channel and allow suitable power/cable-loss margin; verify impedance and power handling for low-Z speakers. AMP-2120-DNT high-Z mono and low-Z stereo are alternative operating modes, so a split system needs separate amplification. Record actual models and loading before pricing.");
  }
  const zoning = combine ? "Each partition needs independent source, volume, mute and microphone routing, with partition-aware combined presets."
    : zones ? "Each named area independently selects its programme feed and controls level/mute; video changes must not alter unrelated audio zones."
      : "One selected programme feeds the room; confirm whether separate speech, recording or assistive-listening mixes are also needed.";
  // What the programme path has to hand over is named separately from the room
  // playback chain: a USB audio endpoint and a recording send are their own
  // devices and their own commissioning steps.
  if (destinations.includes("route-to-uc-host")) add("usb-audio", "USB audio bridge between the programme path and the UC host", "Confirm which device owns the USB audio endpoint, whether programme audio and the far end share one device, the sample rate and the AEC reference. A USB audio bridge is not a USB peripheral switch: a room that also needs camera and touch USB needs both.");
  if (destinations.includes("route-to-recorder")) add("recording", "Independent recording or streaming mix feed", "Define whether the recording follows the room mix or needs its own, and provide the send, level control and cabling to the recorder or streaming host.");
  if (!integrated) add("processing", uc ? "AEC DSP, microphone interfaces and USB audio bridge" : "Audio mixing, gain management and zone DSP", `${zoning} Count every source input, microphone feed, independent amplifier output and recording/assistive send. Include programme extraction, input interfaces, microphone receivers/preamps and operator controls. ${uc ? "AEC/automixing is required for the conferencing microphone paths; amplifier EQ is not AEC." : "Select automixing, gain levelling, EQ, limiting and delay for the agreed speech/programme task."}`);
  if (dante) add("network", "Dante endpoints, channel licences and managed audio network", "Confirm compatible source/DSP/amplifier endpoints, preamp interfaces, channel counts, clocking, QoS, switch ports and PoE. Video networking does not automatically supply Dante. Compare balanced analogue links for a small local installation.");
  if (uc || reflective || deep || has("room-acoustics", "open-noisy-room") || cinema) add("acoustics", "Acoustic survey and wall/ceiling treatment allowance", "Measure reverberation, background noise and seating coverage. Schedule absorber wall panels, ceiling clouds/baffles or suitable finishes with area, thickness/performance, fixings and installation; coordinate fire/cleaning/access needs. AEC and steerable arrays do not replace treatment. Verify existing absorption before reuse; sound isolation and HVAC noise control require separate building scope where needed.");
  if (has("room-acoustics", "outdoor-exposed")) add("environment", "Environmental protection and outdoor installation allowance", "Confirm weather/temperature ratings, protected enclosures, cable entries, mounting loads and maintenance access for every exposed speaker, interface and amplifier location.");
  const route = routeValues.includes("unknown-audio-route") || routeValues.includes("no-programme-audio-route") ? undefined
    : extraction.length && destinations.length
      ? `Programme audio is taken from ${phraseList(extraction, DISCOVERY_AUDIO_EXTRACTION_PHRASES)} and delivered to ${phraseList(destinations, DISCOVERY_AUDIO_DESTINATION_PHRASES)}.`
      : extraction.length
        ? `Programme audio is taken from ${phraseList(extraction, DISCOVERY_AUDIO_EXTRACTION_PHRASES)}; where it must arrive is not recorded yet.`
        : destinations.length
          ? `Programme audio must reach ${phraseList(destinations, DISCOVERY_AUDIO_DESTINATION_PHRASES)}; where it is taken from is not recorded yet.`
          : undefined;
  const signalPath = uc ? "Near-end microphones → AEC DSP or verified integrated device → USB transmit to the active meeting host. Far-end USB return → room playback and AEC reference; exclude that return from the transmit mix. Route local voice lift separately with commissioned gain/delay."
    : "Programme feeds and microphones → input interfaces/mixer/DSP → independent zone amplification or powered specialist arrays → loudspeakers. Provide separate recorded/assistive mixes and align audio with the displayed picture where required.";
  const validation = ["Confirm actual dimensions, construction, ceiling height, seating depth, acoustic targets and source/listening-zone schedules.", "Quantity-one third-party rows are whole-system allowances; resolve supplier/model, speaker/channel counts, cable circuits and measured treatment area before pricing."];
  for (const key of ["audio-zones", "audio-programme", "room-acoustics"]) if (!values(answers, key).length || values(answers, key).some((v) => v.startsWith("unknown-"))) validation.push(`Confirm ${key === "audio-zones" ? "audio zones and independent source controls" : key === "audio-programme" ? "speech, programme and performance expectations" : "acoustic conditions and existing treatment"}.`);
  if (zones && !notes["audio-zones"]?.trim()) validation.push("Record the number and names of audio zones and their independent source feeds.");
  // A half-recorded route is a question, not a default: the design must not
  // assume where sound is taken from, or that it is played anywhere.
  if (routeValues.includes("unknown-audio-route")) validation.push("Confirm the programme-audio route: the extraction point and every destination.");
  if (destinations.length && !extraction.length) validation.push("Confirm where programme audio is extracted: a destination is recorded without the point the sound is taken from.");
  if (extraction.length && !destinations.length) validation.push("Confirm where the extracted programme audio must arrive.");
  if (destinations.length === 1 && destinations[0] === "route-to-display-speakers") validation.push("Confirm the display's own speakers, level and delay are acceptable as the room's programme sound.");
  return { direction, route, extraction: route === undefined ? undefined : extraction[0], destinations: route === undefined || !destinations.length ? undefined : [...destinations], basis: [notes.scale, notes["room-acoustics"], notes["audio-zones"], notes["audio-programme"], notes["audio-route"]].filter(Boolean).join(" ") || "Room dimensions, construction and listening positions remain to be surveyed.", signalPath, zoning, requiredScope, validation };
}

export function readDiscoveryAudioDesign(value: unknown): DiscoveryAudioDesign | undefined {
  if (!value || typeof value !== "object") return undefined;
  const a = value as DiscoveryAudioDesign;
  if (![a.direction, a.basis, a.signalPath, a.zoning].every((s) => typeof s === "string") || (a.route !== undefined && typeof a.route !== "string") || (a.extraction !== undefined && typeof a.extraction !== "string") || (a.destinations !== undefined && (!Array.isArray(a.destinations) || !a.destinations.every((s) => typeof s === "string"))) || !Array.isArray(a.validation) || !a.validation.every((s) => typeof s === "string") || !Array.isArray(a.requiredScope) || !a.requiredScope.every((s) => s && [s.key, s.description, s.notes].every((v) => typeof v === "string"))) return undefined;
  return a;
}
