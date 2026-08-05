// Pure, framework-independent helpers for reading and transforming Discovery
// answers, labelling options, and deriving AVoIP/signal hints. Extracted
// verbatim from DiscoveryPage.tsx so the page component becomes an orchestrator
// rather than the owner of this logic. No behaviour change — these functions
// operate only on their arguments.

import type {
  DiscoveryAnswers,
  DiscoveryAnswerValue,
  DiscoveryQuestion,
  DiscoveryQuestionView,
} from "./discoveryTypes";

export function getQuestionView(step: DiscoveryQuestion, _selectedApplication: string): DiscoveryQuestionView {
  return step;
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
