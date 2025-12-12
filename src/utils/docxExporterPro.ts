import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { Proposal, ProjectData } from './types';
import { format } from 'date-fns';

export const exportProposalToDocx = async (proposal: Proposal, project: ProjectData) => {
  // Create equipment list table
  const equipmentTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            children: [new Paragraph({
              text: 'SKU',
              style: 'TableHeader',
            })],
            shading: {
              fill: '00833D', // WyreStorm Green
            },
          }),
          new TableCell({
            children: [new Paragraph({
              text: 'Product Name',
              style: 'TableHeader',
            })],
            shading: {
              fill: '00833D',
            },
          }),
          new TableCell({
            children: [new Paragraph({
              text: 'Quantity',
              style: 'TableHeader',
            })],
            shading: {
              fill: '00833D',
            },
          }),
        ],
      }),
      // Data rows
      ...proposal.equipmentList.map(item =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(item.sku)],
            }),
            new TableCell({
              children: [new Paragraph(item.name)],
            }),
            new TableCell({
              children: [new Paragraph(item.quantity.toString())],
            }),
          ],
        })
      ),
    ],
  });

  // Build document
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'TableHeader',
          name: 'Table Header',
          basedOn: 'Normal',
          run: {
            bold: true,
            color: 'FFFFFF',
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'PROPOSAL',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
            run: {
              color: '00833D', // WyreStorm Green
              size: 48,
              bold: true,
            },
          }),

          // Project Information
          new Paragraph({
            text: 'Project Information',
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 300,
              after: 200,
            },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Project: ', bold: true }),
              new TextRun(project.projectName),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Client: ', bold: true }),
              new TextRun(project.clientName),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Version: ', bold: true }),
              new TextRun(proposal.version),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date: ', bold: true }),
              new TextRun(format(new Date(proposal.createdAt), 'MMMM dd, yyyy')),
            ],
            spacing: { after: 400 },
          }),

          // Executive Summary
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 400,
              after: 200,
            },
          }),
          new Paragraph({
            text: proposal.executiveSummary,
            spacing: { after: 400 },
          }),

          // Scope of Work
          new Paragraph({
            text: 'Scope of Work',
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 400,
              after: 200,
            },
          }),
          new Paragraph({
            text: proposal.scopeOfWork,
            spacing: { after: 400 },
          }),

          // Equipment List
          new Paragraph({
            text: 'Equipment List',
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 400,
              after: 200,
            },
          }),
          equipmentTable,
          new Paragraph({ text: '', spacing: { after: 400 } }), // Spacer

          // Assumptions (if any)
          ...(proposal.assumptions && proposal.assumptions.length > 0
            ? [
                new Paragraph({
                  text: 'Assumptions',
                  heading: HeadingLevel.HEADING_1,
                  spacing: {
                    before: 400,
                    after: 200,
                  },
                }),
                ...proposal.assumptions.map(
                  (assumption, index) =>
                    new Paragraph({
                      text: `${index + 1}. ${assumption}`,
                      spacing: { after: 100 },
                      indent: { left: 360 },
                    })
                ),
                new Paragraph({ text: '', spacing: { after: 400 } }),
              ]
            : []),

          // Exclusions (if any)
          ...(proposal.exclusions && proposal.exclusions.length > 0
            ? [
                new Paragraph({
                  text: 'Exclusions',
                  heading: HeadingLevel.HEADING_1,
                  spacing: {
                    before: 400,
                    after: 200,
                  },
                }),
                ...proposal.exclusions.map(
                  (exclusion, index) =>
                    new Paragraph({
                      text: `${index + 1}. ${exclusion}`,
                      spacing: { after: 100 },
                      indent: { left: 360 },
                    })
                ),
              ]
            : []),

          // Footer
          new Paragraph({
            text: 'Generated with WyreStorm Wingman',
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 800,
            },
            run: {
              italics: true,
              size: 18,
              color: '64748b', // text-secondary
            },
          }),
        ],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.projectName}_Proposal_v${proposal.version}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
