import { beforeEach, describe, expect, it } from "vitest";

import {
  readProjectStore,
  saveProjectProposalToProject,
  writeProjectStore,
  type ProjectStoreSnapshot,
} from "@/wingman2/data/projectStore";

describe("product-family score surfacing", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps product-family scores on saved proposal data instead of dropping them at store boundaries", () => {
    saveProjectProposalToProject({
      title: "Sports Bar Proposal",
      summary: "Contained matrix proposal for a hospitality venue.",
      sections: ["Overview", "Products"],
      products: [],
      productFamilyScores: [
        {
          family: "Matrix / HDBaseT",
          score: 94,
          reasons: ["Hospitality / sports bar routing"],
          cautions: ["Confirm output zoning before final quote."],
        },
      ],
      assumptions: [],
      updatedAt: new Date().toISOString(),
    });

    const savedProject = readProjectStore().projects[0];

    expect(savedProject.proposal?.productFamilyScores).toEqual([
      expect.objectContaining({
        family: "Matrix / HDBaseT",
        score: 94,
        reasons: ["Hospitality / sports bar routing"],
      }),
    ]);
  });

  it("normalises stored recommendation evidence so Project Detail can surface product-family scores after reload", () => {
    const snapshot: ProjectStoreSnapshot = {
      projects: [
        {
          id: "project-with-evidence",
          name: "Project With Evidence",
          owner: "Steve",
          stage: "Finder",
          status: "recommended",
          updated: "Now",
          resumeTo: "/wingman/finder",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          recommendationEvidence: {
            updatedAt: new Date().toISOString(),
            source: "Discovery",
            customerRequirement: "Teams boardroom with BYOD and USB peripherals.",
            productDirection: "Presentation / UC direction",
            systemShape: "Meeting-room direction",
            whyThisFits: ["USB and conferencing workflow captured."],
            evidenceUsed: ["Product-family score: Presentation / UC"],
            productFamilyScores: [
              {
                family: "Presentation / UC",
                score: 91,
                reasons: ["Meeting-room workflow", "BYOD presentation"],
                cautions: ["Confirm USB host ownership before quote."],
              },
            ],
            quoteChecks: ["Confirm USB device ownership."],
            missingInformation: ["Confirm table connectivity."],
            requiredDependencies: ["USB host path validation."],
            optionalUpgrades: [],
            alternatives: [],
            customerSafeWording: ["Lead with the meeting-room workflow."],
            internalGuidance: ["Do not force a matrix-first recommendation."],
            quoteSafetyStatus: "validate-before-quote",
            quoteSafetyMessage: "Validate before quote - the product direction is usable, but checks remain.",
            confidence: "medium",
          },
        },
      ],
      proposalDrafts: [],
      activeProjectId: "project-with-evidence",
    };

    writeProjectStore(snapshot);

    const savedProject = readProjectStore().projects[0];

    expect(savedProject.recommendationEvidence?.productFamilyScores?.[0]).toEqual(
      expect.objectContaining({
        family: "Presentation / UC",
        score: 91,
        reasons: ["Meeting-room workflow", "BYOD presentation"],
      }),
    );
  });
});
