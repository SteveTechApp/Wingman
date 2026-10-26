import { wallFitReasons, type WallDecision } from "./videowallDecision";
import { wallApplications, type WallOption, type WallRequirements } from "./videowallOptions";

/**
 * The design summary a rep pastes into an email, a chat or a ticket.
 *
 * It is the same design the screen and the saved record hold, in the order a
 * colleague reads it: what was asked for, what Wingman answered, why, what is
 * ordered and what still has to be confirmed. It lives here rather than in the
 * page so the page entry keeps its reading, and so the sentence list can be
 * read against the export without a browser.
 *
 * The equipment lines are the option's own — the chosen build's part numbers,
 * when the design was ordered in a build — so a pasted summary cannot quote a
 * different pair from the one on screen.
 */
export function wallDesignClipboard(args: {
  requirements: WallRequirements;
  option: WallOption;
  decision: WallDecision;
  /** The resolution budget sentence already on screen. */
  resolutionText: string;
  /** The recommended canvas fit, in the same words the builder shows. */
  canvasRationale: string;
  transportHeadline: string;
  transportFlags: string[];
  /** The survey shortfall, when one is open. */
  surveyWarning: string | null;
  /** Checks captured outside the product model, such as HDCP or 24/7 operation. */
  concernChecks: string[];
}): string {
  const { requirements, option, decision } = args;
  const reasons = decision.recommended?.option.id === option.id
    ? decision.recommended.reasons
    : wallFitReasons(option, requirements);
  return [
    "Wingman video wall design",
    wallApplications.find((application) => application.value === requirements.application)?.title,
    `${requirements.columns} × ${requirements.rows} array; ${requirements.sources} sources; ${requirements.windows} window${requirements.windows === 1 ? "" : "s"}`,
    option.title,
    option.summary,
    `Resolution budget: ${args.resolutionText}`,
    `Recommended canvas fit: ${args.canvasRationale}`,
    `Transport estimate: ${args.transportHeadline}`,
    ...args.transportFlags.map((flag) => `Transport: ${flag}`),
    ...(args.surveyWarning ? [args.surveyWarning] : []),
    "Why this meets the need:",
    ...reasons,
    ...option.equipment.map((item) => `${item.quantity} × ${item.sku} — ${item.role}`),
    `Signal path: ${option.path.join(" → ")}`,
    ...option.blockers.map((blocker) => `Not suitable: ${blocker}`),
    "Confirm before ordering:",
    ...option.checks,
    ...args.concernChecks,
    ...option.sources.map((item) => `${item.label}: ${item.url}`),
  ].join("\n");
}
