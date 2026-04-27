import { createElement, type ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { CallCardsPage } from "../pages/CallCardsPage";
import { ComparePage } from "../pages/ComparePage";
import { DashboardPage } from "../pages/DashboardPage";
import { DiscoveryPage } from "../pages/DiscoveryPage";
import { FinderPage } from "../pages/FinderPage";
import { IngestPage } from "../pages/IngestPage";
import { ProjectDetailPage } from "../pages/ProjectDetailPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProposalPage } from "../pages/ProposalPage";
import { SalesHelperPage } from "../pages/SalesHelperPage";
import { SupportPage } from "../pages/SupportPage";
import { TemplatesPage } from "../pages/TemplatesPage";
import { VideowallBuilderPage } from "../pages/VideowallBuilderPage";
import { routeCatalog, type WingmanRouteKey } from "./routeCatalog";

const pageRegistry: Record<WingmanRouteKey, ComponentType> = {
  dashboard: DashboardPage,
  projects: ProjectsPage,
  discovery: DiscoveryPage,
  finder: FinderPage,
  compare: ComparePage,
  templates: TemplatesPage,
  videowall: VideowallBuilderPage,
  salesHelper: SalesHelperPage,
  callCards: CallCardsPage,
  ingest: IngestPage,
  proposal: ProposalPage,
  support: SupportPage,
};

export const wingmanRoutes: RouteObject[] = [
  {
    path: "/wingman",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={routeCatalog[0].segment} replace /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      ...routeCatalog.map((route) => ({
        path: route.segment,
        element: createElement(pageRegistry[route.key]),
      })),
    ],
  },
];
