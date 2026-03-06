import * as React from "react";

export const ROUTES = {
  workspace: [
    { path: "/app/dashboard", label: "Dashboard" },
    { path: "/app/projects", label: "Projects" },
    { path: "/app/survey-import", label: "Survey Import" },
  ],
  tools: [
    { path: "/app/toolhub", label: "Tool Hub" },
    { path: "/app/tools/discovery", label: "Discovery Wizard" },
    { path: "/app/tools/catalog", label: "Catalog" },
    { path: "/app/tools/competitor", label: "Compare" },
    { path: "/app/tools/proposal", label: "Proposals" },
    { path: "/app/tools/room", label: "Room Wizard" },
    { path: "/app/tools/videowall", label: "Video Wall" },
    { path: "/app/tools/training", label: "Training" },
    { path: "/app/tools/guru", label: "Guru" },
  ],
  public: [
    { path: "/", label: "Home" },
  ],
};