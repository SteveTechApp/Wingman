import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import {
  getProposalDocumentTypeConfig,
  linesFromText,
  type ProposalWizardDraft,
} from "./proposalWizard";

const NAVY = "08223A";
const AQUA = "16B8B0";
const MID = "31546F";
const LIGHT = "E8F1F6";
const TEXT = "172B3A";
const MUTED = "5E7280";

function fileBaseName(title: string) {
  return (
    String(title || "wingman-proposal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "wingman-proposal"
  );
}

function textParagraph(
  text: string,
  options: {
    bold?: boolean;
    size?: number;
    colour?: string;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
  } = {},
) {
  return new Paragraph({
    alignment: options.alignment,
    spacing: {
      after: options.spacingAfter ?? 140,
      line: 300,
    },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: options.size ?? 21,
        color: options.colour ?? TEXT,
        font: "Aptos",
      }),
    ],
  });
}

function heading(text: string, level: 1 | 2 = 1) {
  return new Paragraph({
    heading:
      level === 1
        ? HeadingLevel.HEADING_1
        : HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: {
      before: level === 1 ? 300 : 220,
      after: 120,
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: level === 1 ? NAVY : MID,
        size: level === 1 ? 30 : 25,
        font: "Aptos Display",
      }),
    ],
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 290 },
    children: [
      new TextRun({
        text,
        size: 20,
        color: TEXT,
        font: "Aptos",
      }),
    ],
  });
}

function paragraphsFromLines(value: string, fallback: string) {
  const items = linesFromText(value);
  return (items.length ? items : [fallback]).map(bulletParagraph);
}

function tableCell(
  value: string,
  widthPercent: number,
  bold = false,
) {
  return new TableCell({
    width: {
      size: widthPercent,
      type: WidthType.PERCENTAGE,
    },
    margins: {
      top: 90,
      bottom: 90,
      left: 100,
      right: 100,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: value,
            bold,
            size: 18,
            color: bold ? NAVY : TEXT,
            font: "Aptos",
          }),
        ],
      }),
    ],
  });
}

function equipmentSchedule(rows: SalesBomRow[]) {
  const header = new TableRow({
    tableHeader: true,
    children: [
      tableCell("SKU", 18, true),
      tableCell("Description", 36, true),
      tableCell("Role", 26, true),
      tableCell("Qty", 8, true),
      tableCell("Type", 12, true),
    ],
  });

  const bodyRows = rows.length
    ? rows.map(
        (row) =>
          new TableRow({
            children: [
              tableCell(row.sku || "TBC", 18),
              tableCell(row.description || "Selected item", 36),
              tableCell(row.role || "System item", 26),
              tableCell(String(row.qty ?? 1), 8),
              tableCell(row.type || "Required", 12),
            ],
          }),
      )
    : [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 5,
              children: [
                textParagraph(
                  "No final equipment schedule has been attached. The document is issued as a design and proposal response rather than a final BOM.",
                  { colour: MUTED },
                ),
              ],
            }),
          ],
        }),
      ];

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "A9BCC8" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "A9BCC8" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "A9BCC8" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "A9BCC8" },
      insideHorizontal: {
        style: BorderStyle.SINGLE,
        size: 3,
        color: "D4E0E7",
      },
      insideVertical: {
        style: BorderStyle.SINGLE,
        size: 3,
        color: "D4E0E7",
      },
    },
    rows: [header, ...bodyRows],
  });
}

