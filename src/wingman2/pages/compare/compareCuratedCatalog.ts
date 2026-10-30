/**
 * The hand-typed WyreStorm catalogue the compare page starts from.
 *
 * One row per product the compare lane may recommend, with the free-text
 * productClass/role/transport/tags the scorer reads and the caveat the cards
 * print. This is data, not logic: it is the list the page's index-load upgrades
 * with the real catalogue once the product-intelligence index is available.
 */
import { NETWORKHD_AVOIP_FAMILIES, type NetworkHdAvoipMember } from "../../lib/networkHdAvoipEquivalence";
import { type WyreStormProduct } from "../../features/compare";
import { uniqueSkuOptions } from "./textTokens";

const PAGE_AVOIP_ROLE_LABEL: Record<string, string> = {
  encoder: "Encoder / transmitter",
  decoder: "Decoder / receiver",
  transceiver: "Transceiver",
  unknown: "Endpoint",
};

function avoipTransportLabel(series: "100" | "500" | "600"): string {
  if (series === "600") return "10GbE SDVoE AVoIP";
  if (series === "100") return "1GbE H.264/H.265 AVoIP";
  return "1GbE JPEG2000 AVoIP";
}

function avoipRoleTags(role: NetworkHdAvoipMember["role"]): string[] {
  if (role === "encoder") return ["encoder", "transmitter"];
  if (role === "decoder") return ["decoder", "receiver"];
  if (role === "transceiver") return ["encoder", "decoder", "transceiver"];
  return ["endpoint"];
}

function avoipSeriesTags(series: "100" | "500" | "600"): string[] {
  if (series === "600") return ["10g", "4k60", "444", "hdr", "zero latency"];
  if (series === "100") return ["4k", "h264"];
  return ["4k60", "444", "hdr", "usb"];
}

export const NETWORKHD_AVOIP_PRODUCTS: WyreStormProduct[] = Object.values(NETWORKHD_AVOIP_FAMILIES).flatMap((family) =>
  family.members.map((member) => ({
    sku: member.sku,
    name: `${family.label} Series ${PAGE_AVOIP_ROLE_LABEL[member.role]} - ${member.note}`,
    family: family.label,
    productClass: "AV-over-IP",
    role: PAGE_AVOIP_ROLE_LABEL[member.role],
    transport: avoipTransportLabel(family.series),
    tags: uniqueSkuOptions(["avoip", "hdmi", ...avoipRoleTags(member.role), ...avoipSeriesTags(family.series)]),
    caveat: "Confirm controller, codec, USB/audio/control requirements and network design before quoting.",
  })),
);

