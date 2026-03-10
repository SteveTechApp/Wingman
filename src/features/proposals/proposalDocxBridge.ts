import { buildProposalExportPayload, type ProposalExportInput, type ProposalExportPayload } from "./proposalExport";
import { buildProposalDesignSections } from "./proposalDesignSections";

export function buildProposalDocxBridgePayload(input: ProposalExportInput): ProposalExportPayload {
  const payload = buildProposalExportPayload(input);
  const extraSections = buildProposalDesignSections(input);

  return {
    ...payload,
    sections: [
      ...(payload.sections ?? []),
      ...extraSections,
    ],
  };
}

export function downloadProposalBridgeJson(payload: ProposalExportPayload): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${payload.fileName}.export.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}