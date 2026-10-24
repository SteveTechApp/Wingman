/**
 * The proposal wizard's read of a project's Discovery brief.
 *
 * The wizard is a five-step form, and every step starts from the same handful
 * of answers: what the room is for, what the customer asked for, what is still
 * unresolved and what the saved proposal already carried. Reading them here
 * keeps the completion component about steps, readiness and exports, and gives
 * one place to change when the Discovery brief grows a field.
 */
import type { StoredProject, StoredProjectProposal } from "../features/projects";
import type { SalesBomRow } from "./salesReadiness";
import { extractUnresolvedDiscoveryItems, unresolvedToAssumptions } from "./unresolvedDiscoveryItems";

/** One project's Discovery answers as the proposal steps print them. */
export type DiscoveryView = {
  projectTitle: string;
  customerName: string;
  contactName: string;
  summary: string;
  roomSize: string;
  displays: string;
  displayCount: string;
  displayBehaviour: string;
  sourceCount: string;
  sourceConnection: string;
  signal: string;
  usb: string;
  distance: string;
  network: string;
  audio: string;
  control: string;
  budget: string;
  avoipProfile: string;
  architecture: string;
  nextQuestion: string;
};

export function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asJoinedText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item))
      .filter(Boolean)
      .join(", ");
  }

  return asText(value);
}

function budgetLabelFromLevel(level: string): string {
  switch (level) {
    case "cost-sensitive":
      return "Cost-sensitive — value engineering matters";
    case "mid-market":
      return "Mid-market — balanced cost and quality";
    case "premium":
      return "Premium — quality and performance lead";
    default:
      return "";
  }
}

export function readDiscovery(project: StoredProject): DiscoveryView {
  const brief = project.discoveryBrief;
  const room = brief?.roomModel ?? {};

  return {
    projectTitle:
      asText(room.application) ||
      asText(room.roomType) ||
      project.name,
    customerName: asText(room.clientName),
    contactName: asText(room.contactName),
    summary:
      asText(brief?.inference?.summary) ||
      asText(room.summary) ||
      asText(room.outcome) ||
      "The Discovery brief has been captured for this project.",
    roomSize:
      asText(room.scale) ||
      asText(room.roomSize) ||
      "Not confirmed",
    displays:
      [
        asText(room.displayCount || room.displays),
        asText(room.displayBehaviour || room.displayArrangement),
      ]
        .filter(Boolean)
        .join(" - ") || "Not confirmed",
    displayCount:
      asText(room.displayCount || room.displays),
    displayBehaviour:
      asText(room.displayBehaviour || room.displayArrangement),
    sourceCount:
      asText(room.sourceCount),
    sourceConnection:
      asJoinedText(room.sourceConnections || room.sourceTypes),
    signal:
      asText(room.resolutionRequirement || room.signalStandard) ||
      "Not confirmed",
    usb:
      asJoinedText(room.usbNeeds) ||
      asText(room.usbTransport) ||
      "Not confirmed",
    distance:
      asText(room.longestRun || room.cableRun) ||
      "Not confirmed",
    network:
      asText(room.networkAvailability || room.network),
    audio:
      asJoinedText(room.audioNeeds) ||
      asText(room.audioPath),
    control:
      asJoinedText(room.controlNeeds),
    budget:
      budgetLabelFromLevel(asText(room.budgetLevel)) ||
      asText(room.budgetStyle) ||
      "Not confirmed",
    avoipProfile:
      asText(room.avoipProfile || room.avoipSeriesHint),
    architecture:
      asText(brief?.inference?.architecture) ||
      asText(room.inferredArchitectureDirection) ||
      asText(room.designDirection),
    nextQuestion:
      asText(brief?.nextBestQuestion) ||
      asText(brief?.inference?.nextBestQuestion),
  };
}

export function standardAssumptions(project: StoredProject) {
  const unresolvedItems = extractUnresolvedDiscoveryItems({
    discoveryConversation: project.discoveryBrief?.discoveryConversation,
    decisionEvidence: project.discoveryBrief?.decisionEvidence,
  });
  return Array.from(
    new Set([
      ...unresolvedToAssumptions(unresolvedItems),
      ...(project.ingest?.unknowns ?? []),
      ...(project.compareRuns?.[0]?.warnings ?? []),
      ...(project.recommendationEvidence?.missingInformation ?? []),
      ...(project.discoveryBrief?.recommendationEvidence?.missingInformation ?? []),
    ]),
  ).slice(0, 15);
}

export function savedProposalBomRows(rows: StoredProjectProposal["bomRows"]): SalesBomRow[] {
  return (rows ?? []).map((row, index) => ({
    item: row.item || index + 1,
    sku: row.sku,
    description: row.description,
    role: row.role,
    qty: row.qty || 1,
    type: row.type === "Required" || row.type === "Optional" || row.type === "Validate"
      ? row.type
      : "Validate",
    status: row.status,
    evidence: row.evidence || "Restored from the saved project proposal.",
    notes: row.notes,
  }));
}
