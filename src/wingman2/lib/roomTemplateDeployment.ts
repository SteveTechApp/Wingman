import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { TemplateArchitectureFamily, TemplateCapability } from "./templateApplicationProfiles";
import { audioDesignNotes, roomAudioBom, validRoomAudio, type RoomAudioDesign } from "./roomTemplateAudio";

export type RoomTransport = "apollo" | "hdbt" | "matrix4" | "matrix8" | "hybrid" | "nhd100" | "nhd500" | "nhd600" | "wall" | "studio" | "pods";
export type ScheduleItem = readonly [description: string, qty: number, location: string];
/**
 * Optional whole-room guidance beyond signal transport (see
 * docs/AV_COMPLETE_ROOM_DESIGN_REFERENCE.md §6). Every key is optional and an
 * unpopulated block emits nothing, so authored designs adopt layers gradually
 * without regressing the existing catalogue.
 */
export type RoomCompletionDesign = {
  humanFactors?: {
    farthestViewerMetres?: number;
    contentClass?: "bdm" | "adm";
    ambientLight?: "controlled" | "daylight" | "high-ambient" | "outdoor";
    speechPrivacy?: boolean;
    cameraFov?: string;
  };
  controlExperience?: {
    operator: "teacher" | "facilitator" | "volunteer" | "professional" | "public";
    scheduling?: boolean;
    monitoring?: "none" | "basic" | "24-7-noc";
  };
  environment?: {
    rt60Target?: string;
    acousticTreatment?: "none" | "light" | "moderate" | "heavy";
    illuminationControls?: boolean;
    rackThermal?: "passive" | "forced" | "hvac-cooled";
  };
  assurance?: {
    acceptanceTest?: boolean;
    trainingAudience?: string;
    warrantyTier?: "return-to-base" | "advance-replacement" | "on-site-nbd" | "24-7-mission-critical";
    monitoringContract?: boolean;
    sparesHeld?: string;
  };
  compliance?: {
    assistiveListening?: "required" | "recommended" | "not-required";
    lifeSafetyAudioPriority?: boolean;
    recordingConsentPolicy?: string;
    cameraPrivacy?: string;
    informationClassification?: string;
  };
};
export type RoomDeploymentDesign = {
  id: string; name: string; vertical: string; space: string; construction: string; occupancy: string;
  activity: string; transport: RoomTransport; sources: ScheduleItem[]; outputs: ScheduleItem[];
  speakers: number; microphones: number; audio: RoomAudioDesign; uc?: "byod" | "room"; recording?: boolean;
  signage?: boolean; resilience?: boolean; accessibility?: boolean;
  inputExtensions?: number;
  additionalScope?: Array<{ key: string; description: string; qty: number; notes: string }>;
  rationale: string; alternative: string; constraints: string[];
  completion?: RoomCompletionDesign;
};
export type RoomConcept = {
  statement: string; environment: string; construction: string; occupancy: string;
  sources: ScheduleItem[]; outputs: ScheduleItem[]; sourceCount: number; outputCount: number;
  transport: RoomTransport; architectureFamily: TemplateArchitectureFamily;
  rationale: string; alternative: string; signalFlow: string[]; capabilities: TemplateCapability[];
  audio?: RoomAudioDesign;
  /** Authored whole-room completion block, preserved for the checklist surface. */
  completion?: RoomCompletionDesign;
};
export function readRoomConcept(value: unknown): RoomConcept | undefined {
  if (!value || typeof value !== "object") return undefined;
  const c = value as RoomConcept;
  if (![c.statement, c.environment, c.construction, c.occupancy, c.rationale, c.alternative].every((text) => typeof text === "string")) return undefined;
  if (!(c.transport in families) || c.architectureFamily !== families[c.transport]) return undefined;
  const schedule = (items: unknown): items is ScheduleItem[] => Array.isArray(items) && items.every((item) => Array.isArray(item) && typeof item[0] === "string" && Number.isInteger(item[1]) && item[1] > 0 && typeof item[2] === "string");
  if (!schedule(c.sources) || !schedule(c.outputs) || c.sourceCount !== total(c.sources) || c.outputCount !== total(c.outputs)) return undefined;
  if (!Array.isArray(c.signalFlow) || !c.signalFlow.every((line) => typeof line === "string") || !Array.isArray(c.capabilities)) return undefined;
  const allowed = new Set(["video", "audio", "microphones", "uc", "control", "network", "recording", "signage", "resilience", "accessibility"]);
  if (!c.capabilities.every((capability) => allowed.has(capability))) return undefined;
  if (c.audio !== undefined && !validRoomAudio(c.audio)) return undefined;
  // The completion block only drives whole-room guidance display, so it is
  // preserved leniently: a plain object passes through, junk is dropped
  // rather than rejecting an otherwise valid stored concept.
  const completion = c.completion && typeof c.completion === "object" && !Array.isArray(c.completion) ? c.completion : undefined;
  return completion ? { ...c, completion } : c;
}
const total = (items: ScheduleItem[]) => items.reduce((count, item) => count + item[1], 0);
const families: Record<RoomTransport, TemplateArchitectureFamily> = {
  apollo: "Local UC", hdbt: "HDBaseT", matrix4: "Matrix", matrix8: "Matrix", hybrid: "Hybrid",
  nhd100: "AV over IP", nhd500: "AV over IP", nhd600: "AV over IP", wall: "Video wall", studio: "Local UC", pods: "HDBaseT",
};
const descriptions: Record<RoomTransport, string> = {
  apollo: "The laptop connects to the Apollo bar by USB-C; HDMI presentation also needs the documented USB host connection for conferencing. The bar feeds one display over HDMI and supplies the room camera, microphone and loudspeakers. Calls run on the connected computer.",
  hdbt: "The SW-130-TX-UK selects one HDMI/USB-C presentation source at a time and sends it over a dedicated category cable to RX-700, then HDMI to the display. USB touch return uses the matched USB host/device path. Design at 1080p60 or 4K30; the receiver's higher rating does not raise the transmitter limit, and USB-C is not a laptop charging supply.",
  matrix4: "An MX-0404-HDMI routes up to four HDMI sources independently to four output ports. Each scheduled display has a complete EX-70-H2 transmitter/receiver set, dedicated category run and short HDMI tails. Design the installed path at 1080p60 with runs at or below 35m; verify the exact resolution and cable limit before a higher-format quotation. USB, microphone and control paths are separate from the video matrix.",
  matrix8: "An MX-0808-KIT-V2 routes up to eight HDMI sources to eight independent HDBaseT zones. Its eight receivers are included in the kit and are not purchased again. Each used zone gets a dedicated category run and HDMI tail, with a 35m maximum design allowance. Mirrored HDMI sockets are not extra independent routes. Confirm the required colour format; 4K60 4:4:4 is not the baseline for this kit.",
  hybrid: "One MX-1007-HYB serves the local room. Up to four display destinations use HDMI outputs with complete EX-70-H2 extender sets; any fifth and sixth destinations use the two native HDBaseT 3.0 outputs with RX3-100 receivers. Source devices present HDMI locally at the rack. The NetworkHD ports are unused in this base design. Audio and USB conferencing are separately scheduled and commissioned.",
  nhd100: "Each scheduled HDMI feed has one NHD-120-TX; each display has one NHD-120-RX. NHD-CTL-PRO-V2 manages routes on a dedicated, approved 1Gb multicast AV fabric. The content PCs/VMS outputs provide HDMI: raw CCTV or arbitrary IP streams cannot simply join the transport. Single-content outputs are the baseline; add a compatible multiview decoder only for an agreed window layout.",
  nhd500: "Each scheduled HDMI feed has one NHD-500-TX and each output one NHD-500-RX, managed by NHD-CTL-PRO-V2 on an engineered 1Gb AV fabric. Decoders feed the nominated displays over HDMI. NetworkHD carries the display feeds, while programme audio, USB conferencing and control have separately defined paths. No direct 100/500/600-series stream interchange is assumed.",
  nhd600: "One NHD-600-TRX in transmit mode serves each HDMI source; a separate NHD-600-TRX in receive mode serves each physical display. NHD-CTL-PRO-V2 and an engineered 10Gb AV fabric provide routing. The 600-series built-in wall/multiview modes must be configured for the agreed layouts; latency varies with mode and the complete display chain. No separate 500-series multiview processor is included.",
  wall: "An SW-0204-VW processes the selected HDMI content into a four-panel LCD canvas. Four short HDMI links feed four matching panels, with one maintained bezel/EDID layout. The panels are outputs of one composition, not four independent routed rooms. A CMS player supplies the correctly proportioned artwork.",
  studio: "Two HDMI camera feeds enter CAM-0402-NDI-BRG at the production desk. Its selected/composited HDMI output drives a local confidence monitor and its USB output feeds the production computer. Microphone audio is mixed separately into the recording workflow. HDMI/USB outputs share the programme; an independent preview bus needs a separate production switcher.",
  pods: "Each pod has its own SW-130-TX-UK and RX-700 pair, local laptop input and display. Four dedicated HDBaseT links provide four independent spaces without a shared video network. There is no cross-pod source routing or shared conferencing audio in the base scope.",
};
function row(id: string, sku: string, description: string, role: string, qty: number, notes: string): TemplateBomRow {
  return { id, sku, description, role, qty, type: "Required", status: "included", evidence: "Quantity follows the authored room concept and source/output schedule; confirm by site survey.", notes, owner: "wyrestorm" };
}
function core(d: RoomDeploymentDesign): TemplateBomRow[] {
  const inputCount = total(d.sources), outputCount = total(d.outputs);
  const add = (sku: string, label: string, role: string, qty = 1, notes = descriptions[d.transport]) => row(`${d.id}-${role.replace(/\W+/g, "-")}`, sku, label, role, qty, notes);
  if (d.transport === "apollo") return [add("APO-VX20-UC-V2", "Apollo video bar and local presentation core", "Local UC core")];
  if (d.transport === "hdbt" || d.transport === "pods") return [add("SW-130-TX-UK", "HDMI/USB-C wallplate transmitter", "Presentation input transmitter", outputCount), add("RX-700", "Matched display receiver with power supply", "Display receiver", outputCount)];
  if (d.transport === "matrix4") return [add("MX-0404-HDMI", "4×4 HDMI matrix", "Local routing core"), add("EX-70-H2", "Complete HDBaseT extender set (TX and RX)", "Display extension set", outputCount)];
  if (d.transport === "matrix8") return [add("MX-0808-KIT-V2", "8×8 HDBaseT matrix kit including eight receivers", "Local routing core")];
  if (d.transport === "hybrid") return [add("MX-1007-HYB", "Local hybrid presentation matrix", "Local routing core"), add("EX-70-H2", "Complete HDMI-output extension set (TX and RX)", "Display extension set", Math.min(4, outputCount)), ...(outputCount > 4 ? [add("RX3-100", "HDBaseT 3.0 receiver", "Display receiver", outputCount - 4)] : [])];
  if (d.transport === "wall") return [add("SW-0204-VW", "Four-output LCD video wall processor", "Video wall core")];
  if (d.transport === "studio") return [add("CAM-0402-NDI-BRG", "Camera bridge with HDMI and USB programme output", "Camera production bridge")];
  const controller = add("NHD-CTL-PRO-V2", "NetworkHD route controller", "AV routing controller");
  if (d.transport === "nhd600") return [controller, add("NHD-600-TRX", "600-series transceiver configured as transmitter", "Source encoder", inputCount), add("NHD-600-TRX", "600-series transceiver configured as receiver", "Display decoder", outputCount)];
  const series = d.transport === "nhd100" ? "120" : "500";
  return [controller, add(`NHD-${series}-TX`, `${series}-series source encoder`, "Source encoder", inputCount), add(`NHD-${series}-RX`, `${series}-series display decoder`, "Display decoder", outputCount)];
}

