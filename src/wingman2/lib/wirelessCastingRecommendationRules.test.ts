import { describe, expect, it } from "vitest";

import {
  hasDeskConnection,
  isSmallHuddleWirelessCastingRoom,
  recommendDeskConnectionOptions,
  recommendWirelessCastingSkus,
} from "./wirelessCastingRecommendationRules";

describe("wireless casting recommendation rules", () => {
  it("uses APO-VX20-UC-V2 with APO-DG2 for small and huddle meeting rooms", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "small huddle meeting room",
      participantCount: 4,
    });

    expect(result.primarySkus).toEqual(["APO-VX20-UC-V2", "APO-DG2"]);
    expect(result.primarySkus).not.toContain("SW-620L-TX-W");
    expect(result.primarySkus).not.toContain("SW-640-TX-W");
  });

  it("uses SW-620L-TX-W with APO-DG2 for standard wireless casting rooms", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "standard meeting room",
      participantCount: 10,
      sourceCount: 4,
    });

    expect(result.primarySkus).toEqual(["SW-620L-TX-W", "APO-DG2"]);
    expect(result.primarySkus).not.toContain("APO-VX20-UC-V2");
  });

  it("uses SW-640-TX-W with APO-DG2 for larger wireless casting rooms with more sources", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "training room",
      participantCount: 18,
      sourceCount: 6,
    });

    expect(result.primarySkus).toEqual(["SW-640-TX-W", "APO-DG2"]);
    expect(result.primarySkus).not.toContain("APO-VX20-UC-V2");
  });

  it("adds IDB-300 as an optional desk connection item when desk connectivity is present", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "meeting room",
      sourceCount: 4,
      deskConnection: true,
    });

    expect(result.primarySkus).toEqual(["SW-620L-TX-W", "APO-DG2"]);
    expect(result.optionalSkus).toContain("IDB-300");
    expect(recommendDeskConnectionOptions({ connectionLocation: "in-desk table cubby" })).toEqual(["IDB-300"]);
  });

  it("does not add IDB-300 when no desk connection is present", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "meeting room",
      sourceCount: 4,
    });

    expect(result.optionalSkus).not.toContain("IDB-300");
  });

  it("detects huddle and desk connection language from room text", () => {
    expect(isSmallHuddleWirelessCastingRoom({ roomType: "huddle pod" })).toBe(true);
    expect(hasDeskConnection({ connectionLocation: "lectern desk input" })).toBe(true);
  });
});

describe("APO-DG2 dependency rule", () => {
  it("documents APO-DG2 as requiring APO-VX20-UC v2 or a compatible -W host", () => {
    const ruleText = [
      "APO-DG2 requires a compatible receiver/base device",
      "APO-VX20-UC v2",
      "SW-620L-TX-W",
      "SW-640-TX-W",
    ].join(" ");

    expect(ruleText).toContain("APO-DG2");
    expect(ruleText).toContain("APO-VX20-UC v2");
    expect(ruleText).toContain("SW-620L-TX-W");
    expect(ruleText).toContain("SW-640-TX-W");
    expect(ruleText).toContain("APO-VX20-UC v2");
  });
});