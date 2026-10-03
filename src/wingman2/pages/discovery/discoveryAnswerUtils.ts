// Pure, framework-independent helpers for reading and transforming Discovery
// answers, labelling options, and deriving AVoIP/signal hints. Extracted
// verbatim from DiscoveryPage.tsx so the page component becomes an orchestrator
// rather than the owner of this logic. No behaviour change — these functions
// operate only on their arguments.

import type {
  DiscoveryAnswers,
  DiscoveryAnswerValue,
  DiscoveryNotes,
  DiscoveryQuestion,
  DiscoveryQuestionView,
} from "./discoveryTypes";
import { getFullDiscoveryOptions } from "./discoveryQuestions";
import type { DiscoveryConversationItem } from "../../data/projectStore";

// Preferred option ordering applied by getQuestionView so the most likely
// choices surface first for the selected application. Exported so the
// consumer-drift test can pin every listed value to a current canonical
// option - a renamed or removed option value would otherwise silently stop
// the preferred ordering from applying to it (the stale value ranks at 99
// and the option never moves to the front).
export const AUDIO_PREFERRED_OPTION_ORDER: Record<string, string[]> = {
  "meeting-room": ["display-audio", "room-audio", "source-audio-deembed", "dante-network-audio", "no-room-audio"],
  classroom: ["room-audio", "separate-programme-voice", "distributed-70v-100v", "dante-network-audio", "display-audio"],
  hospitality: ["distributed-70v-100v", "separate-programme-voice", "analogue-audio-override", "dante-network-audio", "display-audio"],
  "video-wall": ["source-audio-deembed", "room-audio", "display-audio", "analogue-audio-override", "no-room-audio"],
  "av-over-ip": ["dante-network-audio", "source-audio-deembed", "room-audio", "digital-audio-interface", "no-room-audio"],
};

export const SOURCE_DEVICE_WORKFLOWS_PREFERRED_OPTION_ORDER: Record<string, string[]> = {
  "meeting-room": ["user-laptops", "room-pc-uc-source", "wireless-casting-source", "cameras-production", "signage-media-players"],
  classroom: ["teaching-visualisers", "user-laptops", "room-pc-uc-source", "wireless-casting-source", "cameras-production"],
  hospitality: ["broadcast-tv-feeds", "signage-media-players", "user-laptops", "wireless-casting-source", "network-remote-feeds"],
  "video-wall": ["operational-workstations", "signage-media-players", "broadcast-tv-feeds", "network-remote-feeds", "cameras-production"],
  "av-over-ip": ["network-remote-feeds", "operational-workstations", "signage-media-players", "cameras-production", "user-laptops"],
};

export function getQuestionView(step: DiscoveryQuestion, selectedApplication: string): DiscoveryQuestionView {
  if (step.id === "audio") {
    const preferred = AUDIO_PREFERRED_OPTION_ORDER[selectedApplication] ?? [];
    const rank = new Map(preferred.map((value, index) => [value, index]));
    const options = [...step.options].sort((left, right) => (rank.get(left.value) ?? 99) - (rank.get(right.value) ?? 99));
    const promptByApplication: Record<string, string> = {
      "meeting-room": "Choose how calls, presentations and room programme audio should be heard.",
      classroom: "Choose how teaching audio, programme sound and speech reinforcement should cover the room.",
      hospitality: "Choose how programme audio, venue zones, announcements and local overrides should operate.",
      "video-wall": "Choose whether wall content audio is de-embedded, played locally, routed elsewhere or excluded from scope.",
      "av-over-ip": "Choose how audio should be extracted, routed and distributed across the networked system.",
    };
    return { ...step, prompt: promptByApplication[selectedApplication] ?? step.prompt, options };
  }

  if (step.id !== "source-device-workflows") return step;
  const preferred = SOURCE_DEVICE_WORKFLOWS_PREFERRED_OPTION_ORDER[selectedApplication] ?? [];
  const rank = new Map(preferred.map((value, index) => [value, index]));
  const options = [...step.options].sort((left, right) => (rank.get(left.value) ?? 99) - (rank.get(right.value) ?? 99));
  return {
    ...step,
    prompt: preferred.length
      ? `${step.prompt} The most likely ${selectedApplication.replace(/-/g, " ")} sources are listed first.`
      : step.prompt,
    options,
  };
}

