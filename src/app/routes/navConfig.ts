import * as React from "react";

export type NavGroup = "Workspace" | "Tools" | "Training" | "Other";

export type RouteDef = {
  path: string;
  label: string;
  group: NavGroup;
  nav?: boolean;
  auth?: boolean;
};

export const ROUTES: RouteDef[] = [
  { path: "/app/dashboard", label: "Dashboard", group: "Workspace", nav: true, auth: true },
  { path: "/app/projects", label: "Projects", group: "Workspace", nav: true, auth: true },
  { path: "/app/projects/new", label: "New Project", group: "Workspace", nav: true, auth: true },
  { path: "/app/workflow/completion", label: "Completion Workflow", group: "Workspace", nav: false, auth: true },

  { path: "/app/tools", label: "Tool Hub", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/discovery", label: "Guided Project", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/catalog", label: "Product Catalog", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/proposal", label: "Proposal Builder", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/completion", label: "Completion Workflow", group: "Tools", nav: false, auth: false },
  { path: "/app/tools/room-wizard", label: "Room Wizard", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/video-wall", label: "Video Wall", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/compare", label: "Competitor Compare", group: "Tools", nav: true, auth: false },
  { path: "/app/tools/import-intake", label: "Import Intake", group: "Tools", nav: true, auth: false },

  { path: "/app/tools/training", label: "Training Hub", group: "Training", nav: true, auth: false },

  { path: "/", label: "Landing", group: "Other", nav: false, auth: false },
  { path: "/login", label: "Login", group: "Other", nav: false, auth: false },
  { path: "/signup", label: "Sign up", group: "Other", nav: false, auth: false },
];

export function byGroup(group: NavGroup) {
  return ROUTES.filter((route) => route.nav && route.group === group);
}
