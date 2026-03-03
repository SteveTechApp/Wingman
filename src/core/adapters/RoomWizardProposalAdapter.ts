export type RoomRequirements = {
  requiredResolution?: string;
  requiredBandwidthGbps?: number;
  requiredDistanceMeters?: number;
};

export type ProposalLine = {
  sku: string;
  name?: string;
  qty?: number;
};

export type ProposalOutput = {
  summary: string;
  bom: ProposalLine[];
  notes?: string[];
};

/**
 * Minimal, safe adapter restored for typecheck.
 * Replace with full Wingman proposal logic once canonical models/services are confirmed.
 */
export function buildRoomWizardProposalFromSummary(summary: any): ProposalOutput {
  const bom: ProposalLine[] = Array.isArray(summary?.bom) ? summary.bom : [];
  const lineCount = bom.length;
  const itemCount = bom.reduce((a, l) => a + (typeof l.qty === "number" ? l.qty : 1), 0);

  const title = summary?.title ? String(summary.title) : "RoomWizard Proposal";

  return {
    summary: title,
    bom,
    notes: [
      "Adapter restored to compile cleanly.",
      "BOM lines: " + String(lineCount) + ", items: " + String(itemCount),
    ],
  };
}

/**
 * Compatibility export for older code expecting buildRoomWizardProposal(...).
 * Delegates to buildRoomWizardProposalFromSummary.
 */
export function buildRoomWizardProposal(summary: any) {
  return buildRoomWizardProposalFromSummary(summary);
}
