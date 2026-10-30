import { Suspense, lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";
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

const pageRegistry: Record<Exclude<WingmanRouteKey, "documents" | "salesHelper" | "callCards" | "battleCards" | "support" | "quoteSafetyDashboard" | "analyticsDashboard">, LazyPageComponent> = {
  dashboard: lazy(fromNamedExport(() => import("../pages/DashboardPage"), "DashboardPage")),
  callCoach: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "CallCoachPage")),
  products: lazy(fromNamedExport(() => import("../pages/NavigationHubPages"), "ProductsPage")),
  responsePack: lazy(fromNamedExport(() => import("../pages/ProposalPage"), "ProposalPage")),
  learn: lazy(fromNamedExport(() => import("../pages/TrainingPortalPage"), "TrainingPortalPage")),
  projects: lazy(fromNamedExport(() => import("../pages/ProjectsPage"), "ProjectsPage")),
  discovery: lazy(fromNamedExport(() => import("../pages/OpportunitiesPage"), "OpportunitiesPage")),
  recommendations: lazy(fromNamedExport(() => import("../pages/RecommendationsPage"), "RecommendationsPage")),
  productFamilies: lazy(fromNamedExport(() => import("../pages/ProductFamilyPage"), "ProductFamilyPage")),
  productPitch: lazy(fromNamedExport(() => import("../pages/ProductPitchPage"), "ProductPitchPage")),
  catalogBrowser: lazy(fromNamedExport(() => import("../pages/CatalogBrowserPage"), "CatalogBrowserPage")),
  compare: lazy(() => import("../pages/ComparePageNew")),
  templates: lazy(fromNamedExport(() => import("../pages/TemplatesPage"), "TemplatesPage")),
  videowall: lazy(() => import("../pages/VideowallBuilderPage")),
  glossary: lazy(fromNamedExport(() => import("../pages/GlossaryPage"), "GlossaryPage")),
  productCallCards: lazy(() => import("../pages/ProductCallCardsPage")),
  ingest: lazy(fromNamedExport(() => import("../pages/IngestPage"), "IngestPage")),
  proposal: lazy(fromNamedExport(() => import("../pages/ProposalPage"), "ProposalPage")),
  profile: lazy(() => import("../pages/ProfilePage")),
  proposalVisuals: lazy(() => import("../pages/ProposalVisualsPage")),
  terms: lazy(fromNamedExport(() => import("../pages/TermsPage"), "TermsPage")),
  approvalQueue: lazy(fromNamedExport(() => import("../pages/ApprovalQueuePage"), "ApprovalQueuePage")),
};

const ProjectDetailRoute = lazy(fromNamedExport(() => import("../pages/ProjectDetailPage"), "ProjectDetailPage"));
const TemplateBuilderRoute = lazy(fromNamedExport(() => import("../pages/TemplateBuilderPage"), "TemplateBuilderPage"));
const TemplateReviewRoute = lazy(fromNamedExport(() => import("../pages/TemplateReviewPage"), "TemplateReviewPage"));
const DataManagerRoute = lazy(fromNamedExport(() => import("../pages/DataManagerPage"), "DataManagerPage"));

const consolidatedRedirectKeys = new Set<WingmanRouteKey>([
  "salesHelper", "callCards", "battleCards", "documents", "support", "quoteSafetyDashboard", "analyticsDashboard",
]);

function LegacyTaskRedirect({ to }: { to: string }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.delete("mode");
  const search = params.toString();
  return <Navigate to={`${to}${search ? `?${search}` : ""}`} replace />;
}

// The `route-loading-fallback` id is the walk's signal that a route's own chunk
// has replaced this placeholder; before that, "nothing on screen" and "not
// loaded yet" look the same.
function RouteFallback() {
  return (
    <div
      data-testid="route-loading-fallback"
      data-wingman-sales-helper="true"
      className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-6 text-sm font-semibold text-slate-600"
    >
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
      { path: "templates/new", element: routeElement(TemplateBuilderRoute) },
      { path: "templates/:templateId/edit", element: routeElement(TemplateBuilderRoute) },
      { path: "templates/:templateId", element: routeElement(TemplateReviewRoute) },
      { path: "product-families/:familyId", element: routeElement(pageRegistry.productFamilies) },
      { path: "admin/data-manager", element: routeElement(DataManagerRoute) },
      { path: "sales-helper", element: <Navigate to="/wingman/call-coach" replace /> },
      { path: "call-cards", element: <Navigate to="/wingman/call-coach" replace /> },
      { path: "battle-cards", element: <Navigate to="/wingman/compare?mode=battle-cards" replace /> },
      { path: "response-pack", element: <LegacyTaskRedirect to="/wingman/responses" /> },
      { path: "documents", element: <LegacyTaskRedirect to="/wingman/responses" /> },
      { path: "support", element: <Navigate to="/wingman/call-coach" replace /> },
      { path: "quote-safety", element: <Navigate to="/wingman/projects?view=quote-safety" replace /> },
      { path: "analytics", element: <Navigate to="/wingman/admin/data-manager?view=analytics" replace /> },
      // Written out rather than built from the catalogue row: a shape that only
      // exists as an interpolated template cannot be turned into an address by a
      // walk, so the card page under this base path would never be loaded cold.
      { path: "product-call-cards/*", element: routeElement(pageRegistry.productCallCards) },
      ...routeCatalog
        .filter((route) => route.key !== "dashboard" && route.key !== "productCallCards" && !consolidatedRedirectKeys.has(route.key))
        .map((route) => ({
          path: route.segment,
          element: routeElement(pageRegistry[route.key as keyof typeof pageRegistry]),
        })),
    ],
  },
];
