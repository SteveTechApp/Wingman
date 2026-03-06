import * as React from "react";
import { generateProposalFromRoom } from "@/core/engineering/roomToProposal";
import { buildRoomWizardProposal } from "@/core/adapters/RoomWizardProposalAdapter";

function bandwidthFromResolution(r: any): number {
  if (r === "4K60") return 18;
  if (r === "4K30") return 10;
  return 3;
}

function pickDistanceMeters(summary: any): number {
  const v = summary?.distanceMeters ?? summary?.distance ?? summary?.cableRunMeters ?? summary?.cableRun ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickResolution(summary: any): any {
  return summary?.maxResolution ?? summary?.resolution ?? summary?.videoResolution ?? "4K60";
}

function extractBomLines(roomProposal: any) {
  const raw =
    roomProposal?.billOfMaterials ??
    roomProposal?.bom ??
    roomProposal?.items ??
    roomProposal?.lines ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((x: any) => ({
      sku: String(x?.sku ?? x?.id ?? x?.code ?? ""),
      name: x?.name ? String(x.name) : undefined,
      quantity: Number(x?.quantity ?? x?.qty ?? 1),
    }))
    .filter((x: any) => x.sku);
}

/**
 * Build Wingman validated proposal directly from the Room Wizard `summary` object.
 * Uses existing generateProposalFromRoom(summary) as the source-of-truth for BOM generation.
 */
export function buildRoomWizardProposalFromSummary(summary: any) {
  const roomProposal = generateProposalFromRoom(summary);
  const bomLines = extractBomLines(roomProposal);

  const requiredBandwidthGbps = bandwidthFromResolution(pickResolution(summary));
  const requiredDistanceMeters = pickDistanceMeters(summary);

  const wingman = buildRoomWizardProposal({
    bom: bomLines,
    requiredBandwidthGbps,
    requiredDistanceMeters,
  });

  return { roomProposal, wingman };
}
