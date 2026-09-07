import { beforeEach, describe, expect, it } from "vitest";
import {
  readProjectStore,
  resetProjectStore,
  saveDiscoveryBriefToProject,
  saveRecommendationEvidenceToProject,
  type StoredDiscoveryBrief,
  type StoredRecommendationEvidence,
} from "./projectStore";

// A fully-formed pitch evidence payload that would normally read quote-ready
// (no missing info, no blockers) — used to prove the stranded brief override.
function pitchEvidence(): StoredRecommendationEvidence {
  return {
    updatedAt: "2026-09-02T00:00:00.000Z",
    source: "Product Pitch",
    customerRequirement: "Small meeting room with USB-C BYOM conferencing.",
    productDirection: "Meeting-room direction",
    systemShape: "Meeting-room direction with one display.",
    whyThisFits: ["Matches the captured room requirement."],
    evidenceUsed: ["Product match: MX-0402-MST"],
    quoteChecks: ["Validate datasheet before quote."],
    missingInformation: [],
    requiredDependencies: [],
    optionalUpgrades: [],
    alternatives: [],
    customerSafeWording: ["Suitable for the captured requirement."],
    internalGuidance: [],
    quoteSafetyStatus: "quote-ready",
    quoteSafetyMessage: "Quote-ready draft after final datasheet and dependency validation.",
    confidence: "high",
  };
}

function strandedBrief(): StoredDiscoveryBrief {
  return {
    savedAt: "2026-09-02T00:00:00.000Z",
    roomModel: { roomType: "Meeting room / boardroom" },
    capturedPercent: 100,
    quoteSafetyStatus: "do-not-quote-yet",
  };
}

describe("recommendation evidence stranded-brief mapping", () => {
  beforeEach(() => resetProjectStore());

  it("colors the evidence do-not-quote-yet when the saved discovery brief is stranded", () => {
    saveDiscoveryBriefToProject(strandedBrief());

    saveRecommendationEvidenceToProject(pitchEvidence());

    const project = readProjectStore().projects[0];
    expect(project?.discoveryBrief?.quoteSafetyStatus).toBe("do-not-quote-yet");
    expect(project?.recommendationEvidence?.quoteSafetyStatus).toBe("do-not-quote-yet");
    expect(project?.recommendationEvidence?.quoteSafetyMessage).toBe(
      "Do not quote yet - the discovery brief still carries an answer that no longer fits your current answers. Resolve it on the discovery page first.",
    );
    // Project status mirrors the panel: caution while the brief is stranded.
    expect(project?.status).toBe("caution");
  });

  it("keeps the pitch's own quote-ready verdict when the brief is not stranded", () => {
    saveDiscoveryBriefToProject({ ...strandedBrief(), quoteSafetyStatus: "quote-ready" });

    saveRecommendationEvidenceToProject(pitchEvidence());

    const project = readProjectStore().projects[0];
    expect(project?.recommendationEvidence?.quoteSafetyStatus).toBe("quote-ready");
    expect(project?.recommendationEvidence?.quoteSafetyMessage).not.toContain("no longer fits");
    expect(project?.status).toBe("recommended");
  });
});
