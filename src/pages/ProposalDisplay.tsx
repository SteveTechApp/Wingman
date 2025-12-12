import React from 'react';
import { useParams } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';
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
    const proposal = project?.proposals.find(p => p.proposalId === proposalId);

    if (!project || !proposal) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full">
                <p className="mb-4">Proposal not found or project is loading...</p>
                <LoadingSpinner />
            </div>
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
        <div className="w-full max-w-5xl bg-white text-black p-8 sm:p-12 shadow-xl print:shadow-none font-sans rounded-sm mb-12 mx-auto">
            <div className="fixed top-24 right-8 print:hidden flex flex-col gap-2 z-50">
                <button onClick={() => window.print()} className="bg-gray-700 text-white px-4 py-2 rounded shadow-md hover:bg-gray-800 text-sm font-medium">Print</button>
                <button onClick={() => exportProposalToDocx(proposal, project)} className="bg-blue-600 text-white px-4 py-2 rounded shadow-md hover:bg-blue-700 text-sm font-medium">Export DOCX</button>
                <button onClick={() => exportEquipmentListToCsv(proposal, project.projectName)} className="bg-green-600 text-white px-4 py-2 rounded shadow-md hover:bg-green-700 text-sm font-medium">Export CSV</button>
            </div>
        
            <div className="space-y-12">
                <ProposalHeader project={project} proposal={proposal} />

                <ProposalSection title="Executive Summary">
                    <EditableSection 
                        initialContent={proposal.executiveSummary}
                        onSave={(newContent) => handleContentSave('executiveSummary', newContent)}
                    />
                </ProposalSection>

                <ProposalSection title="Scope of Work">
                        <EditableSection 
                        initialContent={proposal.scopeOfWork}
                        onSave={(newContent) => handleContentSave('scopeOfWork', newContent)}
                    />
                </ProposalSection>
                
                {proposal.systemDiagram && (
                    <ProposalSection title="System Signal Flow">
                        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                            <SystemDiagram diagram={proposal.systemDiagram} />
                        </div>
                    </ProposalSection>
                )}

                <ProposalSection title="Equipment List">
                    <EquipmentTable equipmentList={proposal.equipmentList} />
                </ProposalSection>

                    {proposal.suggestedImprovements && proposal.suggestedImprovements.length > 0 && (
                    <ProposalSection title="Suggested Improvements">
                        <ul className="list-disc list-inside space-y-2 text-gray-800">
                            {proposal.suggestedImprovements.map((imp, index) => (
                                <li key={index}>
                                    <strong>{imp.roomName}:</strong> {imp.improvement}
                                </li>
                            ))}
                        </ul>
                    </ProposalSection>
                )}

                {proposal.upgradeDowngradePaths && proposal.upgradeDowngradePaths.length > 0 && (
                    <ProposalSection title="Tier Upgrade & Downgrade Options">
                        <div className="space-y-6">
                            {proposal.upgradeDowngradePaths.map((path, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-md border border-gray-200 break-inside-avoid">
                                    <h3 className="font-bold text-lg text-gray-800">{path.roomName}</h3>
                                    <p className="text-sm text-gray-600 mb-4">Current Tier: <span className="font-semibold">{path.currentTier}</span></p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {path.upgrade && (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded">
                                                <h4 className="font-semibold text-green-800">Upgrade to {path.upgrade.toTier}</h4>
                                                <p className="text-sm text-gray-700 mt-1">{path.upgrade.description}</p>
                                            </div>
                                        )}

                                        {path.downgrade && (
                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                <h4 className="font-semibold text-yellow-800">Downgrade to {path.downgrade.toTier}</h4>
                                                <p className="text-sm text-gray-700 mt-1">{path.downgrade.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ProposalSection>
                )}

                {proposal.cableInformation && (
                    <ProposalSection title="A Note on Connectivity">
                        <div className="prose max-w-none prose-sm text-gray-700">
                            <ReactMarkdown>{proposal.cableInformation}</ReactMarkdown>
                        </div>
                    </ProposalSection>
                )}

                <ProposalSection title="Installation Plan">
                    <div className="space-y-4">
                        {proposal.installationPlan.map(phase => (
                            <div key={phase.phase} className="break-inside-avoid">
                                <h3 className="font-bold text-lg text-gray-800">{phase.phase}</h3>
                                <ul className="list-disc list-inside ml-4 text-sm text-gray-700 space-y-1">
                                    {phase.tasks.map((task, index) => <li key={index}>{task}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </ProposalSection>
            </div>
        </div>
    );
};

export default ProposalDisplay;