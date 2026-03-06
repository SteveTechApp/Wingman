import * as React from "react";
import type { EngineeringContext, RoomProfile, ValidationIssue } from "../types";

function addViolation(ctx: EngineeringContext, issue: ValidationIssue) {
  ctx.violations.push(issue);
}
function addWarning(ctx: EngineeringContext, issue: ValidationIssue) {
  ctx.warnings.push(issue);
}

/**
 * Validator v1: minimal set of checks.
 * Expand with link budgets, USB class checks, PoE checks, VLAN guidance, multiview limits, etc.
 */
export function validateDesign(profile: RoomProfile, ctx: EngineeringContext) {
  // Hard: AVoIP selected but no network
  if (ctx.designTypeCandidate === "AVoIP" && profile.constraints?.networkAvailable === false) {
    addViolation(ctx, {
      type: "violation",
      code: "AVOIP_NO_NETWORK",
      message: "AVoIP candidate selected but networkAvailable=false.",
    });
  }

  // Warn: VLAN not available (AVoIP risk)
  if (ctx.designTypeCandidate === "AVoIP" && profile.constraints?.networkAvailable === true && profile.constraints?.vlanAvailable === false) {
    addWarning(ctx, {
      type: "warning",
      code: "AVOIP_NO_VLAN",
      message: "AVoIP candidate selected but vlanAvailable=false. Consider VLAN/QoS guidance or prefer HDBaseT for lower risk.",
    });
  }

  // Warn: Unknown PoE when AVoIP likely needs powered endpoints
  if (ctx.designTypeCandidate === "AVoIP" && profile.constraints?.poeAvailable === "unknown") {
    addWarning(ctx, {
      type: "warning",
      code: "POE_UNKNOWN",
      message: "PoE availability is unknown. Confirm PoE/PoE+/PoE++ budgeting for endpoints or plan local power.",
    });
  }

  // Warn: Missing maxCableRunMeters (limits transport selection confidence)
  if (profile.constraints?.maxCableRunMeters == null) {
    addWarning(ctx, {
      type: "warning",
      code: "RUN_LENGTH_UNKNOWN",
      message: "Max cable run not provided. Transport choice confidence reduced.",
    });
  }
}