export type GuruCatalogItem = {
  sku: string;
  name: string;
  family: string;
  category: string;
  role?: string;
  status: "current" | "discontinued" | "unknown";
  summary: string;
  io: string[];
  connectivity: string[];
  control: string[];
  features: string[];
  bestFor: string[];
  sourceUrl: string;
};

export const WYRESTORM_CATALOG_SEED: GuruCatalogItem[] = [
  {
    sku: "SW-640L-TX-W",
    name: "4-Input 4K Presentation Switcher with USB C 60W PD and Matrix Outputs, USB 3.0, Multiview & Wireless Casting",
    family: "Synergy",
    category: "Presentation Switcher",
    role: "TX",
    status: "current",
    summary:
      "Wireless presentation and conferencing switcher for modern meeting spaces with two USB-C inputs supporting 60W PD and MST, plus multiview and wireless casting.",
    io: [
      "4 inputs total",
      "2x USB-C inputs (60W PD)",
      "Matrix outputs",
      "USB 3.0 integration",
    ],
    connectivity: [
      "USB-C",
      "Wireless casting",
      "Matrix switching",
      "4K video",
    ],
    control: [
      "App / system-level switching workflow",
    ],
    features: [
      "MST",
      "Multiview",
      "Wireless casting",
      "Meeting-room workflow",
    ],
    bestFor: [
      "BYOD meeting rooms",
      "Wireless presentation rooms",
      "Hybrid collaboration spaces",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/sw-640l-tx-w/",
  },
  {
    sku: "EX-100-KVM-IP",
    name: "4K@30Hz IP-Based KVM Extender",
    family: "Extender Solutions",
    category: "KVM Extender",
    role: "Kit",
    status: "current",
    summary:
      "IP-based KVM extender designed for 4K30 HDMI and USB extension with near-zero latency across a 1G network.",
    io: [
      "HDMI transport",
      "USB transport",
      "Single Cat cable style deployment",
    ],
    connectivity: [
      "IP-based extension",
      "1G network",
      "KVM signal extension",
      "4K30",
    ],
    control: [
      "Network-based deployment",
    ],
    features: [
      "Near-zero latency",
      "Long-range extension",
      "Server / control-room fit",
    ],
    bestFor: [
      "Control rooms",
      "Remote server access",
      "Operator-to-rack workflows",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/ex-100-kvm-ip/",
  },
  {
    sku: "COM-MIC-HUB",
    name: "Microphone Hub",
    family: "Audio",
    category: "Audio Hub",
    role: "Hub",
    status: "current",
    summary:
      "Audio hub with built-in DSP, support for ceiling and wireless microphones, external speaker integration, Web-UI control, and RS-232 control.",
    io: [
      "1x USB-B host",
      "Ceiling mic input",
      "Wireless receiver support",
      "Line out for external amplification",
    ],
    connectivity: [
      "USB host",
      "Audio I/O",
      "External speaker integration",
    ],
    control: [
      "Web-UI",
      "RS-232",
    ],
    features: [
      "Built-in audio DSP",
      "AEC",
      "Noise reduction",
      "AGC",
      "Supports ceiling microphones",
      "Supports wireless microphones",
    ],
    bestFor: [
      "Lecture halls",
      "Training rooms",
      "Boardrooms",
      "Audio collaboration spaces",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/com-mic-hub/",
  },
  {
    sku: "APO-DG2",
    name: "Apollo USB-C Wireless Casting Dongle",
    family: "Apollo",
    category: "Wireless Casting",
    role: "Dongle",
    status: "current",
    summary:
      "USB-C casting dongle compatible with Apollo and presentation-switcher workflows, including SW-640L-TX-W, designed for quick one-touch wireless sharing.",
    io: [
      "Single USB-C connection",
    ],
    connectivity: [
      "USB-C",
      "Wireless casting trigger",
    ],
    control: [
      "Press-to-cast hardware workflow",
    ],
    features: [
      "4K30 casting support",
      "Simple one-touch sharing",
    ],
    bestFor: [
      "Guest presenter workflows",
      "Wireless content sharing",
      "Meeting-room casting add-ons",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/apo-dg2/",
  },
  {
    sku: "MX-0808-H2A-MK2",
    name: "8x8 HDMI Matrix Switches for Ultimate Control",
    family: "Matrix Solutions",
    category: "HDMI Matrix Switcher",
    role: "Matrix",
    status: "current",
    summary:
      "8x8 HDMI matrix with 5K and 1080p output downscaling, ARC support on all outputs, and analog / S-PDIF audio de-embed for mixed-resolution installations.",
    io: [
      "8x8 HDMI matrix",
      "8 HDMI outputs with scaling",
      "Balanced analog audio outputs",
      "Digital S/PDIF audio output",
    ],
    connectivity: [
      "HDMI",
      "ARC",
      "Audio de-embed",
    ],
    control: [
      "CEC passthrough",
      "RS-232 passthrough",
      "IR passthrough",
      "Ethernet passthrough",
    ],
    features: [
      "5K / 1080p downscalers",
      "ARC",
      "Audio de-embed",
      "Mixed-resolution support",
    ],
    bestFor: [
      "Pure HDMI matrix switching",
      "Mixed display resolutions",
      "Smart TV audio return workflows",
    ],
    sourceUrl: "https://www.wyrestorm.com/product/mx-0808-h2a-mk2/",
  },
];

export default WYRESTORM_CATALOG_SEED;