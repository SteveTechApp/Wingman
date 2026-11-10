// Discovery question definitions, application-specific question sets, and the
// per-step guidance/strategy. Extracted verbatim from DiscoveryPage.tsx so the
// question data and selection logic live outside the React component.
//
// Guard note: check-discovery-topology, workflow-integration-check and
// production-readiness-check assert on the question ids and on
// baseQuestionStrategyByStep / getQuestionStrategy, which now live in this file.

import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";
import { discoveryAudioQuestions } from "./discoveryAudioQuestions";import {
  avoipProfileQuestion,
  baseDiscoveryQuestions,
  canonicalDiscoveryQuestions,
  operationalWorkflowQuestions,
} from "./discoveryQuestionCatalog";
export { baseDiscoveryQuestions, canonicalDiscoveryQuestions } from "./discoveryQuestionCatalog";
import { discoveryHasAudio } from "../../lib/discoveryAudioDesign";



const fullQuestionOptions = new Map<string, ReadonlyArray<{ value: string; label: string }>>();
const fullQuestionShortLabels = new Map<string, string>();
for (const questionObject of canonicalDiscoveryQuestions) {
  fullQuestionOptions.set(questionObject.id, questionObject.options);
  fullQuestionShortLabels.set(questionObject.id, questionObject.shortLabel);
}

export function getFullDiscoveryOptions(questionId: string): ReadonlyArray<{ value: string; label: string }> {
  return fullQuestionOptions.get(questionId) ?? [];
}

export function getDiscoveryQuestionLabel(questionId: string): string {
  return fullQuestionShortLabels.get(questionId) ?? questionId;
}

function insertAfter(questions: DiscoveryQuestion[], afterId: string, additions: DiscoveryQuestion[]) {
  const index = questions.findIndex((step) => step.id === afterId);
  if (index < 0) return questions;
  questions.splice(index + 1, 0, ...additions);
  return questions;
}

function getApplicationDiscoveryQuestions(selectedApplication: string): DiscoveryQuestion[] {
  const questions = [...baseDiscoveryQuestions];
  const byId = (id: string) => operationalWorkflowQuestions.find((step) => step.id === id)!;
  insertAfter(questions, "source-connection", [byId("source-device-workflows"), byId("wireless-presentation-operation")]);
  insertAfter(questions, "display-behaviour", [byId("multiview-destination"), byId("multiview-operation")]);
  insertAfter(questions, "uc-microphones", [byId("uc-microphone-count"), byId("uc-audio-processing")]);
  insertAfter(questions, "audio", discoveryAudioQuestions);

  if (selectedApplication === "video-wall") {
    insertAfter(questions, "scale", [byId("video-wall-technology"), byId("video-wall-purpose")]);
  }

  if (selectedApplication !== "av-over-ip") return questions;

  // Insert directly after "signal-standard" so it stays grouped inside the
  // "Sources & displays" phase instead of trailing the whole question set.
  const insertAfterIndex = questions.findIndex((step) => step.id === "signal-standard");
  const withProfile = [...questions];
  withProfile.splice(insertAfterIndex + 1, 0, avoipProfileQuestion);
  return withProfile;
}

