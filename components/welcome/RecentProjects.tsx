import React from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import RecentProjectCard from './RecentProjectCard';

const RecentProjects: React.FC = () => {
  const { savedProjects } = useProjectContext();

  const sortedProjects = [...savedProjects].sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()).slice(0, 6);

  return (
    <div className="bg-background-secondary p-4 rounded-xl border border-border-color h-full flex flex-col">
      {sortedProjects.length > 0 ? (
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-grow max-h-[600px]">
          {sortedProjects.map(project => (
            <RecentProjectCard key={project.projectId} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center py-12">
            <p className="text-sm text-text-secondary">No recent projects found.</p>
        </div>
      )}
    </div>
  );
};

export default RecentProjects;