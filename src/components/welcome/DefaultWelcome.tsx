import React from 'react';
import RecentProjects from './RecentProjects';
import { GridIcon, PlusIcon, SparklesIcon, DocumentScannerIcon } from '../Icons';
import ActionButton from './ActionButton';
import WelcomeHeader from './WelcomeHeader';

const DefaultWelcome: React.FC = () => {
    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar">
            <div className="container mx-auto p-6 md:p-8 max-w-7xl flex flex-col min-h-full gap-8 pb-20">
                <div className="flex-shrink-0">
                    <WelcomeHeader />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
                    {/* Actions Column */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-border-color">
                            <h2 className="text-lg font-bold uppercase tracking-widest text-text-primary">// Start Designing</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ActionButton
                                to="/setup"
                                icon={<PlusIcon />}
                                title="New Project"
                                description="Start from scratch with the project wizard."
                            />
                            <ActionButton
                                to="/templates"
                                icon={<GridIcon />}
                                title="Templates"
                                description="Browse pre-configured room designs."
                            />
                             <ActionButton
                                to="/agent"
                                icon={<SparklesIcon />}
                                title="AI Analyst"
                                description="Build a project from a client brief or email."
                            />
                            <ActionButton
                                to="/survey"
                                icon={<DocumentScannerIcon />}
                                title="Site Survey"
                                description="Import data from a survey document."
                            />
                        </div>
                    </div>

                    {/* Recent Projects Column */}
                    <div className="lg:col-span-5 flex flex-col gap-6 h-full">
                         <div className="flex items-center gap-2 pb-2 border-b border-border-color">
                            <h2 className="text-lg font-bold uppercase tracking-widest text-text-primary">// Recent Work</h2>
                        </div>
                        <div className="flex-grow h-full min-h-[300px]">
                            <RecentProjects />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DefaultWelcome;