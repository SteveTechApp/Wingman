import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposal, ProjectData } from './types';
import { format } from 'date-fns';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export const exportProposalToPdf = (proposal: Proposal, project: ProjectData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = 20;

  // Helper to add page if needed
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Header with WyreStorm branding
  doc.setFillColor(0, 131, 61); // WyreStorm Green
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSAL', pageWidth / 2, 20, { align: 'center' });

  yPosition = 45;

  // Project Information
  doc.setTextColor(30, 41, 59); // text-primary
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${project.projectName}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Client: ${project.clientName}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Version: ${proposal.version}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Date: ${format(new Date(proposal.createdAt), 'MMMM dd, yyyy')}`, margin, yPosition);
  yPosition += 15;

  // Executive Summary
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(proposal.executiveSummary, pageWidth - 2 * margin);
  summaryLines.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });
  yPosition += 10;

  // Scope of Work
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Scope of Work', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const scopeLines = doc.splitTextToSize(proposal.scopeOfWork, pageWidth - 2 * margin);
  scopeLines.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });
  yPosition += 10;

  // Equipment List Table
  checkPageBreak(50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Equipment List', margin, yPosition);
  yPosition += 5;

  const equipmentData = proposal.equipmentList.map(item => [
    item.sku,
    item.name,
    item.quantity.toString(),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['SKU', 'Product Name', 'Quantity']],
    body: equipmentData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 131, 61], // WyreStorm Green
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { left: margin, right: margin },
  });

  yPosition = doc.lastAutoTable.finalY + 15;

  // Additional Sections
  if (proposal.assumptions && proposal.assumptions.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Assumptions', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    proposal.assumptions.forEach((assumption, index) => {
      checkPageBreak(6);
      doc.text(`${index + 1}. ${assumption}`, margin + 5, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }

  if (proposal.exclusions && proposal.exclusions.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Exclusions', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    proposal.exclusions.forEach((exclusion, index) => {
      checkPageBreak(6);
      doc.text(`${index + 1}. ${exclusion}`, margin + 5, yPosition);
      yPosition += 6;
    });
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // text-secondary
    doc.text(
      `Page ${i} of ${totalPages} | Generated with WyreStorm Wingman`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`${project.projectName}_Proposal_v${proposal.version}.pdf`);
};
