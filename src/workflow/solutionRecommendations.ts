import { getActiveWorkflowProject } from "./workflowStore";
import { buildArchitectureRecommendation } from "./architectureRecommendations";

export type StarterBomItem = {
  category: string;
  recommendation: string;
  quantityHint: string;
  note: string;
};

export type SolutionRecommendation = {
  platform: string;
  topology: string;
  confidence: "Low" | "Medium" | "High";
  summary: string;
  families: string[];
  buildingBlocks: string[];
  starterBom: StarterBomItem[];
  commercialNotes: string[];
};

function boolText(value: boolean | undefined, yes: string): string[] {
  return value ? [yes] : [];
}

export function buildSolutionRecommendation(
  active = getActiveWorkflowProject()
): SolutionRecommendation {
  const architecture = buildArchitectureRecommendation(active);

  if (!active || !architecture.primary) {
    return {
      platform: "No recommendation yet",
      topology: "Awaiting active project data",
      confidence: "Low",
      summary: "Complete discovery and set an active project before generating a WyreStorm solution path.",
      families: [],
      buildingBlocks: [],
      starterBom: [],
      commercialNotes: [
        "Set or create an active project in Mission Control.",
        "Capture source count, display count, and distance in Discovery.",
      ],
    };
  }

  const sources = active.sources ?? 0;
  const displays = active.displays ?? 0;
  const distance = active.distanceM ?? 0;

  if (architecture.primary === "Video Wall") {
    return {
      platform: "WyreStorm video wall workflow",
      topology: "Processor-led multi-display presentation system",
      confidence: architecture.confidence,
      summary: "The project suits a presentation-led video wall architecture with distribution, processing, and display coordination.",
      families: ["Video Wall", "Distribution", "Control", ...boolText(active.audio, "Audio")],
      buildingBlocks: [
        "Video wall processor or presentation processor",
        "Input switching layer",
        "Display endpoints or wall feed outputs",
        "Control integration",
        ...boolText(active.audio, "Audio breakout / DSP path"),
      ],
      starterBom: [
        {
          category: "Processing",
          recommendation: "Video wall or presentation processor",
          quantityHint: "1",
          note: "Confirm layout, sources, and canvas behaviour first.",
        },
        {
          category: "Inputs",
          recommendation: "Source input / switching layer",
          quantityHint: "Match source count",
          note: "Scale to actual source quantity.",
        },
        {
          category: "Outputs",
          recommendation: "Wall feed outputs / distribution endpoints",
          quantityHint: "Match display or wall zone count",
          note: "Depends on wall layout and content mapping.",
        },
        {
          category: "Control",
          recommendation: "Control gateway / room control layer",
          quantityHint: "1",
          note: "Include if preset recall or user control is required.",
        },
      ],
      commercialNotes: [
        "Confirm wall layout and bezel/pixel strategy before final product selection.",
        "Treat processing and content presentation as the lead decision, not just transport.",
      ],
    };
  }

  if (architecture.primary === "AVoIP") {
    return {
      platform: "WyreStorm NetworkHD-style AVoIP workflow",
      topology: "Network-distributed AV over IP architecture",
      confidence: architecture.confidence,
      summary: "The project leans toward distributed AV transport across multiple endpoints or longer-distance zones.",
      families: ["AVoIP", "Encoders", "Decoders", "Network Switching", ...boolText(active.usb, "USB"), ...boolText(active.control, "Control")],
      buildingBlocks: [
        "AV over IP encoders",
        "AV over IP decoders",
        "Managed network switching",
        "Control / routing layer",
        ...boolText(active.usb, "USB extension path"),
        ...boolText(active.audio, "Audio breakout or DSP path"),
      ],
      starterBom: [
        {
          category: "Encoding",
          recommendation: "AVoIP encoder endpoints",
          quantityHint: "Match source count",
          note: "One encoder per source in most straightforward designs.",
        },
        {
          category: "Decoding",
          recommendation: "AVoIP decoder endpoints",
          quantityHint: "Match display count",
          note: "Scale per display or destination endpoint.",
        },
        {
          category: "Networking",
          recommendation: "Managed switch / switching fabric",
          quantityHint: "1+",
          note: "Confirm multicast, VLAN, bandwidth, and endpoint count.",
        },
        {
          category: "Control",
          recommendation: "AV routing / control layer",
          quantityHint: "1",
          note: "Needed for user workflow and source routing.",
        },
      ],
      commercialNotes: [
        "Best suited to larger endpoint counts, multi-room distribution, or extended distances.",
        "Network assumptions must be validated before final BOM sign-off.",
      ],
    };
  }

  if (architecture.primary === "Matrix Switching") {
    return {
      platform: "WyreStorm matrix switching workflow",
      topology: "Central switch with distributed endpoints",
      confidence: architecture.confidence,
      summary: "The project suits a switching-led architecture where routing flexibility is central to the design.",
      families: ["Matrix Switching", "Transmitters", "Receivers", ...boolText(active.usb, "USB"), ...boolText(active.control, "Control")],
      buildingBlocks: [
        "Central matrix switch",
        "Input transmitters where required",
        "Output receivers where required",
        ...boolText(active.usb, "USB extension pair or switching-capable USB layer"),
        ...boolText(active.audio, "Audio de-embed / amplify path"),
      ],
      starterBom: [
        {
          category: "Switching",
          recommendation: "Central matrix chassis",
          quantityHint: "1",
          note: "Choose size from actual source/display count with headroom.",
        },
        {
          category: "Inputs",
          recommendation: "Source transmitters or local inputs",
          quantityHint: "Match source count",
          note: "Depends on where sources are physically located.",
        },
        {
          category: "Outputs",
          recommendation: "Display receivers or local outputs",
          quantityHint: "Match display count",
          note: "Depends on destination distance and endpoint style.",
        },
        {
          category: "Control",
          recommendation: "Control / UI interface",
          quantityHint: "1",
          note: "Include user routing and room operation requirements.",
        },
      ],
      commercialNotes: [
        "Good fit where routing flexibility matters more than network-scale distribution.",
        "Validate growth headroom before fixing matrix size.",
      ],
    };
  }

  return {
    platform: "WyreStorm HDBaseT extension workflow",
    topology: distance > 0 && distance <= 70
      ? "Point-to-point or small switched HDBaseT distribution"
      : "Moderate-distance extension architecture",
    confidence: architecture.confidence,
    summary: "The project suits an HDBaseT-led architecture with focused extension, switching, and room control.",
    families: ["HDBaseT", "Transmitters", "Receivers", ...boolText(active.usb, "USB"), ...boolText(active.control, "Control")],
    buildingBlocks: [
      "HDBaseT transmitters",
      "HDBaseT receivers",
      "Switching or presentation input layer",
      ...boolText(active.usb, "USB extension path"),
      ...boolText(active.audio, "Audio integration path"),
      ...boolText(active.control, "Control layer"),
    ],
    starterBom: [
      {
        category: "Extension",
        recommendation: "HDBaseT transmitter/receiver endpoints",
        quantityHint: `${Math.max(sources, 1)} source-side / ${Math.max(displays, 1)} display-side`,
        note: "Final count depends on switching topology and endpoint locations.",
      },
      {
        category: "Switching",
        recommendation: sources > 1 || displays > 1 ? "Presentation switcher or matrix layer" : "Direct extension path",
        quantityHint: "1",
        note: "Needed where local switching or source selection is required.",
      },
      {
        category: "USB",
        recommendation: active.usb ? "USB extension support" : "Not primary",
        quantityHint: active.usb ? "As required" : "-",
        note: active.usb ? "Confirm host/device roles and BYOD/camera scope." : "Add later only if collaboration peripherals are required.",
      },
      {
        category: "Control",
        recommendation: active.control ? "Room control / trigger / API layer" : "Basic operation",
        quantityHint: "1",
        note: active.control ? "Confirm touch, button, or automation workflow." : "Can remain minimal if no room automation is needed.",
      },
    ],
    commercialNotes: [
      "Strong fit for moderate distance and contained room scope.",
      sources > 3 || displays > 3
        ? "Recheck whether matrix or AVoIP becomes commercially cleaner as scale grows."
        : "Simple, lower-complexity architecture may support a faster sales cycle.",
    ],
  };
}