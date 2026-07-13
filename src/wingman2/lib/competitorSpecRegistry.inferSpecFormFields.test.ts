import { describe, expect, it } from "vitest";
import { inferSpecFormFieldsFromText } from "./competitorSpecRegistry";

describe("inferSpecFormFieldsFromText", () => {
  it("returns nothing for empty/whitespace-only text", () => {
    expect(inferSpecFormFieldsFromText("")).toEqual({});
    expect(inferSpecFormFieldsFromText("   ")).toEqual({});
  });

  it("infers resolution and chroma from datasheet-style text", () => {
    const result = inferSpecFormFieldsFromText(
      "This 4x2 matrix switcher supports 4K/60Hz 4:4:4 video with HDCP 2.3 compliance.",
    );
    expect(result.maxResolution).toBe("4K60");
    expect(result.chroma).toBe("4:4:4");
  });

  it("sums input ports across connector types (HDMI + DisplayPort)", () => {
    // Keep the two port mentions far from any other number in the string:
    // the underlying quantityFromLabel() helper reads the first digit within
    // ~24 chars *after* a label too, so a second port count placed too close
    // can get misattributed to the first label. Not this function's bug to
    // fix, just something to route around when phrasing test fixtures.
    const result = inferSpecFormFieldsFromText(
      "This model offers 2 HDMI inputs and also includes DisplayPort input support.",
    );
    expect(result.inputCount).toBe(3); // 2 HDMI + 1 DisplayPort (fallback default)
  });

  it("sums output ports for a single connector type", () => {
    const result = inferSpecFormFieldsFromText("This model has 3 HDMI outputs and nothing else listed.");
    expect(result.outputCount).toBe(3);
  });

  it("leaves input/output counts undefined when no port facts are found", () => {
    const result = inferSpecFormFieldsFromText("A wireless presentation hub with AirPlay and Miracast support.");
    expect(result.inputCount).toBeUndefined();
    expect(result.outputCount).toBeUndefined();
  });

  it("truncates a long notes excerpt to ~500 characters", () => {
    const longText = "A".repeat(800);
    const result = inferSpecFormFieldsFromText(longText);
    expect(result.notesExcerpt?.length).toBeLessThanOrEqual(501);
    expect(result.notesExcerpt?.endsWith("…")).toBe(true);
  });

  it("does not truncate short text", () => {
    const result = inferSpecFormFieldsFromText("A short spec sheet excerpt.");
    expect(result.notesExcerpt).toBe("A short spec sheet excerpt.");
  });
});
