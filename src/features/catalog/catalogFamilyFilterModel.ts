export type SolutionFamily =
  | "avoip"
  | "matrix"
  | "presentation"
  | "extender"
  | "videoWall"
  | "audio"
  | "control"
  | "accessory";

export type FamilyFilterOption = {
  id: string;
  label: string;
  aliases?: string[];
};

export type FamilyFilterGroup =
  | {
      id: string;
      label: string;
      type: "single";
      options: FamilyFilterOption[];
    }
  | {
      id: string;
      label: string;
      type: "multi";
      options: FamilyFilterOption[];
    };

export type FamilyDefinition = {
  id: SolutionFamily;
  label: string;
  description: string;
  groups: FamilyFilterGroup[];
};

export type CatalogueFilterState = {
  family: SolutionFamily | null;
  selected: Record<string, string[]>;
  search: string;
};

export type CatalogueProductRecord = {
  sku: string;
  name: string;
  family?: string | null;
  series?: string | null;
  role?: string | null;
  matrixType?: string | null;
  presentationType?: string | null;
  extenderType?: string | null;
  videoWallType?: string | null;
  audioType?: string | null;
  controlType?: string | null;
  featureTags?: string[] | null;
  applicationTags?: string[] | null;
  mountTags?: string[] | null;
  searchText?: string | null;
};

