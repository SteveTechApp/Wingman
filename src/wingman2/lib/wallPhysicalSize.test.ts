import { describe, expect, it } from "vitest";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { DEFAULT_PANEL_DIAGONAL_INCHES, wallPhysicalSize } from "./wallPhysicalSize";

function requirements(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, ...overrides };
}

describe("wallPhysicalSize", () => {
  it("sizes a 55 in 16:9 panel and the array it fills", () => {
    const physical = wallPhysicalSize(requirements({ application: "lcd-loop", columns: 2, rows: 2 }));

    // 55 in on a 16:9 panel is 1,218 × 685 mm whatever it is driven with.
    expect(physical.panel).toEqual({ width: 1218, height: 685 });
    expect(physical.wall).toEqual({ width: 2436, height: 1370 });
    expect(physical.text).toBe("Wall 2,436 × 1,370 mm · 55 in panels at 1,218 × 685 mm");
  });

  it("follows the panel diagonal the rep chose", () => {
    const small = wallPhysicalSize(requirements({ columns: 4, rows: 2, panelDiagonalInches: 46 }));
    const large = wallPhysicalSize(requirements({ columns: 4, rows: 2, panelDiagonalInches: 86 }));

    expect(small.panel).toEqual({ width: 1018, height: 573 });
    expect(small.wall).toEqual({ width: 4072, height: 1146 });
    expect(large.panel).toEqual({ width: 1904, height: 1071 });
    expect(large.wall).toEqual({ width: 7616, height: 2142 });
  });

  it("rotates the panel with a portrait array", () => {
    const physical = wallPhysicalSize(requirements({ columns: 2, rows: 2, orientation: "portrait" }));

    expect(physical.panel).toEqual({ width: 685, height: 1218 });
    expect(physical.wall).toEqual({ width: 1370, height: 2436 });
  });

  it("keeps the panel's own shape for a non-16:9 screen", () => {
    const physical = wallPhysicalSize(requirements({
      columns: 1,
      rows: 1,
      displayCustom: true,
      displayWidth: 1920,
      displayHeight: 1200,
    }));

    // A 16:10 panel is not as wide as a 16:9 panel of the same diagonal.
    expect(physical.panel).toEqual({ width: 1185, height: 740 });
  });

  it("sizes an LED wall from its pixel pitch", () => {
    const physical = wallPhysicalSize(requirements({
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 1080,
      pixelPitchMm: 2.5,
    }));

    expect(physical.panel).toBeNull();
    expect(physical.wall).toEqual({ width: 9600, height: 2700 });
    expect(physical.basis).toBe("2.5 mm pixel pitch");
    expect(physical.text).toBe("Wall 9,600 × 2,700 mm at 2.5 mm pixel pitch");
  });

  it("re-pitches the same LED canvas when the cabinet pitch changes", () => {
    const fine = wallPhysicalSize(requirements({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 1080, pixelPitchMm: 1.9 }));
    const coarse = wallPhysicalSize(requirements({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 1080, pixelPitchMm: 3.9 }));

    expect(fine.wall).toEqual({ width: 3648, height: 2052 });
    expect(coarse.wall).toEqual({ width: 7488, height: 4212 });
  });

  it("describes a single projector as one screen rather than a wall", () => {
    const physical = wallPhysicalSize(requirements({ application: "projection", panelDiagonalInches: 100 }));

    expect(physical.wall).toEqual({ width: 2214, height: 1245 });
    expect(physical.text).toBe("Screen 2,214 × 1,245 mm (100 in)");
  });

  it("falls back to the standard panel when a saved wall carries no diagonal", () => {
    const saved = requirements({ panelDiagonalInches: undefined });

    expect(saved.panelDiagonalInches).toBeUndefined();
    expect(wallPhysicalSize(saved).diagonalInches).toBe(DEFAULT_PANEL_DIAGONAL_INCHES);
    expect(wallPhysicalSize(saved).panel).toEqual({ width: 1218, height: 685 });
  });

  it("derives panel mass, clearance and the mounting opening from the panel size", () => {
    const physical = wallPhysicalSize(requirements({ application: "lcd-loop", columns: 2, rows: 2 }));

    // 1,218 × 685 mm is 0.83 m², about 21.7 kg on the planning mass; four of
    // them plus the 100 mm service margin on every side.
    expect(physical.mounting.panelWeightKg).toBe(21.7);
    expect(physical.mounting.totalWeightKg).toBe(87);
    expect(physical.mounting.clearanceMm).toBe(100);
    expect(physical.mounting.opening).toEqual({ width: 2636, height: 1570 });
    expect(physical.mounting.text).toContain("2,636 × 1,570 mm opening");
  });

  it("weighs the whole LED canvas and derives no panel mass", () => {
    const physical = wallPhysicalSize(requirements({
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 1080,
      pixelPitchMm: 2.5,
    }));

    expect(physical.mounting.panelWeightKg).toBeNull();
    expect(physical.mounting.totalWeightKg).toBe(778);
    expect(physical.mounting.opening).toEqual({ width: 9800, height: 2900 });
    expect(physical.mounting.text).toContain("25.92 m² of cabinets");
  });

  it("leaves a projection screen's mass to the screen and still derives its opening", () => {
    const physical = wallPhysicalSize(requirements({ application: "projection", panelDiagonalInches: 100 }));

    expect(physical.mounting.panelWeightKg).toBeNull();
    expect(physical.mounting.totalWeightKg).toBeNull();
    expect(physical.mounting.opening).toEqual({ width: 2414, height: 1445 });
    expect(physical.mounting.text).toContain("Screen mass and fixing points come from the specified screen.");
  });

  it("ignores a nonsense diagonal instead of printing it", () => {
    const physical = wallPhysicalSize(requirements({ panelDiagonalInches: Number.NaN }));

    expect(physical.diagonalInches).toBe(DEFAULT_PANEL_DIAGONAL_INCHES);
    expect(physical.text).toContain("1,218 × 685 mm");
  });
});

it("uses a named datasheet mass and retains planning mass for an incomplete reference", () => {
  const wall = requirements({ application: "lcd-direct", columns: 2, rows: 2, panelMassOverride: { kg: 30, model: "Display 55", source: "Datasheet rev 2" } });
  expect(wallPhysicalSize(wall).mounting.totalWeightKg).toBe(120);
  expect(wallPhysicalSize(wall).mounting.text).toContain("datasheet mass (Display 55; Datasheet rev 2)");
  expect(wallPhysicalSize({ ...wall, panelMassOverride: { ...wall.panelMassOverride!, source: "" } }).mounting.text).toContain("planning mass");
});

it("ignores damaged persisted datasheet fields", () => {
  const wall = requirements({ panelMassOverride: { kg: 30, model: 42, source: null } as unknown as WallRequirements["panelMassOverride"] });
  expect(wallPhysicalSize(wall).mounting.text).toContain("planning mass");
});
