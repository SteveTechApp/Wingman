import { roomProfiles } from "./roomProfiles";
import { getWalkthroughFlow } from "./walkthroughQuestionFlows";
import { parseCustomerRequest } from "./parser";
import { recommendSolution } from "./recommendationEngine";
import type {
  RoomProfile,
  RoomProfileId,
  WalkthroughAnswerMap,
  WalkthroughInterpretation,
  WalkthroughQuestionDefinition,
  WalkthroughStep
} from "./types";

export function getRoomProfileOptions(): WalkthroughStep {
  return {
    type: "room-profile",
    id: "room-profile",
    label: "What type of space is this?",
    helperText: "Choose the closest match. Wingman will use this to guide more natural follow-up questions.",
    options: roomProfiles.map((p) => p.label)
  };
}

export function getRoomProfileById(id: RoomProfileId): RoomProfile | undefined {
  return roomProfiles.find((p) => p.id === id);
}

export function getRoomProfileByLabel(label: string): RoomProfile | undefined {
  return roomProfiles.find((p) => p.label === label);
}

function answerIncludesAny(answer: string | undefined, values: string[]): boolean {
  if (!answer) return false;
  const normalized = answer.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
}

function isQuestionVisible(
  question: WalkthroughQuestionDefinition,
  answers: WalkthroughAnswerMap
): boolean {
  if (!question.visibilityRules?.length) return true;

  return question.visibilityRules.every((rule) =>
    answerIncludesAny(answers[rule.dependsOnQuestionId], rule.includesAny)
  );
}

export function getWalkthroughQuestionsForProfile(
  profileId: RoomProfileId,
  answers: WalkthroughAnswerMap = {}
): WalkthroughQuestionDefinition[] {
  const flow = getWalkthroughFlow(profileId);
  if (!flow) return [];

  return flow.questions.filter((question) => isQuestionVisible(question, answers));
}

export function getWalkthroughStepsForProfile(
  profileId: RoomProfileId,
  answers: WalkthroughAnswerMap = {}
): WalkthroughStep[] {
  return getWalkthroughQuestionsForProfile(profileId, answers).map((question) => ({
    type: "question",
    id: question.id,
    label: question.label,
    helperText: question.helperText,
    groupId: question.groupId,
    options: question.suggestedAnswers?.map((a) => a.label)
  }));
}

function buildProfileAssumptionText(profileId: RoomProfileId): string {
  const profile = getRoomProfileById(profileId);
  if (!profile) return "";
  return profile.defaultAssumptions.join(". ");
}

function buildQuestionAnswerText(
  questions: WalkthroughQuestionDefinition[],
  answers: WalkthroughAnswerMap
): string {
  return questions
    .map((question) => {
      const answer = answers[question.id]?.trim();
      if (!answer) return "";
      return `${question.label} ${answer}.`;
    })
    .filter(Boolean)
    .join(" ");
}

export function buildWalkthroughNarrative(profileId: RoomProfileId, answers: WalkthroughAnswerMap): string {
  const profile = getRoomProfileById(profileId);
  const visibleQuestions = getWalkthroughQuestionsForProfile(profileId, answers);

  const intro = profile ? `This is a ${profile.label}.` : "Space type not confirmed.";
  const assumptions = buildProfileAssumptionText(profileId);
  const qAndA = buildQuestionAnswerText(visibleQuestions, answers);

  return [intro, assumptions, qAndA].filter(Boolean).join(" ").trim();
}

export function interpretWalkthrough(profileId: RoomProfileId, answers: WalkthroughAnswerMap): WalkthroughInterpretation {
  const combinedNarrative = buildWalkthroughNarrative(profileId, answers);
  const parsed = parseCustomerRequest(combinedNarrative);
  const recommendation = recommendSolution(parsed);

  return {
    combinedNarrative,
    parsed,
    recommendation
  };
}