export type WingmanItemKind = "tool" | "feature";

export type WingmanItem = {
  id: string;
  title: string;
  description: string;
  kind: WingmanItemKind;
  to: string;
  tag?: string;
  highlight?: string;
};

export const WINGMAN_TOOLS: WingmanItem[] = [
  {
    id: "guru",
    title: "Guru",
    description: "Get guided AV advice, product direction, and technical support during a project.",
    kind: "tool",
    to: "/app/tools/guru",
    tag: "Advisor",
    highlight: "Ask Wingman anything",
  },
  {
    id: "catalogue",
    title: "Product Catalogue",
    description: "Browse WyreStorm products, key specifications, and product families.",
    kind: "tool",
    to: "/app/tools/catalog",
    tag: "Reference",
    highlight: "Browse products",
  },
  {
    id: "videowall",
    title: "Video Wall Designer",
    description: "Plan LCD and LED wall layouts, sizing, and supporting architecture.",
    kind: "tool",
    to: "/app/tools/video-wall",
    tag: "Design Utility",
    highlight: "Size and configure walls",
  },
  {
    id: "competitor-compare",
    title: "Competitor Comparison",
    description: "Compare WyreStorm against other brands to support commercial positioning.",
    kind: "tool",
    to: "/app/tools/compare",
    tag: "Sales Utility",
    highlight: "Position against competitors",
  },
  {
    id: "runtime-diagnostics",
    title: "Runtime Diagnostics",
    description: "Review recent runtime errors and clear diagnostics data during support workflows.",
    kind: "tool",
    to: "/app/tools/runtime-diagnostics",
    tag: "Support",
    highlight: "Inspect recent runtime errors",
  },
];

export const WINGMAN_FEATURES: WingmanItem[] = [
  {
    id: "start-project",
    title: "Start New Project",
    description: "Create a project and choose the best starting path for the opportunity.",
    kind: "feature",
    to: "/app/projects/new",
    tag: "Primary",
    highlight: "Best place to start",
  },
  {
    id: "discovery",
    title: "Discovery Wizard",
    description: "Capture customer requirements and steer toward the right solution path.",
    kind: "feature",
    to: "/app/tools/discovery",
    tag: "Workflow",
    highlight: "Gather requirements",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Start from proven room and system templates to accelerate proposal creation.",
    kind: "feature",
    to: "/app/tools/templates",
    tag: "Workflow",
    highlight: "Use a proven starting point",
  },
  {
    id: "room-designer",
    title: "Room Designer",
    description: "Build a more tailored design when the project needs a custom approach.",
    kind: "feature",
    to: "/app/tools/room-wizard",
    tag: "Workflow",
    highlight: "Create a custom design",
  },
  {
    id: "proposal-builder",
    title: "Proposal Builder",
    description: "Turn the selected solution into a structured project output and proposal pack.",
    kind: "feature",
    to: "/app/tools/proposal",
    tag: "Output",
    highlight: "Generate deliverables",
  },
  {
    id: "training",
    title: "Training Hub",
    description: "Build knowledge and confidence across products, positioning, and AV design.",
    kind: "feature",
    to: "/app/tools/training",
    tag: "Enablement",
    highlight: "Learn as you go",
  },
];
