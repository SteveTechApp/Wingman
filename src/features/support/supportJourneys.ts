import { WM_ROUTES } from "@/core/wingman/routeMap";
import type { GuruMode } from "@/features/ai/guru/guruService";
import type { StoredProject } from "@/features/projects/projectStore";
import type { TrainingModule } from "@/training/trainingModules";

export type SupportJourneyCategory = "Learn" | "Recommend" | "Review" | "Fix" | "Workflow";

export type SupportJourney = {
  id: string;
  category: SupportJourneyCategory;
  title: string;
  summary: string;
  detail: string;
  guruMode: GuruMode;
  starterQuestion: string;
  prompts: string[];
  moduleTracks: TrainingModule["track"][];
  bestFor: string[];
  nextTool: {
    label: string;
    route: string;
  };
};

export const SUPPORT_JOURNEYS: SupportJourney[] = [
  {
    id: "av-basics",
    category: "Learn",
    title: "Explain AV simply",
    summary: "Use this when you need plain-English AV guidance for discovery calls, customer conversations, or onboarding.",
    detail: "This path keeps the language simple first, then adds just enough technical context to support a recommendation.",
    guruMode: "training",
    starterQuestion: "Explain HDBaseT versus AV over IP in plain English and tell me when each one makes sense.",
    prompts: [
      "Explain HDMI bandwidth and 4K60 in customer-friendly language.",
      "Help me describe multiview without sounding overly technical.",
      "Teach me how to explain why source count and display count change the design.",
    ],
    moduleTracks: ["Sales", "Products"],
    bestFor: ["Sales discovery", "Team onboarding", "Customer-friendly explainers"],
    nextTool: {
      label: "Open Guru",
      route: WM_ROUTES.guru,
    },
  },
  {
    id: "wyrestorm-fit",
    category: "Recommend",
    title: "Choose the right WyreStorm family",
    summary: "Use this when you already understand the room and need product-family guidance, shortlist help, or SKU direction.",
    detail: "This path narrows the design into Apollo, HDBaseT, Matrix, AVoIP, USB extension, or video wall direction based on the room and workflow.",
    guruMode: "wyrestorm",
    starterQuestion: "Which WyreStorm family best suits this room and why?",
    prompts: [
      "Recommend the best WyreStorm family for a small Teams room with USB-C BYOD and two displays.",
      "What WyreStorm approach fits a multi-screen sports bar with several source zones?",
      "Which family should I lead with for a divisible meeting room and why?",
    ],
    moduleTracks: ["Products", "Design"],
    bestFor: ["Room refresh projects", "Product shortlists", "Family positioning"],
    nextTool: {
      label: "Open Catalog",
      route: WM_ROUTES.catalog,
    },
  },
  {
    id: "project-review",
    category: "Review",
    title: "Review the current project",
    summary: "Use this when you want a fast sense-check on what is missing, risky, or still unclear in the live project.",
    detail: "This path looks at the current room assumptions, likely gaps, next actions, and where the design still needs clarification.",
    guruMode: "project",
    starterQuestion: "Review the active project and tell me what is still missing before we commit.",
    prompts: [
      "Tell me what risks or missing details stand out in the current project.",
      "What should we validate next before building the BOM?",
      "Review the active project and suggest the clearest next step.",
    ],
    moduleTracks: ["Design", "Tools"],
    bestFor: ["Pre-BOM review", "Proposal sanity checks", "Design handoff clarity"],
    nextTool: {
      label: "Open Project Overview",
      route: WM_ROUTES.projects,
    },
  },
  {
    id: "design-guidance",
    category: "Recommend",
    title: "Work through signal path and architecture",
    summary: "Use this when the room intent is known but the transport, routing, or architecture still needs to be reasoned out.",
    detail: "This path focuses on inputs, outputs, distance, control, and architecture choices so the system direction feels deliberate before products are locked in.",
    guruMode: "design",
    starterQuestion: "Help me choose the right signal path and architecture for this room.",
    prompts: [
      "What transport and switching approach makes sense for this room size and display count?",
      "Help me decide if this should stay HDBaseT or move to AVoIP.",
      "What architecture suits a boardroom with dual displays and BYOD?",
    ],
    moduleTracks: ["Design", "Products"],
    bestFor: ["Room planning", "Transport decisions", "System architecture"],
    nextTool: {
      label: "Open Room Wizard",
      route: WM_ROUTES.roomWizard,
    },
  },
  {
    id: "troubleshoot",
    category: "Fix",
    title: "Troubleshoot an AV problem",
    summary: "Use this when the issue is already on site and you need a calm, structured troubleshooting path.",
    detail: "This path is designed for fault isolation, validation order, and narrowing likely causes without turning the answer into a giant checklist.",
    guruMode: "troubleshooting",
    starterQuestion: "Help me troubleshoot this AV issue step by step.",
    prompts: [
      "How should I isolate why this display is not receiving signal?",
      "Give me a structured process for troubleshooting intermittent HDMI or HDBaseT issues.",
      "What are the likely causes when USB peripherals are not switching correctly in a meeting room?",
    ],
    moduleTracks: ["Products", "Tools"],
    bestFor: ["On-site support", "Fault isolation", "Support escalation"],
    nextTool: {
      label: "Open Guru",
      route: WM_ROUTES.guru,
    },
  },
  {
    id: "wingman-workflow",
    category: "Workflow",
    title: "Learn the Wingman workflow",
    summary: "Use this when the main question is where to start, what to do next, or which Wingman tool should handle the task.",
    detail: "This path keeps the app simple by mapping the opportunity to the clearest workflow instead of forcing tool-hunting.",
    guruMode: "training",
    starterQuestion: "Show me the clearest Wingman workflow for this opportunity.",
    prompts: [
      "What is the simplest Wingman path from room idea to proposal?",
      "Which Wingman tool should I open next for this type of job?",
      "Teach me the cleanest workflow for discovery, catalog, BOM, and proposal.",
    ],
    moduleTracks: ["Tools", "Sales"],
    bestFor: ["New users", "Workflow onboarding", "Keeping momentum"],
    nextTool: {
      label: "Open Tool Hub",
      route: WM_ROUTES.tools,
    },
  },
];

function tidy(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function findSupportJourney(id?: string | null): SupportJourney | undefined {
  const key = tidy(id);
  if (!key) return undefined;
  return SUPPORT_JOURNEYS.find((journey) => tidy(journey.id) === key);
}

export function recommendSupportJourney(project?: StoredProject | null): SupportJourney {
  if (!project) {
    return SUPPORT_JOURNEYS[0];
  }

  const stage = tidy(project.stage);
  const families = [
    ...(project.discovery?.recommendedFamilies ?? []),
    ...(project.template?.recommendedFamilies ?? []),
  ].map((item) => tidy(item));

  if (stage.includes("proposal") || stage.includes("design") || stage.includes("specify")) {
    return findSupportJourney("project-review") ?? SUPPORT_JOURNEYS[0];
  }

  if (families.length > 0) {
    return findSupportJourney("wyrestorm-fit") ?? SUPPORT_JOURNEYS[0];
  }

  return findSupportJourney("design-guidance") ?? SUPPORT_JOURNEYS[0];
}

export function buildGuruJourneyLink(
  journey: SupportJourney,
  overrides?: {
    question?: string;
    mode?: GuruMode;
  },
): string {
  const params = new URLSearchParams();
  params.set("journey", journey.id);
  params.set("mode", overrides?.mode ?? journey.guruMode);
  params.set("question", overrides?.question ?? journey.starterQuestion);
  return `${WM_ROUTES.guru}?${params.toString()}`;
}
