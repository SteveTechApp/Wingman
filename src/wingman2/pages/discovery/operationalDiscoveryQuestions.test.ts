import { describe, expect, it } from "vitest";
import { generateProjectTopologyFromDiscovery } from "../../lib/projectTopology";
import { getQuestionView } from "./discoveryAnswerUtils";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";

const ids = (answers: Record<string, string | string[]>, application = "meeting-room") =>
  getVisibleDiscoveryQuestions(application, answers).map((question) => question.id);

describe("operational discovery branches", () => {
  it("asks how application-specific source devices are used and prioritises likely devices", () => {
    const question = getVisibleDiscoveryQuestions("classroom").find((step) => step.id === "source-device-workflows")!;
    const view = getQuestionView(question, "classroom");
    expect(view.options[0].value).toBe("teaching-visualisers");
    expect(view.options.map((option) => option.value)).toEqual(expect.arrayContaining(["wireless-casting-source", "cameras-production", "specialist-simulation-medical"]));
  });

  it("shows wireless operation only for a presentation/casting workflow", () => {
    expect(ids({ "source-connection": "fixed-hdmi-sources" })).not.toContain("wireless-presentation-operation");
    expect(ids({ "source-connection": "mixed-hdmi-usbc" })).toContain("wireless-presentation-operation");
    expect(ids({ "source-connection": "fixed-hdmi-sources", "source-device-workflows": ["wireless-casting-source"] })).toContain("wireless-presentation-operation");
  });

  it("asks destination and operating questions when multiview is required", () => {
    const visible = ids({ "display-behaviour": ["multiview-on-one-output"] });
    expect(visible).toEqual(expect.arrayContaining(["multiview-destination", "multiview-operation"]));
    expect(ids({ "display-behaviour": ["same-content-all-displays"] })).not.toContain("multiview-destination");
  });

  it("uses a shortened, wall-specific route for video wall projects", () => {
    const visible = ids({ opportunity: "video-wall" }, "video-wall");
    expect(visible).toEqual(expect.arrayContaining(["video-wall-technology", "video-wall-purpose", "signal-standard", "control", "locations-connections"]));
    expect(visible).not.toEqual(expect.arrayContaining(["displays", "display-behaviour", "uc-purpose", "uc-platform", "usb"]));
    expect(visible).not.toContain("multiview-destination");
  });

  it("only opens detailed multiview discovery when the wall will compose live sources", () => {
    expect(ids({ "video-wall-purpose": "single-canvas" }, "video-wall")).not.toContain("multiview-destination");
    expect(ids({ "video-wall-purpose": "multi-source-canvas" }, "video-wall")).toEqual(expect.arrayContaining([
      "multiview-destination", "multiview-operation",
    ]));
  });

  it("removes impossible display behaviours for a single-display system", () => {
    const displayBehaviour = getVisibleDiscoveryQuestions("meeting-room", {
      displays: "one-display",
    }).find((step) => step.id === "display-behaviour")!;

    expect(displayBehaviour.options.map((option) => option.value)).not.toEqual(expect.arrayContaining([
      "independent-routing-per-display",
      "video-wall-or-processor-feed",
    ]));
    expect(displayBehaviour.options.map((option) => option.value)).toContain("same-content-all-displays");
  });

  it("only asks camera questions when the selected workflow uses cameras", () => {
    const microphoneOnly = ids({ "uc-purpose": ["microphones-only"] });
    expect(microphoneOnly).not.toEqual(expect.arrayContaining([
      "uc-camera",
      "uc-camera-count",
      "uc-camera-routing",
      "uc-multi-camera-path",
    ]));
  });

  it("only asks Teams Room integration after Teams Room is selected", () => {
    expect(ids({
      "uc-purpose": ["video-conferencing"],
      "uc-platform": ["byom-user-laptop"],
    })).not.toContain("mtr-av-integration");

    expect(ids({
      "uc-purpose": ["video-conferencing"],
      "uc-platform": ["microsoft-teams-room"],
    })).toContain("mtr-av-integration");
  });

  it("filters the multi-camera path to the selected camera technology", () => {
    const questions = getVisibleDiscoveryQuestions("meeting-room", {
      "uc-purpose": ["video-conferencing"],
      "uc-camera": ["ndi-network-camera"],
      "uc-camera-count": "three-four-cameras",
    });
    const bridge = questions.find((step) => step.id === "uc-multi-camera-path")!;

    expect(bridge.options.map((option) => option.value)).toContain("multi-camera-ndi");
    expect(bridge.options.map((option) => option.value)).not.toContain("multi-camera-non-ndi");
  });

  it("asks microphone quantity and processing when microphone workflows are active", () => {
    const visible = ids({ "uc-purpose": ["video-conferencing"], "uc-microphones": ["ceiling-microphone-array"] });
    expect(visible).toEqual(expect.arrayContaining(["uc-microphone-count", "uc-audio-processing"]));
    expect(ids({ "uc-purpose": ["video-conferencing"], "uc-microphones": ["no-microphones"] })).not.toContain("uc-audio-processing");
  });

  it("captures microphone interfaces and complete room-audio topology", () => {
    const questions = getVisibleDiscoveryQuestions("meeting-room", {
      "uc-purpose": ["video-conferencing"],
      "uc-microphones": ["ceiling-microphone-array"],
    });
    const microphoneConnections = questions.find((step) => step.id === "uc-microphone-connection")!;
    const roomAudio = questions.find((step) => step.id === "audio")!;
    expect(microphoneConnections.options.map((option) => option.value)).toEqual(expect.arrayContaining([
      "usb-microphone-path", "analogue-microphone-path", "analogue-line-level-path",
      "phantom-powered-microphone", "digital-audio-microphone-path", "dante-microphone-path",
    ]));
    expect(roomAudio.options.map((option) => option.value)).toEqual(expect.arrayContaining([
      "stereo-low-impedance", "multichannel-audio", "distributed-70v-100v",
      "separate-programme-voice", "analogue-audio-override", "digital-audio-interface", "dante-network-audio",
    ]));
  });

  it("prioritises audio choices and wording for the selected application", () => {
    const hospitalityAudio = getQuestionView(
      getVisibleDiscoveryQuestions("hospitality").find((step) => step.id === "audio")!,
      "hospitality",
    );
    const videoWallAudio = getQuestionView(
      getVisibleDiscoveryQuestions("video-wall").find((step) => step.id === "audio")!,
      "video-wall",
    );

    expect(hospitalityAudio.options[0].value).toBe("distributed-70v-100v");
    expect(hospitalityAudio.prompt).toContain("venue zones");
    expect(videoWallAudio.options[0].value).toBe("source-audio-deembed");
    expect(videoWallAudio.prompt).toContain("wall content audio");
    expect(videoWallAudio.options.map((option) => option.value)).toContain("no-room-audio");
  });

  it("creates distinct source devices and a DSP bridge from operational answers", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "classroom",
      answers: {
        "source-connection": "mixed-hdmi-usbc",
        "source-device-workflows": ["teaching-visualisers", "signage-media-players"],
        "uc-purpose": ["video-conferencing", "recording-streaming"],
        "uc-microphones": ["ceiling-microphone-array", "wireless-microphone"],
        "uc-microphone-count": "five-eight-microphone-feeds",
        "uc-microphone-connection": ["phantom-powered-microphone", "dante-microphone-path"],
        "uc-audio-processing": ["dsp-aec-automix", "independent-record-mix", "audio-bridge-usb-dante-analogue"],
      },
      notes: {},
    });
    expect(topology.devices.some((device) => device.name.includes("Lectern / visualiser"))).toBe(true);
    expect(topology.devices.some((device) => device.name.includes("Signage / media player"))).toBe(true);
    expect(topology.devices.find((device) => device.id === "device-room-microphone")?.quantity).toBe(8);
    expect(topology.devices.some((device) => device.id === "device-room-audio-dsp")).toBe(true);
    const microphoneConnection = topology.connections.find((connection) => connection.fromDeviceId === "device-room-microphone" && connection.toDeviceId === "device-room-audio-dsp");
    expect(microphoneConnection?.services).toEqual(expect.arrayContaining(["analogue-audio", "ethernet"]));
    expect(microphoneConnection?.notes).toContain("phantom power");
  });
});
