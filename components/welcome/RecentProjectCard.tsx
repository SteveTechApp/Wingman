import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectData } from '../../utils/types';
import { useProjectContext } from '../../context/ProjectContext';
import { formatDistanceToNow } from 'date-fns';

interface RecentProjectCardProps {
  project: ProjectData;
}

const RecentProjectCard: React.FC<RecentProjectCardProps> = ({ project }) => {
  const { handleDeleteProject } = useProjectContext();
  const navigate = useNavigate();

  const handleLoad = (projectId: string) => {
    navigate(`/design/${projectId}`);
  };

  return (
    <div className="bg-input-bg p-4 rounded-lg border border-border-color flex flex-col justify-between group transition-all duration-300 hover:border-accent-border-subtle hover:shadow-xl hover:-translate-y-1">
      <div>
        <h3 className="font-bold text-lg text-text-primary">{project.projectName}</h3>
        <p className="text-sm text-text-secondary mb-2">Client: {project.clientName}</p>
        <p className="text-xs text-text-secondary font-mono">
          {formatDistanceToNow(new Date(project.lastSaved), { addSuffix: true })}
        </p>
      </div>
      <div className="mt-6 flex justify-between items-center">
        <button onClick={() => handleLoad(project.projectId)} className="font-semibold text-accent hover:underline text-sm">
          Load Project
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to delete "${project.projectName}"?`)) {
              handleDeleteProject(project.projectId);
            }
          }}
          className="text-destructive opacity-0 group-hover:opacity-100 text-xs font-semibold transition-opacity"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default RecentProjectCard;