export function getOptionLabel(step: DiscoveryQuestion, value: DiscoveryAnswerValue, selectedApplication = ""): string {
  if (Array.isArray(value)) {
    if (step.selectAllValue && value.includes(step.selectAllValue)) {
      const selectAllOption = getQuestionView(step, selectedApplication).options.find(
        (candidate) => candidate.value === step.selectAllValue,
      );

      if (selectAllOption) {
        return selectAllOption.label;
      }
    }

    return value
      .map((item) => getOptionLabel(step, item, selectedApplication))
      .filter(Boolean)
      .join(", ");
  }

  const option = getQuestionView(step, selectedApplication).options.find((candidate) => candidate.value === value);

  if (option) {
    return option.label;
  }

  return value;
}

export function getHiddenAnswerValues(
  questionId: string,
  visibleOptionValues: ReadonlyArray<string>,
  answer: unknown,
): Array<{ value: string; label: string }> {
  // A stored answer that names a REAL option of this question, but not one of
  // the currently visible options, is trailing state: it was pre-filled (quick
  // start) before a later answer changed what the interview offers. Values that
  // are not options of this question at all are a different class (raw input)
  // and are intentionally not reported here.
  const values = wmDiscoveryNormaliseAnswerList(answer);
  if (values.length === 0) return [];
  const visible = new Set(visibleOptionValues);
  const fullOptions = getFullDiscoveryOptions(questionId);
  const hidden: Array<{ value: string; label: string }> = [];
  for (const value of values) {
    if (visible.has(value)) continue;
    const option = fullOptions.find((candidate) => candidate.value === value);
    if (option) hidden.push({ value: option.value, label: option.label });
  }
  return hidden;
}

export type StrandedQuickStartDefault = {
  questionId: string;
  /** The visible label of the question the default belongs to. */
  questionLabel: string;
  /** The stored quick-start default value, no longer selectable. */
  optionValue: string;
  /** The human label of that default. */
  optionLabel: string;
  /**
   * Where the stored value came from:
   * - "quick-start": the APP applied this value for the question (quick start,
   *   template or smart default) and the rep has not changed it since — an
   *   untouched pre-fill that is safe to clear with the bulk removal action.
   * - "rep-typed": the rep chose/edited this value themselves (or the question
   *   was never app-applied), so it is their own answer, not a leftover
   *   default — bulk removal must not silently discard it.
   */
  origin: "quick-start" | "rep-typed";
};

// Stranded quick-start defaults across the WHOLE answer set: for every
// question the interview currently shows, a stored answer that names a real
// option of that question but not one of its currently visible options was
// pre-filled (quick start / template / smart default) before a later answer
// hid it. This is the set-level version of getHiddenAnswerValues — the data
// the step-level DiscoveryDefaultsConflictAlert and the summary/completion
// surfaces all consume, so the conflict is visible outside the step where it
// was caused.
//
// Each entry also carries the ORIGIN of its stored value: whether it is an
// untouched value the app applied (`appliedDefaults[questionId]` still equals
// the stored answer) or a value the rep chose/edited themselves. The
// distinction keeps the summary/completion copy honest and stops the bulk
// "remove stranded answers" action from silently discarding rep-typed answers.
// When `appliedDefaults` is omitted the caller has no provenance (legacy
// import, quote-safety scan over saved answers) and every entry is reported as
// quick-start origin, matching the pre-existing wording.
export function findStrandedQuickStartDefaults(
  visibleQuestions: ReadonlyArray<DiscoveryQuestion>,
  answers: DiscoveryAnswers,
  appliedDefaults: Partial<DiscoveryAnswers> | null | undefined = null,
): StrandedQuickStartDefault[] {
  const stranded: StrandedQuickStartDefault[] = [];
  for (const step of visibleQuestions) {
    const hidden = getHiddenAnswerValues(
      step.id,
      step.options.map((option) => option.value),
      answers[step.id],
    );
    if (hidden.length === 0) continue;
    const applied = appliedDefaults?.[step.id];
    // Untouched app default: the app recorded a value for this question and
    // the stored answer still equals it (the rep never changed it since).
    const isUntouchedQuickStart =
      applied !== undefined &&
      answerValuesMatch(applied, answers[step.id]);
    // null and undefined BOTH mean "no provenance": the caller cannot tell
    // the value's origin (legacy import, quote-safety scan over saved
    // answers), so it reads as quick-start — the pre-existing wording. Only a
    // real record (even an empty one, where a question was never app-applied)
    // can prove a value is rep-typed.
    const origin: StrandedQuickStartDefault["origin"] =
      appliedDefaults != null && !isUntouchedQuickStart ? "rep-typed" : "quick-start";
    for (const entry of hidden) {
      stranded.push({
        questionId: step.id,
        questionLabel: step.shortLabel || step.question,
        optionValue: entry.value,
        optionLabel: entry.label,
        origin,
      });
    }
  }
  return stranded;
}

