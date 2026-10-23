import { describe, expect, it } from "vitest";
import {
  EMPTY_WALL_PRESET_FILTER,
  filterWallStartPresetGroups,
  wallPresetFilterCount,
  wallPresetFilterIsSet,
  wallPresetFilterOptions,
  wallStartPresetMatches,
  wallStartPresetWindowCount,
} from "./wallStartPresetFilter";
import { wallStartPresetGroups, wallStartPresets } from "./videowallDecision";

const preset = (key: string) => wallStartPresets.find((entry) => entry.key === key)!;

describe("wall picker filter", () => {
  it("offers only the values the cards carry", () => {
    const options = wallPresetFilterOptions(wallStartPresets);

    expect(options.windows).toEqual([...new Set(wallStartPresets.map(wallStartPresetWindowCount))].sort((a, b) => a - b));
    expect(options.sources).toEqual([...new Set(wallStartPresets.map((entry) => entry.requirements.sources))].sort((a, b) => a - b));
    // No chip is a dead end: every offered transport has at least one card.
    for (const transport of options.transports) {
      expect(wallStartPresets.some((entry) => entry.transport === transport)).toBe(true);
    }
  });

  it("counts a per-panel wall by the pictures it shows", () => {
    // The brief answers one window, but a 2 × 2 array shows four pictures.
    expect(preset("per-panel").requirements.windows).toBe(1);
    expect(wallStartPresetWindowCount(preset("per-panel"))).toBe(4);
  });

  it("narrows on each fact on its own and together", () => {
    const quad = preset("quad-canvas");
    expect(wallStartPresetMatches(quad, { windows: 4, sources: null, transport: null })).toBe(true);
    expect(wallStartPresetMatches(quad, { windows: 9, sources: null, transport: null })).toBe(false);
    expect(wallStartPresetMatches(quad, { windows: null, sources: 4, transport: null })).toBe(true);
    expect(wallStartPresetMatches(preset("network-feeds"), { windows: null, sources: null, transport: "10g" })).toBe(true);
    expect(wallStartPresetMatches(quad, { windows: 4, sources: 4, transport: "local" })).toBe(true);
    expect(wallStartPresetMatches(quad, { windows: 4, sources: 6, transport: null })).toBe(false);
  });

  it("keeps a wall that carries more than the chosen count", () => {
    // A nine-window wall can show four windows, and a nine-source wall can feed
    // four, so the counts are a floor rather than an exact size.
    const nine = preset("nine-feeds");
    expect(wallStartPresetMatches(nine, { windows: 4, sources: 4, transport: null })).toBe(true);
    expect(wallStartPresetMatches(nine, { windows: null, sources: 9, transport: null })).toBe(true);
    expect(wallStartPresetMatches(nine, { windows: 16, sources: null, transport: null })).toBe(false);
  });

  it("keeps a wall that runs on a simpler connection than the site offers", () => {
    expect(wallStartPresetMatches(preset("quad-canvas"), { windows: null, sources: null, transport: "10g" })).toBe(true);
    expect(wallStartPresetMatches(preset("quad-canvas"), { windows: null, sources: null, transport: "1g" })).toBe(true);
    expect(wallStartPresetMatches(preset("network-feeds"), { windows: null, sources: null, transport: "1g" })).toBe(false);
  });

  it("drops a family with no match and keeps the order of the others", () => {
    const groups = filterWallStartPresetGroups(wallStartPresetGroups, { windows: 16, sources: null, transport: null });

    expect(groups.map((group) => group.family)).toEqual(["led"]);
    expect(groups[0].presets.map((entry) => entry.key)).toEqual(["led-fixed-windows"]);
    expect(wallPresetFilterCount(groups)).toBe(1);
  });

  it("returns every card when nothing is filtered", () => {
    expect(wallPresetFilterIsSet(EMPTY_WALL_PRESET_FILTER)).toBe(false);
    expect(wallPresetFilterCount(filterWallStartPresetGroups(wallStartPresetGroups, EMPTY_WALL_PRESET_FILTER)))
      .toBe(wallStartPresets.length);
  });
});
