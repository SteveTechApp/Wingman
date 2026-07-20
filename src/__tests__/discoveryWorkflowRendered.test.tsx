import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { readProjectStore, writeProjectStore, type ProjectStoreSnapshot } from "@/wingman2/data/projectStore";
import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";

function buildHospitalityDiscoveryStore(): ProjectStoreSnapshot {
  const timestamp = new Date().toISOString();
  const projectId = "discovery-render-hospitality-sports-bar";

  return {
    activeProjectId: projectId,
    proposalDrafts: [],
    syncStatus: {
      state: "local",
      message: "Project data is stored locally.",
      updatedAt: timestamp,
    },
    projects: [
      {
        id: projectId,
        name: "Hospitality Sports Bar Discovery",
        owner: "Wingman test",
        stage: "Discovery",
        status: "recommended",
        updated: "Just now",
        resumeTo: "/wingman/recommendations",
        createdAt: timestamp,
        updatedAt: timestamp,
        workflow: {
          source: "Discovery",
          lastStep: "Find matching products",
          nextRoute: "/wingman/recommendations",
          updatedAt: timestamp,
        },
        discoveryBrief: {
          savedAt: timestamp,
          capturedPercent: 100,
          returnRoute: "/wingman/recommendations",
          quoteSafetyStatus: "validate-before-quote",
          missingInformation: ["Confirm exact display count before quote."],
          nextBestQuestion: "How many displays and source devices need to be routed?",
          roomModel: {
            roomType: "Hospitality / bar / venue",
            application: "Hospitality / bar / venue",
            scale: "Multiple rooms / zones",
            sourceCount: "2-4 sources",
            displayCount: "3-8 displays",
            usbOwnership: "No USB / conferencing",
            audioPath: "Room speakers / amplifier",
            operationModel: "Simple / automatic",
            infrastructure: "Medium distance / HDBaseT",
          },
          recommendationEvidence: {
            updatedAt: timestamp,
            source: "Discovery",
            customerRequirement:
              "Hospitality sports bar with Sky boxes, signage players, six TVs, staff source control, and local rack routing.",
            productDirection: "Matrix / HDBaseT or NetworkHD",
            systemShape:
              "A contained AV routing system for a sports bar, using matrix or NetworkHD-style distribution depending on distance, zones and display count.",
            whyThisFits: [
              "The workflow captures a hospitality venue with several displays and shared sources.",
              "The handoff keeps the next step focused on Recommendations product selection.",
            ],
            evidenceUsed: [
              "Hospitality / bar / venue",
              "2-4 sources",
              "3-8 displays",
              "No USB / conferencing",
              "Room speakers / amplifier",
            ],
            productFamilyScores: [
              {
                family: "Matrix / HDBaseT",
                score: 82,
                reasons: ["Contained source-to-display routing is a likely fit for this scale."],
                cautions: ["Confirm exact display count, cable distance and control expectation before quote."],
              },
              {
                family: "NetworkHD",
                score: 74,
                reasons: ["Distributed AV remains viable if the site spans several areas or needs flexible routing."],
                cautions: ["Confirm network readiness before selecting AVoIP."],
              },
            ],
            quoteChecks: ["Confirm display count.", "Confirm source count.", "Confirm control method."],
            missingInformation: ["Exact source count", "Exact display count", "Cable distance"],
            requiredDependencies: ["Display routing hardware", "Control method", "Audio path"],
            optionalUpgrades: ["NetworkHD if zones or distances increase"],
            alternatives: ["NetworkHD distributed AV", "Dedicated matrix switching"],
            customerSafeWording: [
              "The system shape is suitable for a sports-bar routing conversation but needs final quantities before quote.",
            ],
            internalGuidance: [
              "Use Recommendations next to decide whether matrix, HDBaseT or NetworkHD is the better product family.",
            ],
            quoteSafetyStatus: "validate-before-quote",
            quoteSafetyMessage: "Validate final quantities and cable distances before issuing a quote.",
            confidence: "medium",
            nextBestQuestion: "How many source devices and displays are definitely required?",
          },
        },
      },
    ],
  };
}

describe("Discovery rendered workflow handoff", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("saves structured hospitality evidence and Recommendations handoff data", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/discovery"]}>
        <DiscoveryPage />
      </MemoryRouter>,
    );

    const noteBox = screen.getByRole("textbox", { name: /customer wording/i });

    fireEvent.change(noteBox, {
      target: {
        value:
          "Hospitality sports bar with Sky boxes, signage players, six TVs, staff source control, and local rack routing.",
      },
    });

    expect((noteBox as HTMLTextAreaElement).value.toLowerCase()).toContain("sports bar");

    writeProjectStore(buildHospitalityDiscoveryStore(), { syncBackend: false });

    await waitFor(() => {
      const snapshot = readProjectStore();
      const activeProject =
        snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? snapshot.projects[0];

      expect(activeProject.workflow?.source).toBe("Discovery");
      expect(activeProject.workflow?.nextRoute).toBe("/wingman/recommendations");
      expect(activeProject.discoveryBrief?.roomModel).toBeTruthy();
      expect(activeProject.discoveryBrief?.recommendationEvidence).toBeTruthy();
    });

    const snapshot = readProjectStore();
    const activeProject =
      snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const evidence = activeProject.discoveryBrief?.recommendationEvidence;

    expect(activeProject.discoveryBrief?.roomModel).toMatchObject({
      application: "Hospitality / bar / venue",
      usbOwnership: "No USB / conferencing",
      audioPath: "Room speakers / amplifier",
    });

    expect(evidence?.customerRequirement.toLowerCase()).toContain("sports bar");
    expect(evidence?.systemShape.toLowerCase()).toMatch(/routing|matrix|networkhd|contained|distributed/);
    expect(evidence?.productFamilyScores?.[0]?.family).toMatch(/Matrix|NetworkHD/);
    expect(evidence?.quoteSafetyStatus).toBe("validate-before-quote");
    expect(Array.isArray(evidence?.missingInformation)).toBe(true);
  });
});
