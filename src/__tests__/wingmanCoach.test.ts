import { describe, expect, it } from "vitest";

import { buildWingmanCoachState } from "@/wingman2/lib/wingmanCoach";

describe("buildWingmanCoachState", () => {
  it("gives internal distributor coaching that highlights attachment opportunities", () => {
    const coach = buildWingmanCoachState({
      audience: "internal",
      discovery: {
        application: "Sports bar LED wall refresh",
        displays: "Main LED wall with side screens",
        sourceDevices: "Sky boxes and signage player",
      },
      visibleMatches: [
        {
          sku: "SW-0206-VW",
          title: "Video wall processor",
        },
      ],
    });

    expect(coach.audienceLabel).toBe("Internal account manager");
    expect(coach.playback).toContain("internal distributor account manager");
    expect(coach.playback).toContain("LED");
    expect(coach.proposalOutputs.find((item) => item.audience === "internal")?.summary).toContain("attachment opportunities");
  });
});
