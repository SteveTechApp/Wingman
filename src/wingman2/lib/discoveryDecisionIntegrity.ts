import type { DiscoveryAnswers, DiscoveryNotes, DiscoveryQuestion } from "../pages/discovery/discoveryTypes";
import { canonicalDiscoveryQuestions } from "../pages/discovery/discoveryQuestions";
import { findStrandedQuickStartDefaults, isUnknownDiscoveryValue, wmDiscoveryAnswerToText, wmDiscoveryNormaliseAnswerList } from "../pages/discovery/discoveryAnswerUtils";
import { findQuickStartApplicationDrift, plainLanguageLabels } from "../pages/discovery/discoveryQuickStart";

export type DiscoveryIssueKind = "contradiction" | "underspecified" | "stranded" | "drift";

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
  drift: DiscoveryDecisionIssue[];
  underspecified: DiscoveryDecisionIssue[];
  canProceedToRecommendation: boolean;
};

/**
 * Which of a question's exclusiveValues a contradiction rule fires on:
 * "declining" exclusives negate the whole scope (no-*), "unsettled"
 * exclusives mark the answer as unconfirmed (unknown-*). Both declare a
 * definitive "this cannot also be concrete" state, so combining either with a
 * concrete value of the same question is contradictory.
 */
export type ExclusiveScope = "declining" | "unsettled";

export type ExclusiveScopeRule = {
  questionId: string;
  scope: ExclusiveScope;
  title: string;
  detail: string;
  followUpQuestion: string;
};

// Data-driven "exclusive option selected alongside other options" rules. Each
// row keys ONLY off the canonical question id; the exclusive VALUES are read
// from that question's own exclusiveValues at evaluate time (see
// exclusiveScopeValues), so a renamed exclusive option flows into the check
// automatically and a removed one is caught by the pin test instead of
// silently disabling the rule.
export const EXCLUSIVE_SCOPE_CONTRADICTIONS: ExclusiveScopeRule[] = [
  {
    questionId: "uc-purpose",
    scope: "declining",
    title: "Conflicting communications scope",
    detail: "The answers include both no camera or microphone requirements and another UC workflow.",
    followUpQuestion: "Is there any conferencing, recording, camera, or microphone workflow, or should this be out of scope?",
  },
  {
    questionId: "uc-microphones",
    scope: "declining",
    title: "Conflicting microphone scope",
    detail: "No microphones is selected alongside one or more microphone types.",
    followUpQuestion: "Should the room have no microphones, or which microphone types should remain in scope?",
  },
  {
    questionId: "usb",
    scope: "declining",
    title: "Conflicting USB scope",
    detail: "No USB transport is selected alongside a USB host, switching, extension, or bandwidth requirement.",
    followUpQuestion: "Is USB genuinely out of scope, or which USB workflow must the system support?",
  },
  {
    questionId: "display-behaviour",
    scope: "unsettled",
    title: "Unsettled display behaviour",
    detail: "Unknown display behaviour is selected alongside a concrete routing mode.",
    followUpQuestion: "Should the displays mirror, route independently, form a wall, or use multiview?",
  },
  {
    questionId: "source-connection",
    scope: "unsettled",
    title: "Unsettled source profile",
    detail: "Not yet confirmed is selected alongside a concrete source profile.",
    followUpQuestion: "Which source profile should drive the design: fixed sources, user presentation, mixed sources, or network video?",
  },
];

const UNCERTAINTY_MARKER_PREFIX = "unknown-";

function isUncertaintyMarker(value: string): boolean {
  return value.startsWith(UNCERTAINTY_MARKER_PREFIX);
}

/**
 * The exclusiveValues of a canonical question that belong to a scope class.
 * Exported so the pin test can assert every rule still has a live trigger and
 * build representative contradiction fixtures from the canonical option set.
 */
