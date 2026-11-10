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
  wallHandoffDisplay,
  wallHandoffNote,
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
      columns: 2,
      rows: 2,
      sources: 4,
    });
    expect(independent!.roomDetails?.join(" ")).toContain("9+ video feed endpoints recorded");

    const led = discoveryVideoWallHandoff({ "video-wall-technology": "direct-view-led" });
    expect(led!.requirements.application).toBe("led");

    const projection = discoveryVideoWallHandoff({ "video-wall-technology": "projection-canvas" });
    expect(projection!.requirements.application).toBe("projection");

    const multi = discoveryVideoWallHandoff({ "video-wall-purpose": "multi-source-canvas" });
    expect(multi!.requirements).toMatchObject({ layout: "quad", windows: 4 });
  });

  it("uses the primary display selection to choose LED or LCD wall workflow", () => {
    const led = discoveryVideoWallHandoff({
      "primary-display": "led-video-wall",
      "display-behaviour": ["video-wall-or-processor-feed", "multiview-on-one-output"],
      displays: "video-wall-output",
    });
    expect(led!.requirements).toMatchObject({ application: "led", layout: "quad", windows: 4 });

    const lcd = discoveryVideoWallHandoff({
      "primary-display": "lcd-video-wall",
      "display-behaviour": ["video-wall-or-processor-feed", "independent-routing-per-display"],
      displays: "video-wall-output",
    });
    expect(lcd!.requirements).toMatchObject({ application: "lcd-direct", layout: "independent" });
  });

  it("maps a projector wall to projection and keeps standalone flat panels out of the wall builder", () => {
    for (const primary of ["single-projector", "dual-projectors"]) {
      const handoff = discoveryVideoWallHandoff({
        "primary-display": primary,
        "display-behaviour": "video-wall-or-processor-feed",
        "video-wall-purpose": "single-canvas",
      });
      expect(handoff!.requirements.application).toBe("projection");
    }

    expect(discoveryVideoWallHandoff({
      "primary-display": "single-large-flat-panel",
      "display-behaviour": "same-content-all-displays",
      displays: "one-display",
    })).toBeNull();
  });

  it("preserves a captured panel array, LED pitch and pixel canvas without treating repeaters as panels", () => {
    const handoff = discoveryVideoWallHandoff({
      "primary-display": "led-video-wall",
      displays: "nine-plus-displays",
      "repeater-displays": "three-four-repeater-displays",
      "display-behaviour": "video-wall-or-processor-feed",
    }, "Auditorium", {
      "primary-display": "5 m × 2 m indoor LED wall, 2.5 mm pixel pitch, processor canvas 3840 × 1080 px",
      "repeater-displays": "Two screens at the rear for overflow viewing",
    });

    expect(handoff!.requirements).toMatchObject({
      application: "led",
      columns: 2,
      rows: 2,
      pixelPitchMm: 2.5,
      ledCanvasWidth: 3840,
      ledCanvasHeight: 1080,
    });
    expect(handoff!.roomDetails?.join(" ")).toContain("3–4 repeater screens recorded");
    expect(handoff!.roomDetails?.join(" ")).toContain("Two screens at the rear for overflow viewing");
    expect(handoff!.openQuestions).toContain("Panel/cabinet array is not captured; the displayed 2 × 2 array is a temporary planning starting point, not a confirmed design.");
    expect(wallHandoffNote(handoff!, seedWallRequirements(handoff!)!)).toContain("Still to confirm:");
  });

  it("maps an explicitly captured 3×3 panel array while keeping nine feeds and repeaters separate", () => {
    const handoff = discoveryVideoWallHandoff({
      "primary-display": "lcd-video-wall",
      "primary-display-panel-array": "3x3",
      displays: "nine-plus-displays",
      "repeater-displays": "one-two-repeater-displays",
      "video-wall-purpose": "independent-tiles",
    });
    expect(handoff!.requirements).toMatchObject({ application: "lcd-direct", columns: 3, rows: 3, sources: 9 });
    expect(handoff!.roomDetails?.join(" ")).toContain("9+ video feed endpoints recorded");
    expect(handoff!.roomDetails?.join(" ")).toContain("1–2 repeater screens recorded");
    expect(handoff!.openQuestions).not.toContain("Panel/cabinet array is not captured; the displayed 2 × 2 array is a temporary planning starting point, not a confirmed design.");
  });

  it("takes a written LCD array and panel size into the builder", () => {
    const handoff = discoveryVideoWallHandoff({ "primary-display": "lcd-video-wall" }, undefined, {
      "primary-display": "3 × 2 LCD wall using 65 inch panels",
    });
    expect(handoff!.requirements).toMatchObject({ application: "lcd-loop", columns: 3, rows: 2, panelDiagonalInches: 65 });
    expect(handoff!.openQuestions).not.toContain("Panel/cabinet array is not captured; the displayed 2 × 2 array is a temporary planning starting point, not a confirmed design.");
  });

  it("accepts explicit array fields when the discovery integration supplies them", () => {
    const handoff = discoveryVideoWallHandoff({
      "primary-display": "lcd-video-wall",
      "video-wall-columns": "4",
      "video-wall-rows": 2,
    });
    expect(handoff!.requirements).toMatchObject({ columns: 4, rows: 2 });
  });

  it("marks missing technology and array as unresolved instead of presenting defaults as captured facts", () => {
    const handoff = discoveryVideoWallHandoff({ displays: "video-wall-output" })!;
    expect(handoff.label).toContain("wall technology not confirmed");
    expect(handoff.openQuestions).toEqual(expect.arrayContaining([
      expect.stringContaining("Wall technology is not confirmed"),
      expect.stringContaining("Panel/cabinet array is not captured"),
    ]));
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

  it("carries the room a Discovery wall was answered for, and says it", () => {
    const handoff = discoveryVideoWallHandoff({ displays: ["video-wall-output"] }, "Boardroom wall")!;
    const requirements = seedWallRequirements(handoff)!;

    expect(handoff.projectName).toBe("Boardroom wall");
    // The label still says what the wall does; the room is added beside it, so
    // the banner names both facts the rep needs on arrival.
    expect(handoff.label).toBe("Discovery: wall technology not confirmed, content behaviour not confirmed");
    expect(wallHandoffNote(handoff, requirements)).toBe(
      `Started from Discovery: wall technology not confirmed, content behaviour not confirmed (Boardroom wall) — ${wallHandoffDisplay(requirements)}. The answers below are taken from that work — adjust anything that differs. Room details: Video wall / LED processor feed endpoint recorded. Still to confirm: Wall technology is not confirmed; the builder's LCD workflow is only a temporary planning basis. Panel/cabinet array is not captured; the displayed 2 × 2 array is a temporary planning starting point, not a confirmed design. LCD panel diagonal is not captured; confirm the panel size before treating physical dimensions as final. Wall content behaviour is not confirmed; confirm single canvas, independent tiles or multiview.`,
    );

    // A capture nobody has named carries no room rather than a placeholder.
    const unnamed = discoveryVideoWallHandoff({ displays: ["video-wall-output"] }, "   ")!;
    expect(unnamed.projectName).toBeUndefined();
    expect(wallHandoffNote(unnamed, requirements)).toContain("Started from Discovery: wall technology not confirmed, content behaviour not confirmed — ");

    // The room survives the handoff store, so the builder that reads it back
    // names the room rather than only the wall behaviour.
    writeVideoWallHandoff(handoff);
    expect(readVideoWallHandoff()?.projectName).toBe("Boardroom wall");
  });

  it("drops a room that a stored handoff cannot name", () => {
    // A hand-edited or half-written handoff must not put a number in a sentence.
    window.sessionStorage.setItem(VIDEO_WALL_HANDOFF_KEY, JSON.stringify({
      source: "discovery",
      label: "Discovery: LCD wall, single canvas",
      requirements: { columns: 2, rows: 2 },
      projectName: 7,
    }));

    expect(readVideoWallHandoff()?.projectName).toBeUndefined();
  });

  it("names the wall a handoff opened, the way the shared-link banner names one", () => {
    // The banner says what the rep is looking at, not only where it came from:
    // the array, and the same display phrase the shared-link banner, the copy
    // confirmation and the pasted line quote.
    expect(wallHandoffDisplay({ ...defaultWallRequirements, columns: 3, rows: 2 })).toBe(
      "the 3 × 2 array, 55 in panels",
    );
    expect(wallHandoffDisplay({ ...defaultWallRequirements, application: "led", pixelPitchMm: 1.9 })).toBe(
      "the 2 × 2 array, 1.9 mm pixel pitch",
    );
    expect(
      wallHandoffDisplay({ ...defaultWallRequirements, application: "projection", projectors: 2, panelDiagonalInches: 86 }),
    ).toBe("the 2 × 2 array, 86 in images");
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
