import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "@/app/shell/AppShell";
import PublicShell from "@/pages/public/PublicShell";

// Public pages
const PublicLandingPage = lazy(() => import("@/pages/public/PublicLandingPage"));
const PublicAboutPage = lazy(() => import("@/pages/public/PublicAboutPage"));

// App pages
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const TemplatesPage = lazy(() => import("@/features/misc/TemplatesPage"));
const CatalogPage = lazy(() => import("@/features/catalog/CatalogPage"));
const ProjectsPage = lazy(() => import("@/features/projects/ProjectsPage"));
const ImportIntakePage = lazy(() => import("@/features/import/ImportIntakePage"));
const CompetitorComparePage = lazy(() => import("@/features/compare/CompetitorComparePage"));
const ProposalBuilderPage = lazy(() => import("@/features/proposals/ProposalBuilderPage"));
const RoomWizardPage = lazy(() => import("@/features/roomwizard/RoomWizardPage"));
const VideoWallPlannerPage = lazy(() => import("@/features/misc/VideoWallPlannerPage"));
const TrainingHubPage = lazy(() => import("@/features/misc/TrainingHubPage"));
const GuruPage = lazy(() => import("@/features/guru/GuruPage"));
const NotFoundPage = lazy(() => import("@/app/system/NotFoundPage"));

function Loading() {
  return <div style={{ padding: 24, opacity: 0.8 }}>Loading…</div>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<PublicLandingPage />} />
          <Route path="/about" element={<PublicAboutPage />} />
        </Route>

        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="survey-import" element={<ImportIntakePage />} />

          <Route path="tools/catalog" element={<CatalogPage />} />

          <Route path="tools/competitor" element={<CompetitorComparePage />} />
          <Route path="tools/proposal" element={<ProposalBuilderPage />} />
          <Route path="tools/room" element={<RoomWizardPage />} />
          <Route path="tools/videowall" element={<VideoWallPlannerPage />} />
          <Route path="tools/training" element={<TrainingHubPage />} />
          <Route path="tools/guru" element={<GuruPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}