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
import { wallBriefSignature } from "./wallStartingPoints";

export const VIDEO_WALL_DRAFT_KEY = "wingman:videowall-builder:v2";

/** What the builder opens on, and where the design came from. */
export type VideowallDraft = {
  requirements: WallRequirements;
  selectedId: string;
  /**
   * The build of that design the rep chose, when the design ships in more than
   * one. `""` is the catalogue build, so a wall saved before builds existed is
   * the one it was always quoted as.
   */
  variantId: string;
  startingPoint?: WallStartingPointOrigin;
  /**
   * True when the address named a wall this browser had not stored, so the
   * design on screen is the sender's rather than a copy of the saved one.
   */
  fromLink?: boolean;
};

function asSummary(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** When a stored design was written, or NaN when it does not say. */
function writtenAt(summary: Record<string, unknown> | null): number {
  const value = summary && typeof summary.updatedAt === "string" ? Date.parse(summary.updatedAt) : NaN;
  return Number.isFinite(value) ? value : NaN;
}

/**
 * The build a stored design names, if it names one.
 *
 * A build is a short slug on a design, so anything else is a rotted record
 * rather than a build this wall can be ordered in. Whether the design actually
 * offers it is decided where the design is read, against the design's own list.
 */
function storedVariantId(value: unknown): string {
  if (typeof value !== "string") return "";
  const id = value.trim();
  return /^[a-z0-9-]{1,32}$/.test(id) ? id : "";
}

/** The project a stored draft says it belongs to, when it says. */
function draftOwner(draft: Record<string, unknown> | null): string | null {
  const owner = typeof draft?.projectId === "string" ? draft.projectId.trim() : "";
  return owner || null;
}

/**
 * The design this builder would reopen: the project's saved wall, or the local
 * draft when that holds newer work.
 *
 * The draft is written on every edit, so it is normally newer than the copy it
 * was made from — an edit the rep has not saved yet must not be thrown away by
 * a reload. A draft older than the project's wall is what another device has
 * since replaced, so the saved wall wins there.
 *
 * A scoped address (`?project=`) asks for one project's wall, so a draft the
 * builder wrote for some other project is that project's work however new it
 * is: on its own it would reopen the wrong wall. The scope only means anything
 * when it names the project the builder is already reading, so another
 * project's id cannot pull a third project's copy in.
 */
function storedWallSummary(scopedProjectId?: string | null): Record<string, unknown> | null {
  try {
    const active = getCurrentWorkflowProject();
    const projectDraft = active?.videowall?.summary;
    const project = projectDraft?.version === 2 ? asSummary(projectDraft) : null;
    const local = asSummary(JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY) || "null"));
    const scope = scopedProjectId && scopedProjectId === active?.id ? scopedProjectId : null;
    const ownDraft = scope && draftOwner(local) !== scope ? null : local;
    if (!project) return ownDraft;
    if (!ownDraft) return project;
    const localAt = writtenAt(ownDraft);
    const projectAt = writtenAt(project);
    if (!Number.isFinite(localAt)) return project;
    if (!Number.isFinite(projectAt)) return ownDraft;
    return localAt > projectAt ? ownDraft : project;
  } catch {
    return null;
  }
}

/**
 * The local draft's own facts: when this browser wrote it, and which project
 * the builder was working on at the time.
 *
 * The owner is what lets a project page speak for its own draft only — this
 * browser may hold another project's wall in progress, and reporting that work
 * against the wrong project would be a claim nobody made.
 */
export type StoredVideowallDraft = {
  updatedAt: string;
  projectId: string | null;
};

/**
 * This browser's wall draft, or null when it holds none. The builder compares
 * the stamp with the project's saved wall, so a rep can see that a reload is
 * safe while the project copy is behind.
 */
