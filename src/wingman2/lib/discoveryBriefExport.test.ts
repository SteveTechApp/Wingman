import { describe, expect, it } from "vitest";
import type { StoredDiscoveryBrief, StoredProjectProposal } from "../data/projectStore";
import { briefFromProposal, buildDiscoveryBriefHtml } from "./discoveryBriefExport";

const briefWithTrail: StoredDiscoveryBrief = {
  savedAt: "2026-08-26T00:00:00.000Z",
  capturedPercent: 88,
  roomModel: {
    applicationType: "Meeting room / boardroom",
    sourceCount: "2-4 sources",
    displayCount: "2 displays / outputs",
    longestRun: "15 m",
    designDirection: "Matrix / HDBaseT",
  },
  missingInformation: ["Confirm the display mounting height", "Confirm IT network access for the displays"],
  nextBestQuestion: "Confirm the display mounting height",
  discoveryConversation: [
    {
      stepId: "opportunity",
      question: "What type of opportunity is this?",
      answer: "Meeting room / boardroom",
      note: "The exec boardroom on the top floor.",
      confirmed: true,
      confidence: "high",
      confidenceScore: 12,
    },
    {
      stepId: "scale",
      question: "What is the approximate room or system scale?",
      answer: "Single large room",
      note: "",
      confidence: "low",
      confidenceScore: 1,
    },
  ],
};

describe("Discovery Brief HTML export", () => {
  it("renders the full Q&A trail with wording and status columns", () => {
    const html = buildDiscoveryBriefHtml(briefWithTrail, { projectName: "Acme HQ Boardroom" });

    expect(html).toContain("Acme HQ Boardroom");
    expect(html).toContain("What type of opportunity is this?");
    expect(html).toContain("Meeting room / boardroom");
    expect(html).toContain("The exec boardroom on the top floor.");
    expect(html).toContain("Confirmed with customer");
    expect(html).toContain("To be confirmed");
    expect(html).toContain("class=\"status is-confirmed\"");
    expect(html).toContain("class=\"status is-open\"");
    expect(html).toContain("<th>Capture confidence</th>");
    // The trust level behind each you-said → matched pair is visible.
    expect(html).toContain("class=\"confidence is-high\"");
    expect(html).toContain("High confidence (12)");
    expect(html).toContain("class=\"confidence is-low\"");
    expect(html).toContain("Low confidence — verify before quote (1)");
  });

  it("renders the captured room model, missing items and next question", () => {
    const html = buildDiscoveryBriefHtml(briefWithTrail);

    expect(html).toContain("Captured Requirement");
    expect(html).toContain("Longest cable run");
    expect(html).toContain("15 m");
    expect(html).toContain("Still to Confirm");
    expect(html).toContain("Confirm the display mounting height");
    expect(html).toContain("Next question to ask");
  });

  it("carries the best-efforts disclaimer and the pre-sign-off notice", () => {
    const html = buildDiscoveryBriefHtml(briefWithTrail);

    expect(html).toContain("Best-Efforts Disclaimer");
    expect(html).toContain("best-efforts basis");
    expect(html).toContain("Before design sign-off");
    expect(html).toContain("1 of 2 conversation rows is still to be confirmed");
  });

  it("handles an empty brief without crashing", () => {
    const html = buildDiscoveryBriefHtml({}, { projectName: "Fresh project" });

    expect(html).toContain("No discovery conversation has been captured yet");
    expect(html).toContain("No structured room model was captured in this brief");
  });

  it("builds a brief from a stored proposal carrying the conversation trail", () => {
    const proposal: StoredProjectProposal = {
      title: "Acme HQ Boardroom",
      summary: "A meeting room with two routed displays.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-08-26T00:00:00.000Z",
      preparedBy: "Steve",
      productFamilyScores: [{ family: "Matrix / HDBaseT", score: 84, reasons: ["Two sources to two displays"], cautions: [] }],
      discoveryConversation: briefWithTrail.discoveryConversation,
    };

    const brief = briefFromProposal(proposal);
    expect(brief.discoveryConversation).toHaveLength(2);
    expect(brief.roomModel).toEqual({ designDirection: "Matrix / HDBaseT", summary: "A meeting room with two routed displays." });

    const html = buildDiscoveryBriefHtml(brief, { projectName: proposal.title, preparedBy: proposal.preparedBy });
    expect(html).toContain("What type of opportunity is this?");
    expect(html).toContain("Design direction");
  });
});
