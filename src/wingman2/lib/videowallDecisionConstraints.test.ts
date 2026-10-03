import { describe, expect, it } from "vitest";
import { evaluateVideowallDecisionConstraints, type VideowallDecisionState } from "./videowallDecisionConstraints";

function state(overrides: Partial<VideowallDecisionState> = {}): VideowallDecisionState {
  return {
    wallType: "led",
    led: { behaviour: "", windows: "", sourceLocation: "" },
    lcd: { screenCount: "", driveMethod: "", sourceCount: "", sourceLocation: "", behaviour: "" },
    ...overrides,
  };
}

describe("videowall decision constraints", () => {
  it("blocks custom drag-and-drop with more than nine windows without changing either decision", () => {
    const decisions = state({
      led: { behaviour: "custom-windows", windows: "more-than-nine", sourceLocation: "distributed" },
    });

    expect(evaluateVideowallDecisionConstraints(decisions)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "led-custom-window-capacity", severity: "blocking" })]),
    );
    expect(decisions.led.behaviour).toBe("custom-windows");
    expect(decisions.led.windows).toBe("more-than-nine");
  });

  it("accepts the supported six-window custom mode", () => {
    const decisions = state({
      led: { behaviour: "custom-windows", windows: "floating-six", sourceLocation: "distributed" },
    });

    expect(evaluateVideowallDecisionConstraints(decisions)).toEqual([]);
  });

  it("blocks independent LCD content when tile mode was selected first", () => {
    const decisions = state({
      wallType: "lcd",
      lcd: { screenCount: "four", driveMethod: "tile-mode", sourceCount: "two", sourceLocation: "local", behaviour: "different-per-display" },
    });

    expect(evaluateVideowallDecisionConstraints(decisions)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "lcd-tile-independent-content", severity: "blocking" })]),
    );
  });
});