function answerValuesMatch(left: string | string[], right: string | string[] | undefined): boolean {
  const normalise = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) return JSON.stringify([...value].sort());
    return String(value ?? "");
  };
  return normalise(left) === normalise(right);
}

// Removes one option value from a question's stored answer. Used by the
// stranded-defaults action so a rep can clear hidden pre-filled values instead
// of having to re-open the step. Returns the same reference when nothing
// changed (no-op for non-matching single values and absent list members).
export function removeDiscoveryAnswerValue(
  answers: DiscoveryAnswers,
  questionId: string,
  value: string,
): DiscoveryAnswers {
  const current = answers[questionId];
  if (Array.isArray(current)) {
    if (!current.includes(value)) return answers;
    return { ...answers, [questionId]: current.filter((item) => item !== value) };
  }
  if (current === value) {
    const next = { ...answers };
    delete next[questionId];
    return next;
  }
  return answers;
}

export function isUnknownDiscoveryValue(value: string): boolean {
  const text = value.trim().toLowerCase();
  return text.includes("unknown") || text.includes("not sure");
}

export function getAvoipSeriesHint(profile: string): string {
  switch (profile) {
    case "networkhd-100":
      return "NetworkHD 100";
    case "networkhd-500":
      return "NetworkHD 500";
    case "networkhd-600":
      return "NetworkHD 600";
    case "multiview-avoip":
      return "Several sources on one screen";
    default:
      return "";
  }
}

export function getAvoipDirection(profile: string, fallback: string): string {
  switch (profile) {
    case "networkhd-100":
      return "NetworkHD 100 direction: the standard, most economical option, where flexible routing matters more than the fastest possible response.";
    case "networkhd-500":
      return "NetworkHD 500 direction: the premium option, where better image quality, a faster response, stronger device connections, or room-to-room sound matter.";
    case "networkhd-600":
      return "NetworkHD 600 direction: the highest-performance, zero-delay option for the most demanding routing environments.";
    case "multiview-avoip":
      return "Several-sources-on-one-screen direction: confirm whether the customer needs multiple sources on one output, then validate whether the correct fit is a 100-series multiview decoder, 500-series multiview processor, or a higher-performance path.";
    default:
      return fallback;
  }
}

export function getAvoipNextQuestion(profile: string, fallback: string): string {
  switch (profile) {
    case "networkhd-100":
      return "Is the standard, most economical route acceptable, and are device connections or premium speed definitely not required?";
    case "networkhd-500":
      return "Does the project need premium quality, a faster response, stronger device connections, or room-to-room sound, and is the standard network validated?";
    case "networkhd-600":
      return "Which higher-performance switch path, cabling, and zero-delay requirement justify a NetworkHD 600 design?";
    case "multiview-avoip":
      return "How many sources must appear on one output, and does the multiview requirement fit the standard or the highest-performance network?";
    default:
      return fallback;
  }
}

export function signalQualityTags(signalStandard: string): string[] {
  const signal = signalStandard.toLowerCase();

  if (signal.includes("hdr") || signal.includes("hdcp")) {
    return ["4K60 HDR", "HDCP-sensitive", "EDID management"];
  }

  if (signal.includes("legacy") || signal.includes("edid")) {
    return ["Mixed legacy sinks", "EDID risk", "Compatibility validation"];
  }

  if (signal.includes("4k60")) {
    return ["4K60"];
  }

  if (signal.includes("1080p")) {
    return ["1080p"];
  }

  return [];
}

// WINGMAN_DISCOVERY_MULTISELECT_RUNTIME_START
export function wmDiscoveryIsMultiSelectStep(
  step: DiscoveryQuestion | undefined,
): boolean {
  return step?.selectionMode === "multiple";
}

export function wmDiscoveryNormaliseAnswerList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }

  return [];
}

export function wmDiscoveryIsExclusiveValue(
  step: DiscoveryQuestion,
  value: string,
): boolean {
  return step.exclusiveValues?.includes(value) ?? false;
}

export function wmDiscoveryToggleMultiSelectAnswer(
  step: DiscoveryQuestion,
  currentValue: unknown,
  nextValue: string,
): string[] {
  const currentList = wmDiscoveryNormaliseAnswerList(currentValue);

  if (step.selectAllValue === nextValue) {
    if (currentList.includes(nextValue)) {
      return [];
    }

    const concreteValues = step.options
      .map((option) => option.value)
      .filter((value) => value !== step.selectAllValue)
      .filter((value) => !wmDiscoveryIsExclusiveValue(step, value));

    return [nextValue, ...concreteValues];
  }

  if (wmDiscoveryIsExclusiveValue(step, nextValue)) {
    if (currentList.length === 1 && currentList[0] === nextValue) {
      return [];
    }

    return [nextValue];
  }

  const compatibleValues = currentList
    .filter((value) => !wmDiscoveryIsExclusiveValue(step, value))
    .filter((value) => value !== step.selectAllValue);

  if (compatibleValues.includes(nextValue)) {
    return compatibleValues.filter((value) => value !== nextValue);
  }

  return [...compatibleValues, nextValue];
}

