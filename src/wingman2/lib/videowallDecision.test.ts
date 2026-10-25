import { describe, expect, it } from "vitest";
import {
  decideVideowall,
  wallDecisionSummary,
  wallFamilyProfiles,
  wallLayoutChoices,
  wallPreferenceOrder,
  wallStartPresetFacts,
  wallStartPresetGroups,
  wallStartPresetShortlist,
  wallStartPresetShortlistCoverage,
  wallStartPresetShortlistKeys,
  wallStartPresets,
  wallPresetTransportOf,
} from "./videowallDecision";
import { assessVideowallOptions, defaultWallRequirements, validateWallRequirements, type WallRequirements } from "./videowallOptions";

const decide = (changes: Partial<WallRequirements> = {}) =>
  decideVideowall({ ...defaultWallRequirements, ...changes });

function viableIds(requirements: WallRequirements) {
  return assessVideowallOptions(requirements)
    .filter((option) => option.blockers.length === 0)
    .map((option) => option.id);
}

describe("videowall decision", () => {
  it("leads with the purpose-built wall processor for a single local source", () => {
    const decision = decide({ sources: 1 });
    expect(decision.recommended?.option.id).toBe("sw-0204-vw");
    expect(decision.recommended?.family.family).toBe("dedicated-wall");
    expect(decision.alternative?.option.id).toBe("mx-0404-scl");
    expect(decision.confidence).not.toBe("blocked");
  });

  it("prefers the simplest local design over AV over IP when both fit", () => {
    const decision = decide();
    expect(decision.recommended?.option.id).toBe("mx-0404-scl");
    expect(decision.recommended?.family.family).toBe("local-switch");
    expect(decision.recommended?.reasons.join(" ")).toContain("no AV network");
  });

  it("moves to network transport when the sources are distributed", () => {
    const decision = decide({ sources: 2, sourceLocation: "distributed" });
    expect(decision.recommended?.option.id).toBe("nhd500");
    expect(decision.recommended?.option.path.join(" ")).toContain("500-series receivers");
    expect(decision.recommended?.option.equipment).toEqual(
      expect.arrayContaining([expect.objectContaining({ sku: "NHD-500-RX", quantity: 4 })]),
    );
    expect(decision.alternative?.family.family).toBe("avoip-10g");
  });

  it("leads with the low-bandwidth multiview receiver for nine 1080p windows", () => {
    const decision = decide({
      application: "lcd-loop",
      columns: 3,
      rows: 3,
      sources: 9,
      windows: 9,
      layout: "nine",
      sourceResolution: "1080p",
    });
    expect(decision.recommended?.option.id).toBe("nhd150");
    expect(decision.alternative?.option.id).toBe("nhd600");
    expect(decision.confidence).toBe("clear");
  });

  it("never recommends a design that fails the captured requirements", () => {
    const scenarios: Partial<WallRequirements>[] = [
      {},
      { sources: 1 },
      { sources: 16, layout: "custom", windows: 16 },
      { columns: 4, rows: 4, sources: 12 },
      { sourceLocation: "distributed", layout: "quad", windows: 4 },
      { network: "none" },
      { network: "10g" },
      { application: "led", sources: 6, layout: "nine", windows: 9, sourceResolution: "1080p" },
      { application: "projection", sources: 2 },
    ];

    for (const changes of scenarios) {
      const requirements = { ...defaultWallRequirements, ...changes };
      const decision = decideVideowall(requirements);
      const viable = viableIds(requirements);

      if (decision.recommended) expect(viable).toContain(decision.recommended.option.id);
      if (decision.alternative) expect(viable).toContain(decision.alternative.option.id);
      expect(decision.ruledOut.every((entry) => entry.id !== decision.recommended?.option.id)).toBe(true);
    }
  });

  it("always pairs the lead with a different architecture", () => {
    for (const changes of [{}, { sources: 1 }, { sources: 2, sourceLocation: "distributed" as const }, { network: "10g" as const }]) {
      const decision = decide(changes);
      if (decision.alternative) {
        expect(decision.alternative.family.family).not.toBe(decision.recommended?.family.family);
        expect(decision.alternative.when).toMatch(/^Choose this if /);
      }
    }
  });

  it("explains every rejected design with the requirement it breaks", () => {
    const decision = decide({ columns: 3, rows: 3, sources: 6 });
    const rejected = decision.ruledOut.filter((entry) => !entry.fits);
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((entry) => entry.reason.length > 12 && entry.title.length > 0)).toBe(true);
    expect(decision.ruledOut.find((entry) => entry.id === "mx-0404-scl")?.reason).toContain("4 physical inputs");
  });

  it("turns a dead end into the one decision that opens the catalogue", () => {
    const decision = decide({ layout: "quad", windows: 4 });
    expect(decision.confidence).toBe("blocked");
    expect(decision.recommended).toBeNull();
    expect(decision.unblockers.length).toBeGreaterThan(0);
    expect(decision.unblockers.length).toBeLessThanOrEqual(3);

    for (const unblocker of decision.unblockers) {
      expect(unblocker.unlocks).toBeGreaterThan(0);
      expect(viableIds(unblocker.next).length).toBe(unblocker.unlocks);
      expect(unblocker.label).toMatch(/[A-Z]/);
      expect(decideVideowall(unblocker.next).recommended).not.toBeNull();
    }
    expect(wallDecisionSummary(decision)).toContain("opens");
  });

  it("recommends a design that feeds displays individually or in groups", () => {
    const grouped: WallRequirements = {
      ...defaultWallRequirements,
      application: "lcd-grouped",
      columns: 3,
      rows: 3,
      sources: 4,
      windows: 1,
      layout: "single",
      displayFeeds: 3,
    };
    const decision = decideVideowall(grouped);

    expect(decision.confidence).not.toBe("blocked");
    // The reasons name the wiring, so the rep can read which panels share a feed.
    expect(decision.recommended?.reasons.join(" ")).toContain("Feed 1 · panels 1–3");
    expect(decision.recommended?.reasons.join(" ")).toContain("3 feeds");
  });

  it("offers a grouped wall as a decision when a per-panel composition is a dead end", () => {
    const decision = decide({ layout: "quad", windows: 4 });

    expect(decision.confidence).toBe("blocked");
    const grouped = decision.unblockers.find((unblocker) => unblocker.next.application === "lcd-grouped");
    expect(grouped?.label).toBe("Drive displays individually or in groups");
    // The change keeps the four-window composition the rep asked for.
    expect(grouped?.next.layout).toBe("quad");
    expect(grouped?.unlocks).toBeGreaterThan(0);
  });

  it("keeps unblockers out of a working recommendation so the answer stays decisive", () => {
    expect(decide().unblockers).toEqual([]);
    expect(decide({ sources: 1 }).unblockers).toEqual([]);
  });

  it("summarises the narrowing in plain language", () => {
    const single = decide({ sources: 4, network: "none" });
    expect(single.confidence).toBe("single");
    expect(wallDecisionSummary(single)).toContain("One architecture fits");

    const clear = decide({ sources: 2, sourceLocation: "distributed" });
    expect(wallDecisionSummary(clear)).toContain("Two architectures fit");

    const open = decide();
    expect(wallDecisionSummary(open)).toContain("architectures fit");
  });

  it("orders preferences with local designs first and respects the network", () => {
    const local = wallPreferenceOrder(defaultWallRequirements);
    expect(local[0]).toBe("sw-0204-vw");
    expect(local.indexOf("mx-0404-scl")).toBeLessThan(local.indexOf("nhd500"));

    const remote = wallPreferenceOrder({ ...defaultWallRequirements, sourceLocation: "distributed" });
    expect(remote[0]).toBe("nhd500");
    expect(remote.indexOf("nhd500")).toBeLessThan(remote.indexOf("mx-0404-scl"));
  });

  it("labels every catalogued design with an architecture family", () => {
    for (const option of assessVideowallOptions(defaultWallRequirements)) {
      expect(wallFamilyProfiles[option.id]).toBeDefined();
      expect(wallFamilyProfiles[option.id].rationale.length).toBeGreaterThan(20);
    }
  });
  it("lands every common wall preset on a recommendation", () => {
    for (const preset of wallStartPresets) {
      expect(validateWallRequirements(preset.requirements)).toEqual([]);
      const decision = decideVideowall(preset.requirements);
      expect(decision.confidence).not.toBe("blocked");
      expect(decision.recommended).not.toBeNull();
      expect(wallDecisionSummary(decision)).not.toContain("do not meet");
    }
  });
  it("reaches every catalogued product from a shipped wall", () => {
    // A wall the picker cannot offer is a product combination the builder never
    // quotes, so the briefs have to cover the whole option catalogue.
    const catalogued = assessVideowallOptions(defaultWallRequirements).map((option) => option.id);
    const reached = new Set(wallStartPresets.map((preset) => decideVideowall(preset.requirements).recommended?.option.id));
    expect(catalogued.filter((id) => !reached.has(id))).toEqual([]);
  });
  it("names the architecture every preset actually reaches", () => {
    for (const preset of wallStartPresets) {
      const decision = decideVideowall(preset.requirements);
      expect(decision.recommended?.family.label).toBe(preset.leadsTo);
      expect(preset.leadsTo).not.toBe("Requirement change needed");
      // The picker filters on this bucket, so it must be read from the same
      // family the card names rather than typed onto the brief.
      expect(preset.transport).toBe(wallPresetTransportOf(decision.recommended?.family.family));
      expect(preset.transport).not.toBeNull();
    }
  });
  it("routes a drag-and-drop LED wall to the sixteen-window processor", () => {
    const preset = wallStartPresets.find((entry) => entry.key === "led-floating-windows");
    expect(preset).toBeDefined();
    expect(preset!.requirements.customMode).toBe("floating");
    expect(decideVideowall(preset!.requirements).recommended?.option.id).toBe("nhd150");
  });
  it("routes a sixteen-window LED wall to the multi-window processor", () => {
    const preset = wallStartPresets.find((entry) => entry.key === "led-fixed-windows");
    expect(preset).toBeDefined();
    expect(preset!.requirements.windows).toBe(16);
    expect(decideVideowall(preset!.requirements).recommended?.option.id).toBe("nhd600");
  });
  it("routes a two-projector screen to the matrix that splits one picture across both", () => {
    const preset = wallStartPresets.find((entry) => entry.key === "projector-pair");
    expect(preset).toBeDefined();
    expect(preset!.family).toBe("projection");
    expect(preset!.requirements.projectors).toBe(2);
    const decision = decideVideowall(preset!.requirements);
    // One local box spreads the selected picture across two outputs, so neither
    // projector has to invent its half of the canvas.
    expect(decision.recommended?.option.id).toBe("mx-0404-scl");
    expect(decision.recommended?.option.path.at(-1)).toBe("2 HDMI outputs → 2 projectors, one canvas slice each");
    expect(preset!.leadsTo).toBe("Local matrix");
    expect(wallStartPresetFacts(preset!)).toContain("2 × 86 in projectors");
    expect(decision.confidence).not.toBe("blocked");
  });
  it("rules out a single composed output for a two-projector screen", () => {
    // Four windows across two projectors needs a composition split across both
    // outputs; every catalogued design ends in one picture, so the engine says
    // so and offers the decision that opens the field rather than pretending.
    const pair: Partial<WallRequirements> = {
      application: "projection",
      projectors: 2,
      sources: 4,
      layout: "quad",
      windows: 4,
    };
    const decision = decide(pair);
    expect(decision.confidence).toBe("blocked");
    expect(decision.unblockers.length).toBeGreaterThan(0);
    const multiview = assessVideowallOptions({ ...defaultWallRequirements, ...pair })
      .find((option) => option.id === "hdmi-multiview")!;
    expect(multiview.blockers.join(" ")).toContain("2 projectors each need their own slice");
  });
  it("groups every preset by how the wall is built", () => {
    expect(wallStartPresetGroups.map((group) => group.family)).toEqual(["lcd", "led", "projection"]);
    expect(wallStartPresetGroups.flatMap((group) => group.presets)).toHaveLength(wallStartPresets.length);
    for (const group of wallStartPresetGroups) {
      expect(group.presets.length).toBeGreaterThan(0);
      expect(group.presets.every((preset) => preset.family === group.family)).toBe(true);
    }
  });
  it("keeps the guided step's shortlist curated and within the catalogue", () => {
    const coverage = wallStartPresetShortlistCoverage();

    // Every key names a shipped wall, so a renamed or retired brief drops out
    // rather than rendering a row for a wall that no longer exists.
    expect(coverage.unknownKeys).toEqual([]);
    expect(coverage.curated).toBe(wallStartPresetShortlistKeys.length);
    // Every family stays on screen while the list is folded, so no band goes
    // missing for the rep who picks by construction.
    expect(coverage.families).toEqual({ lcd: 3, led: 1, projection: 2 });
    // A shortlist, not a second catalogue.
    expect(coverage.curated).toBeLessThan(coverage.catalogue / 2);
  });
  it("names each wall by what it does, not the room it is sold into", () => {
    const room = /reception|control room|boardroom|retail|classroom|lobby|huddle|showroom/i;
    for (const preset of wallStartPresets) {
      expect(`${preset.label} ${preset.detail}`).not.toMatch(room);
    }
  });
  it("summarises the numbers a rep compares on a picker card", () => {
    const nine = wallStartPresets.find((preset) => preset.key === "nine-feeds")!;
    expect(wallStartPresetFacts(nine)).toBe(`3 × 3 (9 panels) · 9 windows · ${nine.leadsTo}`);
    const perPanel = wallStartPresets.find((preset) => preset.key === "per-panel")!;
    expect(wallStartPresetFacts(perPanel)).toContain("One source per panel");
    const canvas = wallStartPresets.find((preset) => preset.key === "led-canvas")!;
    expect(wallStartPresetFacts(canvas)).toContain("3840 × 2160 canvas");
    const projector = wallStartPresets.find((preset) => preset.key === "projector-quad")!;
    expect(wallStartPresetFacts(projector)).toContain("86 in screen");
  });
  it("routes custom layouts by placement method", () => {
    const base = {
      application: "led" as const,
      layout: "custom" as const,
      windows: 4,
      sources: 4,
      sourceResolution: "1080p" as const,
    };
    const fixed = decide(base);
    expect(fixed.recommended?.option.id).toBe("nhd600");
    expect(fixed.recommended?.reasons.join(" ")).toContain("X/Y pixel");

    const floating = decide({ ...base, customMode: "floating" });
    expect(floating.recommended?.option.id).toBe("nhd150");
    expect(floating.recommended?.reasons.join(" ")).toContain("drag and drop");
    expect(floating.confidence).toBe("single");
    expect(wallDecisionSummary(floating)).toContain("One architecture fits");
  });

  it("offers both custom placement methods only on a composed canvas", () => {
    const custom = wallLayoutChoices.filter(choice => choice.value === "custom");
    expect(custom.map(choice => choice.customMode)).toEqual(["fixed", "floating"]);
    expect(custom.every(choice => choice.applications?.includes("led") && choice.applications?.includes("lcd-loop"))).toBe(true);
    expect(custom.every(choice => !choice.applications?.includes("lcd-direct"))).toBe(true);
  });
  it("offers to keep the chosen composition before abandoning it", () => {
    const blocked = decide({
      application: "led",
      layout: "custom",
      customMode: "floating",
      windows: 4,
      sources: 4,
      sourceResolution: "4k60",
    });
    expect(blocked.confidence).toBe("blocked");
    expect(blocked.unblockers[0].label).toBe("Step the sources down to 1080p");
    expect(blocked.unblockers[0].keepsComposition).toBe(true);
    expect(decideVideowall(blocked.unblockers[0].next).recommended?.option.id).toBe("nhd150");
  });
});
