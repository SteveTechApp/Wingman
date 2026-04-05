import type {
  GuidedProjectFamily,
  GuidedProjectRecord,
} from "@/features/discovery/guidedProjectEngine";
import type { StoredProject } from "@/features/projects/projectStore";

export type GuruAssistantScope = "auto" | "general-av" | "wyrestorm-products" | "current-project";

export type GuruRouteContext = {
  label: string;
  summary: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function compact(parts: Array<string | null | undefined>, separator = ". "): string {
  return parts.map((part) => text(part)).filter(Boolean).join(separator);
}

function familiesForProject(project?: StoredProject | null): GuidedProjectFamily[] {
  const families = [
    ...(project?.discovery?.recommendedFamilies ?? []),
    ...(project?.template?.recommendedFamilies ?? []),
    ...(project?.compare?.recommendedFamilies ?? []),
  ];

  return Array.from(new Set(families)) as GuidedProjectFamily[];
}

export function getGuruRouteContext(pathname: string): GuruRouteContext {
  if (pathname.includes("/video-wall")) {
    return {
      label: "Video Wall",
      summary: "Useful for processor strategy, wall layout, multiview, and transport decisions.",
    };
  }

  if (pathname.includes("/catalog")) {
    return {
      label: "Product Catalog",
      summary: "Useful for shortlist, fit, capability, and SKU-level product questions.",
    };
  }

  if (pathname.includes("/compare")) {
    return {
      label: "Competitor Compare",
      summary: "Useful for replacement mapping, positioning, and objection handling.",
    };
  }

  if (pathname.includes("/proposal")) {
    return {
      label: "Proposal",
      summary: "Useful for BOM review, scope gaps, add-ons, and proposal-ready language.",
    };
  }

  if (pathname.includes("/training")) {
    return {
      label: "Training Hub",
      summary: "Useful for AV explainers, onboarding, and sales-enablement answers.",
    };
  }

  if (pathname.includes("/product-intelligence")) {
    return {
      label: "Product Intelligence",
      summary: "Useful for capability checks, positioning, and product evidence.",
    };
  }

  if (pathname.includes("/discovery")) {
    return {
      label: "Guided Project",
      summary: "Useful for qualification, next-step guidance, and narrowing the right WyreStorm family.",
    };
  }

  if (pathname.includes("/projects")) {
    return {
      label: "Projects",
      summary: "Useful for current-project reviews, stage planning, and commercial next steps.",
    };
  }

  if (pathname.includes("/dashboard")) {
    return {
      label: "Dashboard",
      summary: "Useful for overall project direction, next actions, and quick AV guidance.",
    };
  }

  return {
    label: "Workspace",
    summary: "Use the current page as light context while answering general AV and WyreStorm questions.",
  };
}

export function isProjectHelpQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return /\b(this|current|our|the)\s+(project|room|design|proposal|bom|brief)\b/.test(lower) ||
    /\bwhat should (i|we) do next\b/.test(lower) ||
    /\bmissing\b/.test(lower) ||
    /\bvalidate\b/.test(lower) ||
    /\breview\b/.test(lower) ||
    /\bfor this\b/.test(lower) ||
    /\bon this project\b/.test(lower);
}

export function resolveGuruScope(
  scope: GuruAssistantScope,
  question: string,
  project?: StoredProject | null,
): Exclude<GuruAssistantScope, "auto"> {
  if (scope !== "auto") {
    return scope;
  }

  if (project && isProjectHelpQuestion(question)) {
    return "current-project";
  }

  if (
    /\bwyrestorm\b|\bapollo\b|\bhdbaset\b|\bavoip\b|\bnetworkhd\b|\bsku\b|\bmodel\b|\bproduct\b|\bmatrix\b|\bextender\b|\bswitcher\b/i.test(
      question,
    )
  ) {
    return "wyrestorm-products";
  }

  return "general-av";
}

export function buildGuruProjectSummary(project?: StoredProject | null): string {
  if (!project) {
    return "No active project is attached right now.";
  }

  const discovery = project.discovery;
  const families = familiesForProject(project);
  const workingContext = compact(
    [
      text(discovery?.workflowTrack || discovery?.applicationType),
      text(discovery?.sourceCount) ? `Sources ${text(discovery?.sourceCount)}` : "",
      text(discovery?.displayCount) ? `Displays ${text(discovery?.displayCount)}` : "",
      text(discovery?.cableDistanceM) ? `Distance ${text(discovery?.cableDistanceM)}m` : "",
      text(discovery?.usbNeeds) ? `USB ${text(discovery?.usbNeeds)}` : "",
    ],
    ", ",
  );

  return compact([
    project.name,
    text(project.stage) ? `Stage: ${text(project.stage)}` : "",
    workingContext,
    families.length > 0 ? `Families: ${families.join(", ")}` : "",
  ]);
}