export function getVisibleDiscoveryQuestions(
  selectedApplication: string,
  answers: DiscoveryAnswers = {},
): DiscoveryQuestion[] {
  const withApplicationQuestions = getApplicationDiscoveryQuestions(selectedApplication);
  const ucPurposeValue = Array.isArray(answers["uc-purpose"])
    ? answers["uc-purpose"][0] ?? ""
    : String(answers["uc-purpose"] ?? "");
  const microphoneValues = Array.isArray(answers["uc-microphones"])
    ? answers["uc-microphones"]
    : [String(answers["uc-microphones"] ?? "")].filter(Boolean);
  const ucPurposeValues = Array.isArray(answers["uc-purpose"])
    ? answers["uc-purpose"]
    : [String(answers["uc-purpose"] ?? "")].filter(Boolean);
  const ucPlatformValues = Array.isArray(answers["uc-platform"])
    ? answers["uc-platform"]
    : [String(answers["uc-platform"] ?? "")].filter(Boolean);
  const cameraValues = Array.isArray(answers["uc-camera"])
    ? answers["uc-camera"]
    : [String(answers["uc-camera"] ?? "")].filter(Boolean);
  const cameraCount = Array.isArray(answers["uc-camera-count"])
    ? answers["uc-camera-count"][0] ?? ""
    : String(answers["uc-camera-count"] ?? "");
  const displayCount = Array.isArray(answers.displays)
    ? answers.displays[0] ?? ""
    : String(answers.displays ?? "");
  const primaryDisplay = Array.isArray(answers["primary-display"])
    ? answers["primary-display"][0] ?? ""
    : String(answers["primary-display"] ?? "");
  const repeaterCount = Array.isArray(answers["repeater-displays"])
    ? answers["repeater-displays"][0] ?? ""
    : String(answers["repeater-displays"] ?? "");
  const hasCameraWorkflow = ucPurposeValues.some((value) =>
    ["video-conferencing", "recording-streaming", "camera-distribution-only"].includes(value),
  );
  const hasMultipleCameras = ["two-cameras", "three-four-cameras", "five-plus-cameras"].includes(cameraCount);
  const audioByOthers = (Array.isArray(answers.audio) ? answers.audio : [String(answers.audio ?? "")]).includes("audio-by-others");

  const detailedUcSteps = new Set([
    "uc-platform",
    "uc-camera",
    "uc-camera-routing",
    "uc-microphones",
    "uc-microphone-connection",
    "uc-microphone-count",
    "uc-audio-processing",
    "usb",
  ]);

  const sourceProfileValues = Array.isArray(answers["source-connection"]) ? answers["source-connection"] : [String(answers["source-connection"] ?? "")];
  const sourceDeviceValues = Array.isArray(answers["source-device-workflows"]) ? answers["source-device-workflows"] : [String(answers["source-device-workflows"] ?? "")];
  const displayBehaviourValues = Array.isArray(answers["display-behaviour"]) ? answers["display-behaviour"] : [String(answers["display-behaviour"] ?? "")];
  const wallPurpose = Array.isArray(answers["video-wall-purpose"]) ? answers["video-wall-purpose"][0] : answers["video-wall-purpose"];
  const multiviewRequired = wallPurpose === "multi-source-canvas" || displayBehaviourValues.includes("multiview-on-one-output") || answers["avoip-profile"] === "multiview-avoip";
  const wirelessRelevant = sourceProfileValues.some((value) => ["laptops-wireless-inputs", "mixed-hdmi-usbc", "network-video-sources"].includes(value)) || sourceDeviceValues.includes("wireless-casting-source");
  const networkPathRelevant = selectedApplication === "av-over-ip"
    || sourceProfileValues.includes("network-video-sources")
    || Boolean(answers["avoip-profile"]);

  return withApplicationQuestions.filter((step) => {
    if (discoveryAudioQuestions.some((question) => question.id === step.id) && !discoveryHasAudio(answers)) return false;
    if (audioByOthers && ["audio-zones", "audio-programme", "room-acoustics", "uc-microphones", "uc-microphone-connection", "uc-microphone-count", "uc-audio-processing"].includes(step.id)) return false;
    if (step.id === "network-path" && selectedApplication !== "av-over-ip" && !networkPathRelevant && !["multi-room", "building-wide"].includes(String(answers.scale ?? ""))) return false;
    if (selectedApplication === "video-wall" && [
      "displays", "uc-purpose", "uc-platform", "mtr-av-integration", "uc-camera",
      "uc-camera-count", "uc-multi-camera-path", "uc-camera-routing", "uc-microphones",
      "uc-microphone-connection", "uc-microphone-count", "uc-audio-processing", "usb",
    ].includes(step.id)) return false;
    if (selectedApplication === "video-wall" && step.id === "display-behaviour") return false;
    if (step.id === "wireless-presentation-operation" && !wirelessRelevant) return false;
    if (["multiview-destination", "multiview-operation"].includes(step.id) && !multiviewRequired) return false;
    if (!ucPurposeValue || ucPurposeValue === "no-uc") {
      return !detailedUcSteps.has(step.id);
    }

    if (
      ucPurposeValue === "camera-distribution-only" &&
      ["uc-platform", "uc-microphones", "uc-microphone-connection", "usb"].includes(step.id)
    ) {
      return false;
    }

    if (
      step.id === "uc-microphone-connection" &&
      microphoneValues.includes("no-microphones")
    ) {
      return false;
    }

    if (["uc-microphone-count", "uc-audio-processing"].includes(step.id) && microphoneValues.includes("no-microphones")) return false;

    if (step.id === "mtr-av-integration" && !ucPlatformValues.includes("microsoft-teams-room")) return false;

    if (["uc-camera", "uc-camera-count", "uc-camera-routing"].includes(step.id) && !hasCameraWorkflow) return false;

    if (step.id === "uc-multi-camera-path" && (!hasCameraWorkflow || !hasMultipleCameras)) return false;

    return true;
  }).map((step) => {
    let options = step.options;
    const knownNonWallPrimary = ["single-large-flat-panel", "dual-large-flat-panels", "three-large-flat-panels", "single-projector", "dual-projectors"].includes(primaryDisplay);

    if (audioByOthers && step.id === "audio-route") {
      options = step.options.filter((option) => option.value.startsWith("switcher-feed-"));
      return {
        ...step,
        question: "What audio feed should the video switching provide to the separate audio system?",
        prompt: "Audio design is by others. Confirm only the feed the video system must hand over; add the receiving location or interface in the optional note if known.",
        why: "This defines the video system's audio output while leaving the separate audio system with its responsible designer.",
        selectionMode: "single",
        exclusiveValues: ["switcher-feed-unknown"],
        options,
      };
    }

    // These four handoff choices belong only to the audio-by-others branch.
    // Mixing them into the normal extraction/destination question makes the
    // in-scope path look like a separate-system handoff and offers duplicate
    // ways to answer the same audio route.
    if (step.id === "audio-route") {
      options = step.options.filter((option) => !option.value.startsWith("switcher-feed-"));
    }

    if (step.id === "display-behaviour") {
      if (displayCount === "one-display") options = options.filter((option) => option.value !== "independent-routing-per-display");
      if (knownNonWallPrimary) options = options.filter((option) => option.value !== "video-wall-or-processor-feed");
    }

    if (step.id === "display-behaviour" && (!repeaterCount || repeaterCount === "no-repeater-displays")) {
      options = options.filter((option) => !["overflow-viewing", "room-wide-visibility"].includes(option.value));
    }

    if (step.id === "uc-multi-camera-path") {
      const hasNdi = cameraValues.includes("ndi-network-camera");
      const hasNonNdi = cameraValues.some((value) => [
        "fixed-usb-camera",
        "usb-ptz-camera",
        "hdmi-ptz-camera",
        "other-camera",
      ].includes(value));

      if (hasNdi && !hasNonNdi) {
        options = options.filter((option) => option.value !== "multi-camera-non-ndi");
      } else if (hasNonNdi && !hasNdi) {
        options = options.filter((option) => option.value !== "multi-camera-ndi");
      }
    }

    return options === step.options ? step : { ...step, options };
  });
}

