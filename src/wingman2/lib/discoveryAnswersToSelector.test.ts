import { describe, expect, it } from "vitest";
import { discoveryBriefToFinderNeed } from "../data/workflowHandoff";
import type { StoredDiscoveryBrief } from "../features/projects/model/projectTypes";
import {
  classifyWingmanProduct,
  isWingmanProductEligibleForFinderNeed,
  matchedGateReasons,
  micFeedGateReason,
  resolutionGateReason,
} from "./productClassification";
import { recommendationSlotRequest, resolveRecommendationSystemSlots } from "./recommendationsDecisionBoundary";
import { buildDiscoveryBriefFromState } from "../data/workflowHandoff";
import { signalQualityTags } from "../pages/discovery/discoveryAnswerUtils";
import { selectWingmanProducts } from "./productSelectorEngine";
import { fullProductIndexRecords } from "./testHelpers/fullProductIndexRecords";

// The three Discovery answers that used to reach nothing: picture quality, the
// multiview destinations, and the microphone feed count. Each one is asserted
// where a rep meets it — the selector's eligibility and the role shortlist.

function brief(roomModel: Record<string, unknown>): StoredDiscoveryBrief {
  return {
    savedAt: "2026-10-31T00:00:00.000Z",
    capturedPercent: 100,
    inference: {},
    roomModel,
  } as StoredDiscoveryBrief;
}

function product(sku: string) {
  const found = fullProductIndexRecords.find((entry) => String(entry.sku) === sku);
  expect(found, `${sku} is a real catalogue row`).toBeTruthy();
  return found as Record<string, unknown>;
}

const routingRoom = {
  roomType: "Multi-room routing",
  application: "Multi-room routing",
  outcome: "Route several sources to several displays across zones.",
  sourceCount: "5-8 sources",
  displayCount: "3-8 displays / outputs",
  displayBehaviour: "Different content by display or zone",
  cableRun: "35-70m",
};

function slotsFor(roomModel: Record<string, unknown>) {
  const pool = selectWingmanProducts(fullProductIndexRecords as never, recommendationSlotRequest());
  return resolveRecommendationSystemSlots(brief(roomModel), pool as never).systemSlots;
}

