import { describe, expect, it } from "vitest";
import { decideVideowall } from "./videowallDecision";
import { assessVideowallOptions, defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { wallOptionWithVariant } from "./wallVariants";
import { wallDesignClipboard } from "./wallDesignClipboard";

const requirements: WallRequirements = { ...defaultWallRequirements, columns: 2, rows: 2, sources: 4 };

describe("wallDesignClipboard", () => {
  it("pastes the design as it would be ordered, build included", () => {
    const options = assessVideowallOptions(requirements);
    const option = wallOptionWithVariant(options.find((entry) => entry.id === "nhd500")!, "lite");
    const text = wallDesignClipboard({
      requirements,
      option,
      decision: decideVideowall(requirements),
      resolutionText: "canvas 3840 × 2160",
      canvasRationale: "match the canvas to the source",
      transportHeadline: "4 display links",
      transportFlags: [],
      surveyWarning: null,
      concernChecks: ["Confirm HDCP end to end."],
    });

    expect(text).toContain("2 × 2 array; 4 sources");
    expect(text).toContain("NetworkHD 500");
    // The build's own part numbers, not the catalogue pair.
    expect(text).toContain("NHD-500-E-TX");
    expect(text).not.toContain("NHD-500-TX ");
    expect(text).toContain("Confirm HDCP end to end.");
    expect(text).toContain("Signal path:");
  });

  it("carries the open survey shortfall when one is not closed", () => {
    const options = assessVideowallOptions(requirements);
    const text = wallDesignClipboard({
      requirements,
      option: options.find((entry) => entry.id === "nhd500")!,
      decision: decideVideowall(requirements),
      resolutionText: "",
      canvasRationale: "",
      transportHeadline: "",
      transportFlags: [],
      surveyWarning: "2 of 4 links are missing a termination.",
      concernChecks: [],
    });

    expect(text).toContain("2 of 4 links are missing a termination.");
  });
});
