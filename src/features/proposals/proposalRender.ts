import type { ProposalExportInput, ProposalExportPayload } from "./proposalExport";
import { buildProposalExportPayload } from "./proposalExport";
import { buildProposalDesignSections } from "./proposalDesignSections";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function section(title: string, body?: string): string {
  const text = tidy(body);
  if (!text) return "";
  return [title, "-".repeat(title.length), text].join("\n");
}

function equipmentBlock(payload: ProposalExportPayload): string {
  if (!Array.isArray(payload.equipment) || payload.equipment.length === 0) return "";

  const rows = payload.equipment.map((x) => {
    const qty = x.qty ? `${x.qty}x ` : "";
    const sku = x.sku ? `[${x.sku}] ` : "";
    const notes = x.notes ? ` (${x.notes})` : "";
    return `- ${qty}${sku}${x.name}${notes}`;
  });

  return ["Equipment", "---------", ...rows].join("\n");
}

function pricingBlock(payload: ProposalExportPayload): string {
  const p = payload.pricing || {};
  const rows = [
    p.currency ? `Currency: ${p.currency}` : "",
    p.equipmentSubtotal ? `Equipment subtotal: ${p.equipmentSubtotal}` : "",
    p.installationAllowance ? `Installation allowance: ${p.installationAllowance}` : "",
    p.programmingAllowance ? `Programming allowance: ${p.programmingAllowance}` : "",
    p.totalBudgetNote ? `Budget note: ${p.totalBudgetNote}` : "",
  ].filter(Boolean);

  if (!rows.length) return "";
  return ["Commercial Summary", "------------------", ...rows].join("\n");
}

export function buildProposalExportText(input: ProposalExportInput): string {
  const payload = buildProposalExportPayload(input);

  const header = [
    payload.title,
    payload.subtitle || "",
  ].filter(Boolean).join("\n");

  const sectionBlocks = payload.sections
    .map((s) => section(s.title, s.body))
    .filter(Boolean);

  const designBlocks = buildProposalDesignSections(input)
    .map((s) => section(s.title, s.body))
    .filter(Boolean);

  const blocks = [
    header,
    ...sectionBlocks,
    ...designBlocks,
    equipmentBlock(payload),
    pricingBlock(payload),
  ].filter(Boolean);

  return blocks.join("\n\n").trim();
}

export async function copyProposalExportText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadProposalExportText(fileName: string, text: string): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}