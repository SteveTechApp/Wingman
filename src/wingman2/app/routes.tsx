import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { routeCatalog, type WingmanRouteKey } from "./routeCatalog";

type PageModule = { default: ComponentType };
type PageLoader = () => Promise<PageModule>;
type LazyPageComponent = LazyExoticComponent<ComponentType>;

function fromNamedExport<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
): PageLoader {
  return () =>
    loader().then((module) => ({
      default: module[exportName] as ComponentType,
    }));
}

const pageRegistry: Record<WingmanRouteKey, LazyPageComponent> = {
  dashboard: lazy(fromNamedExport(() => import("../pages/DashboardPage"), "DashboardPage")),
  projects: lazy(fromNamedExport(() => import("../pages/ProjectsPage"), "ProjectsPage")),
  discovery: lazy(fromNamedExport(() => import("../pages/DiscoveryPage"), "DiscoveryPage")),
  finder: lazy(fromNamedExport(() => import("../pages/FinderPage"), "FinderPage")),
  productFamilies: lazy(fromNamedExport(() => import("../pages/ProductFamilyPage"), "ProductFamilyPage")),
  productPitch: lazy(fromNamedExport(() => import("../pages/ProductPitchPage"), "ProductPitchPage")),
  compare: lazy(() => import("../pages/ComparePage")),
  templates: lazy(fromNamedExport(() => import("../pages/TemplatesPage"), "TemplatesPage")),
  videowall: lazy(fromNamedExport(() => import("../pages/VideowallBuilderPage"), "VideowallBuilderPage")),
  salesHelper: lazy(fromNamedExport(() => import("../pages/SalesHelperPage"), "SalesHelperPage")),
  visualDesign: lazy(fromNamedExport(() => import("../pages/VisualDesignStudioPage"), "VisualDesignStudioPage")),
  glossary: lazy(fromNamedExport(() => import("../pages/GlossaryPage"), "GlossaryPage")),
  callCards: lazy(fromNamedExport(() => import("../pages/CallCardsPage"), "CallCardsPage")),
  ingest: lazy(fromNamedExport(() => import("../pages/IngestPage"), "IngestPage")),
  proposal: lazy(fromNamedExport(() => import("../pages/ProposalPage"), "ProposalPage")),
  support: lazy(fromNamedExport(() => import("../pages/SupportPage"), "SupportPage")),
  intelligence: lazy(fromNamedExport(() => import("../pages/IntelligencePage"), "IntelligencePage")),
  profile: lazy(fromNamedExport(() => import("../pages/ProfilePage"), "ProfilePage")),
};

const ProjectDetailRoute = lazy(fromNamedExport(() => import("../pages/ProjectDetailPage"), "ProjectDetailPage"));
const TemplateReviewRoute = lazy(fromNamedExport(() => import("../pages/TemplateReviewPage"), "TemplateReviewPage"));

function RouteFallback() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">
      Loading Wingman view...
    </div>
  );
}

function routeElement(Page: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Page />
    </Suspense>
  );
}

export const wingmanRoutes: RouteObject[] = [
  {
    path: "/wingman",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={routeCatalog[0].segment} replace /> },
      { path: "projects/:projectId", element: routeElement(ProjectDetailRoute) },
      { path: "templates/:templateId", element: routeElement(TemplateReviewRoute) },
      ...routeCatalog.map((route) => ({
        path: route.segment,
        element: routeElement(pageRegistry[route.key]),
      })),
    ],
  },
];
