import { wallFitReasons, type WallDecision } from "./videowallDecision";
import {
  wallCanvasPlan,
  wallResolutionSummary,
  WALL_RESEARCH_DATE,
  type WallOption,
  type WallRequirements,
} from "./videowallOptions";
import type { WallTransportPlan } from "./videowallTransport";
import { wallSurveyDisplayCount, wallSurveyGapText, wallSurveyGaps } from "./wallSurvey";
import type { WallStartingPointOrigin } from "./wallStartingPointOrigin";
import { wallVariantFor } from "./wallVariants";

/**
 * The design evidence saved onto the project by the wall builder. Kept beside
 * the calculations it records so the page only names its inputs: every value
 * here is derived from the captured requirements or the selected design.
 */
export function wallDesignEvidence(args: {
  requirements: WallRequirements;
  option: WallOption;
  /**
   * The build of that design, when it ships in more than one. The equipment on
   * `option` is already the chosen build's, so this only records which one it
   * was — a reordered schedule must still say why its part numbers changed.
   */
  variantId?: string | null;
  decision: WallDecision;
  transport: WallTransportPlan;
  /** Checks captured outside the product model, such as HDCP or 24/7 operation. */
  checks: string[];
  origin: string | null;
  /**
   * The card the answers started on, stored with the wall so the project and the
   * proposal can say where the design started and what moved from it.
   */
  startingPoint?: WallStartingPointOrigin | null;
}) {
  const resolution = wallResolutionSummary(args.requirements);
  const canvasPlan = wallCanvasPlan(args.requirements);
  const surveyGaps = wallSurveyGaps(args.transport, args.requirements.linkDetails);
  const isLead = args.decision.recommended?.option.id === args.option.id;
  const variant = wallVariantFor(args.option.id, args.variantId);
  return {
    version: 2,
    source: "wingman-video-wall-workflow",
    requirements: { ...args.requirements, mapping: args.requirements.mapping ?? (args.requirements.windows > 1 ? "fit" : "fill") },
    selectedId: args.option.id,
    // Null rather than absent on the catalogue build: a reader can tell "the
    // one build" from "no record", the same way the starting point reads.
    selectedVariantId: variant?.id ?? null,
    recommendation: {
      title: args.option.title,
      rationale: args.option.summary,
      variant: variant?.label ?? null,
      products: args.option.equipment.map((item) => item.sku),
      equipment: args.option.equipment,
      reasons: isLead ? args.decision.recommended?.reasons ?? [] : wallFitReasons(args.option, args.requirements),
      alternative: args.decision.alternative
        ? { title: args.decision.alternative.headline, when: args.decision.alternative.when }
        : null,
    },
    signalPath: args.option.path,
    checks: [...args.option.checks, ...args.checks],
    resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
    canvasPlan: {
      canvas: canvasPlan.canvas,
      native: canvasPlan.native,
      perPanel: canvasPlan.perPanel,
      recommended: canvasPlan.recommended,
      rationale: canvasPlan.rationale,
      text: canvasPlan.text,
    },
    transport: args.transport,
    // The handoff record carries the survey shortfall, so an incomplete install
    // line cannot be mistaken for a finished survey.
    survey: {
      linkCount: args.transport.allLinks.length,
      gaps: surveyGaps,
      text: wallSurveyGapText(surveyGaps, wallSurveyDisplayCount(args.transport)),
    },
    evidence: args.option.sources,
    evidenceCheckedAt: WALL_RESEARCH_DATE,
    origin: args.origin,
    // Null rather than absent: a wall saved from a handoff or from scratch says
    // so, and a reader does not have to tell "no card" from "field missing".
    startingPoint: args.startingPoint ?? null,
    updatedAt: new Date().toISOString(),
  };
}
