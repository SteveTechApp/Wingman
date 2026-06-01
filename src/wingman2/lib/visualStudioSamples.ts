import type { VisualDiagramModel } from "./visualStudioTypes";

export const visualStudioDiagrams: VisualDiagramModel[] = [
  {
    id: "sports-bar-networkhd",
    title: "Hospitality / Sports Bar AVoIP Direction",
    subtitle: "Flexible multi-screen distribution with visible control and quote checks.",
    kind: "networkhd-topology",
    customerSummary:
      "A flexible AV-over-IP system shape for venues that need different content on multiple screens and future expansion.",
    technicalSummary:
      "Sources are encoded into NetworkHD, routed over the AV network, controlled by NHD-CTL-PRO, and decoded at each display.",
    assumptions: [
      "Multiple displays need independent or grouped source selection.",
      "The venue may need future screen expansion.",
      "Network ownership and switch capability still need to be confirmed."
    ],
    missingInformation: [
      "Exact display count and locations.",
      "Network switch model and VLAN / IGMP support.",
      "Required control method for bar staff."
    ],
    quoteRisks: [
      "Do not quote NetworkHD without confirming the network switch design.",
      "Do not omit the NetworkHD controller.",
      "Confirm whether any screens need audio de-embedding or local amplification."
    ],
    nextActions: [
      "Confirm source count and display count.",
      "Ask who owns the network.",
      "Confirm whether staff need preset buttons, touch control, or third-party control."
    ],
    nodes: [
      { id: "sources", label: "Venue Sources", subtitle: "Sky / signage / media players", kind: "source", status: "normal", column: 0, row: 1 },
      { id: "encoders", label: "NetworkHD Encoders", subtitle: "One per source", kind: "transport", status: "recommended", column: 1, row: 1 },
      { id: "switch", label: "AV Network Switch", subtitle: "IGMP / multicast design required", kind: "network", status: "risk", column: 2, row: 1 },
      { id: "ctl", label: "NHD-CTL-PRO", subtitle: "Required NetworkHD controller", kind: "controller", status: "recommended", column: 2, row: 0 },
      { id: "decoders", label: "NetworkHD Decoders", subtitle: "One per display / output", kind: "transport", status: "recommended", column: 3, row: 1 },
      { id: "displays", label: "Venue Displays", subtitle: "Grouped or independent routing", kind: "display", status: "normal", column: 4, row: 1 },
      { id: "control", label: "Staff Control", subtitle: "Preset routing / touch / third-party", kind: "controller", status: "missing", column: 3, row: 0 }
    ],
    edges: [
      { id: "e1", source: "sources", target: "encoders", label: "HDMI" },
      { id: "e2", source: "encoders", target: "switch", label: "AV-over-IP" },
      { id: "e3", source: "switch", target: "decoders", label: "AV-over-IP" },
      { id: "e4", source: "decoders", target: "displays", label: "HDMI" },
      { id: "e5", source: "ctl", target: "switch", label: "Control" },
      { id: "e6", source: "control", target: "ctl", label: "User presets" }
    ]
  },
  {
    id: "meeting-room-usb",
    title: "Meeting Room USB / BYOD Ownership",
    subtitle: "Shows why conferencing rooms need USB ownership, not just video switching.",
    kind: "usb-conferencing",
    customerSummary:
      "A simplified meeting room view showing how the user connects, presents content, and accesses the room camera and audio devices.",
    technicalSummary:
      "The key design question is USB ownership: whether the laptop, room PC, or UC appliance owns the camera, microphone and speaker path.",
    assumptions: [
      "The room supports BYOD or BYOM working.",
      "A camera and microphone/speaker device are required.",
      "The display path and USB path both need to be designed."
    ],
    missingInformation: [
      "Laptop connection type: USB-C, HDMI plus USB, or wireless.",
      "Camera location and USB distance.",
      "Whether the room has a room PC or appliance."
    ],
    quoteRisks: [
      "Do not recommend an HDMI-only route if the customer expects USB camera and microphone access.",
      "Confirm USB version and distance before selecting extenders or switchers.",
      "Confirm whether the user expects single-cable USB-C."
    ],
    nextActions: [
      "Ask: who owns the meeting â€” user laptop, room PC, or UC appliance?",
      "Confirm camera and microphone model.",
      "Confirm cable distance between table, display and rack."
    ],
    nodes: [
      { id: "laptop", label: "User Laptop", subtitle: "BYOD / BYOM", kind: "source", status: "normal", column: 0, row: 1 },
      { id: "ucswitch", label: "UC / Presentation Switcher", subtitle: "Video plus USB management", kind: "switching", status: "recommended", column: 1, row: 1 },
      { id: "display", label: "Room Display", subtitle: "HDMI / USB-C video path", kind: "display", status: "normal", column: 2, row: 0 },
      { id: "camera", label: "USB Camera", subtitle: "Front of room or PTZ", kind: "camera", status: "missing", column: 2, row: 1 },
      { id: "audio", label: "Microphone / Speaker", subtitle: "USB audio or DSP path", kind: "audio", status: "missing", column: 2, row: 2 },
      { id: "risk", label: "Quote Check", subtitle: "USB distance and ownership required", kind: "warning", status: "risk", column: 3, row: 1 }
    ],
    edges: [
      { id: "e1", source: "laptop", target: "ucswitch", label: "USB-C / HDMI + USB" },
      { id: "e2", source: "ucswitch", target: "display", label: "Video" },
      { id: "e3", source: "camera", target: "ucswitch", label: "USB camera" },
      { id: "e4", source: "audio", target: "ucswitch", label: "USB audio" },
      { id: "e5", source: "ucswitch", target: "risk", label: "Validate" }
    ]
  },
  {
    id: "lcd-video-wall",
    title: "LCD Video Wall Decision Shape",
    subtitle: "Dedicated processor and AVoIP options shown side-by-side.",
    kind: "video-wall",
    customerSummary:
      "A visual decision map showing when a dedicated wall processor is a better fit and when AV-over-IP adds flexibility.",
    technicalSummary:
      "Video wall design must separate full canvas, preset layouts, per-display routing, signage and multiview behaviour.",
    assumptions: [
      "The requirement is an LCD video wall, not an LED wall processor input.",
      "The wall may require either full-canvas or mixed-layout behaviour.",
      "The control requirement is not yet confirmed."
    ],
    missingInformation: [
      "Wall layout: 2x2, 3x3, 1x3, 4x2 or other.",
      "Whether the customer needs full canvas, presets, per-display content or mixed layouts.",
      "Number of sources and whether they are local or remote."
    ],
    quoteRisks: [
      "Do not assume AV-over-IP is automatically the best answer.",
      "Confirm whether the displays support the desired wall behaviour.",
      "Confirm bezel compensation, scaling and control expectations."
    ],
    nextActions: [
      "Confirm wall size and behaviour.",
      "Confirm source count.",
      "Choose between SW-0204-VW, SW-0206-VW, matrix/SCL or NetworkHD architecture."
    ],
    nodes: [
      { id: "requirement", label: "Video Wall Requirement", subtitle: "Layout and behaviour first", kind: "customer", status: "normal", column: 0, row: 1 },
      { id: "simple", label: "Simple Preset Wall", subtitle: "Basic wall layouts", kind: "processor", status: "optional", column: 1, row: 0 },
      { id: "advanced", label: "Advanced Processor", subtitle: "SW-0206-VW direction", kind: "processor", status: "recommended", column: 1, row: 1 },
      { id: "avoip", label: "Flexible AVoIP Wall", subtitle: "NetworkHD where routing/scale demands it", kind: "network", status: "optional", column: 1, row: 2 },
      { id: "outputs", label: "Wall Displays", subtitle: "Each display input must be planned", kind: "display", status: "normal", column: 2, row: 1 },
      { id: "control", label: "Control Method", subtitle: "Presets / touch / third-party", kind: "controller", status: "missing", column: 3, row: 1 }
    ],
    edges: [
      { id: "e1", source: "requirement", target: "simple", label: "Preset/simple" },
      { id: "e2", source: "requirement", target: "advanced", label: "Advanced wall control" },
      { id: "e3", source: "requirement", target: "avoip", label: "Distributed/flexible" },
      { id: "e4", source: "simple", target: "outputs", label: "HDMI outputs" },
      { id: "e5", source: "advanced", target: "outputs", label: "Processed wall outputs" },
      { id: "e6", source: "avoip", target: "outputs", label: "Decoder per display" },
      { id: "e7", source: "outputs", target: "control", label: "User operation" }
    ]
  },
  {
    id: "proposal-overview",
    title: "Proposal System Overview",
    subtitle: "Customer-safe summary visual for a first-pass proposal.",
    kind: "proposal-overview",
    customerSummary:
      "A clean proposal graphic showing the customer requirement, recommended system shape, benefits and remaining checks.",
    technicalSummary:
      "This is not a final engineering schematic. It is a proposal overview that keeps assumptions and quote risks visible.",
    assumptions: [
      "The design is at proposal starter stage.",
      "Final product quantities depend on confirmed sources, displays, cable paths and control needs.",
      "Pre-sales review is still required for complex projects."
    ],
    missingInformation: [
      "Final cable distances.",
      "Control method.",
      "Network ownership and switch detail where AV-over-IP is used."
    ],
    quoteRisks: [
      "Do not use this visual as a final quote without validating product quantities.",
      "Confirm all required receivers, controllers, accessories and project dependencies.",
      "Confirm audio, USB and control paths."
    ],
    nextActions: [
      "Review missing information with the customer or integrator.",
      "Confirm product quantities.",
      "Generate proposal wording once the design risk is acceptable."
    ],
    nodes: [
      { id: "need", label: "Customer Need", subtitle: "Application and outcome", kind: "customer", status: "normal", column: 0, row: 1 },
      { id: "direction", label: "Recommended Direction", subtitle: "WyreStorm-first architecture", kind: "switching", status: "recommended", column: 1, row: 1 },
      { id: "system", label: "System Shape", subtitle: "Video / audio / USB / control", kind: "transport", status: "recommended", column: 2, row: 1 },
      { id: "benefits", label: "Customer Benefits", subtitle: "Clearer, safer solution story", kind: "output", status: "normal", column: 3, row: 0 },
      { id: "checks", label: "Quote Checks", subtitle: "Missing information remains visible", kind: "warning", status: "risk", column: 3, row: 2 }
    ],
    edges: [
      { id: "e1", source: "need", target: "direction", label: "Discovery" },
      { id: "e2", source: "direction", target: "system", label: "Product family" },
      { id: "e3", source: "system", target: "benefits", label: "Proposal value" },
      { id: "e4", source: "system", target: "checks", label: "Validation" }
    ]
  }
];

export function getVisualDiagramById(id: string): VisualDiagramModel {
  const match = visualStudioDiagrams.find((diagram) => diagram.id === id);

  if (match) {
    return match;
  }

  return visualStudioDiagrams[0];
}