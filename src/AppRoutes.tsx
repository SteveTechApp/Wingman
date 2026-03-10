import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "@/app/shell/AppShell";
import RequireAuth from "@/auth/RequireAuth";

// Public
const PublicLandingPage = React.lazy(() => import("@/pages/PublicLandingPage"));
const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const SignupPage = React.lazy(() => import("@/pages/SignupPage"));
const InviteAcceptancePage = React.lazy(() => import("@/pages/InviteAcceptancePage"));

// Core app
const DashboardPage = React.lazy(() => import("@/features/dashboard/DashboardPage"));
const AboutWingmanPage = React.lazy(() => import("@/pages/AboutWingmanPage"));
const ProjectsPage = React.lazy(() => import("@/features/projects/ProjectsPage"));
const ProjectNewPage = React.lazy(() => import("@/features/projects/ProjectNewPage"));
const ToolHubPage = React.lazy(() => import("@/features/tools/ToolHubPage"));
const ExportSnapshotPage = React.lazy(() => import("@/features/export/ExportSnapshotPage"));
const CompletionChecklistPage = React.lazy(() => import("@/app/pages/CompletionChecklistPage"));

// Tools / workflows
const DiscoveryWizardPage = React.lazy(() => import("@/features/discovery/DiscoveryWizardPage"));
const CatalogPage = React.lazy(() => import("@/features/catalog/CatalogPage"));
const CompetitorComparePage = React.lazy(() => import("@/features/compare/CompetitorComparePage"));
const RoomWizardPage = React.lazy(() => import("@/features/roomwizard/RoomWizardPage"));
const ProposalBuilderPage = React.lazy(() => import("@/features/proposals/ProposalBuilderPage"));
const ImportIntakePage = React.lazy(() => import("@/features/import/ImportIntakePage"));
const TrainingHubPage = React.lazy(() => import("@/features/misc/TrainingHubPage"));
const VideoWallPlannerPage = React.lazy(() => import("@/features/misc/VideoWallPlannerPage"));
const GuruPage = React.lazy(() => import("@/features/guru/GuruPage"));
const BlockDiagramPage = React.lazy(() => import("@/features/diagram/BlockDiagramPage"));
const ProjectDesignReviewPage = React.lazy(() => import("@/features/review/ProjectDesignReviewPage"));
const CableSchedulePage = React.lazy(() => import("@/features/cables/CableSchedulePage"));
const VideoWallBuilderPage = React.lazy(() => import("@/features/videowall/VideoWallBuilderPage"));
const TemplatesPage = React.lazy(() => import("@/features/templates/TemplatesPage"));
const WorkspaceAdminPage = React.lazy(() => import("@/features/workspace/WorkspaceAdminPage"));
const RuntimeDiagnosticsPage = React.lazy(() => import("@/features/support/RuntimeDiagnosticsPage"));
const CompetitorLookupDiagnosticsPage = React.lazy(() => import("@/features/support/CompetitorLookupDiagnosticsPage"));
const ProductIntelligencePage = React.lazy(() => import("@/features/support/ProductIntelligencePage"));

// Pages
const QuickQuestionPage = React.lazy(() => import("@/pages/QuickQuestionPage"));
const ComparisonPage = React.lazy(() => import("@/pages/ComparisonPage"));
const ProjectOverviewPage = React.lazy(() => import("@/pages/ProjectOverviewPage"));
const GuidedProjectWizard = React.lazy(() => import("@/pages/GuidedProjectWizard"));

// System
const NotFoundPage = React.lazy(() => import("@/app/system/NotFoundPage"));