export function buildGuruAttachedContext(input: {
  scope: Exclude<GuruAssistantScope, "auto">;
  route: GuruRouteContext;
  project?: StoredProject | null;
}): string {
  const lines = [
    `Current workspace: ${input.route.label}. ${input.route.summary}`,
  ];

  if (input.scope === "general-av") {
    lines.push("Answer this first as a general AV question. Use WyreStorm examples only when they help.");
  }

  if (input.scope === "wyrestorm-products") {
    lines.push("Prioritize WyreStorm families, product fit, architecture, and positioning.");
  }

  if (input.scope === "current-project") {
    lines.push(
      input.project
        ? `Active project: ${buildGuruProjectSummary(input.project)}`
        : "No active project is attached, so fall back to general guidance where project specifics are missing.",
    );
  } else if (input.project) {
    lines.push(`Active project available if needed: ${buildGuruProjectSummary(input.project)}`);
  }

  return lines.join("\n");
}

export function mapProjectToGuruDiscovery(
  project?: StoredProject | null,
): Partial<GuidedProjectRecord> | null {
  if (!project) {
    return null;
  }

  const discovery = project.discovery;
  const families = familiesForProject(project);

  return {
    workflowTrack: text(discovery?.workflowTrack),
    projectScope: text(discovery?.projectScope) || text(project.stage),
    customerOutcome: text(discovery?.customerOutcome) || text(project.template?.summary),
    switchSolutionType: text(discovery?.switchSolutionType),
    matrixIoPreset: text(discovery?.matrixIoPreset),
    featureRequirements: text(discovery?.featureRequirements),
    customer: text(discovery?.customer) || text(project.customer),
    site: text(discovery?.site) || text(project.site),
    roomName: text(discovery?.roomName) || text(project.roomName),
    applicationType: text(discovery?.applicationType),
    roomLengthM: text(discovery?.roomLengthM),
    roomWidthM: text(discovery?.roomWidthM),
    roomHeightM: text(discovery?.roomHeightM),
    installationPath: text(discovery?.installationPath),
    cableDistanceM: text(discovery?.cableDistanceM),
    transportDistanceBand: text(discovery?.transportDistanceBand),
    transportCableType: text(discovery?.transportCableType),
    displayCount: text(discovery?.displayCount),
    sourceCount: text(discovery?.sourceCount),
    sourceInventory: text(discovery?.sourceInventory),
    outputBehaviour: text(discovery?.outputBehaviour),
    sourceTypes: text(discovery?.sourceTypes),
    sourcePlacement: text(discovery?.sourcePlacement),
    sourceConnectionPath: text(discovery?.sourceConnectionPath),
    sourceConnectionType: text(discovery?.sourceConnectionType),
    signalFormats: text(discovery?.signalFormats),
    signalHdr: text(discovery?.signalHdr),
    sourceCableType: text(discovery?.sourceCableType),
    displayConnectionPath: text(discovery?.displayConnectionPath),
    displayConnectionType: text(discovery?.displayConnectionType),
    displayCableType: text(discovery?.displayCableType),
    networkEnvironment: text(discovery?.networkEnvironment),
    usbNeeds: text(discovery?.usbNeeds),
    usbStandards: text(discovery?.usbStandards),
    audioNeeds: text(discovery?.audioNeeds),
    audioBreakout: text(discovery?.audioBreakout),
    controlNeeds: text(discovery?.controlNeeds),
    powerPreference: text(discovery?.powerPreference),
    passthroughNeeds: text(discovery?.passthroughNeeds),
    budgetBand: text(discovery?.budgetBand),
    urgency: text(discovery?.urgency),
    notes: compact(
      [
        text(discovery?.notes),
        text(project.notes),
        text(project.videowall?.summary),
        text(project.videowall?.processorRecommendation),
        text(project.compare?.summary),
      ],
      "\n",
    ),
    recommendedFamilies: families,
    recommendedNextTool: text(discovery?.recommendedNextTool),
    createdAt: text(discovery?.createdAt) || text(project.createdAt),
  };
}

export function getGuruStarterPrompts(input: {
  scope: GuruAssistantScope;
  route: GuruRouteContext;
  hasProject: boolean;
}): string[] {
  if (input.scope === "general-av") {
    return [
      "Explain the AV tradeoff in simple terms",
      "What should I qualify before choosing a solution?",
      "When do I use HDBaseT instead of AVoIP?",
    ];
  }

  if (input.scope === "wyrestorm-products") {
    return [
      "Which WyreStorm family best fits this use case?",
      "Summarise the product differences clearly",
      "Help me position WyreStorm against other brands",
    ];
  }

  if (input.scope === "current-project") {
    return input.hasProject
      ? [
          "What should I validate next on this project?",
          "What is the likely WyreStorm direction here?",
          "What gaps could hurt the proposal later?",
        ]
      : [
          "No active project yet. Help me start discovery",
          "What details do you need before you can guide a project?",
          "Give me a qualification checklist for a new AV brief",
        ];
  }

  return input.hasProject
    ? [
        `Use ${input.route.label} as context and tell me the next move`,
        "Answer this as a WyreStorm product question",
        "Review the current project and flag missing detail",
      ]
    : [
        "Ask a general AV question",
        "Ask about a WyreStorm product family",
        `Use ${input.route.label} as light context`,
      ];
}
