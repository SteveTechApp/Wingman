import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "@/auth/RequireAuth";
import AppShell from "@/app/shell/AppShell";
import NotFoundPage from "@/app/system/NotFoundPage";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const InviteAcceptancePage = lazy(() => import("@/pages/InviteAcceptancePage"));
const ProjectOverviewPage = lazy(() => import("@/pages/ProjectOverviewPage"));

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const ToolHubPage = lazy(() => import("@/features/tools/ToolHubPage"));
const GuruToolHostPage = lazy(() => import("@/features/ai/guru/GuruToolHostPage"));
const DiscoveryWizardPage = lazy(() => import("@/features/discovery/DiscoveryWizardPage"));
const CataloguePage = lazy(() => import("@/features/catalog/CataloguePage"));
const CompetitorComparePage = lazy(() => import("@/features/compare/CompetitorComparePage"));
const ProposalPage = lazy(() => import("@/features/proposal/ProposalPage"));
const AvNavigatorPage = lazy(() => import("@/features/navigator/AvNavigatorPage"));
const SalesPositioningPage = lazy(() => import("@/features/sales/SalesPositioningPage"));
const TrainingHubPage = lazy(() => import("@/features/training/TrainingHubPage"));
const TemplatesPage = lazy(() => import("@/features/templates/TemplatesPage"));
const ImportIntakePage = lazy(() => import("@/features/import/ImportIntakePage"));
const ProjectsPage = lazy(() => import("@/features/projects/ProjectsPage"));
const ProjectNewPage = lazy(() => import("@/features/projects/ProjectNewPage"));
const CompetitorLookupDiagnosticsPage = lazy(
  () => import("@/features/support/CompetitorLookupDiagnosticsPage"),
);
const ProductIntelligencePage = lazy(
  () => import("@/features/support/ProductIntelligencePage"),
);
const RoomWizardPage = lazy(() => import("@/features/room-wizard/RoomWizardPage"));
const VideoWallPlannerPage = lazy(
  () => import("@/features/misc/videoWall/VideoWallPlannerRebuild"),
);

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(243,140,46,0.10), transparent 24%), var(--wm-bg, #08111b)",
        color: "var(--wm-text, #e8edf7)",
      }}
    >
      <div
        style={{
          width: "min(100%, 360px)",
          borderRadius: "20px",
          padding: "24px",
          background: "rgba(10, 18, 30, 0.88)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            margin: "0 auto 14px",
            borderRadius: "999px",
            border: "3px solid rgba(255,255,255,0.14)",
            borderTopColor: "rgba(255,155,71,0.95)",
            animation: "wm-route-spin 0.9s linear infinite",
          }}
        />
        <div style={{ fontSize: "18px", fontWeight: 700 }}>Loading route...</div>
        <div style={{ marginTop: "8px", opacity: 0.72, fontSize: "14px" }}>
          Fetching the next workspace module.
        </div>
      </div>

      <style>{`
        @keyframes wm-route-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function renderLazyRoute(node: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={renderLazyRoute(<PublicLandingPage />)} />
      <Route path="/login" element={renderLazyRoute(<LoginPage />)} />
      <Route path="/signup" element={renderLazyRoute(<SignupPage />)} />
      <Route path="/invite/:token" element={renderLazyRoute(<InviteAcceptancePage />)} />
      <Route path="/invite" element={renderLazyRoute(<InviteAcceptancePage />)} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          <Route path="dashboard" element={renderLazyRoute(<DashboardPage />)} />

          <Route path="projects" element={renderLazyRoute(<ProjectsPage />)} />
          <Route path="projects/new" element={renderLazyRoute(<ProjectNewPage />)} />
          <Route path="projects/:id" element={renderLazyRoute(<ProjectOverviewPage />)} />

          <Route path="tools" element={renderLazyRoute(<ToolHubPage />)} />
          <Route path="toolhub" element={<Navigate to="/app/tools" replace />} />

          <Route path="tools/guru" element={renderLazyRoute(<GuruToolHostPage />)} />
          <Route path="tools/discovery" element={renderLazyRoute(<DiscoveryWizardPage />)} />

          <Route path="tools/catalog" element={renderLazyRoute(<CataloguePage />)} />
          <Route path="tools/catalogue" element={renderLazyRoute(<CataloguePage />)} />
          <Route path="catalog" element={<Navigate to="/app/tools/catalog" replace />} />
          <Route path="catalogue" element={<Navigate to="/app/tools/catalog" replace />} />

          <Route path="tools/proposal" element={renderLazyRoute(<ProposalPage />)} />
          <Route path="tools/navigator" element={renderLazyRoute(<AvNavigatorPage />)} />
          <Route path="tools/sales" element={renderLazyRoute(<SalesPositioningPage />)} />

          <Route path="tools/training" element={renderLazyRoute(<TrainingHubPage />)} />
          <Route path="tools/templates" element={renderLazyRoute(<TemplatesPage />)} />
          <Route path="tools/import-intake" element={renderLazyRoute(<ImportIntakePage />)} />
          <Route path="import" element={<Navigate to="/app/tools/import-intake" replace />} />

          <Route
            path="tools/product-intelligence"
            element={renderLazyRoute(<ProductIntelligencePage />)}
          />
          <Route
            path="tools/competitor-lookup-diagnostics"
            element={renderLazyRoute(<CompetitorLookupDiagnosticsPage />)}
          />

          <Route path="tools/room-wizard" element={renderLazyRoute(<RoomWizardPage />)} />
          <Route path="tools/room-wizard/new" element={renderLazyRoute(<RoomWizardPage />)} />
          <Route path="tools/video-wall" element={renderLazyRoute(<VideoWallPlannerPage />)} />
          <Route path="tools/videowall" element={<Navigate to="/app/tools/video-wall" replace />} />

          <Route path="tools/compare" element={renderLazyRoute(<CompetitorComparePage />)} />
          <Route
            path="tools/competitor-compare"
            element={<Navigate to="/app/tools/compare" replace />}
          />
          <Route path="settings/workspace" element={<Navigate to="/app/dashboard" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
