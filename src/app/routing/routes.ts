import * as React from "react";

export const ROUTES = {
  workspace: [
    { path: "/app/dashboard", label: "Dashboard" },
    { path: "/app/projects", label: "Projects" },
    { path: "/app/projects/new", label: "New Project" },
    { path: "/app/tools/import-intake", label: "Import Intake" },
  ],
  tools: [
    { path: "/app/tools", label: "Tool Hub" },
    { path: "/app/tools/discovery", label: "Discovery Wizard" },
    { path: "/app/tools/catalog", label: "Catalog" },
    { path: "/app/tools/compare", label: "Compare" },
    { path: "/app/tools/proposal", label: "Proposals" },
    { path: "/app/tools/room-wizard", label: "Room Wizard" },
    { path: "/app/tools/video-wall", label: "Video Wall" },
    { path: "/app/tools/training", label: "Training" },
    { path: "/app/tools/guru", label: "Guru" },
  ],
  public: [
    { path: "/", label: "Home" },
  ],
};
