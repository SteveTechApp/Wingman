export type AppRoute = {
  path: string;
  label: string;
  nav?: boolean;
  group?: "Workspace" | "Tools";
};

export const ROUTES: AppRoute[] = [
  { path: "/app/dashboard", label: "Dashboard", nav: true, group: "Workspace" },
  { path: "/app/projects", label: "Projects", nav: true, group: "Workspace" },
  { path: "/app/import", label: "Import", nav: true, group: "Workspace" },
  { path: "/tools/catalog", label: "Catalog", nav: true, group: "Tools" },
  { path: "/tools/competitor-compare", label: "Competitor Compare", nav: true, group: "Tools" },
  { path: "/tools/proposal-builder", label: "Proposal Builder", nav: true, group: "Tools" },
  { path: "/tools/room-wizard", label: "Room Wizard", nav: true, group: "Tools" },
  { path: "/tools/training-hub", label: "Training Hub", nav: true, group: "Tools" },
  { path: "/tools/video-wall-planner", label: "Video Wall Planner", nav: true, group: "Tools" },
];
