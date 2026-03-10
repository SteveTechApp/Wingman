import type { WingmanProjectState } from "@/core/workflow/projectState";

export type AvGuideRecommendation = {
  title: string;
  reason: string;
};

export type AvGuideIntelligence = {
  completenessScore: number;
  missingItems: string[];
  recommendations: AvGuideRecommendation[];
  recommendedNextTool: string;
  recommendedNextToolPath: string;
  summary: string;
};

function txt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function addRecommendation(
  list: AvGuideRecommendation[],
  title: string,
  reason: string
) {
  if (!list.some((x) => x.title === title)) {
    list.push({ title, reason });
  }
}

function scoreCompleteness(state: WingmanProjectState): {
  score: number;
  missing: string[];
} {
  const checks = [
    { ok: txt(state.customer).length > 0, label: "Customer" },
    { ok: txt(state.roomType).length > 0, label: "Room Type" },
    { ok: txt(state.application).length > 0, label: "Application" },
    { ok: num(state.displayCount) > 0, label: "Display Count" },
    { ok: num(state.sourceCount) > 0, label: "Source Count" },
    { ok: num(state.distanceM) > 0, label: "Distance" },
    { ok: txt(state.budgetBand).length > 0, label: "Budget Band" },
    { ok: txt(state.avGuide?.control).length > 0, label: "Control Requirement" },
    { ok: txt(state.avGuide?.usb).length > 0, label: "USB Requirement" },
    { ok: txt(state.avGuide?.audio).length > 0, label: "Audio Requirement" },
  ];

  const complete = checks.filter((x) => x.ok).length;
  const score = Math.round((complete / checks.length) * 100);
  const missing = checks.filter((x) => !x.ok).map((x) => x.label);

  return { score, missing };
}

function deriveRecommendations(state: WingmanProjectState): AvGuideRecommendation[] {
  const list: AvGuideRecommendation[] = [];

  const room = txt(state.roomType).toLowerCase();
  const app = txt(state.application).toLowerCase();
  const displays = num(state.displayCount);
  const sources = num(state.sourceCount);
  const distance = num(state.distanceM);
  const usb = txt(state.avGuide?.usb).toLowerCase();
  const control = txt(state.avGuide?.control).toLowerCase();
  const audio = txt(state.avGuide?.audio).toLowerCase();

  if (
    app.includes("teams") ||
    app.includes("meeting") ||
    app.includes("boardroom") ||
    room.includes("meeting")
  ) {
    addRecommendation(
      list,
      "Apollo",
      "Meeting-room and collaboration-led environments often suit an Apollo-style room hub workflow."
    );
  }

  if (distance >= 15 && distance <= 70) {
    addRecommendation(
      list,
      "HDBaseT",
      "The recorded transport distance suggests HDBaseT may be a strong fit for extension-led room design."
    );
  }

  if (displays >= 3 || sources >= 4) {
    addRecommendation(
      list,
      "AVoIP / NetworkHD",
      "Multiple displays or higher source counts can indicate a distributed AVoIP-style architecture."
    );
  }

  if (
    app.includes("video wall") ||
    room.includes("video wall") ||
    displays >= 4
  ) {
    addRecommendation(
      list,
      "Video Wall",
      "The display count or application suggests a wall-design conversation and display-processing review."
    );
  }

  if (usb.includes("camera") || usb.includes("bring your own") || usb.includes("byod")) {
    addRecommendation(
      list,
      "USB Extension",
      "The USB requirement suggests camera, peripheral, or BYOD extension should be considered early."
    );
  }

  if (audio.includes("dsp") || audio.includes("amplifier") || audio.includes("mix")) {
    addRecommendation(
      list,
      "Audio Integration Review",
      "The audio notes suggest the proposal should clearly identify third-party or integrated audio dependencies."
    );
  }

  if (control.includes("touch") || control.includes("control system")) {
    addRecommendation(
      list,
      "Control Review",
      "The control requirement should be carried into design so system operation is clearly defined."
    );
  }

  if (list.length === 0) {
    addRecommendation(
      list,
      "Core AV Switching",
      "The captured information currently points toward a standard switching and distribution workflow."
    );
  }

  return list;
}

function deriveNextTool(
  state: WingmanProjectState,
  missingItems: string[],
  recommendations: AvGuideRecommendation[]
): { label: string; path: string } {
  if (missingItems.length >= 4) {
    return {
      label: "Stay in AV Guide",
      path: "/app/tools/discovery",
    };
  }

  const titles = recommendations.map((x) => x.title.toLowerCase());

  if (titles.some((x) => x.includes("video wall"))) {
    return {
      label: "VideoWall Designer",
      path: "/app/tools/video-wall",
    };
  }

  if (titles.some((x) => x.includes("apollo")) || titles.some((x) => x.includes("hdbaset")) || titles.some((x) => x.includes("avoip"))) {
    return {
      label: "Room Wizard",
      path: "/app/tools/room-wizard",
    };
  }

  return {
    label: "Product Catalog",
    path: "/app/tools/catalog",
  };
}

function deriveSummary(
  state: WingmanProjectState,
  score: number,
  recommendations: AvGuideRecommendation[],
  nextTool: string
): string {
  const customer = txt(state.customer) || "the client";
  const room = txt(state.roomType) || "the target room";
  const app = txt(state.application) || "the intended application";

  const primary = recommendations[0]?.title ?? "Core AV Switching";

  return `AV Guide is currently ${score}% complete for ${customer}. Based on the recorded room type (${room}), application (${app}), and the current transport and device requirements, the most likely starting solution family is ${primary}. The recommended next step is ${nextTool}.`;
}

export function buildAvGuideIntelligence(
  state: WingmanProjectState
): AvGuideIntelligence {
  const completeness = scoreCompleteness(state);
  const recommendations = deriveRecommendations(state);
  const next = deriveNextTool(state, completeness.missing, recommendations);
  const summary = deriveSummary(state, completeness.score, recommendations, next.label);

  return {
    completenessScore: completeness.score,
    missingItems: completeness.missing,
    recommendations,
    recommendedNextTool: next.label,
    recommendedNextToolPath: next.path,
    summary,
  };
}