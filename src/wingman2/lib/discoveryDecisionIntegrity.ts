import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "../pages/discovery/discoveryTypes";
import { findStrandedQuickStartDefaults, isUnknownDiscoveryValue, wmDiscoveryAnswerToText, wmDiscoveryNormaliseAnswerList } from "../pages/discovery/discoveryAnswerUtils";

export type DiscoveryIssueKind = "contradiction" | "underspecified" | "stranded";

export type DiscoveryDecisionIssue = {
  kind: DiscoveryIssueKind;
  questionIds: string[];
  title: string;
  detail: string;
  followUpQuestion: string;
};

export type DiscoveryDecisionIntegrity = {
  issues: DiscoveryDecisionIssue[];
  contradictions: DiscoveryDecisionIssue[];
  stranded: DiscoveryDecisionIssue[];
  underspecified: DiscoveryDecisionIssue[];
  canProceedToRecommendation: boolean;
};

function values(answers: DiscoveryAnswers, id: string): string[] {
  return wmDiscoveryNormaliseAnswerList(answers[id]).map((value) => value.trim());
}

function has(answers: DiscoveryAnswers, id: string, value: string): boolean {
  return values(answers, id).includes(value);
}

function unansweredOrUnknown(answers: DiscoveryAnswers, notes: DiscoveryNotes, question: DiscoveryQuestion | undefined): boolean {
  if (!question) return false;
  const answer = wmDiscoveryAnswerToText(answers[question.id]);
  const note = notes[question.id] ?? "";
  return question.required && (!answer.trim() || isUnknownDiscoveryValue(answer) || isUnknownDiscoveryValue(note));
}

