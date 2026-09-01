// Smart defaults and Quick Start configuration for Discovery workflow.
// Provides pre-filled answers for common room types to reduce friction
// for inexperienced users.

import type { DiscoveryAnswers } from "./discoveryTypes";

export type QuickStartRoomType =
  | "meeting-room-small"
  | "meeting-room-large"
  | "classroom"
  | "lecture-hall"
  | "boardroom"
  | "huddle-room"
  | "training-room"
  | "custom";

export type QuickStartConfig = {
  label: string;
  description: string;
  icon: string;
  defaults: Partial<DiscoveryAnswers>;
  suggestedApplication: string;
  estimatedQuestions: number;
};

// Plain-language labels for common answer values
export const plainLanguageLabels: Record<string, string> = {
  // Application types
  "meeting-room": "Meeting / conference room",
  classroom: "Teaching / classroom",
  hospitality: "Bar / venue / hospitality",
  "video-wall": "Video wall / LED display",
  "av-over-ip": "Multi-room / distributed video",
  "not-sure": "Not sure yet",

  // Scale
  "single-small-room": "One small room",
  "single-large-room": "One large room",
  "multi-room": "Multiple rooms",
  "building-wide": "Building-wide / campus",

  // Sources
  "one-source": "1 source",
  "two-four-sources": "2-4 sources",
  "five-eight-sources": "5-8 sources",

  // Displays
  "one-display": "1 screen",
  "two-displays": "2 screens",
  "three-eight-displays": "3-8 screens",

  // Common UC
  "video-conferencing": "Video calls (Teams/Zoom)",
  "no-uc": "No video calls needed",
  "usb-ptz-camera": "USB camera",
  "fixed-usb-camera": "Fixed USB camera",
  "ceiling-microphone": "Ceiling microphone",
  "table-microphone": "Table microphone",
  "speakerphone": "Speakerphone",
  "no-microphones": "No separate microphone",

  // Signal
  "hdmi-only": "Standard HDMI",
  "premium-4k60": "Premium 4K video",
};

// Smart defaults by room type
export const quickStartConfigs: Record<QuickStartRoomType, QuickStartConfig> = {
  "huddle-room": {
    label: "Huddle room",
    description: "Small collaboration space for 2-4 people with one display",
    icon: "🖥️",
    suggestedApplication: "meeting-room",
    estimatedQuestions: 5,
    defaults: {
      opportunity: "meeting-room",
      scale: "single-small-room",
      sources: "one-source",
      "source-connection": "laptops-wireless-inputs",
      displays: "one-display",
      "display-behaviour": "same-content-all-displays",
      "signal-standard": "1080p-standard-hdmi",
      "uc-purpose": ["video-conferencing"],
      "uc-platform": ["microsoft-teams-room"],
      "uc-camera": ["fixed-usb-camera"],
      "uc-microphones": ["speakerphone"],
      usb: "byod-byom",
      audio: "display-audio",
      control: "simple-auto",
    },
  },
  "meeting-room-small": {
    label: "Small meeting room",
    description: "Standard meeting room for 4-8 people with 1-2 displays",
    icon: "📊",
    suggestedApplication: "meeting-room",
    estimatedQuestions: 6,
    defaults: {
      opportunity: "meeting-room",
      scale: "single-small-room",
      sources: "two-four-sources",
      "source-connection": "mixed-hdmi-usbc",
      displays: "two-displays",
      "display-behaviour": "independent-routing-per-display",
      "signal-standard": "1080p-standard-hdmi",
      "uc-purpose": ["video-conferencing"],
      "uc-platform": ["microsoft-teams-room"],
      "uc-camera": ["usb-ptz-camera"],
      "uc-microphones": ["ceiling-microphone-array"],
      usb: "byod-byom",
      audio: "room-audio",
      control: "touch-panel",
    },
  },
  "meeting-room-large": {
    label: "Large meeting room",
    description: "Boardroom or large conference room for 8-16 people",
    icon: "🏛️",
    suggestedApplication: "meeting-room",
    estimatedQuestions: 7,
    defaults: {
      opportunity: "meeting-room",
      scale: "single-large-room",
      sources: "two-four-sources",
      "source-connection": "mixed-hdmi-usbc",
      displays: "two-displays",
      "display-behaviour": "independent-routing-per-display",
      "signal-standard": "4k60-hdr-hdcp",
      "uc-purpose": ["video-conferencing"],
      "uc-platform": ["microsoft-teams-room"],
      "uc-camera": ["usb-ptz-camera"],
      "uc-microphones": ["ceiling-microphone-array", "table-microphone"],
      usb: "usb-extension-required",
      audio: "room-audio",
      control: "touch-panel",
    },
  },
  boardroom: {
    label: "Executive boardroom",
    description: "Premium boardroom with multiple displays and high-end audio",
    icon: "👔",
    suggestedApplication: "meeting-room",
    estimatedQuestions: 8,
    defaults: {
      opportunity: "meeting-room",
      scale: "single-large-room",
      sources: "five-eight-sources",
      "source-connection": "mixed-hdmi-usbc",
      displays: "three-eight-displays",
      "display-behaviour": "independent-routing-per-display",
      "signal-standard": "4k60-hdr-hdcp",
      "uc-purpose": ["video-conferencing", "recording-streaming"],
      "uc-platform": ["microsoft-teams-room"],
      "uc-camera": ["usb-ptz-camera"],
      "uc-microphones": ["ceiling-microphone-array"],
      usb: "usb-extension-required",
      audio: "room-audio",
      control: "touch-panel",
    },
  },
  classroom: {
    label: "Classroom",
    description: "Teaching space with lectern, projector/display, and room audio",
    icon: "📚",
    suggestedApplication: "classroom",
    estimatedQuestions: 6,
    defaults: {
      opportunity: "classroom",
      scale: "single-large-room",
      sources: "two-four-sources",
      "source-connection": "mixed-hdmi-usbc",
      displays: "one-display",
      "display-behaviour": "same-content-all-displays",
      "signal-standard": "1080p-standard-hdmi",
      usb: "room-pc-uc",
      audio: "room-audio",
      control: "simple-auto",
    },
  },
  "lecture-hall": {
    label: "Lecture hall",
    description: "Large teaching space with confidence display and capture",
    icon: "🎓",
    suggestedApplication: "classroom",
    estimatedQuestions: 7,
    defaults: {
      opportunity: "classroom",
      scale: "single-large-room",
      sources: "five-eight-sources",
      "source-connection": "mixed-hdmi-usbc",
      displays: "two-displays",
      "display-behaviour": "independent-routing-per-display",
      "signal-standard": "4k60-hdr-hdcp",
      usb: "usb-extension-required",
      audio: "room-audio",
      control: "touch-panel",
    },
  },
  "training-room": {
    label: "Training room",
    description: "Multi-purpose training space with flexible setup",
    icon: "📋",
    suggestedApplication: "classroom",
    estimatedQuestions: 6,
    defaults: {
      opportunity: "classroom",
      scale: "single-large-room",
      sources: "two-four-sources",
      "source-connection": "mixed-hdmi-usbc",
      displays: "two-displays",
      "display-behaviour": "same-content-all-displays",
      "signal-standard": "1080p-standard-hdmi",
      usb: "byod-byom",
      audio: "room-audio",
      control: "simple-auto",
    },
  },
  custom: {
    label: "Custom / other",
    description: "Start with full Discovery workflow",
    icon: "⚙️",
    suggestedApplication: "not-sure",
    estimatedQuestions: 15,
    defaults: {},
  },
};

