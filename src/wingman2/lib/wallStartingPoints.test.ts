import { beforeEach, describe, expect, it } from "vitest";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import {
  resetWallStartingPointsCache,
  SAVED_WALL_STARTING_POINTS_KEY,
  SAVED_WALL_STARTING_POINT_LIMIT,
  removeWallStartingPoint,
  savedWallStartingPoints,
  saveWallStartingPoint,
  wallStartPresetGroupsWithSaved,
  wallStartingPointKey,
  wallStartingPointName,
} from "./wallStartingPoints";

function wall(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, ...overrides };
}

const led = () => wall({
  application: "led",
  ledCanvasWidth: 3840,
  ledCanvasHeight: 2160,
  layout: "custom",
  customMode: "floating",
  windows: 4,
  sources: 4,
  sourceResolution: "4k30",
});

describe("saved wall starting points", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetWallStartingPointsCache();
  });

  it("saves an adjusted wall as a card in its own family", () => {
    const saved = saveWallStartingPoint(led());

    expect(saved).toHaveLength(1);
    expect(saved[0].key.startsWith("saved-")).toBe(true);
    expect(saved[0].family).toBe("led");
    expect(saved[0].label).toBe("LED 3840 × 2160 · 4 windows");
    expect(saved[0].detail).toContain("Your own answers");
    // The card cannot advertise an architecture its answers do not reach.
    expect(saved[0].leadsTo).not.toBe("Requirement change needed");

    // It is listed before the shipped LED walls, not in a separate tray.
    const ledGroup = wallStartPresetGroupsWithSaved(saved).find((group) => group.family === "led")!;
    expect(ledGroup.presets[0].key).toBe(saved[0].key);
    expect(ledGroup.presets.length).toBeGreaterThan(1);
  });

  it("keeps one card per brief, newest first", () => {
    const first = saveWallStartingPoint(led());
    const second = saveWallStartingPoint(wall({ columns: 3, rows: 1 }));

    expect(second).toHaveLength(2);
    expect(second[0].requirements.columns).toBe(3);

    // Saving the same wall again moves its card to the front instead of adding
    // a duplicate: the brief, not the moment it was saved, is the identity.
    const again = saveWallStartingPoint(led());
    expect(again).toHaveLength(2);
    expect(again[0].key).toBe(first[0].key);
    expect(again.map((preset) => preset.key)).toEqual([first[0].key, second[0].key]);
  });

  it("strips the site survey so the same brief stays one card", () => {
    const surveyed = saveWallStartingPoint({
      ...led(),
      measuredRuns: { "source-1": 12 },
      linkDetails: { "source-1": { enclosure: "Back box" } },
    });

    // A starting point is the brief, not another room's survey.
    expect(surveyed[0].requirements.measuredRuns).toEqual({});
    expect(surveyed[0].requirements.linkDetails).toEqual({});
    expect(surveyed[0].requirements.surveyReview).toBeUndefined();

    const plain = saveWallStartingPoint(led());
    expect(plain[0].key).toBe(surveyed[0].key);
    expect(plain).toHaveLength(1);
  });

  it("keeps the list to the most recent walls", () => {
    for (let columns = 1; columns <= SAVED_WALL_STARTING_POINT_LIMIT + 1; columns += 1) {
      saveWallStartingPoint(wall({ columns, rows: 1 }));
    }

    const saved = savedWallStartingPoints();
    expect(saved).toHaveLength(SAVED_WALL_STARTING_POINT_LIMIT);
    expect(saved[0].requirements.columns).toBe(SAVED_WALL_STARTING_POINT_LIMIT + 1);
    expect(saved.some((preset) => preset.requirements.columns === 1)).toBe(false);
  });

  it("forgets one saved wall without touching the shipped presets", () => {
    const saved = saveWallStartingPoint(led());
    expect(removeWallStartingPoint(saved[0].key)).toEqual([]);
    expect(savedWallStartingPoints()).toEqual([]);
    // The shipped list is a module constant, so it is still complete.
    expect(wallStartPresetGroupsWithSaved([]).flatMap((group) => group.presets).length).toBeGreaterThan(0);
  });

  it("drops a stored card the builder could not open", () => {
    window.localStorage.setItem(SAVED_WALL_STARTING_POINTS_KEY, JSON.stringify([
      { label: "Unknown wall", requirements: { ...led(), application: "holo" } },
      { label: "Impossible grid", requirements: { ...led(), columns: 0 } },
      { label: "Still fine", requirements: led() },
    ]));

    const saved = savedWallStartingPoints();
    expect(saved).toHaveLength(1);
    expect(saved[0].label).toBe("Still fine");
  });

  it("names the wall from its own answers", () => {
    expect(wallStartingPointName(led())).toBe("LED 3840 × 2160 · 4 windows");
    expect(wallStartingPointName(wall({ columns: 3, rows: 3, layout: "nine", windows: 9 })))
      .toBe("LCD 3 × 3 · 9 windows");
    expect(wallStartingPointName(wall({ application: "projection", panelDiagonalInches: 86 })))
      .toBe("86 in screen · 1 window");
  });

  it("keys a brief the same way however its fields were ordered", () => {
    const reordered = Object.fromEntries(Object.entries(led()).reverse()) as WallRequirements;
    expect(wallStartingPointKey(reordered)).toBe(wallStartingPointKey(led()));
  });
});