export function exclusiveScopeValues(questionId: string, scope: ExclusiveScope): string[] {
  const step = canonicalDiscoveryQuestions.find((question) => question.id === questionId);
  const exclusives = step?.exclusiveValues ?? [];
  return scope === "declining" ? exclusives.filter((value) => !isUncertaintyMarker(value)) : exclusives.filter(isUncertaintyMarker);
}

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
  /**
   * Which value the app applied per question (quick-start seed, template
   * pre-fill, smart default). Decides each stranded entry's ORIGIN: a stored
   * value that still equals the recorded applied default is an untouched
   * quick-start pre-fill, anything else is a rep-typed answer. When omitted
   * the caller has no provenance and every strand reads as quick-start origin
   * (the pre-existing wording).
   */
  appliedDefaults: Partial<DiscoveryAnswers> | null | undefined = null,
  /**
   * Quick-start seed provenance (which application the seed was applied for
   * and the exact answers it wrote). When present, untouched seeded answers
   * that still follow the PREVIOUS application's profile are drift issues:
   * the same quote-safety class as stranded defaults. Null when the caller
   * has no seed record (legacy drafts, or the room was never quick-started).
   */
  seedProvenance: { application: string; answers: DiscoveryAnswers } | null = null,
): DiscoveryDecisionIntegrity {
  const contradictions: DiscoveryDecisionIssue[] = [];
  const stranded: DiscoveryDecisionIssue[] = [];
  const drift: DiscoveryDecisionIssue[] = [];
  const underspecified: DiscoveryDecisionIssue[] = [];

  // A question with an empty option list carries no visibility information
  // (synthetic/test questions, or custom-UI steps); only scan steps that
  // actually report which options remain selectable.
  const strandCandidates = strandedQuestions.filter((step) => step.options.length > 0);
  for (const entry of findStrandedQuickStartDefaults(strandCandidates, answers, appliedDefaults)) {
    // Origin-aware copy: an untouched quick-start pre-fill is a leftover
    // default; a rep-typed answer is the rep's own choice that merely no
    // longer fits. Both block quote safety, but the wording must not claim a
    // rep-typed answer was a quick-start default.
    const isQuickStart = entry.origin === "quick-start";
    stranded.push({
      kind: "stranded",
      questionIds: [entry.questionId],
      title: isQuickStart
        ? `Pre-filled ${entry.questionLabel} answer no longer fits`
        : `${entry.questionLabel} answer no longer fits`,
      detail: isQuickStart
        ? `The quick-start default "${entry.optionLabel}" for ${entry.questionLabel} is no longer selectable after your later answers, but it still sits in the brief and would distort the design.`
        : `The ${entry.questionLabel} answer "${entry.optionLabel}" is no longer selectable after your later answers, but it still sits in the brief and would distort the design.`,
      followUpQuestion: `Is "${entry.optionLabel}" the right ${entry.questionLabel.toLowerCase()} answer, or should it be re-chosen from the currently available options — or should the earlier answer that hid it be revisited?`,
    });
  }
  // Quick-start answers still following a PREVIOUS application's profile (the
  // opportunity answer changed after seeding). Same quote-safety class as
  // stranded defaults: an untouched seed flows into the design as if
  // confirmed, but it reflects an application profile the rep has since left.
  if (seedProvenance) {
    const previousProfile = plainLanguageLabels[seedProvenance.application] ?? seedProvenance.application;
    const currentProfile = plainLanguageLabels[wmDiscoveryAnswerToText(answers.opportunity)] ?? wmDiscoveryAnswerToText(answers.opportunity);
    for (const item of findQuickStartApplicationDrift(seedProvenance, answers, wmDiscoveryAnswerToText(answers.opportunity))) {
      const isOutOfProfile = item.reason === "no-longer-in-profile";
      drift.push({
        kind: "drift",
        questionIds: [item.questionId],
        title: `Pre-filled ${item.questionLabel} answer follows the previous profile`,
        detail: isOutOfProfile
          ? `The quick start pre-filled ${item.questionLabel} as "${item.roomText}" for the ${previousProfile} profile, which the ${currentProfile} profile does not define.`
          : `The quick start pre-filled ${item.questionLabel} as "${item.roomText}" for the ${previousProfile} profile. The ${currentProfile} profile expects "${item.standardText}", so the captured value no longer reflects the confirmed application.`,
        followUpQuestion: `Is "${item.roomText}" still the right ${item.questionLabel.toLowerCase()} answer for a ${currentProfile} space, or should it be re-chosen from the ${currentProfile} profile?`,
      });
    }
  }
  const addContradiction = (questionIds: string[], title: string, detail: string, followUpQuestion: string) => {
    contradictions.push({ kind: "contradiction", questionIds, title, detail, followUpQuestion });
  };

  // Exclusive-scope contradictions, driven by EXCLUSIVE_SCOPE_CONTRADICTIONS
  // and each question's canonical exclusiveValues (see exclusiveScopeValues).
  // Fires when a scope-declaring exclusive value is combined with a concrete
  // (non-exclusive) value of the same question.
  for (const rule of EXCLUSIVE_SCOPE_CONTRADICTIONS) {
    const selected = values(answers, rule.questionId);
    if (selected.length === 0) continue;
    const step = canonicalDiscoveryQuestions.find((question) => question.id === rule.questionId);
    const allExclusives = new Set(step?.exclusiveValues ?? []);
    const triggers = exclusiveScopeValues(rule.questionId, rule.scope);
    const hasTrigger = triggers.some((value) => selected.includes(value));
    const hasConcrete = selected.some((value) => !allExclusives.has(value));
    if (hasTrigger && hasConcrete) {
      addContradiction([rule.questionId], rule.title, rule.detail, rule.followUpQuestion);
    }
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
  if (has(answers, "uc-camera-count", "one-camera") && values(answers, "uc-multi-camera-path").some(Boolean)) {
    addContradiction(["uc-camera-count", "uc-multi-camera-path"], "Camera bridge does not match camera count", "A multi-camera bridge decision is present even though only one camera was requested.", "Is there one camera, or does the room need a multi-camera bridge?");
  }
  const ucOutOfScope = exclusiveScopeValues("uc-purpose", "declining").some((value) => has(answers, "uc-purpose", value));
  if (ucOutOfScope && values(answers, "uc-platform").some((value) => !value.startsWith("unknown-"))) {
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

  const issues = [...contradictions, ...stranded, ...drift, ...underspecified];
  return {
    issues,
    contradictions,
    stranded,
    drift,
    underspecified,
    canProceedToRecommendation:
      contradictions.length === 0 && stranded.length === 0 && drift.length === 0 && underspecified.length === 0,
  };
}
