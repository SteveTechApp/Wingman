import type { ProposalExportInput } from "./proposalExport";

export type DocxDesignSection = {
  heading: string;
  body: string;
};

function tidy(value?: string): string {
  return String(value ?? "").trim();
}

export function buildDocxDesignSections(input: ProposalExportInput): DocxDesignSection[] {
  const sections: DocxDesignSection[] = [];

  const designSummary = tidy(input.designSummary);
  const cableScheduleSummary = tidy(input.cableScheduleSummary);
  const diagramSummary = tidy(input.diagramSummary);
  const usedDevicesSummary = tidy(input.usedDevicesSummary);

  if (designSummary) {
    sections.push({
      heading: "Design Summary",
      body: designSummary,
    });
  }

  if (cableScheduleSummary) {
    sections.push({
      heading: "Cable Schedule Summary",
      body: cableScheduleSummary,
    });
  }

  if (diagramSummary) {
    sections.push({
      heading: "Block Diagram Summary",
      body: diagramSummary,
    });
  }

  if (usedDevicesSummary) {
    sections.push({
      heading: "Generated Devices",
      body: usedDevicesSummary,
    });
  }

  return sections;
}