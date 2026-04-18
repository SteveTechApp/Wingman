import {
  buildGuidedProjectAdvice,
  buildSuggestedCableList,
  createEmptyGuidedProjectRecord,
  getVisibleQuestionsForStep,
  type GuidedProjectFamily,
  type GuidedProjectRecord,
  type GuidedProjectStep,
} from "@/features/discovery/guidedProjectEngine";
import type { WingmanProjectState } from "@/core/workflow/projectState";

import type {
  AvRecommendationAccessoryLine,
  AvRecommendationConfidenceLabel,
  AvRecommendationMissingItem,
  AvRecommendationResult,
  AvRecommendationSummarySet,
} from "@/services/av-recommendation/types";

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function lower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toConfidenceLabel(score: number): AvRecommendationConfidenceLabel {
  if (score >= 78) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function baseConfidenceScore(confidence: string): number {
  if (confidence === "High") return 74;
  if (confidence === "Medium") return 56;
  return 38;
}

function toQuestionPrompt(label: string): string {
  const cleaned = label.replace(/\?+$/, "").trim();
  if (!cleaned) return "Add the missing qualification detail.";
  const first = cleaned.charAt(0).toLowerCase();
  return `Confirm ${first}${cleaned.slice(1)}.`;
}

function normalizeContext(input?: Partial<GuidedProjectRecord> | null): GuidedProjectRecord {
  return {
    ...createEmptyGuidedProjectRecord(),
    ...(input ?? {}),
    recommendedFamilies: input?.recommendedFamilies ?? [],
    recommendedNextTool: input?.recommendedNextTool ?? "",
    createdAt: input?.createdAt ?? createEmptyGuidedProjectRecord().createdAt,
  };
}

function computeCompleteness(record: GuidedProjectRecord) {
  let answered = 0;
  let total = 0;
  const missing: string[] = [];
  const missingItems: AvRecommendationMissingItem[] = [];

  ([0, 1, 2, 3] as GuidedProjectStep[]).forEach((step) => {
    const questions = getVisibleQuestionsForStep(record, step);
    total += questions.length;
    questions.forEach((question) => {
      const value = String(record[question.id] ?? "");
      if (hasText(value)) {
        answered += 1;
        return;
      }
      if (missing.length < 6) {
        const prompt = toQuestionPrompt(question.label);
        missing.push(prompt);
        missingItems.push({
          prompt,
          label: question.label,
          step,
          questionId: question.id,
        });
      }
    });
  });

  return {
    answered,
    total,
    pct: total > 0 ? Math.round((answered / total) * 100) : 0,
    missing,
    missingItems,
  };
}

function uniqueLines(values: string[], limit = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const item = value.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }

  return out;
}

function buildAccessoryBom(record: GuidedProjectRecord): AvRecommendationAccessoryLine[] {
  const lines: AvRecommendationAccessoryLine[] = buildSuggestedCableList(record).map((description) => ({
    kind: "cable",
    description,
  }));

  if (hasText(record.usbStandards) || hasText(record.usbNeeds)) {
    lines.push({
      kind: "accessory",
      description: "Include the required USB host / device patch leads and confirm peripheral compatibility.",
    });
  }

  if (lower(record.featureRequirements).includes("wireless") || lower(record.featureRequirements).includes("airplay") || lower(record.featureRequirements).includes("miracast")) {
    lines.push({
      kind: "accessory",
      description: "Confirm whether wireless presentation accessories or guest-presenter dongles should be included.",
    });
  }

  if (hasText(record.networkEnvironment) || lower(record.displayConnectionType).includes("ip") || lower(record.displayConnectionType).includes("stream")) {
    lines.push({
      kind: "dependency",
      description: "Validate managed switch capacity, multicast readiness, and AV VLAN requirements before final BOM lock.",
    });
  }

  if (lower(record.powerPreference).includes("poh")) {
    lines.push({
      kind: "dependency",
      description: "Check PoH power expectations at both ends so local PSU line items are not missed.",
    });
  }

  return lines.slice(0, 6);
}

function joinFamilies(families: GuidedProjectFamily[]): string {
  return families.join(", ");
}

