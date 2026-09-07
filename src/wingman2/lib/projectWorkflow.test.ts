import { describe, expect, it } from "vitest";
import type { StoredProject } from "../data/projectStore";
import { withApprovedDesignRevision, withRefreshedDesignRevision, withSubmittedDesignRevision } from "./projectWorkflow";

const now = "2026-09-07T10:00:00.000Z";
function fixture(): StoredProject {
  return { id: "p", name: "Room", owner: "Rep", stage: "Proposal Builder", status: "recommended", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/proposal", requirements: [{ id: "r", label: "Application", value: "One source to one display", category: "general", source: "Customer", status: "confirmed", whyItMatters: "Show content", updatedAt: now }], productSelections: [{ sku: "EX-70-H2", title: "HDBaseT extender", category: "Source transmitter transport display receiver", quantity: 1 }], proposal: { title: "Room", summary: "Extend one source to one display", sections: [], products: [], assumptions: [], updatedAt: now } };
}

describe("project design workflow", () => {
  it("submits and approves the exact compiled revision", () => {
    const submitted = withSubmittedDesignRevision(fixture(), "Rep", now);
    expect(submitted.proposal?.submittedRevisionHash).toBe(submitted.proposal?.designRevision?.contentHash);
    const approved = withApprovedDesignRevision(submitted, "Manager", "Checked", now);
    expect(approved.proposal?.approvalStatus).toBe("approved");
    expect(approved.proposal?.approvedRevisionHash).toBe(approved.proposal?.designRevision?.contentHash);
  });

  it("invalidates approval after a material requirement change", () => {
    const approved = withApprovedDesignRevision(withSubmittedDesignRevision(fixture(), "Rep", now), "Manager", "", now);
    const changed = { ...approved, requirements: approved.requirements?.map((item) => ({ ...item, value: "Two sources to two displays" })) };
    const refreshed = withRefreshedDesignRevision(changed, "2026-09-07T12:00:00.000Z");
    expect(refreshed.proposal?.approvalStatus).toBe("draft");
    expect(refreshed.proposal?.approvedRevisionHash).toBeUndefined();
  });
});
