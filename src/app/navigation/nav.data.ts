import * as React from "react";

export type NavItem = {
  path: string;
  label: string;
  end?: boolean;
};

export const NAV_LINKS: NavItem[] = [
  { label: "Dashboard", path: "/app/dashboard", end: false },
  { label: "Projects", path: "/app/projects", end: false },
  { label: "Tool Hub", path: "/app/tools", end: false },
  { label: "Guided Project", path: "/app/tools/discovery", end: false },
  { label: "Templates", path: "/app/tools/templates", end: false },
  { label: "Competitor Compare", path: "/app/tools/compare", end: false },
  { label: "Video Wall", path: "/app/tools/video-wall", end: false },
  { label: "Import Intake", path: "/app/tools/import-intake", end: false },
  { label: "Training", path: "/app/tools/training", end: false },
  { label: "Guru", path: "/app/tools/guru", end: false },
];
