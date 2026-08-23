import fs from "node:fs/promises";

import { getBestProductPositioningCardForSku } from "../src/wingman2/data/productPositioningCards.ts";
import { getProductCallCommercialOverride } from "../src/wingman2/lib/productCallCommercialOverrides.ts";
import { getProductStory, productStoryRelatedText } from "../src/wingman2/data/productStories.ts";
import { buildProductNarrative, normaliseProductRecord } from "../src/wingman2/lib/productStoryEngine.ts";

const root = process.cwd();
const jsonPath = `${root}/public/product-call-card-products.json`;
const auditPath = `${root}/public/product-call-card-practical-copy-audit.json`;

const TOP_SKU_TALK_TRACK_OVERRIDES = {
  "AMP-2120-DNT":
    "Lead with the audio system, not the amp headline: AMP-2120-DNT is the WyreStorm path when installed loudspeakers and Dante-enabled room audio have to be part of the wider AV design, not treated as an afterthought. Bring it in when the video path is mostly understood but the room still lacks a proper audio power and network-audio plan. Before quote, confirm speaker load, Dante path, source feed and who is commissioning the audio side.",
  "AMP-260-DNT":
    "Lead with compact networked audio: AMP-260-DNT is the WyreStorm path when the room needs installed speaker power with a Dante-aware audio workflow, but the job does not call for a larger amplifier platform. Bring it in when the customer needs a tidy, supportable room-audio answer rather than relying on display speakers. Before quote, confirm loudspeaker load, source path, network-audio design and volume/control expectations.",
  "NHD-500-TX":
    "Lead with architecture: NHD-500-TX is the source-side WyreStorm path when local HDMI content has to join a managed 1GbE NetworkHD system instead of staying in a fixed matrix. Bring it in when the customer needs flexible distribution, routing between spaces or future endpoint growth. Before quote, confirm existing NetworkHD series, source resolution, network readiness and what will control the system.",
  "NHD-500":
    "Lead with the system platform: NHD-500 is the WyreStorm path when the customer is really asking for a 1GbE AVoIP architecture, not a one-box switching answer. Bring it in when the room or building needs flexible routed AV, repeatable expansion and cleaner distribution than a fixed matrix can offer. Before quote, confirm endpoint count, controller requirement, switch design and whether the job truly belongs in the 500-series tier.",
  "NHD-500-DNT-TX":
    "Lead with converged AV and audio: NHD-500-DNT-TX is the WyreStorm path when the source has to join a NetworkHD 500 design and Dante is part of the wider system conversation, not a separate bolt-on. Bring it in when the project is already leaning toward routed AV plus networked audio. Before quote, confirm system series, Dante expectations, control path and who owns the network design.",
  "NHD-500-E":
    "Lead with endpoint scale: NHD-500-E is the WyreStorm path when the customer needs a broader 500-series AVoIP architecture and the sale is about system flexibility, not a single transmitter or receiver in isolation. Bring it in when the project needs repeatable endpoint expansion across rooms or displays. Before quote, confirm endpoint roles, controller design, network readiness and what the customer expects to scale over time.",
  "NHD-500-E-RX":
    "Lead with the destination role: NHD-500-E-RX is the WyreStorm path when a display endpoint has to receive content from a managed NetworkHD 500 system with a clean, supportable install. Bring it in when the architecture is already 1GbE AVoIP and the question is how each endpoint is landed properly. Before quote, confirm matching series, display requirements, controller ownership and switch design.",
  "NHD-500-E-TX":
    "Lead with bringing sources onto the network: NHD-500-E-TX is the WyreStorm path when a local HDMI source has to become part of a 500-series NetworkHD design rather than stay in a local switcher or matrix. Bring it in when distribution flexibility and future routing matter. Before quote, confirm source type, matching series, controller requirement and network readiness.",
  "NHD-500-IW-TX":
    "Lead with the in-wall use case: NHD-500-IW-TX is the WyreStorm path when the customer needs a local wall-plate source input to join a NetworkHD 500 system cleanly in a room-facing position. Bring it in for lecterns, classrooms and presentation spaces where the source entry point matters as much as the wider AVoIP backbone. Before quote, confirm wall location, source expectations, matching series and controller/network ownership.",
  "NHD-500-IW-TX-V2":
    "Lead with room entry workflow: NHD-500-IW-TX-V2 is the WyreStorm path when a user-facing in-wall source point has to feed an existing or planned NetworkHD 500 system without adding loose boxes at the table. Bring it in when the rep needs to explain how local room inputs join the wider AVoIP design. Before quote, confirm source format, wall position, matching series and how the room is controlled day to day.",
  "NHD-500-T":
    "Lead with source transmission: NHD-500-T is the WyreStorm path when a local source must be encoded into the NetworkHD 500 platform as part of a scalable routed AV design. Bring it in when the customer is asking for system flexibility, not just local switching. Before quote, confirm source role, endpoint count, controller design and network ownership.",
  "NHD-500-TXRX-V2":
    "Lead with flexibility at the endpoint: NHD-500-TXRX-V2 is the WyreStorm path when the design benefits from endpoints that can be assigned around the system instead of locking every location into a single fixed role. Bring it in when the project needs 500-series AVoIP plus practical deployment flexibility. Before quote, confirm endpoint role planning, control path, switch design and how the customer expects the system to grow.",
  "NHD-500-RX":
    "Lead with the display endpoint role: NHD-500-RX is the WyreStorm path when a display location needs to receive content from a managed NetworkHD 500 system, not from a direct local feed. Bring it in when the distribution architecture is already AVoIP and the question is how each screen is landed cleanly. Before quote, confirm system series, endpoint count, display requirements and controller/network ownership.",
  "NHD-600-E-RX":
    "Lead with premium display distribution: NHD-600-E-RX is the WyreStorm path when a display endpoint has to receive content from a higher-performance 10G NetworkHD system where image quality and latency expectations are already part of the brief. Bring it in when the project has clearly moved beyond fixed matrix thinking. Before quote, confirm matching 600-series design, display requirements, switch capacity and controller ownership.",
  "NHD-600-E-TX":
    "Lead with premium source onboarding: NHD-600-E-TX is the WyreStorm path when local content has to join a 10G NetworkHD system built for higher-performance distribution. Bring it in when the customer wants premium AVoIP and the source side cannot be treated as an afterthought. Before quote, confirm source format, 10GbE readiness, controller path and overall system scale.",
  "NHD-600-E-TXRX":
    "Lead with deployment flexibility at 10G: NHD-600-E-TXRX is the WyreStorm path when the project needs a premium NetworkHD endpoint that can be assigned around the design rather than fixed too early. Bring it in when the AVoIP architecture is already justified and the customer needs cleaner planning flexibility. Before quote, confirm endpoint role, switch design, controller requirement and whether the performance tier is truly needed.",
  "NHD-600-RX":
    "Lead with the output landing point: NHD-600-RX is the WyreStorm path when a display location needs the benefits of a 10G NetworkHD system rather than a simpler local receiver or 1GbE endpoint. Bring it in when premium distributed AV is already the chosen architecture. Before quote, confirm matching series, display expectations, control path and network ownership.",
  "NHD-600-TRX":
    "Lead with the reason for 10G: NHD-600-TRX is the WyreStorm path when the customer is not just asking for distribution, but for higher-performance AVoIP where image quality, latency and system scale justify stepping above simpler options. Bring it in for premium distributed AV where the network architecture is part of the design from day one. Before quote, confirm 10GbE readiness, endpoint count, control path and whether the project truly needs this tier over matrix or 1GbE AVoIP.",
  "NHD-600-TRXF":
    "Lead with premium endpoint flexibility: NHD-600-TRXF is the WyreStorm path when the 10G NetworkHD design needs flexible endpoint assignment without backing away from the premium performance tier. Bring it in when the customer wants high-end distributed AV and the deployment plan benefits from assignable endpoint roles. Before quote, confirm endpoint planning, switch design, controller ownership and whether the project truly needs 10G AVoIP.",
  "NHD-600-TX":
    "Lead with premium source transport: NHD-600-TX is the WyreStorm path when a source has to enter a 10G NetworkHD system built for higher image-quality and lower-latency distribution. Bring it in when the system architecture is already premium AVoIP and the source path has to match. Before quote, confirm source role, matching 600-series design, network readiness and controller path.",
  "NHD-610-TX":
    "Lead with specialist source entry: NHD-610-TX is the WyreStorm path when a local source must join a 10G NetworkHD design and the sale is about system performance, not just signal conversion. Bring it in when the customer has already accepted premium distributed AV as the right architecture. Before quote, confirm source expectations, 10GbE environment, control path and wider endpoint plan.",
  "NHD-510-TX":
    "Lead with source onboarding: NHD-510-TX is the WyreStorm path when a local source has to be brought into an existing or planned NetworkHD 500 system cleanly and repeatably. Bring it in when the architecture is already AVoIP and the rep needs to explain how room sources join the wider distribution platform. Before quote, confirm the matching NetworkHD series, source format, control expectations and network ownership.",
  "MX-1007-HYB":
    "Lead with the room workflow, not the box count: MX-1007-HYB is the WyreStorm path when a teaching or hybrid room needs switching, USB workflow, display routing and room integration to behave as one joined-up system. Bring it in when the customer wants fewer workarounds between presentation, conferencing and in-room AV. Before quote, confirm source mix, USB device ownership, display count, audio expectations and how the user is expected to run the room.",
  "MX-0402-MST":
    "Lead with contained room needs: MX-0402-MST is the WyreStorm path when the customer has a modest number of sources and outputs but still needs the room to feel professionally switched rather than improvised. Bring it in for smaller meeting or presentation spaces where a full matrix or AVoIP design would be unnecessary. Before quote, confirm true source/output count, control expectations, audio needs and whether the workflow is still simple enough for this tier.",
  "MX-0403-H3-MST":
    "Lead with small-room completeness: MX-0403-H3-MST is the WyreStorm path when the room needs a compact but credible switching core with the right local presentation workflow, not just a cheap HDMI selector. Bring it in when the job is still contained but the user experience matters. Before quote, confirm source count, output expectation, user connection method and whether USB, audio or control needs are pushing the room into a different family.",
  "SW-620-TX-W":
    "Lead with easier presenting: SW-620-TX-W is the WyreStorm path when the customer wants wired and wireless sharing in one presentation-room workflow without drifting into a more complex room system than they need. Bring it in when guest laptops, BYOD use and day-to-day ease of connection are part of the sale. Before quote, confirm wireless policy, USB/conferencing expectations, display outputs and whether the room needs a certified UC path instead.",
  "SW-120-TX3-UK":
    "Lead with tidy room presentation: SW-120-TX3-UK is the WyreStorm path when the customer needs a clean presentation input point at the table or wall and the goal is to make connecting simple every day. Bring it in when the room does not need a larger switching architecture, but the user still needs a professional connection experience. Before quote, confirm connection types, room workflow, downstream display path and whether the user-facing input point is in the right place.",
  "SW-130-TX-UK":
    "Lead with user connection simplicity: SW-130-TX-UK is the WyreStorm path when the room needs a straightforward in-room presentation handoff and the sale depends on making laptop connection feel obvious. Bring it in when the customer wants fewer adapters and less confusion at the table. Before quote, confirm expected source devices, downstream system family, cable path and whether the room also needs switching, USB or wireless presentation.",
  "SW-0206-VW":
    "Lead with wall architecture: SW-0206-VW is the WyreStorm path when the requirement is a dedicated video-wall processor and the job does not need to be repositioned as a wider AVoIP distribution design. Bring it in when the wall layout is known and the customer needs a contained processing answer. Before quote, confirm wall layout, source count, output resolution, scaling expectations and the control experience around presets or layouts.",
  "MX-0808-KIT-V2":
    "Lead with contained multi-display routing: MX-0808-KIT-V2 is the WyreStorm path when the customer needs an 8x8 matrix shape with matched extension and a predictable system story, not a jump to AVoIP. Bring it in for hospitality, sports bar and head-end jobs where the source and display count is already understood. Before quote, confirm whether 8x8 is really enough, transport distances, control expectations and any future expansion pressure.",
  "EX-100-H2":
    "Lead with transport, not switching: EX-100-H2 is the WyreStorm path when the source and display are in different places and the job is to extend the signal cleanly, not redesign the room around a matrix. Bring it in when the system shape is point to point and reliability over distance is the main concern. Before quote, confirm cable route, resolution requirements, control pass-through and whether the path really is point to point.",
  "EX-100-KVM":
    "Lead with user control at distance: EX-100-KVM is the WyreStorm path when video is not the only thing that has to travel and the keyboard, mouse or USB-control workflow matters to the room. Bring it in when the operator or user needs to work with a remote device as if it were local. Before quote, confirm USB/KVM expectations, cable route, display path and whether the job also needs switching or routing.",
  "EX-100-USB3":
    "Lead with device ownership over distance: EX-100-USB3 is the WyreStorm path when high-value USB peripherals cannot stay beside the host and still need to behave reliably across the room. Bring it in when the workflow depends on remote cameras, storage or other USB devices rather than just extending video. Before quote, confirm USB device type, bandwidth, host/peripheral locations and whether the room also needs video or control transport.",
  "EX-35-8K":
    "Lead with the cable run problem: EX-35-8K is the WyreStorm path when the signal has to travel farther than a direct local connection supports, but the room still does not need switching or AVoIP. Bring it in when the rep needs a clean point-to-point transport answer around higher-spec source and display expectations. Before quote, confirm installed distance, cable quality, source/display capability and any USB or control dependency.",
  "EX-70-H2":
    "Lead with dependable extension: EX-70-H2 is the WyreStorm path when the signal path is straightforward but distance makes a direct HDMI run unrealistic. Bring it in when the customer needs a supportable transport answer instead of improvised cabling. Before quote, confirm cable route, display location, control pass-through and whether the room actually needs switching rather than extension.",
  "CAM-420-PTZ":
    "Lead with the shot requirement: CAM-420-PTZ is the WyreStorm path when the customer needs a controlled PTZ camera role in the room and the sale depends on framing, placement and output workflow, not just resolution. Bring it in for conferencing, teaching or presentation spaces where presets and controlled coverage matter. Before quote, confirm field of view, mounting position, output path, control method and whether the room needs a bridge workflow as well.",
  "CAM-0402-BRG":
    "Lead with workflow conversion: CAM-0402-BRG is the WyreStorm path when more than one camera or AV source has to land cleanly in a single conferencing, recording or capture workflow. Bring it in when the customer is trying to bridge AV signals into Teams, Zoom, lecture capture or streaming without a pile of adapters. Before quote, confirm source formats, camera count, audio path, output platform and whether NDI, USB or HDMI handoff is required.",
  "APO-VX20-UC":
    "Lead with ease of use: APO-VX20-UC is the WyreStorm path when the customer wants one clean small-room answer for camera, microphone and speaker audio instead of several separate decisions. Bring it in when the brief is 'make the room work for calls without overbuilding it'. Before quote, confirm room size, participant count, host workflow and whether wireless presentation or extra microphone coverage still needs to be added.",
  "APO-210-UC":
    "Lead with the call-quality problem: APO-210-UC is the WyreStorm path when the room needs better table pickup and speaker coverage, but the job still does not justify a full DSP audio design. Bring it in when people at the far end of the table are not being heard clearly. Before quote, confirm table layout, participant count, host path and whether the room has crossed into a larger audio-design requirement.",
  "APO-COM-MIC":
    "Lead with coverage, not features: APO-COM-MIC is the WyreStorm path when the main Apollo device is close to working but still not giving enough pickup across the table. Bring it in when the complaint is intelligibility on calls, not lack of video. Before quote, confirm Apollo compatibility, seating layout, cable path and whether one companion mic is enough.",
  "APO-DG2-PRO":
    "Lead with user experience: APO-DG2-PRO is the WyreStorm path when the room technically works but guest presentation still feels awkward. Bring it in when the customer wants faster wireless presentation and a cleaner BYOD flow instead of passing cables around the table. Before quote, confirm Apollo ecosystem fit, wireless policy and host laptop expectations.",
  "MX-0404-SCL":
    "Lead with architecture discipline: MX-0404-SCL is the WyreStorm path when the customer needs a contained 4x4 matrix and the right answer is fixed local routing, not AVoIP. Bring it in when the job is one rack, a known number of sources and displays, and the customer wants dependable switching without IT overhead. Before quote, confirm true I/O count, scaling expectations, HDCP/EDID behaviour and day-to-day control.",
  "MX-0808-H2A-MK2":
    "Lead with system shape: MX-0808-H2A-MK2 is the WyreStorm path when the customer needs a serious fixed-routing matrix but still does not need the complexity of networked distribution. Bring it in for hospitality, head-end and larger contained AV systems where the source and display counts are already understood. Before quote, confirm whether 8x8 is the true requirement, how far the displays are from the rack and what control experience staff need.",
  "NHD-CTL-PRO-V2":
    "Lead with ownership of the system: NHD-CTL-PRO-V2 is the WyreStorm path when the project has moved beyond buying endpoints and now needs routing control, presets and commissioning structure. Bring it in when the customer or integrator asks who is actually managing the NetworkHD system. Before quote, confirm series, endpoint count, control exposure, network responsibility and commissioning scope.",
  "NHD-USB-TRX":
    "Lead with USB ownership: NHD-USB-TRX is the WyreStorm path when the host PC and the USB devices cannot live in the same place, but the room still has to feel seamless to the user. Bring it in when the video path is solved but the camera, touch or keyboard/mouse path still is not. Before quote, confirm device type, bandwidth, host/peripheral locations and the wider control workflow.",
  "SW-220-TX-W":
    "Lead with right-sizing: SW-220-TX-W is the WyreStorm path when a smaller room needs a clean, professional presentation workflow without paying for a bigger switcher than the job requires. Bring it in when the customer wants a tidy source-selection experience instead of cable swapping. Before quote, confirm source mix, display path and whether USB or audio expectations push the room into a larger model.",
  "SW-640L-TX-W":
    "Lead with room workflow: SW-640L-TX-W is the WyreStorm path when the room needs more than basic switching and the sale depends on users connecting reliably every day. Bring it in when the customer wants a stronger presentation experience with the right mix of inputs, USB and downstream display handling. Before quote, confirm the real source mix, USB ownership, display path and whether audio or control should be attached at the same time.",
  "SYN-CTL-HUB":
    "Lead with reliability of the control chain: SYN-CTL-HUB is the WyreStorm path when the touch experience matters and the room needs the Synergy control layer to talk cleanly to the devices behind it. Bring it in when the room must feel simple to the user even though the AV logic is not simple underneath. Before quote, confirm device compatibility, network/power location and who is commissioning the control workflow.",
  "SYN-TOUCH10":
    "Lead with user confidence: SYN-TOUCH10 is the WyreStorm path when the customer wants one-button operation and does not want users learning the rack to run the room. Bring it in when ease of use matters as much as the signal path. Before quote, confirm exactly what the user must control, which WyreStorm devices are in scope and whether SYN-CTL-HUB is part of the chain.",
};