export function evaluateDiscoveryDecisionIntegrity(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswers,
  notes: DiscoveryNotes = {},
  /**
   * Question set scanned for STRANDED quick-start defaults (a stored answer
   * whose option the interview hides after a later answer). Separate from
   * `questions` so callers can keep the underspecified/contradiction checks on
   * the current mode's questions while scanning the FULL visible set for
   * strands — a default stranded on an expert-level question still blocks
   * quote safety even in Basic mode. Defaults to `questions`.
   */
  strandedQuestions: DiscoveryQuestion[] = questions,
): DiscoveryDecisionIntegrity {
  const contradictions: DiscoveryDecisionIssue[] = [];
  const stranded: DiscoveryDecisionIssue[] = [];
  const underspecified: DiscoveryDecisionIssue[] = [];

  // A question with an empty option list carries no visibility information
  // (synthetic/test questions, or custom-UI steps); only scan steps that
  // actually report which options remain selectable.
  const strandCandidates = strandedQuestions.filter((step) => step.options.length > 0);
  for (const entry of findStrandedQuickStartDefaults(strandCandidates, answers)) {
    stranded.push({
      kind: "stranded",
      questionIds: [entry.questionId],
      title: `Pre-filled ${entry.questionLabel} answer no longer fits`,
      detail: `The quick-start default "${entry.optionLabel}" for ${entry.questionLabel} is no longer selectable after your later answers, but it still sits in the brief and would distort the design.`,
      followUpQuestion: `Is "${entry.optionLabel}" the right ${entry.questionLabel.toLowerCase()} answer, or should it be re-chosen from the currently available options — or should the earlier answer that hid it be revisited?`,
    });
  }
  const addContradiction = (questionIds: string[], title: string, detail: string, followUpQuestion: string) => {
    contradictions.push({ kind: "contradiction", questionIds, title, detail, followUpQuestion });
  };

  if (has(answers, "uc-purpose", "no-uc") && values(answers, "uc-purpose").length > 1) {
    addContradiction(["uc-purpose"], "Conflicting communications scope", "The answers include both no camera or microphone requirements and another UC workflow.", "Is there any conferencing, recording, camera, or microphone workflow, or should this be out of scope?");
  }
  if (has(answers, "uc-microphones", "no-microphones") && values(answers, "uc-microphones").length > 1) {
    addContradiction(["uc-microphones"], "Conflicting microphone scope", "No microphones is selected alongside one or more microphone types.", "Should the room have no microphones, or which microphone types should remain in scope?");
  }
  if (has(answers, "usb", "no-usb") && values(answers, "usb").some((value) => value !== "no-usb")) {
    addContradiction(["usb"], "Conflicting USB scope", "No USB transport is selected alongside a USB host, switching, extension, or bandwidth requirement.", "Is USB genuinely out of scope, or which USB workflow must the system support?");
  }
  if (has(answers, "display-behaviour", "unknown-display-behaviour") && values(answers, "display-behaviour").length > 1) {
    addContradiction(["display-behaviour"], "Unsettled display behaviour", "Unknown display behaviour is selected alongside a concrete routing mode.", "Should the displays mirror, route independently, form a wall, or use multiview?");
  }

  // Display count vs display behaviour mirrors the interview's own option
  // filtering in getVisibleDiscoveryQuestions: for a single display the
  // interview removes independent routing and wall-processor feeds from the
  // behaviour options. A captured set that pairs one-display with either of
  // them is internally impossible (different content per display, or a wall
  // processor feed, both require more than one display), so it must block
  // completion instead of flowing silently into topology and brief text.
  const singleDisplay = has(answers, "displays", "one-display") && !values(answers, "displays").some((value) => value !== "one-display");
  if (singleDisplay && has(answers, "display-behaviour", "independent-routing-per-display")) {
    addContradiction(
      ["displays", "display-behaviour"],
      "Display count contradicts display behaviour",
      "One display is selected but the answers also route different content per display, which needs more than one display.",
      "Is this one display showing a single source, or is it actually a multi-display room?",
    );
  }
  if (singleDisplay && has(answers, "display-behaviour", "video-wall-or-processor-feed")) {
    addContradiction(
      ["displays", "display-behaviour"],
      "Display count contradicts display behaviour",
      "One display is selected alongside a video-wall or LED-processor feed, which needs a wall processor and multiple panels.",
      "Is this a single display, or is a video wall being planned?",
    );
  }
  if (has(answers, "source-connection", "unknown-source-connectors") && values(answers, "source-connection").length > 1) {
    addContradiction(["source-connection"], "Unsettled source profile", "Not yet confirmed is selected alongside a concrete source profile.", "Which source profile should drive the design: fixed sources, user presentation, mixed sources, or network video?");
  }
  if (has(answers, "uc-camera-count", "one-camera") && values(answers, "uc-multi-camera-path").some(Boolean)) {
    addContradiction(["uc-camera-count", "uc-multi-camera-path"], "Camera bridge does not match camera count", "A multi-camera bridge decision is present even though only one camera was requested.", "Is there one camera, or does the room need a multi-camera bridge?");
  }
  if (has(answers, "uc-purpose", "no-uc") && values(answers, "uc-platform").some((value) => !value.startsWith("unknown-"))) {
    addContradiction(["uc-purpose", "uc-platform"], "Platform outside selected scope", "A conferencing platform is captured while UC workflows are explicitly out of scope.", "Should conferencing remain in scope, or should the platform selection be removed?");
  }

  for (const question of questions) {
    if (!unansweredOrUnknown(answers, notes, question)) continue;
    underspecified.push({
      kind: "underspecified",
      questionIds: [question.id],
      title: `${question.shortLabel} needs confirmation`,
      detail: "This answer is missing, explicitly unknown, or still contains an unresolved note.",
      followUpQuestion: question.question.replace(/\?$/, "") + " — what is the closest confirmed answer, and what should Wingman record if it remains uncertain?",
    });
  }

  const issues = [...contradictions, ...stranded, ...underspecified];
  return {
    issues,
    contradictions,
    stranded,
    underspecified,
    canProceedToRecommendation: contradictions.length === 0 && stranded.length === 0 && underspecified.length === 0,
  };
}
