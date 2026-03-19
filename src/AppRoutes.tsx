import * as React from "react";

import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "@/app/shell/AppShell";
import ProductIntelligenceAdminGate from "@/components/admin/ProductIntelligenceAdminGate";

import RequireAuth from "@/auth/RequireAuth";

// Public
const PublicLandingPage = React.lazy(() => import("@/pages/PublicLandingPage"));
const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const SignupPage = React.lazy(() => import("@/pages/SignupPage"));
const InviteAcceptancePage = React.lazy(() => import("@/pages/InviteAcceptancePage"));

// Core app
const DashboardPage = React.lazy(() => import("@/features/dashboard/DashboardPage"));
const ProjectsPage = React.lazy(() => import("@/features/projects/ProjectsPage"));
const ProjectNewPage = React.lazy(() => import("@/features/projects/ProjectNewPage"));
const ToolHubPage = React.lazy(() => import("@/features/tools/ToolHubPage"));
const AvNavigatorPage = React.lazy(() => import("@/features/navigator/AvNavigatorPage"));

// Tools / workflows
const DiscoveryWizardPage = React.lazy(() => import("@/features/discovery/DiscoveryWizardPage"));
const CatalogPage = React.lazy(() => import("@/features/catalog/CatalogPage"));
const CompetitorComparePage = React.lazy(() => import("@/features/compare/CompetitorComparePage"));
const RoomWizardPage = React.lazy(() => import("@/features/room-wizard/RoomWizardPage"));
const ProposalBuilderPage = React.lazy(() => import("@/features/proposals/ProposalBuilderPage"));
const ImportIntakePage = React.lazy(() => import("@/features/import/ImportIntakePage"));
const TrainingHubPage = React.lazy(() => import("@/features/misc/TrainingHubPage"));
const VideoWallPlannerPage = React.lazy(() => import("@/features/misc/VideoWallPlannerPage"));
const TemplatesPage = React.lazy(() => import("@/features/templates/TemplatesPage"));
const GuruToolHostPage = React.lazy(() => import("@/features/guru/GuruToolHostPage"));
const ProductIntelligencePage = React.lazy(() => import("@/features/support/ProductIntelligencePage"));
const CompetitorLookupDiagnosticsPage = React.lazy(() => import("@/features/support/CompetitorLookupDiagnosticsPage"));

// Pages
const ProjectOverviewPage = React.lazy(() => import("@/pages/ProjectOverviewPage"));

// System
const NotFoundPage = React.lazy(() => import("@/app/system/NotFoundPage"));

function Loading() {
  return <div className="wm-route-loading">Loading...</div>;
}

export default function AppRoutes() {
  return (
    <React.Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/invite" element={<InviteAcceptancePage />} />

        {/* App shell */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          {/* Core */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<ProjectNewPage />} />
          <Route path="projects/:id" element={<ProjectOverviewPage />} />
          <Route path="tools" element={<ToolHubPage />} />

          {/* Tools */}
          <Route path="tools/navigator" element={<AvNavigatorPage />} />
          <Route path="tools/discovery" element={<DiscoveryWizardPage />} />
          <Route path="tools/catalog" element={<CatalogPage />} />
          <Route path="tools/compare" element={<CompetitorComparePage />} />
          <Route path="tools/guru" element={<GuruToolHostPage />} />
          <Route path="tools/room-wizard" element={<RoomWizardPage />} />
          <Route path="tools/proposal" element={<ProposalBuilderPage />} />
          <Route path="tools/import-intake" element={<ImportIntakePage />} />
          <Route path="tools/training" element={<TrainingHubPage />} />
          <Route path="tools/video-wall" element={<VideoWallPlannerPage />} />
          <Route path="tools/templates" element={<TemplatesPage />} />
          <Route path="tools/product-intelligence" element={<ProductIntelligenceAdminGate><ProductIntelligencePage /></ProductIntelligenceAdminGate>} />
          <Route path="tools/competitor-lookup-diagnostics" element={<CompetitorLookupDiagnosticsPage />} />

          {/* Friendly aliases */}
          <Route path="toolhub" element={<Navigate to="/app/tools" replace />} />
          <Route path="navigator" element={<Navigate to="/app/tools/navigator" replace />} />
          <Route path="catalogue" element={<Navigate to="/app/tools/catalog" replace />} />
          <Route path="compare" element={<Navigate to="/app/tools/compare" replace />} />
          <Route path="training" element={<Navigate to="/app/tools/training" replace />} />
          <Route path="templates" element={<Navigate to="/app/tools/templates" replace />} />
          <Route path="import" element={<Navigate to="/app/tools/import-intake" replace />} />
          <Route path="survey-import" element={<Navigate to="/app/tools/import-intake" replace />} />
          <Route path="settings/workspace" element={<Navigate to="/app/projects" replace />} />

          {/* App 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  );
}
