import { describe, expect, it } from "vitest";
import type { StoredProject } from "../data/projectStore";
import { compileDesignProposal, designProposalHash } from "./designProposal";

function project(): StoredProject {
  const now = "2026-09-07T10:00:00.000Z";
  return { id: "project-1", name: "Boardroom", owner: "Sales", stage: "Proposal Builder", status: "recommended", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/proposal",
    requirements: [
      { id: "sources", label: "Sources", value: "Two HDMI laptops", category: "source", source: "Customer", status: "confirmed", whyItMatters: "Both presenters need access.", updatedAt: now },
      { id: "displays", label: "Displays", value: "Two independent displays", category: "display", source: "Customer", status: "confirmed", whyItMatters: "Each screen must switch independently.", updatedAt: now },
      { id: "distance", label: "Cable route", value: "25m", category: "distance", source: "Site survey", status: "confirmed", whyItMatters: "Local HDMI is unsuitable.", updatedAt: now },
    ],
    productSelections: [{ sku: "MX-0402-MST", title: "4x2 matrix", category: "Matrix switching and transport", quantity: 1, evidence: ["Four inputs and two routed outputs"] }],
  };
}

describe("canonical design proposal", () => {
  it("traces customer requirements into interpretations and product roles", () => {
    const result = compileDesignProposal(project(), "2026-09-07T11:00:00.000Z");
    expect(result.requirements[0]).toMatchObject({ customerStatement: "Sources: Two HDMI laptops", state: "confirmed" });
    expect(result.productOverviews[0].designRole).toContain("Matrix");
    expect(result.productOverviews[0].requirementIds.length).toBeGreaterThan(0);
    expect(result.roleCoverage.find((item) => item.role === "processing")?.covered).toBe(true);
  });

  it("identifies exact missing system roles instead of treating a relevant SKU as complete", () => {
    const result = compileDesignProposal(project());
    expect(result.canIssue).toBe(false);
    expect(result.blockers).toContain("Complete the displays and destinations design role.");
  });

  it("creates a deterministic hash independent of volatile revision fields", () => {
    const first = compileDesignProposal(project(), "2026-09-07T11:00:00.000Z");
    const second = compileDesignProposal(project(), "2026-09-08T11:00:00.000Z");
    expect(first.contentHash).toBe(second.contentHash);
    expect(designProposalHash(first)).toBe(first.contentHash);
  });
});