function completeScope(d: RoomDeploymentDesign): TemplateBomRow[] {
  const rows: TemplateBomRow[] = [], inputs = total(d.sources), outputs = total(d.outputs);
  const networked = d.transport.startsWith("nhd"), integrated = d.transport === "apollo";
  const add = (key: string, description: string, qty: number, notes: string, owner = "integrator") => {
    rows.push({
      ...row(`${d.id}-${key}`, `BY-OTHERS-${key.toUpperCase()}`, description, `${description} by others`, qty, notes),
      type: "Validate", status: "validate", evidence: "Scope allowance only. Select and verify a compatible manufacturer and model before quotation.",
      owner, manufacturer: "", model: "",
    });
  };
  d.sources.forEach(([description, qty, location], i) => add(`source-${i + 1}`, description, qty, `Source position: ${location}. Supply or confirm the existing device, authorised content/software and the nominated HDMI/USB-C interface. Include power, mounting and any required output adapter. Source HDMI tails are at most 5m unless an input extension is explicitly scheduled.`, "customer"));
  d.outputs.forEach(([description, qty, location], i) => add(`display-${i + 1}`, description, qty, `Output position: ${location}. Select an HDMI-equipped model for viewing distance, brightness and operating hours; prove readability from the furthest seat.`));
  add("mounts", "Display/projector mounts and structural fixings", outputs, `One mounting assembly per output, including a screen where projection is selected. ${d.construction} Confirm load rating, sightlines, ventilation and safe service access.`);
  rows.push(...roomAudioBom(d.id, d.audio, d.microphones));
  if (d.uc) {
    if (!integrated && d.transport !== "studio") add("uc-camera", "USB conferencing camera and mounting", 1, "Select field of view and zoom for the stated occupancy; locate at eye line. Camera USB connects to the nominated host via the separately scoped extension path.");
    add("uc-host", d.uc === "room" ? "Room conferencing console, compute integration and platform licence" : "BYOD conferencing host, software and USB access", 1, d.uc === "room" ? "Complete a supported compute/console/licence bundle and verify peripheral compatibility. Where compute is named in the source schedule, fulfil that line rather than buying a second PC. The video bar is a USB peripheral, not a standalone Teams/Zoom Room." : "Use the laptop in the source schedule where present; otherwise supply one approved conferencing laptop. This allowance completes software/licensing and host connectivity without duplicating an existing computer.", "customer");
    add("usb-path", "USB host switching/extension and compliant USB cables", 1, "One engineered path allowance: name host and device ends, select tested USB bandwidth/distance, include power/hubs and any required HDMI content capture. HDMI matrix routing does not switch USB. Keep a single active conferencing host.");
    if (integrated) add("uc-mount", "Video bar bracket and mounting allowance", 1, "Use the included mounting hardware where suitable; select a compatible additional bracket only if needed. Camera, microphone, DSP and speakers are inside the Apollo bar; no separate room audio package is assumed. Acoustic treatment is separately scheduled.");
  }
  if (d.transport === "studio" && !d.uc) add("production-host", "Production computer, USB ingest cable and recording software", 1, "Connect bridge USB video and the audio mixer interface to the same host; include headphones, monitoring and sync test. This computer also fulfils the recording-platform allowance; do not purchase a second recording PC.");
  if (d.recording) add("recording", "Capture/streaming appliance or ingest interface, storage and licences", 1, "One complete platform allowance. Provide a supported camera/programme ingest, separate agreed audio feed, network connectivity, recording consent, retention and access controls. A display decoder alone is not a recorder.");
  if (d.recording) {
    add("capture-feed", "Presentation/programme recording split and ingest interface", 1, "One selected programme feed: include a format-compatible HDMI distribution amplifier or a verified source loop-out, signal cables and capture input. This branch does not consume a scheduled display destination. Multiple isolated recordings need additional ingest channels and storage.");
    if (!d.sources.some(([name]) => /camera|vision|programme/i.test(name))) add("capture-camera", "Lecture/training camera with power, mount and capture connection", 1, "One presenter view into the capture platform; provide a second video ingest channel and synchronise it with presentation and audio.");
  }
  if (d.signage) add("cms", "Content management licences, scheduling and monitoring", inputs, "One allowance per scheduled content player/feed; the source devices are counted above. Confirm ownership, network access, recurring subscriptions, permitted content and local playback on WAN loss.", "customer");
  add("room-control", networked ? "Operator touch interface and room-control integration" : "Room operation, source selection and display/audio control", 1, networked ? "Include touch panel/tablet, power, mounting, control processor/drivers where required and programming. NHD-CTL supplies AV routes; it does not replace the operator interface or all room automation." : "Use supplied front-panel/remote controls and tested CEC where practical. Include a keypad/control processor when the room needs integrated source, display and audio operation; identify its model before issue.");
  if (networked) {
    const ports = inputs + outputs + 3;
    const switches = Math.ceil(Math.ceil(ports * 1.2) / 24);
    add("av-switch", `${d.transport === "nhd600" ? "10Gb" : "1Gb"} managed AV switch — 24 usable endpoint ports`, switches, `${inputs} encoder + ${outputs} decoder + 1 controller + 2 management/control connections = ${ports} access ports; ${Math.ceil(ports * 1.2)} ports including 20% expansion. Select supported hardware with separately provisioned non-blocking uplinks, multicast settings and the full endpoint PoE budget. Verify switch placement and expand this quantity if distributed locations require it.`);
    add("network-uplinks", "AV network uplinks, fibre/optics, patching and configuration", 1, "Measured system allowance: engineer inter-switch capacity from concurrent streams, source placement and link oversubscription. Fibre links need matching optics at both ends; do not assume one 1Gb uplink carries every stream.");
  }
  add("power-rack", "Equipment rack/furniture, PDU, ventilation and mains outlets", 1, "One measured system allowance; locate core equipment in the nominated cupboard/rack, allow service access, include local device PSUs and every display/source outlet. Confirm electrical works and earthing ownership.");
  add("signal-cabling", "CCTS: HDMI/USB patch cables, category runs, terminations and labels", 1, `${inputs} source and ${outputs} destination positions. ${networked ? `${inputs + outputs} endpoint network drops plus controller/control links; HDMI tails at every source and screen.` : "One dedicated point-to-point output run per remote display, with HDMI tails at both ends; USB/audio/control runs are additional."} Quantity 1 is a measured cable schedule allowance, not one cable. Include containment, bend radius, fire stopping and test certification.`);
  if (d.resilience) add("ups-recovery", "UPS, recovery procedures and operational spares", 1, "One engineered system allowance: size UPS load/runtime, document single points of failure, select spare endpoints/PSUs and test recovery. A single controller or switch is not a redundant design.");
  if (d.accessibility) add("accessibility", "Assistive listening and accessible controls/captioning", 1, "One site-specific system allowance; select hearing assistance, signage and captioning provision with the venue, and commission it with the room audio system.");
  add("labour", "Installation labour, access equipment and making good", 1, "Measured labour allowance: survey cable routes and access restrictions, quantify engineering days, lifting, furniture/ceiling works and out-of-hours attendance.");
  add("commissioning", "Programming, commissioning, acceptance testing and training", 1, "System allowance: exercise every source/output route, audio/USB path, start/stop sequence and recovery mode; record results and train the operators.");
  add("design", "Survey, project management, CAD/Visio and as-built documentation", 1, "System allowance: issue room elevations, source/output schedule, schematics, rack/power drawings, cable schedule and responsibility matrix before installation.");
  for (const item of d.additionalScope ?? []) add(item.key, item.description, item.qty, item.notes);
  return rows;
}