describe("Discovery answers reach the product selector", () => {
  it("carries picture quality, multiview destinations and microphone feeds into the need", () => {
    const need = discoveryBriefToFinderNeed(
      brief({
        ...routingRoom,
        signalStandard: "Premium 4K with HDR (4K60 HDR / HDCP-sensitive)",
        multiviewDestinations: ["LCD video wall", "Confidence or operator monitor"],
        multiviewOperation: ["Fixed named layouts or presets"],
        microphoneCount: "5–8 feeds or pickup zones",
      }),
    );

    // HDR is an HDR/HDCP demand on top of 4K60, not a 4:4:4-only path: 10-bit
    // HDR fits the same 18Gbps ceiling most 4K60 switchers evidence.
    expect(need?.resolution).toBe("4K60");
    expect(need?.processing).toBe("Multiview");
    // A band is a ceiling, so the need carries its floor.
    expect(need?.microphones).toBe("5");
  });

  it("carries the premium picture-quality answer's checks into the evidence", () => {
    const briefFor = (signalStandard: string) =>
      buildDiscoveryBriefFromState(
        {
          outcome: "Teaching room",
          signalStandard,
          downstreamQualityTags: signalQualityTags(signalStandard),
        },
        { designDirection: "Matrix routing", confidence: "medium", missingItems: [], capturedPercent: 100 },
      );

    // The option prints "4K60 HDR / HDCP-sensitive", never "HDR10", which is
    // why these checks were reachable from no answer at all.
    expect(briefFor("Premium 4K with HDR (4K60 HDR / HDCP-sensitive)").inference?.evidence)
      .toContain("Validate HDMI bandwidth / 18Gbps-class or better");
    expect(briefFor("Standard 4K (4K60 / standard 4K)").inference?.evidence)
      .not.toContain("Validate HDMI bandwidth / 18Gbps-class or better");
  });

  it("leaves a dimension unanswered instead of inventing a requirement", () => {
    const need = discoveryBriefToFinderNeed(
      brief({
        ...routingRoom,
        signalStandard: "Unknown — picture quality",
        multiviewDestinations: ["Not yet confirmed — multiview destination"],
        multiviewOperation: ["Not yet confirmed — multiview operation"],
        microphoneCount: "Not yet confirmed — microphone count",
      }),
    );

    expect(need?.resolution).toBe("Unknown");
    // The room's own routing, not composition: an unanswered multiview question
    // is not a request for a multiview processor.
    expect(need?.processing).toBe("Matrix / routing");
    expect(need?.microphones).toBe("");
  });

  it("drops a 1080p-only extender from a 4K room and keeps it for an HD room", () => {
    const hdExtender = product("EX-40-G3");

    expect(isWingmanProductEligibleForFinderNeed(hdExtender, { resolution: "4K60" })).toBe(false);
    expect(isWingmanProductEligibleForFinderNeed(hdExtender, { resolution: "1080p" })).toBe(true);
    expect(resolutionGateReason(classifyWingmanProduct(hdExtender), "4K60")).toContain("HD (1080p)");
  });

  it("never drops a product whose signal capacity is unevidenced", () => {
    const unevidenced = fullProductIndexRecords
      .map((entry) => classifyWingmanProduct(entry as never))
      .find((profile) => profile.resolutionRank === null);

    expect(unevidenced, "the catalogue holds rows with no stated ceiling").toBeTruthy();
    expect(resolutionGateReason(unevidenced!, "4K60 4:4:4")).toBe("");
  });

  it("says why a product passed the picture-quality gate", () => {
    const matrix = selectWingmanProducts([product("MX-0404-SCL")] as never, {
      mode: "recommendations",
      resolution: "4K60",
    })[0];

    expect(matrix.eligible).toBe(true);
    expect(matchedGateReasons(matrix.profile, { resolution: "4K60" }).join(" "))
      .toContain("Resolution gate passed");
  });

  it("rejects a room device that cannot host the microphone feeds, and ignores an amplifier's paging inputs", () => {
    const videoBar = classifyWingmanProduct(product("APO-210-UC"));
    const amplifier = classifyWingmanProduct(product("AMP-2120"));

    expect(videoBar.micFeeds).toBe(4);
    expect(micFeedGateReason(videoBar, "5")).toContain("4 mic feeds");
    expect(micFeedGateReason(videoBar, "2")).toBe("");
    // Two paging inputs on an amplifier say nothing about the room's pickup.
    expect(micFeedGateReason(amplifier, "5")).toBe("");
  });

  it("lets the multiview answer decide which matrix switcher fills the role", () => {
    const withMultiview = slotsFor({
      ...routingRoom,
      signalStandard: "Standard 4K (4K60 / standard 4K)",
      multiviewDestinations: ["LCD video wall"],
    });
    const withoutMultiview = slotsFor({
      ...routingRoom,
      signalStandard: "Standard 4K (4K60 / standard 4K)",
    });

    const matrix = (slots: ReturnType<typeof slotsFor>) =>
      slots.find((entry) => entry.slot.kind === "matrix")?.candidates.map((candidate) => candidate.sku) ?? [];

    expect(matrix(withoutMultiview)).toContain("EXP-MX-0402-H2");
    // A switcher that cannot compose does not answer a room that asked where
    // its multiview must appear.
    expect(matrix(withMultiview)).not.toContain("EXP-MX-0402-H2");
    expect(matrix(withMultiview)).toContain("MX-0404-SCL");
  });

  it("keeps one UC bar from covering a microphone role it cannot serve", () => {
    const manyFeeds = slotsFor({
      ...routingRoom,
      unifiedCommunicationsRequirement: "Video conferencing",
      microphoneNeeds: ["Ceiling microphones"],
      microphoneCount: "5–8 feeds or pickup zones",
    });
    const oneFeed = slotsFor({
      ...routingRoom,
      unifiedCommunicationsRequirement: "Video conferencing",
      microphoneNeeds: ["Ceiling microphones"],
      microphoneCount: "One microphone feed or integrated device",
    });

    const microphone = (slots: ReturnType<typeof slotsFor>) =>
      slots.find((entry) => entry.slot.kind === "microphone");

    expect(microphone(manyFeeds)?.slot.derivedFrom.join(" ")).toContain("5–8 feeds or pickup zones");
    expect(microphone(manyFeeds)?.ucCovered).toBeFalsy();
    expect(microphone(manyFeeds)?.candidates.length).toBeGreaterThan(0);
    // One feed is what an integrated bar already provides.
    expect(microphone(oneFeed)?.ucCovered).toBe(true);
  });
});
