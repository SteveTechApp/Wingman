import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "../pages/discovery/discoveryTypes";
import { isUnknownDiscoveryValue, wmDiscoveryAnswerToText, wmDiscoveryNormaliseAnswerList } from "../pages/discovery/discoveryAnswerUtils";

export type DiscoveryIssueKind = "contradiction" | "underspecified";

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
): DiscoveryDecisionIntegrity {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const contradictions: DiscoveryDecisionIssue[] = [];
  const underspecified: DiscoveryDecisionIssue[] = [];
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

  const issues = [...contradictions, ...underspecified];
  return { issues, contradictions, underspecified, canProceedToRecommendation: contradictions.length === 0 && underspecified.length === 0 };
}
