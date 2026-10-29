/**
 * The Compare eligibility engine's shared vocabulary.
 *
 * Types only, plus the two blocker sentences more than one module quotes verbatim.
 * Every module below imports from here, and this module imports nothing, so the
 * vocabulary cannot acquire a runtime dependency on the rules that use it.
 */
export type LooseRecord = Record<string, any>;
export type LooseMatch = LooseRecord;

export const SUPPORT_ONLY_LEAD_BLOCKER = "Accessory, controller, rack, cable or support item cannot be a lead replacement candidate.";
export const MULTIVIEW_CANVAS_BLOCKER = "Multiview requires multi-source single-output canvas evidence; multiple outputs alone do not qualify as multiview.";

export type CompareIntentKind =
  | "matrix"
  | "hdbaset-matrix"
  | "distribution-amplifier"
  | "av-over-ip"
  | "av-over-ip-encoder"
  | "av-over-ip-decoder"
  | "network-audio"
  | "video-wall-processor"
  | "multiview"
  | "presentation-switcher"
  | "uc-byod"
  | "extender"
  | "ndi-camera"
  | "ptz-camera"
  | "wireless-casting"
  | "usb-audio"
  | "cable"
  | "gpio-relay"
  | "controller-accessory"
  | "control-system"
  | "unknown";

export type CompareEligibilityClass =
  | "direct"
  | "architecture-alternative"
  | "related-only"
  | "blocked";

export type CompareEligibilityResult = {
  eligibility: CompareEligibilityClass;
  intent: CompareIntentKind;
  reasons: string[];
  blockers: string[];
  fitPenalty: number;
};

