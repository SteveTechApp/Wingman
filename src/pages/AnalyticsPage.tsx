import React from 'react';
import { useProjectContext } from '../context/ProjectContext';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsPage: React.FC = () => {
    const { savedProjects } = useProjectContext();

    if (!savedProjects) {
        return (
            <div className="h-full w-full overflow-y-auto overflow-x-hiddenflex items-center justify-center h-full">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto overflow-x-hiddenmax-w-7xl mx-auto px-4 py-8 animate-fade-in-fast">
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">
                    Analytics Dashboard
                </h1>
                <p className="text-lg text-text-secondary">
                    Insights and statistics from your projects
                </p>
            </div>

            {savedProjects.length === 0 ? (
                <div className="bg-background-secondary border border-border-color rounded-xl p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-2xl font-bold mb-2">No Projects Yet</h2>
                    <p className="text-text-secondary">
                        Create your first project to see analytics and insights.
                    </p>
                </div>
            ) : (
                <AnalyticsDashboard projects={savedProjects} />
            )}
        </div>
    );
};

export default AnalyticsPage;