export type DiscoveryRouteInsight = {
  label: string;
  summary: string;
  decisions: string[];
};

type ApplicationSpecificDiscoveryQuestionGuidance = {
  likelyDirection: string;
  askNext: string;
  checkBeforeProduct: string[];
};

const applicationSpecificDiscoveryQuestionGuidance: Record<string, ApplicationSpecificDiscoveryQuestionGuidance> = {
  "meeting-room": {
    likelyDirection: "Presentation switcher, UC/BYOD workflow, USB ownership and room audio need checking before product selection.",
    askNext: "Will users bring their own laptop for Teams/Zoom, or is there a fixed room PC or UC appliance?",
    checkBeforeProduct: [
      "USB camera and speakerphone ownership",
      "USB-C, HDMI and wireless input needs",
      "Single display, dual display or confidence display behaviour",
    ],
  },
  classroom: {
    likelyDirection: "Lectern switching, display/projector transport, teacher control and audio path should be defined first.",
    askNext: "Where are the teacher inputs located, and does the room need a projector, display, confidence monitor or capture output?",
    checkBeforeProduct: [
      "Lectern source count",
      "Projector or display distance",
      "Room audio, microphone and control needs",
    ],
  },
  hospitality: {
    likelyDirection: "Matrix or NetworkHD direction depends on number of displays, source locations, staff control and expansion need.",
    askNext: "How many TVs/zones need different content, and who needs to control them day-to-day?",
    checkBeforeProduct: [
      "TV/output count",
      "Sky/media/signage source count",
      "Staff control simplicity",
      "Contained matrix vs. an expandable networked system",
    ],
  },
  "video-wall": {
    likelyDirection: "Clarify LCD vs LED, full-canvas vs multiview vs signage before choosing a networked system or a dedicated wall processor.",
    askNext: "Is the wall showing one full image, different content per screen, signage presets, or multiple sources at the same time?",
    checkBeforeProduct: [
      "LCD wall or LED processor feed",
      "Wall layout",
      "Full canvas, per-display routing or multiview",
      "Dedicated processor vs. networked-system trade-off",
    ],
  },
  "av-over-ip": {
    likelyDirection: "Use one extra question to separate the NetworkHD 100, 500, and 600 product families before Finder recommends one.",
    askNext: "Will IT allow this to run on the customer's existing network, or should we plan for a separate dedicated network while we confirm the performance level needed?",
    checkBeforeProduct: [
      "Network ownership",
      "Standard vs. highest-performance network requirement",
      "Cost vs. speed-of-response priority",
      "Multiview requirement",
      "Encoder and decoder count",
      "Device connections, room-to-room sound, and control requirements",
      "Needs one system controller",
    ],
  },
  "not-sure": {
    likelyDirection: "Keep the conversation application-led. Capture customer wording and identify video, USB, audio, control and distance paths.",
    askNext: "What is the customer trying to achieve in plain terms, and what devices need to connect to what displays?",
    checkBeforeProduct: [
      "Application type",
      "Source and display count",
      "USB/conferencing need",
      "Audio and control need",
      "Cable distance or network availability",
    ],
  },
};

