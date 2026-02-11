
import React from 'react';
import PageShell from "@/components/layout/PageShell";
import { useProjectContext } from "@/context/ProjectContext";
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsPage: React.FC = () => {
    const { savedProjects } = useProjectContext();

    if (!savedProjects) {
        return (
    <PageShell>
      <div className="wm-page\ min-h-0\ w-full\ overflow-visible\ overflow-x-hidden flex\ items-center\ justify-center\ min-h-0">
                <LoadingSpinner />
            </div>
    </PageShell>
  );
    }

    return (
    <PageShell>
      <div className="wm-page\ min-h-0\ w-full\ overflow-visible\ overflow-x-hidden flex\ items-center\ justify-center\ min-h-0">
                <LoadingSpinner />
            </div>
    </PageShell>
  );
};

export default AnalyticsPage;