function addSection(
  children: Array<Paragraph | Table>,
  title: string,
  content: Array<Paragraph | Table>,
) {
  children.push(heading(title));
  children.push(...content);
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportProposalDocx(
  proposal: StoredProjectProposal,
  bomRows: SalesBomRow[],
  wizard: ProposalWizardDraft,
) {
  const config = getProposalDocumentTypeConfig(wizard.documentType);
  const companyName = proposal.companyName || "WyreStorm";
  const footerText =
    proposal.proposalFooter ||
    "Prepared using WyreStorm Wingman.";

  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 900, after: 220 },
      children: [
        new TextRun({
          text: companyName,
          bold: true,
          size: 32,
          color: AQUA,
          font: "Aptos Display",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: config.label,
          bold: true,
          size: 28,
          color: MID,
          font: "Aptos Display",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 460, after: 240 },
      children: [
        new TextRun({
          text: wizard.projectName || proposal.title,
          bold: true,
          size: 46,
          color: NAVY,
          font: "Aptos Display",
        }),
      ],
    }),
    textParagraph(
      wizard.customerName
        ? `Prepared for ${wizard.customerName}`
        : "Customer proposal",
      {
        alignment: AlignmentType.CENTER,
        size: 25,
        colour: MID,
        spacingAfter: 180,
      },
    ),
    textParagraph(
      [
        wizard.proposalReference
          ? `Reference: ${wizard.proposalReference}`
          : "",
        wizard.proposalDate ? `Date: ${wizard.proposalDate}` : "",
        wizard.preparedBy ? `Prepared by: ${wizard.preparedBy}` : "",
      ]
        .filter(Boolean)
        .join("  |  "),
      {
        alignment: AlignmentType.CENTER,
        size: 19,
        colour: MUTED,
      },
    ),
    new Paragraph({
      children: [new PageBreak()],
    }),
  );

  addSection(children, "Executive Summary", [
    textParagraph(
      wizard.executiveSummary ||
        proposal.summary ||
        "The executive summary has not yet been completed.",
    ),
  ]);

  addSection(children, "Understanding of Requirements", [
    textParagraph(
      wizard.customerObjectives ||
        proposal.summary ||
        "The customer requirement is based on the captured Discovery brief.",
    ),
  ]);

  addSection(children, "Proposed Solution", [
    textParagraph(
      wizard.proposedSolution ||
        "The proposed solution narrative has not yet been completed.",
    ),
  ]);

  if (
    config.sections.some((section) =>
      /technical architecture|implementation|tender/i.test(section),
    )
  ) {
    addSection(children, "Technical Architecture", [
      textParagraph(
        wizard.architectureNarrative ||
          "The technical architecture requires confirmation.",
      ),
    ]);
  }

  if (
    config.sections.some((section) =>
      /practical|how the system|benefits/i.test(section),
    )
  ) {
    addSection(children, "Practical Operation and Benefits", [
      textParagraph(
        proposal.applicationProposal?.solutionOverview ||
          "The system is intended to give users a clear, repeatable way to connect, select and distribute content without needing to understand the underlying signal path.",
      ),
      ...(
        proposal.applicationProposal?.benefits?.map((benefit) =>
          bulletParagraph(`${benefit.title}: ${benefit.detail}`),
        ) ?? [
          bulletParagraph(
            "A consistent and supportable user experience based on the captured room requirements.",
          ),
          bulletParagraph(
            "A clear product and architecture path that can be reviewed before commercial issue.",
          ),
        ]
      ),
    ]);
  }

  addSection(children, "Equipment Schedule", [
    equipmentSchedule(bomRows),
  ]);

  addSection(children, "Scope Inclusions", paragraphsFromLines(
    wizard.inclusions,
    "WyreStorm equipment and proposal support listed in this document.",
  ));

  addSection(children, "Dependencies and Responsibilities", [
    heading("Dependencies", 2),
    ...paragraphsFromLines(
      wizard.dependencies,
      "Final dependencies are to be confirmed.",
    ),
    heading("Responsibilities", 2),
    ...paragraphsFromLines(
      wizard.responsibilities,
      "Final responsibilities are to be agreed by the customer, supplier and integrator.",
    ),
  ]);

  addSection(children, "Assumptions and Exclusions", [
    heading("Assumptions", 2),
    ...paragraphsFromLines(
      wizard.assumptions,
      "Final design assumptions are to be confirmed.",
    ),
    heading("Exclusions", 2),
    ...paragraphsFromLines(
      wizard.exclusions,
      "No exclusions have been recorded.",
    ),
  ]);

  const validationItems = [
    ...(proposal.governanceWarnings ?? []),
    ...(proposal.validationNotes ?? []),
  ];

  if (
    config.sections.some((section) =>
      /validation|compliance|risk/i.test(section),
    ) ||
    validationItems.length
  ) {
    addSection(children, "Validation Items", (
      validationItems.length
        ? validationItems
        : ["No unresolved validation item has been recorded."]
    ).map(bulletParagraph));
  }

  if (
    config.sections.some((section) =>
      /warranty|support|tender/i.test(section),
    )
  ) {
    addSection(children, "Delivery, Warranty and Support", [
      textParagraph(wizard.leadTime),
      textParagraph(wizard.warranty),
    ]);
  }

  addSection(children, "Next Steps", paragraphsFromLines(
    wizard.nextSteps,
    "Confirm the final design, equipment schedule and commercial quotation.",
  ));

  const document = new Document({
    creator: wizard.preparedBy || companyName,
    title: `${wizard.projectName || proposal.title} - ${config.label}`,
    subject: "WyreStorm audio visual proposal",
    description:
      "Customer proposal generated from the Wingman Discovery, product and proposal workflow.",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 900,
              bottom: 900,
              left: 900,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${companyName}  |  ${wizard.proposalReference}`,
                    bold: true,
                    color: MID,
                    size: 17,
                    font: "Aptos",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${footerText}  |  Page `,
                    color: MUTED,
                    size: 16,
                    font: "Aptos",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: MUTED,
                    size: 16,
                    font: "Aptos",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(
    `${fileBaseName(wizard.projectName || proposal.title)}.proposal.docx`,
    blob,
  );
}