export const WYRESTORM_PRODUCTS: WyreStormProduct[] = [
  ...NETWORKHD_AVOIP_PRODUCTS,
  {
    sku: "NHD-0401-MV",
    name: "4-input multiview processor",
    family: "NetworkHD / Multiview",
    productClass: "Multiview",
    role: "Processor",
    transport: "HDMI / NetworkHD workflow",
    tags: ["multiview", "4 input", "single output", "hdmi", "presentation"],
    caveat: "Use when multiple sources need to appear on one output canvas.",
  },
  {
    sku: "SW-0206-VW",
    name: "4K60 video wall processor",
    family: "Video Wall",
    productClass: "Video wall",
    role: "Processor",
    transport: "HDMI processing",
    tags: ["video wall", "processor", "4k60", "hdmi", "scaling"],
    caveat: "Consider for dedicated non-AVoIP video wall processing.",
  },
  {
    sku: "SW-0204-VW",
    name: "Preset-layout video wall processor",
    family: "Video Wall",
    productClass: "Video wall",
    role: "Processor",
    transport: "HDMI processing",
    tags: ["video wall", "processor", "preset", "hdmi"],
    caveat: "Use for simpler preset video wall layouts.",
  },
  {
    sku: "EX-100-KVM",
    name: "HDBaseT HDMI and USB KVM extender kit",
    family: "HDBaseT Extension",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    tags: ["hdbaset", "extender", "extension", "usb", "usb 2.0", "kvm", "point-to-point", "tx rx"],
    caveat: "Use for point-to-point HDMI and USB extension. Confirm resolution, cable length, USB version and control needs before quoting.",
  },
  {
    sku: "EX-70-H2",
    name: "HDBaseT HDMI extender kit",
    family: "HDBaseT Extension",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    tags: ["hdbaset", "extender", "extension", "hdmi", "point-to-point", "tx rx"],
    caveat: "Use for point-to-point HDMI extension. Confirm resolution, cable length, control needs and receiver/transmitter requirements before quoting.",
  },
  {
    sku: "EX-60-USB2",
    name: "USB 2.0 extender",
    family: "USB Extension",
    productClass: "HDBaseT extender",
    role: "USB extender",
    transport: "USB extension",
    tags: ["usb", "usb 2.0", "extender", "extension", "point-to-point"],
    caveat: "Use when the requirement is USB extension rather than video switching. Confirm USB version, device type and cable length before quoting.",
  },
  {
    sku: "MX-0402-MST",
    name: "4x2 presentation switcher with MST",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / MST",
    tags: ["presentation", "switcher", "usb", "usb-c", "mst", "4k60", "small room", "dual display"],
    caveat: "Use for compact presentation rooms that need a few sources and professional switching without stepping into large-room matrix architecture.",
  },
  {
    sku: "MX-0403-H3-MST",
    name: "4x3 presentation switcher with MST and HDBaseT 3.0 output",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT 3.0 / MST",
    tags: ["presentation", "switcher", "usb", "usb-c", "mst", "4k60", "hdbaset3", "dual display", "room core"],
    caveat: "Use when a contained room needs presentation switching plus a more capable output path, without jumping to a specialist large-room hybrid core.",
  },
  {
    sku: "SW-620-TX-W",
    name: "2-input wireless presentation switcher",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / Wireless presentation",
    tags: ["presentation", "switcher", "usb", "usb-c", "wireless", "byod", "byom", "4k60", "small room"],
    caveat: "Use when the sale is really about easy wired and wireless laptop presentation, not a larger matrix or specialist room core.",
  },
  {
    sku: "SW-640L-TX-W",
    name: "4-input wireless presentation switcher",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / Wireless presentation",
    tags: ["presentation", "switcher", "usb", "usb-c", "wireless", "byod", "byom", "4k60", "dual display"],
    caveat: "Use when the room needs a stronger day-to-day presentation workflow with more inputs and easier guest connection.",
  },
  {
    sku: "CAM-210-NDI-PTZ",
    name: "1080p60 NDI PTZ camera",
    family: "WyreStorm Cameras",
    productClass: "NDI camera",
    role: "NDI Camera",
    transport: "NDI / HDMI / USB",
    tags: ["camera", "ndi", "ndi camera", "ptz", "usb", "hdmi", "meeting room", "streaming"],
    caveat: "Use when the customer needs an actual NDI-capable PTZ camera rather than just video transport elsewhere in the system.",
  },
  {
    sku: "CAM-420-PTZ",
    name: "4K dual-lens AI PTZ camera",
    family: "WyreStorm Cameras",
    productClass: "PTZ camera",
    role: "PTZ Camera",
    transport: "HDMI / USB / IP",
    tags: ["camera", "ptz", "usb", "hdmi", "ip control", "tracking", "meeting room"],
    caveat: "Use when the customer needs a controllable room camera and the discussion is really about framing, placement and PTZ workflow.",
  },
  {
    sku: "CAM-0402-NDI-BRG",
    name: "4K multi-camera bridge with NDI",
    family: "WyreStorm Cameras",
    productClass: "Camera bridge",
    role: "Camera bridge",
    transport: "NDI / HDMI / USB",
    tags: ["camera", "bridge", "ndi", "usb", "hdmi", "multi-camera", "switching"],
    caveat: "Use only when the requirement is bridging or combining several camera feeds, not when the customer is simply asking for the camera itself.",
  },
  {
    sku: "MX-0404-SCL",
    name: "4x4 seamless local matrix",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDMI matrix",
    tags: ["matrix", "4x4", "hdmi", "fixed io", "local matrix", "4k60", "444", "multiview", "scaling"],
    caveat: "Use when the right answer is a contained local matrix rather than a video wall processor, presentation switcher or AVoIP design.",
  },
  {
    sku: "MX-0808-KIT-V2",
    name: "8x8 HDMI/HDBaseT matrix kit",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDBaseT / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io"],
    caveat: "Good direction for contained fixed I/O systems. Confirm routed vs mirrored outputs.",
  },
  {
    sku: "MXV-0808-H2A-MK2",
    name: "18Gbps 8x8 HDBaseT matrix mainframe",
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "18Gbps HDBaseT Class B / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io", "4k60", "444", "18g", "class b"],
    caveat: "Mainframe only. For a full 8-output HDBaseT system, quote 8x compatible RXV-35 receivers separately.",
  },
  {
    sku: "MXV-0808-H2A-70-V3",
    name: "18Gbps 8x8 HDBaseT matrix mainframe",
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "18Gbps HDBaseT Class A / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io", "4k60", "444", "18g", "class a", "70m"],
    caveat: "Mainframe only. For a full 8-output HDBaseT system, quote 8x compatible RXV-70 receivers separately.",
  },
  {
    sku: "MX-1007-HYB",
    name: "Hybrid presentation and AV routing switcher",
    family: "Hybrid / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT / NetworkHD 500",
    tags: ["presentation", "usb-c", "hdbaset", "uc", "hybrid", "meeting room", "specialist", "large room", "dual room", "master slave", "nhd500", "dsp", "amp", "mic", "audio", "hdbaset3"],
    caveat: "Specialist room core for large single rooms or linked rooms. Confirm hybrid teaching, master/slave room sharing, amp/DSP, mic input and inter-room transport requirements before quoting.",
    compareSuitability: "specialist",
  },
  {
    sku: "APO-VX20-UC-V2",
    name: "All-in-one UC video bar (camera, microphone, speaker)",
    family: "Apollo UC",
    productClass: "USB conferencing",
    role: "Conference bar / USB conferencing",
    transport: "USB / HDMI / network collaboration",
    tags: ["usb conferencing", "usb", "byod", "byom", "camera", "conferencing", "soundbar", "video bar", "teams", "zoom", "meeting room"],
    caveat: "Confirm room size, participant count, host platform (BYOD/BYOM/native appliance) and mounting before quoting. Pair with APO-DG2 if wireless casting is also needed.",
  },
  {
    sku: "APO-DG2",
    name: "Wireless presentation / casting dongle",
    family: "Apollo UC",
    productClass: "Wireless casting",
    role: "Wireless casting",
    transport: "Wireless presentation / Wi-Fi",
    tags: ["wireless casting", "wireless", "byod", "casting", "presentation"],
    caveat: "Confirm whether the customer needs casting only, or a full UC conferencing workflow (pair with APO-VX20-UC-V2) as well.",
  },
  {
    sku: "SP-0104-H2",
    name: "1x4 4K HDMI splitter with EDID management",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x4", "hdmi", "4k60", "444", "edid"],
    caveat: "A splitter duplicates one source to every output - it cannot route independent sources. Confirm the customer does not actually need independent per-display routing (that would be a matrix instead).",
  },
  {
    sku: "EXP-SP-0102-H2",
    name: "1x2 4K HDMI splitter",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x2", "hdmi", "4k60"],
    caveat: "Smaller 1x2 splitter for a two-display room. Confirm the customer does not actually need independent per-display routing (that would be a matrix instead).",
  },
  {
    sku: "SP-0108-SCL",
    name: "1x8 4K HDMI splitter with scaling",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x8", "hdmi", "4k60", "scaling", "mixed displays"],
    caveat: "Use when more than four displays need the same source, or displays have mixed native resolutions requiring scaling. Confirm the customer does not actually need independent per-display routing (that would be a matrix instead).",
  },
];