// Get the number of questions that will be shown based on Quick Start selection
export function estimatedQuestionCount(roomType: QuickStartRoomType): number {
  return quickStartConfigs[roomType].estimatedQuestions;
}

// Apply smart defaults to existing answers (don't overwrite user answers)
export function applyRoomTypeSmartDefaults(
  roomType: QuickStartRoomType,
  existingAnswers: DiscoveryAnswers,
): DiscoveryAnswers {
  const defaults = quickStartConfigs[roomType].defaults;
  const merged = { ...existingAnswers };

  for (const [key, value] of Object.entries(defaults)) {
    // Only apply default if user hasn't answered yet
    if (!(key in merged) || merged[key] === "" || merged[key] === undefined) {
      merged[key] = value as string | string[];
    }
  }

  return merged;
}

// Get the next recommended question based on Quick Start selection
export function getNextRecommendedQuestion(
  roomType: QuickStartRoomType,
  currentAnswers: DiscoveryAnswers,
): string | null {
  const defaults = quickStartConfigs[roomType].defaults;
  const questionOrder = [
    "opportunity",
    "scale",
    "sources",
    "source-connection",
    "displays",
    "display-behaviour",
    "signal-standard",
    "uc-purpose",
    "uc-platform",
    "uc-camera",
    "uc-microphones",
    "usb",
    "audio",
    "control",
  ];

  // Find the first unanswered question that has a default
  for (const questionId of questionOrder) {
    if (
      questionId in defaults &&
      (!(questionId in currentAnswers) ||
        currentAnswers[questionId] === "" ||
        currentAnswers[questionId] === undefined)
    ) {
      return questionId;
    }
  }

  return null;
}

// Check if a question should be shown based on Quick Start mode
export function shouldShowInQuickStart(
  questionId: string,
  roomType: QuickStartRoomType,
): boolean {
  const config = quickStartConfigs[roomType];

  // In Quick Start mode, only show questions that are in the defaults
  // or are essential core questions
  const coreQuestions = [
    "opportunity",
    "scale",
    "sources",
    "source-connection",
    "displays",
  ];

  if (coreQuestions.includes(questionId)) return true;
  if (questionId in config.defaults) return true;

  return false;
}

// Get a summary of what the Quick Start has configured
export function getQuickStartSummary(roomType: QuickStartRoomType): string[] {
  const config = quickStartConfigs[roomType];
  const summary: string[] = [];

  if (config.defaults.displays) {
    summary.push(
      `${plainLanguageLabels[config.defaults.displays as string] || config.defaults.displays} display`,
    );
  }

  if (config.defaults["uc-purpose"]) {
    const purposes = Array.isArray(config.defaults["uc-purpose"])
      ? config.defaults["uc-purpose"]
      : [config.defaults["uc-purpose"]];
    if (purposes.includes("video-conferencing")) {
      summary.push("Video conferencing ready");
    }
  }

  if (config.defaults["uc-camera"]) {
    summary.push("Camera configured");
  }

  if (config.defaults["uc-microphones"]) {
    summary.push("Microphone configured");
  }

  return summary;
}