function cleanText(value) {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normaliseSku(value) {
  return cleanText(value).toUpperCase();
}

function firstText(values, fallback = "") {
  for (const value of values) {
    const text = cleanText(value);

    if (text) {
      return text;
    }
  }

  return fallback;
}

function uniqueItems(values, max = 5) {
  const seen = new Set();
  const output = [];

  values.forEach((value) => {
    const text = cleanText(value);

    if (!text) {
      return;
    }

    const key = text.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(text);
  });

  return output.slice(0, max);
}

function flatten(groups, max = 5) {
  return uniqueItems(groups.flatMap((group) => group || []), max);
}

function lowerFirst(value) {
  const text = cleanText(value);
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function joinChecks(values, limit = 3) {
  const items = uniqueItems(values, limit).map((item) => lowerFirst(item).replace(/\.$/, ""));

  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function stripLead(value, patterns) {
  let text = cleanText(value);

  patterns.forEach((pattern) => {
    text = text.replace(pattern, "");
  });

  return cleanText(text).replace(/\.$/, "");
}

function cleanJobText(value) {
  return stripLead(value, [/^the customer needs\s+/i, /^the salesperson needs to\s+/i]);
}

function cleanPositioningText(value) {
  return stripLead(value, [/^use this when\s+/i, /^use it when\s+/i]);
}

function cleanWyrestormFit(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (/gives the salesperson a clear wyrestorm option/i.test(text)) {
    return "It gives the rep a clear WyreStorm path instead of a generic substitute";
  }

  if (/keeps the discussion tied/i.test(text)) {
    return "It keeps the conversation tied to the room workflow and the checks that protect the quote";
  }

  if (/creates a route into companion products/i.test(text)) {
    return "It also opens sensible attach discussion once the main signal path is confirmed";
  }

  return `${lowerFirst(text).replace(/\.$/, "")}`;
}

function profileFor(product) {
  const sku = normaliseSku(product.sku);
  const text = `${sku} ${product.family || ""} ${product.category || ""} ${product.name || ""} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();

  // SKU-family prefixes are the governed identity: classify by the SKU prefix
  // BEFORE text heuristics, so stale helper copy or tags ("supporting
  // accessory", "USB 3.x", "NDI", an "AVoIP" mention inside a competitor
  // sentence) can never demote a hardware family to accessory/uc/networkhd.
  // This is the SW-0X01-8K call-card defect class.
  if (/^(CAB|CBL)-/.test(sku)) return "cable";
  if (/^(ACC|RMK|PSU|BRK|MNT)-/.test(sku)) return "accessory";
  if (sku.startsWith("AMP-")) return "audio";
  if (sku.startsWith("APO-")) return "uc";
  if (sku.startsWith("NHD-")) return "networkhd";
  if (sku === "NHD-0401-MV") return "multiview";
  if (sku.startsWith("SW-0204-VW") || sku.startsWith("SW-0206-VW")) return "videoWall";
  if (sku.startsWith("MX-") || sku.startsWith("MXV-")) return "matrix";
  if (sku.startsWith("SW-")) return "presentation";
  if (sku.startsWith("EX-") || sku.startsWith("TX-") || sku.startsWith("RX-")) return "extender";
  if (sku.includes("-BRG")) return "cameraBridge";
  if (sku.startsWith("CAM-")) return "camera";
  if (sku.startsWith("SYN-")) return "control";

  // Text heuristics only for SKUs without a governing family prefix.
  if (/\baccessory\b|\bmount\b|bracket/.test(text)) return "accessory";
  if (text.includes("amplifier")) return "audio";
  if (text.includes("usb") || /\buc\b/.test(text) || text.includes("byod") || text.includes("byom")) return "uc";
  if (text.includes("networkhd") || text.includes("av-over-ip") || text.includes("avoip")) return "networkhd";
  if (text.includes("multiview") || text.includes("multi-view")) return "multiview";
  if (text.includes("video wall") || text.includes("videowall")) return "videoWall";
  if (text.includes("matrix")) return "matrix";
  if (text.includes("presentation") || text.includes("switcher")) return "presentation";
  if (text.includes("hdbaset") || text.includes("extender")) return "extender";
  if (text.includes("bridge")) return "cameraBridge";
  if (text.includes("camera") || text.includes("ptz") || text.includes("ndi")) return "camera";
  if (text.includes("control") || text.includes("touch")) return "control";
  if (/\bcable\b|active optical|displayport|fibre/.test(text)) return "cable";
  if (text.includes("audio")) return "audio";

  return "general";
}

function buildPositioningTalkTrack(card) {
  const roomOutcome = cleanJobText(firstText([card.jobToBeDone, card.customerProblems?.[0]], ""));
  const positioning = cleanPositioningText(firstText([card.oneLinePositioning, card.salientPoint], ""));
  const wyrestormFit = cleanWyrestormFit(firstText(card.wyrestormFit, ""));
  const trigger = cleanText(firstText(card.listenForTriggers, ""));
  const checks = joinChecks([...(card.reviewGates || []), ...(card.technicalCheckQuestions || [])], 3);
  const attachReason = card.attachProducts?.[0]?.reason ? cleanText(card.attachProducts[0].reason).replace(/\.$/, "") : "";

  const sentences = [
    roomOutcome
      ? `Lead with the room outcome: ${roomOutcome}.`
      : `Lead with the job to be done, not the specification list.`,
    positioning
      ? `${card.sku} is the WyreStorm path when ${positioning}.`
      : `Use ${card.sku} when the room shape and signal path match the product role.`,
    wyrestormFit
      ? `${wyrestormFit}.`
      : "",
    trigger
      ? `Bring it in when the customer says, "${trigger}".`
      : "",
    attachReason
      ? `It can also open the next part of the sale once the main fit is clear: ${lowerFirst(attachReason)}.`
      : "",
    checks
      ? `Before you let it become quote-ready, check ${checks}.`
      : "",
  ].filter(Boolean);

  return sentences.join(" ");
}

function buildPositioningQuestions(card) {
  return flatten(
    [
      card.openingQuestions,
      card.qualificationQuestions,
      card.technicalCheckQuestions,
    ],
    5,
  );
}

function buildPositioningProofPoints(card) {
  return uniqueItems(
    [
      card.salientPoint,
      cleanJobText(firstText([card.jobToBeDone, card.customerProblems?.[0]], "")),
      cleanWyrestormFit(firstText(card.wyrestormFit, "")),
      firstText(card.reviewGates, ""),
      card.attachProducts[0]
        ? `Attach opportunity: ${card.attachProducts[0].reason}`
        : "",
    ],
    5,
  );
}

const PROFILE_COPY = {
  audio: {
    description: (sku) => `${sku} belongs in the room-audio part of the design. Use it when the conversation has moved beyond video switching and the customer needs proper speaker drive, zoning or audio integration.`,
    fit: "Use when the project needs installed room audio rather than relying on display speakers. Confirm speaker type, zone count, audio source path and whether DSP or networked audio is part of the design.",
    opening: (sku) => `${sku} is not a generic AV add-on. It matters when the room needs controlled, supportable audio with the right speaker load and integration path.`,
    questions: [
      "What speakers are being driven and how many zones are required?",
      "Is the speaker system Low Z, High Z / 70V / 100V, or mixed?",
      "What is feeding the amplifier: local analogue audio, DSP output, Dante/AES67 or HDMI audio breakout?",
      "Does the room need paging, GPIO, network control or preset recall?",
    ],
    proofPoints: [
      "Audio products should be selected around speaker load, zoning and integration, not just wattage headlines.",
      "If microphones, conferencing audio or room processing are involved, confirm the DSP path before quote.",
      "Network audio claims only matter when the audio design and commissioning scope support them.",
    ],
  },
  networkhd: {
    description: (sku) => `${sku} is part of a NetworkHD system conversation. Position it around routed AV architecture, endpoint role and network design rather than as a standalone box with interchangeable behaviour.`,
    fit: "Use when the project needs flexible routing, distributed endpoints or future expansion that would be awkward with a fixed local matrix. Confirm the NetworkHD series, controller, switch design and endpoint roles before quote.",
    opening: (sku) => `${sku} is a NetworkHD discussion, which means the real sale is the system architecture: source count, display count, endpoint role, controller and the AV network behind it.`,
    questions: [
      "Is this a new NetworkHD design or an addition to an existing system?",
      "Which NetworkHD series is already installed or being proposed?",
      "How many sources and displays need flexible routing?",
      "Are USB, multiview, video wall, NDI, Dante or low-latency requirements part of the brief?",
    ],
    proofPoints: [
      "NetworkHD recommendations need the correct series, controller and network design behind them.",
      "Do not treat different NetworkHD series as automatically interchangeable.",
      "AVoIP becomes the stronger commercial path when scale, distance or future growth matter more than a fixed local matrix size.",
    ],
  },
  multiview: {
    description: (sku) => `${sku} is for seeing several sources at once on a single output. Position it as a visibility or operator-view tool, not as a generic matrix or video-wall answer.`,
    fit: "Use when the customer needs preview, confidence monitoring or multiple live sources on one screen. Confirm source count, layout expectation and what the combined output is feeding.",
    opening: (sku) => `${sku} is the right conversation when one display needs several source windows at the same time, not just source switching.`,
    questions: [
      "How many sources must be visible at once?",
      "Is the output feeding a display, recorder, LED processor or monitoring position?",
      "Are fixed layouts enough, or does the user need live layout control?",
      "Is this standalone, or part of a wider NetworkHD workflow?",
    ],
    proofPoints: [
      "Multiview means multiple sources on one output canvas, not simply multiple outputs.",
      "The strongest sales angle is operator visibility, source preview or one-screen monitoring.",
      "Confirm layout behaviour before treating a multiview device as a complete video-wall answer.",
    ],
  },
  videoWall: {
    description: (sku) => `${sku} belongs in a video-wall conversation where the customer cares about how the image is composed across the wall, not just how sources switch.`,
    fit: "Use when the customer needs wall layouts, presets or wall processing behaviour that should be sold as a dedicated visual workflow. Confirm wall type, source count and layout expectations before quote.",
    opening: (sku) => `${sku} should be positioned around the wall behaviour the customer wants to show, not as a generic switcher with more outputs.`,
    questions: [
      "Is this an LCD wall, LED processor feed or another display canvas?",
      "How many sources need to appear on the wall?",
      "Do they need presets, full-canvas takeover or content split across zones?",
      "Is a dedicated wall processor cleaner than a larger AVoIP design for this job?",
    ],
    proofPoints: [
      "Video-wall requirements are about layout behaviour as much as source count.",
      "Confirm wall type and processor expectations before positioning the product.",
      "Do not blur the difference between wall processing, matrix routing and multiview.",
    ],
  },
  matrix: {
    description: (sku) => `${sku} is a fixed local routing conversation. Use it when several known sources need to feed several known displays and a contained matrix is commercially cleaner than AVoIP.`,
    fit: "Use when the source and display count is known, the architecture is local or head-end based, and the customer wants predictable routed outputs. Confirm independent outputs, cable distances and control expectations before quote.",
    opening: (sku) => `${sku} is strongest when the job really is a matrix job: a known number of local sources, a known number of local or HDBaseT-fed displays, and no need to oversell AVoIP.`,
    questions: [
      "How many source devices and display destinations are required now and later?",
      "Does each display need an independently routed source, or are any outputs mirrored?",
      "Are the outputs local HDMI, HDBaseT, or a mix?",
      "Is audio breakout, ARC/eARC, IR, RS-232 or IP control part of the requirement?",
    ],
    proofPoints: [
      "Matrix products sell best when the system shape is fixed and easy to explain.",
      "Mirrored, loop and local monitor outputs should not be counted as independent routed outputs.",
      "Check distance, receiver requirement and control method before confirming the matrix family.",
    ],
  },
  presentation: {
    description: (sku) => `${sku} is a room-workflow product. Position it around how users actually connect and present rather than reducing it to a feature list.`,
    fit: "Use when the customer needs a clean room presentation workflow with the right mix of HDMI, USB-C, wireless presentation or simple room control. Confirm the user connection method and room behaviour before quote.",
    opening: (sku) => `${sku} is worth discussing when the rep needs a practical answer for how people walk into the room, connect and present without friction.`,
    questions: [
      "How does the user connect: HDMI, USB-C, wireless or a mix?",
      "Is the room presentation-only, conferencing, or BYOD/BYOM?",
      "How many displays or outputs are required?",
      "Does the room need touch control, USB device switching or downstream extension?",
    ],
    proofPoints: [
      "Presentation products should be sold around the user workflow, not just connector count.",
      "The right answer depends on how users connect every day and what happens when they do.",
      "Check USB, wireless and conferencing expectations early so the room is not underspecified.",
    ],
  },
  uc: {
    description: (sku) => `${sku} belongs in the meeting-room workflow discussion. Position it around host device, USB path, camera/audio behaviour and how the room actually joins calls.`,
    fit: "Use when the room needs a reliable conferencing or BYOD/BYOM path, not just local video switching. Confirm host location, USB device path, room size and call workflow before quote.",
    opening: (sku) => `${sku} should be sold as part of the room meeting experience: what the user plugs into, what camera/audio they take over, and what still needs validation before quote.`,
    questions: [
      "Is the room BYOD, BYOM, room PC, Teams appliance or mixed use?",
      "Which camera, microphone, speakerphone or USB device needs to connect?",
      "Where are the host laptop or room PC and the room peripherals physically located?",
      "Is USB extension, switching or wireless presentation part of the workflow?",
    ],
    proofPoints: [
      "USB and UC products live or die on the host/peripheral path, not on headline features alone.",
      "Camera, microphone and speakerphone compatibility should be confirmed before recommendation.",
      "A strong UC recommendation explains the day-to-day room workflow, not just the SKU.",
    ],
  },
  extender: {
    description: (sku) => `${sku} solves a transport problem in the AV system. Position it around source location, display location, cable route and what else must travel with the signal.`,
    fit: "Use when the job needs point-to-point extension rather than switching or distributed routing. Confirm the cable route, required format, power method and any USB/control dependencies before quote.",
    opening: (sku) => `${sku} is the right conversation when the signal needs to get from here to there reliably, and the room does not actually need a matrix or AVoIP architecture.`,
    questions: [
      "Where are the source and display physically located?",
      "What is the real installed cable distance and cable quality?",
      "Does USB, control, Ethernet pass-through, ARC/eARC or audio breakout need to travel too?",
      "Is this definitely a point-to-point path, or is there really a switching/routing requirement?",
    ],
    proofPoints: [
      "Extenders should be sold around the transport job they solve, not just bandwidth headlines.",
      "Cable route quality and transmitter/receiver pairing matter as much as the nominal distance rating.",
      "If the project needs switching or independent routing, the rep should pause before leading with an extender.",
    ],
  },
  cameraBridge: {
    description: (sku) => `${sku} is a camera-bridge conversation, not a plain camera conversation. Its value is in turning multiple camera or source feeds into the output the meeting, streaming or capture platform can actually use.`,
    fit: "Use when the customer needs more than one camera or source to feed a conferencing, capture or streaming workflow. Confirm the required output format, control method and host platform before quote.",
    opening: (sku) => `${sku} matters when the room outgrows a single camera and the customer needs a clean way to bridge or combine feeds into one usable workflow.`,
    questions: [
      "How many cameras or source feeds need to be handled?",
      "Does the destination platform need USB, HDMI, NDI or another output path?",
      "Is this for Teams/Zoom, recording, streaming, lecture capture or mixed use?",
      "Who needs to control switching, composition or presets?",
    ],
    proofPoints: [
      "Bridge products should be sold around workflow conversion and source handling, not as if they were PTZ cameras.",
      "The output format and host platform matter more than generic feature headlines.",
      "Audio, operator control and platform limitations still need to be checked before quote.",
    ],
  },
  camera: {
    description: (sku) => `${sku} belongs in the camera workflow discussion. Position it around what needs to be captured, how the picture gets into the wider AV or UC system, and what control or framing the room requires.`,
    fit: "Use when the customer needs a defined camera role in the room or production workflow. Confirm output path, field of view, mounting position, control method and platform compatibility before quote.",
    opening: (sku) => `${sku} should be sold around the shot the customer needs, where the camera sits, and how that video reaches the meeting, recording or AV workflow.`,
    questions: [
      "What needs to be seen clearly: presenter, table, audience, whiteboard or stage?",
      "Where will the camera be mounted and what field of view is required?",
      "Does the workflow need USB, HDMI, NDI or another output path?",
      "Are PTZ control, presets, tracking, recording or bridging part of the requirement?",
    ],
    proofPoints: [
      "A good camera recommendation explains placement, framing and output workflow, not just resolution.",
      "USB, HDMI and NDI cameras solve different jobs and should not be treated as the same answer.",
      "If the room needs multiple feeds into one host, the rep should check whether a bridge product is the better lead.",
    ],
  },
  control: {
    description: (sku) => `${sku} is a control-layer product. Its value is making the wider AV system usable and repeatable rather than changing the signal path by itself.`,
    fit: "Use when the customer needs simpler room operation, repeatable presets or a touch/control interface tied to the chosen AV workflow. Confirm what devices are being controlled and who owns commissioning before quote.",
    opening: (sku) => `${sku} should be sold around what the user needs one button to do, not as a standalone technical gadget.`,
    questions: [
      "What should the user be able to control in one step?",
      "Which WyreStorm or third-party devices need to respond?",
      "Is this tied to a Synergy workflow, room preset or wider control system?",
      "Who will commission and maintain the control logic?",
    ],
    proofPoints: [
      "Control products are strongest when the room workflow and user actions are already understood.",
      "The rep should explain what becomes easier for the user, not just which protocol is supported.",
      "Commissioning ownership and device compatibility should be clear before quote.",
    ],
  },
  cable: {
    description: (sku) => `${sku} is a supporting signal-path item, not the main AV recommendation. Position it only after the devices, format and route are known.`,
    fit: "Use when the connection path is already defined and the cable needs to be checked against bandwidth, length and installation route. Confirm what it is connecting before quote.",
    opening: (sku) => `${sku} is part of completing the path between known devices; it should not be treated as the product that defines the system design.`,
    questions: [
      "Which two devices are being connected?",
      "What format, bandwidth and direction does the cable need to support?",
      "What is the installed route length and pulling method?",
      "Would an extender or another transport method be safer for this run?",
    ],
    proofPoints: [
      "Cables should be selected around the actual signal path and installation route, not on connector type alone.",
      "Long runs and high-bandwidth formats need validation before the cable is treated as safe to quote.",
      "A cable supports the chosen architecture; it should not replace the product recommendation.",
    ],
  },
  accessory: {
    description: (sku) => `${sku} is a supporting accessory. Position it only in relation to the main product or installation job it completes.`,
    fit: "Use when the parent product and the installation requirement are already known. Confirm compatibility, mounting, power or service need before quote.",
    opening: (sku) => `${sku} is an attach item, not the lead recommendation. Start by confirming which main product or installation detail it supports.`,
    questions: [
      "Which WyreStorm product is this accessory being used with?",
      "Is it required for installation, connection, power, mounting or service access?",
      "Is compatibility with the main product confirmed?",
      "Should it be attached only after the main product selection is settled?",
    ],
    proofPoints: [
      "Accessories should support a confirmed workflow rather than appear as the main solution.",
      "The key check is parent-product compatibility and practical installation need.",
      "Accessory items should not inherit unrelated system claims or architecture language.",
    ],
  },
  general: {
    description: (sku) => `${sku} should be explained by the role it plays in the AV system, the signal path it touches and the practical customer job it helps solve.`,
    fit: "Use only after the rep can explain where the product sits in the workflow and what must connect to it. Confirm dependencies before quote.",
    opening: (sku) => `${sku} is worth discussing when the rep can tie it to a real room or system job, not just a list of specifications.`,
    questions: [
      "What job is this product performing in the AV system?",
      "What connects to it on each side?",
      "What part of the customer workflow improves if this is included?",
      "What still needs checking before it is safe to quote?",
    ],
    proofPoints: [
      "A useful product discussion should explain system role, dependencies and fit rather than repeat marketing lines.",
      "If the product role is unclear, the rep should pause before recommending it.",
      "Quote safety depends on understanding what this item connects to and what it is replacing or enabling.",
    ],
  },
};

function buildNarrative(product) {
  const spec = normaliseProductRecord(
    {
      sku: product.sku,
      name: product.name,
      family: product.family,
      category: product.category,
      productType: product.category,
      description: firstText([product.description, product.name], product.name),
      features: Array.isArray(product.tags) ? product.tags : [],
    },
    0,
  );

  return spec ? buildProductNarrative(spec) : null;
}

function buildRepair(product) {
  const sku = normaliseSku(product.sku);
  const profile = profileFor(product);
  const profileCopy = PROFILE_COPY[profile] || PROFILE_COPY.general;
  const story = getProductStory(sku);
  const positioningCard = getBestProductPositioningCardForSku(sku);
  const commercialOverride = getProductCallCommercialOverride(sku);
  const preferProfileFallback =
    !positioningCard && new Set(["audio", "uc", "extender", "control", "cable", "accessory"]).has(profile);
  const narrative = buildNarrative(product);
  const positioningTalkTrack = positioningCard ? buildPositioningTalkTrack(positioningCard) : "";
  const positioningQuestions = positioningCard ? buildPositioningQuestions(positioningCard) : [];
  const positioningProofPoints = positioningCard ? buildPositioningProofPoints(positioningCard) : [];
  const storyProof = story
    ? [
        ...story.keyFeatures,
        ...productStoryRelatedText(story),
        ...story.quoteChecks,
      ]
    : [];
  const descriptionSources = preferProfileFallback
    ? [story?.whatItIs, positioningCard?.oneMinuteBrief, profileCopy.description(sku), narrative?.whatItIs, product.description]
    : [story?.whatItIs, positioningCard?.oneMinuteBrief, narrative?.whatItIs, profileCopy.description(sku), product.description];
  const fitSources = preferProfileFallback
    ? [story?.whatItDoes, positioningCard?.oneLinePositioning, profileCopy.fit, narrative?.whyItHelps, product.fit]
    : [story?.whatItDoes, positioningCard?.oneLinePositioning, narrative?.whyItHelps, profileCopy.fit, product.fit];
  const openingSources = preferProfileFallback
    ? [story?.oneLinePosition, story?.salesTalkTrack, positioningCard?.followUpWording, positioningCard?.oneMinuteBrief, profileCopy.opening(sku), narrative?.suggestedWording, product.openingLine]
    : [story?.oneLinePosition, story?.salesTalkTrack, positioningTalkTrack, positioningCard?.followUpWording, positioningCard?.oneMinuteBrief, narrative?.suggestedWording, profileCopy.opening(sku), product.openingLine];
  const questionSources = preferProfileFallback
    ? [commercialOverride?.askNext, commercialOverride?.conversationStarters, story?.discoveryQuestions, positioningCard?.openingQuestions, positioningCard?.qualificationQuestions, profileCopy.questions, narrative?.askNow, product.questions]
    : [commercialOverride?.askNext, commercialOverride?.conversationStarters, story?.discoveryQuestions, positioningQuestions, narrative?.askNow, profileCopy.questions, product.questions];
  const proofSources = preferProfileFallback
    ? [
        storyProof,
        positioningCard
          ? [positioningCard.salientPoint, ...positioningCard.wyrestormFit, ...positioningCard.reviewGates]
          : undefined,
        profileCopy.proofPoints,
        product.proofPoints,
      ]
    : [
        storyProof,
        positioningProofPoints,
        product.proofPoints,
        profileCopy.proofPoints,
      ];

  const description = firstText(descriptionSources, profileCopy.description(sku));
  const fit = firstText(fitSources, profileCopy.fit);
  const openingLine = story
    ? firstText([story.oneLinePosition, story.salesTalkTrack, positioningTalkTrack, ...openingSources], profileCopy.opening(sku))
    : positioningCard
      ? positioningTalkTrack
      : firstText(openingSources, profileCopy.opening(sku));
  const questions = story
    ? flatten([story.discoveryQuestions, ...questionSources], 5)
    : positioningCard
      ? flatten([commercialOverride?.askNext, commercialOverride?.conversationStarters, positioningQuestions], 5)
      : flatten(questionSources, 5);
  const proofPoints = story
    ? flatten([storyProof, positioningProofPoints, ...proofSources], 5)
    : positioningCard
      ? positioningProofPoints
      : flatten(proofSources, 5);
  const overriddenOpeningLine = TOP_SKU_TALK_TRACK_OVERRIDES[sku] || openingLine;
  const existingObjectionHandling = Array.isArray(product.objectionHandling)
    ? product.objectionHandling.filter((item) => typeof item === "string")
    : [];
  const followUp = firstText(
    [
      commercialOverride?.followUp,
      positioningCard?.followUpWording,
      story?.salesTalkTrack,
      narrative?.suggestedWording,
      product.followUp,
    ],
    product.followUp,
  );
  const objectionHandling = flatten([commercialOverride?.objections, existingObjectionHandling], 3);

  const source =
    story ? "story" :
    positioningCard ? "positioning-card" :
    preferProfileFallback ? "profile-fallback" :
    narrative ? "narrative" :
    "profile-fallback";

  return {
    product: {
      ...product,
      description,
      fit,
      openingLine: overriddenOpeningLine,
      questions,
      followUp,
      objectionHandling,
      proofPoints,
      copyRefreshStatus: "practical-sales-copy-refreshed",
      copyRefreshSource: source,
      copyRefreshProfile: profile,
      copyRefreshRule:
        "Product helper text must explain role, workflow, dependencies and quote checks in practical sales-engineer language.",
    },
    audit: {
      sku,
      profile,
      source,
      before: {
        description: cleanText(product.description),
        fit: cleanText(product.fit),
        openingLine: cleanText(product.openingLine),
        questions: Array.isArray(product.questions) ? product.questions : [],
        followUp: cleanText(product.followUp),
        objectionHandling: existingObjectionHandling,
      },
      after: {
        description,
        fit,
        openingLine: overriddenOpeningLine,
        questions,
        followUp,
        objectionHandling,
      },
    },
  };
}

const raw = await fs.readFile(jsonPath, "utf8");
const payload = JSON.parse(raw);
const products = Array.isArray(payload) ? payload : Array.isArray(payload.products) ? payload.products : [];

const skuFilterArg = process.argv.find((arg) => arg.startsWith("--skus="));
const skuFilter = skuFilterArg
  ? new Set(skuFilterArg.slice("--skus=".length).split(",").map((sku) => normaliseSku(sku)).filter(Boolean))
  : null;
const scopedProducts = skuFilter ? products.filter((product) => skuFilter.has(normaliseSku(product.sku))) : products;

if (scopedProducts.length === 0) {
  throw new Error(skuFilter ? "No call-card records matched the --skus filter." : "No products found in product-call-card-products.json");
}

if (skuFilter && scopedProducts.length !== skuFilter.size) {
  const missing = [...skuFilter].filter((sku) => !scopedProducts.some((product) => normaliseSku(product.sku) === sku));
  console.warn(`[call-card-repair] --skus filter: ${scopedProducts.length} matched, ${missing.length} SKUs had no record: ${missing.join(", ")}`);
}

const audit = [];
const sourceCounts = {
  story: 0,
  "positioning-card": 0,
  narrative: 0,
  "profile-fallback": 0,
};

const repairedProducts = scopedProducts.map((product) => {
  const repaired = buildRepair(product);
  audit.push(repaired.audit);
  sourceCounts[repaired.audit.source] += 1;
  return repaired.product;
});

const repairedBySku = new Map(repairedProducts.map((product) => [normaliseSku(product.sku), product]));
// Merge repaired records back into the full list so a scoped run only touches
// the requested SKUs and never drops the rest of the catalogue.
const fullProducts = skuFilter
  ? products.map((product) => repairedBySku.get(normaliseSku(product.sku)) ?? product)
  : repairedProducts;

const output = Array.isArray(payload)
  ? fullProducts
  : {
      ...payload,
      practicalCopyRepairGeneratedAt: new Date().toISOString(),
      practicalCopyRepairRule:
        "Product helper text must explain role, workflow, dependencies and quote checks in practical sales-engineer language.",
      products: fullProducts,
    };

await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
await fs.writeFile(
  auditPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repairedCount: repairedProducts.length,
      sourceCounts,
      audit,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Refreshed practical copy for ${repairedProducts.length} product call-card records.`);
console.log(JSON.stringify(sourceCounts, null, 2));
console.log(auditPath);
