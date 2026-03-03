
import React from 'react';
import PageShell from "@/components/layout/PageShell";
import { useParams } from 'react-router-dom';
import { useProjectContext } from "@/context/ProjectContext";
import { Proposal } from '../utils/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ProposalHeader from '../components/proposal/ProposalHeader';
import ProposalSection from '../components/proposal/ProposalSection';
import EditableSection from '../components/proposal/EditableSection';
import EquipmentTable from '../components/proposal/EquipmentTable';
import SystemDiagram from '../components/SystemDiagram';
import { exportProposalToDocx } from '../utils/docxExporter';
import { exportEquipmentListToCsv } from '../utils/csvExporter';
import ReactMarkdown from 'react-markdown';

const ProposalDisplay: React.FC = () => {
    const { proposalId } = useParams<{ projectId: string, proposalId: string }>();
    const { projectData, dispatchProjectAction } = useProjectContext();

    const project = projectData;
    const proposal = project?.proposals.find((p: any) => p.proposalId === proposalId);

    if (!project || !proposal) {
        return (
    <PageShell>
      <div className="wm-page\ flex\ flex-col\ items-center\ justify-center\ h-full\ w-full">
                <p className="mb-4">Proposal not found or project is loading...</p>
                <LoadingSpinner />
            </div>
    </PageShell>
  );
    }
    
    const handleContentSave = (field: 'executiveSummary' | 'scopeOfWork', newContent: string) => {
        const updatedProposal: Proposal = {
            ...proposal,
            [field]: newContent,
        };
        dispatchProjectAction({ type: 'UPDATE_PROPOSAL', payload: updatedProposal });
    };

    return (
    <PageShell>
      <div className="wm-page\ flex\ flex-col\ items-center\ justify-center\ h-full\ w-full">
                <p className="mb-4">Proposal not found or project is loading...</p>
                <LoadingSpinner />
            </div>
    </PageShell>
  );
};

export default ProposalDisplay;



