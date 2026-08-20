import { describe, expect, it } from "vitest";
import { assessCompetitorConnectorCoverage } from "./ComparePageNew.advanced";

describe("competitor connector coverage", () => {
  it("keeps balanced HDMI plus DVI/VGA I/O viable while disclosing the gaps", () => {
    const result = assessCompetitorConnectorCoverage({
      inputFamilies: ["HDMI", "DVI", "VGA"],
      outputFamilies: ["HDMI"],
      additionalVideoFamilies: ["DVI", "VGA"],
      waivedAdditionalVideoFamilies: [],
    });

    expect(result.unsupportedFamilies).toEqual(["DVI", "VGA"]);
    expect(result.predominantlyUnsupported).toBe(false);
  });

  it("keeps additional SDI as a disclosed gap when supported families predominate", () => {
    const result = assessCompetitorConnectorCoverage({
      inputFamilies: ["HDMI", "USB-C", "SDI"],
      outputFamilies: ["HDMI", "HDBaseT/TPS"],
      additionalVideoFamilies: ["SDI"],
      waivedAdditionalVideoFamilies: [],
    });

    expect(result.supportedFamilies).toEqual(["HDMI", "USB-C", "HDBaseT/TPS"]);
    expect(result.predominantlyUnsupported).toBe(false);
  });

  it("rejects a product whose video I/O has no native WyreStorm family", () => {
    const result = assessCompetitorConnectorCoverage({
      inputFamilies: ["DVI", "VGA"],
      outputFamilies: ["SDI"],
      additionalVideoFamilies: ["DVI", "VGA", "SDI"],
      waivedAdditionalVideoFamilies: [],
    });

    expect(result.supportedFamilies).toEqual([]);
    expect(result.predominantlyUnsupported).toBe(true);
  });
});
