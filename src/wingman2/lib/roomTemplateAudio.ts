import type { TemplateBomRow } from "./roomTemplates";

export type AudioZone = {
  name: string; purpose: string; speakers: number; topology: "100V" | "lowZ";
  tapWatts?: number; amplifierWatts: number; amplifierSku?: "AMP-2120-DNT";
};
export type RoomAudioDesign = {
  approach: "silent" | "integrated" | "distributed" | "programme-and-speech" | "cinema" | "studio";
  experience: string; zones: AudioZone[]; microphones: string;
  processing: string; connectivity: string; dante: boolean; aec: boolean;
  programmeFeeds: number; routing: string;
  specialistSystems?: Array<{ name: string; qty: number; reason: string; scope: string; inputChannels: number }>;
  acousticTreatment?: { reason: string; scope: string };
};

export function audioDesignNotes(audio: RoomAudioDesign): string {
  const zones = audio.zones.map((z) => z.topology === "100V"
    ? `${z.name}: ${z.speakers} transformer loudspeakers at ${z.tapWatts}W = ${z.speakers * (z.tapWatts ?? 0)}W connected load on one ${z.amplifierWatts}W 100V amplifier channel.`
    : `${z.name}: ${z.speakers} 8-ohm loudspeakers, each on a separate ${z.amplifierWatts}W-at-8-ohm amplifier channel.`);
  return [audio.experience, ...zones, ...(audio.specialistSystems ?? []).map((s) => `${s.qty} × ${s.name}. ${s.reason} ${s.scope}`), audio.acousticTreatment ? `${audio.acousticTreatment.reason} ${audio.acousticTreatment.scope}` : "", audio.routing, audio.microphones, audio.processing, audio.connectivity].filter(Boolean).join(" ");
}

