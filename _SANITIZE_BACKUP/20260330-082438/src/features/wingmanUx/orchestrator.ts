import { buildAvRecommendationFromProjectState } from "../../services/av-recommendation/engine";
import { buildTopology } from "../../services/topologyEngine";
import { buildSignalPath } from "../../services/signalPathEngine";
import { designRoom } from "../../services/roomDesignerService";
import { generateProposal } from "../../services/proposalService";
import type { WingmanShellInput } from "./types";

export async function runWingmanUxPipeline(state: WingmanShellInput) {
  const safeState = {
    ...state,
    sourceCount: Number(state.sourceCount ?? 0),
    displayCount: Number(state.displayCount ?? 0),
    distanceM: Number(state.distanceM ?? 0),
  };

  const recommendation = buildAvRecommendationFromProjectState(safeState as any);

  const topology = buildTopology({
    sources: safeState.sourceCount,
    displays: safeState.displayCount,
    resolution: safeState.resolution,
  });

  const signalPath = buildSignalPath({
    sources: safeState.sourceCount,
    displays: safeState.displayCount,
    transport: topology.transport === "AVoIP" ? "AVoIP" : "Matrix",
  });

  const room = await designRoom({
    projectName: safeState.projectName,
    discovery: recommendation.context,
  });

  const proposal = await generateProposal({
    customer: safeState.customer,
    roomName: safeState.roomType || safeState.application,
    summary: recommendation?.summaries?.proposal,
    notes: safeState.notes,
  });

  return {
    recommendation,
    topology,
    signalPath,
    room,
    proposal,
  };
}