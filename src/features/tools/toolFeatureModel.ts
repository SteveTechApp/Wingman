import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderPlus,
  GraduationCap,
  LayoutTemplate,
  MonitorSmartphone,
  Scale,
  Shield,
} from "lucide-react";

export type WingmanItemKind = "tool" | "feature";

export type WingmanItem = {
  id: string;
  title: string;
  description: string;
  kind: WingmanItemKind;
  to: string;
  tag?: string;
  highlight?: string;
  accentRgb: string;
  Icon: LucideIcon;
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
    accentRgb: "94,234,212",
    Icon: Briefcase,
  },
  {
    id: "catalogue",
    title: "Product Catalogue",
    description: "Browse WyreStorm products, key specifications, and product families.",
    kind: "tool",
    to: "/app/tools/catalog",
    tag: "Reference",
    highlight: "Browse products",
    accentRgb: "125,211,252",
    Icon: Boxes,
  },
  {
    id: "videowall",
    title: "Video Wall Designer",
    description: "Plan LCD and LED wall layouts, sizing, and supporting architecture.",
    kind: "tool",
    to: "/app/tools/video-wall",
    tag: "Design Utility",
    highlight: "Size and configure walls",
    accentRgb: "251,191,36",
    Icon: MonitorSmartphone,
  },
  {
    id: "competitor-compare",
    title: "Competitor Comparison",
    description: "Compare WyreStorm against other brands to support commercial positioning.",
    kind: "tool",
    to: "/app/tools/compare",
    tag: "Sales Utility",
    highlight: "Position against competitors",
    accentRgb: "244,114,182",
    Icon: Scale,
  },
  {
    id: "runtime-diagnostics",
    title: "Runtime Diagnostics",
    description: "Review recent runtime errors and clear diagnostics data during support workflows.",
    kind: "tool",
    to: "/app/tools/runtime-diagnostics",
    tag: "Support",
    highlight: "Inspect recent runtime errors",
    accentRgb: "192,132,252",
    Icon: Shield,
  },
  {
    id: "competitor-lookup-diagnostics",
    title: "Lookup Diagnostics",
    description: "Inspect competitor lookup cache/provenance entries and verify backend contract health.",
    kind: "tool",
    to: "/app/tools/competitor-lookup-diagnostics",
    tag: "Support",
    highlight: "Inspect lookup pipeline",
    accentRgb: "192,132,252",
    Icon: ClipboardList,
  },
  {
    id: "product-intelligence",
    title: "Product Intelligence",
    description: "Review canonical WyreStorm and competitor records with confidence, evidence, and approval state.",
    kind: "tool",
    to: "/app/tools/product-intelligence",
    tag: "Support",
    highlight: "Approve trusted product data",
    accentRgb: "74,222,128",
    Icon: Boxes,
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
    accentRgb: "96,165,250",
    Icon: FolderPlus,
  },
  {
    id: "discovery",
    title: "Guided Project",
    description: "Capture customer needs, room dynamics, and signal-path decisions without overwhelming the conversation.",
    kind: "feature",
    to: "/app/tools/discovery",
    tag: "Workflow",
    highlight: "Guide the opportunity",
    accentRgb: "94,234,212",
    Icon: ClipboardList,
  },
  {
    id: "templates",
    title: "Templates",
    description: "Start from proven room and system templates to accelerate proposal creation.",
    kind: "feature",
    to: "/app/tools/templates",
    tag: "Workflow",
    highlight: "Use a proven starting point",
    accentRgb: "251,191,36",
    Icon: LayoutTemplate,
  },
  {
    id: "room-designer",
    title: "Room Designer",
    description: "Build a more tailored design when the project needs a custom approach.",
    kind: "feature",
    to: "/app/tools/room-wizard",
    tag: "Workflow",
    highlight: "Create a custom design",
    accentRgb: "244,114,182",
    Icon: MonitorSmartphone,
  },
  {
    id: "proposal-builder",
    title: "Proposal Builder",
    description: "Turn the selected solution into a structured project output and proposal pack.",
    kind: "feature",
    to: "/app/tools/proposal",
    tag: "Output",
    highlight: "Generate deliverables",
    accentRgb: "129,140,248",
    Icon: FileText,
  },
  {
    id: "completion-workflow",
    title: "Completion Workflow",
    description: "Run the final handoff gate, log assumptions, and mark the active project commercially ready.",
    kind: "feature",
    to: "/app/workflow/completion",
    tag: "Output",
    highlight: "Final readiness gate",
    accentRgb: "248,196,113",
    Icon: ClipboardCheck,
  },
  {
    id: "training",
    title: "Training Hub",
    description: "Build knowledge and confidence across products, positioning, and AV design.",
    kind: "feature",
    to: "/app/tools/training",
    tag: "Enablement",
    highlight: "Learn as you go",
    accentRgb: "167,139,250",
    Icon: GraduationCap,
  },
];