export function wmDiscoveryHasAnswer(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function wmDiscoveryAnswerToText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
      .join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

export function wmDiscoveryAnswerIncludes(
  value: unknown,
  expectedValue: string,
): boolean {
  if (Array.isArray(value)) {
    return value.includes(expectedValue);
  }

  return value === expectedValue;
}
// WINGMAN_DISCOVERY_MULTISELECT_RUNTIME_END

// The discovery Q&A trail: every captured step records the question asked, the
// closest governed answer, and the customer's own wording. Carried into the
// brief and from there into exported proposals so customers can see the
// conversation behind the design. Works for the standard flow and the guided
// interview alike. `confirmed` records which steps the rep verified with the
// customer — only those rows are presented as settled facts in exports.
export function buildDiscoveryConversation(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswers,
  notes: DiscoveryNotes,
  application = "",
  confirmed: Record<string, boolean> = {},
  confidenceByStep: Record<string, "high" | "matched" | "low"> = {},
  confidenceScoresByStep: Record<string, number> = {},
): DiscoveryConversationItem[] {
  return questions
    .filter(
      (step) => wmDiscoveryHasAnswer(answers[step.id]) || Boolean(notes[step.id]?.trim()),
    )
    .map((step) => ({
      stepId: step.id,
      question: step.question,
      answer: wmDiscoveryHasAnswer(answers[step.id])
        ? getOptionLabel(step, answers[step.id], application)
        : "Captured note only",
      note: notes[step.id]?.trim() ?? "",
      confirmed: confirmed[step.id] === true,
      confidence: confidenceByStep[step.id],
      confidenceScore: confidenceScoresByStep[step.id],
    }));
}

// WINGMAN_DISCOVERY_UNIFIED_COMMS_VISIBILITY_START
export function wmDiscoveryIsUnifiedCommsDetailQuestion(
  step: DiscoveryQuestion,
): boolean {
  if (step.id === "uc-purpose") {
    return false;
  }

  const optionalSection = String(
    (step as DiscoveryQuestion & { section?: string }).section ?? "",
  ).toLowerCase();
  const identity = `${step.id} ${step.shortLabel}`.toLowerCase();

  return (
    optionalSection.includes("unified communications") ||
    /(^|[-_ ])(camera|microphone|capture)([-_ ]|$)/.test(identity) ||
    /^uc[-_]/.test(step.id.toLowerCase())
  );
}

export function wmDiscoveryFilterUnifiedCommsQuestions(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswers,
): DiscoveryQuestion[] {
  const selectedWorkflows = wmDiscoveryNormaliseAnswerList(
    answers["uc-purpose"],
  );

  return questions.filter((step) => {
    if (selectedWorkflows.includes("no-uc")) {
      return !wmDiscoveryIsUnifiedCommsDetailQuestion(step);
    }

    if (step.id === "mtr-av-integration") {
      return selectedWorkflows.includes("video-conferencing");
    }

    if (step.id === "uc-camera-count") {
      return selectedWorkflows.includes("video-conferencing");
    }

    if (step.id === "uc-multi-camera-path") {
      const cameraCount = wmDiscoveryAnswerToText(answers["uc-camera-count"]);
      return selectedWorkflows.includes("video-conferencing") && ["two-cameras", "three-four-cameras", "five-plus-cameras"].includes(cameraCount);
    }

    return true;
  });
}
// WINGMAN_DISCOVERY_UNIFIED_COMMS_VISIBILITY_END

// A hand-off (template, video-wall builder, Sales Helper) can request a
// specific question to land on once its pre-filled answers are applied, so
// e.g. a UC-led enquiry opens straight on "uc-purpose" instead of forcing a
// click through room-scale questions first. Falls back to the first question
// the hand-off didn't already answer, so a fully-populated custom template
// lands on its one real gap instead of question 1.
export function resolveDiscoveryStartIndex(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswers,
  startAtQuestionId?: string,
): number {
  if (startAtQuestionId) {
    const requestedIndex = questions.findIndex((step) => step.id === startAtQuestionId);
    if (requestedIndex >= 0) {
      return requestedIndex;
    }
  }

  const firstUnanswered = questions.findIndex((step) => !wmDiscoveryHasAnswer(answers[step.id]));
  return firstUnanswered >= 0 ? firstUnanswered : Math.max(questions.length - 1, 0);
}
