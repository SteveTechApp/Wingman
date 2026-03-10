import { describe, expect, it } from "vitest";

import { buildCustomerSafeSummary } from "@/features/projects/customerSummary";
import type { StoredProject } from "@/features/projects/projectStore";

describe("customerSummary", () => {
  it("builds a customer-safe summary from discovery and proposal data", () => {
    const project: StoredProject = {
      id: "proj-1",
      name: "Boardroom Refresh",
      customer: "Acme Ltd",
      site: "London HQ",
      roomName: "Boardroom",
      stage: "Discovery",
      status: "Draft",
      notes: "",
      createdAt: "2026-03-10T10:00:00.000Z",
      updatedAt: "2026-03-10T10:00:00.000Z",
      discovery: {
        customer: "Acme Ltd",
        site: "London HQ",
        roomName: "Boardroom",
        applicationType: "Meeting Space",
        displayCount: "2",
        sourceCount: "4",
        sourcePlacement: "Central rack",
        displayConnectionType: "HDBaseT receiver",
        recommendedFamilies: ["Apollo", "HDBaseT"],
      },
      proposal: {
        title: "Boardroom AV Refresh",
        notes: "Draft proposal ready",
      },
    };

    const summary = buildCustomerSafeSummary(project);
    expect(summary.headline).toBe("Boardroom AV Refresh");
    expect(summary.overview).toMatch(/Acme Ltd/i);
    expect(summary.bullets.join(" ")).toMatch(/Apollo/i);
  });
});
