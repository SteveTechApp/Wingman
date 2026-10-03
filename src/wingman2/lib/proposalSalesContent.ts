import type { StoredProjectProposal } from "../data/projectStore";
import type { ProductMediaIndex } from "../data/productMedia";
import type { SalesBomRow } from "./salesReadiness";
import { inferSchematicArchitecture } from "./roomSchematicEngine";

export const EXTERNAL_DESIGN_PROMPTS = [
  "Displays / projection | Model, size, location and mounting: [complete] | Supplier / owner: [complete]",
  "Sources and conferencing | Source devices, meeting platform and USB host: [complete] | Supplier / owner: [complete]",
  "Audio | Microphones, loudspeakers, DSP and acoustic requirements: [complete] | Supplier / owner: [complete]",
  "Network | Switches, port capacity, PoE budget, VLANs and IT approval: [complete] | Supplier / owner: [complete]",
  "Control | User interface, named room modes and programming: [complete] | Supplier / owner: [complete]",
  "Site infrastructure | Cable routes / distances, rack, ventilation, power and containment: [complete] | Supplier / owner: [complete]",
  "Delivery and acceptance | Installation, training, support, acceptance tests and dates: [complete] | Supplier / owner: [complete]",
].join("\n");

export function safeProposalWebUrl(value?: string): string | undefined {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function proposalProductCards(rows: SalesBomRow[], media: ProductMediaIndex | null = null) {
  return rows.filter((row, index) => row.qty > 0 && row.status !== "excluded" && !row.sku.startsWith("BY-OTHERS") && rows.findIndex((item) => item.sku === row.sku) === index).map((row) => {
    const record = media?.lookup[row.sku.trim().toUpperCase()];
    // Product photographs must depict this SKU, not an approximate family match.
    const exact = record?.sku.trim().toUpperCase() === row.sku.trim().toUpperCase() ? record : undefined;
    const asset = exact?.front ?? exact?.gallery.find((item) => item.view === "primary");
    return { sku: row.sku, name: row.description, role: row.role,
      url: safeProposalWebUrl(exact?.officialProductUrl),
      imageUrl: safeProposalWebUrl(asset?.url), alt: asset?.alt || row.description };
  });
}

export function proposalSolutionStory(proposal: StoredProjectProposal, rows: SalesBomRow[]) {
  const architecture = inferSchematicArchitecture(`${proposal.title} ${proposal.summary}`, rows);
  const operation: string[] = [];
  if (architecture.isMatrix) operation.push("The proposed central matrix provides a single routing point between the scheduled sources and displays. The agreed controls will determine which content appears at each destination; switching behaviour will be verified during commissioning.");
  if (architecture.isNhd600 || architecture.isNhd500 || architecture.isNhd100) operation.push("The proposed AV-over-IP system distributes content between the scheduled endpoints over a suitably designed network. This allows the agreed destinations to share sources, with any future expansion subject to endpoint compatibility, switch capacity and licensing requirements.");
  if (architecture.hasVideoWall) operation.push("The video wall provides a shared viewing area for the agreed content layouts. The final canvas, layout controls and source combinations must be confirmed against the selected processing equipment.");
  if (architecture.hasCamera || architecture.hasUsb || architecture.isApollo) operation.push("The intended meeting workflow connects the agreed computer to the selected room peripherals. Confirm the USB host, conferencing platform, camera and audio paths together so the user experience can be tested from joining a call through to ending the session.");
  if (architecture.hasDanteAudio) operation.push("Networked audio links the agreed audio devices. Routing, clocking, DSP processing and audio-follow behaviour require a coordinated audio design and commissioning plan.");
  if (!operation.length) operation.push("The equipment schedule defines the proposed building blocks. Agree the source-to-destination routes and normal operating sequence before confirming the complete user experience.");
  return {
    overview: proposal.salesContent?.solutionOverview || proposal.applicationProposal?.solutionOverview || "The proposed solution brings the scheduled equipment together around the customer's agreed operating requirements. Final interfaces, room controls and delivery responsibilities are set out below.",
    operation,
    acceptance: proposal.applicationProposal?.acceptanceCriteria.length ? proposal.applicationProposal.acceptanceCriteria : ["Demonstrate each agreed source-to-destination route and room mode using the customer's normal tasks.", "Record the test results, train the nominated users and agree the support handover before acceptance."],
    externalScope: proposal.salesContent?.externalScope || EXTERNAL_DESIGN_PROMPTS,
  };
}
