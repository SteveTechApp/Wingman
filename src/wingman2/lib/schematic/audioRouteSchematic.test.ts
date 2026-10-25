import { describe, expect, it } from "vitest";

import type { StoredProject } from "../../data/projectStore";
import { DISCOVERY_AUDIO_DESTINATION_PHRASES, DISCOVERY_AUDIO_EXTRACTION_PHRASES, deriveDiscoveryAudioDesign } from "../discoveryAudioDesign";
import { AUDIO_ROUTE_DESTINATIONS, AUDIO_ROUTE_EXTRACTIONS } from "./audioRouteSchematic";
import { buildSchematicBriefFromProject } from "./projectToSchematicBrief";
import { buildWholeProjectVisualDiagram } from "./wholeProjectVisualDiagram";
import { buildWingmanSchematic } from "./wingmanSchematicEngine";

const timestamp = "2026-10-25T12:00:00.000Z";

function projectWithAudioDesign(answers: Record<string, string | string[]>): StoredProject {
  return {
    id: "boardroom-audio-route",
    name: "Boardroom",
    owner: "Account team",
    stage: "Recommendations",
    status: "alternative",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: timestamp,
    updatedAt: timestamp,
    discoveryBrief: {
      roomModel: { sourceCount: "1 source", displayCount: "1 display", audioDesign: deriveDiscoveryAudioDesign(answers) },
      capturedPercent: 100,
    },
    productSelections: [{ sku: "SW-620L-TX-W", title: "Presentation switcher", quantity: 1 }],
  };
}

