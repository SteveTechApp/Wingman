#!/usr/bin/env node
// One-off: adds drafted technical profiles for the first batch of template SKUs.
//
// PROVENANCE - read before promoting any of these.
//
// Each profile below was transcribed from the "Technical Specifications" table
// on the official WyreStorm product page, read in a real browser on 2026-07-24.
// The figures are copied from those tables, not inferred from marketing copy
// and not derived from the enrichment pipeline.
//
// They are all status "review-required" on purpose. A "verified" profile
// asserts that a person checked the specification, and nobody has. Under the
// corrected coverage rule these do NOT count toward verified coverage, so this
// batch deliberately does not move the ratchet - it removes the transcription
// work so a reviewer can check and promote rather than start from a blank page.
//
// To promote one: check it against the same product page, then change status to
// "verified" and replace the evidence record's reviewer with your own name.
//
// Known ambiguities found while transcribing, left for the reviewer:
//   - CAM-210-PTZ: spec table says 1/2.8in sensor, Additional Features says
//     1/2.7in. Transcribed the spec table; flagged in warnings.
//   - NHD-0401-MV: branded NetworkHD but has four local HDMI inputs and is not
//     an AVoIP endpoint. Flagged in checks, because treating it as an AVoIP
//     decoder in a design would be wrong.
//   - NHD-500-RX has no official product page (404) and no URL in products.csv,
//     so it is NOT in this batch despite being the second most used template
//     SKU. It needs a source before it can be drafted at all.

import fs from "node:fs";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const REVIEWED_ON = "2026-07-24";
const REVIEWER = "Wingman assisted draft (machine-transcribed from the official product page; NOT human-verified)";

function evidence(url, note) {
  return [{ sourceType: "official-product-page", sourceUrl: url, reviewedOn: REVIEWED_ON, reviewer: REVIEWER, note }];
}

