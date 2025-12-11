import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Layouts
import AppLayout from './components/layout/AppLayout';
import ProposalLayout from './components/layout/ProposalLayout';

// Lazy load all page components
const WelcomeScreen = lazy(() => import('./pages/WelcomeScreen'));
const GuidedProjectWizard = lazy(() => import('./pages/GuidedProjectWizard'));
const AgentInputForm = lazy(() => import('./pages/AgentInputForm'));
const DesignCoPilot = lazy(() => import('./pages/DesignCoPilot'));
const ProposalDisplay = lazy(() => import('./pages/ProposalDisplay'));
const TrainingPage = lazy(() => import('./pages/TrainingPage'));
const TemplateBrowserScreen = lazy(() => import('./pages/TemplateBrowserScreen'));
const QuickQuestionPage = lazy(() => import('./pages/QuickQuestionPage'));
const SurveyImportPage = lazy(() => import('./pages/SurveyImportPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const suspenseFallback = (
    <div className="flex h-full w-full items-center justify-center p-10">
        <LoadingSpinner />
    </div>
);

// Layout wrapper for main app routes
const MainLayout = () => (
    <AppLayout>
        <Suspense fallback={suspenseFallback}>
            <Outlet />
        </Suspense>
    </AppLayout>
);

// Layout wrapper for proposal routes
const PrintLayout = () => (
    <ProposalLayout>
        <Suspense fallback={suspenseFallback}>
            <Outlet />
        </Suspense>
    </ProposalLayout>
);


const AppRoutes = () => (
    <Routes>
        {/* Main application routes with full layout */}
        <Route element={<MainLayout />}>
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/setup" element={<GuidedProjectWizard />} />
            <Route path="/agent" element={<AgentInputForm />} />
            <Route path="/survey" element={<SurveyImportPage />} />
            <Route path="/design/:projectId" element={<DesignCoPilot />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/templates" element={<TemplateBrowserScreen />} />
            <Route path="/ask" element={<QuickQuestionPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Proposal routes with print-friendly layout */}
        <Route element={<PrintLayout />}>
            <Route path="/proposal/:projectId/:proposalId" element={<ProposalDisplay />} />
        </Route>
    </Routes>
);

export default AppRoutes;