export const SOLUTION_FAMILIES: FamilyDefinition[] = [
  {
    id: "avoip",
    label: "AVoIP",
    description: "NetworkHD encoders, decoders, transceivers, controllers and AV-over-IP workflows.",
    groups: [
      {
        id: "series",
        label: "Series",
        type: "single",
        options: [
          { id: "nhd-100", label: "NetworkHD 100", aliases: ["100", "nhd100", "networkhd100"] },
          { id: "nhd-500", label: "NetworkHD 500", aliases: ["500", "nhd500", "networkhd500"] },
          { id: "nhd-600", label: "NetworkHD 600", aliases: ["600", "nhd600", "networkhd600"] }
        ]
      },
      {
        id: "role",
        label: "Device Role",
        type: "multi",
        options: [
          { id: "encoder", label: "Encoder" },
          { id: "decoder", label: "Decoder" },
          { id: "transceiver", label: "Transceiver", aliases: ["trx"] },
          { id: "controller", label: "Controller" },
          { id: "multiview", label: "Multiview" },
          { id: "usb", label: "USB over IP", aliases: ["usb"] }
        ]
      },
      {
        id: "features",
        label: "Key Capabilities",
        type: "multi",
        options: [
          { id: "1g", label: "1G" },
          { id: "10g", label: "10G" },
          { id: "usb-c", label: "USB-C" },
          { id: "dante", label: "Dante / AES67", aliases: ["aes67"] },
          { id: "video-wall", label: "Video Wall" },
          { id: "multiview", label: "Multiview" },
          { id: "fiber", label: "Fiber" },
          { id: "poe", label: "PoE / PoE+" }
        ]
      },
      {
        id: "applications",
        label: "Application",
        type: "multi",
        options: [
          { id: "meeting-room", label: "Meeting Room" },
          { id: "control-room", label: "Control Room" },
          { id: "campus", label: "Campus Distribution" },
          { id: "video-wall", label: "Video Wall" },
          { id: "led", label: "LED Wall" }
        ]
      }
    ]
  },
  {
    id: "matrix",
    label: "Matrix",
    description: "HDMI, HDBaseT, seamless and hybrid matrix switching platforms.",
    groups: [
      {
        id: "matrixType",
        label: "Matrix Type",
        type: "multi",
        options: [
          { id: "hdmi-matrix", label: "HDMI Matrix" },
          { id: "hdbaset-matrix", label: "HDBaseT Matrix", aliases: ["hdbt"] },
          { id: "seamless-matrix", label: "Seamless Matrix" },
          { id: "hybrid-matrix", label: "Hybrid Matrix" }
        ]
      },
      {
        id: "io",
        label: "I/O Size",
        type: "multi",
        options: [
          { id: "4x4", label: "4x4" },
          { id: "8x8", label: "8x8" },
          { id: "8x12", label: "8x12" },
          { id: "10x7", label: "10x7" },
          { id: "16x16", label: "16x16" }
        ]
      },
      {
        id: "features",
        label: "Key Capabilities",
        type: "multi",
        options: [
          { id: "seamless", label: "Seamless Switching" },
          { id: "usb-c", label: "USB-C" },
          { id: "hdbaset-out", label: "HDBaseT Output" },
          { id: "avoip-integration", label: "AVoIP Integration" },
          { id: "dante", label: "Dante" },
          { id: "multiview", label: "Multiview" },
          { id: "video-wall", label: "Video Wall" }
        ]
      },
      {
        id: "applications",
        label: "Application",
        type: "multi",
        options: [
          { id: "meeting-room", label: "Meeting Room" },
          { id: "lecture-room", label: "Lecture Room" },
          { id: "large-space", label: "Large Venue" },
          { id: "multi-display", label: "Multi-display Distribution" }
        ]
      }
    ]
  },
  {
    id: "presentation",
    label: "Presentation",
    description: "Presentation switchers, wireless collaboration and BYOD/BYOM platforms.",
    groups: [
      {
        id: "presentationType",
        label: "Presentation Type",
        type: "multi",
        options: [
          { id: "presentation-switcher", label: "Presentation Switcher" },
          { id: "wireless-presentation", label: "Wireless Presentation" },
          { id: "conference-switcher", label: "Conference Switcher" }
        ]
      },
      {
        id: "features",
        label: "Key Capabilities",
        type: "multi",
        options: [
          { id: "usb-c", label: "USB-C" },
          { id: "wireless-casting", label: "Wireless Casting" },
          { id: "wireless-conferencing", label: "Wireless Conferencing" },
          { id: "mst", label: "MST" },
          { id: "dante", label: "Dante" },
          { id: "dsp", label: "DSP" }
        ]
      }
    ]
  },
  {
    id: "extender",
    label: "Extender",
    description: "Point-to-point extension products for HDMI, USB and AV transport.",
    groups: [
      {
        id: "extenderType",
        label: "Extender Type",
        type: "multi",
        options: [
          { id: "hdbaset-extender", label: "HDBaseT Extender" },
          { id: "usb-extender", label: "USB Extender" },
          { id: "hdmi-extender", label: "HDMI Extender" },
          { id: "audio-extender", label: "Audio Device" }
        ]
      },
      {
        id: "features",
        label: "Key Capabilities",
        type: "multi",
        options: [
          { id: "4k", label: "4K" },
          { id: "usb", label: "USB" },
          { id: "rs232", label: "RS-232" },
          { id: "ir", label: "IR" },
          { id: "poh", label: "PoH" }
        ]
      }
    ]
  },
  {
    id: "videoWall",
    label: "Video Wall",
    description: "Dedicated video wall processors and video wall capable platforms.",
    groups: [
      {
        id: "videoWallType",
        label: "Video Wall Type",
        type: "multi",
        options: [
          { id: "processor", label: "Processor" },
          { id: "avoip-wall", label: "AVoIP Video Wall" },
          { id: "multiview-wall", label: "Multiview-based Wall" }
        ]
      },
      {
        id: "features",
        label: "Key Capabilities",
        type: "multi",
        options: [
          { id: "bezel-comp", label: "Bezel Compensation" },
          { id: "rotation", label: "Rotation" },
          { id: "custom-layout", label: "Custom Layout" },
          { id: "4k60", label: "4K60" }
        ]
      }
    ]
  },
  {
    id: "audio",
    label: "Audio",
    description: "Amplifiers, microphones and audio accessories for meeting and teaching spaces.",
    groups: [
      {
        id: "audioType",
        label: "Audio Type",
        type: "multi",
        options: [
          { id: "dante-amplifier", label: "Dante Amplifier" },
          { id: "microphone-hub", label: "Microphone Hub" },
          { id: "mic", label: "Microphone" },
          { id: "de-embedder", label: "Audio De-Embedder" }
        ]
      }
    ]
  },
  {
    id: "control",
    label: "Control",
    description: "Touch panels, keypads and protocol control products.",
    groups: [
      {
        id: "controlType",
        label: "Control Type",
        type: "multi",
        options: [
          { id: "touch-panel", label: "Touch Panel" },
          { id: "keypad", label: "Keypad" },
          { id: "protocol-converter", label: "Protocol Converter" },
          { id: "controller", label: "Controller" }
        ]
      }
    ]
  },
  {
    id: "accessory",
    label: "Accessories",
    description: "Mounting, docking, dongles and supporting add-on products.",
    groups: [
      {
        id: "accessoryType",
        label: "Accessory Type",
        type: "multi",
        options: [
          { id: "matrix-dock", label: "Matrix Dock" },
          { id: "dongle", label: "Dongle" },
          { id: "dock", label: "Dock" },
          { id: "mounting", label: "Mounting" }
        ]
      }
    ]
  }
];

export const EMPTY_CATALOGUE_FILTER_STATE: CatalogueFilterState = {
  family: null,
  selected: {},
  search: ""
};