#!/usr/bin/env node
// Batch 2 of the template-SKU technical profile backlog.
//
// Same provenance rules as batch 1: every figure below is transcribed from the
// "Technical Specifications" table on the official WyreStorm product page, read
// in a real browser on 2026-07-24. All are status "review-required" with an
// evidence record that says plainly they are machine-transcribed and NOT
// human-verified, so they do not count toward verified coverage.
//
// NHD-500-RX is included this time. Batch 1 recorded it as blocked because
// /product/nhd-500-rx/ returns 404. It is documented on a combined encoder and
// decoder page, /product/nhd-500-tx-rx-v2/, found via the NHD 500 series
// category listing. That page's spec table separates TX and RX rows, so the RX
// figures below are the RX column only.
//
// REVISION QUESTION FOR THE REVIEWER: the official page is titled and labelled
// "NHD-500-TX/RX v2". The request that unblocked this described the product as
// "NHD-500-RX v3". Either the site has not been updated, or a v3 exists that is
// not published yet. products.csv and lifecycle.csv both carry a plain
// "NHD-500-RX" with no revision suffix and mark it active. Confirm which
// revision the templates should be quoting before promoting this profile.

import fs from "node:fs";
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
    sku: "NHD-500-RX",
    status: "review-required",
    productClass: "AVOIP",
    role: "NetworkHD 500 series decoder",
    productType: "NetworkHD 500 Series 4K60 4:4:4 JPEG2000 decoder",
    transport: ["1GbE AV network", "JPEG 2000 encoding"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "S/PDIF (Toslink)", direction: "input", category: "audio", detail: "RX audio input" },
      { count: 1, connector: "HDMI 2.0b", direction: "output", category: "video", detail: "RX HDMI output" },
      { count: 1, connector: "5-pin balanced", direction: "output", category: "audio", detail: "RX balanced analog audio output" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1x 1GbE 8-pin RJ45" },
      { count: 1, connector: "SFP", direction: "bidirectional", category: "network", detail: "1x 1Gb SFP - 1000Base-SX 550m OM3 MMF, 1000Base-LX 5km SMF, 1000Base-LX10 10km SMF" },
      { count: 2, connector: "USB HID Type A", direction: "input", category: "usb", detail: "RX USB HID" },
      { count: 2, connector: "USB 2.0 Type A", direction: "bidirectional", category: "usb", detail: "RX USB 2.0, up to 200Mbps upstream" },
      { count: 1, connector: "3.5mm TS", direction: "output", category: "control", detail: "IR TX, API programmable" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "control", detail: "IR RX, API programmable" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, 2-way, API programmable" },
    ],
    video: [
      "5120x2160p @50/60Hz 4:2:0 CVT",
      "5120x1440p @50/60Hz 4:2:0 CVT",
      "4096x2160p @60Hz 8bit 4:4:4 or RGB",
      "3840x2160p @60Hz 12bit 4:2:2 Dolby Vision/HDR/HLG",
      "1920x1080p @60Hz 12bit",
    ],
    audio: [
      "Passthrough: 2ch PCM and up to DTS:X and Dolby Atmos",
      "ARC: 2ch PCM and up to Dolby Digital+ and DTS 5.1",
      "Dante/AES67: 2ch PCM",
    ],
    usb: ["2x USB HID Type A", "2x USB 2.0 Type A (up to 200Mbps upstream)"],
    network: ["1x 1GbE RJ45", "1x 1Gb SFP (MMF/SMF options)"],
    control: ["RS-232 (3-pin Phoenix, 2-way)", "IR TX/RX", "AES 256 | SSH | HTTPS"],
    power: ["12V DC 1A | 802.3at PoE+ compliant"],
    physical: ["Ships with rack and wall brackets"],
    maxResolution: "4096x2160p @60Hz 8bit 4:4:4 or RGB",
    latency: "4ms video latency in pass-through mode; 1-2 video frames in scaler/video-wall mode",
    chroma: "4:4:4 at 4096x2160p @60Hz; the 5120-wide modes are 4:2:0 CVT",
    dependencies: [
      "Requires a 1GbE managed AV network with multicast configured",
      "Requires a NetworkHD controller (NHD-CTL-PRO-V2) for configuration and control",
      "Pairs with NHD-500 series encoders - do not mix with 600 series 10G endpoints in one transport design",
    ],
    compatibleFamilies: ["NetworkHD 500"],
    features: { jpeg2000: true, poePlus: true, sfp: true, usbRouting: true, arc: true, dante: true },
    specs: { hdmiOutputs: 1, networkSpeedGbps: 1, usbTotalPorts: 4, externalPsu: true },
    checks: [
      "Confirm the switch supports the required multicast configuration for NetworkHD 500.",
      "The 5120-wide resolutions are 4:2:0 CVT, not 4:4:4. Confirm before quoting against an ultra-wide 4:4:4 requirement.",
      "Confirm whether the SFP or the RJ45 network path is being used; the SFP options determine the fibre type and distance.",
    ],
    warnings: [
      "Documented on a combined encoder/decoder page labelled 'NHD-500-TX/RX v2'. The revision the templates should quote needs confirming - see the note at the top of the drafting script.",
      "Encoding is JPEG 2000 at up to 850Mbps, which is visually lossless but not mathematically lossless. Do not present it as uncompressed.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-500-tx-rx-v2/", "Technical Specifications table, RX column: Audio & Video, Communication & Control, Power."),
  },
  {
    sku: "SYN-TOUCH10-V2",
    status: "review-required",
    productClass: "CONTROL",
    role: "Room control touch panel",
    productType: "Synergy 10.1 inch all-in-one touchpad controller",
    transport: ["1GbE network control"],
    inputCount: 0,
    outputCount: 0,
    ports: [
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1GbE, 802.3at PoE+" },
      { count: 1, connector: "USB 3.0 Type-A", direction: "bidirectional", category: "usb", detail: "For transferring system configuration" },
      { count: 1, connector: "MicroSD", direction: "bidirectional", category: "storage", detail: "For transferring system configuration" },
    ],
    video: ["10.1 inch LCD, 1280x800, 16:10"],
    audio: [],
    usb: ["1x USB 3.0 Type-A (configuration transfer)", "Micro USB port documented as reserved"],
    network: ["1x 1GbE with 802.3at PoE+"],
    control: ["10-point capacitive touch", "Android 10.0"],
    power: ["12V 1.5A DC | 802.3at PoE+"],
    physical: [
      "259mm x 178mm x 28mm",
      "218mm high with the table stand",
      "0.94kg",
      "VESA 75x75mm mounting",
      "280 nits, 1500:1 contrast, 85 degree viewing angle",
    ],
    maxResolution: "1280x800 (panel resolution, not a video input)",
    dependencies: [
      "Requires the Synergy control ecosystem or a compatible WyreStorm system to control - it is a control surface, not a standalone device",
      "Requires PoE+ or a local 12V supply",
    ],
    compatibleFamilies: ["Synergy", "NetworkHD"],
    features: { touchPanel: true, poePlus: true, vesaMount: true, android: true },
    specs: { networkPorts: 1, usbTotalPorts: 1, externalPsu: true },
    checks: [
      "This replaces the discontinued do-not-spec SYN-TOUCH10. Confirm no design or quote still references the old SKU.",
      "Confirm whether the room uses PoE+ or needs the local PSU; 802.3af is not sufficient.",
      "Confirm what it is controlling - the panel does not itself switch or route AV.",
    ],
    warnings: [
      "The panel has no video input. It is a control surface and must not be quoted as a display or a source.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/syn-touch10-v2/", "Technical Specifications table: System, Display, Interface, Power & Environmental."),
  },
  {
    sku: "CAM-420-PTZ",
    status: "review-required",
    productClass: "CAMERA",
    role: "Dual-lens AI PTZ conferencing camera",
    productType: "4K dual-lens AI PTZ camera with auto framing and speaker tracking",
    transport: ["USB-C (UVC)", "HDMI", "NDI over IP"],
    inputCount: 0,
    outputCount: 3,
    ports: [
      { count: 1, connector: "USB-C", direction: "output", category: "usb", detail: "USB 3.1 Gen, max 5.0Gbps, backward compatible with USB 2.0" },
      { count: 1, connector: "USB-A", direction: "bidirectional", category: "usb", detail: "USB 2.0, max 480Mbps, for USB peripheral expansion" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "HDMI output" },
      { count: 1, connector: "RJ45", direction: "output", category: "network", detail: "LAN, Web UI and API, carries the NDI output" },
    ],
    video: ["4K@30fps maximum", "MJPEG default; H265/H264/NV12 for the NDI stream", "Built-in picture-in-picture showing speaker and presenter simultaneously"],
    audio: ["4x MEMS mic array, 5m pickup range - for voice detection and audio tracking only"],
    usb: ["1x USB-C (UVC 1.1)", "1x USB-A 2.0 for peripheral expansion"],
    network: ["1x RJ45 LAN, Web UI and API, NDI output"],
    control: ["Web UI", "RCU remote", "Third-party control app"],
    power: ["12V DC 3A", "Max 11W"],
    physical: [
      "AI lens: 8MP, 3x optical zoom, 110 degree DFOV",
      "Panoramic lens: 2MP, 120 degree DFOV",
      "Rotation horizontal +/-75 degrees, vertical +/-45 degrees",
    ],
    maxResolution: "4K @30fps",
    dependencies: [
      "A separate conference audio source is required - the built-in mic array cannot be used as the conference microphone",
      "Confirm the conferencing platform accepts a UVC 1.1 camera at the required resolution",
    ],
    compatibleFamilies: ["USB conferencing", "NDI workflows"],
    features: { ptz: true, dualLens: true, aiTracking: true, ndi: true, uvc: true, pip: true },
    specs: { usbTotalPorts: 2, hdmiOutputs: 1, networkPorts: 1, externalPsu: true },
    checks: [
      "The 4x MEMS mic array is explicitly documented as unusable as a video conference audio source - it exists for voice detection and audio tracking. Always quote a separate conference microphone.",
      "Maximum is 4K@30fps, not 4K@60. Confirm against any 4K60 requirement.",
      "Rotation is +/-75 degrees horizontal, far less than a conventional PTZ. Confirm the coverage suits the room.",
    ],
    warnings: [
      "It is easy to assume the built-in mic array covers room audio. The datasheet states it cannot be used as a conference audio source. Quoting this camera as the room's microphone would be wrong.",
      "Pan range is limited compared with a traditional PTZ camera; this is a fixed dual-lens AI design, not a full-rotation PTZ.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/cam-420-ptz/", "Technical Specifications table: Video, Camera & Sensor, Audio, Communication & Control, Power."),
  },
  {
    sku: "AMP-260-DNT",
    status: "review-required",
    productClass: "AUDIO",
    role: "Dante network amplifier with DSP",
    productType: "Advanced 2 channel Dante amplifier",
    transport: ["Dante / AES67 audio network", "Local line-level analog"],
    inputCount: 3,
    outputCount: 5,
    ports: [
      { count: 1, connector: "Line In", direction: "input", category: "audio", detail: "Local analog line input" },
      { count: 2, connector: "Dante", direction: "input", category: "audio", detail: "Dante network audio inputs" },
      { count: 1, connector: "Line Out", direction: "output", category: "audio", detail: "Line-level loop-out for amplifier daisy-chaining" },
      { count: 2, connector: "Speaker terminals", direction: "output", category: "audio", detail: "Low impedance speaker outputs" },
      { count: 2, connector: "Dante", direction: "output", category: "audio", detail: "Dante network audio outputs" },
      { count: 2, connector: "RJ45", direction: "bidirectional", category: "network", detail: "2x 8-pin RJ45, 10/100Base-T, PoE+ 802.3at" },
    ],
    video: [],
    audio: ["Stereo or 2ch PCM", "Built-in DSP: five-band EQ, up to 200ms delay", "Independent volume and mute per channel"],
    usb: [],
    network: ["2x RJ45 10/100Base-T with PoE+ 802.3at", "Daisy-chainable"],
    control: ["Front panel buttons", "IO", "TCP/IP", "Web GUI", "CA SB-327 | TLS | HTTPS"],
    power: ["24V DC | 802.3at PoE+ compliant", "Max 120W with the power adapter, 25.5W with PoE+"],
    physical: ["Rack or ceiling mountable"],
    maxResolution: "",
    dependencies: [
      "Dante operation requires a suitable audio network and Dante Controller configuration",
      "Low impedance speaker outputs - confirm the speakers are low impedance, not 70V/100V line",
    ],
    compatibleFamilies: ["Dante / AES67 audio systems"],
    features: { dante: true, dsp: true, poePlus: true, daisyChain: true, aes67: true },
    specs: { danteInputs: 2, danteOutputs: 2, speakerOutputs: 2, networkPorts: 2, externalPsu: true },
    checks: [
      "Power output differs substantially between PSU and PoE+ operation (120W vs 25.5W). Confirm which is being used before promising output level.",
      "Speaker outputs are low impedance. Confirm the specified speakers are not 70V/100V line, which would need a different amplifier.",
      "Dante requires network configuration - confirm who owns the Dante domain and clock master on site.",
    ],
    warnings: [
      "The page title describes a '2 or 4 Channel Dante Amplifier' while the specification table lists 2 low-impedance speaker outputs. Confirm the channel count for this SKU before quoting.",
      "The power supply row reads '24V DC 5V', which appears to be a typo - the In the Box list and feature list both state a 24V 5A supply. Confirm with WyreStorm.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/amp-260-dnt/", "Technical Specifications table: Audio, Communication and Control, Power."),
  },
  {
    sku: "NHD-128-NDI-TRX",
    status: "review-required",
    productClass: "AVOIP",
    role: "NDI to NetworkHD gateway / transceiver",
    productType: "4K30 NDI to AV over IP gateway",
    transport: ["1GbE AV network", "NDI HX (NDI 6) over RUDP/TCP multicast", "NetworkHD H.264/H.265 over RTP/UDP multicast"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "RJ45", direction: "input", category: "network", detail: "Video input is a network stream - NHD or NDI" },
      { count: 1, connector: "RJ45", direction: "output", category: "network", detail: "Video output is a network stream - NHD or NDI" },
    ],
    video: [
      "NHD in/out: up to 4K@30Hz, up to 16Mbps",
      "NDI main stream in: up to 4K@30Hz, up to 16Mbps; out up to 20Mbps",
      "Preview stream in: up to 480p@60Hz; out CIF 360x240 @30Hz, up to 512Kbps",
    ],
    audio: [],
    usb: [],
    network: ["RJ45 for both stream input and output", "Multicast on both NHD and NDI paths"],
    control: ["Front panel LED screen", "Rear RESET button", "Web UI", "Telnet API", "NHD-CTL-PRO controller", "Telnet TLS and SSH"],
    power: ["20V DC 1A, PoE"],
    physical: ["1/8 rack width, wall or rack mountable", "ESD: +/-12kV air-gap, +/-8kV contact"],
    maxResolution: "4K @30Hz",
    dependencies: [
      "Documented compatible with NHD-100, NHD-120 and NHD-150 series only",
      "Requires a NetworkHD controller (NHD-CTL-PRO-V2) for system control",
      "Requires a multicast-capable 1GbE AV network",
    ],
    compatibleFamilies: ["NetworkHD 100", "NetworkHD 120", "NetworkHD 150", "NDI HX / NDI 6"],
    features: { ndi: true, gateway: true, poe: true, multicast: true, preview: true },
    specs: { networkPorts: 1, networkSpeedGbps: 1, externalPsu: true },
    checks: [
      "Compatibility is documented for the NHD-100, 120 and 150 series. It is NOT listed as compatible with the 500 or 600 series - confirm before designing it into a 500/600 system.",
      "Maximum is 4K@30Hz on both NDI and NHD paths. Confirm against any 4K60 requirement.",
      "This is a stream gateway with no HDMI connectors - it converts between NDI and NetworkHD on the network, and does not take a local source.",
    ],
    warnings: [
      "Has no HDMI ports at all. Both its input and output are network streams, so it cannot accept a local HDMI source or drive a display directly.",
      "The specification table states 20V DC 1A and PoE, while the feature list states PoE 802.3af. Confirm the required PoE class before relying on switch power.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-128-ndi-trx/", "Technical Specifications table: Technical, Power."),
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
fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`[draft] Added ${added.length} review-required profiles: ${added.join(", ")}`);
console.log("[draft] These do NOT count toward verified coverage. Promote after human review.");