export function storedVideowallDraft(): StoredVideowallDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const draft = asSummary(JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY) || "null"));
    const updatedAt = typeof draft?.updatedAt === "string" ? draft.updatedAt : "";
    if (!Number.isFinite(Date.parse(updatedAt))) return null;
    return { updatedAt, projectId: draftOwner(draft) };
  } catch {
    return null;
  }
}

/** When this browser last wrote a wall draft, or null when it holds none. */
export function storedVideowallDraftUpdatedAt(): string | null {
  return storedVideowallDraft()?.updatedAt ?? null;
}

/**
 * Keep the wall the rep is working on, so a reload reopens it — survey cells
 * and all. Saving writes the same draft with the full design evidence; this is
 * the lighter copy every edit leaves behind.
 *
 * Returns the stamp it wrote, so the builder can say how current the draft is
 * without reading storage back during render; null means the write failed.
 */
export function rememberVideowallDraft(draft: {
  requirements: WallRequirements;
  selectedId?: string;
  variantId?: string;
  startingPoint?: WallStartingPointOrigin | null;
}): string | null {
  if (typeof window === "undefined") return null;
  try {
    const updatedAt = new Date().toISOString();
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
      version: 2,
      requirements: draft.requirements,
      selectedId: draft.selectedId ?? "",
      // The build rides with the design: reopening the wall reopens the pair
      // that was quoted, not the catalogue's default build.
      selectedVariantId: draft.variantId ?? "",
      startingPoint: draft.startingPoint ?? null,
      // The wall keeps its owner, so a project page can tell this browser's
      // draft of that wall apart from another project's work in progress.
      projectId: getCurrentWorkflowProject()?.id ?? null,
      updatedAt,
    }));
    return updatedAt;
  } catch {
    // Storage can be unavailable in a private window; the design stays on screen.
    return null;
  }
}

/** Whether the wall in the address is the one already stored here. */
function namesStoredWall(stored: unknown, shared: WallRequirements): boolean {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return false;
  try {
    return wallBriefSignature(stored as WallRequirements) === wallBriefSignature(shared);
  } catch {
    return false;
  }
}

/**
 * Restore the builder from a handoff, a shared wall link, the current project,
 * or the local draft — in that order.
 *
 * A handoff outranks a link because a fresh handoff arrives in the visit that
 * replaced the address; a link outranks the project and the draft because the
 * sender chose that wall, and opening the recipient's own draft instead is
 * exactly what the link exists to prevent.
 *
 * The builder writes `?wall=` on every edit, though, so a reload carries the
 * rep's own brief back to them. A link is answers only — the survey stays with
 * the room it was measured in — so a link that names the wall already stored
 * here is this browser's own address, and the stored design is the fuller copy.
 * Only a link naming some other wall outranks it.
 *
 * A project-scoped address (the project page's "continue" link) names the wall
 * it wants, so the draft the builder reopens has to be that project's own: a
 * newer draft written while working on another wall would otherwise arrive in
 * its place, which is the one thing the rep did not ask for.
 */
export function restoreVideowallDraft(
  handoff: VideoWallHandoff | null,
  shared?: WallRequirements | null,
  /** The project the address names, when it names one. */
  scopedProjectId?: string | null,
): VideowallDraft {
  const fallback = { requirements: { ...defaultWallRequirements }, selectedId: "", variantId: "" };
  // An explicit handoff from Discovery or a template outranks the saved draft.
  const seeded = seedWallRequirements(handoff);
  if (seeded) return { requirements: seeded, selectedId: "", variantId: "" };
  const raw = storedWallSummary(scopedProjectId);
  const r = raw?.requirements as WallRequirements | undefined;
  if (shared && !namesStoredWall(r, shared)) {
    return { requirements: normalizeWallDesignMetadata(shared), selectedId: "", variantId: "", fromLink: true };
  }
  try {
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
      selectedId: typeof raw?.selectedId === "string" ? raw.selectedId : "",
      variantId: storedVariantId(raw?.selectedVariantId),
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
