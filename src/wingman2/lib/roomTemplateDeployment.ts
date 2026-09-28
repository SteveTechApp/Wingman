import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { TemplateArchitectureFamily, TemplateCapability } from "./templateApplicationProfiles";
import { audioDesignNotes, roomAudioBom, validRoomAudio, type RoomAudioDesign } from "./roomTemplateAudio";

export type RoomTransport = "apollo" | "hdbt" | "matrix4" | "matrix8" | "hybrid" | "nhd100" | "nhd500" | "nhd600" | "wall" | "studio" | "pods";
export type ScheduleItem = readonly [description: string, qty: number, location: string];
export type RoomDeploymentDesign = {
  id: string; name: string; vertical: string; space: string; construction: string; occupancy: string;
  activity: string; transport: RoomTransport; sources: ScheduleItem[]; outputs: ScheduleItem[];
  speakers: number; microphones: number; audio: RoomAudioDesign; uc?: "byod" | "room"; recording?: boolean;
  signage?: boolean; resilience?: boolean; accessibility?: boolean;
  inputExtensions?: number;
  additionalScope?: Array<{ key: string; description: string; qty: number; notes: string }>;
  rationale: string; alternative: string; constraints: string[];
};
export type RoomConcept = {
  statement: string; environment: string; construction: string; occupancy: string;
  sources: ScheduleItem[]; outputs: ScheduleItem[]; sourceCount: number; outputCount: number;
  transport: RoomTransport; architectureFamily: TemplateArchitectureFamily;
  rationale: string; alternative: string; signalFlow: string[]; capabilities: TemplateCapability[];
  audio?: RoomAudioDesign;
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
  return c;
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
    rows.push({ ...row(`${d.id}-${key}`, `BY-OTHERS-${key.toUpperCase()}`, description, `${description} by others`, qty, notes), owner, manufacturer: "", model: "" });
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

export function createDeploymentTemplate(d: RoomDeploymentDesign): RoomTemplate {
  const sourceCount = total(d.sources), outputCount = total(d.outputs);
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
  };
  return {
    id: d.id, name: d.name, vertical: d.vertical, application: d.activity, scale: `${d.occupancy} · ${sourceCount} source positions · ${outputCount} outputs`,
    summary: d.activity, customerNarrative: statement, architecture: descriptions[d.transport], concept,
    bom: [...core(d), ...(d.inputExtensions ? [row(`${d.id}-source-extension`, "EX-70-H2", "Complete source-to-rack HDBaseT extender set (TX and RX)", "Remote source input extension", d.inputExtensions, "One transmitter at each remote source and one receiver into rack HDMI. Use dedicated category cable; baseline 1080p60 and routes at or below 35m, with higher formats confirmed separately. These are additional to the display extension sets.")] : []), ...completeScope(d)],
    designNotes: [{ label: "Concept statement", description: statement }, { label: "Source schedule", description: schedule(d.sources) }, { label: "Output schedule", description: schedule(d.outputs) }, { label: "Audio experience and signal path", description: audioDesignNotes(d.audio) }, { label: "Architecture choice", description: d.rationale }, { label: "Alternative approach", description: d.alternative }],
    assumptions: [d.space, d.construction, `Occupancy: ${d.occupancy}.`, `${sourceCount} physical video source positions and ${outputCount} physical outputs; spare product ports are not extra sources or displays.`, ...(outputCount > sourceCount ? [`Shared content is intentional: ${sourceCount} scheduled source feeds repeat across ${outputCount} displays; independent content requires additional sources.`] : []), "Required third-party rows are part of the complete system; supplier/model and measured allowances must be completed before pricing."],
    validationItems: [...d.constraints, "Confirm dimensions, cable lengths, structure, sightlines, acoustics and mains provision by site survey.", "Replace third-party placeholders with supplier/model and confirm quantities, interfaces, licences and delivery ownership.", "Test the complete signal format, HDCP/EDID, audio, USB and control path before customer acceptance."],
    upgradePaths: [d.alternative, "Re-engineer endpoint, processing, cabling, power and control quantities when the source/output schedule changes."],
  };
}