export function roomAudioBom(id: string, audio: RoomAudioDesign, microphoneCount: number): TemplateBomRow[] {
  const rows: TemplateBomRow[] = [];
  const add = (key: string, description: string, qty: number, notes: string, sku?: string) => rows.push({
    id: `${id}-audio-${key}`, sku: sku ?? `BY-OTHERS-AUDIO-${key.toUpperCase()}`, description,
    role: description, qty, type: "Required", status: "included", notes,
    evidence: "Concept audio schedule; confirm coverage, acoustic performance and final interfaces by survey.",
    owner: sku ? "wyrestorm" : "integrator", manufacturer: sku ? "WyreStorm" : "", model: sku ?? "",
  });
  audio.zones.forEach((z, i) => {
    const loading = z.topology === "100V"
      ? `${z.speakers} × ${z.tapWatts}W taps = ${z.speakers * (z.tapWatts ?? 0)}W; one independent ${z.amplifierWatts}W 100V channel. Keep the final sum of taps at or below 80% of channel rating, including cable loss allowance; reselect after coverage/SPL design.`
      : `${z.speakers} independent amplifier channels, each rated ${z.amplifierWatts}W at 8 ohms. One 8-ohm speaker per channel; select matching continuous power handling, limiters and cable gauge. No parallel connection is assumed.`;
    add(`speakers-${i + 1}`, `${z.name}: ${z.topology === "100V" ? "100V speech/background loudspeaker" : "8-ohm programme loudspeaker"}`, z.speakers,
      `${z.purpose} ${loading} Include appropriate ceiling backcans/tile bridges or surface brackets, safety bonds and tested speaker circuits. Select weather/fire/environment rating for each location.`);
    add(`amplifier-${i + 1}`, `${z.name}: ${z.topology === "100V" ? `${z.amplifierWatts}W 100V amplifier` : `${z.speakers}-channel low-impedance amplifier`}`, 1,
      `${loading} ${z.amplifierSku ? "AMP-2120-DNT uses its mono bridged 100V mode for this zone only; its low-impedance outputs are not simultaneously available. Supply mains power." : "Select an appropriate third-party amplifier; an existing verified amplifier can fulfil this line."}`, z.amplifierSku);
  });
  audio.specialistSystems?.forEach((system, index) => add(`specialist-${index + 1}`, system.name, system.qty,
    `${system.reason} ${system.scope} Supplier and final model/module schedule are to be completed by the specialist audio contractor. Quantity counts complete assemblies, not individual drivers; include every constituent item before pricing.`));
  if (audio.acousticTreatment) add("acoustic-treatment", "Acoustic survey and wall/ceiling treatment allowance", 1,
    `${audio.acousticTreatment.reason} ${audio.acousticTreatment.scope} Quantity one means a measured treatment package, not one panel. The specialist must enter panel type, thickness, absorption performance, area, mounting and labour before pricing. Reuse existing treatment only after verification; acoustic absorption is not sound isolation.`);
  if (audio.approach === "cinema") {
    add("surround-speakers", "Matched surround loudspeakers with brackets and cabling", 5, "Front left/centre/right and two surrounds, 8-ohm nominal, with matched AVR channel loading and room acoustic treatment.");
    add("subwoofer", "Powered cinema subwoofer", 1, "Include mains and screened LFE cable; locate and align with the five main channels.");
    add("avr", "5.1 AV receiver with HDMI audio extraction and amplification", 1, "Five amplified channels plus powered-subwoofer output; confirm speaker power/impedance, actual source audio formats and HDCP/EDID across matrix routing. All selected sources must reach this AVR; provide a dedicated mirrored matrix audio feed and mute display speakers.");
  }
  if (audio.approach === "studio") add("monitoring", "Nearfield active monitor pair and audio interface", 1, "Two active desk monitors with isolation pads, balanced cables and headphone/monitor control. Mute loudspeakers during microphone recording; monitor the captured mix on headphones.");
  if (microphoneCount) add("microphones", audio.microphones, microphoneCount, "Quantity counts pickup positions. Include one compatible receiver/preamp input per position, mounting, cables, power/charging and accessories. Validate pickup pattern, RF coordination where applicable, and gain before feedback.");
  if (audio.programmeFeeds) add("programme-inputs", "Programme audio feed/interface to the zone processor", audio.programmeFeeds,
    `${audio.routing} Each row quantity is one available stereo programme feed (two DSP input channels), with a compatible source line output or HDMI audio extractor and balanced/Dante interface as needed. Include cables and HDCP/EDID validation; do not duplicate a verified source or matrix audio output. Mono 100V zones need a proper DSP downmix, not passively joined stereo outputs.`);
  if (!["silent", "integrated", "cinema"].includes(audio.approach)) add("processing", audio.aec ? "AEC conferencing DSP and USB audio interface" : "Audio mixing and independently controlled zone processing", 1,
    `${audio.processing} ${audio.connectivity} ${audio.routing} Allow at least ${audio.programmeFeeds * 2} programme input channels plus ${microphoneCount} pickup channels, any separately scheduled discussion/stage inputs and UC returns. Provide ${audio.zones.reduce((n, z) => n + (z.topology === "100V" ? 1 : z.speakers), 0) + (audio.specialistSystems ?? []).reduce((n, s) => n + s.inputChannels * s.qty, 0)} amplifier/system output channels plus required record/assistive/USB sends. Include balanced interconnects and per-zone source, volume, mute and maximum-level controls in the operator interface.`);
  if (audio.dante) add("dante-network", "Managed Dante audio network, endpoint interfaces and configuration", 1,
    "One engineered audio network allowance: Dante-capable DSP/console and each scheduled amplifier/interface, channel licences, endpoint ports, PoE budget where needed, clocking, QoS and managed switch configuration. Analogue microphones need preamps/interfaces; HDMI decoders do not become Dante endpoints automatically. Keep a separately engineered audio segment; share AV switches only after multicast/clocking compatibility is proved.");
  return rows;
}

export function validRoomAudio(value: unknown): value is RoomAudioDesign {
  if (!value || typeof value !== "object") return false;
  const a = value as RoomAudioDesign;
  return ["silent", "integrated", "distributed", "programme-and-speech", "cinema", "studio"].includes(a.approach)
    && [a.experience, a.microphones, a.processing, a.connectivity].every((v) => typeof v === "string")
    && typeof a.aec === "boolean" && typeof a.dante === "boolean" && Array.isArray(a.zones)
    && Number.isInteger(a.programmeFeeds) && a.programmeFeeds >= 0 && typeof a.routing === "string"
    && (a.acousticTreatment === undefined || (a.acousticTreatment !== null && typeof a.acousticTreatment.reason === "string" && typeof a.acousticTreatment.scope === "string"))
    && (a.specialistSystems === undefined || (Array.isArray(a.specialistSystems) && a.specialistSystems.every((s) => s && [s.name, s.reason, s.scope].every((v) => typeof v === "string") && Number.isInteger(s.qty) && s.qty > 0 && Number.isInteger(s.inputChannels) && s.inputChannels > 0)))
    && a.zones.every((z) => z && typeof z.name === "string" && typeof z.purpose === "string"
      && Number.isInteger(z.speakers) && z.speakers > 0 && Number.isFinite(z.amplifierWatts) && z.amplifierWatts > 0
      && (z.topology === "lowZ" || (z.topology === "100V" && Number.isFinite(z.tapWatts) && (z.tapWatts ?? 0) > 0))
      && (!z.amplifierSku || z.amplifierSku === "AMP-2120-DNT"));
}