const warrantyLabels: Record<NonNullable<NonNullable<RoomCompletionDesign["assurance"]>["warrantyTier"]>, string> = {
  "return-to-base": "return-to-base repair",
  "advance-replacement": "advance replacement",
  "on-site-nbd": "on-site next-business-day",
  "24-7-mission-critical": "24/7 mission-critical response",
};

/**
 * Whole-room guidance rows and notes from the optional completion block
 * (docs/AV_COMPLETE_ROOM_DESIGN_REFERENCE.md §2/§6): experience and human
 * factors, control experience, environment, assurance and compliance. An
 * unpopulated block contributes nothing, so designs adopt layers gradually.
 */
function completionScope(d: RoomDeploymentDesign): { rows: TemplateBomRow[]; notes: Array<{ label: string; description: string }> } {
  const rows: TemplateBomRow[] = [];
  const notes: Array<{ label: string; description: string }> = [];
  const completion = d.completion;
  if (!completion) return { rows, notes };
  const add = (key: string, description: string, qty: number, notes: string) => {
    rows.push({
      ...row(`${d.id}-${key}`, `BY-OTHERS-${key.toUpperCase()}`, description, `${description} by others`, qty, notes),
      type: "Validate", status: "validate", evidence: "Scope allowance only. Select and verify a compatible manufacturer and model before quotation.",
      owner: "integrator", manufacturer: "", model: "",
    });
  };

  const hf = completion.humanFactors;
  if (hf) {
    const viewer = hf.farthestViewerMetres;
    if (viewer !== undefined) {
      const className = hf.contentClass === "adm" ? "analytical decision-making content" : "basic decision-making content";
      notes.push({ label: "Image size and reading distance", description: `The farthest viewer sits about ${viewer} m away. Size the display for ${className} at that distance using AVIXA DISCAS (V202.01) before fixing the model; a larger room or denser content pushes the image size up, not the resolution.` });
    }
    const ambient = hf.ambientLight;
    if (ambient && ambient !== "controlled") {
      const brightness: Record<Exclude<NonNullable<typeof ambient>, "controlled">, string> = {
        daylight: "daylight-controlled spaces typically need 500–700 nit-class panels with strong anti-reflection handling",
        "high-ambient": "high-ambient/shopfront positions typically need 2,000–2,500+ nit panels or shading",
        outdoor: "outdoor positions need high-nit, temperature-rated direct-view LED with service access",
      };
      notes.push({ label: "Brightness versus ambient light", description: `The stated ambient condition (${ambient}) drives panel brightness: ${brightness[ambient]}. Confirm the measured ambient level on survey; a domestic-grade panel will look washed out and reflects the room back at the audience.` });
    }
    if (hf.speechPrivacy) {
      add("sound-masking", "Sound masking / speech-privacy system (emitters, control and tuning)", 1, "One measured allowance: emitters and control tuned to the stated privacy requirement, with comfort and acoustic survey. Isolation (wall/floor construction) is a building scope decision and is separate from masking.");
      notes.push({ label: "Speech privacy", description: "The design assumes conversations must not be intelligible outside the room. Masking emitters plus partition/isolation scope deliver that; a conferencing bar or DSP does not." });
    }
    if (hf.cameraFov) {
      notes.push({ label: "Camera field of view", description: `${hf.cameraFov}. Verify at the table/room in furnished conditions: a camera that crops the farthest participant defeats the conferencing investment regardless of video quality.` });
    }
  }

  const control = completion.controlExperience;
  if (control) {
    const operatorGuidance: Record<typeof control.operator, string> = {
      teacher: "The daily operator is a teacher with no AV training: input select, volume and one call/presentation action must be reachable in one gesture each, labelled in plain language.",
      facilitator: "The daily operator is a trained facilitator: presets for the named activity modes are expected, with a documented reset-to-default action.",
      volunteer: "The daily operator is an untrained volunteer: everything above mute/volume must run from presets; document a start-up and shut-down card kept in the room.",
      professional: "The daily operator is a professional control-room/operator audience: role-based access, per-operator presets and an operations runbook are part of acceptance.",
      public: "Some interaction is public-facing: self-explanatory interfaces only, with nothing operator-sensitive reachable from the public surface.",
    };
    notes.push({ label: "Who operates this room", description: operatorGuidance[control.operator] });
    if (control.scheduling) {
      add("scheduling-panel", "Room scheduling panel and calendar/licence integration", 1, "One allowance per room: door/outside-panel, PoE, platform integration and licensing. Booking data prevents ghost bookings and is a common omission in first-time room builds.");
      notes.push({ label: "Room scheduling", description: "A scheduling panel tied to the room's calendar is scheduled scope: without it, ad-hoc use collides with booked meetings and the room appears permanently busy or permanently free." });
    }
    if (control.monitoring === "24-7-noc") {
      add("monitoring-noc", "24/7 monitoring and response contract (NOC/SLA)", 1, "One contractual allowance: device health, licence expiry, alert routing, response times and escalation. 24/7 rooms are operated, not just installed; an unmonitored critical room fails silently.");
      notes.push({ label: "Monitoring and response", description: "This room is stated as continuously operated: specify a monitoring/NOC arrangement with defined response times. Remote health dashboards without a contracted response are not monitoring." });
    } else if (control.monitoring === "basic") {
      notes.push({ label: "Basic monitoring", description: "Provide at minimum a documented routine check (display power, source availability, call test) and an owner for fault reporting; record it in the handover documentation." });
    }
  }

  const environment = completion.environment;
  if (environment) {
    if (environment.rt60Target) {
      notes.push({ label: "Reverberation target", description: `The design target is ${environment.rt60Target}. Acoustic treatment scope in this template exists to reach that measured target; verify after fit-out with the space furnished, because AEC and DSP shape the signal path but cannot shorten room reverberation.` });
    }
    if (environment.illuminationControls) {
      add("lighting-interface", "Lighting/blind scene integration with the AV control system", 1, "One integration allowance: contact/driver interfaces, scene programming and commissioning with the lighting contractor. Confirm which trade owns dimming drivers before pricing.");
    }
    if (environment.rackThermal && environment.rackThermal !== "passive") {
      notes.push({ label: "Rack thermal design", description: environment.rackThermal === "hvac-cooled"
        ? "The equipment load requires space cooling or a dedicated cooling allowance: calculate rack BTU from the final schedule and agree responsibility with the mechanical contractor."
        : "The equipment load requires forced ventilation in the rack: calculate rack BTU from the final schedule and select fans/venting accordingly; a sealed cupboard will thermally throttle or shorten equipment life." });
    }
  }

  const assurance = completion.assurance;
  if (assurance) {
    if (assurance.warrantyTier) {
      notes.push({ label: "Warranty and support tier", description: `State ${warrantyLabels[assurance.warrantyTier]} for the WyreStorm core and the selected third-party lines. Support tier is a design decision that changes price and should be agreed with the client before quotation, not discovered at first fault.` });
    }
    if (assurance.monitoringContract && !(control?.monitoring === "24-7-noc")) {
      add("monitoring-noc", "Monitoring and response contract (NOC/SLA)", 1, "One contractual allowance: device health, licence expiry, alert routing, response times and escalation.");
    }
    if (assurance.sparesHeld) {
      add("spares", "Operational spares package", 1, `One spares allowance per the stated holding (${assurance.sparesHeld}): select items by failure impact and lead time, and record their storage location and refresh date in the handover pack.`);
    }
    if (assurance.trainingAudience) {
      notes.push({ label: "Training", description: `Commissioning includes operator training for ${assurance.trainingAudience}, with a written quick-start guide kept in the room. Training is part of the delivery, not an optional extra.` });
    }
  }

  const compliance = completion.compliance;
  if (compliance) {
    if (compliance.assistiveListening === "required") {
      add("assistive-listening", "Assistive listening system (induction loop / IR / radio) and signage", 1, "One measured allowance: coverage of the stated seating area, feed from the audio system, user signage and commissioning. Assistive listening is a legal accessibility requirement in many jurisdictions; confirm the governing requirement for this venue.");
      notes.push({ label: "Assistive listening", description: "The stated use requires assistive listening provision. Treat it as a required system (feed from the programme/microphone audio, coverage and signage), not an accessory." });
    } else if (compliance.assistiveListening === "recommended") {
      notes.push({ label: "Assistive listening (recommended)", description: "Assistive listening is not mandated for this application but is commonly expected: confirm with the venue whether to include it, and price it as an option if not required." });
    }
    if (compliance.lifeSafetyAudioPriority) {
      add("va-paging-interface", "Voice-alarm / paging priority interface (life-safety mute and override)", 1, "One engineered interface allowance: emergency/voice-alarm override of programme audio, priority hierarchy and mute contacts, designed with the fire/life-safety contractor. Programme audio must always yield to life-safety announcements.");
      notes.push({ label: "Life-safety audio priority", description: "Programme audio in this space must yield to life-safety/voice-alarm announcements. That interface is a governed, engineered connection designed with the fire/life-safety authority — it is never a software setting on an amplifier." });
    }
    if (compliance.recordingConsentPolicy) {
      notes.push({ label: "Recording consent and retention", description: compliance.recordingConsentPolicy });
    }
    if (compliance.cameraPrivacy) {
      notes.push({ label: "Camera privacy", description: compliance.cameraPrivacy });
    }
    if (compliance.informationClassification) {
      notes.push({ label: "Information classification", description: compliance.informationClassification });
    }
  }

  return { rows, notes };
}

