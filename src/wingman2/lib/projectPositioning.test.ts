import { describe, expect, it } from "vitest";
import { projectPositioning, projectPositioningLine } from "./projectPositioning";

describe("projectPositioning", () => {
  it("reports both halves when the brief has no room model", () => {
    expect(projectPositioning(undefined)).toEqual({
      market: "",
      environment: "",
      missing: ["market", "environment"],
    });
  });

  it("reports both halves when the lead-in saved neither label", () => {
    expect(projectPositioning({ roomModel: {} }).missing).toEqual(["market", "environment"]);
  });

  it("keeps the market a template preset named and reports the space", () => {
    expect(projectPositioning({ roomModel: { market: "Corporate" } })).toEqual({
      market: "Corporate",
      environment: "",
      missing: ["environment"],
    });
  });

  it("reads a chosen 'not sure' label as recorded", () => {
    const positioning = projectPositioning({
      roomModel: { market: "Other / not sure", environment: "Meeting room" },
    });
    expect(positioning.missing).toEqual([]);
    expect(positioning.market).toBe("Other / not sure");
  });

  it("treats a blank label as missing rather than as a name", () => {
    expect(projectPositioning({ roomModel: { market: "  ", environment: "Meeting room" } }).missing)
      .toEqual(["market"]);
  });
});

describe("projectPositioningLine", () => {
  it("reads the pair the lead-in recorded as one line", () => {
    expect(projectPositioningLine({ market: "Corporate", environment: "Meeting room" }))
      .toBe("Market: Corporate · Environment: Meeting room");
  });

  it("keeps a half the lead-in never recorded in its own place in the line", () => {
    // The same two slots either way, so a note about a missing half and a
    // positioned room are one shape to read rather than two.
    expect(projectPositioningLine({ market: "Corporate", environment: "" }))
      .toBe("Market: Corporate · Environment: not recorded");
    expect(projectPositioningLine({ market: "", environment: "" }))
      .toBe("Market: not recorded · Environment: not recorded");
  });
});
