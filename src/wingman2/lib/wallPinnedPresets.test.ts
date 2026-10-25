import { beforeEach, describe, expect, it } from "vitest";
import { wallStartPresetGroups, wallStartPresets } from "./videowallDecision";
import {
  PINNED_WALL_PRESET_LIMIT,
  PINNED_WALL_PRESETS_KEY,
  pinnedWallPresetKeys,
  pinnedWallPresetsSnapshot,
  resetPinnedWallPresetsCache,
  togglePinnedWallPreset,
  wallStartPresetGroupsWithPins,
} from "./wallPinnedPresets";

function familyOf(key: string) {
  return wallStartPresetGroups.find((group) => group.presets.some((preset) => preset.key === key))!;
}

describe("pinned wall presets", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetPinnedWallPresetsCache();
  });

  it("pins a curated wall to the head of its family band", () => {
    togglePinnedWallPreset("quad-canvas");

    const groups = wallStartPresetGroupsWithPins(wallStartPresetGroups, pinnedWallPresetsSnapshot());
    const lcd = groups.find((group) => group.family === "lcd")!;
    expect(lcd.presets[0].key).toBe("quad-canvas");

    // A pin reorders rows and nothing else: the band keeps every wall.
    expect(lcd.presets).toHaveLength(familyOf("quad-canvas").presets.length);
    const others = lcd.presets.slice(1).map((preset) => preset.key);
    expect(others).toEqual(familyOf("quad-canvas").presets.filter((preset) => preset.key !== "quad-canvas").map((preset) => preset.key));
    expect(groups.flatMap((group) => group.presets)).toHaveLength(wallStartPresets.length);
  });

  it("leads with the newest pin and unpins the wall again", () => {
    togglePinnedWallPreset("single-canvas");
    togglePinnedWallPreset("per-panel");
    expect(pinnedWallPresetsSnapshot()).toEqual(["per-panel", "single-canvas"]);

    const lcd = wallStartPresetGroupsWithPins(wallStartPresetGroups, pinnedWallPresetsSnapshot())
      .find((group) => group.family === "lcd")!;
    expect(lcd.presets.slice(0, 2).map((preset) => preset.key)).toEqual(["per-panel", "single-canvas"]);

    expect(togglePinnedWallPreset("per-panel")).toEqual(["single-canvas"]);
  });

  it("survives a reload through storage, and drops pins no wall answers", () => {
    togglePinnedWallPreset("led-canvas");
    window.localStorage.setItem(PINNED_WALL_PRESETS_KEY, JSON.stringify(["led-canvas", "retired-wall", "led-canvas"]));

    resetPinnedWallPresetsCache();

    // A retired brief leaves no pin behind, and a duplicate is one pin.
    expect(pinnedWallPresetKeys()).toEqual(["led-canvas"]);
  });

  it("keeps a pin for a wall the builder never named", () => {
    const before = pinnedWallPresetKeys();
    expect(togglePinnedWallPreset("no-such-wall")).toEqual(before);
    expect(pinnedWallPresetKeys()).toEqual([]);
  });

  it("caps the pins the picker has to lead with", () => {
    const keys = wallStartPresets.map((preset) => preset.key).slice(0, PINNED_WALL_PRESET_LIMIT + 2);
    for (const key of keys) togglePinnedWallPreset(key);

    const pinned = pinnedWallPresetKeys();
    expect(pinned).toHaveLength(PINNED_WALL_PRESET_LIMIT);
    // Newest first, so the walls dropped are the ones reached for longest ago.
    expect(pinned).toEqual(keys.slice(-PINNED_WALL_PRESET_LIMIT).reverse());
  });
});
