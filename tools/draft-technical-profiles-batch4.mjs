#!/usr/bin/env node
// Batch 4 of the template-SKU technical profile backlog.
//
// Same provenance rules as batches 1-3: every figure transcribed from the
// "Technical Specifications" table on the official WyreStorm product page, read
// in a real browser on 2026-07-24. All status "review-required" with an
// evidence record that says plainly they are machine-transcribed and NOT
// human-verified, so they do not count toward verified coverage.
//
// EX-70-H2 and MX-0808-KIT-V2 are prioritised in this batch because the
// template signal-path fixes in the previous commit put both into
// customer-facing room templates. Profiling them closes the loop: the products
// the templates now depend on have governed technical data behind them.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const schemaPath = path.join(root, "data", "schemas", "wyrestorm-technical-profile.schema.json");
const REVIEWED_ON = "2026-07-26";
const REVIEWER = "Wingman assisted source review (checked against the official product page; NOT human-verified)";

const sourceReviews = new Map([
  ["EX-70-H2", "https://www.wyrestorm.com/product/ex-70-h2/"],
  ["MX-0808-KIT-V2", "https://www.wyrestorm.com/product/mx-0808-kit-v2/"],
  ["NHD-600-TRXF", "https://www.wyrestorm.com/product/nhd-600-trxf/"],
  ["SW-0206-VW", "https://www.wyrestorm.com/product/sw-0206-vw/"],
  ["SW-120-TX3", "https://www.wyrestorm.com/product/sw-120-tx3/"],
  ["MX-1007-HYB", "https://www.wyrestorm.com/product/mx-1007-hyb/"],
]);

function evidence(url, note) {
  return [{ sourceType: "official-product-page", sourceUrl: url, reviewedOn: REVIEWED_ON, reviewer: REVIEWER, note }];
}

