import React, { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "@/app/shell/AppShell";
import PublicShell from "@/app/shell/PublicShell";
import RequireAuth from "@/auth/RequireAuth";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const ToolHubPage = lazy(() => import("@/pages/ToolHubPage"));

/** Tools (public) */
const ToolCatalog = lazy(() => import("@/pages/tools/ProductCatalogPage"));
const ToolCompetitor = lazy(() => import("@/pages/tools/CompetitorComparePage"));
const ToolProposal = lazy(() => import("@/pages/tools/ProposalBuilderPage"));
const ToolRoom = lazy(() => import("@/pages/tools/RoomWizardPage"));
const ToolTraining = lazy(() => import("@/pages/tools/TrainingHubPage"));
const ToolVideowall = lazy(() => import("@/pages/tools/VideoWallPlannerPage"));

/** Workspace (protected) */
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ImportIntakePage = lazy(() => import("@/pages/ImportIntakePage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<PublicLandingPage />} />
        <Route path="/tools" element={<ToolHubPage />} />
        <Route path="/tools/competitor-compare" element={<ToolCompetitor />} />
        <Route path="/tools/proposal-builder" element={<ToolProposal />} />
        <Route path="/tools/room-wizard" element={<ToolRoom />} />
        <Route path="/tools/training-hub" element={<ToolTraining />} />
        <Route path="/tools/video-wall-planner" element={<ToolVideowall />} />
        <Route path="/tools/catalog" element={<ToolCatalog />} />

        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/welcome" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/workspace" element={<Navigate to="/app/dashboard" replace />} />

        <Route path="/tools/compare" element={<Navigate to="/tools/competitor-compare" replace />} />
        <Route path="/tools/proposal" element={<Navigate to="/tools/proposal-builder" replace />} />
        <Route path="/tools/room" element={<Navigate to="/tools/room-wizard" replace />} />
        <Route path="/tools/videowall" element={<Navigate to="/tools/video-wall-planner" replace />} />
        <Route path="/tools/video-generator" element={<Navigate to="/tools/video-wall-planner" replace />} />
        <Route path="/tools/discovery" element={<Navigate to="/app/import" replace />} />
        <Route path="/tools/guided-project" element={<Navigate to="/tools/room-wizard" replace />} />
        <Route path="/tools/copilot" element={<Navigate to="/app/import" replace />} />
        <Route path="/tools/analytics" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/tools/agent" element={<Navigate to="/app/import" replace />} />
        <Route path="/tools/ask" element={<Navigate to="/app/import" replace />} />
        <Route path="/tools/training" element={<Navigate to="/tools/training-hub" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Route>

      {/* Protected workspace */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />
        <Route path="/app/projects" element={<ProjectsPage />} />
        <Route path="/app/import" element={<ImportIntakePage />} />

        {/* Legacy route compatibility */}
        <Route path="/app/toolhub" element={<Navigate to="/tools" replace />} />
        <Route path="/app/workspace" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/app/setup" element={<Navigate to="/tools/room-wizard" replace />} />
        <Route path="/app/survey-import" element={<Navigate to="/app/import" replace />} />
        <Route path="/app/tools/templates" element={<Navigate to="/tools/catalog" replace />} />
        <Route path="/app/tools/videowall" element={<Navigate to="/tools/video-wall-planner" replace />} />
        <Route path="/app/tools/training" element={<Navigate to="/tools/training-hub" replace />} />
        <Route path="/app/tools/ask" element={<Navigate to="/app/import" replace />} />
        <Route path="/app/tools/agent" element={<Navigate to="/app/import" replace />} />
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="/import" element={<Navigate to="/app/import" replace />} />
        <Route path="/toolhub" element={<Navigate to="/tools" replace />} />
        <Route path="/app/compare" element={<Navigate to="/tools/competitor-compare" replace />} />
        <Route path="/app/competitor-compare" element={<Navigate to="/tools/competitor-compare" replace />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
