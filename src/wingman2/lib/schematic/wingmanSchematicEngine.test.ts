import { describe, expect, it } from "vitest";
import { buildWingmanSchematic } from "./wingmanSchematicEngine";

describe("Wingman native schematic engine", () => {
  it("builds a BYOD meeting-room schematic with video and USB paths", () => {
    const schematic = buildWingmanSchematic({
      title: "Small BYOD meeting room",
      roomType: "meeting-room",
      sources: [{ label: "Laptop USB-C/HDMI input" }, { label: "Wireless presentation" }],
      displays: [{ label: "Room display" }],
      cameras: [{ label: "APO-VX20-UC-V2", sku: "APO-VX20-UC-V2" }],
      products: [
        { sku: "SW-620L-TX-W" },
        { sku: "APO-DG2" },
      ],
      usbRequired: true,
      audioRequired: true,
      controlRequired: false,
      maxSignalDistanceM: 7,
    });

    expect(schematic.nodes.some((node) => node.kind === "switcher" && node.sku === "SW-620L-TX-W")).toBe(true);
    expect(schematic.connections.some((connection) => connection.signal === "video")).toBe(true);
    expect(schematic.connections.some((connection) => connection.signal === "usb")).toBe(true);
    expect(schematic.bomHints.some((hint) => hint.sku === "NHD-CTL-PRO")).toBe(false);
  });

  it("adds NHD-CTL-PRO as a BOM dependency for NetworkHD systems", () => {
    const schematic = buildWingmanSchematic({
      title: "NetworkHD distribution",
      sources: [{ label: "Media player" }],
      displays: [{ label: "Display 1" }, { label: "Display 2" }],
      products: [
        { sku: "NHD-124-TX" },
        { sku: "NHD-150-RX", quantity: 2 },
      ],
      networkAvailable: true,
    });

    expect(schematic.bomHints).toContainEqual({
      sku: "NHD-CTL-PRO",
      reason: "Required controller for NetworkHD AV-over-IP routing and system management.",
      required: true,
    });

    expect(schematic.nodes.some((node) => node.sku === "NHD-CTL-PRO")).toBe(true);
    expect(schematic.connections.some((connection) => connection.transport === "network")).toBe(true);

    // Both displays must be driven by their own decoder, not straight off the
    // (single, unrelated) encoder - a decoder is a single-HDMI-out endpoint.
    const decoderIds = new Set(schematic.nodes.filter((node) => node.kind === "av-over-ip-decoder").map((node) => node.id));
    const displayIds = schematic.nodes.filter((node) => node.kind === "display").map((node) => node.id);
    expect(decoderIds.size).toBe(2);
    for (const displayId of displayIds) {
      const incoming = schematic.connections.find((connection) => connection.to === displayId && connection.signal === "video");
      expect(incoming).toBeDefined();
      expect(decoderIds.has(incoming!.from)).toBe(true);
    }
  });

  it("gives every source its own encoder and every display its own decoder - never shares a single-port endpoint", () => {
    const schematic = buildWingmanSchematic({
      title: "Dual source, dual display AVoIP room",
      sources: [{ label: "Laptop" }, { label: "PTZ camera" }],
      displays: [{ label: "Main display" }, { label: "Confidence monitor" }],
      products: [
        { sku: "NHD-500-TX", quantity: 2 },
        { sku: "NHD-500-RX", quantity: 2 },
      ],
    });

    const encoderIds = schematic.nodes.filter((node) => node.kind === "av-over-ip-encoder").map((node) => node.id);
    const decoderIds = schematic.nodes.filter((node) => node.kind === "av-over-ip-decoder").map((node) => node.id);
    expect(encoderIds).toHaveLength(2);
    expect(decoderIds).toHaveLength(2);

    const sourceIds = schematic.nodes.filter((node) => node.kind === "source").map((node) => node.id);
    const encoderTargets = sourceIds.map((sourceId) =>
      schematic.connections.find((connection) => connection.from === sourceId && connection.signal === "video")?.to,
    );
    // Every source lands on a distinct encoder - no two sources share one.
    expect(new Set(encoderTargets).size).toBe(2);
    expect(encoderTargets.every((target) => target && encoderIds.includes(target))).toBe(true);

    const displayIds = schematic.nodes.filter((node) => node.kind === "display").map((node) => node.id);
    const decoderSources = displayIds.map((displayId) =>
      schematic.connections.find((connection) => connection.to === displayId && connection.signal === "video")?.from,
    );
    expect(new Set(decoderSources).size).toBe(2);
    expect(decoderSources.every((source) => source && decoderIds.includes(source))).toBe(true);

    expect(schematic.warnings.some((warning) => warning.title === "Missing AV-over-IP encoder")).toBe(false);
    expect(schematic.warnings.some((warning) => warning.title === "Missing AV-over-IP decoder")).toBe(false);
  });

  it("blocks with a clear warning instead of silently sharing an encoder when the BOM is short", () => {
    const schematic = buildWingmanSchematic({
      title: "Under-specced AVoIP room",
      sources: [{ label: "Laptop" }, { label: "PTZ camera" }],
      displays: [{ label: "Main display" }],
      products: [
        { sku: "NHD-500-TX" },
        { sku: "NHD-500-RX" },
      ],
    });

    expect(schematic.warnings.some((warning) => warning.severity === "blocker" && warning.title === "Missing AV-over-IP encoder")).toBe(true);

    const encoderIds = schematic.nodes.filter((node) => node.kind === "av-over-ip-encoder").map((node) => node.id);
    const videoConnectionsIntoEncoders = schematic.connections.filter(
      (connection) => connection.signal === "video" && encoderIds.includes(connection.to),
    );
    // Exactly one source got the one available encoder - the second source is
    // reported as missing, never silently wired onto the same encoder.
    expect(videoConnectionsIntoEncoders).toHaveLength(1);
  });

  it("warns when mixed NetworkHD series are present", () => {
    const schematic = buildWingmanSchematic({
      title: "Mixed NetworkHD test",
      sources: [{ label: "Source" }],
      displays: [{ label: "Display" }],
      products: [
        { sku: "NHD-500-TX" },
        { sku: "NHD-600-TRX" },
      ],
    });

    expect(schematic.warnings.some((warning) => warning.title === "NetworkHD series separation required")).toBe(true);
  });

  it("supports a dedicated non-AVoIP video wall processor route", () => {
    const schematic = buildWingmanSchematic({
      title: "LCD video wall",
      sources: [{ label: "Signage player" }, { label: "Sky box HDMI" }],
      displays: [{ label: "Video wall output" }],
      products: [{ sku: "SW-0206-VW" }],
      videoWall: {
        enabled: true,
        displayCount: 6,
        layout: "3x2",
        behaviour: "single-canvas",
      },
    });

    expect(schematic.nodes.some((node) => node.kind === "video-wall-processor" && node.sku === "SW-0206-VW")).toBe(true);
    expect(schematic.bomHints.some((hint) => hint.sku === "NHD-CTL-PRO")).toBe(false);
  });

  it("uses proposal-safe source language when connector evidence is not proven", () => {
    const schematic = buildWingmanSchematic({
      title: "Unconfirmed source route",
      sources: [{ label: "Presenter laptop" }],
      displays: [{ label: "Display" }],
      products: [{ sku: "SW-130-TX" }],
    });

    expect(schematic.connections.some((connection) => connection.label.includes("local source"))).toBe(true);
    expect(schematic.assumptions.some((assumption) => assumption.includes("Transport is shown generically"))).toBe(true);
  });
});