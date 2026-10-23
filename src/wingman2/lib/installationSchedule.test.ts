import { describe, expect, it } from "vitest";
import {
  buildInstallationSchedule,
  installationLineId,
  installationRate,
  installationTotals,
} from "./installationSchedule";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";

function wall(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return {
    ...defaultWallRequirements,
    application: "lcd-direct",
    layout: "independent",
    columns: 2,
    rows: 1,
    sources: 2,
    windows: 2,
    ...overrides,
  };
}

const details = {
  "source-1": { enclosure: "Rack shelf", termination: "HDMI faceplate", entry: "Rack rear" },
  "source-2": { enclosure: "Rack shelf", termination: "HDMI faceplate", entry: "Rack rear" },
  "display-1": { enclosure: "Back box", mount: "Tilt bracket", termination: "HDMI faceplate", entry: "Floor box" },
  "display-2": { enclosure: "Back box", mount: "Tilt bracket", termination: "HDMI faceplate", entry: "Floor box" },
};

describe("buildInstallationSchedule", () => {
  it("turns the survey's install detail into one line per item, with a quantity", () => {
    const schedule = buildInstallationSchedule(wall({ linkDetails: details }));

    expect(schedule).not.toBeNull();
    expect(schedule!.text).toBe(
      "Installation scope from the site survey: 4 display housings, 2 mounts, 4 terminations, 4 run entries across 4 wall links.",
    );
    expect(schedule!.lines).toEqual([
      { id: "install-enclosure-back-box", category: "enclosure", detail: "Back box", quantity: 2, links: ["Panel 1", "Panel 2"] },
      { id: "install-enclosure-rack-shelf", category: "enclosure", detail: "Rack shelf", quantity: 2, links: ["Source 1", "Source 2"] },
      { id: "install-mount-tilt-bracket", category: "mount", detail: "Tilt bracket", quantity: 2, links: ["Panel 1", "Panel 2"] },
      { id: "install-termination-hdmi-faceplate", category: "termination", detail: "HDMI faceplate", quantity: 4, links: ["Source 1", "Source 2", "Panel 1", "Panel 2"] },
      { id: "install-entry-floor-box", category: "entry", detail: "Floor box", quantity: 2, links: ["Panel 1", "Panel 2"] },
      { id: "install-entry-rack-rear", category: "entry", detail: "Rack rear", quantity: 2, links: ["Source 1", "Source 2"] },
    ]);
  });

  it("does not split one job over casing or extra spacing", () => {
    const schedule = buildInstallationSchedule(wall({
      linkDetails: {
        "source-1": { enclosure: "Back box" },
        "source-2": { enclosure: "  back   BOX " },
        "display-1": { enclosure: "Back box" },
      },
    }));

    expect(schedule!.lines).toHaveLength(1);
    expect(schedule!.lines[0]).toMatchObject({ id: "install-enclosure-back-box", detail: "Back box", quantity: 3 });
  });

  it("prices a line once per item, not once per link", () => {
    const schedule = buildInstallationSchedule(wall({ linkDetails: details }))!;
    const totals = installationTotals(schedule, { "install-enclosure-back-box": "120", "install-enclosure-rack-shelf": "80" });

    expect(totals.lines.find((line) => line.id === "install-enclosure-back-box")).toMatchObject({ unit: 120, total: 240 });
    expect(totals.lines.find((line) => line.id === "install-mount-tilt-bracket")).toMatchObject({ unit: null, total: null });
    expect(totals.priced).toBe(2);
    expect(totals.complete).toBe(false);
    // An incomplete set sums what is priced; it never pretends to be the total.
    expect(totals.total).toBe(400);
  });

  it("counts a zero rate as priced, exactly as an equipment price of zero is", () => {
    const schedule = buildInstallationSchedule(wall({ linkDetails: details }))!;
    const priced = Object.fromEntries(schedule.lines.map((line) => [line.id, "0"]));

    expect(installationRate(schedule.lines[0], priced)).toBe(0);
    expect(installationTotals(schedule, priced)).toMatchObject({ complete: true, total: 0, priced: 6 });
  });

  it("has nothing to schedule without costable links or recorded detail", () => {
    expect(buildInstallationSchedule(null)).toBeNull();
    expect(buildInstallationSchedule(wall())).toBeNull();
    // A mount on its own is scope; a summary with no link list is not.
    const legacy = { ...wall({ linkDetails: details }), sourceLocation: undefined } as unknown as WallRequirements;
    expect(buildInstallationSchedule(legacy)).toBeNull();
  });

  it("files a rate under an id that survives the details being re-typed", () => {
    expect(installationLineId("enclosure", "Back box")).toBe("install-enclosure-back-box");
    expect(installationLineId("termination", "  HDMI/faceplate ")).toBe("install-termination-hdmi-faceplate");
    // The run-entry cell files under its own category, so its rate is its own line.
    expect(installationLineId("entry", "Floor box")).toBe("install-entry-floor-box");
  });
});
