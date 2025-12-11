import React from 'react';
import { ProjectData, Proposal } from '../../utils/types';
import Logo from '../layout/Logo';

interface ProposalHeaderProps {
  project: ProjectData;
  proposal: Proposal;
}

const ProposalHeader: React.FC<ProposalHeaderProps> = ({ project, proposal }) => {
  return (
    <header className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
      <div>
        <h1 className="text-4xl font-bold">{project.projectName}</h1>
        <h2 className="text-xl text-gray-600">Proposal for {project.clientName}</h2>
      </div>
      <div className="text-right">
        <Logo />
        <p className="text-sm mt-2">Version: {proposal.version}</p>
        <p className="text-sm">Date: {new Date(proposal.createdAt).toLocaleDateString()}</p>
      </div>
    </header>
  );
};

export default ProposalHeader;