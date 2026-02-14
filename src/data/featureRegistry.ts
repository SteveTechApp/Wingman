export type FeatureArea = "tools" | "workspace";
export type FeatureStatus = "live" | "scaffold";

export type FeatureDefinition = {
  id: string;
  label: string;
  route: string;
  source: string;
  area: FeatureArea;
  status: FeatureStatus;
  summary: string;
};

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: "tool-competitor-compare",
    label: "Competitor Compare",
    route: "/tools/competitor-compare",
    source: "src/pages/tools/CompetitorComparePage.tsx",
    area: "tools",
    status: "live",
    summary: "Map competitor SKUs to WyreStorm equivalents.",
  },
  {
    id: "tool-proposal-builder",
    label: "Proposal Builder",
    route: "/tools/proposal-builder",
    source: "src/pages/tools/ProposalBuilderPage.tsx",
    area: "tools",
    status: "scaffold",
    summary: "Prepare proposal-ready outputs from workspace projects.",
  },
  {
    id: "tool-room-wizard",
    label: "Room Wizard",
    route: "/tools/room-wizard",
    source: "src/pages/tools/RoomWizardPage.tsx",
    area: "tools",
    status: "live",
    summary: "Guided room design and implementation recommendations.",
  },
  {
    id: "tool-training-hub",
    label: "Training Hub",
    route: "/tools/training-hub",
    source: "src/pages/tools/TrainingHubPage.tsx",
    area: "tools",
    status: "scaffold",
    summary: "Enablement resources and onboarding guidance.",
  },
  {
    id: "tool-video-wall",
    label: "Video Wall Planner",
    route: "/tools/video-wall-planner",
    source: "src/pages/tools/VideoWallPlannerPage.tsx",
    area: "tools",
    status: "scaffold",
    summary: "Plan canvas, matrix layout, and deployment assumptions.",
  },
  {
    id: "tool-product-catalog",
    label: "Product Catalog",
    route: "/tools/catalog",
    source: "src/pages/tools/ProductCatalogPage.tsx",
    area: "tools",
    status: "scaffold",
    summary: "Browse products and jump into workspace design flows.",
  },
  {
    id: "workspace-dashboard",
    label: "Dashboard",
    route: "/app/dashboard",
    source: "src/pages/DashboardPage.tsx",
    area: "workspace",
    status: "live",
    summary: "Workspace launchpad with shortcuts and status.",
  },
  {
    id: "workspace-projects",
    label: "Projects",
    route: "/app/projects",
    source: "src/pages/ProjectsPage.tsx",
    area: "workspace",
    status: "scaffold",
    summary: "Project CRUD, status tracking, and BOM/export pipeline.",
  },
  {
    id: "workspace-import",
    label: "Import",
    route: "/app/import",
    source: "src/pages/ImportIntakePage.tsx",
    area: "workspace",
    status: "scaffold",
    summary: "Brief intake and requirement extraction workflows.",
  },
];

export function featuresByArea(area: FeatureArea): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((feature) => feature.area === area);
}