const drafts = [
  {
    sku: "NHD-CTL-PRO-V2",
    status: "review-required",
    productClass: "AVOIP",
    role: "NetworkHD system controller",
    productType: "Pro Controller for NetworkHD Series",
    transport: ["1GbE control network", "1GbE AV network (separate interface)"],
    inputCount: 0,
    outputCount: 0,
    ports: [
      { count: 2, connector: "RJ45", direction: "bidirectional", category: "network", detail: "2x 1GbE RJ45 (Control & AV) - dual interfaces isolate multicast AV traffic from the managed IT network" },
      { count: 1, connector: "6-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232" },
    ],
    video: [],
    audio: [],
    usb: ["USB port present but the specification states it is reserved for future use"],
    network: ["2x 1GbE RJ45", "Dual network interfaces bridge AV and enterprise/control networks with complete isolation"],
    control: ["RS-232 (6-pin Phoenix)", "SSH | TLS | HTTPS", "Open NetworkHD API"],
    power: ["12V DC | PoE compliant", "Max 15.4W, average 8W"],
    physical: ["215mm x 120mm x 25mm", "Front LED screen showing IP addresses and software versions"],
    maxResolution: "",
    dependencies: [
      "Mandatory for NetworkHD system deployment - encoders and decoders are configured and controlled through it",
      "Stated compatible with all current NetworkHD series (the page carries an asterisk against this claim; confirm the specific series in the design)",
    ],
    compatibleFamilies: ["NetworkHD 100", "NetworkHD 400", "NetworkHD 500", "NetworkHD 600"],
    features: { dualNetwork: true, poe: true, api: true, webUi: true },
    specs: { networkPorts: 2, rs232Ports: 1, externalPsu: true },
    checks: [
      "Every NetworkHD design needs a controller - confirm exactly one is quoted per system.",
      "Confirm the AV and control network interfaces are cabled to the intended separate networks; the isolation is the point of the dual interface.",
      "HDMI and USB ports are documented as reserved for future use - do not quote them as usable connectivity.",
    ],
    warnings: [
      "The page states compatibility with 'all current NetworkHD series' with an asterisk and does not enumerate them. Confirm against the specific encoder/decoder series before issuing.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-ctl-pro-v2/", "Technical Specifications table: Communication and Control, Power, Environmental."),
  },
  {
    sku: "NHD-600-TRX",
    status: "review-required",
    productClass: "AVOIP",
    role: "SDVoE transceiver (encoder or decoder, software selectable)",
    productType: "NetworkHD 600 Series 4K60 4:4:4 10GbE SDVoE Transceiver",
    transport: ["10GbE SDVoE AV network"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "HDMI 2.0b", direction: "input", category: "video", detail: "1x HDMI 2.0b input" },
      { count: 1, connector: "HDMI 2.0b", direction: "output", category: "video", detail: "1x HDMI 2.0b output" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1x 10GbE 8-pin RJ45 - the SDVoE AV transport" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1x 1GbE LAN 8-pin RJ45 - control" },
      { count: 1, connector: "5-pin balanced", direction: "bidirectional", category: "audio", detail: "Configurable as input or output for a discrete audio stream or HDMI de-embedding" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, 2-way, broadcast, routed, API programmable" },
      { count: 3, connector: "USB 1.1 Type A", direction: "input", category: "usb", detail: "USB HID for keyboard and mouse extension" },
      { count: 1, connector: "USB 1.1 Type B", direction: "output", category: "usb", detail: "USB host" },
    ],
    video: [
      "5120x2160p @30Hz 4:4:4",
      "5120x1440p @30/45Hz 4:4:4",
      "4096x2160p @60Hz 8bit 4:4:4 or RGB",
      "3840x2160p @60Hz 12bit 4:2:2 Dolby Vision",
      "3840x2160p @60Hz 10bit 4:2:2 HDR10/HLG",
      "1920x1080p @60Hz 12bit",
    ],
    audio: ["High-bitrate multichannel passthrough including Dolby Atmos and DTS:X", "Balanced analog audio port configurable as input or output"],
    usb: ["3x USB 1.1 Type A (HID)", "1x USB 1.1 Type B host"],
    network: ["1x 10GbE RJ45 (SDVoE AV)", "1x 1GbE RJ45 (LAN/control)"],
    control: ["RS-232 (3-pin Phoenix)", "IR TX 3.5mm TS mono", "IR RX 3.5mm TRS stereo", "API programmable"],
    power: ["12V 2A DC PSU | 802.3at PoE+ compliant", "Max 24W, average 10W"],
    physical: [],
    maxResolution: "5120x2160p @30Hz 4:4:4",
    latency: "Genlock mode: uncompressed 30us, compressed <120us. Fast Switch mode: 1-2 video frames, approx 16.7-33.4ms @60fps.",
    chroma: "4:4:4 up to 4096x2160p @60Hz 8bit",
    dependencies: [
      "Requires a 10GbE SDVoE-capable managed AV network - it will not run on a 1GbE switch",
      "Requires a NetworkHD controller (NHD-CTL-PRO-V2) for configuration and control",
      "Never mix 600 series 10G with 1G NetworkHD series in the same transport design",
    ],
    compatibleFamilies: ["NetworkHD 600"],
    features: { sdvoe: true, transceiver: true, poePlus: true, usbHid: true, scaling: true, fastSwitch: true },
    specs: { hdmiInputs: 1, hdmiOutputs: 1, networkSpeedGbps: 10, usbTotalPorts: 4, externalPsu: true },
    checks: [
      "Confirm the network is 10GbE and SDVoE-capable before quoting 600 series.",
      "As a transceiver, each unit is either an encoder or a decoder - confirm the count of each role in the design, not just the total unit count.",
      "Encoding at 4K60 4:4:4 8bit is documented as using light compression; confirm this is acceptable where the customer has specified fully uncompressed.",
    ],
    warnings: [
      "The datasheet describes 4K60 4:4:4 8bit as '8.7Gbps (with light compression)'. Do not present this as uncompressed without qualification.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-600-trx/", "Technical Specifications table: Audio & Video, Communication & Control, Power."),
  },
  {
    sku: "NHD-0401-MV",
    status: "review-required",
    productClass: "MULTIVIEW",
    role: "4-input multiview processor and switcher",
    productType: "NetworkHD 4-Input 4K60 Multiview Switcher",
    transport: ["Local HDMI (not an AV-over-IP endpoint)"],
    inputCount: 4,
    outputCount: 1,
    ports: [
      { count: 4, connector: "HDMI", direction: "input", category: "video", detail: "4x HDMI in" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "1x HDMI out" },
      { count: 1, connector: "3.5mm TRS", direction: "output", category: "audio", detail: "Analog audio de-embed for third-party audio systems" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1x 1GbE RJ45" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232 (API control)" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "control", detail: "IR RX" },
    ],
    video: [
      "5120x2160@30Hz 4:4:4 (Ultra-Wide 5K)",
      "5120x1440@60Hz 4:4:4 (Super-Wide 5K)",
      "4096x2160@60Hz 4:4:4 (DCI 4K)",
      "3840x2160@60Hz 4:4:4 (UHD)",
      "1920x1080p @60Hz 12bit",
    ],
    audio: ["Analog audio de-embed via 3.5mm TRS"],
    usb: [],
    network: ["1x 1GbE RJ45", "Built-in web interface for standalone configuration"],
    control: ["RS-232 (3-pin Phoenix, API)", "IR RX", "Front panel buttons for input and layout switching", "Compatible with NetworkHD Touch"],
    power: ["12V 2A DC", "18W"],
    physical: [],
    maxResolution: "5120x2160@30Hz 4:4:4",
    dependencies: [
      "Sources connect over local HDMI - this is not a network AVoIP endpoint and does not decode a NetworkHD stream",
    ],
    compatibleFamilies: ["NetworkHD Touch"],
    features: { multiview: true, localHdmiInputs: true, audioDeEmbed: true, webUi: true, frontPanelControl: true },
    specs: { hdmiInputs: 4, hdmiOutputs: 1, networkSpeedGbps: 1, externalPsu: true },
    checks: [
      "Despite the NetworkHD branding this takes four LOCAL HDMI inputs. Do not design it as an AVoIP decoder or count it as a NetworkHD endpoint.",
      "Confirm all four sources can physically reach the unit over HDMI, or add extension.",
    ],
    warnings: [
      "The NetworkHD name makes this easy to mistake for an AVoIP multiview decoder. Its inputs are local HDMI.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-0401-mv/", "Technical Specifications table: Audio and Video, Communication and Control, Power."),
  },
  {
    sku: "RX-70-4K",
    status: "review-required",
    productClass: "HDBASET",
    role: "HDBaseT receiver",
    productType: "70m 4K HDBaseT Receiver",
    transport: ["HDBaseT over single Cat5e/6"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "RJ45", direction: "input", category: "video", detail: "1x HDBaseT 8-pin RJ-45 female" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "1x HDMI 19-pin type A female" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "10/100 Mbps auto-negotiating, bidirectional over HDBaseT" },
      { count: 1, connector: "3.5mm TS", direction: "output", category: "control", detail: "IR TX, bidirectional over HDBaseT" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "control", detail: "IR RX, bidirectional over HDBaseT" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, bidirectional over HDBaseT" },
    ],
    video: [
      "5120x1440 @60Hz 4:2:0",
      "5120x1440 @30Hz",
      "4096x2160p @60Hz 24bit 4:4:4",
      "3840x2160p @24Hz 4:2:0 HDR 10bit",
      "3840x2160p @30Hz 4:4:4 24bit",
      "1920x1080p @60Hz 48bit",
    ],
    audio: ["2ch PCM | up to DTS-X and Dolby Atmos", "Multichannel 7.1 DTS Master HD and Dolby True HD"],
    usb: [],
    network: ["1x RJ45 10/100 Mbps, bidirectional over HDBaseT"],
    control: ["Bidirectional IR", "RS-232", "Ethernet over HDBaseT"],
    power: ["12V DC 2A", "Max 7.2W", "PoH 48V 15.4W"],
    physical: [],
    maxResolution: "4096x2160p @60Hz 24bit 4:4:4",
    chroma: "4:4:4 at 4096x2160p @60Hz; 4K UHD @60Hz is not listed - the highest listed UHD modes are @24Hz 4:2:0 HDR and @30Hz 4:4:4",
    dependencies: [
      "Requires a compatible HDBaseT transmitter or a matrix with HDBaseT outputs - it is a receiver only",
      "Requires Cat5e or better; confirm the run is within the rated distance",
    ],
    compatibleFamilies: ["WyreStorm HDBaseT extenders", "WyreStorm HDBaseT-output matrices"],
    features: { hdbaset: true, poh: true, bidirectionalIr: true, ethernetOverHdbaset: true },
    specs: { hdmiOutputs: 1, hdbasetInputs: 1, maxPixelClockMhz: 297, externalPsu: true },
    checks: [
      "Confirm the source-side device actually has an HDBaseT output before quoting this receiver.",
      "3840x2160 @60Hz is NOT listed in the maximum resolution table. If the customer needs UHD 60Hz, confirm this receiver is suitable before issuing.",
      "Confirm whether PoH is being supplied from the transmitter or a local PSU is required.",
    ],
    warnings: [
      "The listed maxima do not include 3840x2160 @60Hz. Maximum pixel clock is 297MHz, which is consistent with that limit. Check carefully against any 4K60 requirement.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/rx-70-4k/", "Technical Specifications table: Audio & Video, Communication & Control, Power."),
  },
  {
    sku: "CAM-210-PTZ",
    status: "review-required",
    productClass: "CAMERA",
    role: "PTZ conferencing camera",
    productType: "1080p PTZ camera with 12x optical zoom",
    transport: ["USB 3.0 (UVC)", "IP network stream (H.265/MJPEG)", "Local HDMI output"],
    inputCount: 0,
    outputCount: 3,
    ports: [
      { count: 1, connector: "USB 3.0 Type C female", direction: "output", category: "usb", detail: "UVC 1.5, MJPEG/YUY2" },
      { count: 1, connector: "RJ45", direction: "output", category: "network", detail: "10M/100M adaptive Ethernet, H.265/MJPEG up to 2Mbps" },
      { count: 1, connector: "HDMI Type A female", direction: "output", category: "video", detail: "Passthrough to a local monitor" },
      { count: 1, connector: "8-pin Mini Din", direction: "bidirectional", category: "control", detail: "RS-232, max length 30m" },
    ],
    video: ["USB 3.0: 1920x1080p @60Hz", "Network: H.265/MJPEG, CBR or VBR up to 2Mbps", "Cat5e or higher: 1920x1080p @60Hz up to 100m/328ft"],
    audio: [],
    usb: ["1x USB 3.0 Type C, UVC 1.5, driverless"],
    network: ["1x RJ45 10/100, supports HTTP, RTSP, RTMP and multicast"],
    control: ["RS-232 (8-pin Mini Din)", "LAN", "Built-in IR receiver"],
    power: ["12V DC 2A | PoE 802.3af", "Max 18W"],
    physical: ["12x optical, 16x digital zoom", "Horizontal viewing angle 72.5 degrees, vertical 44.8 degrees"],
    maxResolution: "1920x1080p @60Hz",
    dependencies: [
      "USB 3.0 passive cable run is limited to 2m; 15m requires CAB-UAOC-15",
      "Confirm the conferencing platform accepts a UVC camera at the required resolution",
    ],
    compatibleFamilies: ["USB conferencing", "NDI/IP capture workflows"],
    features: { ptz: true, uvc: true, poe: true, hdmiPassthrough: true, opticalZoom12x: true },
    specs: { usbTotalPorts: 1, hdmiOutputs: 1, networkPorts: 1, externalPsu: true },
    checks: [
      "This is a 1080p camera, not 4K. Confirm before offering it against a 4K camera requirement.",
      "USB 3.0 over a passive cable is limited to 2m - quote CAB-UAOC-15 where the camera is more than 2m from the host.",
      "Confirm whether the customer needs USB, network stream, or HDMI output; the three are different integration paths.",
    ],
    warnings: [
      "The specification table states a 1/2.8 inch sensor while the Additional Features list on the same page states 1/2.7 inch. Confirm with WyreStorm before quoting the sensor size.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/cam-210-ptz/", "Technical Specifications table: Audio & Video, Camera & Sensor, Communication & Control, Power."),
  },
  {
    sku: "NHD-000-RACK4",
    status: "review-required",
    productClass: "ACCESSORY",
    role: "NetworkHD rack mount chassis",
    productType: "6U / 12 slot rack mount for NetworkHD 100/250/400/500/600 series",
    transport: ["Passive mechanical mounting - no signal path"],
    inputCount: 0,
    outputCount: 0,
    ports: [],
    video: [],
    audio: [],
    usb: [],
    network: [],
    control: [],
    power: ["Passive chassis - no power connection"],
    physical: [
      "6U",
      "483mm/19.02in wide with brackets, 440mm/17.33in without",
      "265.9mm/10.47in high",
      "188.3mm/7.42in deep with handles, 150mm/5.91in without",
      "2.3kg/5.06lbs chassis without plates",
      "12 slots",
    ],
    maxResolution: "",
    dependencies: [
      "Device mounting brackets are NOT included with the chassis - they ship in the box with each encoder/decoder/controller",
      "Includes 7 blanking plates; additional plates are a separate SKU (NHD-RACK4-BLK)",
    ],
    compatibleFamilies: ["NetworkHD 100", "NetworkHD 250", "NetworkHD 400", "NetworkHD 500", "NetworkHD 600"],
    features: { rackMount: true, passive: true, slots: 12 },
    specs: { rackUnits: 6, slots: 12, externalPsu: false },
    checks: [
      "Confirm the endpoint count fits 12 slots before quoting a single chassis.",
      "Do not assume mounting brackets are included with the chassis - they come with each device.",
      "Where fewer than 12 slots are used, confirm whether additional NHD-RACK4-BLK blanking plates are needed beyond the 7 included.",
    ],
    warnings: [],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-000-rack4/", "Technical Specifications table: Dimensions & Weight, plus the stated bracket and blanking-plate conditions."),
  },
];

const payload = JSON.parse(fs.readFileSync(target, "utf8"));
const existing = new Set(payload.profiles.map((p) => String(p.sku).toUpperCase()));
const added = [];

for (const draft of drafts) {
  if (existing.has(draft.sku.toUpperCase())) {
    console.log(`[draft] ${draft.sku} already has a profile - skipped, existing data left untouched.`);
    continue;
  }
  payload.profiles.push(draft);
  added.push(draft.sku);
}

payload.updatedAt = REVIEWED_ON;
atomicWriteJsonSync(target, payload);
console.log(`[draft] Added ${added.length} review-required profiles: ${added.join(", ")}`);
console.log("[draft] These do NOT count toward verified coverage. Promote after human review.");
