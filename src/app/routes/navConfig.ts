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
  { path: "/app/projects",  label: "Projects",  group: "Workspace", nav: true, auth: true },

  { path: "/app/toolhub",         label: "Tool Hub",        group: "Tools",    nav: true, auth: false },
  { path: "/app/tools/catalog",   label: "Product Catalog", group: "Tools",    nav: true, auth: false },
  { path: "/app/tools/proposal",  label: "Proposal Builder",group: "Tools",    nav: true, auth: false },
  { path: "/app/tools/room",      label: "Room Wizard",     group: "Tools",    nav: true, auth: false },
  { path: "/app/tools/videowall", label: "Video Wall",      group: "Tools",    nav: true, auth: false },
  { path: "/app/survey-import",   label: "Import Intake",   group: "Tools",    nav: true, auth: false },

  { path: "/app/app/tools/training",  label: "Training Hub",    group: "Training", nav: true, auth: false },

  { path: "/",       label: "Landing", group: "Other", nav: false, auth: false },
  { path: "/login",  label: "Login",   group: "Other", nav: false, auth: false },
  { path: "/signup", label: "Sign up", group: "Other", nav: false, auth: false },
];

export function byGroup(group: NavGroup) {
  return ROUTES.filter((r) => r.nav && r.group === group);
}