describe("programme-audio route in the schematic", () => {
  it("draws the de-embed point and every destination as audio paths", () => {
    const schematic = buildWingmanSchematic({
      title: "Boardroom",
      sources: [{ label: "Lectern laptop" }],
      displays: [{ label: "Room display" }],
      products: [{ sku: "SW-620L-TX-W" }],
      audioRequired: true,
      audioRoute: {
        extraction: "extract-at-switcher",
        destinations: ["route-to-room-amplifier", "route-to-uc-host"],
        summary: "Programme audio is taken from the matrix, switcher or wall processor and delivered to the room amplifier, DSP or loudspeakers and the UC host over USB audio.",
      },
    });

    const switching = schematic.nodes.find((node) => node.kind === "switcher")!;
    const amplifier = schematic.nodes.find((node) => node.label === "Room amplifier / DSP");
    const host = schematic.nodes.find((node) => node.label === "UC host USB audio");
    expect(amplifier).toBeDefined();
    expect(host).toBeDefined();

    const audio = schematic.connections.filter((connection) => connection.signal === "audio");
    expect(audio).toHaveLength(2);
    expect(audio.map((connection) => [connection.from, connection.to, connection.transport])).toEqual([
      [switching.id, amplifier!.id, "analogue-audio"],
      [switching.id, host!.id, "usb"],
    ]);
    // The recorded route replaces the warning that audio has not been placed.
    expect(schematic.warnings.some((warning) => warning.title === "Audio routing requires design")).toBe(false);
    expect(schematic.assumptions).toContain(
      "Programme audio is drawn from the recorded discovery route. Confirm the interface, level and cable at each destination before ordering.",
    );
  });

  it("lands a display's own speakers on the display already on the drawing", () => {
    const schematic = buildWingmanSchematic({
      title: "Huddle",
      sources: [{ label: "Laptop" }],
      displays: [{ label: "Wall display" }],
      products: [{ sku: "SW-620L-TX-W" }],
      audioRequired: true,
      audioRoute: { extraction: "extract-at-switcher", destinations: ["route-to-display-speakers"] },
    });

    const display = schematic.nodes.find((node) => node.kind === "display")!;
    const audio = schematic.connections.filter((connection) => connection.signal === "audio");
    expect(audio).toHaveLength(1);
    expect(audio[0].to).toBe(display.id);
    expect(schematic.nodes.some((node) => node.label === "Display speakers")).toBe(false);
  });

  it("does not draw a route the rep has recorded only one end of", () => {
    const schematic = buildWingmanSchematic({
      title: "Store",
      sources: [{ label: "Media player" }],
      displays: [{ label: "Signage display" }],
      products: [{ sku: "SW-620L-TX-W" }],
      audioRequired: true,
      audioRoute: { extraction: undefined, destinations: ["route-to-recorder"] },
    });

    expect(schematic.connections.some((connection) => connection.signal === "audio")).toBe(false);
    expect(schematic.assumptions.some((line) => line.includes("where the sound is taken from is not"))).toBe(true);
    // The missing half is still a design warning, not a silent default.
    expect(schematic.warnings.some((warning) => warning.title === "Audio routing requires design")).toBe(true);
  });

  it("keeps the audio warning when the requirement has no recorded route", () => {
    const schematic = buildWingmanSchematic({
      title: "Meeting room",
      sources: [{ label: "Laptop" }],
      displays: [{ label: "Display" }],
      products: [{ sku: "SW-620L-TX-W" }],
      audioRequired: true,
    });

    expect(schematic.connections.some((connection) => connection.signal === "audio")).toBe(false);
    expect(schematic.warnings.some((warning) => warning.title === "Audio routing requires design")).toBe(true);
  });

  it("has a drawing for every recorded route value", () => {
    for (const value of Object.keys(DISCOVERY_AUDIO_DESTINATION_PHRASES)) {
      expect(AUDIO_ROUTE_DESTINATIONS[value], `no diagram entry for ${value}`).toBeDefined();
    }
    for (const value of Object.keys(DISCOVERY_AUDIO_EXTRACTION_PHRASES)) {
      expect(AUDIO_ROUTE_EXTRACTIONS[value], `no diagram entry for ${value}`).toBeDefined();
    }
  });

  it("reads the route off the project's saved audio design", () => {
    const project = projectWithAudioDesign({
      audio: ["room-audio", "source-audio-deembed"],
      "audio-route": ["extract-at-switcher", "route-to-room-amplifier", "route-to-uc-host"],
    });

    const brief = buildSchematicBriefFromProject(project);
    expect(brief.audioRoute).toMatchObject({
      extraction: "extract-at-switcher",
      destinations: ["route-to-room-amplifier", "route-to-uc-host"],
    });
    expect(brief.audioRoute?.summary).toContain("Programme audio is taken from");

    const schematic = buildWingmanSchematic(brief);
    expect(schematic.connections.filter((connection) => connection.signal === "audio").length).toBe(2);
  });

  it("names each destination on the room's visual diagram", () => {
    const project = projectWithAudioDesign({
      audio: ["room-audio", "source-audio-deembed"],
      "audio-route": ["extract-at-switcher", "route-to-room-amplifier", "route-to-uc-host"],
    });

    const diagram = buildWholeProjectVisualDiagram(project);
    const labels = diagram.nodes.map((node) => node.label);
    // Named for what they are, rather than two identical "audio system" boxes.
    expect(labels).toContain("Room amplifier / DSP — by others");
    expect(labels).toContain("UC host USB audio — by others");

    const amplifier = diagram.nodes.find((node) => node.label === "Room amplifier / DSP — by others")!;
    const host = diagram.nodes.find((node) => node.label === "UC host USB audio — by others")!;
    expect(diagram.edges.some((edge) => edge.target === amplifier.id)).toBe(true);
    expect(diagram.edges.some((edge) => edge.target === host.id && edge.label === "USB")).toBe(true);
  });

  it("draws nothing for a project whose audio route was never recorded", () => {
    const project = projectWithAudioDesign({ audio: ["room-audio"] });

    const brief = buildSchematicBriefFromProject(project);
    expect(brief.audioRoute).toBeUndefined();
    expect(buildWingmanSchematic(brief).connections.some((connection) => connection.signal === "audio")).toBe(false);
  });
});
