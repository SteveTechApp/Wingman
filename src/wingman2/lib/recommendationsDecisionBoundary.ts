import { recommendationCandidateAllowed } from "./recommendationSafety";
import {
  buildRecommendationSafetyContext,
  filterSafeRecommendationCandidates,
} from "./recommendationSafetyGate";
import type { StoredDiscoveryBrief } from "../data/projectStore";
import { discoveryBriefToFinderNeed, type FinderNeedDraft } from "../data/workflowHandoff";
import { buildSystemDesign, productMatchesSlot, ucAllInOneCoverage, type SystemSlot, type SystemSlotKind } from "./discoverySystemDesign";
import { micFeedGateReason, micFeedNeed, processingGateReason, resolutionGateReason } from "./productClassification";
import { loadWingmanProductSelectorDecisions, type ProductSelectorDecision, type ProductSelectorRequest } from "./productSelectorEngine";
import { readClassificationFacts } from "./productStoryEngine";

export type RecommendationDecision = Awaited<ReturnType<typeof loadWingmanProductSelectorDecisions>>[number];
export type RecommendationSystemSlotResult = { slot: SystemSlot; candidates: RecommendationDecision[]; ucCovered?: boolean };

export function recommendationRequest(need: Partial<FinderNeedDraft>): ProductSelectorRequest {
  return {
    mode: "recommendations",
    query: need.query ?? "",
    technicalRequirement: need.technicalRequirement ?? "",
    productPath: need.productPath ?? "",
    technologyType: need.technologyType ?? "",
    signalType: need.signalType ?? "",
    sourceConnector: need.sourceConnector ?? "",
    displayConnector: need.displayConnector ?? "",
    inputs: need.inputs ?? "",
    outputs: need.outputs ?? "",
    distance: need.distance ?? "",
    resolution: need.resolution ?? "",
    usb: need.usb ?? "",
    audio: need.audio ?? "",
    network: need.network ?? "",
    processing: need.processing ?? "",
    control: need.control ?? "",
    microphones: need.microphones ?? "",
    includeArchitectureAlternatives: true,
    includeDependencies: true,
  };
}

/**
 * Roles that can be filled by something which does NOT compose the picture, and
 * so have to answer the room's processing demand. The `multiview` and
 * `wall-processor` roles are deliberately absent: their own taxonomy tokens
 * (a multiview processor, a video-wall processor) already are the composition
 * evidence, and re-checking the keyword behind that token rejected the very
 * products the role is named for.
 */
const PROCESSING_SLOTS = new Set<SystemSlotKind>(["matrix", "avoip-decoder"]);

/**
 * Roles whose job IS the room's voices. An amplifier's mic inputs are for
 * paging, not for the room's pickup, so the feed count has no business
 * narrowing the room-audio role — only the microphone role answers to it.
 */
const MICROPHONE_SLOTS = new Set<SystemSlotKind>(["microphone"]);

/**
 * An integrated UC bar is one pickup device. A room asking for more feeds than
 * a single bar is built around can only cover the microphone role with a real
 * pickup line, so the bar's all-in-one coverage stops short of it.
 */
const UC_ALL_IN_ONE_MIC_CEILING = 4;

/**
 * The room-wide answers that belong to every role, applied where each one is
 * the role's own business.
 *
 * The slot pool is deliberately requested without a Finder need: a camera is
 * not filtered by the room's USB path and an amplifier is not filtered by its
 * display count, because those are other roles' facts. Picture quality and
 * microphone feeds are the exceptions the other way round — they size the ROOM,
 * not one role — so they narrow every slot; the processing answer only belongs
 * to the roles that compose or route the picture. Without this the pool was
 * chosen on taxonomy alone and three Discovery answers changed nothing a rep
 * could see.
 */
function slotMeetsDiscoveryNeed(slot: SystemSlot, decision: ProductSelectorDecision, need: Partial<FinderNeedDraft>) {
  if (resolutionGateReason(decision.profile, need.resolution)) return false;
  if (PROCESSING_SLOTS.has(slot.kind) && processingGateReason(decision.profile, need.processing)) return false;
  if (MICROPHONE_SLOTS.has(slot.kind) && micFeedGateReason(decision.profile, need.microphones)) return false;
  return true;
}

export function recommendationSlotRequest(): ProductSelectorRequest {
  return {
    mode: "recommendations",
    includeDependencies: true,
    includeAccessories: true,
    includeArchitectureAlternatives: true,
  };
}

function classification(decision: ProductSelectorDecision) {
  return readClassificationFacts(decision.product as Record<string, unknown>);
}

export function resolveRecommendationSystemSlots(
  brief: StoredDiscoveryBrief | null,
  slotPool: RecommendationDecision[],
) {
  const safetyCheckedSlotPool = filterSafeRecommendationCandidates(
    slotPool,
    buildRecommendationSafetyContext(brief),
  );
  const design = buildSystemDesign(brief);
  const need = discoveryBriefToFinderNeed(brief) ?? {};
  const microphoneFeeds = micFeedNeed(need.microphones);
  const moreFeedsThanOneBar = microphoneFeeds != null && microphoneFeeds > UC_ALL_IN_ONE_MIC_CEILING;
  // Above the ceiling one all-in-one is one pickup device, so it is not the
  // microphone role's product at all. It has to leave BEFORE the shortlist is
  // capped: a bar that fills one of the four places and is then removed leaves
  // the role empty while the dedicated pickup devices sit just below the cut.
  const allInOneCannotCoverMicrophone = (slot: SystemSlot, decision: RecommendationDecision) =>
    MICROPHONE_SLOTS.has(slot.kind)
    && moreFeedsThanOneBar
    && Boolean(ucAllInOneCoverage(classification(decision)));
  const raw: RecommendationSystemSlotResult[] = design.slots.map((slot) => ({
    slot,
    candidates: slot.supply === "external" ? [] : safetyCheckedSlotPool
      .filter((decision) => decision.eligible)
      .filter((decision) => productMatchesSlot(classification(decision), slot))
      .filter((decision) => slotMeetsDiscoveryNeed(slot, decision, need))
      .filter((decision) => !allInOneCannotCoverMicrophone(slot, decision))
      .filter((decision) => recommendationCandidateAllowed(
        decision,
        slot.kind,
        [design.architecture, brief?.roomModel, brief],
      ))
      .slice(0, 4),
  }));
  const coveredByUc = new Set<string>();
  for (const entry of raw) {
    const coverage = entry.candidates[0] ? ucAllInOneCoverage(classification(entry.candidates[0])) : null;
    if (!coverage) continue;
    if (moreFeedsThanOneBar) coverage.delete("microphone");
    coverage.forEach((kind) => coveredByUc.add(kind));
  }
  return {
    design,
    systemSlots: coveredByUc.size === 0 ? raw : raw.map((entry) => coveredByUc.has(entry.slot.kind)
      ? { ...entry, candidates: [], ucCovered: true }
      : entry),
  };
}

export async function loadRecommendationsDecisionBoundary(
  brief: StoredDiscoveryBrief | null,
  need: Partial<FinderNeedDraft>,
) {
  const [decisions, slotPool] = await Promise.all([
    loadWingmanProductSelectorDecisions(recommendationRequest(need)),
    loadWingmanProductSelectorDecisions(recommendationSlotRequest()),
  ]);
  return { decisions, slotPool, ...resolveRecommendationSystemSlots(brief, slotPool) };
}
