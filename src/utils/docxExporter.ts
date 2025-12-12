// This is a placeholder for a DOCX exporting utility.
// In a real application, this would use a library like docx.js to generate a .docx file.

import { Proposal, ProjectData } from './types';

export const exportProposalToDocx = (proposal: Proposal, project: ProjectData) => {
  console.log("Exporting proposal to DOCX:", { proposal, project });
  
  // Create a dummy text content to simulate the export
  let content = `PROPOSAL: ${project.projectName}\n\n`;
  content += `CLIENT: ${project.clientName}\n`;
  content += `VERSION: ${proposal.version}\n\n`;
  content += `## Executive Summary\n${proposal.executiveSummary}\n\n`;
  content += `## Scope of Work\n${proposal.scopeOfWork}\n\n`;
  content += `## Equipment List\n`;
  proposal.equipmentList.forEach(item => {
      content += `- ${item.name} (SKU: ${item.sku}) - Qty: ${item.quantity}\n`;
  });

  // Create a blob and trigger download
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${project.projectName}_Proposal_v${proposal.version}.txt`; // .txt for this mock
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Clean up blob URL to prevent memory leak
  URL.revokeObjectURL(url);

  alert('Proposal exported as a plain text file (DOCX export is a mock).');
};