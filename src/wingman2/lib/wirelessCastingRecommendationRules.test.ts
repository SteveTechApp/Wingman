import { describe, expect, it } from "vitest";

import {
  hasDeskConnection,
  isSmallHuddleWirelessCastingRoom,
  recommendDeskConnectionOptions,
  recommendWirelessCastingSkus,
} from "./wirelessCastingRecommendationRules";

describe("wireless casting recommendation rules", () => {
  it("uses APO-210-UC with APO-DG2 for small and huddle meeting rooms", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "small huddle meeting room",
      participantCount: 4,
    });

    expect(result.primarySkus).toEqual(["APO-210-UC", "APO-DG2"]);
    expect(result.primarySkus).not.toContain("SW-620-TX-W");
    expect(result.primarySkus).not.toContain("SW-640-TX-W");
  });

  it("uses SW-620-TX-W with APO-DG2 for standard wireless casting rooms", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "standard meeting room",
      participantCount: 10,
      sourceCount: 4,
    });

    expect(result.primarySkus).toEqual(["SW-620-TX-W", "APO-DG2"]);
    expect(result.primarySkus).not.toContain("APO-210-UC");
  });

  it("uses SW-640-TX-W with APO-DG2 for larger wireless casting rooms with more sources", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "training room",
      participantCount: 18,
      sourceCount: 6,
    });

    expect(result.primarySkus).toEqual(["SW-640-TX-W", "APO-DG2"]);
    expect(result.primarySkus).not.toContain("APO-210-UC");
  });

  it("adds IDB-300 as an optional desk connection item when desk connectivity is present", () => {
    const result = recommendWirelessCastingSkus({
      roomType: "meeting room",
      sourceCount: 4,
      deskConnection: true,
    });

    expect(result.primarySkus).toEqual(["SW-620-TX-W", "APO-DG2"]);
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
