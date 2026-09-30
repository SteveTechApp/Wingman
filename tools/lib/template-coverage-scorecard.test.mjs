import { describe, expect, it } from "vitest";
import { buildCoverageScorecard, COMPLETE_ROOM_LAYERS, floorViolations, floorsAreStale, layerAddressed, measuredFloors } from "./template-coverage-scorecard.mjs";

const checklistFor = (statuses) => ({
  layers: COMPLETE_ROOM_LAYERS.map((id) => ({ id, status: statuses[id] ?? "unspecified" })),
});

const stubScorer = {
  a: checklistFor({ transport: "covered", humanFactors: "covered" }),
  b: checklistFor({ transport: "covered", compliance: "by-others" }),
  c: checklistFor({ transport: "covered", assurance: "not-applicable", environment: "covered" }),
};

describe("complete-room coverage scorecard", () => {
  it("pins the six layers in UI order so the gate scores exactly what the checklist renders", () => {
    expect(COMPLETE_ROOM_LAYERS).toEqual(["transport", "humanFactors", "controlExperience", "environment", "assurance", "compliance"]);
  });

  it("counts addressed layers as covered, by-others or explicitly not applicable — never unspecified", () => {
    expect(layerAddressed("covered")).toBe(true);
    expect(layerAddressed("by-others")).toBe(true);
    expect(layerAddressed("not-applicable")).toBe(true);
    expect(layerAddressed("unspecified")).toBe(false);
  });

  it("aggregates per-layer status counts and the addressed total across the catalogue", () => {
    const scorecard = buildCoverageScorecard(Object.values(stubScorer), (template) => template);
    expect(scorecard.templateCount).toBe(3);
    expect(scorecard.layers.transport).toEqual({ covered: 3, byOthers: 0, notApplicable: 0, unspecified: 0, addressed: 3 });
    expect(scorecard.layers.humanFactors).toEqual({ covered: 1, byOthers: 0, notApplicable: 0, unspecified: 2, addressed: 1 });
    expect(scorecard.layers.compliance.addressed).toBe(1);
    expect(scorecard.layers.environment.addressed).toBe(1);
    expect(scorecard.layers.assurance.addressed).toBe(1);
    expect(scorecard.layers.controlExperience.addressed).toBe(0);
  });

  it("fails only layers measured below their floor and ignores layers without one", () => {
    const scorecard = buildCoverageScorecard(Object.values(stubScorer), (template) => template);
    expect(floorViolations(scorecard, { layers: { transport: 3, humanFactors: 2 } })).toEqual([
      { layer: "humanFactors", floor: 2, measured: 1 },
    ]);
    expect(floorViolations(scorecard, { layers: { transport: 2, humanFactors: 1, compliance: 1 } })).toEqual([]);
    expect(floorViolations(scorecard, {})).toEqual([]);
  });

  it("reports stale floors only when every layer sits exactly at its floor", () => {
    const scorecard = buildCoverageScorecard(Object.values(stubScorer), (template) => template);
    expect(floorsAreStale(scorecard, { layers: { transport: 3, humanFactors: 1, controlExperience: 0, environment: 1, assurance: 1, compliance: 1 } })).toBe(true);
    expect(floorsAreStale(scorecard, { layers: { transport: 3, humanFactors: 0, controlExperience: 0, environment: 1, assurance: 1, compliance: 1 } })).toBe(false);
    expect(floorsAreStale(scorecard, {})).toBe(false);
  });

  it("builds a floors document from the measured scorecard for baseline refreshes", () => {
    const scorecard = buildCoverageScorecard(Object.values(stubScorer), (template) => template);
    const floors = measuredFloors(scorecard);
    expect(floors.layers).toEqual({ transport: 3, humanFactors: 1, controlExperience: 0, environment: 1, assurance: 1, compliance: 1 });
    expect(floors.rule).toContain("falling below any floor fails the gate");
    expect(new Date(floors.updatedAt).toString()).not.toBe("Invalid Date");
  });
});
