import { wallLayoutChoices } from "./videowallDecision";
import {
  wallApplications,
  wallProjectorCount,
  type WallApplication,
  type WallRequirements,
} from "./videowallOptions";
import { videowallLocationChoices, videowallLocationKeyFor } from "./videowallDraft";
import { wallPhysicalSize } from "./wallPhysicalSize";
import { wallFeedingAnswer } from "./wallFeeding";

/**
 * The focused view asks the questions a rep would ask in the room, one screen
 * at a time, then hands the answers to the same decision engine the expert
 * builder uses. This module owns the question order, the answer summary and
 * the constraints that do not change the recommendation but do change the
 * checks a rep must close before quoting.
 */

export type WallWizardStepKey = "job" | "picture" | "size" | "feeding" | "layout" | "location" | "detail";

/**
 * The size comes before the connection because the wall decides the canvas,
 * and the connection before the layout because a window count only means
 * something once the wall is known to receive one composed picture.
 */
export const wallWizardSteps: { key: WallWizardStepKey; label: string }[] = [
  { key: "job", label: "The job" },
  { key: "picture", label: "On the wall" },
  { key: "size", label: "Size and pixels" },
  { key: "feeding", label: "Connection" },
  { key: "layout", label: "Layout" },
  { key: "location", label: "Sources" },
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
  const location = videowallLocationChoices.find((choice) => choice.key === videowallLocationKeyFor(r))?.label ?? "Sources";
  const count = `${r.sources} source${r.sources === 1 ? "" : "s"}`;
  const projectors = wallProjectorCount(r);
  const size = r.application === "led"
    ? `${r.ledCanvasWidth} × ${r.ledCanvasHeight} LED canvas · ${count}`
    : r.application === "projection"
      ? projectors > 1
        ? `${projectors} projectors at ${panelSize(r)} each · ${count}`
        : `One projector at ${panelSize(r)} · ${count}`
      : `${r.columns} × ${r.rows} (${panels} panels) · ${r.orientation} · ${panelSize(r)} panels · ${count}`;
  return [
    { key: "picture", step: STEP_INDEX.picture, label: "On the wall", value: picture },
    { key: "size", step: STEP_INDEX.size, label: "Size and pixels", value: `${size} · ${wallPhysicalSize(r).text} · ${sourceTiming(r)} source` },
    { key: "feeding", step: STEP_INDEX.feeding, label: "Connection", value: wallFeedingAnswer(r) },
    { key: "layout", step: STEP_INDEX.layout, label: "Layout", value: layout },
    { key: "location", step: STEP_INDEX.location, label: "Sources", value: location },
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
