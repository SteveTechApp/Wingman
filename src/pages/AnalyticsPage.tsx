import React from 'react';
import { useProjectContext } from '../context/ProjectContext';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsPage: React.FC = () => {
    const { savedProjects } = useProjectContext();

    if (!savedProjects) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar p-4 md:p-6">
            <div className="max-w-7xl mx-auto animate-fade-in-fast">
                {/* Page Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">
                        Analytics Dashboard
                    </h1>
                    <p className="text-lg text-text-secondary">
                        Insights and statistics from your projects
                    </p>
                </div>

                {/* Main Container with Current Process Header */}
                <div className="bg-background-secondary border-2 border-border-color rounded-xl shadow-xl overflow-hidden">
                    {/* Current Process Header */}
                    <div className="bg-accent text-white px-4 py-3">
                        <h2 className="text-lg font-bold uppercase tracking-wide">
                            Current Process: Project Analytics
                        </h2>
                    </div>

                    <div className="p-6">
                        {savedProjects.length === 0 ? (
                            <div className="border border-border-color rounded-xl p-12 text-center bg-background">
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
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