const drafts = [
  {
    sku: "EX-70-H2",
    status: "review-required",
    productClass: "HDBASET",
    role: "HDBaseT extender set (transmitter + receiver)",
    productType: "18Gbps 4K HDR HDBaseT extender set with 2-way PoH",
    transport: ["HDBaseT Class A over single Cat5e/6"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "HDMI", direction: "input", category: "video", detail: "TX: 1x HDMI 19-pin type A input" },
      { count: 1, connector: "RJ45", direction: "output", category: "video", detail: "TX: 1x HDBaseT 8-pin RJ45 out to the receiver" },
      { count: 1, connector: "RJ45", direction: "input", category: "video", detail: "RX: 1x HDBaseT 8-pin RJ45 in from the transmitter" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "RX: 1x HDMI 19-pin type A output to the display" },
      { count: 1, connector: "3.5mm TS", direction: "output", category: "control", detail: "IR TX" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "control", detail: "IR RX" },
      { count: 1, connector: "3-pin terminal", direction: "bidirectional", category: "control", detail: "RS-232, bidirectional over HDBaseT" },
    ],
    video: [
      "1920x1080p @60Hz 16bit",
      "3840x2160p @60Hz 10bit 4:2:0 HDR",
      "4096x2160p @60Hz 8bit 4:4:4",
    ],
    audio: ["2ch PCM | multichannel up to DTS-X and Dolby Atmos"],
    usb: [],
    network: [],
    control: ["Bidirectional IR", "RS-232", "CEC pass-through (requires source/display CEC compatibility)"],
    power: ["18V DC 1A", "Max 4.68W", "2-way PoH: IEEE 802.3af 48V 15.4W max"],
    physical: ["Low-profile 15mm chassis for mounting behind displays"],
    maxResolution: "4096x2160p @60Hz 8bit 4:4:4",
    latency: "10 microseconds end to end",
    chroma: "4:4:4 at 4096x2160p @60Hz 8bit; 3840x2160 @60Hz is 4:2:0",
    dependencies: [
      "Self-contained TX + RX pair - fed from an HDMI source at the transmitter end",
      "2-way PoH means either end can power the link; confirm which end takes the PSU",
    ],
    compatibleFamilies: ["WyreStorm HDBaseT"],
    features: { hdbaset: true, extenderSet: true, poh2Way: true, bidirectionalIr: true },
    specs: { hdmiInputs: 1, hdmiOutputs: 1, maxPixelClockMhz: 297, externalPsu: true },
    checks: [
      "This is a complete extender SET (TX + RX). Do not quote a separate receiver alongside it.",
      "3840x2160 @60Hz is 4:2:0, and 4:4:4 is available at 4096x2160 @60Hz 8bit. Confirm which the display needs.",
      "Treat this product as HDBaseT Class A. Confirm the supported distance for the exact resolution and cable with WyreStorm before quoting a distance-critical run.",
    ],
    warnings: [
      "The product is HDBaseT Class A. The Class B wording on WyreStorm's page is a typing error and must not be used as governed design data.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/ex-70-h2/", "Technical Specifications table: Audio & Video, Communication & Control, Power. Product is Class A; the Class B wording on the page is a typing error and is excluded from governed design data."),
  },
  {
    sku: "MX-0808-KIT-V2",
    status: "review-required",
    productClass: "MATRIX",
    role: "HDBaseT matrix kit with receivers",
    productType: "8x8 4K UHD HDBaseT matrix kit (matrix + 8 receivers)",
    transport: ["HDBaseT Class B, 9.2Gbps", "Local HDMI (mirrored outputs)"],
    inputCount: 8,
    outputCount: 8,
    matrixInputs: 8,
    matrixOutputs: 8,
    matrixSize: "8x8",
    ports: [
      { count: 8, connector: "HDMI", direction: "input", category: "video", detail: "Matrix: 8x HDMI 19-pin type A inputs" },
      { count: 8, connector: "RJ45", direction: "output", category: "video", detail: "Matrix: 8x HDBaseT zone outputs to the bundled receivers" },
      { count: 4, connector: "HDMI", direction: "output", category: "video", detail: "Matrix: 4 mirrored HDMI outputs (local)" },
      { count: 4, connector: "5-pin balanced", direction: "output", category: "audio", detail: "Matrix: 4x balanced analog audio de-embed" },
      { count: 1, connector: "HDMI", direction: "output", category: "video", detail: "Receiver: 1x HDMI output to the display" },
      { count: 1, connector: "DB9", direction: "bidirectional", category: "control", detail: "Matrix: RS-232 DB9 female (API)" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "Matrix: 10/100BaseT LAN" },
    ],
    video: [
      "1920x1080p @60Hz 16bit",
      "3840x2160p 10bit 4:2:0 HDR",
      "3840x2160p @30Hz 8bit 4:4:4",
      "3840x2160p @60Hz 8bit 4:2:0",
    ],
    audio: ["HDMI/HDBaseT: 2ch LPCM, multichannel up to Dolby Atmos and DTS-X", "Analog output: 2ch PCM"],
    usb: [],
    network: ["1x 10/100BaseT LAN for control"],
    control: ["RS-232 (DB9 on matrix, 3-pin terminal on receivers)", "Bidirectional IR (8x TX / 8x RX)", "CEC power triggering"],
    power: ["Matrix: 100-240V AC", "Receivers: powered from the matrix over 1-way PoH (or optional 18V DC)", "Matrix max 105.4W"],
    physical: ["Ships as a kit: 1x matrix + 8x MX-KIT-RX receivers"],
    maxResolution: "3840x2160p @30Hz 8bit 4:4:4 (4K60 is 4:2:0)",
    chroma: "4:4:4 only at 4K30; 4K60 is 4:2:0",
    dependencies: [
      "Kit includes 8x MX-KIT-RX receivers - do not quote separate receivers",
      "1-way PoH powers the receivers from the matrix; confirm cable grade and distance",
    ],
    compatibleFamilies: ["WyreStorm HDBaseT matrix"],
    features: { hdbasetMatrixKit: true, includesReceivers: true, mirroredHdmiOutputs: true, poh: true, smartEdid: true },
    specs: { hdmiInputs: 8, hdbasetOutputs: 8, mirroredHdmiOutputs: 4, analogAudioOutputs: 4, maxPixelClockMhz: 340, externalPsu: false },
    checks: [
      "Right product for distributing to TVs around a venue over Cat cable - unlike MX-0808-SCL, whose outputs are HDMI only.",
      "This is HDBaseT Class B: 4K60 is 4:2:0, and 4:4:4 is only at 4K30. Confirm against a 4K60 4:4:4 requirement.",
      "The kit bundles 8 receivers. Confirm the TV count fits 8 zones (plus up to 4 mirrored local HDMI).",
      "Not a seamless switcher. If the venue needs black-screen-free switching, escalate to a seamless matrix or AVoIP design.",
    ],
    warnings: [
      "HDBaseT Class B at 9.2Gbps: 4K60 is 4:2:0, not 4:4:4. Do not present it as a full 4K60 4:4:4 distribution matrix.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/mx-0808-kit-v2/", "Technical Specifications table plus In-the-Box list (8x MX-KIT-RX receivers)."),
  },
  {
    sku: "NHD-600-TRXF",
    status: "review-required",
    productClass: "AVOIP",
    role: "SDVoE fibre transceiver (encoder or decoder)",
    productType: "NetworkHD 600 Series 4K60 4:4:4 10Gb SDVoE fibre transceiver",
    transport: ["10Gb SDVoE over fibre (SFP+)"],
    inputCount: 1,
    outputCount: 1,
    ports: [
      { count: 1, connector: "HDMI 2.0b", direction: "input", category: "video", detail: "1x HDMI 2.0b input" },
      { count: 1, connector: "HDMI 2.0b", direction: "output", category: "video", detail: "1x HDMI 2.0b output" },
      { count: 1, connector: "SFP+", direction: "bidirectional", category: "network", detail: "1x 10Gb/s SFP+ - 10GBASE-SR 300m OM3, 10GBASE-LR 10km OS1/OS2 single-mode" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1x 1GbE LAN control" },
      { count: 1, connector: "5-pin balanced", direction: "bidirectional", category: "audio", detail: "Balanced analog audio" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, 2-way, routed, API programmable" },
      { count: 3, connector: "USB 2.0 Type A", direction: "input", category: "usb", detail: "USB, 480Mbps" },
      { count: 1, connector: "USB 2.0 Type B", direction: "output", category: "usb", detail: "USB host" },
    ],
    video: [
      "5120x2160p @30Hz 4:4:4",
      "5120x1440p @30/45Hz 4:4:4",
      "4096x2160p @60Hz 8bit 4:4:4 or RGB",
      "3840x2160p @60Hz 12bit 4:2:2 Dolby Vision",
      "3840x2160p @60Hz 10bit 4:2:2 HDR10/HLG",
      "1920x1080p @60Hz 12bit",
    ],
    audio: ["High-bitrate multichannel passthrough including Dolby Atmos and DTS:X"],
    usb: ["3x USB 2.0 Type A", "1x USB 2.0 Type B host", "480Mbps"],
    network: ["1x 10Gb SFP+ (fibre)", "1x 1GbE RJ45 (control)"],
    control: ["RS-232 (3-pin Phoenix)", "IR TX/RX", "API programmable"],
    power: ["12V 2A DC PSU", "Max 24W, average 10W"],
    physical: [],
    maxResolution: "5120x2160p @30Hz 4:4:4",
    latency: "Genlock: uncompressed 30us, compressed <120us. Fast Switch: 1-2 frames, ~16.7-33.4ms @60fps.",
    chroma: "4:4:4 up to 4096x2160 @60Hz 8bit",
    dependencies: [
      "Fibre variant of NHD-600-TRX - requires a 10Gb SDVoE fibre network with the matching SFP+ modules",
      "Requires a NetworkHD controller (NHD-CTL-PRO-V2)",
      "Never mix 600 series 10G with 1G NetworkHD series in one transport design",
    ],
    compatibleFamilies: ["NetworkHD 600"],
    features: { sdvoe: true, fibre: true, transceiver: true, usbRouting: true, scaling: true, fastSwitch: true },
    specs: { hdmiInputs: 1, hdmiOutputs: 1, networkSpeedGbps: 10, usbTotalPorts: 4, externalPsu: true },
    checks: [
      "This is the FIBRE (SFP+) variant. Confirm the site has fibre and the correct SFP+ modules (SR multi-mode vs LR single-mode) for the distance.",
      "As a transceiver, each unit is an encoder or a decoder - confirm the count of each role.",
      "4K60 4:4:4 8bit uses light compression; confirm where fully uncompressed is specified.",
    ],
    warnings: [
      "SFP+ modules are not necessarily included - confirm SR vs LR module supply for the required fibre distance.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/nhd-600-trxf/", "Technical Specifications table: Audio & Video, Communication & Control, Power."),
  },
  {
    sku: "SW-0206-VW",
    status: "review-required",
    productClass: "VIDEO_WALL",
    role: "Video wall processor",
    productType: "2-input 6-output 4K60 video wall processor",
    transport: ["Local HDMI"],
    inputCount: 2,
    outputCount: 6,
    ports: [
      { count: 2, connector: "HDMI", direction: "input", category: "video", detail: "2x HDMI 19-pin type A inputs" },
      { count: 6, connector: "HDMI", direction: "output", category: "video", detail: "6x HDMI 19-pin type A outputs (video wall tiles)" },
      { count: 1, connector: "5-pin Phoenix", direction: "output", category: "audio", detail: "Balanced analog audio de-embed from the selected HDMI input" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, video-wall control and routable device control" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "LAN, Web UI, video-wall control" },
    ],
    video: [
      "Auto-scaler up to 4K@60Hz",
      "1920x1080p @60Hz 4:4:4 8bit",
      "3840x2160p @60Hz 4:4:4 8bit",
      "4096x2160p @60Hz 4:4:4 8bit",
      "5120x2160 @30Hz",
    ],
    audio: ["PCM 2ch analog de-embed from the selected HDMI input"],
    usb: [],
    network: ["1x LAN, Web UI, video-wall control"],
    control: ["RS-232 (video-wall + routable device control, Telnet)", "Web UI", "Front-panel input / lock / layout-mode buttons"],
    power: ["20V 3A DC"],
    physical: [],
    maxResolution: "4096x2160p @60Hz 4:4:4 8bit",
    dependencies: [
      "Local HDMI in and out - displays connect over HDMI; add extension where tiles are beyond HDMI range",
      "Preset layouts: 1x4, 2x2, 3x2, 2x3, 4x1, plus rotated 1x4[90] and 1x3[60]",
    ],
    compatibleFamilies: ["Video wall / signage"],
    features: { videoWall: true, autoScaler: true, presetLayouts: true, audioDeEmbed: true },
    specs: { hdmiInputs: 2, hdmiOutputs: 6, maxPixelClockMhz: 600, externalPsu: true },
    checks: [
      "This drives a video wall from 2 sources across up to 6 tiles. Confirm the wall geometry matches an available preset layout (1x4, 2x2, 3x2, 2x3, 4x1, or the rotated modes).",
      "Outputs are local HDMI. Where tiles are beyond HDMI range, add HDBaseT extension per output.",
      "Only 2 inputs. Confirm the source count before quoting against a multi-source requirement.",
    ],
    warnings: [],
    evidence: evidence("https://www.wyrestorm.com/product/sw-0206-vw/", "Technical Specifications table: Audio and Video, Communication & Control, Power."),
  },
  {
    sku: "SW-120-TX3",
    status: "review-required",
    productClass: "PRESENTATION",
    role: "HDBaseT switching transmitter",
    productType: "Synergy 2-input 4K60 HDBaseT 3.0 switching transmitter with USB-C",
    transport: ["HDBaseT 3.0"],
    inputCount: 2,
    outputCount: 1,
    ports: [
      { count: 1, connector: "HDMI", direction: "input", category: "video", detail: "1x HDMI 19-pin type A input" },
      { count: 1, connector: "USB-C", direction: "input", category: "video", detail: "USB-C alt-mode / host, up to 60W charging" },
      { count: 1, connector: "RJ45", direction: "output", category: "video", detail: "1x HDBaseT 8-pin RJ45 out to the receiver" },
      { count: 3, connector: "USB Type A", direction: "output", category: "usb", detail: "USB device" },
      { count: 1, connector: "USB Type B", direction: "input", category: "usb", detail: "USB host, 300Mbps" },
      { count: 1, connector: "3.5mm TRS", direction: "input", category: "audio", detail: "Line-in, 2ch over HDBaseT" },
      { count: 1, connector: "3.5mm TRS", direction: "output", category: "audio", detail: "Audio out" },
      { count: 1, connector: "3-pin Phoenix", direction: "bidirectional", category: "control", detail: "RS-232, shared, API / passthrough" },
    ],
    video: [
      "1920x1080p @60Hz 12bit",
      "3840x2160 @60Hz 4:4:4 8bit",
      "5120x2160 @30Hz",
      "5120x2160 @60Hz 4:2:0",
    ],
    audio: ["2ch audio over HDBaseT, 1-way to RX", "Multichannel up to DTS:X and Dolby Atmos via HDMI"],
    usb: ["1x Type B host (300Mbps)", "3x Type A device", "USB-C host with up to 60W charging"],
    network: [],
    control: ["RS-232 (3-pin Phoenix, shared, API/passthrough)", "CEC pass-through", "2-way PoH"],
    power: ["20V DC 6A (sold separately)", "Max 10.46W"],
    physical: [],
    maxResolution: "3840x2160 @60Hz 4:4:4 8bit",
    chroma: "4:4:4 at 4K60 (uncompressed, HDBaseT 3.0)",
    dependencies: [
      "Requires a matching HDBaseT 3.0 receiver",
      "The 60W USB-C charging needs a compatible PSU (not included)",
    ],
    compatibleFamilies: ["Synergy HDBaseT 3.0", "WyreStorm HDBaseT 3.0 receivers"],
    features: { hdbaset3: true, usbC: true, usbCharging60w: true, switching2Input: true, poh2Way: true },
    specs: { hdmiInputs: 1, usbcInputs: 1, hdbasetOutputs: 1, maxPixelClockMhz: 600, externalPsu: true },
    checks: [
      "Unlike SW-130-TX-UK (which maxes at 4K30), this HDBaseT 3.0 transmitter does reach uncompressed 4K60 4:4:4. Confirm the receiver is also HDBaseT 3.0.",
      "The RS-232 port is shared between API control and passthrough. Confirm the intended use.",
      "USB-C 60W charging requires a compatible PSU that is sold separately. Quote it if charging is needed.",
    ],
    warnings: [],
    evidence: evidence("https://www.wyrestorm.com/product/sw-120-tx3/", "Technical Specifications table: Audio and Video, Communication & Control, Power."),
  },
  {
    sku: "MX-1007-HYB",
    status: "review-required",
    productClass: "MATRIX",
    role: "Hybrid multi-transport matrix",
    productType: "10x7 4K hybrid matrix switcher (HDMI / HDBaseT / NetworkHD 500 / USB-C)",
    transport: ["HDMI", "HDBaseT 3.0", "NetworkHD 500 (AVoIP spill-over)", "Dante audio"],
    inputCount: 10,
    outputCount: 7,
    matrixInputs: 10,
    matrixOutputs: 7,
    matrixSize: "10x7",
    ports: [
      { count: 1, connector: "USB-C", direction: "input", category: "video", detail: "USB-C alt-mode input (4K60, USB, 1G network, 60W PD)" },
      { count: 7, connector: "HDMI", direction: "input", category: "video", detail: "7x HDMI 19-pin type A inputs" },
      { count: 1, connector: "RJ45", direction: "input", category: "video", detail: "1x HDBaseT 3.0 input" },
      { count: 1, connector: "RJ45", direction: "input", category: "video", detail: "1x NetworkHD 500 input" },
      { count: 4, connector: "HDMI", direction: "output", category: "video", detail: "4x HDMI outputs" },
      { count: 2, connector: "RJ45", direction: "output", category: "video", detail: "2x HDBaseT 3.0 outputs" },
      { count: 1, connector: "RJ45", direction: "output", category: "video", detail: "1x NetworkHD 500 output" },
      { count: 4, connector: "USB Type A", direction: "output", category: "usb", detail: "4x USB-A device" },
      { count: 1, connector: "RJ45", direction: "bidirectional", category: "audio", detail: "Dante Ultimo 4x4 over 1GbE" },
      { count: 4, connector: "Phoenix GPIO", direction: "bidirectional", category: "control", detail: "4x GPIO" },
      { count: 2, connector: "Phoenix relay", direction: "output", category: "control", detail: "2x relay" },
    ],
    video: [
      "1920x1080p @60Hz",
      "3840x2160p @60Hz 4:2:0",
      "3840x2160 @60Hz 4:4:4",
      "5120x2160 @30Hz",
    ],
    audio: ["PCM 2ch analog", "Dante Ultimo 4x4"],
    usb: ["2x USB-B host", "4x USB-A device", "USB-C with USB3.0/2.0"],
    network: ["2x LAN (Web UI, matrix control)", "1x 1GbE for Dante"],
    control: ["RS-232 (3-pin Phoenix, routable, Telnet)", "4x GPIO", "2x relay", "Web UI"],
    power: ["100-240V AC"],
    physical: ["2U, 440mm wide, 362mm deep"],
    maxResolution: "3840x2160 @60Hz 4:4:4",
    chroma: "4:4:4 at 4K60 (HDBaseT/HDMI); NetworkHD 500 path is JPEG2000",
    dependencies: [
      "Multi-transport: HDMI, HDBaseT 3.0, and NetworkHD 500 spill-over all in one chassis",
      "Dante requires an audio network and Dante Controller configuration",
      "The NetworkHD 500 in/out path integrates with a NetworkHD 500 AVoIP system - confirm the wider system design",
    ],
    compatibleFamilies: ["HDBaseT 3.0", "NetworkHD 500", "Dante"],
    features: { hybridMatrix: true, hdbaset3: true, networkHd500SpillOver: true, dante: true, seamlessSwitching: true, scaling: true, usbC: true },
    specs: { hdmiInputs: 7, usbcInputs: 1, hdbasetInputs: 1, avoipInputs: 1, hdmiOutputs: 4, hdbasetOutputs: 2, avoipOutputs: 1, maxPixelClockMhz: 600, externalPsu: false },
    checks: [
      "This is a HYBRID matrix: it has HDMI, HDBaseT 3.0 AND NetworkHD 500 outputs. Confirm which transport each display uses - do not assume all outputs are the same type.",
      "The NetworkHD 500 spill-over port ties this into an AVoIP system. Confirm the wider NetworkHD design if that path is used.",
      "Dante 4x4 needs an audio network and clock/domain ownership confirmed on site.",
      "10 inputs include 1 USB-C and 1 HDBaseT and 1 NetworkHD - only 7 are plain HDMI. Confirm the source mix.",
    ],
    warnings: [
      "Unlike a plain matrix, outputs are mixed-transport (4x HDMI, 2x HDBaseT, 1x NetworkHD). Treat each output path on its own terms when designing displays.",
    ],
    evidence: evidence("https://www.wyrestorm.com/product/mx-1007-hyb/", "Technical Specifications table: Audio & Video, Communication & Control, Power, Dimensions."),
  },
];

function fail(message) {
  console.error(`[draft] ${message}`);
  process.exit(1);
}

function validateSchema(value, schema, location = "$") {
  const errors = [];
  const typeMatches = {
    object: (candidate) => candidate !== null && typeof candidate === "object" && !Array.isArray(candidate),
    array: Array.isArray,
    string: (candidate) => typeof candidate === "string",
    integer: Number.isInteger,
  };

  if (schema.type && !typeMatches[schema.type]?.(value)) {
    return [`${location} must be ${schema.type}.`];
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${location} must be one of: ${schema.enum.join(", ")}.`);
  }
  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${location} must contain at least ${schema.minLength} character(s).`);
  }
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`${location} must be at least ${schema.minimum}.`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location} must contain at least ${schema.minItems} item(s).`);
    }
    if (schema.items) {
      value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${location}[${index}]`)));
    }
  }
  if (typeMatches.object(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${location}.${required} is required.`);
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateSchema(value[key], propertySchema, `${location}.${key}`));
      }
    }
  }
  return errors;
}

function validateSourceReviews() {
  const errors = [];
  const draftSkus = new Set(drafts.map((draft) => draft.sku));

  for (const draft of drafts) {
    const reviewedUrl = sourceReviews.get(draft.sku);
    const evidenceUrls = new Set(draft.evidence.map((item) => item.sourceUrl));
    if (!reviewedUrl) errors.push(`${draft.sku} has no explicit official-source review.`);
    if (reviewedUrl && !evidenceUrls.has(reviewedUrl)) {
      errors.push(`${draft.sku} evidence does not match its reviewed official source.`);
    }
    if (draft.status !== "review-required") {
      errors.push(`${draft.sku} must remain review-required until a human verifies it.`);
    }
  }
  for (const sku of sourceReviews.keys()) {
    if (!draftSkus.has(sku)) errors.push(`Source review exists for unknown draft ${sku}.`);
  }
  return errors;
}

function atomicWriteJson(filePath, value) {
  const directory = path.dirname(filePath);
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${os.hostname()}.tmp`,
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const check = process.argv.includes("--check");
const apply = process.argv.includes("--apply");
const unknown = process.argv.slice(2).filter((argument) => !["--check", "--apply"].includes(argument));

if (unknown.length) fail(`Unknown argument(s): ${unknown.join(", ")}`);
if (check === apply) fail("Choose exactly one mode: --check or --apply.");
if (!fs.existsSync(target)) fail(`Missing governed profile database: ${target}`);
if (!fs.existsSync(schemaPath)) fail(`Missing technical-profile schema: ${schemaPath}`);

const payload = JSON.parse(fs.readFileSync(target, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const existing = new Set(payload.profiles.map((profile) => String(profile.sku).toUpperCase()));
const added = drafts.filter((draft) => !existing.has(draft.sku.toUpperCase()));
const skipped = drafts.filter((draft) => existing.has(draft.sku.toUpperCase()));
const candidate = structuredClone(payload);
candidate.profiles.push(...added);
if (added.length) candidate.updatedAt = REVIEWED_ON;

const errors = [
  ...validateSourceReviews(),
  ...validateSchema(candidate, schema),
];
const candidateSkus = new Set();
for (const [index, profile] of candidate.profiles.entries()) {
  const sku = String(profile.sku ?? "").trim().toUpperCase();
  if (candidateSkus.has(sku)) errors.push(`$.profiles[${index}].sku duplicates ${sku}.`);
  candidateSkus.add(sku);
}
if (errors.length) {
  console.error("[draft] Validation failed:");
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`[draft] Schema valid: ${candidate.profiles.length} total profile(s).`);
console.log(`[draft] Official-source reviews present for all ${drafts.length} batch-4 draft(s).`);
if (skipped.length) console.log(`[draft] Already present and left untouched: ${skipped.map((draft) => draft.sku).join(", ")}`);

if (check) {
  console.log(`[draft] Check passed. Would add ${added.length} review-required profile(s): ${added.map((draft) => draft.sku).join(", ") || "(none)"}`);
  console.log("[draft] No files changed. Use --apply to write the validated candidate.");
  process.exit(0);
}

if (!added.length) {
  console.log("[draft] Nothing to apply; all batch-4 profiles already exist.");
  process.exit(0);
}

atomicWriteJson(target, candidate);
console.log(`[draft] Atomically added ${added.length} review-required profile(s): ${added.map((draft) => draft.sku).join(", ")}`);
console.log("[draft] These do NOT count toward verified coverage. Promote only after human review.");
