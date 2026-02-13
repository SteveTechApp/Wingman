import React, { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PublicShell from "@/app/shell/PublicShell";
import AppShell from "@/app/shell/AppShell";
import RequireAuth from "@/auth/RequireAuth";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const ToolHubPage = lazy(() => import("@/pages/ToolHubPage"));

/** Tools (public) */

const ToolCatalog = lazy(() => import("@/pages/tools/ProductCatalogPage"));\nconst ToolCompetitor = lazy(() => import("@/pages/tools/CompetitorComparePage"));
const ToolProposal   = lazy(() => import("@/pages/tools/ProposalBuilderPage"));
const ToolRoom       = lazy(() => import("@/pages/tools/RoomWizardPage"));
const ToolTraining   = lazy(() => import("@/pages/tools/TrainingHubPage"));
const ToolVideowall  = lazy(() => import("@/pages/tools/VideoWallPlannerPage"));

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
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}