import JSZip from "jszip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import type { StoredDiscoveryBrief, StoredProjectProposal } from "../data/projectStore";
import { buildDiscoveryBriefDocx } from "./discoveryBriefDocxExport";
import { briefFromProposal } from "./discoveryBriefExport";

const brief: StoredDiscoveryBrief = {
  savedAt: "2026-08-26T00:00:00.000Z",
  roomModel: {
    applicationType: "Meeting room / boardroom",
    longestRun: "15 m",
  },
  missingInformation: ["Confirm the display mounting height"],
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

async function docxText(document: Awaited<ReturnType<typeof buildDiscoveryBriefDocx>>) {
  const buffer = await Packer.toBuffer(document);
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")!.async("string");
  return documentXml.replace(/<[^>]+>/g, " ");
}

describe("Discovery Brief DOCX export", () => {
  it("creates the brief sections, trail, statuses and disclaimer", async () => {
    const text = await docxText(buildDiscoveryBriefDocx(brief, { projectName: "Acme HQ Boardroom", preparedBy: "Steve" }));

    expect(text).toContain("DISCOVERY BRIEF");
    expect(text).toContain("Acme HQ Boardroom");
    expect(text).toContain("Prepared by: Steve");
    expect(text).toContain("Purpose of this Brief");
    expect(text).toContain("Captured Requirement");
    expect(text).toContain("Longest cable run");
    expect(text).toContain("Discovery Conversation");
    expect(text).toContain("What type of opportunity is this?");
    expect(text).toContain("The exec boardroom on the top floor.");
    expect(text).toContain("Confirmed with customer");
    expect(text).toContain("To be confirmed");
    expect(text).toContain("Capture confidence");
    // The trust level (and the score behind it) for each you-said → matched
    // pair is visible — low rows carry the "verify before quote" flag.
    expect(text).toContain("High confidence (12)");
    expect(text).toContain("Low confidence — verify before quote (1)");
    expect(text).toContain("Still to Confirm");
    expect(text).toContain("Confirm the display mounting height");
    expect(text).toContain("Best-Efforts Disclaimer");
  });

  it("exports the conversation straight from a stored proposal", async () => {
    const proposal: StoredProjectProposal = {
      title: "Acme HQ Boardroom",
      summary: "A meeting room with two routed displays.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-08-26T00:00:00.000Z",
      discoveryConversation: brief.discoveryConversation,
    };

    const text = await docxText(buildDiscoveryBriefDocx(briefFromProposal(proposal), { projectName: proposal.title }));
    expect(text).toContain("Acme HQ Boardroom");
    expect(text).toContain("What type of opportunity is this?");
    expect(text).toContain("Status summary: 1 confirmed with customer, 1 to be confirmed");
  });
});
