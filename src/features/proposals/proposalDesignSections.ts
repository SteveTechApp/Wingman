import type { ProposalExportInput } from "./proposalExport";

export type ProposalDesignSection = {
  key: string;
  title: string;
  body: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

export function buildProposalDesignSections(input: ProposalExportInput): ProposalDesignSection[] {
  const sections: ProposalDesignSection[] = [];

  const designSummary = tidy(input.designSummary);
  const cableScheduleSummary = tidy(input.cableScheduleSummary);
  const diagramSummary = tidy(input.diagramSummary);
  const usedDevicesSummary = tidy(input.usedDevicesSummary);

  if (designSummary) {
    sections.push({
      key: "design-summary",
      title: "Design Summary",
      body: designSummary,
    });
  }

  if (cableScheduleSummary) {
    sections.push({
      key: "cable-schedule-summary",
      title: "Cable Schedule Summary",
      body: cableScheduleSummary,
    });
  }

  if (diagramSummary) {
    sections.push({
      key: "block-diagram-summary",
      title: "Block Diagram Summary",
      body: diagramSummary,
    });
  }

  if (usedDevicesSummary) {
    sections.push({
      key: "generated-devices",
      title: "Generated Devices",
      body: usedDevicesSummary,
    });
  }

  return sections;
}