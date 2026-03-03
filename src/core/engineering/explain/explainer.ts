import type { DesignPackage, EngineeringContext, RoomProfile } from "../types";

function safeLine(s: string) { return (s || "").trim(); }

/**
 * Explainer v1: builds export blocks from ctx + profile.
 * Keep it deterministic and based only on ctx/profile (no UI state).
 */
export function buildExports(profile: RoomProfile, ctx: EngineeringContext): DesignPackage["exports"] {
  const scope = [
    `Room: ${safeLine(profile.roomName)}`,
    `Type: ${profile.roomType}`,
    `Displays: ${profile.displayCount} (${profile.displayType}, ${profile.displayResolutionTarget})`,
    `Usage: ${profile.usageModes.join(", ")}`
  ].join("\n");

  const soo = [
    `Signal Flow Overview`,
    `- Pattern: ${ctx.chosenPatternId ?? "TBD"}`,
    `- Design Type Candidate: ${ctx.designTypeCandidate}`,
    ``,
    `Key Behaviours`,
    `- Source selection and routing per requirements`,
    `- Conferencing integration: ${profile.vc?.enabled ? "Enabled" : "Not enabled"}`,
    `- BYOD: ${profile.usageModes.includes("byod") ? "Enabled" : "Not enabled"}`
  ].join("\n");

  const net = [
    `Network Requirements`,
    `- Network available: ${profile.constraints?.networkAvailable ?? "unknown"}`,
    `- VLAN available: ${profile.constraints?.vlanAvailable ?? "unknown"}`,
    `- PoE availability: ${profile.constraints?.poeAvailable ?? "unknown"}`,
    `- Notes: AVoIP requires suitable switching/QoS planning (if selected)`
  ].join("\n");

  const cable = [
    `Cabling Summary`,
    `- Max run (m): ${profile.constraints?.maxCableRunMeters ?? "unknown"}`,
    `- Infrastructure: ${profile.constraints?.cableInfrastructure ?? "unknown"}`,
    `- Notes: confirm pathways, fire rating, and termination plan`
  ].join("\n");

  return {
    scopeNarrative: scope,
    statementOfOperation: soo,
    networkRequirementsSummary: net,
    cableScheduleSummary: cable
  };
}