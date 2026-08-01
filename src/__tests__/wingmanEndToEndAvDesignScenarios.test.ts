import { describe, expect, it } from "vitest";

import type { StoredProject, StoredProjectProposal } from "@/wingman2/data/projectStore";
import { buildSystemDesign } from "@/wingman2/lib/discoverySystemDesign";
import { buildProposalHtml } from "@/wingman2/lib/proposalExport";
import { buildSalesReadinessPackage } from "@/wingman2/lib/salesReadiness";
import { buildSchematicBriefFromProject } from "@/wingman2/lib/schematic/projectToSchematicBrief";
import { buildWingmanSchematic } from "@/wingman2/lib/schematic/wingmanSchematicEngine";

describe("Wingman end-to-end AV design scenarios", () => {
  it("carries a higher-education distributed AV brief into a correctly sized BoM, diagram and sales proposal", () => {
    const timestamp = "2026-08-01T12:00:00.000Z";
    const roomModel = {
      market: "Higher education",
      application: "University lecture theatre and campus overflow distribution",
      roomType: "Lecture theatre",
      outcome: "Route three teaching sources to six displays with independent content and simple operator control.",
      sourceCount: "3 sources",
      displayCount: "6 displays",
      displayBehaviour: "Different content by display or zone",
      cableRun: "70m",
      network: "Dedicated managed AV network",
      controlNeeds: "Lectern touch control",
      audioPath: "Existing lecture theatre sound system",
    };

    const design = buildSystemDesign({ roomModel });
    expect(design.architecture).toBe("avoip");
    expect(design.slots.find((slot) => slot.kind === "avoip-encoder")?.quantity).toBe(3);
    expect(design.slots.find((slot) => slot.kind === "avoip-decoder")?.quantity).toBe(6);
    expect(design.slots.some((slot) => slot.kind === "avoip-control")).toBe(true);

    const project: StoredProject = {
      id: "university-distributed-av",
      name: "Northbridge University Lecture Theatre",
      owner: "Education account team",
      stage: "Recommendations",
      status: "alternative",
      updated: "Just now",
      resumeTo: "/wingman/proposal",
      createdAt: timestamp,
      updatedAt: timestamp,
      discoveryBrief: {
        roomModel,
        capturedPercent: 100,
        quoteSafetyStatus: "validate-before-quote",
      },
      productSelections: [
        {
          sku: "NHD-600-TRX",
          title: "NetworkHD 600 Series transceiver",
          category: "AV-over-IP endpoint",
          quantity: 9,
          source: "Discovery system design - whole system",
          evidence: ["3 source endpoints plus 6 display endpoints."],
        },
        {
          sku: "NHD-CTL-PRO-V2",
          title: "NetworkHD controller",
          category: "AV-over-IP controller",
          quantity: 1,
          source: "Discovery system design - whole system",
          evidence: ["Required routing controller."],
        },
      ],
    };

    const readiness = buildSalesReadinessPackage({
      products: project.productSelections ?? [],
      discovery: {
        discoveryPercent: 100,
        projectTitle: project.name,
        summary: roomModel.outcome,
        roomSize: roomModel.roomType,
        displays: roomModel.displayCount,
        displayCount: roomModel.displayCount,
        displayBehaviour: roomModel.displayBehaviour,
        sourceCount: roomModel.sourceCount,
        usb: "No USB conferencing required",
        distance: roomModel.cableRun,
        network: roomModel.network,
        audio: roomModel.audioPath,
        control: roomModel.controlNeeds,
        budget: "Budget to be confirmed",
      },
      assumptions: ["Confirm managed switch capacity, optics and VLAN design before issue."],
    });

    expect(readiness.bomRows.find((row) => row.sku === "NHD-600-TRX")?.qty).toBe(9);
    expect(readiness.bomRows.find((row) => row.sku === "NHD-CTL-PRO-V2")?.qty).toBe(1);

    const schematic = buildWingmanSchematic(buildSchematicBriefFromProject(project));
    expect(schematic.nodes.filter((node) => node.kind === "av-over-ip-transceiver")).toHaveLength(9);
    expect(schematic.connections.filter((connection) => connection.signal === "video").length).toBeGreaterThanOrEqual(9);
    expect(schematic.warnings.filter((warning) => warning.severity === "blocker")).toEqual([]);

    const proposal: StoredProjectProposal = {
      title: project.name,
      summary: `${roomModel.market}: ${roomModel.outcome}`,
      sections: [],
      products: project.productSelections ?? [],
      assumptions: ["Confirm managed switch capacity, optics and VLAN design before issue."],
      outputPurpose: readiness.outputPurpose,
      governedDependencies: readiness.governedDependencies,
      bomRows: readiness.bomRows,
      evidence: readiness.evidence,
      repGuidance: readiness.repGuidance,
      governanceWarnings: readiness.governanceWarnings,
      validationNotes: readiness.validationNotes,
      readinessScore: readiness.readinessScore,
      updatedAt: timestamp,
    };
    const proposalHtml = buildProposalHtml(proposal, readiness.bomRows);

    expect(proposalHtml).toContain("Higher education");
    expect(proposalHtml).toContain("Route three teaching sources to six displays");
    expect(proposalHtml).toContain("This is what the system will do for the people using the room");
    expect(proposalHtml).toContain("NHD-600-TRX");
    expect(proposalHtml).toContain("Technical Architecture");
    expect(proposalHtml).toContain("Equipment Schedule");
    expect(proposalHtml).toContain("Commercial and Operational Benefits");
  });

  it("sizes a hospitality matrix and every long-distance display endpoint", () => {
    const design = buildSystemDesign({
      roomModel: {
        market: "Hospitality",
        application: "Sports bar",
        outcome: "Route four live sport and signage sources independently to eight screens.",
        sourceCount: "4 sources",
        displayCount: "8 displays",
        displayBehaviour: "Different content by display or zone",
        cableRun: "60m to each display",
        audioPath: "Zoned room speakers",
        controlNeeds: "Simple staff touch control",
      },
    });

    expect(design.architecture).toBe("matrix");
    expect(design.slots.find((slot) => slot.kind === "matrix")?.quantity).toBe(1);
    expect(design.slots.find((slot) => slot.kind === "extension")?.quantity).toBe(8);
    expect(design.slots.some((slot) => slot.kind === "room-audio")).toBe(true);
    expect(design.slots.some((slot) => slot.kind === "control")).toBe(true);
  });

  it("does not invent a design when a public-sector command-room brief lacks source and display counts", () => {
    const design = buildSystemDesign({
      roomModel: {
        market: "Public sector / blue-light",
        application: "Emergency command and control room",
        outcome: "Operators need resilient situational awareness and rapid source selection.",
      },
    });

    expect(design.architecture).toBe("undetermined");
    expect(design.slots).toEqual([]);
    expect(design.openQuestions).toEqual(expect.arrayContaining([
      "How many sources need to reach the screens?",
      "How many displays does the room have?",
    ]));
  });
});
