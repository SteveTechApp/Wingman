import { describe, expect, it } from "vitest";
import { decideVideowall } from "./videowallDecision";
import { wallDesignEvidence } from "./videowallEvidence";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { wallTransportPlan } from "./videowallTransport";

const requirements: WallRequirements = {
  ...defaultWallRequirements,
  application: "lcd-loop",
  layout: "single",
  columns: 2,
  rows: 2,
  sources: 2,
  displayResolution: "4k",
  sourceResolution: "4k60",
};

describe("wallDesignEvidence", () => {
  it("records the requirements, recommendation and transport estimate the builder worked from", () => {
    const decision = decideVideowall(requirements);
    const option = decision.recommended?.option;
    expect(option, "the fixture should reach a recommendation").toBeTruthy();

    const transport = wallTransportPlan(requirements);
    const evidence = wallDesignEvidence({
      requirements,
      option: option!,
      decision,
      transport,
      checks: ["HDCP 2.2 confirmed with the customer."],
      origin: "Reception feature wall",
    });

    expect(evidence.version).toBe(2);
    expect(evidence.requirements).toEqual({ ...requirements, mapping: "fill" });
    expect(evidence.selectedId).toBe(option!.id);
    expect(evidence.recommendation.title).toBe(option!.title);
    expect(evidence.recommendation.reasons).toEqual(decision.recommended!.reasons);
    expect(evidence.checks).toEqual([...option!.checks, "HDCP 2.2 confirmed with the customer."]);
    expect(evidence.transport).toBe(transport);
    expect(evidence.transport.links).toHaveLength(6);
    // With no survey detail recorded, the handoff record says so on every link.
    expect(evidence.survey.linkCount).toBe(transport.allLinks.length);
    expect(evidence.survey.gaps).toHaveLength(4);
    expect(evidence.survey.text).toContain("Survey incomplete");
    expect(evidence.resolution).toEqual({ canvas: { width: 7680, height: 4320 }, display: { width: 3840, height: 2160 }, source: { width: 3840, height: 2160 }, mapping: expect.any(String) });
    expect(evidence.canvasPlan.canvas).toEqual({ width: 3840, height: 2160 });
    expect(evidence.evidence).toEqual(option!.sources);
    expect(evidence.origin).toBe("Reception feature wall");
    expect(evidence.updatedAt).toEqual(expect.any(String));
  });

  it("records a complete survey as complete in the saved evidence", () => {
    const decision = decideVideowall(requirements);
    if (!decision.recommended) return;
    const transport = wallTransportPlan(requirements);
    const linkDetails = Object.fromEntries(
      transport.allLinks.map((link) => [link.id, { enclosure: "Back box", entry: "Ceiling void", termination: "HDMI faceplate" }]),
    );
    const evidence = wallDesignEvidence({
      requirements: { ...requirements, linkDetails },
      option: decision.recommended.option,
      decision,
      transport,
      checks: [],
      origin: null,
    });

    expect(evidence.survey.gaps).toEqual([]);
    expect(evidence.survey.text).toBe("Display housing, run entry and termination are recorded on all 4 links.");
  });

  it("keeps the worksheet photo review with the design the evidence quotes", () => {
    const decision = decideVideowall(requirements);
    if (!decision.recommended) return;
    const review = {
      reviewedAt: "2026-10-20T14:12:00.000Z",
      photoCount: 1,
      confidence: 0.7,
      rows: [{ id: "display-1", label: "Panel 1", metres: 9, confidence: 0.4, decision: "rejected" as const }],
    };
    const evidence = wallDesignEvidence({
      requirements: { ...requirements, surveyReview: review },
      option: decision.recommended.option,
      decision,
      transport: wallTransportPlan(requirements),
      checks: [],
      origin: null,
    });

    // The saved wall can account for the rows a rep cleared, not only for the
    // runs the accepted rows left behind.
    expect(evidence.requirements.surveyReview).toEqual(review);
  });

  it("keeps the alternative design in the saved evidence", () => {
    const decision = decideVideowall(requirements);
    if (!decision.recommended) return;
    const evidence = wallDesignEvidence({
      requirements,
      option: decision.recommended.option,
      decision,
      transport: wallTransportPlan(requirements),
      checks: [],
      origin: null,
    });

    expect(evidence.recommendation.alternative).toEqual(
      decision.alternative ? { title: decision.alternative.headline, when: decision.alternative.when } : null,
    );
  });
});
