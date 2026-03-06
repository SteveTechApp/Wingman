import type { ProposalExportInput, ProposalExportPayload } from "./proposalExport";
import { buildProposalExportPayload } from "./proposalExport";
import { buildProposalExportText } from "./proposalRender";

export type ProposalExportFormat = "txt" | "json" | "md";

function downloadBlob(fileName: string, content: string, mimeType: string): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toMarkdown(payload: ProposalExportPayload): string {
  const lines: string[] = [];

  lines.push(`# ${payload.title}`);
  if (payload.subtitle) {
    lines.push("");
    lines.push(payload.subtitle);
  }

  const meta = Object.entries(payload.metadata || {}).filter(([, v]) => String(v || "").trim());
  if (meta.length) {
    lines.push("");
    lines.push("## Metadata");
    lines.push("");
    for (const [k, v] of meta) {
      lines.push(`- **${k}**: ${v}`);
    }
  }

  for (const section of payload.sections) {
    lines.push("");
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push(section.body);
  }

  if (payload.equipment.length) {
    lines.push("");
    lines.push("## Equipment");
    lines.push("");
    for (const item of payload.equipment) {
      const qty = item.qty ? `${item.qty}x ` : "";
      const sku = item.sku ? `[${item.sku}] ` : "";
      const notes = item.notes ? ` (${item.notes})` : "";
      lines.push(`- ${qty}${sku}${item.name}${notes}`);
    }
  }

  const pricing = payload.pricing || {};
  const pricingRows = [
    pricing.currency ? `- **Currency**: ${pricing.currency}` : "",
    pricing.equipmentSubtotal ? `- **Equipment subtotal**: ${pricing.equipmentSubtotal}` : "",
    pricing.installationAllowance ? `- **Installation allowance**: ${pricing.installationAllowance}` : "",
    pricing.programmingAllowance ? `- **Programming allowance**: ${pricing.programmingAllowance}` : "",
    pricing.totalBudgetNote ? `- **Budget note**: ${pricing.totalBudgetNote}` : "",
  ].filter(Boolean);

  if (pricingRows.length) {
    lines.push("");
    lines.push("## Commercial Summary");
    lines.push("");
    lines.push(...pricingRows);
  }

  return lines.join("\n").trim();
}

export function buildProposalExportBundle(input: ProposalExportInput): {
  payload: ProposalExportPayload;
  text: string;
  markdown: string;
} {
  const payload = buildProposalExportPayload(input);
  const text = buildProposalExportText(input);
  const markdown = toMarkdown(payload);

  return { payload, text, markdown };
}

export function downloadProposalExport(
  input: ProposalExportInput,
  format: ProposalExportFormat
): void {
  const bundle = buildProposalExportBundle(input);

  if (format === "txt") {
    downloadBlob(`${bundle.payload.fileName}.txt`, bundle.text, "text/plain;charset=utf-8");
    return;
  }

  if (format === "md") {
    downloadBlob(`${bundle.payload.fileName}.md`, bundle.markdown, "text/markdown;charset=utf-8");
    return;
  }

  downloadBlob(
    `${bundle.payload.fileName}.json`,
    JSON.stringify(bundle.payload, null, 2),
    "application/json;charset=utf-8"
  );
}