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

        {/* Legacy root -> canonical /app */}
        <Route path="/app/app/dashboard" element={<Navigate to="/app/app/dashboard" replace />} />
        <Route path="/app/app/projects" element={<Navigate to="/app/app/projects" replace />} />
        <Route path="/app/projects/:id" element={<Navigate to="/app/app/projects" replace />} />
        <Route path="/app/app/import" element={<Navigate to="/app/app/import" replace />} />
        <Route path="/app/app/toolhub" element={<Navigate to="/app/app/toolhub" replace />} />

        <Route path="/app/app/toolhub" element={<Navigate to="/app/app/toolhub" replace />} />
        <Route path="/app/app/tools/compare" element={<Navigate to="/app/app/tools/compare" replace />} />
        <Route path="/app/app/tools/competitor-compare" element={<Navigate to="/app/app/tools/competitor-compare" replace />} />
        <Route path="/app/app/tools/analytics" element={<Navigate to="/app/app/tools/analytics" replace />} />
        <Route path="/app/app/tools/proposal" element={<Navigate to="/app/app/tools/proposal" replace />} />
        <Route path="/app/app/tools/training" element={<Navigate to="/app/app/tools/training" replace />} />
        <Route path="/app/app/tools/discovery" element={<Navigate to="/app/app/tools/discovery" replace />} />
        <Route path="/app/app/tools/guided-project" element={<Navigate to="/app/app/tools/guided-project" replace />} />
        <Route path="/app/app/tools/room" element={<Navigate to="/app/app/tools/room" replace />} />
        <Route path="/app/app/tools/videowall" element={<Navigate to="/app/app/tools/videowall" replace />} />
        <Route path="/app/app/tools/templates" element={<Navigate to="/app/app/tools/templates" replace />} />
        <Route path="/app/app/tools/ask" element={<Navigate to="/app/app/tools/ask" replace />} />
        <Route path="/app/app/tools/agent" element={<Navigate to="/app/app/tools/agent" replace />} />
        <Route path="/app/app/tools/copilot" element={<Navigate to="/app/app/tools/copilot" replace />} />

        {/* Authenticated app under /app */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/app/dashboard" replace />} />

          {/* Core */}
          <Route path="/app/app/dashboard" element={<DashboardPage />} />
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

          {/* Extra pages (wired for access/testing) */}
          <Route path="landing" element={<LandingPage />} />
          <Route path="welcome" element={<WelcomeScreenPage />} />
          <Route path="workspace" element={<WorkspaceHomePagePage />} />
          <Route path="setup" element={<ProjectSetupScreenPage />} />
          <Route path="survey-import" element={<SurveyImportPage />} />
          <Route path="tools/video-generator" element={<VideoGeneratorPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  );
}
