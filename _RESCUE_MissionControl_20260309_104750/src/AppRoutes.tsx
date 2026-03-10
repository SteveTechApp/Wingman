import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "@/app/shell/AppShell";

// Public
const PublicLandingPage = React.lazy(() => import("@/pages/PublicLandingPage"));
const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const SignupPage = React.lazy(() => import("@/pages/SignupPage"));

// Core app
const DashboardPage = React.lazy(() => import("@/features/dashboard/DashboardPage"));
const ProjectsPage = React.lazy(() => import("@/features/projects/ProjectsPage"));
const ToolHubPage = React.lazy(() => import("@/features/tools/ToolHubPage"));
const VideoWallDesignerPage = React.lazy(() => import("@/features/video-wall/VideoWallDesignerPage"));
const ExportSnapshotPage = React.lazy(() => import("@/features/export/ExportSnapshotPage"));

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

// Pages
const QuickQuestionPage = React.lazy(() => import("@/pages/QuickQuestionPage"));
const ComparisonPage = React.lazy(() => import("@/pages/ComparisonPage"));
const ProjectOverviewPage = React.lazy(() => import("@/pages/ProjectOverviewPage"));
const GuidedProjectWizard = React.lazy(() => import("@/pages/GuidedProjectWizard"));

// System
const NotFoundPage = React.lazy(() => import("@/app/system/NotFoundPage"));

function Loading() {
  return (
    <div style={{ padding: 18, color: "rgba(255,255,255,0.75)" }}>
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

        {/* App shell */}
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          {/* Mission Control */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Projects */}
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="project-overview" element={<ProjectOverviewPage />} />

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

          <Route path="tools/training" element={<TrainingHubPage />} />
          <Route path="tools/video-wall" element={<VideoWallPlannerPage />} />
                    <Route path="tools/templates" element={<TemplatesPage />} />
          <Route path="tools/video-wall-builder" element={<VideoWallBuilderPage />} />
          <Route path="tools/cable-schedule" element={<CableSchedulePage />} />
          <Route path="tools/block-diagram" element={<BlockDiagramPage />} />
          <Route path="tools/design-review" element={<ProjectDesignReviewPage />} />          <Route path="tools/guru" element={<GuruPage />} />

          {/* Utility pages */}
          <Route path="quick-question" element={<QuickQuestionPage />} />
          <Route path="compare" element={<ComparisonPage />} />
          <Route path="guided-wizard" element={<GuidedProjectWizard />} />

          {/* Export */}
          <Route path="export" element={<ExportSnapshotPage />} />

          {/* App 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  );
}