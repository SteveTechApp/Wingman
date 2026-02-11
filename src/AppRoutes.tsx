import React, { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "@/layout/AppShell";
import RequireAuth from "@/auth/RequireAuth";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const SignupPage = lazy(() => import("@/pages/SignupPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const ToolHubPage = lazy(() => import("@/pages/ToolHubPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ProjectOverviewPage = lazy(() => import("@/pages/ProjectOverviewPage"));
const ImportIntakePage = lazy(() => import("@/pages/ImportIntakePage"));

const ComparisonPage = lazy(() => import("@/pages/ComparisonPage"));
const CompetitorComparisonPage = lazy(() => import("@/pages/CompetitorComparisonPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const ProposalDisplay = lazy(() => import("@/pages/ProposalDisplay"));
const TrainingPage = lazy(() => import("@/pages/TrainingPage"));
const CustomerDiscoveryWizard = lazy(() => import("@/pages/CustomerDiscoveryWizard"));
const GuidedProjectWizard = lazy(() => import("@/pages/GuidedProjectWizard"));
const RoomEditorEntry = lazy(() => import("@/pages/RoomEditorEntry"));
const VideoWallPage = lazy(() => import("@/pages/VideoWallPage"));
const TemplateBrowserScreen = lazy(() => import("@/pages/TemplateBrowserScreen"));
const QuickQuestionPage = lazy(() => import("@/pages/QuickQuestionPage"));
const AgentInputForm = lazy(() => import("@/pages/AgentInputForm"));
const DesignCoPilot = lazy(() => import("@/pages/DesignCoPilot"));

/** Extra/legacy pages (wired so they can be accessed & evaluated) */
const LandingPage = lazy(() => import("@/pages/Landing"));
const WelcomeScreenPage = lazy(() => import("@/pages/WelcomeScreen"));
const WorkspaceHomePagePage = lazy(() => import("@/pages/WorkspaceHomePage"));
const ProjectSetupScreenPage = lazy(() => import("@/pages/ProjectSetupScreen"));
const SurveyImportPage = lazy(() => import("@/pages/SurveyImportPage"));
const VideoGeneratorPage = lazy(() => import("@/pages/VideoGeneratorPage"));

export default function AppRoutes() {
  return (
    <React.Suspense fallback={<div className="p-4">Loading…</div>}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Convenience redirects (old links -> canonical) */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="/import" element={<Navigate to="/app/import" replace />} />
        <Route path="/toolhub" element={<Navigate to="/app/toolhub" replace />} />

        {/* Tool aliases */}
        <Route path="/app/compare" element={<Navigate to="/app/tools/compare" replace />} />
        <Route path="/app/competitor-compare" element={<Navigate to="/app/tools/competitor-compare" replace />} />

        {/* Authenticated app under /app */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Core */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectOverviewPage />} />
          <Route path="import" element={<ImportIntakePage />} />
          <Route path="toolhub" element={<ToolHubPage />} />

          {/* Tools */}
          <Route path="tools/compare" element={<ComparisonPage />} />
          <Route path="tools/competitor-compare" element={<CompetitorComparisonPage />} />
          <Route path="tools/analytics" element={<AnalyticsPage />} />
          <Route path="tools/proposal" element={<ProposalDisplay />} />
          <Route path="tools/training" element={<TrainingPage />} />
          <Route path="tools/discovery" element={<CustomerDiscoveryWizard />} />
          <Route path="tools/guided-project" element={<GuidedProjectWizard />} />
          <Route path="tools/room" element={<RoomEditorEntry />} />
          <Route path="tools/videowall" element={<VideoWallPage />} />
          <Route path="tools/templates" element={<TemplateBrowserScreen />} />
          <Route path="tools/ask" element={<QuickQuestionPage />} />
          <Route path="tools/agent" element={<AgentInputForm />} />
          <Route path="tools/copilot" element={<DesignCoPilot />} />
          <Route path="tools/video-generator" element={<VideoGeneratorPage />} />

          {/* Extra pages (wired for access/testing) */}
          <Route path="landing" element={<LandingPage />} />
          <Route path="welcome" element={<WelcomeScreenPage />} />
          <Route path="workspace" element={<WorkspaceHomePagePage />} />
          <Route path="setup" element={<ProjectSetupScreenPage />} />
          <Route path="survey-import" element={<SurveyImportPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  );
}