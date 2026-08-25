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
  callCoach: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "CallCoachPage")),
  products: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "ProductsPage")),
  documents: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "DocumentsPage")),
  responsePack: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "ResponsePackPage")),
  learn: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "LearnPage")),
  projects: lazy(fromNamedExport(() => import("../pages/ProjectsPage"), "ProjectsPage")),
  discovery: lazy(fromNamedExport(() => import("../pages/DiscoveryPage"), "DiscoveryPage")),
  recommendations: lazy(fromNamedExport(() => import("../pages/RecommendationsPage"), "RecommendationsPage")),
  productFamilies: lazy(fromNamedExport(() => import("../pages/ProductFamilyPage"), "ProductFamilyPage")),
  productPitch: lazy(fromNamedExport(() => import("../pages/ProductPitchPage"), "ProductPitchPage")),
  catalogBrowser: lazy(fromNamedExport(() => import("../pages/CatalogBrowserPage"), "CatalogBrowserPage")),
  compare: lazy(() => import("../pages/ComparePageNew")),
  templates: lazy(fromNamedExport(() => import("../pages/TemplatesPage"), "TemplatesPage")),
  videowall: lazy(() => import("../pages/VideowallBuilderPage")),
  salesHelper: lazy(fromNamedExport(() => import("../pages/SalesHelperPage"), "SalesHelperPage")),
  glossary: lazy(fromNamedExport(() => import("../pages/GlossaryPage"), "GlossaryPage")),
  callCards: lazy(fromNamedExport(() => import("../pages/CallCardsPage"), "CallCardsPage")),
  productCallCards: lazy(() => import("../pages/ProductCallCardsPage")),
  battleCards: lazy(() => import("../pages/BattleCardsPage")),
  ingest: lazy(fromNamedExport(() => import("../pages/IngestPage"), "IngestPage")),
  proposal: lazy(fromNamedExport(() => import("../pages/ProposalPage"), "ProposalPage")),
  support: lazy(fromNamedExport(() => import("../pages/SupportPage"), "SupportPage")),
  profile: lazy(() => import("../pages/ProfilePage")),
  proposalVisuals: lazy(() => import("../pages/ProposalVisualsPage")),
  quoteSafetyDashboard: lazy(() => import("../pages/QuoteSafetyDashboardPage")),
  analyticsDashboard: lazy(() => import("../pages/AnalyticsDashboardPage")),
  terms: lazy(fromNamedExport(() => import("../pages/TermsPage"), "TermsPage")),
};

const ProjectDetailRoute = lazy(fromNamedExport(() => import("../pages/ProjectDetailPage"), "ProjectDetailPage"));
const TemplateReviewRoute = lazy(fromNamedExport(() => import("../pages/TemplateReviewPage"), "TemplateReviewPage"));
const DataManagerRoute = lazy(fromNamedExport(() => import("../pages/DataManagerPage"), "DataManagerPage"));

function RouteFallback() {
  return (
    <div data-wingman-sales-helper="true" className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-6 text-sm font-semibold text-slate-600">
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
      { index: true, element: routeElement(pageRegistry.dashboard) },
      { path: "dashboard", element: <Navigate to="/wingman" replace /> },
      { path: "profile", element: <Navigate to="/wingman/settings" replace /> },
      { path: "finder", element: <Navigate to="/wingman/discovery" replace /> },
      { path: "visual-studio", element: <Navigate to="/wingman/proposal-visuals?mode=technical-schematic" replace /> },
      { path: "visual-design", element: <Navigate to="/wingman/proposal-visuals?mode=technical-schematic" replace /> },
      { path: "projects/:projectId", element: routeElement(ProjectDetailRoute) },
      { path: "templates/:templateId", element: routeElement(TemplateReviewRoute) },
      { path: "product-families/:familyId", element: routeElement(pageRegistry.productFamilies) },
      { path: "admin/data-manager", element: routeElement(DataManagerRoute) },
      ...routeCatalog.filter((route) => route.key !== "dashboard").map((route) => ({
        path: route.key === "productCallCards" ? `${route.segment}/*` : route.segment,
        element: routeElement(pageRegistry[route.key]),
      })),
    ],
  },
];