function Loading() {
  return (
    <div className="wm-route-loading">
      Loading...
    </div>
  );
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
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          {/* Mission Control */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="about-wingman" element={<AboutWingmanPage />} />

          {/* Projects */}
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<ProjectNewPage />} />
          <Route path="projects/:id" element={<ProjectOverviewPage />} />
          <Route path="projects/:id/completion" element={<CompletionChecklistPage />} />
          <Route path="project-overview" element={<ProjectOverviewPage />} />
          <Route path="workflow/completion" element={<CompletionChecklistPage />} />
          <Route path="settings/workspace" element={<WorkspaceAdminPage />} />

          {/* Primary hub */}
          <Route path="tools" element={<ToolHubPage />} />

          {/* Tool routes */}
          <Route path="tools/import" element={<ImportIntakePage />} />
          <Route path="tools/import-intake" element={<ImportIntakePage />} />
          <Route path="tools/discovery" element={<DiscoveryWizardPage />} />
          <Route path="tools/catalog" element={<CatalogPage />} />
          <Route path="tools/compare" element={<CompetitorComparePage />} />
          <Route path="tools/room-wizard" element={<RoomWizardPage />} />
          <Route path="tools/proposal" element={<ProposalBuilderPage />} />
          <Route path="tools/proposal-builder" element={<ProposalBuilderPage />} />
          <Route path="tools/completion" element={<CompletionChecklistPage />} />
          <Route path="tools/training" element={<TrainingHubPage />} />
          <Route path="tools/video-wall" element={<VideoWallPlannerPage />} />
          <Route path="tools/templates" element={<TemplatesPage />} />
          <Route path="tools/video-wall-builder" element={<VideoWallBuilderPage />} />
          <Route path="tools/cable-schedule" element={<CableSchedulePage />} />
          <Route path="tools/block-diagram" element={<BlockDiagramPage />} />
          <Route path="tools/design-review" element={<ProjectDesignReviewPage />} />
          <Route path="tools/guru" element={<GuruPage />} />
          <Route path="tools/runtime-diagnostics" element={<RuntimeDiagnosticsPage />} />
          <Route path="tools/competitor-lookup-diagnostics" element={<CompetitorLookupDiagnosticsPage />} />
          <Route path="tools/product-intelligence" element={<ProductIntelligencePage />} />

          {/* Support */}
          <Route path="support/runtime-diagnostics" element={<RuntimeDiagnosticsPage />} />
          <Route path="support/competitor-lookup-diagnostics" element={<CompetitorLookupDiagnosticsPage />} />
          <Route path="support/product-intelligence" element={<ProductIntelligencePage />} />

          {/* Utility pages */}
          <Route path="quick-question" element={<QuickQuestionPage />} />
          <Route path="compare" element={<ComparisonPage />} />
          <Route path="guided-wizard" element={<GuidedProjectWizard />} />

          {/* Export */}
          <Route path="export" element={<ExportSnapshotPage />} />

          {/* Legacy aliases */}
          <Route path="toolhub" element={<Navigate to="/app/tools" replace />} />
          <Route path="toolhub/*" element={<Navigate to="/app/tools" replace />} />
          <Route path="templates" element={<Navigate to="/app/tools/templates" replace />} />
          <Route path="catalogue" element={<Navigate to="/app/tools/catalog" replace />} />
          <Route path="guru" element={<Navigate to="/app/tools/guru" replace />} />
          <Route path="training" element={<Navigate to="/app/tools/training" replace />} />
          <Route path="survey-import" element={<Navigate to="/app/tools/import-intake" replace />} />
          <Route path="tools/competitor" element={<Navigate to="/app/tools/compare" replace />} />
          <Route path="tools/competitor-compare" element={<Navigate to="/app/tools/compare" replace />} />
          <Route path="tools/competitors" element={<Navigate to="/app/tools/compare" replace />} />
          <Route path="tools/room" element={<Navigate to="/app/tools/room-wizard" replace />} />
          <Route path="tools/roomwizard" element={<Navigate to="/app/tools/room-wizard" replace />} />
          <Route path="tools/room-designer" element={<Navigate to="/app/tools/room-wizard" replace />} />
          <Route path="tools/proposals" element={<Navigate to="/app/tools/proposal" replace />} />
          <Route path="tools/videowall" element={<Navigate to="/app/tools/video-wall" replace />} />
          <Route path="tools/video-wall-designer" element={<Navigate to="/app/tools/video-wall" replace />} />

          {/* App 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  );
}
