import { describe, expect, it } from "vitest";
import {
  VIDEO_WALL_HANDOFF_KEY,
  clearVideoWallHandoff,
  discoveryVideoWallHandoff,
  hasDiscoveryVideoWallIntent,
  readVideoWallHandoff,
  seedWallRequirements,
  templateHasVideoWall,
  templateVideoWallHandoff,
  writeVideoWallHandoff,
} from "./videowallHandoff";
import { defaultWallRequirements, validateWallRequirements } from "./videowallOptions";

describe("video wall handoff", () => {
  it("detects a wall output in discovery and seeds the builder", () => {
    const handoff = discoveryVideoWallHandoff({
      displays: ["video-wall-output"],
      "display-behaviour": ["video-wall-or-processor-feed"],
      "video-wall-technology": "lcd-array",
      "video-wall-purpose": "single-canvas",
    });
    expect(handoff).not.toBeNull();
    expect(handoff!.source).toBe("discovery");
    expect(handoff!.requirements).toMatchObject({
      application: "lcd-loop",
      layout: "single",
      windows: 1,
      columns: 2,
      rows: 2,
    });
    expect(handoff!.label).toContain("LCD wall");
  });

  it("maps wall technology and purpose onto one design intent", () => {
    const independent = discoveryVideoWallHandoff({
      "video-wall-technology": "lcd-array",
      "video-wall-purpose": "independent-tiles",
      displays: "nine-plus-displays",
    });
    expect(independent!.requirements).toMatchObject({
      application: "lcd-direct",
      layout: "independent",
      columns: 3,
      rows: 3,
      sources: 9,
    });

    const led = discoveryVideoWallHandoff({ "video-wall-technology": "direct-view-led" });
    expect(led!.requirements.application).toBe("led");

    const projection = discoveryVideoWallHandoff({ "video-wall-technology": "projection-canvas" });
    expect(projection!.requirements.application).toBe("projection");

    const multi = discoveryVideoWallHandoff({ "video-wall-purpose": "multi-source-canvas" });
    expect(multi!.requirements).toMatchObject({ layout: "quad", windows: 4 });
  });

  it("ignores rooms that do not contain a wall", () => {
    expect(hasDiscoveryVideoWallIntent({ displays: ["three-eight-displays"], "display-behaviour": ["same-content-all-displays"] })).toBe(false);
    expect(discoveryVideoWallHandoff({ displays: ["one-display"] })).toBeNull();
    expect(hasDiscoveryVideoWallIntent({ opportunity: "video-wall" })).toBe(true);
  });

  it("seeds valid requirements and rejects impossible seeds", () => {
    const handoff = discoveryVideoWallHandoff({ displays: ["video-wall-output"] })!;
    const seeded = seedWallRequirements(handoff);
    expect(seeded).not.toBeNull();
    expect(validateWallRequirements(seeded!)).toEqual([]);

    expect(seedWallRequirements({ source: "discovery", label: "bad", requirements: { windows: 0 } })).toBeNull();
    expect(seedWallRequirements(null)).toBeNull();
  });

  it("round-trips through session storage and clears once consumed", () => {
    clearVideoWallHandoff();
    const handoff = { source: "template" as const, label: "Template: Wall", requirements: { columns: 4, rows: 2 } };
    writeVideoWallHandoff(handoff);
    expect(window.sessionStorage.getItem(VIDEO_WALL_HANDOFF_KEY)).toBeTruthy();
    expect(readVideoWallHandoff()).toEqual(handoff);
    clearVideoWallHandoff();
    expect(readVideoWallHandoff()).toBeNull();
  });

  it("recognises wall templates and sizes them from their processor", () => {
    const four = templateVideoWallHandoff({
      id: "retail-lcd-wall-processor",
      name: "Retail LCD wall processor",
      architecture: "Video wall",
      bom: [{ sku: "SW-0204-VW", role: "Video wall processor", description: "Four-output wall processor" }],
    });
    expect(four).not.toBeNull();
    expect(four!.requirements).toMatchObject({ application: "lcd-loop", sources: 2, columns: 2, rows: 2 });

    const six = templateVideoWallHandoff({
      id: "wall-six",
      name: "Six output wall",
      bom: [{ sku: "SW-0206-VW", role: "Video wall processor" }],
    });
    expect(six!.requirements).toMatchObject({ columns: 3, rows: 2 });

    const led = templateVideoWallHandoff({ id: "led-wall", name: "LED wall", summary: "Direct-view LED wall" });
    expect(led!.requirements.application).toBe("led");

    expect(templateHasVideoWall({ id: "boardroom", name: "Boardroom", bom: [{ sku: "MX-0404-SCL" }] })).toBe(false);
    expect(templateVideoWallHandoff({ id: "boardroom", name: "Boardroom", bom: [{ sku: "MX-0404-SCL" }] })).toBeNull();
  });

  it("carries the room template so the saved wall can record it", () => {
    const handoff = templateVideoWallHandoff({
      id: "retail-lcd-wall-processor",
      name: "Retail LCD wall processor",
      architecture: "Video wall",
      bom: [{ sku: "SW-0204-VW", role: "Video wall processor" }],
    })!;

    expect(handoff.templateId).toBe("retail-lcd-wall-processor");
    writeVideoWallHandoff(handoff);
    expect(readVideoWallHandoff()?.templateId).toBe("retail-lcd-wall-processor");

    // Discovery reaches the builder without a template, so it records none.
    const discovery = discoveryVideoWallHandoff({ displays: ["video-wall-output"] })!;
    expect(discovery.templateId).toBeUndefined();
  });

  it("seeds every handoff onto the builder defaults", () => {
    const seeded = seedWallRequirements({
      source: "discovery",
      label: "Discovery",
      requirements: { application: "led", layout: "custom", customMode: "floating", windows: 4, sources: 4 },
    });
    expect(seeded).toMatchObject({
      application: "led",
      layout: "custom",
      customMode: "floating",
      windows: 4,
      orientation: defaultWallRequirements.orientation,
      sourceResolution: defaultWallRequirements.sourceResolution,
    });
  });
});
