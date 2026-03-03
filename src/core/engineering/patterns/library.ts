import type { TopologyGraph } from "../types";

export type PatternTemplate = {
  id: string;
  name: string;
  roles: string[]; // role ids used by the binder
  topology: TopologyGraph;
};

export const PATTERN_A_BASIC_PRESENTATION: PatternTemplate = {
  id: "PATTERN_A_BASIC_PRESENTATION",
  name: "Pattern A: Basic Presentation (1 display)",
  roles: ["presentation_switcher", "transport_or_direct_link", "display_endpoint"],
  topology: {
    nodes: [
      { id: "src_laptops", type: "source", role: "source_pool", label: "Sources (laptops/PCs)" },
      { id: "sw", type: "processor", role: "presentation_switcher", label: "Presentation switcher" },
      { id: "link", type: "transport", role: "transport_or_direct_link", label: "Link (HDMI/HDBaseT/AVoIP)" },
      { id: "disp1", type: "display", role: "display_endpoint", label: "Display 1" }
    ],
    edges: [
      { from: "src_laptops", to: "sw", signal: "video" },
      { from: "sw", to: "link", signal: "video" },
      { from: "link", to: "disp1", signal: "video" }
    ]
  }
};

export const PATTERN_B_DUAL_DISPLAY_VC_BYOD: PatternTemplate = {
  id: "PATTERN_B_DUAL_DISPLAY_VC_BYOD",
  name: "Pattern B: Dual Display + VC + BYOD",
  roles: [
    "presentation_switcher_dual_out",
    "usb_switching_bridging",
    "transport_to_displays",
    "display_endpoint_1",
    "display_endpoint_2",
    "camera_peripherals_integration"
  ],
  topology: {
    nodes: [
      { id: "src_laptops", type: "source", role: "source_pool", label: "Sources (laptops/PCs/BYOD)" },
      { id: "sw", type: "processor", role: "presentation_switcher_dual_out", label: "Dual-output switcher / routing core" },
      { id: "usb", type: "processor", role: "usb_switching_bridging", label: "USB switching/bridging" },
      { id: "linkA", type: "transport", role: "transport_to_displays", label: "Transport to Displays" },
      { id: "disp1", type: "display", role: "display_endpoint_1", label: "Display 1 (Main)" },
      { id: "disp2", type: "display", role: "display_endpoint_2", label: "Display 2 (Content)" },
      { id: "vc", type: "processor", role: "camera_peripherals_integration", label: "VC peripherals (camera/audio)" }
    ],
    edges: [
      { from: "src_laptops", to: "sw", signal: "video" },
      { from: "sw", to: "linkA", signal: "video" },
      { from: "linkA", to: "disp1", signal: "video" },
      { from: "linkA", to: "disp2", signal: "video" },
      { from: "src_laptops", to: "usb", signal: "usb" },
      { from: "usb", to: "vc", signal: "usb" }
    ]
  }
};

export const PATTERNS: PatternTemplate[] = [
  PATTERN_A_BASIC_PRESENTATION,
  PATTERN_B_DUAL_DISPLAY_VC_BYOD
];

export function getPatternById(id: string): PatternTemplate | undefined {
  return PATTERNS.find(p => p.id === id);
}