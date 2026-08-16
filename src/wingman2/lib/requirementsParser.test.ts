import { describe, expect, it } from "vitest";
import { analyzeRequirementsText, buildUnknowns, extractRequirementsFromText } from "./requirementsParser";

function counts(text: string): { sources?: string; displays?: string } {
  const requirements = extractRequirementsFromText(text);
  const source = requirements.find((item) => /source\/input position/.test(item));
  const display = requirements.find((item) => /display\/output position/.test(item));
  return {
    sources: source?.replace(/ source\/input position\(s\) mentioned\.?/i, ""),
    displays: display?.replace(/ display\/output position\(s\) mentioned\.?/i, ""),
  };
}

describe("requirements parser count vocabulary", () => {
  it("reads x-notation with a connector prefix (tender spec phrasing)", () => {
    expect(counts("We need 2x HDMI inputs and 1x 4K display.")).toEqual({ sources: "2", displays: "1" });
  });

  it("reads plain count phrasing", () => {
    expect(counts("We need a boardroom with 4 laptops and 2 displays.")).toEqual({ sources: "4", displays: "2" });
  });

  it("reads sources and screens vocabulary without connectors", () => {
    expect(counts("3 sources to 4 screens via HDMI.")).toEqual({ sources: "3", displays: "4" });
  });

  it("reads word-form numbers", () => {
    expect(counts("two projectors and four HDMI inputs.")).toEqual({ sources: "4", displays: "2" });
  });

  it("does not treat HDMI/DP versions as quantities", () => {
    expect(counts("HDMI 2.0 and DisplayPort 1.4 output to a single display.")).toEqual({
      sources: undefined,
      displays: undefined,
    });
  });

  it("does not treat a bare 4K display as four displays", () => {
    expect(counts("Supply one 4K display for the meeting room.")).toEqual({ sources: undefined, displays: "1" });
  });
});

describe("requirements parser unknowns stay consistent with extraction", () => {
  it("stops asking for counts once they are stated in x-notation", () => {
    const result = analyzeRequirementsText("Supply 2x HDMI inputs, 1x display, HDBaseT to 100m");
    expect(result.unknowns).not.toContain("Confirm source/input count.");
    expect(result.unknowns).not.toContain("Confirm display/output count.");
    expect(result.requirements.join(" ")).toMatch(/2 source\/input/);
    expect(result.requirements.join(" ")).toMatch(/1 display\/output/);
  });

  it("still asks for missing counts", () => {
    const unknowns = buildUnknowns("meeting room with an unspecified number of screens");
    expect(unknowns).toContain("Confirm source/input count.");
    expect(unknowns).toContain("Confirm display/output count.");
  });

  it("keeps the no-requirements fallback for genuinely empty input", () => {
    const result = analyzeRequirementsText("The customer would like a system installed.");
    expect(result.requirements[0]).toBe("No structured AV requirements were detected in readable text yet.");
  });
});
