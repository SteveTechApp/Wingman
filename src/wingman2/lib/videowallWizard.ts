import { wallLayoutChoices } from "./videowallDecision";
import {
  wallApplications,
  wallProjectorCount,
  type WallApplication,
  type WallRequirements,
} from "./videowallOptions";
import { videowallNetworkChoices, videowallNetworkKeyFor } from "./videowallDraft";
import { wallPhysicalSize } from "./wallPhysicalSize";
import { wallFeedingAnswer } from "./wallFeeding";

/**
 * The focused view asks the questions a rep would ask in the room, one screen
 * at a time, then hands the answers to the same decision engine the expert
 * builder uses. This module owns the question order, the answer summary and
 * the constraints that do not change the recommendation but do change the
 * checks a rep must close before quoting.
 */

export type WallWizardStepKey = "picture" | "size" | "sources" | "network" | "feeding" | "layout" | "visual" | "detail";

/**
 * The wall's kind is the first question, because it decides which of the others
 * exist at all: a projection screen has projectors and a blend, an LED canvas
 * has a pitch and cabinets, and only an LCD wall can be fed a panel at a time.
 * The sources come next, since what the wall has to carry is the thing the
 * design answers. The size comes before the connection because the wall decides
 * the canvas, and the connection before the layout because a window count only
 * means something once the wall is known to receive one composed picture.
 *
 * The drawing is a reading of those answers rather than a question of its own,
 * so it gets a screen instead of stacking under the size controls that produced
 * it; the wiring is the same reading, and belongs to the result's survey pass.
 */
export const wallWizardSteps: { key: WallWizardStepKey; label: string }[] = [
  { key: "picture", label: "Wall type" },
  { key: "size", label: "Size and pixels" },
  { key: "sources", label: "Sources" },
  { key: "network", label: "Network" },
  { key: "feeding", label: "Connection" },
  { key: "layout", label: "Layout" },
  { key: "visual", label: "The design" },
  { key: "detail", label: "Must-haves" },
];

export type WallWizardAnswer = {
  key: WallWizardStepKey;
  step: number;
  label: string;
  value: string;
};

const STEP_INDEX = Object.fromEntries(wallWizardSteps.map((step, index) => [step.key, index])) as Record<WallWizardStepKey, number>;

const panelSize = (r: WallRequirements) => (r.displayCustom ? `${r.displayWidth} × ${r.displayHeight}` : r.displayResolution === "1080p" ? "1080p" : "4K");

const sourceTiming = (r: WallRequirements) => (r.sourceCustom ? `${r.sourceWidth} × ${r.sourceHeight}` : r.sourceResolution === "4k60" ? "4K60" : r.sourceResolution === "4k30" ? "4K30" : "1080p60");

export function wallWizardAnswers(r: WallRequirements): WallWizardAnswer[] {
  const panels = r.columns * r.rows;
  const picture = wallApplications.find((application) => application.value === r.application)?.title ?? r.application;
  const layout = wallLayoutChoices.find((choice) => choice.value === r.layout
    && (!choice.customMode || choice.customMode === r.customMode))?.label ?? r.layout;
  const network = videowallNetworkChoices.find((choice) => choice.key === videowallNetworkKeyFor(r))?.label
    ?? (r.network === "none" ? "No AV network selected" : "Choose a network option");
  const count = `${r.sources} source${r.sources === 1 ? "" : "s"}`;
  const projectors = wallProjectorCount(r);
  // The wall's size is the array and its pixels; the source count and its
  // timing belong to the sources answer, so the box and what it carries are two
  // questions a rep reads back rather than one sentence doing both jobs.
  const size = r.application === "led"
    ? `${r.ledCanvasWidth} × ${r.ledCanvasHeight} LED canvas`
    : r.application === "projection"
      ? projectors > 1
        ? `${projectors} projectors at ${panelSize(r)} each`
        : `One projector at ${panelSize(r)}`
      : `${r.columns} × ${r.rows} (${panels} panels) · ${r.orientation} · ${panelSize(r)} panels`;
  return [
    { key: "picture", step: STEP_INDEX.picture, label: "Wall type", value: picture },
    { key: "size", step: STEP_INDEX.size, label: "Size and pixels", value: `${size} · ${wallPhysicalSize(r).text}` },
    { key: "sources", step: STEP_INDEX.sources, label: "Sources", value: `${count} at ${sourceTiming(r)}` },
    { key: "network", step: STEP_INDEX.network, label: "Network", value: network },
    { key: "feeding", step: STEP_INDEX.feeding, label: "Connection", value: wallFeedingAnswer(r) },
    { key: "layout", step: STEP_INDEX.layout, label: "Layout", value: layout },
  ];
}

/**
 * Changing what is on the wall can invalidate the layout answer: a per-panel
 * feed only exists for individually fed LCDs, and free placement only exists on
 * one composed canvas. Keep every other answer intact.
 */
