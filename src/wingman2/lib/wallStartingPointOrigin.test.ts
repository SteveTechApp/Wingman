import { describe, expect, it } from "vitest";
import { wallStartPresets } from "./videowallDecision";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import {
  normalizeWallStartingPointOrigin,
  wallStartingPointDrift,
  wallStartingPointOrigin,
} from "./wallStartingPointOrigin";

const preset = wallStartPresets.find((entry) => entry.key === "led-ribbon")!;
const origin = wallStartingPointOrigin(preset);

function changed(overrides: Partial<WallRequirements>): WallRequirements {
  return { ...preset.requirements, ...overrides };
}

describe("wallStartingPointOrigin", () => {
  it("records the card and the answers it set", () => {
    expect(origin).toMatchObject({ key: preset.key, label: preset.label });
    // The brief is the card's answers, so the panel compares like with like.
    expect(origin.brief.application).toBe(preset.requirements.application);
    expect(origin.brief.measuredRuns).toEqual({});
    expect(origin.brief.linkDetails).toEqual({});
  });

  it("accepts a stored origin the builder could have written", () => {
    expect(normalizeWallStartingPointOrigin(origin)).toEqual(origin);
    expect(normalizeWallStartingPointOrigin({ ...origin, label: `  ${origin.label}  ` })?.label).toBe(origin.label);
  });

  it("drops an origin it cannot vouch for rather than measuring against it", () => {
    expect(normalizeWallStartingPointOrigin(null)).toBeUndefined();
    expect(normalizeWallStartingPointOrigin({ label: origin.label, brief: origin.brief })).toBeUndefined();
    expect(normalizeWallStartingPointOrigin({ key: origin.key, brief: origin.brief })).toBeUndefined();
    expect(normalizeWallStartingPointOrigin({ key: origin.key, label: origin.label })).toBeUndefined();
    // A brief the builder could never have produced is not a starting point.
    expect(
      normalizeWallStartingPointOrigin({ ...origin, brief: { ...origin.brief, layout: "hexagon" } }),
    ).toBeUndefined();
  });
});

describe("wallStartingPointDrift", () => {
  it("has nothing to say about a design with no card behind it", () => {
    expect(wallStartingPointDrift(null, changed({ sources: 4 }))).toBeNull();
    expect(wallStartingPointDrift(undefined, changed({ sources: 4 }))).toBeNull();
  });

  it("says a wall still holding the card's answers has not moved", () => {
    const drift = wallStartingPointDrift(origin, preset.requirements)!;

    expect(drift.changes).toEqual([]);
    expect(drift.text).toBe(`No answers changed since you picked ${preset.label}.`);
  });

  it("names each answer the room changed, with the card's answer beside it", () => {
    const drift = wallStartingPointDrift(origin, changed({ sources: preset.requirements.sources + 2 }))!;

    expect(drift.changes).toEqual([
      { key: "sources", label: "Sources", from: `${preset.requirements.sources}`, to: `${preset.requirements.sources + 2}` },
    ]);
    expect(drift.text).toBe(`1 answer changed since you picked ${preset.label}.`);
  });

  it("does not count the site's measurements as answers", () => {
    // A measured run and an install cell belong to one room, not to the brief.
    const drift = wallStartingPointDrift(
      origin,
      changed({ measuredRuns: { "source-1": 12 }, linkDetails: { "source-1": { enclosure: "Back box" } } }),
    )!;

    expect(drift.changes).toEqual([]);
  });

  it("reports one change for a layout whose companion answers move with it", () => {
    // Independent feeds set one picture per panel, so `windows` riding along is
    // not a second decision the rep made.
    const drift = wallStartingPointDrift(origin, changed({ layout: "independent", windows: 1 }))!;

    expect(drift.changes.map((change) => change.key)).toEqual(["layout", "windows"]);
    // The card's layout is quoted in the words the builder uses, not its enum.
    expect(drift.changes[0].from).not.toBe(preset.requirements.layout);
  });

  it("treats a different wall type as the answers it replaces", () => {
    const drift = wallStartingPointDrift(origin, changed({ application: "lcd-direct", columns: 2, rows: 2 }))!;

    const keys = drift.changes.map((change) => change.key);
    expect(keys).toContain("picture");
    expect(keys).toContain("shape");
    expect(keys).toContain("panel");
    expect(drift.changes.find((change) => change.key === "shape")?.to).toBe("2 × 2");
  });

  it("names the transport answer as the site would describe it", () => {
    const drift = wallStartingPointDrift(origin, changed({ network: "10g", sourceLocation: "distributed" }))!;

    expect(drift.changes).toEqual([
      { key: "location", label: "Where the sources sit", from: expect.any(String), to: "10GbE" },
    ]);
  });

  it("counts several changed answers in one sentence", () => {
    const drift = wallStartingPointDrift(origin, changed({ sources: 6, mapping: "fill" }))!;

    expect(drift.changes).toHaveLength(2);
    expect(drift.text).toBe(`2 answers changed since you picked ${preset.label}.`);
  });

  it("measures against the card's brief, not the whole saved model", () => {
    // A card saved from another room keeps no runs, so the origin's brief is the
    // shape a card is keyed on and the comparison cannot drift with the site.
    const saved = wallStartingPointOrigin({
      ...preset,
      requirements: {
        ...defaultWallRequirements,
        columns: 3,
        rows: 1,
        measuredRuns: { "display-1": 9 },
      },
    });
    const drift = wallStartingPointDrift(saved, { ...defaultWallRequirements, columns: 3, rows: 1 })!;

    expect(drift.changes).toEqual([]);
  });
});
