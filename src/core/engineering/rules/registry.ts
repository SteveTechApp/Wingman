import * as React from "react";
import type { Rule } from "./types";
import type { EngineeringContext, Requirement } from "../types";

/**
 * Rule registry (v1).
 * Add rules here; keep each rule small + testable.
 */

function addReq(ctx: EngineeringContext, req: Requirement) {
  if (!ctx.requirements.find(r => r.id === req.id)) ctx.requirements.push(req);
}

/** CLASSIFY: Basic presentation */
const R_CLASSIFY_BASIC_PRESENTATION: Rule = {
  id: "classify.basic_presentation.1",
  phase: "classify",
  priority: 100,
  describe: "Classify simple presentation room (single display, no VC).",
  inputsUsed: ["displayCount", "vc.enabled", "usageModes"],
  when: (p) => p.displayCount === 1 && !(p.vc?.enabled) && p.usageModes.includes("presentation"),
  then: (_p, ctx) => {
    ctx.roomArchetype = "basic_presentation_1_display";
    ctx.complexityScore = Math.max(ctx.complexityScore, 15);
  }
};

/** CLASSIFY: Dual display VC + BYOD */
const R_CLASSIFY_DUAL_VC_BYOD: Rule = {
  id: "classify.dual_vc_byod.1",
  phase: "classify",
  priority: 90,
  describe: "Classify dual display VC + BYOD room.",
  inputsUsed: ["displayCount", "vc.enabled", "usageModes"],
  when: (p) => p.displayCount >= 2 && !!(p.vc?.enabled) && p.usageModes.includes("byod"),
  then: (_p, ctx) => {
    ctx.roomArchetype = "dual_display_vc_byod";
    ctx.complexityScore = Math.max(ctx.complexityScore, 55);
  }
};

/** DERIVE: Require USB switching/bridging if BYOD + USB peripherals */
const R_DERIVE_USB_BYOD_PERIPHERALS: Rule = {
  id: "derive.usb.byod_peripherals.1",
  phase: "derive",
  priority: 100,
  describe: "If BYOD and USB peripherals required, derive USB switching/bridging requirement.",
  inputsUsed: ["usageModes", "vc.usbPeripheralsRequired"],
  when: (p) => p.usageModes.includes("byod") && !!(p.vc?.usbPeripheralsRequired),
  then: (_p, ctx) => {
    addReq(ctx, {
      id: "usb.byod.peripherals",
      category: "usb",
      mustLevel: "must",
      details: { usbClass: "usb3_preferred", peripherals: "camera+audio" },
      rationale: ["BYOD selected and USB peripherals required for conferencing."]
    });
    ctx.complexityScore = Math.max(ctx.complexityScore, 60);
  }
};

/** DERIVE: Require content-to-call routing if VC enabled + contentToCall */
const R_DERIVE_CONTENT_TO_CALL: Rule = {
  id: "derive.video.content_to_call.1",
  phase: "derive",
  priority: 90,
  describe: "If VC enabled and content must be shared to far end, derive content-to-call requirement.",
  inputsUsed: ["vc.enabled", "vc.contentToCall"],
  when: (p) => !!(p.vc?.enabled) && !!(p.vc?.contentToCall),
  then: (_p, ctx) => {
    addReq(ctx, {
      id: "video.content_to_call",
      category: "video",
      mustLevel: "must",
      details: { farEndShare: true },
      rationale: ["VC requires content share to far end."]
    });
  }
};

/** SELECT PATTERN: Basic */
const R_SELECT_PATTERN_A: Rule = {
  id: "select_pattern.pattern_a.1",
  phase: "select_pattern",
  priority: 100,
  describe: "Select Pattern A when archetype is basic presentation.",
  inputsUsed: ["roomArchetype"],
  when: (_p, ctx) => ctx.roomArchetype === "basic_presentation_1_display",
  then: (_p, ctx) => { ctx.chosenPatternId = "PATTERN_A_BASIC_PRESENTATION"; }
};

/** SELECT PATTERN: Dual VC + BYOD */
const R_SELECT_PATTERN_B: Rule = {
  id: "select_pattern.pattern_b.1",
  phase: "select_pattern",
  priority: 90,
  describe: "Select Pattern B for dual display VC + BYOD.",
  inputsUsed: ["roomArchetype"],
  when: (_p, ctx) => ctx.roomArchetype === "dual_display_vc_byod",
  then: (_p, ctx) => { ctx.chosenPatternId = "PATTERN_B_DUAL_DISPLAY_VC_BYOD"; }
};

/** DESIGN TYPE CANDIDATE: Prefer AVoIP if many endpoints + network available */
const R_CLASSIFY_AVOIP_CANDIDATE: Rule = {
  id: "classify.design_type.avoip_candidate.1",
  phase: "classify",
  priority: 10,
  describe: "If network available and complexity high, consider AVoIP candidate.",
  inputsUsed: ["constraints.networkAvailable", "displayCount"],
  when: (p, ctx) => (p.constraints?.networkAvailable === true) && (ctx.complexityScore >= 60 || p.displayCount >= 3),
  then: (_p, ctx) => { ctx.designTypeCandidate = "AVoIP"; }
};

export const RULES: Rule[] = [
  R_CLASSIFY_BASIC_PRESENTATION,
  R_CLASSIFY_DUAL_VC_BYOD,
  R_CLASSIFY_AVOIP_CANDIDATE,
  R_DERIVE_USB_BYOD_PERIPHERALS,
  R_DERIVE_CONTENT_TO_CALL,
  R_SELECT_PATTERN_A,
  R_SELECT_PATTERN_B
];