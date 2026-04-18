import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ComparePage } from "../pages/ComparePage";
import { DashboardPage } from "../pages/DashboardPage";
import { DiscoveryPage } from "../pages/DiscoveryPage";
import { FinderPage } from "../pages/FinderPage";
import { IngestPage } from "../pages/IngestPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProposalPage } from "../pages/ProposalPage";
import { SupportPage } from "../pages/SupportPage";
import { TemplatesPage } from "../pages/TemplatesPage";

export const wingmanRoutes: RouteObject[] = [
  {
    path: "/wingman",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "discovery", element: <DiscoveryPage /> },
      { path: "finder", element: <FinderPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "ingest", element: <IngestPage /> },
      { path: "proposal", element: <ProposalPage /> },
      { path: "support", element: <SupportPage /> },
    ],
  },
];