export function createDeploymentTemplate(d: RoomDeploymentDesign): RoomTemplate {
  const sourceCount = total(d.sources), outputCount = total(d.outputs);
  const completion = completionScope(d);
  const capabilities: TemplateCapability[] = ["video", "control"];
  if (d.audio.approach !== "silent") capabilities.push("audio");
  if (d.microphones || d.transport === "apollo") capabilities.push("microphones");
  if (d.uc) capabilities.push("uc");
  if (d.transport.startsWith("nhd")) capabilities.push("network");
  if (d.recording) capabilities.push("recording");
  if (d.signage) capabilities.push("signage");
  if (d.resilience) capabilities.push("resilience");
  if (d.accessibility) capabilities.push("accessibility");
  const statement = `Assumed setting: ${d.space} ${d.construction} Designed for ${d.occupancy}. ${d.activity}`;
  const schedule = (items: ScheduleItem[]) => items.map(([name, qty, location]) => `${qty} × ${name} (${location})`).join("; ");
  const concept: RoomConcept = {
    statement, environment: d.space, construction: d.construction, occupancy: d.occupancy,
    sources: d.sources, outputs: d.outputs, sourceCount, outputCount, transport: d.transport,
    architectureFamily: families[d.transport], rationale: d.rationale, alternative: d.alternative, capabilities, audio: d.audio,
    signalFlow: [schedule(d.sources), descriptions[d.transport], schedule(d.outputs)],
    completion: d.completion,
  };
  return {
    id: d.id, name: d.name, vertical: d.vertical, application: d.activity, scale: `${d.occupancy} · ${sourceCount} source positions · ${outputCount} outputs`,
    summary: d.activity, customerNarrative: statement, architecture: descriptions[d.transport], concept,
    bom: [...core(d), ...(d.inputExtensions ? [row(`${d.id}-source-extension`, "EX-70-H2", "Complete source-to-rack HDBaseT extender set (TX and RX)", "Remote source input extension", d.inputExtensions, "One transmitter at each remote source and one receiver into rack HDMI. Use dedicated category cable; baseline 1080p60 and routes at or below 35m, with higher formats confirmed separately. These are additional to the display extension sets.")] : []), ...completeScope(d), ...completion.rows],
    designNotes: [{ label: "Concept statement", description: statement }, { label: "Source schedule", description: schedule(d.sources) }, { label: "Output schedule", description: schedule(d.outputs) }, { label: "Audio experience and signal path", description: audioDesignNotes(d.audio) }, { label: "Architecture choice", description: d.rationale }, { label: "Alternative approach", description: d.alternative }, ...completion.notes],
    assumptions: [d.space, d.construction, `Occupancy: ${d.occupancy}.`, `${sourceCount} physical video source positions and ${outputCount} physical outputs; spare product ports are not extra sources or displays.`, ...(outputCount > sourceCount ? [`Shared content is intentional: ${sourceCount} scheduled source feeds repeat across ${outputCount} displays; independent content requires additional sources.`] : []), "Required third-party rows are part of the complete system; supplier/model and measured allowances must be completed before pricing."],
    validationItems: [...d.constraints, "Confirm dimensions, cable lengths, structure, sightlines, acoustics and mains provision by site survey.", "Replace third-party placeholders with supplier/model and confirm quantities, interfaces, licences and delivery ownership.", "Test the complete signal format, HDCP/EDID, audio, USB and control path before customer acceptance."],
    upgradePaths: [d.alternative, "Re-engineer endpoint, processing, cabling, power and control quantities when the source/output schedule changes."],
  };
}
