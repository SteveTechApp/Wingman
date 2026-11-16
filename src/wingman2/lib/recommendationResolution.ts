export type RecommendationCheckResolution = {
  category: string;
  explanation: string;
  /** Governed Discovery questions that can supply the missing requirement. */
  questionIds: string[];
  /** True only when the check can be answered from this room's visible questions. */
  answerInDiscovery: boolean;
};

type ResolutionRule = Omit<RecommendationCheckResolution, "questionIds" | "answerInDiscovery"> & {
  matches: RegExp;
  questionIds: string[];
};

const resolutionRules: ResolutionRule[] = [
  {
    matches: /application type.*source count|application, source count|distance, usb, audio, control and network/i,
    category: "Room workflow",
    explanation: "Clarify the room's purpose and the connected devices, displays and services before matching products.",
    questionIds: ["opportunity", "sources", "primary-display", "displays", "locations-connections", "uc-purpose", "audio", "control", "network-path"],
  },
  {
    matches: /source count|source connector/i,
    category: "Sources",
    explanation: "Confirm how many devices connect and what people bring or use in the room.",
    questionIds: ["sources", "source-connection", "source-device-workflows"],
  },
  {
    matches: /display\/output count|display count|routed output count/i,
    category: "Displays",
    explanation: "Confirm the primary display arrangement, feed count and how the screens should behave.",
    questionIds: ["primary-display", "displays", "repeater-displays", "display-behaviour"],
  },
  {
    matches: /resolution|hdr|hdcp|edid|signal standard/i,
    category: "Picture format",
    explanation: "Choose the picture quality and compatibility requirements the system must support.",
    questionIds: ["signal-standard"],
  },
  {
    matches: /audio.*by others|separate audio system|audio feed|programme audio/i,
    category: "Audio handoff",
    explanation: "Confirm only the video system's audio handoff; the separate audio design remains with its owner.",
    questionIds: ["audio", "audio-route", "audio-zones", "audio-programme"],
  },
  {
    matches: /cable distance|cable run|infrastructure path|installed cable/i,
    category: "Routes and distances",
    explanation: "Record where sources and displays sit and which cable routes need a site measurement.",
    questionIds: ["locations-connections", "network-path"],
  },
  {
    matches: /teaching-room|confidence-display|audio path|control ownership/i,
    category: "Teaching-room workflow",
    explanation: "Confirm the capture, audio, display and control workflows that shape a complete teaching-room system.",
    questionIds: ["uc-purpose", "uc-platform", "usb", "audio", "audio-route", "display-behaviour", "control"],
  },
  {
    matches: /usb host|usb.*peripheral|usb.*transport|usb.*capture/i,
    category: "USB and conferencing",
    explanation: "Confirm who owns the call or USB connection, then which room devices the host must use.",
    questionIds: ["uc-purpose", "uc-platform", "usb", "uc-camera", "uc-microphones"],
  },
  {
    matches: /network availability|managed switch|av vlan|network switching/i,
    category: "AV network",
    explanation: "Confirm whether the existing network can carry AV or a dedicated switch design is needed.",
    questionIds: ["network-path", "source-connection", "avoip-profile"],
  },
  {
    matches: /wall layout|canvas|preset|processor path|video wall/i,
    category: "Video wall behaviour",
    explanation: "Describe the wall's physical type, content layout, source behaviour and operator control.",
    questionIds: ["video-wall-technology", "video-wall-purpose", "multiview-destination", "multiview-operation", "control"],
  },
];

/**
 * Turn a recommendation warning into an action that writes to the question
 * that owns the answer. Unknown warnings intentionally remain follow-up work;
 * free text on this page must never impersonate a confirmed room requirement.
 */
export function resolveRecommendationCheck(
  item: string,
  visibleQuestionIds?: ReadonlySet<string>,
): RecommendationCheckResolution {
  const rule = resolutionRules.find((candidate) => candidate.matches.test(item));
  if (!rule) {
    return {
      category: "Site or technical follow-up",
      explanation: "This needs an installer, pre-sales engineer or product specialist to confirm with evidence.",
      questionIds: [],
      answerInDiscovery: false,
    };
  }

  const questionIds = visibleQuestionIds
    ? rule.questionIds.filter((id) => visibleQuestionIds.has(id))
    : [...rule.questionIds];
  return {
    category: rule.category,
    explanation: rule.explanation,
    questionIds,
    answerInDiscovery: questionIds.length > 0,
  };
}