export function wallWizardApplicationPatch(
  application: WallApplication,
  current: Pick<WallRequirements, "layout">,
): Partial<WallRequirements> {
  const dropIndependent = application !== "lcd-direct" && current.layout === "independent";
  const dropCustom = application === "lcd-direct" && current.layout === "custom";
  return {
    application,
    ...(dropIndependent || dropCustom ? { layout: "single" as const, windows: 1 } : {}),
  };
}

export function wallWizardLayoutChoices(application: WallApplication) {
  return wallLayoutChoices.filter((choice) => !choice.applications || choice.applications.includes(application));
}

/**
 * The result is read in three passes instead of one long page: what Wingman
 * decided, what the wall looks like, then how it is wired. Each pass is a real
 * job a rep does before quoting, so no screen has to carry the whole design.
 */
export type WallReviewStageKey = "decision" | "wall" | "transport";

export const wallReviewStages: { key: WallReviewStageKey; label: string; hint: string }[] = [
  { key: "decision", label: "The design", hint: "What Wingman recommends and why" },
  { key: "wall", label: "The wall", hint: "Array, mounting and source mapping" },
  { key: "transport", label: "Transport and survey", hint: "Cable runs and install detail" },
];

/** One line under each stage name, so a rep can pick a pass without opening it. */
export function wallReviewStageStatuses(input: {
  selectedTitle: string | null;
  unblockers: number;
  wall: string;
  links: number;
  gaps: number;
}): Record<WallReviewStageKey, string> {
  const decision = input.selectedTitle
    ?? `${input.unblockers} requirement change${input.unblockers === 1 ? " opens" : "s open"} the field`;
  const transport = input.links === 0
    ? "No cable links in this design"
    : input.gaps === 0
      ? `All ${input.links} links surveyed`
      : `${input.gaps} of ${input.links} links need an install cell`;
  return { decision, wall: input.wall, transport };
}

export type WallDesignBandKey = "start" | "answer" | "questions" | "options";

/**
 * The design pass is read in bands, one on screen at a time.
 *
 * The pass holds four readings: the wall the room starts from, the answer, the
 * questions behind that answer, and every design tested against it. Stacked,
 * they are the long page the passes exist to end. A band is not another pass —
 * the rail above still names three, so a shared link and a remembered pass are
 * unchanged — and each band carries the sentences that leave and return to it,
 * so the rail, the step actions and the specs read one list.
 */
export const wallDesignBands: {
  key: WallDesignBandKey;
  label: string;
  /** The line on the action that goes to the band after this one. */
  next: string;
  /** The line on the action that returns to the band before this one. */
  back?: string;
}[] = [
  { key: "start", label: "Start from a wall", next: "Continue to the answer" },
  { key: "answer", label: "The answer", next: "Continue to the questions", back: "Back to the wall picker" },
  { key: "questions", label: "The questions", next: "Continue to every option", back: "Back to the answer" },
  { key: "options", label: "Every option", next: "Continue to the wall", back: "Back to the questions" },
];

export type WallWizardConcern = {
  key: string;
  label: string;
  detail: string;
  /** Added to "Confirm before ordering" and to the saved design. */
  check: string;
  /** Applied while the concern is selected. */
  patch?: Partial<WallRequirements>;
  /** Applied when the concern is cleared again. */
  clear?: Partial<WallRequirements>;
};

export const wallWizardConcerns: WallWizardConcern[] = [
  {
    key: "hdcp",
    label: "HDCP-protected sources",
    detail: "Set-top players, streaming devices or protected media.",
    check: "Confirm HDCP version end to end from each protected source to the wall; a switcher can pass video without passing protected content.",
  },
  {
    key: "always-on",
    label: "Runs unattended",
    detail: "Signage or monitoring that must come back after a power cut.",
    check: "Confirm power recovery, EDID persistence and scheduled reboot behaviour for unattended operation.",
  },
  {
    key: "audio",
    label: "Audio follows the wall",
    detail: "The room must hear whichever source is showing.",
    check: "Confirm audio de-embedding, delay alignment and which source's audio follows the wall.",
  },
  {
    key: "control",
    label: "Third-party control",
    detail: "Crestron, Control4, Q-SYS or a similar system drives the wall.",
    check: "Confirm the control driver, API set and preset recall exposed by the selected design.",
  },
  {
    key: "text",
    label: "Text must stay legible",
    detail: "Dashboards, spreadsheets and small labels on screen.",
    check: "Confirm minimum text size at the farthest viewer and per-window scaling for data sources.",
  },
  {
    key: "portrait",
    label: "Panels are portrait",
    detail: "Rotated panels in a tall array.",
    check: "Confirm rotation is supported on every used output and set panel orientation at commissioning.",
    patch: { orientation: "portrait" },
    clear: { orientation: "landscape" },
  },
];

export function wallWizardConcernChecks(keys: readonly string[]): string[] {
  return wallWizardConcerns.filter((concern) => keys.includes(concern.key)).map((concern) => concern.check);
}
