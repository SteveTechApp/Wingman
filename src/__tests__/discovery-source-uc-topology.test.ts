import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateProjectTopologyFromDiscovery } from "../wingman2/lib/projectTopology";

const ucQuestionId = "uc-purpose";
const conferencingValue = "video-conferencing";
const recordingValue = "recording-streaming";
const noUnifiedCommsValue = "no-uc";

function deviceIds(topology: ReturnType<typeof generateProjectTopologyFromDiscovery>): string[] {
  return topology.devices.map((device) => device.id);
}

describe("Discovery source and Unified Communications topology", () => {
  it("treats network video as a network source without inventing a camera or wireless receiver", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        "source-connection": "network-video-sources",
        sources: "two-four-sources",
        displays: "one-display",
      },
    });

    const ids = deviceIds(topology);

    expect(ids).toContain("device-network-video-source");
    expect(ids).toContain("device-local-source-tbc");
    expect(ids).not.toContain("device-camera");
    expect(ids).not.toContain("device-wireless-receiver");
  });

  it("creates a microphone path without a camera for microphones-only", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        "source-connection": "fixed-hdmi-sources",
        [ucQuestionId]: ["microphones-only"],
        displays: "one-display",
      },
    });

    const ids = deviceIds(topology);

    expect(ids).toContain("device-room-microphone");
    expect(ids).not.toContain("device-camera");
    expect(ids).not.toContain("device-recording-capture");
  });

  it("allows conferencing and recording to coexist", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        "source-connection": "laptops-wireless-inputs",
        [ucQuestionId]: [conferencingValue, recordingValue],
        usb: ["byod-byom", "room-host-usb2"],
        displays: "one-display",
      },
    });

    const ids = deviceIds(topology);

    expect(ids).toContain("device-camera");
    expect(ids).toContain("device-room-microphone");
    expect(ids).toContain("device-recording-capture");
  });

  it("lets the no-requirements value override conflicting UC selections", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        "source-connection": "fixed-hdmi-sources",
        [ucQuestionId]: [conferencingValue, noUnifiedCommsValue],
        displays: "one-display",
      },
    });

    const ids = deviceIds(topology);

    expect(ids).not.toContain("device-camera");
    expect(ids).not.toContain("device-room-microphone");
    expect(ids).not.toContain("device-recording-capture");
    expect(ids).not.toContain("device-camera-routing-bridge");
  });

  it("preserves legacy all-source-types projects", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        "source-connection": "all-source-types",
        displays: "one-display",
      },
    });

    const ids = deviceIds(topology);

    expect(ids).toContain("device-wireless-receiver");
    expect(ids).toContain("device-camera");
  });

  it("keeps the UI question mutually exclusive and removes the combined option", () => {
    const discoveryPath = path.resolve(
      process.cwd(),
      "src/wingman2/pages/discovery/discoveryQuestions.ts",
    );
    const source = fs.readFileSync(discoveryPath, "utf8");
    const start = source.indexOf(
      'question: "What camera, microphone or capture workflows are required?"',
    );
    const end = source.indexOf("\n  {", start + 10);
    const questionBlock = source.slice(
      start,
      end > start ? end : source.length,
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(questionBlock).toContain("no-uc");
    expect(questionBlock).toContain("unknown-uc");
    expect(questionBlock).not.toContain("Conferencing and recording");
  });

  it("qualifies both signal directions when conferencing may integrate with a Teams Room", () => {
    const discoveryPath = path.resolve(
      process.cwd(),
      "src/wingman2/pages/discovery/discoveryQuestions.ts",
    );
    const source = fs.readFileSync(discoveryPath, "utf8");
    const start = source.indexOf('id: "mtr-av-integration"');
    const end = source.indexOf("\n  {", start + 10);
    const questionBlock = source.slice(start, end > start ? end : source.length);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(questionBlock).toContain("mtr-bidirectional-av");
    expect(questionBlock).toContain("av-feed-to-mtr-only");
    expect(questionBlock).toContain("mtr-feed-to-av-only");
    expect(questionBlock).toContain("AV-system feed into the MTR");
    expect(questionBlock).toContain("MTR output back into the AV system");
  });

  it("builds the governed NDI multi-camera bridge and main display decoder path", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        [ucQuestionId]: [conferencingValue],
        "uc-camera-count": "three-four-cameras",
        "uc-multi-camera-path": "multi-camera-ndi",
        displays: "one-display",
      },
    });

    expect(topology.devices).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "device-camera", name: "CAM-210-NDI-PTZ camera", quantity: 4 }),
      expect.objectContaining({ id: "device-camera-routing-bridge", name: "NHD-128-NDI-TRX NDI / NetworkHD bridge" }),
      expect.objectContaining({ id: "device-ndi-main-display-decoder", name: "NHD-150-RX main display decoder" }),
    ]));
  });

  it("builds the governed non-NDI multi-camera bridge path", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        [ucQuestionId]: [conferencingValue],
        "uc-camera-count": "two-cameras",
        "uc-multi-camera-path": "multi-camera-non-ndi",
        displays: "one-display",
      },
    });

    expect(topology.devices).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "device-camera", name: "CAM-420-PTZ camera", quantity: 2 }),
      expect.objectContaining({ id: "device-camera-routing-bridge", name: "CAM-0402-BRG multi-camera bridge" }),
    ]));
  });
});
