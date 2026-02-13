import React, { lazy } from ""react"";
import { Navigate, Route, Routes } from ""react-router-dom"";

import AppShell from ""@/layout/AppShell"";
import RequireAuth from ""@/auth/RequireAuth"";

const PublicLandingPage = lazy(() => import(""@/pages/PublicLandingPage""));
const LoginPage = lazy(() => import(""@/pages/LoginPage""));
const SignupPage = lazy(() => import(""@/pages/SignupPage""));
const WelcomeScreen = lazy(() => import(""@/pages/WelcomeScreen""));
const NotFoundPage = lazy(() => import(""@/pages/NotFoundPage""));

const DashboardPage = lazy(() => import(""@/pages/DashboardPage""));
const ProjectsPage = lazy(() => import(""@/pages/ProjectsPage""));
const ProjectOverviewPage = lazy(() => import(""@/pages/ProjectOverviewPage""));
const ProjectSetupScreen = lazy(() => import(""@/pages/ProjectSetupScreen""));

const ImportIntakePage = lazy(() => import(""@/pages/ImportIntakePage""));
const SurveyImportPage = lazy(() => import(""@/pages/SurveyImportPage""));

const ToolHubPage = lazy(() => import(""@/pages/ToolHubPage""));
const WorkspaceHomePage = lazy(() => import(""@/pages/WorkspaceHomePage""));

const RoomEditorEntry = lazy(() => import(""@/pages/RoomEditorEntry""));
const VideoWallPage = lazy(() => import(""@/pages/VideoWallPage""));
const TemplateBrowserScreen = lazy(() => import(""@/pages/TemplateBrowserScreen""));
const ProposalDisplay = lazy(() => import(""@/pages/ProposalDisplay""));
const TrainingPage = lazy(() => import(""@/pages/TrainingPage""));
const VideoGeneratorPage = lazy(() => import(""@/pages/VideoGeneratorPage""));
const AnalyticsPage = lazy(() => import(""@/pages/AnalyticsPage""));

const ComparisonPage = lazy(() => import(""@/pages/ComparisonPage""));
const CompetitorComparisonPage = lazy(() => import(""@/pages/CompetitorComparisonPage""));

const DesignCoPilot = lazy(() => import(""@/pages/DesignCoPilot""));
const AgentInputForm = lazy(() => import(""@/pages/AgentInputForm""));
const QuickQuestionPage = lazy(() => import(""@/pages/QuickQuestionPage""));

const CustomerDiscoveryWizard = lazy(() => import(""@/pages/CustomerDiscoveryWizard""));
const GuidedProjectWizard = lazy(() => import(""@/pages/GuidedProjectWizard""));

export default function AppRoutes() {
  return (
    <Routes>

{/* Wingman Auto Redirects */}
<Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
<Route path="/projects" element={<Navigate to="/app/projects" replace />} />
<Route path="/import" element={<Navigate to="/app/import" replace />} />
<Route path="/toolhub" element={<Navigate to="/app/toolhub" replace />} />
<Route path="/tools/*" element={<Navigate to="/app/toolhub" replace />} />

      {/* Public */}
      <Route path=""/"" element={<PublicLandingPage />} />
      <Route path=""/welcome"" element={<WelcomeScreen />} />
      <Route path=""/login"" element={<LoginPage />} />
      <Route path=""/signup"" element={<SignupPage />} />

      {/* Legacy redirects (keep old links working) */}
      <Route path=""/app/dashboard"" element={<Navigate to=""/app/app/dashboard"" replace />} />
      <Route path=""/app/projects"" element={<Navigate to=""/app/app/projects"" replace />} />
      <Route path=""/app/import"" element={<Navigate to=""/app/app/import"" replace />} />
      <Route path=""/app/toolhub"" element={<Navigate to=""/app/app/toolhub"" replace />} />
      <Route path=""/workspace"" element={<Navigate to=""/app/workspace"" replace />} />

      <Route path=""/app/compare"" element={<Navigate to=""/app/app/tools/compare"" replace />} />
      <Route path=""/app/competitor-compare"" element={<Navigate to=""/app/app/tools/competitor-compare"" replace />} />

      {/* Handle legacy no-leading-slash tool links like tools/room */}
      <Route path=""tools/*"" element={<Navigate to=""/app/app/toolhub"" replace />} />

      {/* Authenticated App */}
      <Route
        path=""/app""
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to=""/app/app/dashboard"" replace />} />

        {/* Core */}
        <Route path=""dashboard"" element={<DashboardPage />} />
        <Route path=""projects"" element={<ProjectsPage />} />
        <Route path=""projects/:id"" element={<ProjectOverviewPage />} />
        <Route path=""setup"" element={<ProjectSetupScreen />} />

        <Route path=""import"" element={<ImportIntakePage />} />
        <Route path=""survey-import"" element={<SurveyImportPage />} />

        <Route path=""toolhub"" element={<ToolHubPage />} />
        <Route path=""workspace"" element={<WorkspaceHomePage />} />

        {/* Tools / Wizards / Helpers */}
        <Route path=""tools/room"" element={<RoomEditorEntry />} />
        <Route path=""tools/videowall"" element={<VideoWallPage />} />
        <Route path=""tools/templates"" element={<TemplateBrowserScreen />} />
        <Route path=""tools/proposal"" element={<ProposalDisplay />} />
        <Route path=""tools/training"" element={<TrainingPage />} />
        <Route path=""tools/video-generator"" element={<VideoGeneratorPage />} />
        <Route path=""tools/analytics"" element={<AnalyticsPage />} />

        <Route path=""tools/compare"" element={<ComparisonPage />} />
        <Route path=""tools/competitor-compare"" element={<CompetitorComparisonPage />} />

        <Route path=""tools/copilot"" element={<DesignCoPilot />} />
        <Route path=""tools/agent"" element={<AgentInputForm />} />
        <Route path=""tools/ask"" element={<QuickQuestionPage />} />

        <Route path=""tools/discovery"" element={<CustomerDiscoveryWizard />} />
        <Route path=""tools/guided-project"" element={<GuidedProjectWizard />} />

        {/* Safety redirects inside /app */}
        <Route path=""compare"" element={<Navigate to=""/app/app/tools/compare"" replace />} />
        <Route path=""competitor-compare"" element={<Navigate to=""/app/app/tools/competitor-compare"" replace />} />

        <Route path=""*"" element={<NotFoundPage />} />
      </Route>

      <Route path=""*"" element={<NotFoundPage />} />
    </Routes>
  );
}