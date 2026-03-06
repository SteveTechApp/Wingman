import * as React from "react";

export type TrainingLesson = {
  id: string;
  title: string;
  minutes: number;
  bullets: string[];
  resources?: { label: string; href?: string }[];
};

export type TrainingModule = {
  id: string;
  title: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  track: "Sales" | "Design" | "Products" | "Tools";
  description: string;
  lessons: TrainingLesson[];
};

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "m01-av-basics",
    title: "AV Basics for Sales",
    level: "Foundation",
    track: "Sales",
    description: "Core terminology and signal flow you need for confident discovery and qualification.",
    lessons: [
      {
        id: "l01-signals",
        title: "Signals & Resolutions (HDMI, 4K60, 4:4:4)",
        minutes: 12,
        bullets: [
          "Resolution vs refresh rate vs chroma sampling",
          "Bandwidth: why 4K60 4:4:4 is a common breakpoint",
          "Common customer pitfalls and how to explain them simply"
        ]
      },
      {
        id: "l02-hdbt-avoverip",
        title: "HDBaseT vs AV over IP",
        minutes: 14,
        bullets: [
          "When point-to-point is the right answer",
          "When switching/scaling/multiview becomes the decision driver",
          "How to ask the right questions to avoid redesign later"
        ]
      }
    ]
  },
  {
    id: "m02-discovery",
    title: "Customer Discovery That Converts",
    level: "Foundation",
    track: "Sales",
    description: "A structured approach to site survey questions that reliably produce the correct BOM.",
    lessons: [
      {
        id: "l01-room-type",
        title: "Room Type, Use Case & Workflow",
        minutes: 10,
        bullets: [
          "Meeting room vs training room vs divisible spaces",
          "BYOD expectations and laptop connectivity patterns",
          "Decision tree: what changes the design most"
        ]
      },
      {
        id: "l02-io-count",
        title: "Inputs/Outputs & Display Count",
        minutes: 11,
        bullets: [
          "How to avoid under-spec switching",
          "Mirroring vs matrixing vs multiview",
          "Future proofing: spare ports without overselling"
        ]
      }
    ]
  },
  {
    id: "m03-products-synergy",
    title: "Presentation Switching (Synergy class)",
    level: "Intermediate",
    track: "Products",
    description: "Positioning and configuration patterns for modern USB-C/HDMI presentation switchers.",
    lessons: [
      {
        id: "l01-usbc",
        title: "USB-C MST, Power Delivery, USB Bridge",
        minutes: 14,
        bullets: [
          "PD sizing and real-world laptop behaviour",
          "MST vs single stream outputs",
          "USB device sharing expectations (and gotchas)"
        ]
      },
      {
        id: "l02-wireless",
        title: "Wireless Presentation & Conferencing",
        minutes: 12,
        bullets: [
          "When to recommend wireless vs wired",
          "Network considerations to avoid callbacks",
          "Explain to customers without deep jargon"
        ]
      }
    ]
  },
  {
    id: "m04-videowalls",
    title: "Video Walls: LED vs LCD",
    level: "Intermediate",
    track: "Design",
    description: "A practical design guide: pixel pitch, processors, multiview, and what products are needed.",
    lessons: [
      {
        id: "l01-led",
        title: "LED Walls (pixel pitch, processors, inputs)",
        minutes: 16,
        bullets: [
          "Pixel pitch tradeoffs: 0.9 vs 1.2 vs 1.5",
          "Why processors often need multiple HDMI inputs",
          "How to explain 'canvas resolution' to a customer"
        ]
      },
      {
        id: "l02-lcd",
        title: "LCD Walls (2x2 / 3x3 / 4x4 arrays)",
        minutes: 13,
        bullets: [
          "Bezel considerations and mounting realities",
          "Controller/multiview strategies",
          "When a big single display beats a wall"
        ]
      }
    ]
  },
  {
    id: "m05-wingman-tools",
    title: "Using Wingman Tools Effectively",
    level: "Foundation",
    track: "Tools",
    description: "How to use Tool Hub modules to produce proposals fast and consistently.",
    lessons: [
      {
        id: "l01-boms",
        title: "From Discovery to BOM",
        minutes: 10,
        bullets: [
          "Start with Room Wizard â†’ validate IO â†’ select switching",
          "Add ancillaries: cabling, mounts, project mgmt",
          "Export proposal and review risks"
        ]
      },
      {
        id: "l02-competitors",
        title: "Competitor Positioning",
        minutes: 9,
        bullets: [
          "Ask: what problem are they solving?",
          "Map equivalents by feature class, not part number",
          "Keep it customer-centric and outcome based"
        ]
      }
    ]
  }
];