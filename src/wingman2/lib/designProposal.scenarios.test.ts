import { describe, expect, it } from "vitest";
import type { StoredProject, StoredRequirementRecord } from "../data/projectStore";
import { compileDesignProposal } from "./designProposal";

const now = "2026-09-07T10:00:00.000Z";
function scenario(name: string, requirementValues: string[], category: string, sku: string): StoredProject {
  const requirements: StoredRequirementRecord[] = requirementValues.map((value, index) => ({ id: `r-${index}`, label: `Requirement ${index + 1}`, value, category: index === 0 ? "application" : category, source: "Customer", status: "confirmed", whyItMatters: `The design must support ${value}.`, updatedAt: now }));
  return { id: name.toLowerCase().replace(/\s+/g, "-"), name, owner: "Scenario", stage: "Proposal Builder", status: "recommended", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/proposal", requirements, productSelections: [{ sku, title: `${name} system`, category, quantity: 1, evidence: [`${sku} covers the stated system role.`] }], proposal: { title: name, summary: requirementValues.join("; "), sections: [], products: [], assumptions: [], updatedAt: now, applicationProposal: { vertical: "Commercial AV", application: name, executiveSummary: name, customerNeed: requirementValues.join("; "), solutionOverview: category, benefits: [], userJourney: [], technicalFacts: [], architectureDiagram: category, acceptanceCriteria: [], visualBriefs: [], verifiedDesignParameters: [], deploymentConditions: [] } } };
}

const cases = [
  ["Meeting room", ["HDMI laptop source to display", "USB BYOM camera and audio"], "source presentation switch processing HDBaseT transport destination display USB host camera audio speaker control power", "APO-VX20-UC-V2"],
  ["Classroom", ["Teaching laptop and camera to projector", "Teacher microphone and room speakers"], "source switching processing HDBaseT transport receiver destination projector camera audio microphone control power", "MX-0402-MST"],
  ["Hospitality routing", ["Multiple sources to independent displays"], "source matrix processing routing transport destination display control power", "MX-0808-H2A-MK2"],
  ["NetworkHD distribution", ["Sources distributed over an AV over IP network to displays"], "source encoder processing NetworkHD AVoIP network ethernet transport decoder destination display control power", "NHD-500-TX"],
  ["Video wall", ["Sources composed across an LED video wall display"], "source video wall processing scale transport destination display control power", "SW-0404-MV-HDMI"],
  ["Competitor replacement", ["Replace competitor source transmitter and display receiver over 70m cable route"], "source transmitter processing HDBaseT transport cable receiver destination display control power", "EX-70-H2"],
] as const;

describe("canonical design scenario acceptance", () => {
  for (const [name, requirements, roles, sku] of cases) {
    it(`${name} traces requirements, covers the system and explains the product`, () => {
      const result = compileDesignProposal(scenario(name, [...requirements], roles, sku), now);
      expect(result.requirements.length).toBe(requirements.length);
      expect(result.roleCoverage.filter((item) => item.required && !item.covered)).toEqual([]);
      expect(result.canIssue).toBe(true);
      expect(result.productOverviews[0].sku).toBe(sku);
      expect(result.productOverviews[0].requirementIds.length).toBeGreaterThan(0);
      expect(result.productOverviews[0].reason).toContain("Selected to address");
    });
  }

  it("keeps an incomplete design usable as a draft while naming the missing roles", () => {
    const result = compileDesignProposal(scenario("Partial answer", ["Laptop source"], "source input", "SW-0201-4K"), now);
    expect(result.canIssue).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining(["Complete the switching and processing design role.", "Complete the signal transport design role.", "Complete the displays and destinations design role."]));
  });
});
