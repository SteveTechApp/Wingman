import {
  startingPointRequirements,
  wallStartingPointBrief,
} from "./wallStartingPoints";
import {
  wallApplications,
  wallProjectorCount,
  type WallRequirements,
} from "./videowallOptions";
import { wallLayoutChoices, type WallStartPreset } from "./videowallDecision";

/**
 * Where a set of wall answers came from.
 *
 * A starting-point card sets the whole brief in one tap, so once a rep starts
 * adjusting it the design is neither the card nor a blank page: it is that card
 * plus whatever the room changed. Keeping the card's own answers beside the
 * design is what lets the builder name the answers that moved, instead of only
 * saying the wall no longer matches a card.
 *
 * The brief is the card's answers with the site's survey stripped — the same
 * shape the picker keys its cards on — so a measured run or an install cell is
 * never counted as an adjustment to the brief.
 */
export type WallStartingPointOrigin = {
  /** The card's id: a shipped preset key or `saved-<hash>`. */
  key: string;
  /** What the card was called when it was picked. */
  label: string;
  /** The card's answers, so drift is measured against the card itself. */
  brief: WallRequirements;
};

const MAX_LABEL = 80;

/** The origin recorded when a rep picks a card. */
export function wallStartingPointOrigin(preset: WallStartPreset): WallStartingPointOrigin {
  return {
    key: preset.key,
    label: preset.label,
    brief: wallStartingPointBrief(preset.requirements),
  };
}

/**
 * A stored origin, checked before it goes back onto a design.
 *
 * A rotted entry is no origin at all: the panel would otherwise measure the
 * rep's answers against a card that never existed, and the card's answers are
 * held to the same shape a saved card is.
 */
export function normalizeWallStartingPointOrigin(value: unknown): WallStartingPointOrigin | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const key = typeof record.key === "string" ? record.key.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim().slice(0, MAX_LABEL) : "";
  const brief = startingPointRequirements(record.brief);
  if (!key || !label || !brief) return undefined;
  return { key, label, brief };
}

export type WallStartingPointChange = {
  /** Stable answer key, so a surface can address one row. */
  key: string;
  /** The answer in the words the picker and the builder use. */
  label: string;
  /** The card's answer. */
  from: string;
  /** What the rep has now. */
  to: string;
};

/**
 * The card a saved wall came from, read back off its stored summary.
 *
 * The summary is the design snapshot, so the card travels with the wall: the
 * project panel and the proposal can then say where the wall started, not only
 * what its answers are now. A summary that predates the field, or one whose card
 * has rotted, carries no origin rather than an unreadable one.
 */
export function wallStartingPointFromSummary(summary: unknown): WallStartingPointOrigin | undefined {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return undefined;
  return normalizeWallStartingPointOrigin((summary as Record<string, unknown>).startingPoint);
}

/**
 * Where a saved wall started and what moved from the card, as one sentence.
 *
 * The project panel and both proposal exports print this same line, because the
 * card is a fact about the design rather than a reading of one screen: a quote
 * that omitted it would present an adjusted wall as the card the customer saw.
 */
export function wallStartingPointRecordText(drift: WallStartingPointDrift): string {
  if (!drift.changes.length) return `Started from ${drift.card.label}. No answers changed from the card.`;
  const count = drift.changes.length;
  const changes = drift.changes.map((change) => `${change.label}: ${change.from} → ${change.to}`).join("; ");
  return `Started from ${drift.card.label}. ${count} answer${count === 1 ? "" : "s"} changed: ${changes}.`;
}

export type WallStartingPointDrift = {
  card: WallStartingPointOrigin;
  changes: WallStartingPointChange[];
  /** One sentence a rep reads without opening the list. */
  text: string;
};

/**
 * How far the answers have moved from the card they started on.
 *
 * Drift is measured answer by answer, not field by field in the model: a rep
 * changed "the layout", not `windows` and `customMode`. Fields that describe
 * the same answer travel together, so the panel never reports one click as
 * three changes.
 */
export function wallStartingPointDrift(
  origin: WallStartingPointOrigin | null | undefined,
  current: WallRequirements,
): WallStartingPointDrift | null {
  if (!origin) return null;
  const brief = wallStartingPointBrief(current);
  const changes: WallStartingPointChange[] = [];
  for (const field of driftFields) {
    const from = field.value(origin.brief);
    const to = field.value(brief);
    if (from === to) continue;
    changes.push({ key: field.key, label: field.label, from, to });
  }
  const count = changes.length;
  return {
    card: origin,
    changes,
    text: count
      ? `${count} answer${count === 1 ? "" : "s"} changed since you picked ${origin.label}.`
      : `No answers changed since you picked ${origin.label}.`,
  };
}

type DriftField = {
  key: string;
  label: string;
  value: (requirements: WallRequirements) => string;
};

const panelPixels = (r: WallRequirements) =>
  r.displayCustom ? `${r.displayWidth} × ${r.displayHeight}` : r.displayResolution === "1080p" ? "1080p" : "4K";

const sourceTiming = (r: WallRequirements) =>
  r.sourceCustom ? `${r.sourceWidth} × ${r.sourceHeight}` : r.sourceResolution === "4k60" ? "4K60" : r.sourceResolution === "4k30" ? "4K30" : "1080p60";

/**
 * The answer captions name the wall, not the picker chip: a comparison line
 * reads on its own, so it says "1GbE" rather than repeating a chip's sentence.
 */
const driftFields: DriftField[] = [
  {
    key: "picture",
    label: "On the wall",
    value: (r) => wallApplications.find((application) => application.value === r.application)?.title ?? r.application,
  },
  {
    key: "shape",
    label: "Wall shape",
    value: (r) =>
      r.application === "led"
        ? `${r.ledCanvasWidth} × ${r.ledCanvasHeight} canvas`
        : r.application === "projection"
          ? `${wallProjectorCount(r)} projector${wallProjectorCount(r) === 1 ? "" : "s"}`
          : `${r.columns} × ${r.rows}`,
  },
  { key: "sources", label: "Sources", value: (r) => `${r.sources}` },
  // Layout before windows: a rep changed how the sources appear, and the window
  // count rides along with that answer rather than being a second decision.
  {
    key: "layout",
    label: "Layout",
    value: (r) =>
      wallLayoutChoices.find(
        (choice) => choice.value === r.layout && (!choice.customMode || choice.customMode === r.customMode),
      )?.label ?? r.layout,
  },
  {
    key: "windows",
    label: "Windows",
    value: (r) => (r.layout === "independent" ? "one per panel" : `${r.windows}`),
  },
  {
    key: "location",
    label: "Where the sources sit",
    value: (r) => {
      if (r.network === "1g") return "1GbE";
      if (r.network === "10g") return "10GbE";
      if (r.network === "none") return "No AV network";
      return r.sourceLocation === "local" ? "In one rack" : "Around the building";
    },
  },
  { key: "timing", label: "Source timing", value: sourceTiming },
  {
    key: "panel",
    label: "Panel and pixels",
    value: (r) => `${r.application === "led" ? `${r.pixelPitchMm ?? "Pitch"} mm pitch` : `${r.panelDiagonalInches ?? 55} in`} · ${panelPixels(r)}`,
  },
  {
    key: "mapping",
    label: "Source mapping",
    value: (r) => (r.mapping === "fill" ? "Fill the wall" : r.mapping === "fit" ? "Fit inside the wall" : "Wingman's choice"),
  },
];
