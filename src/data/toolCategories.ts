import * as React from "react";

export type ToolCategoryId =
  | "Workspace"
  | "Tools"
  | "Training"
  | "Support"
  | "Other";

export type ToolCategoryItem = {
  path: string;
  label: string;
  description?: string;
  internal?: boolean;
};

export type ToolCategory = {
  id: ToolCategoryId;
  label: string;
  items: ToolCategoryItem[];
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "Workspace",
    label: "Workspace",
    items: [
      { path: "/app/dashboard", label: "Dashboard", description: "Overview and status" },
      { path: "/app/projects", label: "Projects", description: "Saved workspaces" },
    ],
  },
  {
    id: "Tools",
    label: "Tools",
    items: [
      { path: "/app/toolhub", label: "Tool Hub", description: "All tools in one place" },
      { path: "/app/guru", label: "Wingman Guru", description: "Design + sales assistant" },
      { path: "/app/tools/catalog", label: "Product Catalog", description: "Browse and filter products" },
      { path: "/app/tools/roomwizard", label: "RoomWizard", description: "Capture requirements and suggest BOM" },
      { path: "/app/tools/proposal", label: "Proposal Builder", description: "Build BOM and export proposal" },
      { path: "/app/tools/competitor", label: "Competitor Compare", description: "Map competitor SKUs", internal: true },
    ],
  },
  {
    id: "Training",
    label: "Training",
    items: [
      { path: "/app/tools/training", label: "Training Hub", description: "Micro-learning and references" },
    ],
  },
  {
    id: "Support",
    label: "Support",
    items: [
      { path: "/app/support", label: "Support", description: "Docs and support links" },
    ],
  },
  {
    id: "Other",
    label: "Other",
    items: [
      { path: "/app/about", label: "About", description: "Version and info", internal: true },
    ],
  },
];