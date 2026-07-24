#!/usr/bin/env node
// Batch 3 of the template-SKU technical profile backlog.
//
// Same provenance rules as batches 1 and 2: every figure is transcribed from
// the "Technical Specifications" table on the official WyreStorm product page,
// read in a real browser on 2026-07-24. All status "review-required" with an
// evidence record that says plainly they are machine-transcribed and NOT
// human-verified, so they do not count toward verified coverage.
//
// DESIGN GAP FOUND WHILE TRANSCRIBING - see MX-0808-SCL below and the report.
// The "Local Pub - 8x8 Matrix TV Distribution" template contains exactly three
// SKUs: MX-0808-SCL, RX-70-4K and SYN-KEY10. MX-0808-SCL has HDMI outputs only
// (uncompressed 18Gbps, no HDBaseT), and its 4K60 modes are rated to 5m/16ft of
// HDMI cable. RX-70-4K is an HDBaseT receiver. There is no HDBaseT transmitter
// anywhere in that template, so the receiver has nothing to receive from and
// the remote TVs cannot be reached over HDMI at 4K60. Fixing it is a design
// decision - add HDBaseT transmitters on the matrix outputs, or move to a
// matrix with native HDBaseT outputs - so it is recorded, not silently changed.

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
    sku: "APO-VX20-UC-V2",
    status: "review-required",
    // productClass MUST be "UC", not "PRESENTATION". governedProductTechnicalData
    // has a dedicated UC lane and governedProductTechnicalData.test.ts asserts this
    // SKU resolves to it; a governed profile is highest precedence, so the wrong
    // class here silently pulls the product out of the UC lane and changes Compare.
    productClass: "UC",
    role: "UC room product",
    productType: "Apollo series conference video bar and switcher",
    transport: ["USB-C / USB 3.0 to host", "Local HDMI", "Wireless (802.11 a/b/g/n/ac)"],
    inputCount: 2,
    outputCount: 2,
    ports: [
      { count: 1, connector: "USB-C", direction: "input", category: "video", detail: "DP alt-mode video in, max 4K@30Hz; USB 3.0 host with 60W charging" },
      { count: 1, connector: "HDMI", direction: "input", category: "video", detail: "4K@30Hz max, HDCP 1.4" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "HDMI OUT 1: 4K@60Hz max, HDCP 2.3" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "HDMI OUT 2: 4K@30Hz max, HDCP 2.2" },
      { count: 1, connector: "USB-A", direction: "output", category: "usb", detail: "USB 3.0 device, 1.25A output" },
      { count: 1, connector: "USB-B", direction: "input", category: "usb", detail: "USB 3.0 host" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "Ethernet" },
    ],
    video: [
      "USB-C in: DP video, max 4K@30Hz",
      "HDMI in: 4K@30Hz max, HDCP 1.4",
      "HDMI out 1: 4K@60Hz max, HDCP 2.3",
      "HDMI out 2: 4K@30Hz max, HDCP 2.2",
      "Encoding: MJPEG/NV12/H.264/H.265, UVC 1.1",
    ],
    audio: [
      "8x linear microphone arrays with AEC, ANS and AGC, 8m/26.2ft pickup range",
      "2x 8W speakers",
      "Microphone range extendable with up to 5x APO-SKY-MIC",
    ],
    usb: ["USB-C host (60W charging)", "USB-A device (1.25A)", "USB-B host", "UAC, UVC, USB HID"],
    network: ["1x RJ45", "WLAN 802.11 a/b/g/n/ac"],
    control: ["Button", "Bluetooth remote controller", "API", "Web UI", "HTTPS"],
    power: [],
    physical: ["Fixed-focus 1/1.8in 8MP CMOS sensor, DFOV 120 degrees", "ePTZ with 5x digital zoom"],
    maxResolution: "4K@60Hz on HDMI output 1; inputs are limited to 4K@30Hz",
    dependencies: [
      "A compatible display is required on the HDMI output",
      "Where wireless casting is required, confirm the APO-DG2 dongle or supported casting path is quoted",
    ],
    compatibleFamilies: ["Apollo", "APO-SKY-MIC expansion microphones"],
    features: { ucBar: true, ePtz: true, autoFraming: true, speakerTracking: true, wirelessCasting: true, usbCharging60w: true },
    specs: { hdmiInputs: 1, hdmiOutputs: 2, usbTotalPorts: 3, networkPorts: 1 },
    checks: [
      "WyreStorm UC is Zoom-certified and NOT Teams-certified. Where the customer runs Teams, the room must be tested before install and the caveat stated in the proposal.",
      "Inputs are capped at 4K@30Hz, and the HDMI input is HDCP 1.4 only. Confirm before quoting against a 4K60 or HDCP 2.2 source requirement.",
      "The two HDMI outputs are not equivalent - output 1 is 4K@60 HDCP 2.3, output 2 is 4K@30 HDCP 2.2. Confirm which display is on which.",
      "The camera is ePTZ (digital), not mechanical PTZ, with a fixed-focus lens. Confirm this suits the room rather than assuming optical zoom.",
    ],
    warnings: [
      "The HDMI input supports HDCP 1.4 only. A protected 4K source requiring HDCP 2.2 will not pass through it.",
      "Input and output maxima differ. It is easy to quote this as a '4K60 bar' when only one output reaches 4K60 and no input does.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/apo-vx20-uc-v2/", "Technical Specifications table: Audio & Video, Camera and Sensor, Speakerphone, Communication and Control."),
  },
  {
    sku: "RX-700",
    status: "review-required",
    productClass: "HDBASET",
    role: "HDBaseT receiver with USB",
    productType: "100m 4K60 HDBaseT DSC receiver with USB",
    transport: ["HDBaseT Class C with PAM16 encoding, 10.2Gbps"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "RJ45", direction: "input", category: "video", detail: "1x HDBT in, 8-pin RJ45" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "1x HDMI out, 19-pin Type A female" },
      { count: 1, connector: "USB Type B", direction: "input", category: "usb", detail: "USB host" },
      { count: 4, connector: "USB Type A", direction: "output", category: "usb", detail: "USB device; direction must be set by switch before operation" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "100Mbps Ethernet, bidirectional over HDBaseT" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "control", detail: "IR RX" },
      { count: 1, connector: "3.5mm TS", direction: "output", category: "control", detail: "IR TX" },
    ],
    video: [
      "1920x1080p @60Hz",
      "2560x1440p @144Hz",
      "3840x2160p @60Hz 8bit 4:4:4",
      "3840x2160p @60Hz 10bit 4:2:0 HDR",
      "3840x2160p @60Hz 12bit 4:2:2 HDR",
    ],
    audio: ["2ch PCM | multichannel LPCM | DTS-X | Dolby Atmos"],
    usb: ["1x Type B host, 4x Type A device", "USB hub compatible, max 7 devices / 23 endpoints", "Max uplink 190Mbps"],
    network: ["1x RJ45, 100Mbps, bidirectional over HDBaseT"],
    control: ["RS-232", "IR TX/RX", "CEC one-way display trigger from TX", "ALLM and VRR supported"],
    power: ["18V DC 3A", "Max 10W"],
    physical: [],
    maxResolution: "3840x2160p @60Hz 8bit 4:4:4",
    latency: "10 microseconds end to end",
    chroma: "4:4:4 at 3840x2160p @60Hz 8bit, using DSC (Display Stream Compression)",
    dependencies: [
      "Requires a matching HDBaseT Class C transmitter - it will not pair with a Class A/B extender at these rates",
      "HDCP pass-through 2.3 supported; EDID passes RX to TX",
    ],
    compatibleFamilies: ["WyreStorm 700 series HDBaseT"],
    features: { hdbasetClassC: true, dsc: true, usbRouting: true, allm: true, vrr: true },
    specs: { hdmiOutputs: 1, usbTotalPorts: 5, maxPixelClockMhz: 340, externalPsu: true },
    checks: [
      "Unlike RX-70-4K, this receiver does reach 3840x2160 @60Hz 4:4:4 - but it uses DSC and needs a matching Class C transmitter. Confirm the transmitter before quoting the resolution.",
      "USB direction must be set with a physical switch before operation. Record which direction the install needs.",
      "Confirm whether the run genuinely needs 100m; RX-500 is the shorter-distance option in the same family.",
    ],
    warnings: [
      "4K60 4:4:4 here depends on DSC. Where a customer has specified an uncompressed path, this qualifies as compressed transport.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/rx-700/", "Technical Specifications table: Audio & Video, Communication & Control, Power."),
  },
  {
    sku: "RX-500",
    status: "review-required",
    productClass: "HDBASET",
    role: "HDBaseT receiver with USB",
    productType: "35m 4K HDBaseT receiver with USB",
    transport: ["HDBaseT Class C, 10.2Gbps"],
    inputCount: 1,
    outputCount: 3,
    ports: [
      { count: 1, connector: "RJ45", direction: "input", category: "video", detail: "1x HDBT in, 8-pin RJ45" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "1x HDMI out, 19-pin Type A female" },
      { count: 2, connector: "3.5mm TRS", direction: "output", category: "audio", detail: "Audio out / de-embed, 2ch, 1-way from TX" },
      { count: 4, connector: "USB Type A", direction: "output", category: "usb", detail: "USB device" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, bidirectional over HDBaseT" },
    ],
    video: [
      "5120x1440 @60Hz 4:2:0",
      "5120x1440 @30Hz",
      "3840x2160p @60Hz 8bit 4:2:0",
      "3840x2160p @30Hz 10bit HDR 4:2:0",
      "1920x1080p @60Hz 12bit",
    ],
    audio: ["HDMI out: 2ch analog/PCM, multichannel LPCM up to DTS-X and Dolby Atmos", "Audio de-embed: 2ch analog/PCM"],
    usb: ["4x Type A device", "USB hub compatible, max 7 devices / 23 endpoints", "Max uplink 190Mbps"],
    network: [],
    control: ["RS-232 bidirectional over HDBaseT", "CEC pass-through"],
    power: ["12V DC 2A", "Max 8W", "1-way PoH: the RX powers the TX"],
    physical: [],
    maxResolution: "3840x2160p @60Hz 8bit 4:2:0",
    chroma: "4:2:0 at 4K60 - this receiver does NOT reach 4K60 4:4:4",
    dependencies: [
      "Requires a matching HDBaseT transmitter",
      "PoH is 1-way with the RX powering the TX - confirm the power plan at both ends",
    ],
    compatibleFamilies: ["WyreStorm 500 series HDBaseT"],
    features: { hdbasetClassC: true, usbRouting: true, audioDeEmbed: true, pohReverse: true },
    specs: { hdmiOutputs: 1, usbTotalPorts: 4, maxPixelClockMhz: 297, externalPsu: true },
    checks: [
      "4K60 on this receiver is 4:2:0, not 4:4:4. Where 4:4:4 is required, RX-700 is the option in this family - confirm before quoting.",
      "PoH runs backwards here: the receiver powers the transmitter. Confirm the installer knows which end takes the PSU.",
      "Rated for 35m. Confirm the cable run before choosing this over RX-700.",
    ],
    warnings: [
      "Templates offering 'RX-500 (short run) or RX-700 (long run)' present these as a distance choice only. They also differ on chroma: RX-500 is 4:2:0 at 4K60 and RX-700 is 4:4:4. That is a picture-quality difference, not just a distance one.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/rx-500/", "Technical Specifications table: Audio & Video, Communication & Control, Power."),
  },
  {
    sku: "SW-130-TX-UK",
    status: "review-required",
    productClass: "PRESENTATION",
    role: "In-wall HDBaseT presentation transmitter",
    productType: "3-input in-wall HDBaseT transmitter, 2-gang UK",
    transport: ["HDBaseT Class C with PAM16 encoding, 10.2Gbps"],
    inputCount: 3,
    outputCount: 1,
    ports: [
      { count: 2, connector: "HDMI", direction: "input", category: "video", detail: "2x HDMI in, 19-pin Type A" },
      { count: 1, connector: "USB-C", direction: "input", category: "video", detail: "USB 3.1c audio/video, 4.5Gbps, alt-mode" },
      { count: 1, connector: "RJ45", direction: "output", category: "video", detail: "1x HDBT out, 8-pin RJ45" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "audio", detail: "Analog audio in, 2ch over HDBaseT, 1-way to RX" },
      { count: 1, connector: "USB Type B", direction: "input", category: "usb", detail: "USB host for the HDMI inputs, max 190Mbps" },
      { count: 1, connector: "4-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, shared with the 12V DC input" },
    ],
    video: [
      "1920x1080p @60Hz",
      "2560x1440p @60Hz",
      "3840x2160p @30Hz 8bit 4:4:4",
      "3840x2160p @30Hz 10bit 4:2:0 HDR",
      "3840x2160p @30Hz 12bit 4:2:2 HDR",
      "5120x1440 @30Hz; 5120x1440 @60Hz 4:2:0",
    ],
    audio: ["2ch PCM | multichannel up to DTS-X and Dolby Atmos", "Max sampling 192KHz, max 32 channels", "ARC NOT supported"],
    usb: ["1x Type B host for the HDMI inputs", "USB data from RX over HDBaseT"],
    network: [],
    control: ["RS-232 (4-pin Phoenix, shared with DC input)", "CEC one-way display trigger to RX", "ALLM supported"],
    power: ["12V DC input shared with the RS-232 4-pin Phoenix connector", "PoH supported"],
    physical: ["2-gang UK in-wall form factor"],
    maxResolution: "3840x2160p @30Hz 8bit 4:4:4",
    chroma: "4:4:4 only at 3840x2160 @30Hz - 4K60 is not supported on this transmitter",
    dependencies: [
      "Requires a matching HDBaseT receiver",
      "Compatible with the WyreStorm TS-280 touchscreen via the 4-pin Phoenix port, but only when using PoH",
      "WyreStorm recommends shielded category cable to minimise noise and interference",
    ],
    compatibleFamilies: ["WyreStorm HDBaseT receivers", "TS-280 touchscreen"],
    features: { inWall: true, usbC: true, hdbasetClassC: true, allm: true },
    specs: { hdmiInputs: 2, usbcInputs: 1, hdbasetOutputs: 1, maxPixelClockMhz: 340 },
    checks: [
      "This transmitter maxes at 4K@30Hz. It is NOT a 4K60 presentation path - confirm before quoting it against a 4K60 requirement.",
      "The RS-232 connector is shared with the 12V DC input on one 4-pin Phoenix. Confirm the installer knows both share the connector.",
      "ARC is not supported. Where display audio return is needed, this is not the right transmitter.",
      "TS-280 touchscreen support requires PoH - confirm the power plan if a touchscreen is in the design.",
    ],
    warnings: [
      "Maximum is 4K@30Hz. An in-wall plate is often assumed to be a full 4K60 path; this one is not.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/sw-130-tx-uk/", "Technical Specifications table: Transmission, Video, Audio, Communication & Control."),
  },
  {
    sku: "MX-0808-SCL",
    status: "review-required",
    productClass: "MATRIX",
    role: "8x8 seamless scaling HDMI matrix",
    productType: "4K60 8x8 seamless scaling HDMI matrix with USB-C support",
    transport: ["Local HDMI only - uncompressed 18Gbps, no HDBaseT outputs"],
    inputCount: 8,
    outputCount: 8,
    matrixInputs: 8,
    matrixOutputs: 8,
    matrixSize: "8x8",
    ports: [
      { count: 7, connector: "HDMI", direction: "input", category: "video", detail: "7x HDMI inputs" },
      { count: 1, connector: "USB-C", direction: "input", category: "video", detail: "1x USB-C input with 4K60 video, network access and PD3.0 charging" },
      { count: 8, connector: "HDMI", direction: "output", category: "video", detail: "8x HDMI outputs, each with an integrated 4K60 scaler" },
      { count: 4, connector: "4-pin", direction: "output", category: "audio", detail: "4x analog audio outputs" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "API control - Telnet, TLS, HTTP/HTTPS web UI" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232" },
    ],
    video: [
      "1920x1080p @60Hz 16bit - rated to 7m/23ft of HDMI cable",
      "3840x2160p @60Hz 10bit 4:2:2 HDR10/10+ - rated to 5m/16ft",
      "3840x2160p @60Hz 12bit 4:2:0 Dolby Vision - rated to 5m/16ft",
      "3840x2160p @50Hz 10bit 4:2:2 HLG - rated to 5m/16ft",
      "4096x2160p @60Hz 8bit 4:4:4 - rated to 5m/16ft",
    ],
    audio: ["2ch PCM | multichannel LPCM up to DTS-X and Dolby Atmos", "4x analog audio outputs for external audio systems"],
    usb: ["1x USB-C input with PD3.0 charging"],
    network: ["1x RJ45 for API control"],
    control: ["RS-232", "Telnet / TLS / HTTP / HTTPS web UI", "Pin-hole reset"],
    power: ["AC 100V-240V", "Max power consumption listed as TBD on the product page"],
    physical: ["19 inch, 1RU", "Weight listed as TBD on the product page"],
    maxResolution: "4096x2160p @60Hz 8bit 4:4:4",
    dependencies: [
      "Outputs are HDMI only. Reaching a display beyond the rated HDMI distance requires separate HDBaseT transmitters or active optical cable",
      "Inputs are 7x HDMI plus 1x USB-C, not 8x HDMI - confirm the source mix fits",
    ],
    compatibleFamilies: ["HDMI matrix distribution"],
    features: { seamlessSwitching: true, perOutputScaler: true, usbC: true, analogAudioOut: true },
    specs: { hdmiInputs: 7, usbcInputs: 1, hdmiOutputs: 8, analogAudioOutputs: 4, externalPsu: false },
    checks: [
      "Outputs are HDMI, NOT HDBaseT. An HDBaseT receiver cannot be connected directly to this matrix - it needs a transmitter on each output, or a matrix with native HDBaseT outputs.",
      "The 4K60 modes are rated to only 5m/16ft of HDMI cable. For any run beyond that, quote extension explicitly.",
      "Only 7 inputs are HDMI; the eighth is USB-C. Confirm the source count and type before quoting this as a plain 8x8 HDMI matrix.",
      "Max power consumption and weight are published as TBD. Confirm with WyreStorm if the install has rack power or loading constraints.",
    ],
    warnings: [
      "DESIGN GAP: the 'Local Pub - 8x8 Matrix TV Distribution' template pairs this matrix with RX-70-4K, an HDBaseT receiver, and contains no HDBaseT transmitter. As templated the receiver has nothing to connect to, and the remote TVs cannot be reached over HDMI at 4K60 given the 5m rating. That template needs a design decision before it is issued to a customer.",
      "Published max power consumption and weight are TBD on the official page.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/mx-0808-scl/", "Technical Specifications table: Audio & Video, Communication & Control, Power, Dimensions & Weight."),
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