function buildSummaries(result: {
  primaryFamily: GuidedProjectFamily;
  candidateFamilies: GuidedProjectFamily[];
  whyThisAnswer: string[];
  whatsMissing: string[];
  accessoryBom: AvRecommendationAccessoryLine[];
  focusCategory: string;
  workflowSummary: string;
}): AvRecommendationSummarySet {
  const salesperson = [
    `${result.focusCategory} is the lead recommendation right now, with ${result.primaryFamily} as the primary WyreStorm direction.`,
    result.workflowSummary,
    result.whyThisAnswer[0] ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const engineer = [
    `Lead family: ${result.primaryFamily}.`,
    `Supporting families: ${joinFamilies(result.candidateFamilies)}.`,
    result.whyThisAnswer.length > 0 ? `Why: ${result.whyThisAnswer.join(" ")}` : "",
    result.whatsMissing.length > 0 ? `Still needed: ${result.whatsMissing.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const proposal = [
    `Proposed direction: ${result.focusCategory}.`,
    `Primary WyreStorm family: ${result.primaryFamily}.`,
    result.accessoryBom.length > 0
      ? `Suggested add-ons and dependencies: ${result.accessoryBom.map((item) => item.description).join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    salesperson,
    engineer,
    proposal,
  };
}

export function buildAvRecommendationFromDiscovery(
  input?: Partial<GuidedProjectRecord> | null,
): AvRecommendationResult {
  const context = normalizeContext(input);
  const advice = buildGuidedProjectAdvice(context);
  const completeness = computeCompleteness(context);
  const confidenceScore = Math.min(
    96,
    Math.round(baseConfidenceScore(advice.confidence) + completeness.pct * 0.18),
  );
  const confidenceLabel = toConfidenceLabel(confidenceScore);
  const accessoryBom = buildAccessoryBom(context);
  const whyThisAnswer = uniqueLines(advice.reasons.length > 0 ? advice.reasons : [advice.workflowSummary], 4);
  const whatsMissing = uniqueLines(
    completeness.missing.length > 0 ? completeness.missing : advice.nextActions,
    5,
  );
  const risks = uniqueLines(
    [
      ...advice.cues.filter((cue) => lower(cue).includes("not confirmed")),
      ...advice.nextActions,
    ],
    5,
  );

  return {
    source: "discovery",
    context,
    advice,
    primaryFamily: advice.primary,
    candidateFamilies: advice.families,
    confidenceScore,
    confidenceLabel,
    completeness: {
      answered: completeness.answered,
      total: completeness.total,
      pct: completeness.pct,
    },
    whyThisAnswer,
    whatsMissing,
    missingItems: completeness.missingItems.slice(0, 5),
    risks,
    accessoryBom,
    summaries: buildSummaries({
      primaryFamily: advice.primary,
      candidateFamilies: advice.families,
      whyThisAnswer,
      whatsMissing,
      accessoryBom,
      focusCategory: advice.focusCategory,
      workflowSummary: advice.workflowSummary,
    }),
  };
}

export function mapProjectStateToDiscoveryContext(
  state: WingmanProjectState,
): GuidedProjectRecord {
  const base = createEmptyGuidedProjectRecord();
  const roomType = String(state.roomType ?? "").trim();
  const application = String(state.application ?? "").trim();
  const usb = String(state.avGuide?.usb ?? "").trim();
  const audio = String(state.avGuide?.audio ?? "").trim();
  const control = String(state.avGuide?.control ?? "").trim();
  const wallType = String(state.videoWall?.wallType ?? "").trim();
  const displayCount = Number(state.displayCount ?? 0);
  const sourceCount = Number(state.sourceCount ?? 0);
  const distanceM = Number(state.distanceM ?? 0);

  let workflowTrack = "";
  if (wallType || /video wall|videowall/i.test(`${roomType} ${application}`) || displayCount >= 4) {
    workflowTrack = "Build a video wall";
  } else if (/meeting|boardroom|huddle|training|classroom|teams/i.test(`${roomType} ${application}`) || /byod|byom|usb-c/i.test(usb)) {
    workflowTrack = "Switch between devices";
  } else if (sourceCount <= 1 && displayCount > 1) {
    workflowTrack = "Duplicate a signal";
  } else if (distanceM >= 15) {
    workflowTrack = "Extend a signal";
  } else if (sourceCount >= 4 || displayCount >= 3) {
    workflowTrack = "Distribute over network";
  }

  return {
    ...base,
    workflowTrack,
    customerOutcome: application || roomType || workflowTrack,
    applicationType: application || roomType,
    roomName: roomType,
    sourceCount: sourceCount > 0 ? String(sourceCount) : "",
    displayCount: displayCount > 0 ? String(displayCount) : "",
    transportDistanceBand: distanceM > 100 ? "More than 100m" : distanceM > 70 ? "Up to 100m" : distanceM > 40 ? "Up to 70m" : distanceM > 0 ? "Up to 40m" : "",
    cableDistanceM: distanceM > 0 ? String(distanceM) : "",
    usbNeeds: usb,
    audioNeeds: audio,
    controlNeeds: control,
    notes: String(state.notes ?? "").trim(),
  };
}

export function buildAvRecommendationFromProjectState(
  state: WingmanProjectState,
): AvRecommendationResult {
  return buildAvRecommendationFromDiscovery(mapProjectStateToDiscoveryContext(state));
}
