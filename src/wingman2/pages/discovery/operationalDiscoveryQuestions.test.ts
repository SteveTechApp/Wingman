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