// Readiness-required application-specific discovery question guidance.
// production-readiness-check.mjs verifies baseQuestionStrategyByStep and getQuestionStrategy are present.
const baseQuestionStrategyByStep: Record<string, ApplicationSpecificDiscoveryQuestionGuidance> = {
  opportunity: {
    likelyDirection: "Start with the customer application before choosing a product family.",
    askNext: "What is the customer trying to achieve, and what type of space or system is this?",
    checkBeforeProduct: [
      "Application type",
      "Customer wording",
      "Likely room or system category",
    ],
  },
  scale: {
    likelyDirection: "Scale helps decide between a simple local switcher, a bigger matrix switcher, a signal booster/extender, or a networked system.",
    askNext: "Is this one room, several rooms, or a wider building/campus requirement?",
    checkBeforeProduct: [
      "Room count",
      "Approximate distance",
      "Local rack or distributed locations",
    ],
  },
  sources: {
    likelyDirection: "Source quantity and location drive input count, encoder count and switching method.",
    askNext: "What needs to connect: laptops, PCs, signage players, media players, cameras or wireless devices?",
    checkBeforeProduct: [
      "Source count",
      "Source type",
      "Source location",
    ],
  },
  "source-connection": {
    likelyDirection: "Source connector type decides whether the next conversation is HDMI-only, USB-C, wireless input, NDI, or a mixed workflow.",
    askNext: "Are the sources fixed HDMI devices, USB-C laptops, wireless inputs, or cameras and network streams?",
    checkBeforeProduct: [
      "HDMI, USB-C, wireless or network-video sources",
      "Fixed devices versus user-driven inputs",
      "Any NDI, PTZ or camera workflow",
    ],
  },
  "primary-display": {
    likelyDirection: "Primary display technology and arrangement determine the screen, projection or wall-processing approach.",
    askNext: "Is the main viewing surface a flat panel, projector, LCD video wall or LED video wall?",
    checkBeforeProduct: ["Primary display type and count", "Projection blend or separate-screen behaviour", "Video wall processor feed"],
  },
  displays: {
    likelyDirection: "Total feed endpoint count is one of the main dividers between switcher, matrix and networked-system design.",
    askNext: "How many video feeds are needed across primary displays and repeaters?",
    checkBeforeProduct: [
      "Total output/feed endpoint count",
      "Independent versus mirrored outputs",
      "Video wall or LED processor requirement",
    ],
  },
  "repeater-displays": {
    likelyDirection: "Repeater screens add outputs and routes beyond the room's primary viewing surface.",
    askNext: "How many extra screens serve overflow seating or improve sightlines around the room?",
    checkBeforeProduct: ["Repeater screen quantity", "Overflow and viewing coverage", "Additional signal routes"],
  },
  "display-behaviour": {
    likelyDirection: "Display behaviour separates mirrored distribution, routed outputs, multiview, and wall-processing conversations.",
    askNext: "Do the displays all show the same source, route independently, feed a wall processor, or need several sources on one output?",
    checkBeforeProduct: [
      "Mirrored versus independent routing",
      "Wall processor or video wall behaviour",
      "Multiview requirement",
    ],
  },
  "signal-standard": {
    likelyDirection: "Signal standard makes resolution, HDR, HDCP, and EDID compatibility visible before a product is named.",
    askNext: "Is the project standard 1080p, standard 4K60, HDR/HDCP-sensitive 4K, or a mixed EDID-risk environment?",
    checkBeforeProduct: [
      "Resolution",
      "HDR and HDCP requirement",
      "EDID or mixed-display compatibility risk",
    ],
  },
  usb: {
    likelyDirection: "USB and conferencing requirements define host ownership, peripheral location and whether USB 2.0 or USB 3.x transport is required.",
    askNext: "Which device owns the USB session, which peripherals are required, where are they located, and is USB 2.0 or USB 3.x bandwidth needed?",
    checkBeforeProduct: [
      "USB host ownership",
      "Camera, microphone, speakerphone, touch or other peripherals",
      "Peripheral location",
      "BYOD, BYOM, room PC or UC appliance workflow",
      "USB 2.0 versus USB 3.x bandwidth",
    ],
  },
  audio: {
    likelyDirection: "Audio requirements affect product dependencies, amplifier needs and conferencing design.",
    askNext: "Where should sound be heard, and are microphones or conferencing audio required?",
    checkBeforeProduct: [
      "Display audio versus room audio",
      "Microphone requirement",
      "Amplifier requirement, or whether sound needs to reach other rooms",
    ],
  },
  "locations-connections": {
    likelyDirection: "Device locations and connection paths determine whether native HDMI or USB remains practical, or whether HDBaseT, fibre, USB extension or AV-over-IP is required.",
    askNext: "Where is each primary device, what does it connect to, which services cross that path, and is the route length estimated, confirmed or unknown?",
    checkBeforeProduct: [
      "Known source, switching, network and destination devices",
      "Room, rack, ceiling, wall or building location for each device",
      "HDMI, USB-C, HDBaseT, fibre, IP, USB, audio and control paths",
      "Estimated versus confirmed installed cable lengths",
    ],
  },
  control: {
    likelyDirection: "Control defines whether the system is practical for the people who will operate it.",
    askNext: "Who will operate the system day-to-day, and how simple does that control need to be?",
    checkBeforeProduct: [
      "User control method",
      "Touch panel or third-party control",
      "Staff usability requirement",
    ],
  },
  "avoip-profile": {
    likelyDirection: "This choice shapes whether Wingman steers toward the NetworkHD 100, 500, or 600 family, and whether showing several sources on one screen must be part of the conversation.",
    askNext: "Is the driver cost, better quality and device connections, the best possible zero-delay performance, or showing several sources on one screen?",
    checkBeforeProduct: [
      "Cost versus speed-of-response priority",
      "Standard versus highest-performance network availability",
      "USB and audio integration need",
      "Multiview requirement",
    ],
  },
};

export function getQuestionStrategy(stepId: string, selectedApplication: string): ApplicationSpecificDiscoveryQuestionGuidance {
  const baseStrategy = baseQuestionStrategyByStep[stepId] ?? baseQuestionStrategyByStep.opportunity;
  const applicationStrategy = applicationSpecificDiscoveryQuestionGuidance[selectedApplication];

  if (!applicationStrategy) {
    return baseStrategy;
  }

  if (stepId === "opportunity") {
    return applicationStrategy;
  }

  if (stepId === "avoip-profile" && selectedApplication === "av-over-ip") {
    return {
      likelyDirection:
        "Use this single step to separate the standard (NetworkHD 100), premium (NetworkHD 500), and highest-performance (NetworkHD 600) conversations, while keeping the several-sources-on-one-screen option visible.",
      askNext:
        "Is the priority cost, premium quality and device connections, or true top-end zero-delay performance — and does the customer need several sources shown on one screen?",
      checkBeforeProduct: [
        "Standard, most economical path",
        "Premium quality, stronger device connections, or room-to-room sound path",
        "Highest-performance, zero-delay path",
        "Multiview or composed-output requirement",
      ],
    };
  }

  return baseStrategy;
}
