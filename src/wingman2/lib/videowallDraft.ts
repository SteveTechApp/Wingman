import { getCurrentWorkflowProject } from "../features/projects";
import {
  defaultWallRequirements,
  normalizeWallDesignMetadata,
  validateWallRequirements,
  wallApplications,
  type WallRequirements,
} from "./videowallOptions";
import { seedWallRequirements, type VideoWallHandoff } from "./videowallHandoff";
import { normalizeWallSurveyReview } from "./wallSurveyReview";
import { normalizeLinkDetails } from "./videowallTransport";
import { wallStartingPointFromSummary, type WallStartingPointOrigin } from "./wallStartingPointOrigin";

export const VIDEO_WALL_DRAFT_KEY = "wingman:videowall-builder:v2";

/**
 * Restore the builder from a handoff, a shared wall link, the current project,
 * or the local draft — in that order.
 *
 * A handoff outranks a link because a fresh handoff arrives in the visit that
 * replaced the address; a link outranks the project and the draft because the
 * sender chose that wall, and opening the recipient's own draft instead is
 * exactly what the link exists to prevent.
 */
export function restoreVideowallDraft(
  handoff: VideoWallHandoff | null,
  shared?: WallRequirements | null,
): { requirements: WallRequirements; selectedId: string; startingPoint?: WallStartingPointOrigin } {
  const fallback = { requirements: { ...defaultWallRequirements }, selectedId: "" };
  // An explicit handoff from Discovery or a template outranks the saved draft.
  const seeded = seedWallRequirements(handoff);
  if (seeded) return { requirements: seeded, selectedId: "" };
  if (shared) return { requirements: normalizeWallDesignMetadata(shared), selectedId: "" };
  try {
    const projectDraft = getCurrentWorkflowProject()?.videowall?.summary;
    const raw = projectDraft?.version === 2 ? projectDraft : JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY) || "null");
    const r = raw?.requirements;
    if (!r || !wallApplications.some((application) => application.value === r.application)
      || !["single", "split", "quad", "nine", "custom", "independent"].includes(r.layout)
      || !["local", "distributed"].includes(r.sourceLocation)
      || !["1080p", "4k30", "4k60"].includes(r.sourceResolution)
      || !["any", "none", "1g", "10g"].includes(r.network)
      || !["portrait", "landscape"].includes(r.orientation)
      || !["fixed", "floating", undefined].includes(r.customMode)
      || !["1080p", "4k", undefined].includes(r.displayResolution)
      || ![undefined, true, false].includes(r.displayCustom)
      || ![undefined, true, false].includes(r.sourceCustom)
      || validateWallRequirements(r).length) return fallback;
    // The stored review is an audit record, so only a well-formed one comes
    // back: a rotted row is dropped rather than shown as a decision nobody made.
    const { surveyReview: rawSurveyReview, ...stored } = r as Record<string, unknown>;
    const surveyReview = normalizeWallSurveyReview(rawSurveyReview);
    const requirements: WallRequirements = {
      ...defaultWallRequirements,
      ...stored,
      customMode: r.customMode === "floating" ? "floating" : "fixed",
      displayResolution: r.displayResolution === "1080p" ? "1080p" : "4k",
      displayCustom: r.displayCustom === true,
      sourceCustom: r.sourceCustom === true,
      // Install detail is free text from a sheet, so a rotted draft must not put
      // non-strings or hundred-character cells back into the table.
      linkDetails: normalizeLinkDetails(r.linkDetails),
      ...(surveyReview ? { surveyReview } : {}),
    };
    // The card the wall started on comes back with the saved wall, so a rep who
    // reopens the design and changes one run does not save it without the card
    // it began on. A handoff or a shared link carries answers only, so those
    // designs start without one.
    const startingPoint = wallStartingPointFromSummary(raw);
    return {
      requirements: normalizeWallDesignMetadata(requirements),
      selectedId: typeof raw.selectedId === "string" ? raw.selectedId : "",
      ...(startingPoint ? { startingPoint } : {}),
    };
  } catch {
    return fallback;
  }
}

export const videowallPanelPresets = [
  { label: "2 × 2", columns: 2, rows: 2 },
  { label: "4 × 1", columns: 4, rows: 1 },
  { label: "4 × 2", columns: 4, rows: 2 },
  { label: "2 × 3", columns: 2, rows: 3 },
  { label: "3 × 3", columns: 3, rows: 3 },
  { label: "4 × 4", columns: 4, rows: 4 },
];

export const videowallSourcePresets = [1, 2, 4, 6, 8, 9, 12, 16];

export type VideowallLocationChoice = {
  key: "local" | "distributed" | "one-gig" | "ten-gig" | "no-network";
  label: string;
  detail: string;
  patch: Partial<WallRequirements>;
};

export const videowallLocationChoices: VideowallLocationChoice[] = [
  {
    key: "local",
    label: "All in one rack",
    detail: "Short HDMI runs; no AV network is needed.",
    patch: { sourceLocation: "local", network: "any" },
  },
  {
    key: "distributed",
    label: "Around the building",
    detail: "Sources and screens are apart; the network carries the picture.",
    patch: { sourceLocation: "distributed", network: "any" },
  },
  {
    key: "one-gig",
    label: "1GbE is already there",
    detail: "The existing 1GbE AV network carries the sources and screens.",
    patch: { sourceLocation: "distributed", network: "1g" },
  },
  {
    key: "ten-gig",
    label: "10GbE is already there",
    detail: "Uncompressed 4K60 4:4:4 over an existing 10GbE network.",
    patch: { sourceLocation: "distributed", network: "10g" },
  },
  {
    key: "no-network",
    label: "No AV network allowed",
    detail: "Keep everything local, even if sources are some distance away.",
    patch: { sourceLocation: "local", network: "none" },
  },
];

export function videowallLocationKeyFor(requirements: WallRequirements): VideowallLocationChoice["key"] {
  if (requirements.network === "10g") return "ten-gig";
  if (requirements.network === "1g") return "one-gig";
  if (requirements.network === "none") return "no-network";
  return requirements.sourceLocation;
}
