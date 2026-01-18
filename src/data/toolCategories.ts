export type ToolPriority = "primary" | "common" | "advanced";

export type ToolLink = {
  label: string;
  path: string;
  description?: string;
  priority?: ToolPriority;   // defaults to "common"
  internal?: boolean;        // hidden by default unless enabled
  category?: string;         // derived at runtime
};

export type ToolCategory = {
  id: string;
  label: string;
  items: ToolLink[];
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "project",
    label: "Project",
    items: [
      { label: "Project Setup", path: "/setup", description: "Create a project brief and starting context.", priority: "primary" },
      { label: "Customer Discovery", path: "/discovery", description: "Capture room requirements and constraints.", priority: "primary" },
      { label: "Survey Import", path: "/survey", description: "Bring in survey/site data for a project.", priority: "common" }
    ]
  },
  {
    id: "design",
    label: "Design Tools",
    items: [
      { label: "Room Templates", path: "/templates", description: "Pick a close-fit room type and adapt it.", priority: "primary" },
      { label: "Video Wall Tool", path: "/videowall", description: "Plan a video wall and supporting hardware.", priority: "common" }
    ]
  },
  {
    id: "sales",
    label: "Sales Tools",
    items: [
      { label: "Competitor Compare", path: "/compare", description: "Map competitor SKUs to WyreStorm equivalents.", priority: "common" },
      { label: "Ask Guru", path: "/ask", description: "Quick questions and guided decisions.", priority: "common" }
    ]
  },
  {
    id: "training",
    label: "Training",
    items: [
      { label: "Training Hub", path: "/training", description: "Sales enablement and product knowledge.", priority: "primary" }
    ]
  },
  {
    id: "internal",
    label: "Internal",
    items: [
      { label: "Analytics", path: "/analytics", description: "Internal usage/performance insights.", priority: "advanced", internal: true },
      { label: "Agent Input", path: "/agent", description: "Advanced/internal entry.", priority: "advanced", internal: true }
    ]
  }
];

export function getAllTools(): ToolLink[] {
  const out: ToolLink[] = [];
  for (const c of TOOL_CATEGORIES) {
    for (const it of c.items) {
      out.push({
        ...it,
        category: c.label,
        priority: it.priority ?? "common",
        internal: !!it.internal,
      });
    }
  }
  return out;
}

export function getToolByPath(path: string): ToolLink | undefined {
  return getAllTools().find((t) => t.path === path);
}

export function getCategoryLabels(): string[] {
  return TOOL_CATEGORIES.map((c) => c.label);
}